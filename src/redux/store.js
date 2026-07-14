const { configureStore } = require('@reduxjs/toolkit');
const { authReducer } = require('./slices/authSlice');
const { userReducer } = require('./slices/userSlice');
const { productsReducer } = require('./slices/productsSlice');
const { uiReducer } = require('./slices/uiSlice');
const { subscriptionReducer } = require('./slices/subscriptionSlice');

const createAppStore = () => configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    products: productsReducer,
    ui: uiReducer,
    subscription: subscriptionReducer
  }
});

module.exports = { createAppStore };
