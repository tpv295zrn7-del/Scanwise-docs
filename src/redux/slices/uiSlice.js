const { createSlice } = require('@reduxjs/toolkit');
const { createTheme } = require('../../theme/theme');

const initialState = {
  theme: createTheme(),
  scanCount: { used: 0, remaining: 10, premium: false },
  notifications: []
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action) {
      state.theme = createTheme(action.payload);
    },
    incrementScan(state) {
      state.scanCount.used += 1;
      state.scanCount.remaining = state.scanCount.premium ? null : Math.max(0, 10 - state.scanCount.used);
    },
    setPremium(state, action) {
      state.scanCount.premium = Boolean(action.payload);
      state.scanCount.remaining = state.scanCount.premium ? null : Math.max(0, 10 - state.scanCount.used);
    },
    notify(state, action) {
      state.notifications.push(action.payload);
    },
    clearNotification(state, action) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    }
  }
});

module.exports = {
  uiReducer: uiSlice.reducer,
  uiActions: uiSlice.actions,
  uiInitialState: initialState
};
