/**
 * App State Redux Slice
 * 
 * Manages global app state:
 * - UI state (loading, modals, navigation)
 * - App initialization status
 * - Notifications/toasts
 * - User session
 */

import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    // Initialization state
    isInitialized: false,
    isFirstLaunch: true,
    appVersion: '1.0.0',

    // User session
    userId: null,
    isAuthenticated: false,
    lastSessionTime: null,

    // UI state
    activeModal: null, // Which modal is open
    isLoading: false,
    networkConnected: true,

    // Navigation
    currentRoute: 'Onboarding',
    previousRoute: null,

    // Notifications
    notifications: [],

    // App preferences
    theme: 'light', // 'light' or 'dark'
    language: 'en',
  },

  reducers: {
    // Initialization
    setInitialized: (state) => {
      state.isInitialized = true;
    },

    setFirstLaunch: (state, action) => {
      state.isFirstLaunch = action.payload;
    },

    // User session
    setUserId: (state, action) => {
      state.userId = action.payload;
      state.isAuthenticated = !!action.payload;
    },

    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },

    updateLastSessionTime: (state) => {
      state.lastSessionTime = new Date().toISOString();
    },

    logout: (state) => {
      state.userId = null;
      state.isAuthenticated = false;
      state.currentRoute = 'Onboarding';
      state.notifications = [];
    },

    // UI state
    setActiveModal: (state, action) => {
      state.activeModal = action.payload;
    },

    closeModal: (state) => {
      state.activeModal = null;
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setNetworkConnected: (state, action) => {
      state.networkConnected = action.payload;
    },

    // Navigation
    setCurrentRoute: (state, action) => {
      state.previousRoute = state.currentRoute;
      state.currentRoute = action.payload;
    },

    // Notifications
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },

    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Preferences
    setTheme: (state, action) => {
      state.theme = action.payload;
    },

    setLanguage: (state, action) => {
      state.language = action.payload;
    },
  },
});

export const {
  setInitialized,
  setFirstLaunch,
  setUserId,
  setAuthenticated,
  updateLastSessionTime,
  logout,
  setActiveModal,
  closeModal,
  setLoading,
  setNetworkConnected,
  setCurrentRoute,
  addNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  setLanguage,
} = appSlice.actions;

// Selectors
export const selectIsInitialized = (state) => state.app.isInitialized;
export const selectIsFirstLaunch = (state) => state.app.isFirstLaunch;
export const selectUserId = (state) => state.app.userId;
export const selectIsAuthenticated = (state) => state.app.isAuthenticated;
export const selectActiveModal = (state) => state.app.activeModal;
export const selectIsLoading = (state) => state.app.isLoading;
export const selectNetworkConnected = (state) => state.app.networkConnected;
export const selectCurrentRoute = (state) => state.app.currentRoute;
export const selectNotifications = (state) => state.app.notifications;
export const selectTheme = (state) => state.app.theme;
export const selectLanguage = (state) => state.app.language;

export default appSlice.reducer;