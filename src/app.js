const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const GOALS = [
  { id: 'lower_sugar', name: 'Lower Sugar', field: 'sugar_g', lower_is_better: true, weight: 1.0 },
  { id: 'higher_protein', name: 'Higher Protein', field: 'protein_g', lower_is_better: false, weight: 1.0 },
  { id: 'budget_friendly', name: 'Budget Friendly', field: 'estimated_price', lower_is_better: true, weight: 1.0 },
  { id: 'lower_sodium', name: 'Lower Sodium', field: 'sodium_mg', lower_is_better: true, weight: 1.0 },
  { id: 'higher_fiber', name: 'Higher Fiber', field: 'fiber_g', lower_is_better: false, weight: 1.0 },
  { id: 'lower_fat', name: 'Lower Fat', field: 'total_fat_g', lower_is_better: true, weight: 1.0 },
  { id: 'lower_calories', name: 'Lower Calories', field: 'calories', lower_is_better: true, weight: 1.0 }
];

const BADGES = [
  { key: 'safety_citizen', minPoints: 100, title: 'Safety Citizen' },
  { key: 'guardian', minPoints: 500, title: 'Guardian' },
  { key: 'champion', minPoints: 1000, title: 'Champion' }
];

const EVENT_POINTS = {
  incident_report: 25,
  community_vote: 10,
  verification: 40
};

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function createDb(dbPath = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      region TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      allergies TEXT DEFAULT '[]',
      goals TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id INTEGER PRIMARY KEY,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      tier TEXT DEFAULT 'free',
      billing_period TEXT,
      status TEXT DEFAULT 'inactive',
      trial_ends_at TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      stripe_invoice_id TEXT,
      amount_cents INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scan_usage (
      user_id INTEGER NOT NULL,
      month_key TEXT NOT NULL,
      scan_count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, month_key)
    );

    CREATE TABLE IF NOT EXISTS products (
      barcode TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      brand TEXT,
      nutrition TEXT,
      ingredients TEXT,
      estimated_price REAL,
      confidence TEXT DEFAULT 'verified',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      profile_id INTEGER,
      barcode TEXT NOT NULL,
      confidence TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_items (
      user_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, barcode)
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL,
      user_id INTEGER,
      nutrition TEXT,
      source TEXT,
      status TEXT DEFAULT 'pending',
      votes_up INTEGER DEFAULT 0,
      votes_down INTEGER DEFAULT 0,
      verified_by_medical INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS correction_votes (
      correction_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      vote INTEGER NOT NULL,
      PRIMARY KEY (correction_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS gamification (
      user_id INTEGER PRIMARY KEY,
      points INTEGER DEFAULT 0,
      reputation INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_key TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, badge_key)
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (!count) {
    const insert = db.prepare('INSERT INTO products (barcode, name, category, brand, nutrition, ingredients, estimated_price, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insert.run('0001', 'Crunchy Oats', 'cereal', 'ScanWise', JSON.stringify({ calories: 140, sugar_g: 7, protein_g: 5, sodium_mg: 120, fiber_g: 4, total_fat_g: 2 }), JSON.stringify(['oats']), 4.99, 'verified');
    insert.run('0002', 'Power Oats', 'cereal', 'ScanWise', JSON.stringify({ calories: 135, sugar_g: 3, protein_g: 9, sodium_mg: 100, fiber_g: 5, total_fat_g: 2 }), JSON.stringify(['oats', 'pea protein']), 5.99, 'verified');
    insert.run('0003', 'Sweet Oats', 'cereal', 'ScanWise', JSON.stringify({ calories: 160, sugar_g: 14, protein_g: 3, sodium_mg: 180, fiber_g: 2, total_fat_g: 3 }), JSON.stringify(['oats', 'sugar']), 3.99, 'estimated');
  }
  return db;
}

function computeScore(product, goals) {
  const nut = typeof product.nutrition === 'string' ? JSON.parse(product.nutrition) : product.nutrition;
  const price = product.estimated_price || 0;
  let totalScore = 0;
  let totalWeight = 0;
  for (const goalId of goals) {
    const goal = GOALS.find((g) => g.id === goalId);
    if (!goal) continue;
    const value = goal.field === 'estimated_price' ? price : nut[goal.field];
    if (value === undefined || value === null) continue;
    const maxVal = goal.field === 'estimated_price' ? 15 : goal.field === 'sugar_g' ? 40 : goal.field === 'protein_g' ? 20 : goal.field === 'sodium_mg' ? 1000 : goal.field === 'fiber_g' ? 10 : goal.field === 'total_fat_g' ? 30 : 500;
    let score = Math.max(0, Math.min(100, (value / maxVal) * 100));
    if (goal.lower_is_better) score = 100 - score;
    totalScore += score * goal.weight;
    totalWeight += goal.weight;
  }
  return totalWeight ? Math.round(totalScore / totalWeight) : 50;
}

function grantGamification(db, userId, eventType) {
  const points = EVENT_POINTS[eventType] || 0;
  const row = db.prepare('SELECT points, reputation FROM gamification WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO gamification (user_id, points, reputation) VALUES (?, ?, ?)').run(userId, points, points);
  } else {
    db.prepare('UPDATE gamification SET points = ?, reputation = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(row.points + points, row.reputation + points, userId);
  }

  const total = db.prepare('SELECT points FROM gamification WHERE user_id = ?').get(userId).points;
  for (const badge of BADGES) {
    if (total >= badge.minPoints) {
      db.prepare('INSERT OR IGNORE INTO achievements (user_id, badge_key) VALUES (?, ?)').run(userId, badge.key);
    }
  }
}

function makeToken(user, secret) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
}

function createApp(options = {}) {
  const app = express();
  const db = options.db || createDb(options.dbPath || process.env.DB_PATH || './scanwise.db');
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'dev-secret-change-me';
  const stripeSecret = options.stripeSecret || process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = options.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
  const allowedOrigin = options.allowedOrigin || process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = allowedOrigin.split(',').map((v) => v.trim()).filter(Boolean);

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
  }));

  function auth(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      req.user = jwt.verify(token, jwtSecret);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  function subscriptionFor(userId) {
    const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
    if (!sub) return { tier: 'free', status: 'active', trialActive: false };
    const trialActive = sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() > Date.now();
    return { ...sub, trialActive };
  }

  function checkScanAccess(userId) {
    const sub = subscriptionFor(userId);
    if (sub.tier === 'premium' && sub.status === 'active') return { allowed: true, tier: 'premium', remaining: null };
    if (sub.trialActive) return { allowed: true, tier: 'trial', remaining: null };
    const key = monthKey();
    const usage = db.prepare('SELECT scan_count FROM scan_usage WHERE user_id = ? AND month_key = ?').get(userId, key);
    const count = usage ? usage.scan_count : 0;
    return { allowed: count < 10, tier: 'free', remaining: Math.max(0, 10 - count) };
  }

  const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1), region: z.string().optional() });
  const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

  app.post('/api/auth/register', (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password, name, region } = parsed.data;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password_hash, name, region) VALUES (?, ?, ?, ?)').run(email, hash, name, region || null);
    db.prepare('INSERT INTO profiles (user_id, name) VALUES (?, ?)').run(result.lastInsertRowid, `${name} (Primary)`);
    const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = makeToken(user, jwtSecret);
    res.status(201).json({ token, user: { id: user.id, email, name, region } });
  });

  app.post('/api/auth/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email);
    if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = makeToken(user, jwtSecret);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, region: user.region, role: user.role } });
  });

  app.post('/api/auth/password/forgot', (req, res) => {
    const email = z.string().email().safeParse(req.body.email);
    if (!email.success) return res.status(400).json({ error: 'Valid email required' });
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.data);
    if (!user) return res.json({ status: 'ok' });
    const token = `reset_${Math.random().toString(36).slice(2, 12)}`;
    db.prepare('INSERT OR REPLACE INTO password_resets (token, user_id, expires_at) VALUES (?, ?, datetime(\'now\', \'+30 minutes\'))').run(token, user.id);
    res.json({ status: 'ok', reset_token: token });
  });

  app.post('/api/auth/password/reset', (req, res) => {
    const parsed = z.object({ token: z.string().min(5), password: z.string().min(8) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const rec = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(parsed.data.token);
    if (!rec) return res.status(400).json({ error: 'Invalid token' });
    if (new Date(rec.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(parsed.data.password, 10), rec.user_id);
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(parsed.data.token);
    res.json({ status: 'password_updated' });
  });

  app.get('/api/auth/me', auth, (req, res) => {
    const user = db.prepare('SELECT id, email, name, region, role, created_at FROM users WHERE id = ?').get(req.user.sub);
    const profiles = db.prepare('SELECT id, name, allergies, goals FROM profiles WHERE user_id = ? ORDER BY id').all(req.user.sub)
      .map((p) => ({ ...p, allergies: JSON.parse(p.allergies || '[]'), goals: JSON.parse(p.goals || '[]') }));
    res.json({ ...user, profiles });
  });

  app.put('/api/auth/me', auth, (req, res) => {
    const parsed = z.object({ name: z.string().min(1).optional(), region: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    db.prepare('UPDATE users SET name = COALESCE(?, name), region = COALESCE(?, region) WHERE id = ?').run(parsed.data.name ?? null, parsed.data.region ?? null, req.user.sub);
    const user = db.prepare('SELECT id, email, name, region FROM users WHERE id = ?').get(req.user.sub);
    res.json(user);
  });

  app.get('/api/profiles', auth, (req, res) => {
    const profiles = db.prepare('SELECT id, name, allergies, goals FROM profiles WHERE user_id = ? ORDER BY id').all(req.user.sub)
      .map((p) => ({ ...p, allergies: JSON.parse(p.allergies || '[]'), goals: JSON.parse(p.goals || '[]') }));
    res.json({ profiles });
  });

  app.post('/api/profiles', auth, (req, res) => {
    const parsed = z.object({ name: z.string().min(1), allergies: z.array(z.string()).max(20).optional(), goals: z.array(z.string()).max(20).optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const total = db.prepare('SELECT COUNT(*) AS c FROM profiles WHERE user_id = ?').get(req.user.sub).c;
    if (total >= 5) return res.status(400).json({ error: 'Maximum 5 family profiles' });
    const result = db.prepare('INSERT INTO profiles (user_id, name, allergies, goals) VALUES (?, ?, ?, ?)').run(req.user.sub, parsed.data.name, JSON.stringify(parsed.data.allergies || []), JSON.stringify(parsed.data.goals || []));
    res.status(201).json({ id: result.lastInsertRowid, ...parsed.data });
  });

  app.put('/api/profiles/:id', auth, (req, res) => {
    const parsed = z.object({ name: z.string().min(1).optional(), allergies: z.array(z.string()).optional(), goals: z.array(z.string()).optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    db.prepare('UPDATE profiles SET name = ?, allergies = ?, goals = ? WHERE id = ?').run(parsed.data.name || profile.name, JSON.stringify(parsed.data.allergies || JSON.parse(profile.allergies || '[]')), JSON.stringify(parsed.data.goals || JSON.parse(profile.goals || '[]')), req.params.id);
    res.json({ status: 'updated' });
  });

  app.post('/api/subscriptions/start', auth, async (req, res, next) => {
    try {
      const parsed = z.object({ tier: z.enum(['premium']), billing_period: z.enum(['monthly', 'annual']) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO subscriptions (user_id, tier, billing_period, status, trial_ends_at, cancel_at_period_end, updated_at)
        VALUES (?, ?, ?, 'active', ?, 0, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET tier = excluded.tier, billing_period = excluded.billing_period, status = excluded.status, trial_ends_at = excluded.trial_ends_at, cancel_at_period_end = 0, updated_at = datetime('now')
      `).run(req.user.sub, parsed.data.tier, parsed.data.billing_period, trialEnd);

      if (stripe) {
        const customer = await stripe.customers.create({ email: req.user.email, metadata: { userId: String(req.user.sub) } });
        db.prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?').run(customer.id, req.user.sub);
      }
      res.json({ status: 'active', tier: 'premium', trial_ends_at: trialEnd });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/subscriptions/status', auth, (req, res) => {
    const sub = subscriptionFor(req.user.sub);
    const usage = db.prepare('SELECT scan_count FROM scan_usage WHERE user_id = ? AND month_key = ?').get(req.user.sub, monthKey());
    res.json({ ...sub, scans_used_this_month: usage ? usage.scan_count : 0, free_limit: 10 });
  });

  app.post('/api/subscriptions/cancel', auth, (req, res) => {
    db.prepare('UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = datetime(\'now\') WHERE user_id = ?').run(req.user.sub);
    res.json({ status: 'cancel_scheduled' });
  });

  app.post('/api/subscriptions/upgrade', auth, (req, res) => {
    db.prepare('UPDATE subscriptions SET tier = \"premium\", status = \"active\", updated_at = datetime(\'now\') WHERE user_id = ?').run(req.user.sub);
    res.json({ status: 'upgraded', tier: 'premium' });
  });

  app.get('/api/subscriptions/invoices', auth, (req, res) => {
    const invoices = db.prepare('SELECT id, stripe_invoice_id, amount_cents, currency, status, created_at FROM invoices WHERE user_id = ? ORDER BY id DESC').all(req.user.sub);
    res.json({ invoices });
  });

  app.post('/api/payments/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
    try {
      let event;
      if (stripe && stripeWebhookSecret && req.headers['stripe-signature']) {
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], stripeWebhookSecret);
      } else {
        event = JSON.parse(req.body.toString());
      }

      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        const userId = Number(invoice.metadata?.userId || 0);
        if (userId) {
          db.prepare('INSERT INTO invoices (user_id, stripe_invoice_id, amount_cents, currency, status) VALUES (?, ?, ?, ?, ?)')
            .run(userId, invoice.id, invoice.amount_paid || 0, invoice.currency || 'usd', 'paid');
          db.prepare('UPDATE subscriptions SET status = \"active\", updated_at = datetime(\'now\') WHERE user_id = ?').run(userId);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const userId = Number(event.data.object.metadata?.userId || 0);
        if (userId) db.prepare('UPDATE subscriptions SET status = \"cancelled\", tier = \"free\", updated_at = datetime(\'now\') WHERE user_id = ?').run(userId);
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/goals', (_req, res) => res.json({ goals: GOALS }));

  app.get('/api/products/:barcode', auth, (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...product, nutrition: JSON.parse(product.nutrition || '{}'), ingredients: JSON.parse(product.ingredients || '[]') });
  });

  app.get('/api/alternatives/:barcode', auth, (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const goals = req.query.goals ? String(req.query.goals).split(',').filter(Boolean) : ['lower_sugar'];
    const candidates = db.prepare('SELECT * FROM products WHERE category = ? AND barcode != ?').all(product.category, product.barcode);
    const alternatives = candidates.map((p) => ({
      ...p,
      nutrition: JSON.parse(p.nutrition || '{}'),
      ingredients: JSON.parse(p.ingredients || '[]'),
      match_score: computeScore(p, goals)
    })).sort((a, b) => b.match_score - a.match_score).slice(0, 3);

    const sub = subscriptionFor(req.user.sub);
    const limited = sub.tier !== 'premium' && !sub.trialActive;
    res.json({ original_barcode: product.barcode, goals, alternatives: limited ? alternatives.slice(0, 1) : alternatives, total_considered: candidates.length });
  });

  app.post('/api/scans', auth, (req, res) => {
    const parsed = z.object({ barcode: z.string().optional(), image: z.string().optional(), profile_id: z.number().int().optional() }).safeParse(req.body);
    if (!parsed.success || (!parsed.data.barcode && !parsed.data.image)) return res.status(400).json({ error: 'barcode or image required' });
    const access = checkScanAccess(req.user.sub);
    if (!access.allowed) return res.status(402).json({ error: 'Scan limit reached for free tier', upgrade_required: true });

    const product = parsed.data.barcode ? db.prepare('SELECT * FROM products WHERE barcode = ?').get(parsed.data.barcode) : null;
    const key = monthKey();
    db.prepare('INSERT INTO scan_usage (user_id, month_key, scan_count) VALUES (?, ?, 1) ON CONFLICT(user_id, month_key) DO UPDATE SET scan_count = scan_count + 1').run(req.user.sub, key);

    if (product) {
      db.prepare('INSERT INTO scan_history (user_id, profile_id, barcode, confidence) VALUES (?, ?, ?, ?)').run(req.user.sub, parsed.data.profile_id || null, product.barcode, product.confidence);
      return res.json({ found: true, confidence: product.confidence, tier: access.tier, product: { ...product, nutrition: JSON.parse(product.nutrition || '{}'), ingredients: JSON.parse(product.ingredients || '[]') } });
    }

    db.prepare('INSERT INTO scan_history (user_id, profile_id, barcode, confidence) VALUES (?, ?, ?, ?)').run(req.user.sub, parsed.data.profile_id || null, parsed.data.barcode || 'image_only', 'incomplete');
    return res.json({ found: false, confidence: 'incomplete', tier: access.tier, message: 'Product not found in database' });
  });

  app.get('/api/scans/history', auth, (req, res) => {
    const items = db.prepare('SELECT id, profile_id, barcode, confidence, created_at FROM scan_history WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(req.user.sub);
    res.json({ scans: items });
  });

  app.post('/api/saved-items', auth, (req, res) => {
    const parsed = z.object({ barcode: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    db.prepare('INSERT OR IGNORE INTO saved_items (user_id, barcode) VALUES (?, ?)').run(req.user.sub, parsed.data.barcode);
    res.status(201).json({ status: 'saved' });
  });

  app.get('/api/saved-items', auth, (req, res) => {
    const items = db.prepare('SELECT s.barcode, s.created_at, p.name FROM saved_items s LEFT JOIN products p ON p.barcode = s.barcode WHERE s.user_id = ? ORDER BY s.created_at DESC').all(req.user.sub);
    res.json({ items });
  });

  app.delete('/api/saved-items/:barcode', auth, (req, res) => {
    db.prepare('DELETE FROM saved_items WHERE user_id = ? AND barcode = ?').run(req.user.sub, req.params.barcode);
    res.json({ status: 'removed' });
  });

  app.post('/api/corrections', auth, (req, res) => {
    const parsed = z.object({ barcode: z.string().min(1), nutrition: z.record(z.any()), source: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (!parsed.data.nutrition.calories || parsed.data.nutrition.calories > 2000) return res.status(400).json({ error: 'Nutrition data failed sanity check' });
    const result = db.prepare('INSERT INTO corrections (barcode, user_id, nutrition, source) VALUES (?, ?, ?, ?)').run(parsed.data.barcode, req.user.sub, JSON.stringify(parsed.data.nutrition), parsed.data.source || 'user');
    grantGamification(db, req.user.sub, 'verification');
    res.status(201).json({ id: result.lastInsertRowid, status: 'submitted' });
  });

  app.post('/api/corrections/:id/vote', auth, (req, res) => {
    const parsed = z.object({ vote: z.enum(['up', 'down']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const correction = db.prepare('SELECT id FROM corrections WHERE id = ?').get(req.params.id);
    if (!correction) return res.status(404).json({ error: 'Correction not found' });
    const voteValue = parsed.data.vote === 'up' ? 1 : -1;
    db.prepare('INSERT OR REPLACE INTO correction_votes (correction_id, user_id, vote) VALUES (?, ?, ?)').run(req.params.id, req.user.sub, voteValue);
    const tally = db.prepare('SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END),0) AS up, COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END),0) AS down FROM correction_votes WHERE correction_id = ?').get(req.params.id);
    db.prepare('UPDATE corrections SET votes_up = ?, votes_down = ? WHERE id = ?').run(tally.up, tally.down, req.params.id);
    grantGamification(db, req.user.sub, 'community_vote');
    res.json({ status: 'recorded', votes_up: tally.up, votes_down: tally.down });
  });

  app.post('/api/corrections/:id/verify', auth, (req, res) => {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.sub);
    if (!user || user.role !== 'medical') return res.status(403).json({ error: 'Medical role required' });
    db.prepare('UPDATE corrections SET verified_by_medical = 1, status = \"verified\" WHERE id = ?').run(req.params.id);
    grantGamification(db, req.user.sub, 'verification');
    res.json({ status: 'verified' });
  });

  app.get('/api/corrections', auth, (_req, res) => {
    const items = db.prepare('SELECT id, barcode, nutrition, status, votes_up, votes_down, verified_by_medical, created_at FROM corrections ORDER BY id DESC LIMIT 200').all();
    res.json({ corrections: items.map((c) => ({ ...c, nutrition: JSON.parse(c.nutrition || '{}') })) });
  });

  app.post('/api/gamification/events', auth, (req, res) => {
    const parsed = z.object({ type: z.enum(['incident_report', 'community_vote', 'verification']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    grantGamification(db, req.user.sub, parsed.data.type);
    res.json({ status: 'awarded', points: EVENT_POINTS[parsed.data.type] });
  });

  app.get('/api/gamification/me', auth, (req, res) => {
    const g = db.prepare('SELECT points, reputation FROM gamification WHERE user_id = ?').get(req.user.sub) || { points: 0, reputation: 0 };
    const badges = db.prepare('SELECT badge_key, created_at FROM achievements WHERE user_id = ? ORDER BY id').all(req.user.sub);
    res.json({ ...g, badges });
  });

  app.get('/api/gamification/leaderboard', auth, (req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.region, COALESCE(g.points, 0) AS points, COALESCE(g.reputation, 0) AS reputation
      FROM users u
      LEFT JOIN gamification g ON g.user_id = u.id
      ORDER BY points DESC, reputation DESC, u.id ASC
      LIMIT 100
    `).all();
    const regional = req.query.region ? rows.filter((r) => r.region === req.query.region) : rows;
    res.json({ global: rows, regional });
  });

  app.get('/api/docs', (_req, res) => {
    res.json({
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/password/forgot', 'POST /api/auth/password/reset', 'GET/PUT /api/auth/me'],
      payments: ['POST /api/subscriptions/start', 'POST /api/subscriptions/cancel', 'POST /api/subscriptions/upgrade', 'GET /api/subscriptions/status', 'GET /api/subscriptions/invoices', 'POST /api/payments/webhooks/stripe'],
      gamification: ['POST /api/gamification/events', 'GET /api/gamification/me', 'GET /api/gamification/leaderboard'],
      core: ['GET /api/products/:barcode', 'POST /api/scans', 'GET /api/scans/history', 'GET /api/alternatives/:barcode', 'GET/POST/DELETE /api/saved-items'],
      corrections: ['POST /api/corrections', 'POST /api/corrections/:id/vote', 'POST /api/corrections/:id/verify', 'GET /api/corrections']
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', products: db.prepare('SELECT COUNT(*) AS c FROM products').get().c });
  });

  app.use((err, _req, res, _next) => {
    const msg = err && err.message ? err.message : 'Unexpected error';
    res.status(500).json({ error: msg });
  });

  app.locals.db = db;
  return app;
}

module.exports = { createApp, createDb, computeScore, GOALS };
