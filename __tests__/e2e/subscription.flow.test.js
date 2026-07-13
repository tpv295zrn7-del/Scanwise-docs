const { plans } = require('../../src/screens/app/PaywallScreen');

test('subscription flow exposes free and premium plan comparison', () => {
  expect(plans.free.scans).toBe(10);
  expect(plans.premium.scans).toBe('unlimited');
});
