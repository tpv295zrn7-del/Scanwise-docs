const request = require('supertest');
const { createApp } = require('../src/app');

describe('ScanWise backend', () => {
  let app;
  let token;
  let refreshToken;
  const password = 'Password1!';

  beforeEach(async () => {
    app = createApp({ dbPath: ':memory:', jwtSecret: 'test-secret' });
    const res = await request(app).post('/api/auth/register').send({
      email: 'USER@example.com',
      password,
      name: 'User'
    });
    token = res.body.token;
    refreshToken = res.body.refresh_token;
  });

  test('register/login flow works', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.refresh_token).toBeTruthy();
    expect(login.body.user.email).toBe('user@example.com');
  });

  test('register rejects weak passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'weak@example.com',
      password: 'password123',
      name: 'Weak User'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AUTH_WEAK_PASSWORD');
  });

  test('refresh rotates tokens and logout revokes them', async () => {
    const refresh = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.token).toBeTruthy();
    expect(refresh.body.refresh_token).toBeTruthy();
    expect(refresh.body.refresh_token).not.toBe(refreshToken);

    const reused = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.body.code).toBe('AUTH_REFRESH_INVALID');

    const logout = await request(app).post('/api/auth/logout').send({ refresh_token: refresh.body.refresh_token });
    expect(logout.status).toBe(200);

    const revoked = await request(app).post('/api/auth/refresh').send({ refresh_token: refresh.body.refresh_token });
    expect(revoked.status).toBe(401);
  });

  test('free tier scan limit is enforced', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/api/scans').set('Authorization', token).send({ barcode: '0001' });
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).post('/api/scans').set('Authorization', token).send({ barcode: '0001' });
    expect(blocked.status).toBe(402);
    expect(blocked.body.upgrade_required).toBe(true);
  });

  test('premium subscription unlocks full alternatives list', async () => {
    await request(app)
      .post('/api/subscriptions/start')
      .set('Authorization', token)
      .send({ tier: 'premium', billing_period: 'monthly' });

    const alternatives = await request(app)
      .get('/api/alternatives/0001?goals=lower_sugar,higher_protein')
      .set('Authorization', token);

    expect(alternatives.status).toBe(200);
    expect(alternatives.body.alternatives.length).toBeGreaterThan(1);
  });

  test('family profiles capped at five', async () => {
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', token)
        .send({ name: `Kid ${i + 1}` });
      expect(res.status).toBe(201);
    }

    const fail = await request(app)
      .post('/api/profiles')
      .set('Authorization', token)
      .send({ name: 'Kid 5' });
    expect(fail.status).toBe(400);
    expect(fail.body.code).toBe('PROFILE_LIMIT_REACHED');
  });

  test('forgot/reset password invalidates old sessions and accepts strong replacement password', async () => {
    const forgot = await request(app).post('/api/auth/password/forgot').send({ email: 'user@example.com' });
    expect(forgot.status).toBe(200);
    expect(forgot.body.reset_token).toMatch(/^reset_[a-f0-9]+$/);

    const reset = await request(app).post('/api/auth/password/reset').send({
      token: forgot.body.reset_token,
      password: 'NewPassword2@'
    });
    expect(reset.status).toBe(200);

    const staleRefresh = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(staleRefresh.status).toBe(401);

    const login = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'NewPassword2@' });
    expect(login.status).toBe(200);
  });

  test('me endpoint returns onboarding state and richer profile fields', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', token);
    expect(me.status).toBe(200);
    expect(me.body.onboarding.current_step).toBe('welcome');
    expect(me.body.profiles[0].relationship).toBe('self');
    expect(me.body.profiles[0].sync.retry_count).toBe(0);
  });

  test('profiles support structured health data and onboarding persists progress', async () => {
    const createProfile = await request(app)
      .post('/api/profiles')
      .set('Authorization', token)
      .send({
        name: 'Kid 1',
        relationship: 'child',
        allergies: [{ name: 'nuts', severity: 'high' }],
        goals: ['lower_sugar'],
        conditions: ['diabetes'],
        dietary_preferences: ['gluten_free'],
        metrics: { weight_kg: 30 }
      });

    expect(createProfile.status).toBe(201);
    expect(createProfile.body.relationship).toBe('child');
    expect(createProfile.body.allergies[0]).toEqual({ name: 'nuts', severity: 'high' });

    const updated = await request(app)
      .put(`/api/profiles/${createProfile.body.id}`)
      .set('Authorization', token)
      .send({
        goals: ['higher_protein', 'lower_sugar'],
        metrics: { weight_kg: 31 }
      });
    expect(updated.status).toBe(200);
    expect(updated.body.goals).toEqual(['higher_protein', 'lower_sugar']);
    expect(updated.body.metrics.weight_kg).toBe(31);

    const onboarding = await request(app)
      .put('/api/onboarding')
      .set('Authorization', token)
      .send({
        current_step: 'review',
        completed_steps: ['welcome', 'health_goals', 'allergies', 'family_profiles', 'review'],
        preferences: { skippedLogin: false }
      });
    expect(onboarding.status).toBe(200);
    expect(onboarding.body.progress.percent).toBe(100);
    expect(onboarding.body.completed_at).toBeTruthy();

    const fetched = await request(app).get('/api/onboarding').set('Authorization', token);
    expect(fetched.status).toBe(200);
    expect(fetched.body.completed_steps).toHaveLength(5);
  });
});
