const { authReducer, authActions, authInitialState } = require('../../src/redux/slices/authSlice');

test('loginSuccess updates auth state', () => {
  const state = authReducer(authInitialState, authActions.loginSuccess({ user: { id: 1 }, token: 'jwt' }));
  expect(state.isAuthenticated).toBe(true);
  expect(state.token).toBe('jwt');
});
