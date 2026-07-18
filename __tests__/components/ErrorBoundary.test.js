const { createErrorBoundary, GENERIC_PRODUCTION_MESSAGE } = require('../../src/components/ErrorBoundary');

test('captures error and includes production-safe payload', () => {
  const boundary = createErrorBoundary({ environment: 'production' });
  const payload = boundary.captureError(new Error('boom'));

  expect(payload.hasError).toBe(true);
  expect(payload.message).toBe(GENERIC_PRODUCTION_MESSAGE);
  expect(payload.stack).toBeNull();
});

test('dismiss resets boundary state', () => {
  const boundary = createErrorBoundary({ environment: 'development' });
  boundary.captureError(new Error('boom'));
  boundary.dismiss();

  expect(boundary.getState().hasError).toBe(false);
});
