/**
 * App State Redux Slice - ENHANCED
 * 
 * Manages global app state:
 * - UI state (loading, modals, navigation)
 * - App initialization status
 * - Notifications/toasts with dismiss capability
 * - User session
 * 
 * DISMISSIBLE NOTIFICATIONS: Users can manually dismiss notifications
 * TIMESTAMP SYNCING: Per-slice tracking allows independent refresh strategies
 */

import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    // Initialization state
    isInitialized: false,
    isFirstLaunch: true,
    appVersion: '1.0.0',
    appBuildNumber: '1',

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

    // Notifications/Toasts
    // Structure: { id, message, type, duration, dismissible, timestamp }
    notifications: [],

    // App preferences
    theme: 'light', // 'light' or 'dark'
    language: 'en',

    // App-wide sync strategy
    lastAppSync: null, // Last time ANY data was synced
    syncStrategy: 'periodic', // 'periodic', 'on-demand', 'automatic'
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

    // Enhanced Notifications with dismiss capability
    addNotification: (state, action) => {
      const notification = {
        id: action.payload.id || Date.now(),
        message: action.payload.message,
        type: action.payload.type || 'info', // 'success', 'error', 'warning', 'info'
        duration: action.payload.duration || 3000,
        dismissible: action.payload.dismissible !== false, // Default: true
        timestamp: new Date().toISOString(),
      };
      
      // Keep only last 5 notifications to prevent memory bloat
      if (state.notifications.length >= 5) {
        state.notifications.shift();
      }
      
      state.notifications.push(notification);
    },

    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },

    // Dismiss specific notification by index (for UI click handlers)
    dismissNotification: (state, action) => {
      const index = action.payload;
      if (index >= 0 && index < state.notifications.length) {
        state.notifications.splice(index, 1);
      }
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

    // App-wide sync tracking
    recordAppSync: (state) => {
      state.lastAppSync = new Date().toISOString();
    },

    setSyncStrategy: (state, action) => {
      state.syncStrategy = action.payload; // 'periodic', 'on-demand', 'automatic'
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
  dismissNotification,
  clearNotifications,
  setTheme,
  setLanguage,
  recordAppSync,
  setSyncStrategy,
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
export const selectLastAppSync = (state) => state.app.lastAppSync;
export const selectSyncStrategy = (state) => state.app.syncStrategy;

// Helper selector: Get notification count
export const selectNotificationCount = (state) =>
  state.app.notifications.length;

// Helper selector: Get latest notification
export const selectLatestNotification = (state) => {
  const notifications = state.app.notifications;
  return notifications.length > 0 ? notifications[notifications.length - 1] : null;
};

export default appSlice.reducer;