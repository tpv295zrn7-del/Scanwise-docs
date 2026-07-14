const PAYMENT_PLANS = {
  trial: { id: 'trial_14_days', amount: 0, interval: '14_days' },
  monthly: { id: 'monthly_9_99', amount: 999, interval: 'month' },
  annual: { id: 'annual_79_99', amount: 7999, interval: 'year' }
};

const processPayment = async ({ plan, paymentMethodId }) => {
  if (!PAYMENT_PLANS[plan]) {
    throw new Error('Unsupported plan');
  }
  if (!paymentMethodId) {
    throw new Error('paymentMethodId is required');
  }
  return {
    success: true,
    plan,
    paymentMethodId,
    confirmationId: `test_${Date.now()}`
  };
};

module.exports = { PAYMENT_PLANS, processPayment };
