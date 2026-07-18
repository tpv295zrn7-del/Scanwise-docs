/**
 * Root Reducer
 * 
 * Combines all Redux slices into a single reducer
 * Manages all app state across features
 */

import { combineReducers } from '@reduxjs/toolkit';
import healthProfilesReducer from './slices/healthProfilesSlice';
import familyMembersReducer from './slices/familyMembersSlice';
import productScoringReducer from './slices/productScoringSlice';
import incidentsReducer from './slices/incidentsSlice';
import appReducer from './slices/appSlice';

const rootReducer = combineReducers({
  healthProfiles: healthProfilesReducer,
  familyMembers: familyMembersReducer,
  productScoring: productScoringReducer,
  incidents: incidentsReducer,
  app: appReducer,
});

export default rootReducer;