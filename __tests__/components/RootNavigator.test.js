const {
  createRootNavigator,
  parseDeepLink,
  guardRoute,
  OFFLINE_BANNER_MESSAGE,
} = require('../../src/navigation/RootNavigator');

test('parses product deep link', () => {
  expect(parseDeepLink('scanwise://product/123')).toEqual({
    name: 'ProductDetail',
    params: { productId: '123' },
  });
});

test('guards protected route for unauthenticated users', () => {
  expect(guardRoute('ProductDetail', { isAuthenticated: false })).toEqual({
    allowed: false,
    redirectTo: 'LoginScreen',
  });
});

test('returns offline banner when disconnected', () => {
  const navigator = createRootNavigator();
  expect(navigator.getOfflineBanner(false)).toBe(OFFLINE_BANNER_MESSAGE);
});
