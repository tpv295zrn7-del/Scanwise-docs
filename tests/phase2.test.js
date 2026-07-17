const request = require('supertest');
const { createApp } = require('../src/app');

async function registerUser(app, user) {
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.token, user: res.body.user };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('ScanWise backend phase 2', () => {
  let app;
  let db;
  let userToken;
  let adminToken;
  let medicalToken;
  let voterTokens;

  beforeEach(async () => {
    app = createApp({ dbPath: ':memory:', jwtSecret: 'test-secret' });
    db = app.locals.db;

    const user = await registerUser(app, { email: 'user@example.com', password: 'password123', name: 'User', region: 'west' });
    userToken = user.token;

    const admin = await registerUser(app, { email: 'admin@example.com', password: 'password123', name: 'Admin', region: 'north' });
    db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', 'admin@example.com');
    adminToken = await login(app, 'admin@example.com', 'password123');

    await registerUser(app, { email: 'med@example.com', password: 'password123', name: 'Medic', region: 'east' });
    medicalToken = await login(app, 'med@example.com', 'password123');

    voterTokens = [];
    for (let i = 0; i < 5; i += 1) {
      const voter = await registerUser(app, { email: `voter${i}@example.com`, password: 'password123', name: `Voter ${i}` });
      voterTokens.push(voter.token);
    }
  });

  test('incident workflow awards updated gamification points', async () => {
    const report = await request(app)
      .post('/api/incidents')
      .set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'peanut', symptoms: ['rash'], severity: 'severe', doctor_consulted: true, doctor_confirmation: true });

    expect(report.status).toBe(201);

    for (const token of voterTokens) {
      const vote = await request(app)
        .post(`/api/incidents/${report.body.id}/vote`)
        .set('Authorization', token)
        .send({ helpful: true });
      expect(vote.status).toBe(200);
    }

    const searchable = await request(app)
      .get('/api/incidents/search?status=community_reviewed')
      .set('Authorization', userToken);
    expect(searchable.status).toBe(200);
    expect(searchable.body.incidents[0].status).toBe('community_reviewed');

    const medRegister = await request(app)
      .post('/api/medical/register')
      .set('Authorization', medicalToken)
      .send({ specialty: 'Allergy', credentials: 'MD' });
    expect(medRegister.status).toBe(200);

    medicalToken = await login(app, 'med@example.com', 'password123');

    const pending = await request(app)
      .get('/api/medical/pending-verifications')
      .set('Authorization', medicalToken);
    expect(pending.status).toBe(200);
    expect(pending.body.incidents.length).toBeGreaterThan(0);

    const verify = await request(app)
      .post(`/api/medical/verify/${report.body.id}`)
      .set('Authorization', medicalToken)
      .send({});
    expect(verify.status).toBe(200);
    expect(verify.body.status).toBe('verified');

    const reporterGamification = await request(app).get('/api/gamification/me').set('Authorization', userToken);
    expect(reporterGamification.body.points).toBe(150);
    expect(reporterGamification.body.badges.some((badge) => badge.badge_key === 'safety_citizen')).toBe(true);
    expect(reporterGamification.body.badges.some((badge) => badge.badge_key === 'life_saver')).toBe(true);

    const voterGamification = await request(app).get('/api/gamification/me').set('Authorization', voterTokens[0]);
    expect(voterGamification.body.points).toBe(10);

    const medicGamification = await request(app).get('/api/gamification/me').set('Authorization', medicalToken);
    expect(medicGamification.body.points).toBe(75);

    const profile = await request(app).get('/api/medical/profile').set('Authorization', medicalToken);
    expect(profile.status).toBe(200);
    expect(profile.body.verifications_count).toBe(1);
  });

  test('admin endpoints enforce auth, import products, and power b2b access', async () => {
    const forbidden = await request(app).get('/api/admin/users').set('Authorization', userToken);
    expect(forbidden.status).toBe(403);

    const imported = await request(app)
      .post('/api/import/products')
      .set('Authorization', adminToken)
      .send([
        { barcode: '1001', name: 'Nut Free Crunch', category: 'snack', brand: 'Acme', nutrition: { calories: 120, sugar_g: 5, protein_g: 6, sodium_mg: 90, fiber_g: 3, total_fat_g: 4 }, ingredients: ['corn', 'salt'], estimated_price: 2.49, confidence: 'estimated' },
        { barcode: '1002', name: 'Protein Bites', category: 'snack', brand: 'Acme', nutrition: { calories: 150, sugar_g: 2, protein_g: 12, sodium_mg: 120, fiber_g: 2, total_fat_g: 6 }, ingredients: ['pea protein'], estimated_price: 3.49, confidence: 'verified' },
        { barcode: '1001', name: 'Duplicate', nutrition: { calories: 100 }, ingredients: [] }
      ]);
    expect(imported.status).toBe(201);
    expect(imported.body.imported).toBe(2);
    expect(imported.body.skipped).toBe(1);

    const logs = await request(app).get('/api/import/logs').set('Authorization', adminToken);
    expect(logs.status).toBe(200);
    expect(logs.body.logs[0].id).toBe(imported.body.import_id);

    const search = await request(app)
      .get('/api/search/products?q=Protein&category=snack&price_max=4&confidence=verified&sort=price')
      .set('Authorization', userToken);
    expect(search.status).toBe(200);
    expect(search.body.total).toBe(1);
    expect(search.body.products[0].barcode).toBe('1002');

    const key = await request(app)
      .post('/api/b2b/keys')
      .set('Authorization', adminToken)
      .send({ name: 'Retail partner', tier: 'free' });
    expect(key.status).toBe(201);

    const trends = await request(app)
      .get('/api/b2b/allergen-trends')
      .set('X-API-Key', key.body.api_key);
    expect(trends.status).toBe(200);
    expect(Array.isArray(trends.body.trends)).toBe(true);

    db.prepare('UPDATE b2b_api_keys SET requests_today = 100 WHERE api_key = ?').run(key.body.api_key);
    const limited = await request(app)
      .get('/api/b2b/product-insights/0001')
      .set('X-API-Key', key.body.api_key);
    expect(limited.status).toBe(429);

    const adminUsers = await request(app)
      .get('/api/admin/users?search=admin')
      .set('Authorization', adminToken);
    expect(adminUsers.status).toBe(200);
    expect(adminUsers.body.total).toBeGreaterThan(0);

    const approve = await request(app)
      .patch('/api/admin/products/1001/approve')
      .set('Authorization', adminToken)
      .send({});
    expect(approve.status).toBe(200);

    const pendingReview = await request(app)
      .get('/api/admin/products/pending-review')
      .set('Authorization', adminToken);
    expect(pendingReview.status).toBe(200);

    const dashboard = await request(app)
      .get('/api/admin/analytics/dashboard')
      .set('Authorization', adminToken);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.total_products).toBeGreaterThanOrEqual(5);

    const health = await request(app)
      .get('/api/admin/health')
      .set('Authorization', adminToken);
    expect(health.status).toBe(200);
    expect(health.body.database).toBe('ok');
  });

  test('insights, export, analytics, and admin moderation endpoints work', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', userToken);
    const primaryProfileId = me.body.profiles[0].id;

    await request(app)
      .put(`/api/profiles/${primaryProfileId}`)
      .set('Authorization', userToken)
      .send({ allergies: ['peanut'], goals: ['lower_sugar'] });

    await request(app).post('/api/scans').set('Authorization', userToken).send({ barcode: '0001' });
    await request(app).post('/api/scans').set('Authorization', userToken).send({ barcode: '0002' });

    const correction = await request(app)
      .post('/api/corrections')
      .set('Authorization', userToken)
      .send({ barcode: '0003', nutrition: { calories: 190, sugar_g: 15 }, source: 'label' });
    expect(correction.status).toBe(201);

    const report = await request(app)
      .post('/api/incidents')
      .set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'peanut', symptoms: ['hives'], severity: 'moderate', doctor_consulted: false, doctor_confirmation: null });
    expect(report.status).toBe(201);

    const engagement = await request(app)
      .get('/api/insights/engagement')
      .set('Authorization', userToken);
    expect(engagement.status).toBe(200);
    expect(engagement.body.scans_total).toBe(2);

    const goalProgress = await request(app)
      .get('/api/insights/goal-progress')
      .set('Authorization', userToken);
    expect(goalProgress.status).toBe(200);
    expect(goalProgress.body.goals.length).toBeGreaterThan(0);

    const alerts = await request(app)
      .get('/api/insights/allergen-alerts')
      .set('Authorization', userToken);
    expect(alerts.status).toBe(200);
    expect(alerts.body.alerts[0].allergen).toBe('peanut');

    const alternatives = await request(app)
      .get('/api/insights/personalized-alternatives')
      .set('Authorization', userToken);
    expect(alternatives.status).toBe(200);
    expect(alternatives.body.recommendations.length).toBeGreaterThan(0);

    const exportRes = await request(app)
      .get('/api/insights/export')
      .set('Authorization', userToken);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.incidents.length).toBe(1);
    expect(exportRes.body.corrections.length).toBe(1);

    const pendingCorrections = await request(app)
      .get('/api/admin/corrections/pending')
      .set('Authorization', adminToken);
    expect(pendingCorrections.status).toBe(200);
    expect(pendingCorrections.body.corrections.length).toBe(1);

    const updateCorrection = await request(app)
      .patch(`/api/admin/corrections/${correction.body.id}/status`)
      .set('Authorization', adminToken)
      .send({ status: 'verified' });
    expect(updateCorrection.status).toBe(200);

    const incidentsByAllergen = await request(app)
      .get('/api/admin/analytics/incidents-by-allergen')
      .set('Authorization', adminToken);
    expect(incidentsByAllergen.status).toBe(200);
    expect(incidentsByAllergen.body.incidents[0].allergen).toBe('peanut');

    const userGrowth = await request(app)
      .get('/api/admin/analytics/user-growth')
      .set('Authorization', adminToken);
    expect(userGrowth.status).toBe(200);
    expect(userGrowth.body.monthly.length).toBeGreaterThan(0);

    const adminEngagement = await request(app)
      .get('/api/admin/analytics/engagement')
      .set('Authorization', adminToken);
    expect(adminEngagement.status).toBe(200);
    expect(adminEngagement.body.active_users_last_7_days).toBeGreaterThan(0);

    const docs = await request(app).get('/api/docs');
    expect(docs.status).toBe(200);
    expect(docs.body.medical).toContain('GET /api/medical/leaderboard');

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.phase).toBe('phase2');
  });
});
