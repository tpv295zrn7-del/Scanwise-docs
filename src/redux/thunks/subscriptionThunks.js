const subscriptionsService = require('../../../services/api/subscriptions.service');
const { subscriptionActions } = require('../slices/subscriptionSlice');

const loadSubscriptionStatusThunk = () => async (dispatch) => {
  dispatch(subscriptionActions.subscriptionStart());
  try {
    const { data } = await subscriptionsService.status();
    dispatch(subscriptionActions.subscriptionSuccess(data));
  } catch (error) {
    dispatch(subscriptionActions.subscriptionFailure(error.message));
  }
};

module.exports = { loadSubscriptionStatusThunk };
