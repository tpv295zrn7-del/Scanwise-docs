const { createScanwiseApp, STARTUP_PHASES } = require('../../App');

test('bootstraps and resolves deep link route', async () => {
  const analytics = { trackEvent: jest.fn() };
  const store = {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({ app: { isAuthenticated: true, isLoading: false } })),
  };

  const app = createScanwiseApp({ store, analytics });
  const state = await app.bootstrap('scanwise://product/44');

  expect(state.startupPhase).toBe(STARTUP_PHASES.READY);
  expect(state.startupRoute).toBe('ProductDetail');
  expect(analytics.trackEvent).toHaveBeenCalledWith('app_bootstrapped', { startupRoute: 'ProductDetail' });
});
