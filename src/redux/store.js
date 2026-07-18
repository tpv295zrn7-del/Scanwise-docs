/**
 * Redux Store Configuration
 * 
 * Centralized state management with:
 * - Redux DevTools integration
 * - Middleware setup
 * - Redux Persist for offline support
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from './rootReducer';

/**
 * Redux Persist Configuration
 * Stores selected state in AsyncStorage for offline access
 */
const persistConfig = {
  key: 'scanwise-root',
  storage: AsyncStorage,
  whitelist: [
    'healthProfiles',    // Always persist user health data
    'familyMembers',     // Always persist family data
    'incidents',         // Cache incidents locally
    'productScoring',    // Cache product scores
  ],
  blacklist: [
    'ui',                // Don't persist UI state
    'auth',              // Don't persist auth (handled separately)
    'community',         // Community data fetched fresh
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Configure Redux Store
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check (redux-persist)
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these paths in state for serialization check
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['_persist'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Create Persistor for Redux Persist
 * Used to rehydrate store on app launch
 */
export const persistor = persistStore(store);

export default store;