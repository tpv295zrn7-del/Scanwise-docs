const { processPayment } = require('../../services/stripe.service');

test('processPayment returns successful confirmation in test mode', async () => {
  const result = await processPayment({ plan: 'monthly', paymentMethodId: 'pm_test_123' });
  expect(result.success).toBe(true);
  expect(result.plan).toBe('monthly');
});
