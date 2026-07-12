const request = require('supertest');
const { createApp } = require('../src/app');

describe('ScanWise backend', () => {
  let app;
  let token;

  beforeEach(async () => {
    app = createApp({ dbPath: ':memory:', jwtSecret: 'test-secret' });
    const res = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
      name: 'User'
    });
    token = res.body.token;
  });

  test('register/login flow works', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
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
  });
});
