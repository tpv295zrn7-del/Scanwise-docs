/**
 * Redux Store Configuration
 * 
 * Centralized state management with:
 * - Redux DevTools integration
 * - Middleware setup
 * - Redux Persist for offline support
 * - Error tracking middleware
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from './rootReducer';

/**
 * Redux Persist Configuration
 * 
 * WHITELIST: Data that ALWAYS persists (offline access needed)
 * - healthProfiles: User health conditions, metrics, allergies
 * - familyMembers: Family member profiles
 * - incidents: Cached incident reports with photos
 * - productScoring: Cached product scores (reduces API calls)
 * 
 * BLACKLIST: Data that is NEVER persisted (transient UI state)
 * - app.ui: Modal states, loading spinners, navigation history
 * - app.notifications: Temporary toast messages
 * - community: Always fetch fresh from backend
 * 
 * RATIONALE: Balance offline functionality with data freshness
 */
const persistConfig = {
  key: 'scanwise-root-v1', // Increment version if schema changes
  storage: AsyncStorage,
  whitelist: [
    'healthProfiles',    // Essential: User health data
    'familyMembers',     // Essential: Family protection
    'incidents',         // Essential: User's incident history
    'productScoring',    // Cache: Recent scans for offline access
  ],
  blacklist: [
    'app',               // Transient: UI state, notifications, session
    'community',         // Network: Always fetch fresh data
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Error Tracking Middleware
 * Catches and logs all Redux errors for debugging
 */
const errorMiddleware = (store) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    console.error('[Redux Error]', {
      action: action.type,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

/**
 * Logging Middleware (Development only)
 * Logs all actions for debugging
 */
const loggingMiddleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Redux Action]', action.type, action.payload);
  }
  return next(action);
};

/**
 * Configure Redux Store
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions (they contain non-serializable values)
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these paths in state
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['_persist'],
      },
    })
      .concat(errorMiddleware)
      .concat(loggingMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Create Persistor for Redux Persist
 * Used to rehydrate store on app launch
 */
export const persistor = persistStore(store);

/**
 * Persist Status Tracking
 * Hook for components to know when Redux is rehydrated from storage
 */
export const persistStatus = {
  isPersisting: true,
  setPersisting: null,
};

// Track persist completion
persistor.subscribe(() => {
  const { bootstrapped } = persistor.getState();
  if (bootstrapped) {
    persistStatus.isPersisting = false;
    console.log('[Redux] Store rehydrated from persistent storage');
  }
});

export default store;