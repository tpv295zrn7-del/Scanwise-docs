const AuthNavigator = require('../../src/navigation/AuthNavigator');

test('auth flow contains login/register/reset', () => {
  expect(AuthNavigator.stack).toEqual(['LoginScreen', 'RegisterScreen', 'PasswordResetScreen']);
});
