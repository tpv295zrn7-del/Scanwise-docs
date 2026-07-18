/**
 * Health Profiles Redux Slice
 * 
 * Manages user health profile state:
 * - Health conditions & goals
 * - Health metrics (A1C, BP, etc)
 * - Allergies & dietary preferences
 * - Profile updates & persistence
 * 
 * VALIDATION: Input validation happens in components/thunks
 * RETRY LOGIC: Async thunks include exponential backoff retry
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Retry utility with exponential backoff
 * Handles transient network errors common in mobile
 */
const retryAsync = async (asyncFn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      // Don't retry on validation/auth errors
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw error;
      }

      if (isLastAttempt) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/**
 * Async Thunks for API calls with retry logic
 */
export const fetchHealthProfile = createAsyncThunk(
  'healthProfiles/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      // TODO: Call backend API with retry
      // return await retryAsync(async () => {
      //   const response = await api.get(`/users/${userId}/profile`);
      //   return response.data;
      // });
      return null; // Placeholder
    } catch (error) {
      console.error('[fetchHealthProfile Error]', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updateHealthProfile = createAsyncThunk(
  'healthProfiles/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      // TODO: Call backend API with retry
      // return await retryAsync(async () => {
      //   const response = await api.put(`/users/profile`, profileData);
      //   return response.data;
      // });
      return profileData; // Placeholder
    } catch (error) {
      console.error('[updateHealthProfile Error]', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Health Profiles Slice
 * 
 * State Structure:
 * {
 *   userProfile: {
 *     health_conditions: [],
 *     health_metrics: {},
 *     allergies: [],
 *     dietary_preferences: {}
 *   },
 *   loading: boolean,
 *   error: string | null,
 *   lastUpdated: ISO timestamp,
 *   lastSyncAttempt: ISO timestamp,
 *   syncRetryCount: number
 * }
 */
const healthProfilesSlice = createSlice({
  name: 'healthProfiles',
  initialState: {
    userProfile: null,
    loading: false,
    error: null,
    lastUpdated: null,
    lastSyncAttempt: null,
    syncRetryCount: 0,
  },

  reducers: {
    // Synchronous actions
    setHealthProfile: (state, action) => {
      state.userProfile = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.syncRetryCount = 0; // Reset retry count on success
    },

    updateHealthMetrics: (state, action) => {
      if (state.userProfile) {
        state.userProfile.health_metrics = {
          ...state.userProfile.health_metrics,
          ...action.payload,
        };
        state.lastUpdated = new Date().toISOString();
      }
    },

    updateHealthConditions: (state, action) => {
      if (state.userProfile) {
        state.userProfile.health_conditions = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },

    updateAllergies: (state, action) => {
      if (state.userProfile) {
        state.userProfile.allergies = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },

    updateDietaryPreferences: (state, action) => {
      if (state.userProfile) {
        state.userProfile.dietary_preferences = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },

    clearHealthProfile: (state) => {
      state.userProfile = null;
      state.lastUpdated = null;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Sync tracking
    recordSyncAttempt: (state) => {
      state.lastSyncAttempt = new Date().toISOString();
      state.syncRetryCount += 1;
    },

    resetSyncRetry: (state) => {
      state.syncRetryCount = 0;
    },
  },

  extraReducers: (builder) => {
    // Fetch Health Profile
    builder
      .addCase(fetchHealthProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHealthProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.syncRetryCount = 0;
      })
      .addCase(fetchHealthProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.syncRetryCount += 1;
      });

    // Update Health Profile
    builder
      .addCase(updateHealthProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateHealthProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.syncRetryCount = 0;
      })
      .addCase(updateHealthProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.syncRetryCount += 1;
      });
  },
});

export const {
  setHealthProfile,
  updateHealthMetrics,
  updateHealthConditions,
  updateAllergies,
  updateDietaryPreferences,
  clearHealthProfile,
  clearError,
  recordSyncAttempt,
  resetSyncRetry,
} = healthProfilesSlice.actions;

// Selectors
export const selectHealthProfile = (state) => state.healthProfiles.userProfile;
export const selectHealthConditions = (state) =>
  state.healthProfiles.userProfile?.health_conditions || [];
export const selectHealthMetrics = (state) =>
  state.healthProfiles.userProfile?.health_metrics || {};
export const selectAllergies = (state) =>
  state.healthProfiles.userProfile?.allergies || [];
export const selectDiabetesMetrics = (state) =>
  state.healthProfiles.userProfile?.health_metrics?.diabetes || null;
export const selectHeartMetrics = (state) =>
  state.healthProfiles.userProfile?.health_metrics?.heart_health || null;
export const selectWeightMetrics = (state) =>
  state.healthProfiles.userProfile?.health_metrics?.weight_management || null;
export const selectProfileLoading = (state) => state.healthProfiles.loading;
export const selectProfileError = (state) => state.healthProfiles.error;
export const selectSyncRetryCount = (state) =>
  state.healthProfiles.syncRetryCount;
export const selectLastSyncAttempt = (state) =>
  state.healthProfiles.lastSyncAttempt;

export default healthProfilesSlice.reducer;