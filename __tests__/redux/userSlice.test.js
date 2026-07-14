const { userReducer, userActions, userInitialState } = require('../../src/redux/slices/userSlice');

test('setGoals de-duplicates goals', () => {
  const state = userReducer(userInitialState, userActions.setGoals(['lower_sugar', 'lower_sugar', 'higher_fiber']));
  expect(state.profile.goals).toEqual(['lower_sugar', 'higher_fiber']);
});
