/**
 * Health Profiles Redux Slice
 * 
 * Manages user health profile state:
 * - Health conditions & goals
 * - Health metrics (A1C, BP, etc)
 * - Allergies & dietary preferences
 * - Profile updates & persistence
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Async Thunks for API calls
 */
export const fetchHealthProfile = createAsyncThunk(
  'healthProfiles/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // const response = await api.get(`/users/${userId}/profile`);
      // return response.data;
      return null; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateHealthProfile = createAsyncThunk(
  'healthProfiles/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // const response = await api.put(`/users/profile`, profileData);
      // return response.data;
      return profileData; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Health Profiles Slice
 */
const healthProfilesSlice = createSlice({
  name: 'healthProfiles',
  initialState: {
    userProfile: null,
    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    // Synchronous actions
    setHealthProfile: (state, action) => {
      state.userProfile = action.payload;
      state.lastUpdated = new Date().toISOString();
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
      })
      .addCase(fetchHealthProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
      })
      .addCase(updateHealthProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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

export default healthProfilesSlice.reducer;