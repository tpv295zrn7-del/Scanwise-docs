# ScanWise: Complete Project Summary (WITH CODE & DESIGNS)

## 🎯 Project Overview

**ScanWise** is a health-focused mobile app that helps users make informed food choices through intelligent product scanning, allergen warnings, and community-driven safety data.

**Status:** Pre-MVP (Backend Architecture Phase)
**Target Launch:** 12 weeks
**Platform:** iOS + Android (React Native)

---

## 🎯 Strategic Positioning

### Target Niches (Dual-Layer Strategy)

**Primary:** Moms with kids (25-45 years old, health-conscious)
- Pain point: "I don't know if this is safe for my kids"
- Emotional driver: Family safety
- Market size: 20M+ in US

**Secondary:** Diabetics & those with dietary restrictions
- Pain point: "My blood sugar depends on accurate nutritional data"
- Emotional driver: Medical necessity
- Market size: 10M+ in US

**Tertiary:** Health-conscious adults (organic acquisition)
- Attracted by momentum from primary + secondary
- Will join naturally as word spreads

### Why This Works
- **Synergy:** Healthy diet = benefits both moms AND diabetics
- **One feature set serves all:** Nutritional accuracy + alternatives
- **Natural funnel:** Moms bring in diabetics (family members) → health-conscious follow
- **Network effect:** Community grows organically

---

## 💰 Revenue Model (Year 1 Projection: $1.2M-1.5M)

### Stream 1: Premium Subscription
- **Price:** $4.99/month (or $49.99/year)
- **Features:**
  - Unlimited scans
  - Personalized goal sets
  - Deeper comparisons
  - Scan history
  - Family profiles (up to 5 members)
  - Ad-free experience
- **Projection:** 15,000 users × $4.99 = $74,850/month

### Stream 2: B2B Data Insights
- **Product:** Anonymized allergen incident data sold to brands
- **Buyers:** Food manufacturers, retailers, insurance companies
- **Price:** $2,000-5,000/month per brand
- **Projection:** 5 brands × $3,000 = $15,000/month

### Stream 3: Brand Partnerships
- **Model:** Sponsored "healthier alternatives"
- **Price:** $1,000-3,000/month per featured brand
- **Projection:** 10 partnerships × $2,000 = $20,000/month

### Stream 4: Affiliate Commissions
- **Model:** Links to healthier products on Amazon/retail sites
- **Commission:** 2-5% per sale
- **Projection:** $5,000-10,000/month (after scale)

---

## 🎮 Core Features (MVP)

### Phase 1 (Weeks 1-8)
1. **Barcode Scanning** → Instant product lookup
2. **Nutritional Information** → Detailed breakdown (calories, macros, sugar, sodium, etc.)
3. **Allergen Alerts** ⭐ → Flags known allergens + FDA data
4. **Family Profiles** → Track allergies/preferences for multiple people
5. **Alternatives Engine** → "Find healthier swaps for this product"
6. **User Onboarding** → Profile setup, goal selection, trial activation
7. **Saved Items** → Bookmark products for quick reference

### Phase 2 (Weeks 9-12)
1. **Community Corrections** → Users can flag inaccurate data
2. **Basic Gamification** → Points & badges for contributions
3. **Leaderboards** → Top safety contributors highlighted
4. **Premium Paywall** → Unlock advanced features

### Phase 3 (Month 4+)
1. **Allergy Incident Reporting System** ⭐⭐ → Major feature
2. **Medical Professional Dashboard** → Doctors can verify reports
3. **Advanced Gamification** → Achievements, recognition, rewards
4. **B2B Data API** → Sell insights to brands/retailers

---

## 🚨 Allergy Incident Reporting System (Core Differentiator)

### Why This Feature Matters

**Current problem:** FDA labels are often incomplete or inaccurate
- "May contain traces" isn't always listed
- Cross-contamination not flagged
- Real-world allergic reactions go unreported

**Your solution:** Community-verified incident database
- Users report allergic reactions they experienced
- Community votes on accuracy
- Medical professionals verify
- Creates a living, crowdsourced allergen database

### User Journey

```
User scans product (e.g., "Nature Valley Granola Bar")
        ↓
App shows: "FDA says: Contains peanuts"
        ↓
User thinks: "Wait, my kid had a reaction after this!"
        ↓
Taps: "Report Allergic Reaction" 🚨
        ↓
Reports:
  - Suspected allergen
  - Symptom severity (mild/moderate/severe)
  - Symptoms (hives, itching, swelling, breathing issues)
  - Timeline (when reaction occurred)
  - Doctor consultation (yes/no)
        ↓
Community sees report
        ↓
Other users vote: ✅ Confirmed / ❌ Disagree
        ↓
Medical professionals verify
        ↓
VERIFIED: Alert appears on product for all users
```

### Gamification & Incentives

**Points System:**
- Submit incident report: +50 points
- Report gets helpful vote: +10 points
- Report verified by community: +50 points
- Report helps someone (prevents reaction): +100 points
- Badge unlocked: +250 points
- Featured on blog/app: +500 points

**Badges:**
- 🥉 Safety Citizen (1st report)
- 🥈 Safety Guardian (10 verified reports)
- 🥇 Safety Champion (50 verified reports)
- 👑 Master Detective (100 reports, 95%+ accuracy)
- 🎖️ Life Saver (Report helps prevent reaction)
- 🌟 Community Leader (1000+ points)

**Rewards:**
- 500 points → 1 free month of Premium
- 1,000 points → Featured in app as "Top Safety Contributor"
- 2,000+ points → Invited to advisory board, early feature access

---

## 🏗️ Technical Architecture

### Backend Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3) with WAL mode
- **Payment Processing:** Stripe API
- **Authentication:** JWT tokens
- **Hosting:** AWS or Heroku
- **API Style:** RESTful

### Frontend Stack
- **Framework:** React Native
- **State Management:** Redux or Context API
- **Barcode Scanning:** react-native-camera + barcode-scanner library
- **Payment:** Stripe mobile SDK
- **Database Sync:** Real-time sync with backend

### Core Database Tables

**USERS**
- id (PK), email, password (hashed), created_at, premium_status, premium_expiry

**FAMILY_PROFILES**
- id (PK), user_id (FK), profile_name, allergies (array), dietary_restrictions (array)

**PRODUCTS**
- barcode (PK), name, category, brand, nutrition (JSON), ingredients (JSON), category_subtype, estimated_price, confidence, created_at

**ALLERGEN_INCIDENTS**
- id (PK), product_id (FK), user_id (FK), reported_allergen, symptom_severity, symptoms (array), timestamp, doctor_consulted (boolean), verified_status, community_votes

**COMMUNITY_CORRECTIONS**
- id (PK), product_id (FK), user_id (FK), correction_type, suggested_value, votes, verified_status

**GAMIFICATION**
- id (PK), user_id (FK), points_total, badges (array), incidents_reported, incidents_verified, helpful_votes_received

**SUBSCRIPTIONS**
- id (PK), user_id (FK), stripe_subscription_id, tier, status, start_date, renewal_date

**SCANS**
- id (PK), barcode, confidence, created_at

### Core API Endpoints

**Auth:**
- `POST /api/auth/register` → Create account
- `POST /api/auth/login` → Login
- `POST /api/auth/refresh` → Refresh JWT token

**Products:**
- `POST /api/scans` → Scan barcode or image
- `GET /api/products/:barcode` → Get product details
- `GET /api/products/:barcode/alternatives?goals=sugar,protein` → Get healthier alternatives
- `GET /api/goals` → List available health goals

**Allergen Incidents:**
- `POST /api/incidents/report` → Report allergic reaction
- `GET /api/incidents/:productId` → Get incident history for product
- `POST /api/incidents/:id/verify` → Verify incident (medical pro)
- `POST /api/incidents/:id/vote` → Vote on incident

**Gamification:**
- `GET /api/user/points` → Get user's points & badges
- `GET /api/leaderboard/global` → Top contributors globally
- `GET /api/leaderboard/regional` → Top contributors in region

**Payments:**
- `POST /api/payments/create-subscription` → Start trial/premium
- `POST /api/payments/cancel-subscription` → Cancel premium
- `GET /api/payments/subscription-status` → Check status

**Family Profiles:**
- `POST /api/profiles/create` → Create family member profile
- `GET /api/profiles` → Get all family profiles
- `PUT /api/profiles/:id` → Update profile allergies

**Corrections:**
- `POST /api/corrections` → Submit nutrition corrections

**Health:**
- `GET /api/health` → Server status

---

## 💻 Code Drafts

### Backend Server Code (Node.js + Express)

```javascript
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database setup
const dbPath = path.join(__dirname, 'scanwise.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    barcode TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    nutrition TEXT,
    ingredients TEXT,
    category_subtype TEXT,
    estimated_price REAL,
    confidence TEXT DEFAULT 'verified',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT NOT NULL,
    nutrition TEXT,
    source TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT,
    confidence TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Available goals
const GOALS = [
  { id: 'lower_sugar', name: 'Lower Sugar', field: 'sugar_g', lower_is_better: true, weight: 1.0 },
  { id: 'higher_protein', name: 'Higher Protein', field: 'protein_g', lower_is_better: false, weight: 1.0 },
  { id: 'budget_friendly', name: 'Budget Friendly', field: 'estimated_price', lower_is_better: true, weight: 1.0 },
  { id: 'lower_sodium', name: 'Lower Sodium', field: 'sodium_mg', lower_is_better: true, weight: 1.0 },
  { id: 'higher_fiber', name: 'Higher Fiber', field: 'fiber_g', lower_is_better: false, weight: 1.0 },
  { id: 'lower_fat', name: 'Lower Fat', field: 'total_fat_g', lower_is_better: true, weight: 1.0 },
  { id: 'lower_calories', name: 'Lower Calories', field: 'calories', lower_is_better: true, weight: 1.0 },
];

// Helper: compute match score for a product against goals
function computeScore(product, goals) {
  let totalScore = 0;
  let totalWeight = 0;
  const nut = typeof product.nutrition === 'string' ? JSON.parse(product.nutrition) : product.nutrition;
  const price = product.estimated_price || 0;

  for (const goalId of goals) {
    const goal = GOALS.find(g => g.id === goalId);
    if (!goal) continue;

    let value;
    if (goal.field === 'estimated_price') {
      value = price;
    } else {
      value = nut[goal.field];
    }
    if (value === undefined || value === null) continue;

    const maxVal = goal.field === 'estimated_price' ? 15 : 
                  goal.field === 'sugar_g' ? 40 :
                  goal.field === 'protein_g' ? 20 :
                  goal.field === 'sodium_mg' ? 1000 :
                  goal.field === 'fiber_g' ? 10 :
                  goal.field === 'total_fat_g' ? 30 :
                  goal.field === 'calories' ? 500 : 100;

    let score = Math.max(0, Math.min(100, (value / maxVal) * 100));
    if (goal.lower_is_better) score = 100 - score;

    totalScore += score * goal.weight;
    totalWeight += goal.weight;
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
}

// ===== API Routes =====

// GET /api/goals
app.get('/api/goals', (req, res) => {
  res.json({ goals: GOALS });
});

// POST /api/scans
app.post('/api/scans', (req, res) => {
  const { barcode, image } = req.body;
  if (!barcode && !image) {
    return res.status(400).json({ error: 'barcode or image required' });
  }

  if (barcode) {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
    if (product) {
      db.prepare('INSERT INTO scans (barcode, confidence) VALUES (?, ?)').run(barcode, product.confidence);
      return res.json({
        found: true,
        product: {
          ...product,
          nutrition: JSON.parse(product.nutrition),
          ingredients: JSON.parse(product.ingredients)
        },
        confidence: product.confidence,
        source: 'verified'
      });
    }
  }

  return res.json({
    found: false,
    confidence: 'incomplete',
    message: 'Product not found in database'
  });
});

// GET /api/products/:barcode
app.get('/api/products/:barcode', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({
    ...product,
    nutrition: JSON.parse(product.nutrition),
    ingredients: JSON.parse(product.ingredients)
  });
});

// GET /api/alternatives/:barcode?goals=sugar,protein
app.get('/api/alternatives/:barcode', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const goals = req.query.goals ? req.query.goals.split(',') : ['lower_sugar'];
  const sameCategory = db.prepare('SELECT * FROM products WHERE category = ? AND barcode != ?').all(product.category, product.barcode);

  const scored = sameCategory.map(p => ({
    ...p,
    nutrition: JSON.parse(p.nutrition),
    ingredients: JSON.parse(p.ingredients),
    match_score: computeScore(p, goals)
  }));

  scored.sort((a, b) => b.match_score - a.match_score);
  const top3 = scored.slice(0, 3);

  res.json({
    original_barcode: product.barcode,
    original_name: product.name,
    goals,
    alternatives: top3.length > 0 ? top3 : [],
    total_considered: sameCategory.length
  });
});

// POST /api/corrections
app.post('/api/corrections', (req, res) => {
  const { barcode, nutrition, source } = req.body;
  if (!barcode || !nutrition) {
    return res.status(400).json({ error: 'barcode and nutrition required' });
  }

  const nut = typeof nutrition === 'string' ? JSON.parse(nutrition) : nutrition;
  if (!nut.calories || nut.calories > 2000) {
    return res.status(400).json({ error: 'Nutrition data failed sanity check' });
  }

  db.prepare('INSERT INTO corrections (barcode, nutrition, source) VALUES (?, ?, ?)').run(
    barcode, JSON.stringify(nut), source || 'user'
  );

  res.json({ status: 'submitted', message: 'Correction stored for review' });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', products: db.prepare('SELECT COUNT(*) as c FROM products').get().c });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ScanWise API running on port ${PORT}`);
});
```

---

## 🎨 UI/UX Design System

### Screen 1: Goals Onboarding

**Purpose:** Let users select 3-5 health goals before first scan.

**Layout:**
```
┌──────────────────────────────┐
│  Status bar area              │
│                               │
│  ┌────────────────────────┐   │
│  │   ScanWise logo        │   │
│  │   "Know what's in it." │   │
│  └────────────────────────┘   │
│                               │
│  Let's personalize your       │
│  experience                   │
│                               │
│  Pick 3-5 goals:              │
│  ┌────────────────────────┐   │
│  │ [ ] Lower Sugar        │   │
│  │ [ ] Higher Protein     │   │
│  │ [ ] Lower Sodium       │   │
│  │ [ ] Budget-Friendly    │   │
│  │ [ ] Lower Fat          │   │
│  │ [ ] Higher Fiber       │   │
│  │ [ ] Lower Calories     │   │
│  │ [ ] No Artificial      │   │
│  └────────────────────────┘   │
│                               │
│  ┌────────────────────────┐   │
│  │ Continue (3/5 selected)│   │
│  └────────────────────────┘   │
│                               │
│  Skip for now →               │
└──────────────────────────────┘
```

**Visual Design:**
- Header: Centered logo (32×32) + "ScanWise" wordmark
- Tagline: "Know what's in it. Choose what fits." (secondary color)
- Each goal item: card row with checkbox, title, description, icon
- Selected: Primary color background, filled checkbox, bold text
- When 5 selected: remaining items fade (opacity 0.5)
- CTA Button: Full-width, emerges when ≥3 selected
- Skip link: Text link below CTA

**States:**
- Initial: 0 selected, CTA disabled
- In Progress: 1-2 selected, CTA disabled
- Ready: 3-5 selected, CTA enabled
- Full: 5 selected, unselected options fade

**Data:**
```javascript
interface UserGoals {
  lowerSugar: boolean;
  higherProtein: boolean;
  lowerSodium: boolean;
  budgetFriendly: boolean;
  lowerFat: boolean;
  higherFiber: boolean;
  lowerCalories: boolean;
  noArtificialSweeteners: boolean;
}
```

---

### Screen 2: Product Result

**Purpose:** Show scanned product info, nutrition against user's goals, top 3 alternatives.

**Layout:**
```
┌──────────────────────────────┐
│ ← Back                   🔖   │
│                               │
│  ┌────────────────────────┐   │
│  │  [Product Image]       │   │
│  │  (placeholder if none) │   │
│  └────────────────────────┘   │
│                               │
│  Product Name                  │
│  Brand Name · Net Weight      │
│  [ ● Verified ]               │
│                               │
│  ─── How it fits your goals ──│
│  ✅ Lower Sugar: 8g           │
│  ⚠️ Higher Protein: 3g        │
│                               │
│  ─── Nutrition per serving ───│
│  Calories: 120 ━━━━●━━━━━    │
│  Sugar: 8g ━━●━━━━━━━         │
│  Protein: 3g ━━━━━●━━━━       │
│  Sodium: 150mg ━━●━━━━       │
│  Fat: 4g ━━━━●━━━━━         │
│                               │
│  ─── Better alternatives ─────│
│  ⭐ Brand X Snack Bar         │
│  Lower sugar · Higher protein │
│  $1.29                         │
│  [ Compare All 3 → ]          │
│                               │
│  Data source: USDA            │
│  Report incorrect data        │
└──────────────────────────────┘
```

**Visual Design:**
- Product Image: 200×200px, rounded, placeholder gradient if missing
- Confidence Badge: Pill-style (Verified/Estimated/Incomplete)
- Goal Match Rows: Icon (✅/⚠️/❌) + name + explanation
- Nutrition Bars: Gray background, colored fill based on goal match
- Alternatives: Card stack with rank number, product name, differentiators, price
- Data attribution: Small text at bottom with link to correction form

**States:**
- Loading: Skeleton cards, pulsing placeholders
- Loaded: Full product data
- Image missing: Placeholder icon
- No alternatives: Hide section
- Product not found: Show "Not in database" message
- Offline: Show cached version with "Offline" banner

---

### Screen 3: Alternatives Comparison

**Purpose:** Side-by-side ranking of top 3 alternatives by user's goals.

**Layout:**
```
┌──────────────────────────────┐
│ ← Back          Compare 3    │
│                               │
│  Comparing alternatives for:  │
│  Original Product Name        │
│                               │
│  Sorted by: Your Goals ▼      │
│                               │
│  ★ #1 BEST MATCH             │
│  [Product Image]              │
│  Brand X Snack Bar            │
│  $1.29                         │
│  Meets 3 of 4 goals           │
│  ✅ Lower Sugar: 6g           │
│  ✅ Higher Protein: 8g        │
│  ❌ Lower Sodium: 200mg       │
│  ✅ Budget-Friendly           │
│  [ Add to List ]              │
│                               │
│  #2 GOOD ALTERNATIVE         │
│  ...                          │
│                               │
│  #3 Alternative               │
│  ...                          │
└──────────────────────────────┘
```

**Visual Design:**
- #1 Card: Elevated shadow, emerald left border, "★ #1 BEST MATCH" badge
- Card Layout: Image (80×80px) + name + price + match score + goal breakdown
- Match Score: "Meets X of Y goals" pill (emerald if ≥75%, amber if ≥50%, gray if less)
- Sort Dropdown: "Sorted by: Your Goals ▼" — options: Your Goals, Price, Protein, Sugar
- Each goal row: Icon + name + value
- Confidence badge: Inline pill (Verified/Estimated)
- CTA: "Add to List" outline button

**Ranking Algorithm:**
- Scores based on user's selected goals
- Weights goals with slight priority for first 3 selected
- Normalizes each metric (0-100)
- Returns: "Meets X of Y goals" (user-facing simplified metric)

---

### Screen 4: Saved Items

**Purpose:** Display all previously scanned and saved products.

**Layout:**
```
┌──────────────────────────────┐
│  My Saved Items              │
│                               │
│  ┌──────────────────────────┐ │
│  │ 🔍 Search saved items    │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │ [48×48]  Product Name    │ │
│  │ img      Brand · 12g sugar│
│  │          [ ● Verified ]   │
│  │                    ★ 2d  │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │ [48×48]  Another Product │ │
│  │ img      Brand · 5g sugar│
│  │          [ ◐ Estimated ] │
│  │                    5h    │
│  └──────────────────────────┘ │
│                               │
│  [ Scan │ Saved (active) │ 👤 ]│
└──────────────────────────────┘
```

**Visual Design:**
- Search bar: Pill-style, full-width, magnifying glass + clear icon
- Product rows: 48×48px image, product name (bold), brand + top nutrient (secondary), confidence badge, timestamp
- Empty state: Large icon + "No saved items yet" + "Scan a Product" CTA
- Sorted: Most recently saved first
- Tap: Navigate to product result screen
- Swipe left: Reveal delete button (red)
- Favorites: Star icon to pin to top

---

### Screen 5: Correction Submission

**Purpose:** Allow users to submit corrected nutrition data.

**Layout:**
```
┌──────────────────────────────┐
│ ← Back                       │
│                               │
│  Report Correction            │
│  Help us improve our data     │
│  for [Product Name]           │
│                               │
│  Current data:                │
│  [ Verified ] USDA FoodData   │
│                               │
│  What's incorrect?            │
│  ┌──────────────────────────┐ │
│  │ ● Product name           │ │
│  │ ○ Brand / manufacturer   │ │
│  │ ○ Nutrition facts        │ │
│  │ ○ Ingredients list       │ │
│  │ ○ Serving size           │ │
│  │ ○ Other                  │ │
│  └──────────────────────────┘ │
│                               │
│  Your correction:             │
│  ┌──────────────────────────┐ │
│  │ Enter correct value      │ │
│  │ or describe the issue    │ │
│  │ (500 char max)           │ │
│  │                 0/500    │ │
│  └──────────────────────────┘ │
│                               │
│  Upload supporting photo:     │
│  ┌──────────────────────────┐ │
│  │ [ + Add Photo (0/3) ]    │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │  Submit Correction       │ │
│  └──────────────────────────┘ │
│                               │
│  Your contribution helps      │
│  everyone shop smarter.       │
│  Reviewed within 48 hours.    │
└──────────────────────────────┘
```

**Visual Design:**
- Header: "Report Correction" + product name subtitle
- Current Data: Shows existing source (USDA, manufacturer, estimated)
- Issue Type: Radio button list (single selection), full tap target (48px+)
- Selected: Primary color background, emerald left border
- Correction Input: Multi-line textarea, character counter (turns amber at 450, red at 500)
- Photo Upload: Dashed border, secondary accent color, "Add Photo" text
- After adding: Thumbnail preview with × remove button (max 3 photos, 5MB each)
- CTA Button: Disabled until category + text filled, shows "Submitting..." spinner
- Success State: Full-screen confirmation with checkmark, "Thank you!" message, "Back to Product" CTA
- Footer: "Your contribution helps everyone..." trust-building message

**Data Model:**
```javascript
interface CorrectionSubmission {
  barcode: string;
  issueType: 'product-name' | 'brand' | 'nutrition' | 'ingredients' | 'serving-size' | 'other';
  correctionText: string;
  photoUrls?: string[];
  submittedAt: string;
}
```

---

### Screen 6: Premium Paywall

**Purpose:** Unlock premium features after first useful scan (trust earned before asking).

**Layout:**
```
┌──────────────────────────────┐
│                               │
│  ✕ Close                     │
│                               │
│  ┌──────────────────────────┐ │
│  │      [App Icon]          │ │
│  │       + Crown            │ │
│  └──────────────────────────┘ │
│                               │
│  Unlock ScanWise Premium      │
│                               │
│  You just saw what {product}  │
│  has in store. Go further     │
│  with Premium:                │
│                               │
│  ✓ Unlimited scans            │
│  ✓ Personalized goal sets     │
│  ✓ Deeper comparisons         │
│  ✓ Scan history               │
│  ✓ Family profiles (4+)       │
│                               │
│  ┌──────────────────────────┐ │
│  │  Monthly  $4.99/mo       │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │  Best Value              │ │  ← "Save 17%" badge
│  │  $49.99/yr               │ │
│  │  ($4.17/mo)              │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │ Try Premium Free 14 Days │ │
│  └──────────────────────────┘ │
│                               │
│  $4.99/month after. Cancel    │
│  anytime.                      │
│                               │
│  ┌──────────────────────────┐ │
│  │ Continue with Free       │ │
│  └──────────────────────────┘ │
│                               │
│  Free includes:               │
│  • Limited scans              │
│  • Verified basics            │
│  • Limited alternatives       │
└──────────────────────────────┘
```

**Visual Design:**
- Container: Full-screen modal, semi-transparent backdrop (rgba(0,0,0,0.4)), white card with --radius-xl corners, --shadow-xl
- Appearance: Slide-up animation (300ms, ease-out)
- Close Button: "✕" top-right, secondary color text
- App Icon Section: 80×80px icon with subtle gold/primary crown overlay, centered
- Headline: "Unlock ScanWise Premium" (H1, bold, centered)
- Subhead: Personalized message mentioning scanned product (builds earned trust)
- Feature List: Checkmark (emerald) + text, 8px gaps, slight icon for warmth (👨‍👩‍👧‍👦 for family)
- Pricing Cards:
  - Monthly: Standard card layout
  - Annual: Elevated card, 2px primary border, "Best Value" badge (amber bg, top-right), emphasize savings
- CTA Button: Primary color, white text, full-width, "Try Premium Free for 14 Days"
- Fine Print: "$.99/month after trial. Cancel anytime." (tiny, tertiary color)
- Free Tier Link: Outline button or text link, "Continue with Free"
- Below: Bullet list of free features
- Interactions: Close (✕) → dismiss to free tier, backdrop tap → dismiss, "Try Free" → payment flow, "Continue Free" → enter free tier

**Trigger Logic:**
- Shows after first useful scan (user sees product result)
- Trigger: After 2 seconds viewing product result OR on any "save"/"compare" action
- Free tier limit: 10 scans/month (example)
- Re-triggers when limit reached on subsequent visits
- Never shows before user sees value

**Data Model:**
```javascript
interface SubscriptionState {
  tier: 'free' | 'trial' | 'premium';
  scanCount: number;
  scanLimit: number;
  trialEndDate?: string;
  subscriptionEndDate?: string;
}
```

---

## 🚀 Launch Roadmap (13 Weeks)

### Phase 1: Backend Foundation (Weeks 1-3)
- Set up Express.js server + SQLite database
- Database schema with WAL mode
- Authentication (JWT)
- Stripe Payment API integration
- Product lookup endpoints
- Seed 100+ products into database

### Phase 2: Core Features (Weeks 4-8)
- Allergen matching logic
- Alternatives engine (scoring algorithm)
- Family profiles system
- Community corrections system
- Barcode integration (backend)
- Saved items functionality

### Phase 3: Gamification & Incidents (Weeks 9-12)
- Allergy incident reporting system
- Points & badge logic
- Leaderboard calculations
- Medical professional verification flow
- Premium features gating

### Phase 4: Frontend Build (Parallel with Phase 1-3)
- React Native app skeleton
- Goals onboarding screen
- Authentication screens
- Barcode scanner integration
- Product result screen
- Alternatives comparison screen
- Saved items screen
- Correction submission screen
- Premium paywall
- Tab navigation (Scan, Saved, Profile)

### Phase 5: Testing & Deployment (Week 13+)
- User acceptance testing
- App Store/Play Store preparation
- Launch beta (TestFlight)
- Bug fixes & optimization
- Public launch 🎉

---

## 📈 Go-To-Market Strategy

### Phase 1: Mom Communities (Week 1-4 Post-Launch)
**Channel:** Facebook mom groups, Reddit r/Parenting
**Message:** "Know what's really in your kids' food"
**Tactic:** Beta access to mom influencers for testimonials

### Phase 2: Health Communities (Week 5-8)
**Channel:** Reddit r/Health, r/Diabetes, ProductHunt
**Message:** "Community-verified allergen database for your health"
**Tactic:** Partner with health bloggers

### Phase 3: Diabetic Communities (Week 9-12)
**Channel:** Diabetes organizations, endocrinologist offices
**Message:** "Blood sugar control starts with accurate nutrition data"
**Tactic:** Medical professional partnerships

### Phase 4: Scale (Month 4+)
**Channel:** Paid advertising (Facebook, Instagram)
**Message:** "The app that saved my life" (user testimonials)
**Tactic:** Referral program ($10 credit per friend)

---

## ⚠️ Key Risks & Mitigation

### Risk 1: Data Accuracy
**Problem:** Users contribute inaccurate allergen data
**Mitigation:**
- Medical professional verification required
- Community voting system catches spam
- Penalties for false reports
- Automated data consistency checks

### Risk 2: Legal Liability
**Problem:** Someone experiences allergic reaction despite app warnings
**Mitigation:**
- Clear disclaimers on every allergen alert
- User acknowledgment required
- Medical waiver in terms of service
- Insurance for liability coverage
- FDA partnership for credibility

### Risk 3: Network Effect Chicken-Egg
**Problem:** App needs users to be valuable; users need valuable data
**Mitigation:**
- Pre-populate with FDA data + Open Food Facts
- Partner with nutritionists to verify top 5,000 products
- Seed community with beta users
- Gamification incentivizes early contribution

### Risk 4: Competitor Response
**Problem:** Larger apps (MyFitnessPal) copy feature
**Mitigation:**
- Build moat through community trust
- Incident reporting database is unique competitive advantage
- Medical professional partnerships are sticky
- Move fast and establish market leadership first

### Risk 5: Regulatory Challenges
**Problem:** FDA/FTC questions health claims
**Mitigation:**
- Position as "informational tool, not medical advice"
- Clear disclaimers everywhere
- Consult healthcare attorney before launch
- Transparent about data sourcing

---

## 🎯 Current Status & Next Steps

### ✅ Completed
- Defined entire business model
- Designed comprehensive feature roadmap
- Created technical architecture
- Built backend API server (Node.js/Express)
- Designed 6 complete UI/UX screens with interaction specs
- Created seed data structure (40+ products)
- Set up GitHub repo: `tpv295zrn7-del/Scanwise-docs`

### 🚀 Ready to Build
- Complete product seed data (100+ products)
- Full authentication system (JWT)
- Payment API (Stripe integration)
- React Native frontend (all screens)
- Incident Reporting System (core logic)
- Gamification engine

---

## 📚 Resources

**Product Databases:**
- Open Food Facts API (free ingredient data)
- USDA FoodData Central (nutritional data)
- FDA Allergen Database (official allergen flags)

**Barcode Scanning:**
- react-native-camera
- react-native-barcode-scanner-super

**Payment Processing:**
- Stripe React Native SDK
- Stripe.js for web

**Community Platform Inspiration:**
- Reddit (voting system, karma)
- Stack Overflow (badge system)
- ProductHunt (leaderboards)

**Backend Libraries (Node.js):**
- express
- better-sqlite3
- cors
- tesseract.js (for OCR)
- stripe

---

## 📝 Repository

**GitHub Repo:** https://github.com/tpv295zrn7-del/Scanwise-docs

---

**END OF SCANWISE COMPLETE PROJECT SUMMARY**
