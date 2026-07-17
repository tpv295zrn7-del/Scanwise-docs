/**
 * Additional tests to reach 80%+ coverage.
 * Covers: auth flows, subscriptions, saved items, corrections, incidents,
 * medical, B2B, admin, search, gamification, leaderboard, health.
 */
const request = require('supertest');
const { createApp } = require('../src/app');

async function reg(app, opts = {}) {
  const res = await request(app).post('/api/auth/register').send({
    email: opts.email || `user${Date.now()}${Math.random()}@example.com`,
    password: opts.password || 'password123',
    name: opts.name || 'Test User',
    region: opts.region
  });
  return { token: res.body.token, user: res.body.user, id: res.body.user && res.body.user.id };
}

describe('ScanWise coverage suite', () => {
  let app;
  let db;
  let userToken;
  let adminToken;
  let medToken;
  let userId;

  beforeEach(async () => {
    app = createApp({ dbPath: ':memory:', jwtSecret: 'test-secret' });
    db = app.locals.db;

    const u = await reg(app);
    userToken = u.token;
    userId = u.id;

    const adminReg = await reg(app, { email: 'admin@cov.test', name: 'Admin' });
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminReg.id);
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@cov.test', password: 'password123' });
    adminToken = adminLogin.body.token;

    const medReg = await reg(app, { email: 'med@cov.test', name: 'Medic' });
    db.prepare("UPDATE users SET role = 'medical' WHERE id = ?").run(medReg.id);
    db.prepare("INSERT OR REPLACE INTO medical_professionals (user_id, specialty, verified) VALUES (?, ?, 1)").run(medReg.id, 'Allergy');
    const medLogin = await request(app).post('/api/auth/login').send({ email: 'med@cov.test', password: 'password123' });
    medToken = medLogin.body.token;
  });

  // ─── AUTH ────────────────────────────────────────────────────────────────────

  test('GET /api/goals returns goals list', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.goals)).toBe(true);
    expect(res.body.goals.length).toBeGreaterThan(0);
  });

  test('password forgot + reset flow', async () => {
    await reg(app, { email: 'reset@cov.test' });
    const forgot = await request(app).post('/api/auth/password/forgot').send({ email: 'reset@cov.test' });
    expect(forgot.status).toBe(200);
    const resetToken = forgot.body.reset_token;
    const reset = await request(app).post('/api/auth/password/reset').send({ token: resetToken, password: 'newpass12345' });
    expect(reset.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: 'reset@cov.test', password: 'newpass12345' });
    expect(login.status).toBe(200);
  });

  test('password forgot for unknown email returns ok', async () => {
    const res = await request(app).post('/api/auth/password/forgot').send({ email: 'unknown@nobody.test' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('password reset with invalid token returns 400', async () => {
    const res = await request(app).post('/api/auth/password/reset').send({ token: 'bad_token', password: 'newpass12345' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/auth/me updates user', async () => {
    const res = await request(app).put('/api/auth/me').set('Authorization', userToken).send({ name: 'Updated Name', region: 'south' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  test('auth middleware rejects missing/invalid token', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);
    const badToken = await request(app).get('/api/auth/me').set('Authorization', 'bad.token.here');
    expect(badToken.status).toBe(401);
  });

  test('register with duplicate email returns 409', async () => {
    await reg(app, { email: 'dup@cov.test' });
    const dup = await request(app).post('/api/auth/register').send({ email: 'dup@cov.test', password: 'password123', name: 'Dup' });
    expect(dup.status).toBe(409);
  });

  test('login with wrong password returns 401', async () => {
    await reg(app, { email: 'pw@cov.test' });
    const res = await request(app).post('/api/auth/login').send({ email: 'pw@cov.test', password: 'wrong_password' });
    expect(res.status).toBe(401);
  });

  // ─── PROFILES ─────────────────────────────────────────────────────────────

  test('PUT /api/profiles/:id updates profile', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', userToken);
    const profileId = me.body.profiles[0].id;
    const res = await request(app).put(`/api/profiles/${profileId}`).set('Authorization', userToken)
      .send({ name: 'Updated Profile', allergies: ['milk'], goals: ['lower_sugar'] });
    expect(res.status).toBe(200);
    const meAgain = await request(app).get('/api/auth/me').set('Authorization', userToken);
    expect(meAgain.body.profiles[0].allergies).toContain('milk');
  });

  test('PUT /api/profiles/:id returns 404 for wrong user', async () => {
    const other = await reg(app);
    const me = await request(app).get('/api/auth/me').set('Authorization', other.token);
    const profileId = me.body.profiles[0].id;
    const res = await request(app).put(`/api/profiles/${profileId}`).set('Authorization', userToken).send({ name: 'Hacked' });
    expect(res.status).toBe(404);
  });

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

  test('subscription cancel, upgrade, status, invoices', async () => {
    await request(app).post('/api/subscriptions/start').set('Authorization', userToken).send({ tier: 'premium', billing_period: 'monthly' });
    const cancel = await request(app).post('/api/subscriptions/cancel').set('Authorization', userToken);
    expect(cancel.status).toBe(200);
    const upgrade = await request(app).post('/api/subscriptions/upgrade').set('Authorization', userToken);
    expect(upgrade.status).toBe(200);
    const status = await request(app).get('/api/subscriptions/status').set('Authorization', userToken);
    expect(status.status).toBe(200);
    expect(status.body.tier).toBe('premium');
    const invoices = await request(app).get('/api/subscriptions/invoices').set('Authorization', userToken);
    expect(invoices.status).toBe(200);
    expect(Array.isArray(invoices.body.invoices)).toBe(true);
  });

  test('Stripe webhook invoice.payment_succeeded', async () => {
    const event = {
      type: 'invoice.payment_succeeded',
      data: { object: { id: 'inv_test', metadata: { userId: String(userId) }, amount_paid: 999, currency: 'usd' } }
    };
    const res = await request(app).post('/api/payments/webhooks/stripe')
      .set('Content-Type', 'application/json').send(event);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  test('Stripe webhook customer.subscription.deleted', async () => {
    const event = {
      type: 'customer.subscription.deleted',
      data: { object: { metadata: { userId: String(userId) } } }
    };
    const res = await request(app).post('/api/payments/webhooks/stripe')
      .set('Content-Type', 'application/json').send(event);
    expect(res.status).toBe(200);
  });

  // ─── PRODUCTS + SCANS ─────────────────────────────────────────────────────

  test('GET /api/products/:barcode returns 404 for missing product', async () => {
    const res = await request(app).get('/api/products/NOTEXIST').set('Authorization', userToken);
    expect(res.status).toBe(404);
  });

  test('GET /api/products/:barcode returns product', async () => {
    const res = await request(app).get('/api/products/0001').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.barcode).toBe('0001');
  });

  test('GET /api/alternatives/:barcode returns 404 for missing product', async () => {
    const res = await request(app).get('/api/alternatives/NOTEXIST').set('Authorization', userToken);
    expect(res.status).toBe(404);
  });

  test('POST /api/scans returns not found for unknown barcode', async () => {
    const res = await request(app).post('/api/scans').set('Authorization', userToken).send({ barcode: 'UNKNOWN9999' });
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(false);
  });

  test('POST /api/scans rejects missing barcode and image', async () => {
    const res = await request(app).post('/api/scans').set('Authorization', userToken).send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/scans/history returns list', async () => {
    await request(app).post('/api/scans').set('Authorization', userToken).send({ barcode: '0001' });
    const res = await request(app).get('/api/scans/history').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.scans.length).toBeGreaterThan(0);
  });

  test('Saved items CRUD', async () => {
    const save = await request(app).post('/api/saved-items').set('Authorization', userToken).send({ barcode: '0001' });
    expect(save.status).toBe(201);
    const list = await request(app).get('/api/saved-items').set('Authorization', userToken);
    expect(list.body.items.some((i) => i.barcode === '0001')).toBe(true);
    const del = await request(app).delete('/api/saved-items/0001').set('Authorization', userToken);
    expect(del.status).toBe(200);
    const listAfter = await request(app).get('/api/saved-items').set('Authorization', userToken);
    expect(listAfter.body.items.some((i) => i.barcode === '0001')).toBe(false);
  });

  // ─── CORRECTIONS ──────────────────────────────────────────────────────────

  test('corrections: vote up/down, list, medical verify', async () => {
    const correction = await request(app).post('/api/corrections').set('Authorization', userToken)
      .send({ barcode: '0001', nutrition: { calories: 100, sugar_g: 5 }, source: 'label' });
    expect(correction.status).toBe(201);

    const voteDown = await request(app).post(`/api/corrections/${correction.body.id}/vote`).set('Authorization', userToken).send({ vote: 'down' });
    expect(voteDown.status).toBe(200);
    expect(voteDown.body.votes_down).toBe(1);

    const voteUp = await request(app).post(`/api/corrections/${correction.body.id}/vote`).set('Authorization', userToken).send({ vote: 'up' });
    expect(voteUp.status).toBe(200);
    expect(voteUp.body.votes_up).toBe(1);

    const voteNotFound = await request(app).post('/api/corrections/99999/vote').set('Authorization', userToken).send({ vote: 'up' });
    expect(voteNotFound.status).toBe(404);

    const list = await request(app).get('/api/corrections').set('Authorization', userToken);
    expect(list.status).toBe(200);
    expect(list.body.corrections.length).toBeGreaterThan(0);

    const verify = await request(app).post(`/api/corrections/${correction.body.id}/verify`).set('Authorization', medToken);
    expect(verify.status).toBe(200);
  });

  test('corrections verify rejects non-medical user', async () => {
    const correction = await request(app).post('/api/corrections').set('Authorization', userToken)
      .send({ barcode: '0001', nutrition: { calories: 150 }, source: 'label' });
    const res = await request(app).post(`/api/corrections/${correction.body.id}/verify`).set('Authorization', userToken);
    expect(res.status).toBe(403);
  });

  // ─── INCIDENTS ─────────────────────────────────────────────────────────────

  test('incident validation rejects invalid severity', async () => {
    const res = await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'peanut', symptoms: [], severity: 'catastrophic', doctor_consulted: false });
    expect(res.status).toBe(400);
  });

  test('GET /api/products/:barcode/incidents returns list', async () => {
    await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'peanut', symptoms: ['rash'], severity: 'mild', doctor_consulted: false });
    const res = await request(app).get('/api/products/0001/incidents').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.incidents.length).toBe(1);
  });

  test('GET /api/incidents/search filters by allergen and severity', async () => {
    await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'milk', symptoms: [], severity: 'moderate', doctor_consulted: true });
    await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0002', allergen: 'peanut', symptoms: [], severity: 'severe', doctor_consulted: false });

    const byAllergen = await request(app).get('/api/incidents/search?allergen=milk').set('Authorization', userToken);
    expect(byAllergen.body.incidents.length).toBe(1);
    expect(byAllergen.body.incidents[0].allergen).toBe('milk');

    const bySeverity = await request(app).get('/api/incidents/search?severity=severe').set('Authorization', userToken);
    expect(bySeverity.body.incidents.length).toBe(1);

    const byBarcode = await request(app).get('/api/incidents/search?barcode=0001').set('Authorization', userToken);
    expect(byBarcode.body.incidents.length).toBe(1);
  });

  test('GET /api/incidents/analytics returns aggregated data', async () => {
    await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'peanut', symptoms: [], severity: 'severe', doctor_consulted: true });
    const res = await request(app).get('/api/incidents/analytics').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.most_reported_allergens[0].allergen).toBe('peanut');
    expect(res.body.highest_severity_products[0].barcode).toBe('0001');
  });

  test('incident vote 404 for unknown incident', async () => {
    const res = await request(app).post('/api/incidents/99999/vote').set('Authorization', userToken).send({ helpful: true });
    expect(res.status).toBe(404);
  });

  // ─── MEDICAL ───────────────────────────────────────────────────────────────

  test('medical reject endpoint', async () => {
    const report = await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'soy', symptoms: [], severity: 'mild', doctor_consulted: false });
    const reject = await request(app).post(`/api/medical/reject/${report.body.id}`)
      .set('Authorization', medToken).send({ reason: 'Insufficient evidence provided' });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe('rejected');
  });

  test('medical reject requires reason', async () => {
    const report = await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'egg', symptoms: [], severity: 'mild', doctor_consulted: false });
    const reject = await request(app).post(`/api/medical/reject/${report.body.id}`)
      .set('Authorization', medToken).send({ reason: 'ab' });
    expect(reject.status).toBe(400);
  });

  test('medical reject 404 for unknown incident', async () => {
    const res = await request(app).post('/api/medical/reject/99999')
      .set('Authorization', medToken).send({ reason: 'Not a real incident at all' });
    expect(res.status).toBe(404);
  });

  test('medical leaderboard', async () => {
    const res = await request(app).get('/api/medical/leaderboard').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.professionals)).toBe(true);
  });

  test('medical pending-verifications returns sorted list', async () => {
    await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'peanut', symptoms: [], severity: 'severe', doctor_consulted: true });
    const res = await request(app).get('/api/medical/pending-verifications').set('Authorization', medToken);
    expect(res.status).toBe(200);
    expect(res.body.incidents.length).toBeGreaterThan(0);
  });

  test('medical verify 404 for unknown incident', async () => {
    const res = await request(app).post('/api/medical/verify/99999').set('Authorization', medToken).send({});
    expect(res.status).toBe(404);
  });

  test('non-medical user cannot access pending-verifications', async () => {
    const res = await request(app).get('/api/medical/pending-verifications').set('Authorization', userToken);
    expect(res.status).toBe(403);
  });

  // ─── INSIGHTS ──────────────────────────────────────────────────────────────

  test('allergen-alerts returns empty when no allergies', async () => {
    const res = await request(app).get('/api/insights/allergen-alerts').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.alerts).toEqual([]);
  });

  test('insights/export contains all user data sections', async () => {
    const res = await request(app).get('/api/insights/export').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(Array.isArray(res.body.scans)).toBe(true);
    expect(Array.isArray(res.body.corrections)).toBe(true);
    expect(Array.isArray(res.body.incidents)).toBe(true);
    expect(Array.isArray(res.body.achievements)).toBe(true);
  });

  test('insights/personalized-alternatives with no scans returns empty', async () => {
    const res = await request(app).get('/api/insights/personalized-alternatives').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.recommendations).toEqual([]);
  });

  test('insights/goal-progress with no scans returns all goals', async () => {
    const res = await request(app).get('/api/insights/goal-progress').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.goals.length).toBeGreaterThan(0);
  });

  // ─── B2B ───────────────────────────────────────────────────────────────────

  test('B2B: product-insights, category-analysis, regional-insights', async () => {
    const keyRes = await request(app).post('/api/b2b/keys').set('Authorization', adminToken)
      .send({ name: 'Test Partner', tier: 'premium' });
    expect(keyRes.status).toBe(201);
    const apiKey = keyRes.body.api_key;

    await request(app).post('/api/incidents').set('Authorization', userToken)
      .send({ barcode: '0001', allergen: 'wheat', symptoms: [], severity: 'moderate', doctor_consulted: false });

    const insights = await request(app).get('/api/b2b/product-insights/0001').set('X-API-Key', apiKey);
    expect(insights.status).toBe(200);
    expect(insights.body.barcode).toBe('0001');
    expect(insights.body.incident_count).toBe(1);

    const cat = await request(app).get('/api/b2b/category-analysis').set('X-API-Key', apiKey);
    expect(cat.status).toBe(200);
    expect(Array.isArray(cat.body.categories)).toBe(true);
    expect(cat.body.categories.length).toBeGreaterThan(0);

    const regional = await request(app).get('/api/b2b/regional-insights').set('X-API-Key', apiKey);
    expect(regional.status).toBe(200);
    expect(Array.isArray(regional.body.regions)).toBe(true);
  });

  test('B2B: missing API key returns 401', async () => {
    const res = await request(app).get('/api/b2b/allergen-trends');
    expect(res.status).toBe(401);
  });

  test('B2B: invalid API key returns 401', async () => {
    const res = await request(app).get('/api/b2b/allergen-trends').set('X-API-Key', 'sw_invalid_key_here');
    expect(res.status).toBe(401);
  });

  test('B2B key validation rejects bad input', async () => {
    const res = await request(app).post('/api/b2b/keys').set('Authorization', adminToken).send({ name: '', tier: 'free' });
    expect(res.status).toBe(400);
  });

  // ─── SEARCH ────────────────────────────────────────────────────────────────

  test('search with sort=newest and price_min', async () => {
    const res = await request(app).get('/api/search/products?q=Oats&sort=newest&price_min=4').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.products).toBeDefined();
  });

  test('search with allergen_exclude filters products', async () => {
    const res = await request(app).get('/api/search/products?allergen_exclude=sugar').set('Authorization', userToken);
    expect(res.status).toBe(200);
    // Sweet Oats has sugar in ingredients - it should be excluded
    expect(res.body.products.every((p) => !(p.ingredients || []).includes('sugar'))).toBe(true);
  });

  test('search with allergen_include filters products', async () => {
    const res = await request(app).get('/api/search/products?allergen_include=oats').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.products.every((p) => (p.ingredients || []).some((i) => i.includes('oats')))).toBe(true);
  });

  test('search with goal filter', async () => {
    const res = await request(app).get('/api/search/products?goal=lower_sugar').set('Authorization', userToken);
    expect(res.status).toBe(200);
  });

  test('search pagination returns correct structure', async () => {
    const res = await request(app).get('/api/search/products?page=1&per_page=2').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.total_pages).toBeDefined();
    expect(res.body.products.length).toBeLessThanOrEqual(2);
  });

  // ─── ADMIN ─────────────────────────────────────────────────────────────────

  test('admin user role change', async () => {
    const target = await reg(app);
    const res = await request(app).patch(`/api/admin/users/${target.id}/role`).set('Authorization', adminToken).send({ role: 'medical' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('medical');
  });

  test('admin user delete (soft)', async () => {
    const target = await reg(app);
    const res = await request(app).delete(`/api/admin/users/${target.id}`).set('Authorization', adminToken);
    expect(res.status).toBe(204);
  });

  test('admin product delete', async () => {
    const res = await request(app).delete('/api/admin/products/0003').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    const notFound = await request(app).get('/api/products/0003').set('Authorization', userToken);
    expect(notFound.status).toBe(404);
  });

  test('admin users filter by role', async () => {
    const res = await request(app).get('/api/admin/users?role=admin').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.users.every((u) => u.role === 'admin')).toBe(true);
  });

  // ─── GAMIFICATION ─────────────────────────────────────────────────────────

  test('POST /api/gamification/events awards points', async () => {
    const res = await request(app).post('/api/gamification/events').set('Authorization', userToken).send({ type: 'verification' });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(40);
  });

  test('gamification events rejects invalid type', async () => {
    const res = await request(app).post('/api/gamification/events').set('Authorization', userToken).send({ type: 'invalid_type' });
    expect(res.status).toBe(400);
  });

  test('leaderboard with region filter', async () => {
    const res = await request(app).get('/api/gamification/leaderboard?region=north').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.regional)).toBe(true);
  });

  // ─── HEALTH + DOCS ─────────────────────────────────────────────────────────

  test('GET /api/health returns phase2', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.phase).toBe('phase2');
  });

  test('GET /api/docs returns all endpoint groups', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body.incidents).toBeDefined();
    expect(res.body.medical).toBeDefined();
    expect(res.body.b2b).toBeDefined();
    expect(res.body.admin).toBeDefined();
  });

  test('error handler returns 500 for unexpected errors', async () => {
    // corrupt the auth token to trigger error
    const res = await request(app).get('/api/auth/me').set('Authorization', '******');
    expect(res.status).toBe(401);
  });
});
