const crypto = require('crypto');
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
  { key: 'safety_citizen', minPoints: 100, title: '🥉 Safety Citizen', minVerified: 0 },
  { key: 'safety_guardian', minPoints: 500, title: '🥈 Safety Guardian', minVerified: 10 },
  { key: 'safety_champion', minPoints: 1000, title: '🥇 Safety Champion', minVerified: 50 },
  { key: 'master_detective', minPoints: 2000, title: '👑 Master Detective', minVerified: 0, minAccuracy: 95 },
  { key: 'community_leader', minPoints: 3000, title: '🌟 Community Leader', minVerified: 0 },
  { key: 'life_saver', minPoints: 0, title: '🎖️ Life Saver', special: 'life_saver' }
];

const EVENT_POINTS = {
  incident_report: 50,
  community_vote: 10,
  incident_verified: 100,
  medical_verification: 75,
  verification: 40,
  community_vote_incident: 10
};

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function weekKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const day = Math.floor((date.getTime() - start) / 86400000);
  return `${year}-W${String(Math.ceil((day + new Date(start).getUTCDay() + 1) / 7)).padStart(2, '0')}`;
}

function safeJsonParse(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function ensureColumn(db, table, column, sql) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) db.exec(sql);
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

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      allergen TEXT NOT NULL,
      symptoms TEXT DEFAULT '[]',
      severity TEXT NOT NULL CHECK(severity IN ('mild','moderate','severe')),
      doctor_consulted INTEGER DEFAULT 0,
      doctor_confirmation INTEGER,
      status TEXT DEFAULT 'reported' CHECK(status IN ('reported','community_reviewed','medical_verified','verified')),
      community_helpful_votes INTEGER DEFAULT 0,
      community_not_helpful_votes INTEGER DEFAULT 0,
      verified_by_medical_id INTEGER,
      rejection_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incident_votes (
      incident_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      helpful INTEGER NOT NULL,
      PRIMARY KEY (incident_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS medical_professionals (
      user_id INTEGER PRIMARY KEY,
      specialty TEXT NOT NULL,
      credentials TEXT,
      verified INTEGER DEFAULT 0,
      verifications_count INTEGER DEFAULT 0,
      accuracy_pct REAL DEFAULT 100.0,
      active_verifications INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incident_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      medical_user_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('approved','rejected')),
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS b2b_api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      tier TEXT DEFAULT 'free' CHECK(tier IN ('free','premium')),
      requests_today INTEGER DEFAULT 0,
      last_reset TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS b2b_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      barcodes_imported INTEGER DEFAULT 0,
      barcodes_skipped INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_analytics (
      user_id INTEGER PRIMARY KEY,
      scans_total INTEGER DEFAULT 0,
      scans_this_week INTEGER DEFAULT 0,
      scans_this_month INTEGER DEFAULT 0,
      last_scan_at TEXT,
      top_allergens TEXT DEFAULT '[]',
      top_categories TEXT DEFAULT '[]',
      week_key TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  ensureColumn(db, 'users', 'deleted_at', 'ALTER TABLE users ADD COLUMN deleted_at TEXT');

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

function grantGamification(db, userId, eventType, verifiedCount = 0) {
  const points = EVENT_POINTS[eventType] || 0;
  const row = db.prepare('SELECT points, reputation FROM gamification WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO gamification (user_id, points, reputation) VALUES (?, ?, ?)').run(userId, points, points);
  } else {
    db.prepare('UPDATE gamification SET points = ?, reputation = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(row.points + points, row.reputation + points, userId);
  }

  const total = db.prepare('SELECT points FROM gamification WHERE user_id = ?').get(userId).points;
  const medical = db.prepare('SELECT accuracy_pct FROM medical_professionals WHERE user_id = ?').get(userId) || { accuracy_pct: 100 };
  for (const badge of BADGES) {
    let eligible = total >= (badge.minPoints || 0);
    if (badge.minVerified) eligible = eligible && verifiedCount >= badge.minVerified;
    if (badge.minAccuracy !== undefined) eligible = eligible && Number(medical.accuracy_pct || 0) >= badge.minAccuracy;
    if (badge.special === 'life_saver') eligible = eventType === 'incident_verified';
    if (eligible) db.prepare('INSERT OR IGNORE INTO achievements (user_id, badge_key) VALUES (?, ?)').run(userId, badge.key);
  }
}

function makeToken(user, secret) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
}

function severityRank(severity) {
  return severity === 'severe' ? 3 : severity === 'moderate' ? 2 : 1;
}

function productMeetsGoal(product, goalId) {
  return computeScore(product, [goalId]) >= 60;
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

  function serializeProduct(product) {
    if (!product) return null;
    return {
      ...product,
      nutrition: safeJsonParse(product.nutrition, {}),
      ingredients: safeJsonParse(product.ingredients, [])
    };
  }

  function serializeIncident(incident) {
    if (!incident) return null;
    return {
      ...incident,
      symptoms: safeJsonParse(incident.symptoms, []),
      doctor_consulted: Boolean(incident.doctor_consulted),
      doctor_confirmation: incident.doctor_confirmation === null || incident.doctor_confirmation === undefined ? null : Boolean(incident.doctor_confirmation)
    };
  }

  function serializeProfile(profile) {
    return {
      ...profile,
      allergies: safeJsonParse(profile.allergies, []),
      goals: safeJsonParse(profile.goals, [])
    };
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

  function recordAdminAudit(adminUserId, action, targetType, targetId) {
    try {
      db.prepare('INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)').run(adminUserId, action, targetType || null, targetId || null);
    } catch {
      // no-op to keep admin actions resilient
    }
  }

  function verifiedIncidentCount(userId) {
    return db.prepare('SELECT COUNT(*) AS c FROM incidents WHERE user_id = ? AND status = ?').get(userId, 'verified').c;
  }

  function refreshUserAnalytics(userId) {
    try {
      const counts = db.prepare(`
        SELECT
          COUNT(*) AS scans_total,
          COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END), 0) AS scans_this_week,
          COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END), 0) AS scans_this_month,
          MAX(created_at) AS last_scan_at
        FROM scan_history
        WHERE user_id = ?
      `).get(userId);

      const topCategories = db.prepare(`
        SELECT p.category, COUNT(*) AS count
        FROM scan_history sh
        JOIN products p ON p.barcode = sh.barcode
        WHERE sh.user_id = ? AND p.category IS NOT NULL
        GROUP BY p.category
        ORDER BY count DESC, p.category ASC
        LIMIT 5
      `).all(userId).map((row) => row.category);

      const topAllergens = db.prepare(`
        SELECT allergen, COUNT(*) AS count
        FROM incidents
        WHERE user_id = ?
        GROUP BY allergen
        ORDER BY count DESC, allergen ASC
        LIMIT 5
      `).all(userId).map((row) => row.allergen);

      db.prepare(`
        INSERT INTO user_analytics (user_id, scans_total, scans_this_week, scans_this_month, last_scan_at, top_allergens, top_categories, week_key, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          scans_total = excluded.scans_total,
          scans_this_week = excluded.scans_this_week,
          scans_this_month = excluded.scans_this_month,
          last_scan_at = excluded.last_scan_at,
          top_allergens = excluded.top_allergens,
          top_categories = excluded.top_categories,
          week_key = excluded.week_key,
          updated_at = datetime('now')
      `).run(
        userId,
        counts.scans_total || 0,
        counts.scans_this_week || 0,
        counts.scans_this_month || 0,
        counts.last_scan_at || null,
        JSON.stringify(topAllergens),
        JSON.stringify(topCategories),
        weekKey()
      );

      return {
        scans_total: counts.scans_total || 0,
        scans_this_week: counts.scans_this_week || 0,
        scans_this_month: counts.scans_this_month || 0,
        last_scan_at: counts.last_scan_at || null,
        top_allergens: topAllergens,
        top_categories: topCategories,
        week_key: weekKey()
      };
    } catch {
      return { scans_total: 0, scans_this_week: 0, scans_this_month: 0, last_scan_at: null, top_allergens: [], top_categories: [], week_key: weekKey() };
    }
  }

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
      const decoded = jwt.verify(token, jwtSecret);
      const current = db.prepare('SELECT id, email, role, deleted_at FROM users WHERE id = ?').get(decoded.sub);
      if (!current || current.deleted_at || current.role === 'deleted') return res.status(401).json({ error: 'User not available' });
      req.user = { ...decoded, email: current.email, role: current.role };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    next();
  }

  function medicalOnly(req, res, next) {
    if (req.user.role !== 'medical') return res.status(403).json({ error: 'Medical role required' });
    next();
  }

  function b2bAuth(req, res, next) {
    try {
      const apiKey = req.get('X-API-Key');
      if (!apiKey) return res.status(401).json({ error: 'Missing API key' });
      const client = db.prepare('SELECT * FROM b2b_api_keys WHERE api_key = ?').get(apiKey);
      if (!client) return res.status(401).json({ error: 'Invalid API key' });
      const today = new Date().toISOString().slice(0, 10);
      let requestsToday = client.requests_today;
      if (client.last_reset !== today) {
        db.prepare('UPDATE b2b_api_keys SET requests_today = 0, last_reset = ? WHERE id = ?').run(today, client.id);
        requestsToday = 0;
      }
      const limit = client.tier === 'premium' ? 10000 : 100;
      if (requestsToday >= limit) return res.status(429).json({ error: 'Daily rate limit exceeded', tier: client.tier, limit });
      db.prepare('UPDATE b2b_api_keys SET requests_today = requests_today + 1 WHERE id = ?').run(client.id);
      db.prepare('INSERT INTO b2b_usage_logs (api_key_id, endpoint) VALUES (?, ?)').run(client.id, req.path);
      req.apiClient = { ...client, limit };
      next();
    } catch (err) {
      next(err);
    }
  }

  const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1), region: z.string().optional() });
  const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const incidentSchema = z.object({
    barcode: z.string().min(1),
    allergen: z.string().min(1),
    symptoms: z.array(z.string()).max(20).default([]),
    severity: z.enum(['mild', 'moderate', 'severe']),
    doctor_consulted: z.boolean().default(false),
    doctor_confirmation: z.boolean().nullable().optional()
  });

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
    res.status(201).json({ token, user: { id: user.id, email, name, region, role: user.role } });
  });

  app.post('/api/auth/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email);
    if (!user || user.deleted_at || user.role === 'deleted' || !bcrypt.compareSync(parsed.data.password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
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
    const user = db.prepare('SELECT id, email, name, region, role, created_at, deleted_at FROM users WHERE id = ?').get(req.user.sub);
    const profiles = db.prepare('SELECT id, name, allergies, goals FROM profiles WHERE user_id = ? ORDER BY id').all(req.user.sub).map(serializeProfile);
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
    const profiles = db.prepare('SELECT id, name, allergies, goals FROM profiles WHERE user_id = ? ORDER BY id').all(req.user.sub).map(serializeProfile);
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
    db.prepare('UPDATE profiles SET name = ?, allergies = ?, goals = ? WHERE id = ?').run(
      parsed.data.name || profile.name,
      JSON.stringify(parsed.data.allergies || safeJsonParse(profile.allergies, [])),
      JSON.stringify(parsed.data.goals || safeJsonParse(profile.goals, [])),
      req.params.id
    );
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
    db.prepare("UPDATE subscriptions SET tier = 'premium', status = 'active', updated_at = datetime('now') WHERE user_id = ?").run(req.user.sub);
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
      } else if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString());
      } else if (req.body && typeof req.body === 'object') {
        event = req.body;
      } else {
        event = JSON.parse(String(req.body));
      }

      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        const userId = Number(invoice.metadata?.userId || 0);
        if (userId) {
          db.prepare('INSERT INTO invoices (user_id, stripe_invoice_id, amount_cents, currency, status) VALUES (?, ?, ?, ?, ?)').run(userId, invoice.id, invoice.amount_paid || 0, invoice.currency || 'usd', 'paid');
          db.prepare("UPDATE subscriptions SET status = 'active', updated_at = datetime('now') WHERE user_id = ?").run(userId);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const userId = Number(event.data.object.metadata?.userId || 0);
        if (userId) db.prepare("UPDATE subscriptions SET status = 'cancelled', tier = 'free', updated_at = datetime('now') WHERE user_id = ?").run(userId);
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/goals', (_req, res) => res.json({ goals: GOALS }));

  app.get('/api/products/:barcode/incidents', auth, (req, res, next) => {
    try {
      const incidents = db.prepare(`
        SELECT i.id, i.barcode, i.allergen, i.symptoms, i.severity, i.status, i.community_helpful_votes, i.community_not_helpful_votes, i.doctor_consulted, i.doctor_confirmation, i.created_at, u.name AS reporter_name
        FROM incidents i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.barcode = ?
        ORDER BY i.created_at DESC, i.id DESC
      `).all(req.params.barcode).map(serializeIncident);
      res.json({ incidents });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/products/:barcode', auth, (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(serializeProduct(product));
  });

  app.get('/api/alternatives/:barcode', auth, (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const goals = req.query.goals ? String(req.query.goals).split(',').filter(Boolean) : ['lower_sugar'];
    const candidates = db.prepare('SELECT * FROM products WHERE category = ? AND barcode != ?').all(product.category, product.barcode);
    const alternatives = candidates.map((p) => ({
      ...serializeProduct(p),
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
      refreshUserAnalytics(req.user.sub);
      return res.json({ found: true, confidence: product.confidence, tier: access.tier, product: serializeProduct(product) });
    }

    db.prepare('INSERT INTO scan_history (user_id, profile_id, barcode, confidence) VALUES (?, ?, ?, ?)').run(req.user.sub, parsed.data.profile_id || null, parsed.data.barcode || 'image_only', 'incomplete');
    refreshUserAnalytics(req.user.sub);
    return res.json({ found: false, confidence: 'incomplete', tier: access.tier, message: 'Product not found in database' });
  });

  app.get('/api/scans/history', auth, (req, res) => {
    const items = db.prepare('SELECT id, profile_id, barcode, confidence, created_at FROM scan_history WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(req.user.sub);
    res.json({ scans: items });
  });

  app.get('/api/search/products', auth, (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const perPage = Math.min(100, Math.max(1, Number(req.query.per_page || 20)));
      const q = req.query.q ? String(req.query.q).trim() : '';
      const filters = [];
      const params = [];
      if (q) {
        filters.push('(name LIKE ? OR brand LIKE ? OR ingredients LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like, like);
      }
      if (req.query.category) {
        filters.push('category = ?');
        params.push(String(req.query.category));
      }
      if (req.query.confidence) {
        filters.push('confidence = ?');
        params.push(String(req.query.confidence));
      }
      if (req.query.price_min !== undefined) {
        filters.push('estimated_price >= ?');
        params.push(Number(req.query.price_min));
      }
      if (req.query.price_max !== undefined) {
        filters.push('estimated_price <= ?');
        params.push(Number(req.query.price_max));
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      let rows = db.prepare(`SELECT * FROM products ${where}`).all(...params).map(serializeProduct);

      const excludes = req.query.allergen_exclude ? String(req.query.allergen_exclude).split(',').map((v) => v.trim().toLowerCase()).filter(Boolean) : [];
      const includes = req.query.allergen_include ? String(req.query.allergen_include).split(',').map((v) => v.trim().toLowerCase()).filter(Boolean) : [];
      const goal = req.query.goal ? String(req.query.goal) : null;

      rows = rows.filter((product) => {
        const ingredients = Array.isArray(product.ingredients) ? product.ingredients.map((item) => String(item).toLowerCase()) : [];
        if (includes.length && !includes.every((needle) => ingredients.some((item) => item.includes(needle)))) return false;
        if (excludes.length && excludes.some((needle) => ingredients.some((item) => item.includes(needle)))) return false;
        if (goal && !productMeetsGoal(product, goal)) return false;
        return true;
      });

      const sort = String(req.query.sort || 'relevance');
      if (sort === 'price') rows.sort((a, b) => (a.estimated_price || 0) - (b.estimated_price || 0));
      else if (sort === 'newest') rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      else rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const products = rows.slice((page - 1) * perPage, page * perPage);
      res.json({ products, total, page, per_page: perPage, total_pages: totalPages });
    } catch (err) {
      next(err);
    }
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

  app.post('/api/corrections/:id/verify', auth, medicalOnly, (req, res) => {
    db.prepare("UPDATE corrections SET verified_by_medical = 1, status = 'verified' WHERE id = ?").run(req.params.id);
    grantGamification(db, req.user.sub, 'verification');
    res.json({ status: 'verified' });
  });

  app.get('/api/corrections', auth, (_req, res) => {
    const items = db.prepare('SELECT id, barcode, nutrition, status, votes_up, votes_down, verified_by_medical, created_at FROM corrections ORDER BY id DESC LIMIT 200').all();
    res.json({ corrections: items.map((c) => ({ ...c, nutrition: safeJsonParse(c.nutrition, {}) })) });
  });

  app.post('/api/incidents', auth, (req, res, next) => {
    try {
      const parsed = incidentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const result = db.prepare(`
        INSERT INTO incidents (barcode, user_id, allergen, symptoms, severity, doctor_consulted, doctor_confirmation, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'reported', datetime('now'))
      `).run(
        parsed.data.barcode,
        req.user.sub,
        parsed.data.allergen,
        JSON.stringify(parsed.data.symptoms || []),
        parsed.data.severity,
        parsed.data.doctor_consulted ? 1 : 0,
        parsed.data.doctor_confirmation === undefined ? null : parsed.data.doctor_confirmation === null ? null : parsed.data.doctor_confirmation ? 1 : 0
      );
      grantGamification(db, req.user.sub, 'incident_report');
      refreshUserAnalytics(req.user.sub);
      res.status(201).json({ id: result.lastInsertRowid, status: 'reported' });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/incidents/search', auth, (req, res, next) => {
    try {
      const filters = [];
      const params = [];
      if (req.query.barcode) {
        filters.push('barcode = ?');
        params.push(String(req.query.barcode));
      }
      if (req.query.allergen) {
        filters.push('allergen = ?');
        params.push(String(req.query.allergen));
      }
      if (req.query.severity) {
        filters.push('severity = ?');
        params.push(String(req.query.severity));
      }
      if (req.query.status) {
        filters.push('status = ?');
        params.push(String(req.query.status));
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const incidents = db.prepare(`SELECT * FROM incidents ${where} ORDER BY created_at DESC, id DESC LIMIT 200`).all(...params).map(serializeIncident);
      res.json({ incidents });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/incidents/analytics', auth, (req, res, next) => {
    try {
      const mostReportedAllergens = db.prepare(`
        SELECT allergen, COUNT(*) AS count
        FROM incidents
        GROUP BY allergen
        ORDER BY count DESC, allergen ASC
        LIMIT 10
      `).all();
      const highestSeverityProducts = db.prepare(`
        SELECT barcode, COUNT(*) AS count
        FROM incidents
        WHERE severity = 'severe'
        GROUP BY barcode
        ORDER BY count DESC, barcode ASC
        LIMIT 10
      `).all();
      res.json({ most_reported_allergens: mostReportedAllergens, highest_severity_products: highestSeverityProducts });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/incidents/:id/vote', auth, (req, res, next) => {
    try {
      const parsed = z.object({ helpful: z.boolean() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const incident = db.prepare('SELECT id FROM incidents WHERE id = ?').get(req.params.id);
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
      db.prepare('INSERT OR REPLACE INTO incident_votes (incident_id, user_id, helpful) VALUES (?, ?, ?)').run(req.params.id, req.user.sub, parsed.data.helpful ? 1 : 0);
      const tally = db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN helpful = 1 THEN 1 ELSE 0 END), 0) AS helpful_votes,
          COALESCE(SUM(CASE WHEN helpful = 0 THEN 1 ELSE 0 END), 0) AS not_helpful_votes,
          COUNT(*) AS total_votes
        FROM incident_votes
        WHERE incident_id = ?
      `).get(req.params.id);
      const nextStatus = tally.total_votes >= 5 && tally.helpful_votes > tally.not_helpful_votes ? 'community_reviewed' : null;
      db.prepare(`
        UPDATE incidents
        SET community_helpful_votes = ?, community_not_helpful_votes = ?, status = COALESCE(?, status), updated_at = datetime('now')
        WHERE id = ?
      `).run(tally.helpful_votes, tally.not_helpful_votes, nextStatus, req.params.id);
      grantGamification(db, req.user.sub, 'community_vote_incident');
      res.json({ helpful_votes: tally.helpful_votes, not_helpful_votes: tally.not_helpful_votes });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/medical/register', auth, (req, res, next) => {
    try {
      const parsed = z.object({ specialty: z.string().min(1), credentials: z.string().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      db.prepare(`
        INSERT INTO medical_professionals (user_id, specialty, credentials, verified)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id) DO UPDATE SET specialty = excluded.specialty, credentials = excluded.credentials, verified = 1
      `).run(req.user.sub, parsed.data.specialty, parsed.data.credentials || null);
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('medical', req.user.sub);
      res.json({ status: 'registered', specialty: parsed.data.specialty });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/medical/pending-verifications', auth, medicalOnly, (req, res, next) => {
    try {
      const incidents = db.prepare(`
        SELECT i.*, u.name AS reporter_name
        FROM incidents i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.status IN ('community_reviewed', 'reported')
        ORDER BY CASE i.severity WHEN 'severe' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END, i.created_at ASC
      `).all().map(serializeIncident);
      res.json({ incidents });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/medical/verify/:incidentId', auth, medicalOnly, (req, res, next) => {
    try {
      const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.incidentId);
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
      db.prepare(`
        UPDATE incidents
        SET status = 'verified', verified_by_medical_id = ?, rejection_reason = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(req.user.sub, req.params.incidentId);
      db.prepare('INSERT INTO incident_verifications (incident_id, medical_user_id, action, reason) VALUES (?, ?, ?, ?)').run(req.params.incidentId, req.user.sub, 'approved', null);
      db.prepare(`
        UPDATE medical_professionals
        SET verifications_count = verifications_count + 1,
            active_verifications = CASE WHEN active_verifications > 0 THEN active_verifications - 1 ELSE 0 END
        WHERE user_id = ?
      `).run(req.user.sub);
      const reporterVerifiedCount = verifiedIncidentCount(incident.user_id);
      const medicalStats = db.prepare('SELECT verifications_count FROM medical_professionals WHERE user_id = ?').get(req.user.sub) || { verifications_count: 0 };
      grantGamification(db, incident.user_id, 'incident_verified', reporterVerifiedCount);
      grantGamification(db, req.user.sub, 'medical_verification', medicalStats.verifications_count || 0);
      res.json({ status: 'verified' });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/medical/reject/:incidentId', auth, medicalOnly, (req, res, next) => {
    try {
      const parsed = z.object({ reason: z.string().min(3) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const incident = db.prepare('SELECT id FROM incidents WHERE id = ?').get(req.params.incidentId);
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
      db.prepare(`
        UPDATE incidents
        SET status = 'reported', rejection_reason = ?, verified_by_medical_id = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(parsed.data.reason, req.params.incidentId);
      db.prepare('INSERT INTO incident_verifications (incident_id, medical_user_id, action, reason) VALUES (?, ?, ?, ?)').run(req.params.incidentId, req.user.sub, 'rejected', parsed.data.reason);
      res.json({ status: 'rejected' });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/medical/profile', auth, medicalOnly, (req, res, next) => {
    try {
      const profile = db.prepare(`
        SELECT mp.*, u.email, u.name, u.region, u.role
        FROM medical_professionals mp
        JOIN users u ON u.id = mp.user_id
        WHERE mp.user_id = ?
      `).get(req.user.sub);
      res.json(profile || {});
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/medical/leaderboard', auth, (req, res, next) => {
    try {
      const professionals = db.prepare(`
        SELECT u.id AS user_id, u.name, u.region, mp.specialty, mp.verifications_count, mp.accuracy_pct, mp.verified
        FROM medical_professionals mp
        JOIN users u ON u.id = mp.user_id
        ORDER BY mp.verifications_count DESC, mp.accuracy_pct DESC, u.name ASC
        LIMIT 20
      `).all();
      res.json({ professionals });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/insights/engagement', auth, (req, res, next) => {
    try {
      const cached = db.prepare('SELECT * FROM user_analytics WHERE user_id = ?').get(req.user.sub);
      const analytics = cached || refreshUserAnalytics(req.user.sub);
      res.json({
        scans_total: analytics.scans_total || 0,
        scans_this_week: analytics.scans_this_week || 0,
        scans_this_month: analytics.scans_this_month || 0,
        last_scan_at: analytics.last_scan_at || null
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/insights/goal-progress', auth, (req, res, next) => {
    try {
      const scans = db.prepare(`
        SELECT p.*
        FROM scan_history sh
        JOIN products p ON p.barcode = sh.barcode
        WHERE sh.user_id = ?
        ORDER BY sh.id DESC
        LIMIT 50
      `).all(req.user.sub);
      const totalScanned = scans.length;
      const goals = GOALS.map((goal) => {
        const productsMeetingGoal = scans.filter((product) => productMeetsGoal(product, goal.id)).length;
        return {
          goal_id: goal.id,
          goal_name: goal.name,
          products_meeting_goal: productsMeetingGoal,
          total_scanned: totalScanned,
          pct: totalScanned ? Math.round((productsMeetingGoal / totalScanned) * 100) : 0
        };
      });
      res.json({ goals });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/insights/allergen-alerts', auth, (req, res, next) => {
    try {
      const profiles = db.prepare('SELECT allergies FROM profiles WHERE user_id = ?').all(req.user.sub);
      const allergies = [...new Set(profiles.flatMap((profile) => safeJsonParse(profile.allergies, []).map((item) => String(item).toLowerCase())))]
        .filter(Boolean);
      if (!allergies.length) return res.json({ alerts: [] });
      const placeholders = allergies.map(() => '?').join(',');
      const rows = db.prepare(`
        SELECT lower(allergen) AS allergen, severity, COUNT(*) AS count
        FROM incidents
        WHERE lower(allergen) IN (${placeholders})
          AND created_at >= datetime('now', '-30 days')
        GROUP BY lower(allergen), severity
      `).all(...allergies);
      const alertMap = new Map();
      for (const row of rows) {
        if (!alertMap.has(row.allergen)) {
          alertMap.set(row.allergen, { allergen: row.allergen, incident_count: 0, severity_breakdown: { mild: 0, moderate: 0, severe: 0 } });
        }
        const entry = alertMap.get(row.allergen);
        entry.incident_count += row.count;
        entry.severity_breakdown[row.severity] = row.count;
      }
      res.json({ alerts: Array.from(alertMap.values()) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/insights/personalized-alternatives', auth, (req, res, next) => {
    try {
      const categories = db.prepare(`
        SELECT p.category, COUNT(*) AS count
        FROM scan_history sh
        JOIN products p ON p.barcode = sh.barcode
        WHERE sh.user_id = ? AND p.category IS NOT NULL
        GROUP BY p.category
        ORDER BY count DESC, p.category ASC
        LIMIT 3
      `).all(req.user.sub);
      const recommendations = categories.map((row) => {
        const alternatives = db.prepare('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC').all(row.category)
          .map((product) => ({ ...serializeProduct(product), average_score: computeScore(product, GOALS.map((goal) => goal.id)) }))
          .sort((a, b) => b.average_score - a.average_score)
          .slice(0, 2);
        return { category: row.category, alternatives };
      });
      res.json({ recommendations });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/insights/export', auth, (req, res, next) => {
    try {
      const user = db.prepare('SELECT id, email, name, region, role, created_at FROM users WHERE id = ?').get(req.user.sub);
      const profiles = db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY id').all(req.user.sub).map(serializeProfile);
      const scans = db.prepare('SELECT * FROM scan_history WHERE user_id = ? ORDER BY id DESC').all(req.user.sub);
      const corrections = db.prepare('SELECT * FROM corrections WHERE user_id = ? ORDER BY id DESC').all(req.user.sub).map((row) => ({ ...row, nutrition: safeJsonParse(row.nutrition, {}) }));
      const incidents = db.prepare('SELECT * FROM incidents WHERE user_id = ? ORDER BY id DESC').all(req.user.sub).map(serializeIncident);
      const gamification = db.prepare('SELECT * FROM gamification WHERE user_id = ?').get(req.user.sub) || { points: 0, reputation: 0 };
      const achievements = db.prepare('SELECT badge_key, created_at FROM achievements WHERE user_id = ? ORDER BY id').all(req.user.sub);
      const savedItems = db.prepare('SELECT * FROM saved_items WHERE user_id = ? ORDER BY created_at DESC').all(req.user.sub);
      const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.sub) || null;
      const invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY id DESC').all(req.user.sub);
      const medicalProfile = db.prepare('SELECT * FROM medical_professionals WHERE user_id = ?').get(req.user.sub) || null;
      res.json({ user, profiles, scans, corrections, incidents, gamification, achievements, saved_items: savedItems, subscription, invoices, medical_profile: medicalProfile });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/b2b/keys', auth, adminOnly, (req, res, next) => {
    try {
      const parsed = z.object({ name: z.string().min(1), tier: z.enum(['free', 'premium']).default('free') }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const apiKey = `sw_${crypto.randomBytes(24).toString('hex')}`;
      db.prepare('INSERT INTO b2b_api_keys (name, api_key, tier) VALUES (?, ?, ?)').run(parsed.data.name, apiKey, parsed.data.tier);
      recordAdminAudit(req.user.sub, 'create_b2b_key', 'b2b_api_keys', parsed.data.name);
      res.status(201).json({ api_key: apiKey, name: parsed.data.name, tier: parsed.data.tier });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/b2b/allergen-trends', b2bAuth, (req, res, next) => {
    try {
      const rows = db.prepare(`
        SELECT allergen, severity, COUNT(*) AS count,
          COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END), 0) AS last_30_days_count
        FROM incidents
        GROUP BY allergen, severity
        ORDER BY allergen ASC
      `).all();
      const map = new Map();
      for (const row of rows) {
        if (!map.has(row.allergen)) {
          map.set(row.allergen, { allergen: row.allergen, incident_count: 0, severity_breakdown: { mild: 0, moderate: 0, severe: 0 }, last_30_days_count: 0 });
        }
        const entry = map.get(row.allergen);
        entry.incident_count += row.count;
        entry.severity_breakdown[row.severity] = row.count;
        entry.last_30_days_count += row.last_30_days_count;
      }
      res.json({ trends: Array.from(map.values()) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/b2b/product-insights/:barcode', b2bAuth, (req, res, next) => {
    try {
      const incidents = db.prepare('SELECT severity, community_helpful_votes, community_not_helpful_votes FROM incidents WHERE barcode = ?').all(req.params.barcode);
      const incidentCount = incidents.length;
      const avgSeverity = incidentCount ? Number((incidents.reduce((sum, item) => sum + severityRank(item.severity), 0) / incidentCount).toFixed(2)) : 0;
      const consumerCorrections = db.prepare('SELECT COUNT(*) AS c FROM corrections WHERE barcode = ?').get(req.params.barcode).c;
      const communityVotes = incidents.reduce((sum, item) => sum + (item.community_helpful_votes || 0) + (item.community_not_helpful_votes || 0), 0);
      res.json({ barcode: req.params.barcode, incident_count: incidentCount, avg_severity: avgSeverity, consumer_corrections: consumerCorrections, community_votes: communityVotes });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/b2b/category-analysis', b2bAuth, (req, res, next) => {
    try {
      const categories = db.prepare('SELECT category, COUNT(*) AS product_count FROM products WHERE category IS NOT NULL GROUP BY category ORDER BY category ASC').all();
      const payload = categories.map((row) => {
        const incidentRateRow = db.prepare(`
          SELECT COUNT(*) AS incidents_count
          FROM incidents i
          JOIN products p ON p.barcode = i.barcode
          WHERE p.category = ?
        `).get(row.category);
        const topAllergens = db.prepare(`
          SELECT i.allergen, COUNT(*) AS count
          FROM incidents i
          JOIN products p ON p.barcode = i.barcode
          WHERE p.category = ?
          GROUP BY i.allergen
          ORDER BY count DESC, i.allergen ASC
          LIMIT 3
        `).all(row.category);
        return {
          category: row.category,
          product_count: row.product_count,
          avg_incident_rate: row.product_count ? Number(((incidentRateRow.incidents_count || 0) / row.product_count).toFixed(2)) : 0,
          top_allergens: topAllergens
        };
      });
      res.json({ categories: payload });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/b2b/regional-insights', b2bAuth, (req, res, next) => {
    try {
      const rows = db.prepare(`
        SELECT COALESCE(u.region, 'unknown') AS region, i.allergen, COUNT(*) AS count
        FROM incidents i
        LEFT JOIN users u ON u.id = i.user_id
        GROUP BY COALESCE(u.region, 'unknown'), i.allergen
        ORDER BY region ASC, count DESC, i.allergen ASC
      `).all();
      const map = new Map();
      for (const row of rows) {
        if (!map.has(row.region)) map.set(row.region, { region: row.region, top_allergens: [] });
        const region = map.get(row.region);
        if (region.top_allergens.length < 5) region.top_allergens.push({ allergen: row.allergen, count: row.count });
      }
      res.json({ regions: Array.from(map.values()) });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/import/products', auth, adminOnly, (req, res, next) => {
    try {
      const rawProducts = Array.isArray(req.body) ? req.body : req.body.products;
      const parsed = z.array(z.object({
        barcode: z.string().min(1),
        name: z.string().min(1),
        category: z.string().optional(),
        brand: z.string().optional(),
        nutrition: z.record(z.any()).default({}),
        ingredients: z.union([z.array(z.string()), z.string()]).optional(),
        estimated_price: z.number().nonnegative().optional(),
        confidence: z.enum(['verified', 'estimated']).default('estimated')
      })).max(1000).safeParse(rawProducts);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const log = db.prepare('INSERT INTO product_imports (source, status) VALUES (?, ?)').run('admin_bulk_import', 'running');
      let imported = 0;
      let skipped = 0;
      const insert = db.prepare('INSERT INTO products (barcode, name, category, brand, nutrition, ingredients, estimated_price, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const existsStmt = db.prepare('SELECT barcode FROM products WHERE barcode = ?');
      const tx = db.transaction((products) => {
        for (const product of products) {
          if (existsStmt.get(product.barcode)) {
            skipped += 1;
            continue;
          }
          insert.run(
            product.barcode,
            product.name,
            product.category || null,
            product.brand || null,
            JSON.stringify(product.nutrition || {}),
            JSON.stringify(Array.isArray(product.ingredients) ? product.ingredients : product.ingredients ? [product.ingredients] : []),
            product.estimated_price ?? null,
            product.confidence || 'estimated'
          );
          imported += 1;
        }
      });
      tx(parsed.data);
      db.prepare(`
        UPDATE product_imports
        SET barcodes_imported = ?, barcodes_skipped = ?, status = 'completed', completed_at = datetime('now')
        WHERE id = ?
      `).run(imported, skipped, log.lastInsertRowid);
      recordAdminAudit(req.user.sub, 'bulk_import_products', 'product_imports', String(log.lastInsertRowid));
      res.status(201).json({ imported, skipped, total: parsed.data.length, import_id: log.lastInsertRowid });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/import/logs', auth, adminOnly, (req, res, next) => {
    try {
      const logs = db.prepare('SELECT * FROM product_imports ORDER BY id DESC LIMIT 50').all();
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/users', auth, adminOnly, (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const perPage = Math.min(100, Math.max(1, Number(req.query.per_page || 20)));
      const filters = [];
      const params = [];
      if (req.query.role) {
        filters.push('role = ?');
        params.push(String(req.query.role));
      }
      if (req.query.search) {
        filters.push('(name LIKE ? OR email LIKE ?)');
        const like = `%${String(req.query.search)}%`;
        params.push(like, like);
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...params).c;
      const users = db.prepare(`
        SELECT id, email, name, region, role, created_at, deleted_at
        FROM users
        ${where}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `).all(...params, perPage, (page - 1) * perPage);
      res.json({ users, total, page, per_page: perPage });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/admin/users/:id/role', auth, adminOnly, (req, res, next) => {
    try {
      const parsed = z.object({ role: z.enum(['user', 'medical', 'admin']) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(parsed.data.role, req.params.id);
      recordAdminAudit(req.user.sub, 'update_user_role', 'user', req.params.id);
      res.json({ status: 'updated', role: parsed.data.role });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/users/:id', auth, adminOnly, (req, res, next) => {
    try {
      db.prepare('UPDATE users SET role = ?, deleted_at = datetime(\'now\') WHERE id = ?').run('deleted', req.params.id);
      recordAdminAudit(req.user.sub, 'soft_delete_user', 'user', req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/products/pending-review', auth, adminOnly, (req, res, next) => {
    try {
      const products = db.prepare(`
        SELECT p.*, COALESCE(pc.pending_corrections, 0) AS pending_corrections
        FROM products p
        LEFT JOIN (
          SELECT barcode, COUNT(*) AS pending_corrections
          FROM corrections
          WHERE status = 'pending'
          GROUP BY barcode
        ) pc ON pc.barcode = p.barcode
        WHERE p.confidence = 'estimated' OR COALESCE(pc.pending_corrections, 0) > 0
        ORDER BY p.created_at DESC, p.barcode ASC
      `).all().map((row) => ({ ...serializeProduct(row), pending_corrections: row.pending_corrections }));
      res.json({ products });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/admin/products/:id/approve', auth, adminOnly, (req, res, next) => {
    try {
      db.prepare('UPDATE products SET confidence = ? WHERE barcode = ?').run('verified', req.params.id);
      recordAdminAudit(req.user.sub, 'approve_product', 'product', req.params.id);
      res.json({ status: 'approved' });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/products/:id', auth, adminOnly, (req, res, next) => {
    try {
      db.prepare('DELETE FROM products WHERE barcode = ?').run(req.params.id);
      recordAdminAudit(req.user.sub, 'delete_product', 'product', req.params.id);
      res.json({ status: 'deleted' });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/corrections/pending', auth, adminOnly, (req, res, next) => {
    try {
      const corrections = db.prepare('SELECT * FROM corrections WHERE status = ? ORDER BY created_at ASC').all('pending').map((row) => ({ ...row, nutrition: safeJsonParse(row.nutrition, {}) }));
      res.json({ corrections });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/admin/corrections/:id/status', auth, adminOnly, (req, res, next) => {
    try {
      const parsed = z.object({ status: z.enum(['pending', 'verified', 'rejected']) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      db.prepare('UPDATE corrections SET status = ? WHERE id = ?').run(parsed.data.status, req.params.id);
      recordAdminAudit(req.user.sub, 'update_correction_status', 'correction', req.params.id);
      res.json({ status: 'updated', correction_status: parsed.data.status });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/analytics/dashboard', auth, adminOnly, (req, res, next) => {
    try {
      res.json({
        total_users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
        total_products: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
        total_scans: db.prepare('SELECT COUNT(*) AS c FROM scan_history').get().c,
        total_incidents: db.prepare('SELECT COUNT(*) AS c FROM incidents').get().c,
        total_corrections: db.prepare('SELECT COUNT(*) AS c FROM corrections').get().c,
        active_subscriptions: db.prepare('SELECT COUNT(*) AS c FROM subscriptions WHERE status = ?').get('active').c
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/analytics/incidents-by-allergen', auth, adminOnly, (req, res, next) => {
    try {
      const incidents = db.prepare('SELECT allergen, COUNT(*) AS count FROM incidents GROUP BY allergen ORDER BY count DESC, allergen ASC').all();
      res.json({ incidents });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/analytics/user-growth', auth, adminOnly, (req, res, next) => {
    try {
      const weekly = db.prepare(`
        SELECT strftime('%Y-W%W', created_at) AS period, COUNT(*) AS count
        FROM users
        GROUP BY period
        ORDER BY period ASC
      `).all();
      const monthly = db.prepare(`
        SELECT strftime('%Y-%m', created_at) AS period, COUNT(*) AS count
        FROM users
        GROUP BY period
        ORDER BY period ASC
      `).all();
      res.json({ weekly, monthly });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/analytics/engagement', auth, adminOnly, (req, res, next) => {
    try {
      const avg = db.prepare(`
        SELECT COALESCE(AVG(scan_count), 0) AS avg_scans_per_user
        FROM (
          SELECT user_id, COUNT(*) AS scan_count
          FROM scan_history
          GROUP BY user_id
        )
      `).get();
      const active7 = db.prepare(`SELECT COUNT(DISTINCT user_id) AS c FROM scan_history WHERE created_at >= datetime('now', '-7 days')`).get().c;
      const active30 = db.prepare(`SELECT COUNT(DISTINCT user_id) AS c FROM scan_history WHERE created_at >= datetime('now', '-30 days')`).get().c;
      res.json({ avg_scans_per_user: Number((avg.avg_scans_per_user || 0).toFixed(2)), active_users_last_7_days: active7, active_users_last_30_days: active30 });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/health', auth, adminOnly, (_req, res) => {
    res.json({
      database: 'ok',
      product_count: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
      user_count: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
      incident_count: db.prepare('SELECT COUNT(*) AS c FROM incidents').get().c,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/gamification/events', auth, (req, res) => {
    const parsed = z.object({ type: z.enum(['incident_report', 'community_vote', 'incident_verified', 'medical_verification', 'verification', 'community_vote_incident']) }).safeParse(req.body);
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
      profiles: ['GET /api/profiles', 'POST /api/profiles', 'PUT /api/profiles/:id'],
      subscriptions: ['POST /api/subscriptions/start', 'POST /api/subscriptions/cancel', 'POST /api/subscriptions/upgrade', 'GET /api/subscriptions/status', 'GET /api/subscriptions/invoices', 'POST /api/payments/webhooks/stripe'],
      products: ['GET /api/products/:barcode', 'GET /api/products/:barcode/incidents', 'POST /api/scans', 'GET /api/scans/history', 'GET /api/alternatives/:barcode', 'GET /api/search/products', 'GET/POST/DELETE /api/saved-items'],
      corrections: ['POST /api/corrections', 'POST /api/corrections/:id/vote', 'POST /api/corrections/:id/verify', 'GET /api/corrections'],
      incidents: ['POST /api/incidents', 'POST /api/incidents/:id/vote', 'GET /api/incidents/search', 'GET /api/incidents/analytics'],
      medical: ['POST /api/medical/register', 'GET /api/medical/pending-verifications', 'POST /api/medical/verify/:incidentId', 'POST /api/medical/reject/:incidentId', 'GET /api/medical/profile', 'GET /api/medical/leaderboard'],
      insights: ['GET /api/insights/engagement', 'GET /api/insights/goal-progress', 'GET /api/insights/allergen-alerts', 'GET /api/insights/personalized-alternatives', 'GET /api/insights/export'],
      b2b: ['POST /api/b2b/keys', 'GET /api/b2b/allergen-trends', 'GET /api/b2b/product-insights/:barcode', 'GET /api/b2b/category-analysis', 'GET /api/b2b/regional-insights'],
      imports: ['POST /api/import/products', 'GET /api/import/logs'],
      admin: ['GET /api/admin/users', 'PATCH /api/admin/users/:id/role', 'DELETE /api/admin/users/:id', 'GET /api/admin/products/pending-review', 'PATCH /api/admin/products/:id/approve', 'DELETE /api/admin/products/:id', 'GET /api/admin/corrections/pending', 'PATCH /api/admin/corrections/:id/status', 'GET /api/admin/analytics/dashboard', 'GET /api/admin/analytics/incidents-by-allergen', 'GET /api/admin/analytics/user-growth', 'GET /api/admin/analytics/engagement', 'GET /api/admin/health'],
      gamification: ['POST /api/gamification/events', 'GET /api/gamification/me', 'GET /api/gamification/leaderboard'],
      health: ['GET /api/health']
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: 'ok',
      products: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
      users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
      incidents: db.prepare('SELECT COUNT(*) AS c FROM incidents').get().c,
      timestamp: new Date().toISOString(),
      phase: 'phase2'
    });
  });

  app.use((err, _req, res, _next) => {
    const msg = err && err.message ? err.message : 'Unexpected error';
    res.status(500).json({ error: msg });
  });

  app.locals.db = db;
  return app;
}

module.exports = { createApp, createDb, computeScore, GOALS };
