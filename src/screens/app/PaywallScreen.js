const plans = {
  free: { scans: 10, alternatives: 1, support: 'basic' },
  premium: { scans: 'unlimited', alternatives: 3, support: 'priority' }
};

const annualSavings = ({ monthly = 9.99, annual = 79.99 } = {}) => {
  const yearlyMonthlyCost = monthly * 12;
  return Number((yearlyMonthlyCost - annual).toFixed(2));
};

module.exports = { plans, annualSavings };
