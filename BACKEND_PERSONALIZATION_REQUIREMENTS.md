# 🎯 ScanWise Backend Personalization Engine Requirements

## Overview
ScanWise is NOT a generic health app. Every recommendation, score, and insight is personalized to the user's specific health profile, conditions, goals, and family needs.

**Core Principle:** Nothing generic. Everything personalized.

---

## 📋 User Health Profile Structure

### User Health Profile Schema
```javascript
// users_health_profiles table
{
  id: UUID,
  user_id: UUID (foreign key),
  
  // Personal Demographics
  age: Number,
  gender: String,
  location: String,
  language: String,
  
  // Primary Health Conditions (multi-select)
  health_conditions: [
    "diabetes_type1",
    "diabetes_type2", 
    "prediabetes",
    "heart_disease",
    "hypertension",
    "celiac",
    "ibs",
    "weight_management",
    "pregnancy",
    "postpartum",
    "autoimmune",
    "other"
  ],
  
  // Allergies & Intolerances
  allergies: [
    {
      allergen: "Peanuts",
      severity: "life_threatening", // or "severe", "moderate", "mild"
      reactions_experienced: ["anaphylaxis", "hives", "throat_swelling"],
      medications: ["EpiPen"],
      notes: ""
    },
    {
      allergen: "Shellfish",
      severity: "severe",
      reactions_experienced: ["hives", "vomiting"],
      medications: ["Benadryl"],
      notes: ""
    }
  ],
  
  // Dietary Preferences
  dietary_preferences: {
    diet_type: "keto", // or "vegan", "vegetarian", "paleo", "none", "other"
    restrictions: ["gluten_free", "dairy_free", "nut_free"],
    preferences: ["organic", "non_gmo", "whole_foods", "locally_sourced"]
  },
  
  // Health Goals
  health_goals: {
    primary_goal: "lower_blood_sugar", // main focus
    secondary_goals: ["increase_energy", "improve_digestion"],
    lifestyle_goals: ["lose_weight", "increase_exercise", "improve_sleep"]
  },
  
  // Condition-Specific Health Metrics
  health_metrics: {
    diabetes: {
      type: "type2", // or "type1", "prediabetes"
      a1c_current: 7.2,
      a1c_target: 7.0,
      medications: ["Metformin 500mg BID"],
      daily_carb_limit: 150,
      last_measured_date: "2026-07-01",
      blood_glucose_monitoring: "daily",
      average_fasting_glucose: 125,
      target_fasting_glucose: 100
    },
    
    heart_health: {
      blood_pressure_systolic: 130,
      blood_pressure_diastolic: 80,
      blood_pressure_target: "130/80",
      total_cholesterol: 200,
      ldl_cholesterol: 120,
      hdl_cholesterol: 50,
      triglycerides: 150,
      daily_sodium_limit: 2000,
      medications: ["Lisinopril 10mg daily"],
      last_measured_date: "2026-06-15"
    },
    
    weight_management: {
      current_weight_lbs: 200,
      goal_weight_lbs: 175,
      daily_calorie_target: 2000,
      macro_targets: {
        protein_g: 150,
        carbs_g: 200,
        fat_g: 67
      },
      exercise_level: "moderate",
      last_weighed_date: "2026-07-14"
    },
    
    digestive_health: {
      condition: "ibs",
      trigger_foods: ["high_fructose_corn_syrup", "excess_fiber", "caffeine"],
      safe_foods: ["rice", "chicken", "carrots"],
      daily_fiber_target: 25
    }
  },
  
  // Preferences & Consent
  preferences: {
    notification_level: "all", // or "critical_only", "none"
    allow_product_recommendations: true,
    share_data_for_research: false,
    share_data_with_brands: false,
    share_data_with_insurance: false
  },
  
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Family Members Schema
```javascript
// family_members table
{
  id: UUID,
  user_id: UUID,
  name: String, // e.g., "Sarah (daughter)"
  relationship: String, // "child", "spouse", "parent", "sibling"
  age: Number,
  
  // Same health profile structure as above
  health_conditions: [],
  allergies: [],
  dietary_preferences: {},
  health_goals: {},
  health_metrics: {},
  
  created_at: Timestamp
}
```

---

## 🔍 Product Scoring Engine

### Scoring Algorithm by Condition

#### Diabetes Scoring
```javascript
// Diabetes-specific product score (0-100)
calculateDiabetesScore(product, userProfile) {
  let score = 100;
  
  // Simple sugars impact (largest penalty)
  const simple_sugars = product.nutrition.sugar_g;
  if (simple_sugars > 0) {
    score -= Math.min(50, simple_sugars * 4); // -4 pts per gram sugar
  }
  
  // Refined carbs impact
  const refined_carbs = product.nutrition.carbs_g - product.nutrition.fiber_g;
  if (refined_carbs > 0) {
    score -= Math.min(30, refined_carbs * 1.5);
  }
  
  // Fiber benefit (mitigates sugar)
  if (product.nutrition.fiber_g >= 3) {
    score += 15;
  }
  
  // Protein benefit (slows glucose absorption)
  if (product.nutrition.protein_g >= 10) {
    score += 10;
  }
  
  // GI Index multiplier
  const gi_multiplier = product.nutrition.glycemic_index / 100;
  score = score * gi_multiplier;
  
  // Processed vs whole food
  if (product.processing_level === "whole_food") {
    score += 10;
  } else if (product.processing_level === "highly_processed") {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

// Glucose impact prediction (0-100)
predictGlucoseImpact(product, userProfile) {
  // Returns likelihood of blood sugar spike
  // Based on sugar, carbs, fiber, protein, GI index
  // Lower score = higher risk of spike
}

// Recommendation text
generateDiabetesRecommendation(score, userProfile) {
  if (score >= 80) return "✅ EXCELLENT - Safe for your blood sugar management";
  if (score >= 60) return "⚠️ MODERATE - May cause mild glucose elevation";
  if (score >= 40) return "⚠️ CAUTION - Likely to spike your blood glucose";
  return "❌ NOT RECOMMENDED - Will likely spike your blood sugar significantly";
}
```

#### Heart Health Scoring
```javascript
calculateHeartScore(product, userProfile) {
  let score = 100;
  
  // Sodium impact (primary concern)
  const daily_limit = userProfile.health_metrics.heart_health.daily_sodium_limit || 2000;
  const sodium_pct = (product.nutrition.sodium_mg / daily_limit) * 100;
  
  if (sodium_pct > 30) {
    score -= Math.min(50, sodium_pct * 1.5); // Heavy penalty for high sodium
  }
  
  // Saturated fat impact
  const sat_fat = product.nutrition.saturated_fat_g;
  score -= Math.min(25, sat_fat * 3);
  
  // Trans fat impact (major penalty)
  const trans_fat = product.nutrition.trans_fat_g;
  score -= Math.min(40, trans_fat * 20); // Trans fat is very bad
  
  // Unsaturated fat benefit
  const unsat_fat = product.nutrition.unsaturated_fat_g;
  if (unsat_fat > 0) {
    score += Math.min(15, unsat_fat * 2);
  }
  
  // Cholesterol impact
  if (product.nutrition.cholesterol_mg > 0) {
    score -= Math.min(15, product.nutrition.cholesterol_mg / 30);
  }
  
  // Fiber benefit (lowers cholesterol)
  if (product.nutrition.fiber_g >= 3) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}
```

#### Allergy Scoring
```javascript
calculateAllergyScore(product, userProfile) {
  // Check user's allergies against product
  for (const allergy of userProfile.allergies) {
    const allergen_match = checkProductForAllergen(product, allergy.allergen);
    
    if (allergen_match === "CONTAINS") {
      return 0; // 🚨 DANGER - Contains allergen
    }
    if (allergen_match === "CROSS_CONTAMINATION_RISK") {
      return 25; // ⚠️ Risk
    }
  }
  
  return 100; // ✅ Safe
}

// Check all family members
calculateFamilyAllergyScore(product, userProfile) {
  let safe_for_all = true;
  const family_scores = {};
  
  // Check user
  family_scores[userProfile.user_id] = calculateAllergyScore(product, userProfile);
  
  // Check each family member
  for (const member of userProfile.family_members) {
    family_scores[member.id] = calculateAllergyScore(product, member);
    if (family_scores[member.id] < 100) {
      safe_for_all = false;
    }
  }
  
  return {
    safe_for_all,
    individual_scores: family_scores,
    recommendation: safe_for_all ? "✅ SAFE for entire family" : "⚠️ Not safe for all family members"
  };
}
```

#### Weight Loss Scoring
```javascript
calculateWeightLossScore(product, userProfile) {
  let score = 100;
  
  // Calorie density (cal per 100g)
  const calorie_density = (product.nutrition.calories / product.serving_size_g) * 100;
  
  if (calorie_density > 300) {
    score -= Math.min(30, (calorie_density - 300) / 10);
  }
  
  // Macro balance (protein > carbs > fat for satiety)
  const protein_ratio = product.nutrition.protein_g / (product.nutrition.protein_g + product.nutrition.carbs_g + product.nutrition.fat_g);
  
  if (protein_ratio >= 0.35) {
    score += 15; // High protein = more satiating
  }
  
  // Sugar impact (causes cravings)
  if (product.nutrition.sugar_g > 10) {
    score -= Math.min(20, product.nutrition.sugar_g / 2);
  }
  
  // Fiber benefit (satiety + digestion)
  if (product.nutrition.fiber_g >= 3) {
    score += 15;
  }
  
  // Artificial sweeteners (slight penalty - mixed evidence)
  if (product.ingredients.includes("artificial_sweeteners")) {
    score -= 5;
  }
  
  return Math.max(0, Math.min(100, score));
}
```

---

## 📊 API Endpoints - Personalized Responses

### GET /api/products/:barcode
**Query Parameters:** `user_id`, `include_family=true`

**Response:**
```javascript
{
  product_id: "123456",
  name: "Organic Granola Bar",
  brand: "Brand X",
  barcode: "012345678901",
  
  general_nutrition: {
    calories: 180,
    sugar_g: 12,
    carbs_g: 24,
    fiber_g: 3,
    protein_g: 5,
    fat_g: 8,
    sodium_mg: 120,
    // ... full nutrition facts
  },
  
  // PERSONALIZED SCORING (based on user's profile)
  personalized_scoring: {
    user_profile_type: "diabetes_type2",
    scores: {
      diabetes_score: 42,
      heart_score: 85,
      weight_score: 65,
      general_health_score: 70
    },
    
    primary_recommendation: {
      score: 42,
      condition: "diabetes",
      text: "⚠️ NOT RECOMMENDED - High simple sugars (12g) will spike blood glucose. Consider alternatives.",
      reasoning: "With your A1C target of 7.0, this product's 12g of sugar will likely cause a significant blood glucose elevation."
    },
    
    secondary_recommendations: [
      {
        score: 85,
        condition: "heart_health",
        text: "✅ GOOD - Low sodium (120mg) is heart-friendly."
      }
    ]
  },
  
  // PERSONALIZED ALTERNATIVES (for user's conditions)
  personalized_alternatives: {
    condition: "diabetes",
    alternatives: [
      {
        product_id: "789012",
        name: "Low-Sugar Granola Bar (Brand Y)",
        sugar_g: 2,
        diabetes_score: 88,
        why_better: "Only 2g sugar vs 12g. Won't spike your blood glucose.",
        user_rating: 4.8
      },
      {
        product_id: "345678",
        name: "Mixed Nuts (no added sugar)",
        sugar_g: 1,
        protein_g: 8,
        diabetes_score: 92,
        why_better: "High protein, nearly zero sugar. Stabilizes blood sugar.",
        user_rating: 4.9
      }
    ]
  },
  
  // COMMUNITY REPORTS (filtered to user's condition)
  community_reports: {
    total_reports: 24,
    reports_from_condition: 12, // Reports from other diabetics
    verified_reports: 8,
    average_diabetes_impact: "Spiked blood sugar 50-70 mg/dL",
    
    top_reports: [
      {
        id: "report_123",
        author: "Sarah_D (Type 2 Diabetic, 3 years)",
        authority_score: 95,
        condition: "diabetes",
        report: "This granola bar caused my glucose to spike from 110 to 180 within 20 minutes. Not safe for tight glucose control.",
        glucose_before: 110,
        glucose_after: 180,
        time_to_peak: "20 minutes",
        verification_status: "doctor_verified",
        helpful_votes: 47,
        photos: ["meter_reading_1.jpg"]
      }
    ]
  },
  
  // FAMILY SAFETY CHECK
  family_check: {
    safe_for_all_family_members: true,
    family_members: [
      {
        member_id: "user_123_fam_1",
        name: "Sarah (daughter)",
        allergies: ["Peanuts (life_threatening)"],
        safe: true,
        allergen_score: 100,
        notes: "No peanuts or cross-contamination risk detected."
      },
      {
        member_id: "user_123_fam_2",
        name: "Mom",
        health_conditions: ["heart_disease"],
        safe: true,
        heart_score: 85,
        notes: "Low sodium makes it heart-friendly."
      }
    ]
  }
}
```

### GET /api/recommendations/home
**Query Parameters:** `user_id`

**Response:**
```javascript
{
  user_profile_type: "diabetes_type2",
  recommendations_based_on: ["primary_goal: lower_blood_sugar", "health_condition: diabetes"],
  
  recommended_categories: [
    {
      category: "Blood Sugar Friendly Snacks",
      reasoning: "Based on your diabetes goal",
      products: [
        {
          name: "String Cheese",
          score: 95,
          why_recommended: "High protein, zero sugar. Stabilizes blood sugar.",
          average_user_glucose_impact: "+5 mg/dL"
        },
        {
          name: "Almonds (unsalted)",
          score: 92,
          why_recommended: "Protein and healthy fats. No glucose spike.",
          average_user_glucose_impact: "+2 mg/dL"
        }
      ]
    },
    {
      category: "Breakfast Options for Diabetics",
      products: [...]
    }
  ]
}
```

### POST /api/incidents
**Body:**
```javascript
{
  user_id: "user_123",
  product_id: "product_456",
  barcode: "012345678901",
  
  // Condition-specific incident fields
  condition_type: "diabetes", // Routes to specific incident capture
  
  diabetes_specific: {
    blood_glucose_before_mg_dl: 110,
    time_of_reading_before: "2026-07-14T10:30:00Z",
    amount_consumed: "1 bar",
    time_of_consumption: "2026-07-14T10:35:00Z",
    blood_glucose_after_mg_dl: 185,
    time_of_reading_after: "2026-07-14T11:00:00Z",
    glucose_impact_mg_dl: 75,
    symptoms: ["increased_thirst", "fatigue"],
    treatment_used: "insulin",
    insulin_units: 4,
    time_to_stabilize_minutes: 45,
    medical_consultation: true,
    doctor_name: "Dr. Johnson",
    doctor_specialty: "Endocrinology"
  },
  
  allergy_specific: { // If allergy incident
    family_member_id: "fam_member_1",
    allergen: "Peanuts",
    symptoms: ["hives", "throat_swelling"],
    symptom_photos: ["photo_1.jpg", "photo_2.jpg"],
    onset_time_minutes: 15,
    treatment_used: "EpiPen",
    emergency_room: true,
    medical_consultation: true
  },
  
  common_fields: {
    narrative: "Ate the granola bar at 10:35. Within 25 minutes, my blood sugar was up 75 points. Used insulin to bring it down. Took 45 minutes to stabilize.",
    severity: "serious", // safe, minor, serious, life_threatening
    photos: ["photo_1.jpg"],
    verified: false,
    consent_given: true
  }
}
```

### GET /api/products/:barcode/incidents
**Query Parameters:** `user_id`, `condition_filter=diabetes`

**Response - Filtered to User's Condition:**
```javascript
{
  product_id: "123456",
  total_incidents: 45,
  incidents_matching_user_condition: 12,
  
  incidents: [
    {
      id: "incident_123",
      author: "Type2Diabetic_Sarah",
      condition: "diabetes",
      severity: "serious",
      blood_glucose_before: 105,
      blood_glucose_after: 187,
      glucose_impact: 82,
      narrative: "...",
      verification_status: "doctor_verified",
      helpful_votes: 52,
      author_profile: {
        user_id: "user_456",
        condition: "Type 2 Diabetes",
        a1c: 7.2,
        similar_to_user: true // Same condition, similar A1C
      }
    }
  ]
}
```

---

## 💾 Database Schema

### users_health_profiles table
```sql
CREATE TABLE users_health_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  health_conditions JSONB,
  allergies JSONB,
  dietary_preferences JSONB,
  health_goals JSONB,
  health_metrics JSONB,
  preferences JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_health_conditions ON users_health_profiles USING GIN(health_conditions);
CREATE INDEX idx_user_allergies ON users_health_profiles USING GIN(allergies);
```

### family_members table
```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255),
  relationship VARCHAR(100),
  age INTEGER,
  health_conditions JSONB,
  allergies JSONB,
  dietary_preferences JSONB,
  health_goals JSONB,
  health_metrics JSONB,
  created_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_family (user_id)
);
```

### product_personalized_scores table
```sql
CREATE TABLE product_personalized_scores (
  id UUID PRIMARY KEY,
  product_id VARCHAR(50),
  user_id UUID,
  diabetes_score INT,
  heart_score INT,
  allergy_score INT,
  weight_score INT,
  general_health_score INT,
  recommendation_text TEXT,
  created_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_product_user (product_id, user_id)
);
```

### incidents_personalized table
```sql
CREATE TABLE incidents_personalized (
  id UUID PRIMARY KEY,
  user_id UUID,
  family_member_id UUID,
  product_id VARCHAR(50),
  condition_type VARCHAR(50), -- diabetes, allergy, heart_disease, etc.
  severity VARCHAR(50),
  narrative TEXT,
  condition_specific_data JSONB, -- diabetes: glucose readings, allergy: symptoms, etc.
  photos JSONB,
  verified BOOLEAN,
  doctor_verified BOOLEAN,
  doctor_name VARCHAR(255),
  created_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (family_member_id) REFERENCES family_members(id),
  INDEX idx_product_incidents (product_id),
  INDEX idx_user_incidents (user_id),
  INDEX idx_condition_type (condition_type)
);
```

---

## 🎯 Implementation Priority

### Phase 3 (MVP - Minimal Personalization)
- ✅ User health profile creation (onboarding)
- ✅ Basic diabetes scoring
- ✅ Allergy checking
- ✅ Family member profiles
- ✅ Basic recommendations

### Phase 4 (Expanded Personalization)
- ✅ Advanced heart health scoring
- ✅ Weight management scoring
- ✅ Condition-specific incident reporting
- ✅ AI-driven recommendations
- ✅ Integration with wearables (Apple Health, Google Fit)

### Phase 5+ (Advanced AI)
- ✅ Predictive modeling (glucose impact, allergy risk)
- ✅ Machine learning personalization
- ✅ Doctor API integrations
- ✅ Insurance partnerships

---

## 🔐 Privacy & HIPAA Compliance

- All health metrics encrypted at rest
- Health data is PHI (Protected Health Information)
- HIPAA consent required for each data use case
- Audit trail for all data access
- User can delete all health data anytime
- Anonymization for research sharing

---

**This is the backbone of ScanWise's differentiation.** Everything else flows from here. 💪
