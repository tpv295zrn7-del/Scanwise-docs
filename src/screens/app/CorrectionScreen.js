const correctionTypes = [
  'fix_nutrition_information',
  'fix_ingredients',
  'fix_allergen_info',
  'other_issue'
];

const buildCorrectionPayload = ({ barcode, type, description, nutrition, ingredients, source }) => ({
  barcode,
  type,
  description,
  nutrition: nutrition || null,
  ingredients: ingredients || null,
  source
});

module.exports = { correctionTypes, buildCorrectionPayload };
