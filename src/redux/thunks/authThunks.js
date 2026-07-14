const authService = require('../../../services/api/auth.service');
const { authActions } = require('../slices/authSlice');

const loginThunk = (payload) => async (dispatch) => {
  dispatch(authActions.authStart());
  try {
    const { data } = await authService.login(payload);
    dispatch(authActions.loginSuccess(data));
  } catch (error) {
    dispatch(authActions.authFailure(error.message));
  }
};

module.exports = { loginThunk };
