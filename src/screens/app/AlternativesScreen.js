const scoreToBand = (score) => {
  if (score >= 75) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
};

const limitAlternativesByTier = (items, tier) => (tier === 'premium' ? items.slice(0, 3) : items.slice(0, 1));

module.exports = { scoreToBand, limitAlternativesByTier };
