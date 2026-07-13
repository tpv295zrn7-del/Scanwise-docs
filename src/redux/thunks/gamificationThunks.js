const gamificationService = require('../../../services/api/gamification.service');
const { userActions } = require('../slices/userSlice');

const loadGamificationThunk = () => async (dispatch) => {
  const { data } = await gamificationService.getStats();
  dispatch(userActions.addPoints(data.points || 0));
};

module.exports = { loadGamificationThunk };
