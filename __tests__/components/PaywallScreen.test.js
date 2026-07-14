const { annualSavings } = require('../../src/screens/app/PaywallScreen');

test('annual savings calculated against monthly plan', () => {
  expect(annualSavings({ monthly: 9.99, annual: 79.99 })).toBe(39.89);
});
