const { createLoadingSpinner } = require('../../src/components/LoadingSpinner');

test('shows blocking spinner metadata when loading', () => {
  const spinner = createLoadingSpinner({ selectIsLoading: () => true });
  const payload = spinner.evaluate({});

  expect(payload.visible).toBe(true);
  expect(payload.isBlocking).toBe(true);
  expect(payload.accessibilityRole).toBe('progressbar');
});

test('shows offline indicator when network is down', () => {
  const spinner = createLoadingSpinner({ selectIsLoading: () => true });
  const payload = spinner.evaluate({}, false);

  expect(payload.offlineIndicator).toBe('Offline mode');
});
