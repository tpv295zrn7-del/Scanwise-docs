const { createSlice } = require('@reduxjs/toolkit');

const initialState = {
  tier: 'free',
  status: 'inactive',
  trialEndsAt: null,
  loading: false,
  error: null
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    subscriptionStart(state) {
      state.loading = true;
      state.error = null;
    },
    subscriptionSuccess(state, action) {
      state.loading = false;
      state.tier = action.payload.tier;
      state.status = action.payload.status;
      state.trialEndsAt = action.payload.trialEndsAt || null;
    },
    subscriptionFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    }
  }
});

module.exports = {
  subscriptionReducer: subscriptionSlice.reducer,
  subscriptionActions: subscriptionSlice.actions,
  subscriptionInitialState: initialState
};
