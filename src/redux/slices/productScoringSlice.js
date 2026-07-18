/**
 * Product Scoring Redux Slice
 * 
 * Manages personalized product scores cache:
 * - Store scored products locally
 * - Calculate scores based on user profile
 * - Cache scores to reduce API calls
 * - Track recent scans
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const scoreProduct = createAsyncThunk(
  'productScoring/scoreProduct',
  async ({ barcode, userProfile }, { rejectWithValue }) => {
    try {
      // TODO: Call backend API with barcode and user profile
      // const response = await api.post(`/products/${barcode}/score`, { userProfile });
      // return response.data;
      return null; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getProductAlternatives = createAsyncThunk(
  'productScoring/getAlternatives',
  async ({ productId, condition }, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // const response = await api.get(`/products/${productId}/alternatives?condition=${condition}`);
      // return response.data;
      return []; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const productScoringSlice = createSlice({
  name: 'productScoring',
  initialState: {
    scoredProducts: {}, // barcode -> scored product data
    recentScans: [], // Last 10 scanned products
    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    // Add scored product to cache
    addScoredProduct: (state, action) => {
      const { barcode, scoreData } = action.payload;
      state.scoredProducts[barcode] = {
        ...scoreData,
        cachedAt: new Date().toISOString(),
      };
      // Add to recent scans if not already there
      if (!state.recentScans.includes(barcode)) {
        state.recentScans.unshift(barcode);
        // Keep only last 20 scans
        if (state.recentScans.length > 20) {
          const removed = state.recentScans.pop();
          delete state.scoredProducts[removed];
        }
      }
    },

    // Clear cache
    clearScoreCache: (state) => {
      state.scoredProducts = {};
      state.recentScans = [];
    },

    // Remove specific product from cache
    removeCachedProduct: (state, action) => {
      const barcode = action.payload;
      delete state.scoredProducts[barcode];
      state.recentScans = state.recentScans.filter((b) => b !== barcode);
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // Score Product
    builder
      .addCase(scoreProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scoreProduct.fulfilled, (state, action) => {
        state.loading = false;
        const { barcode, ...scoreData } = action.payload;
        if (barcode) {
          state.scoredProducts[barcode] = {
            ...scoreData,
            cachedAt: new Date().toISOString(),
          };
          if (!state.recentScans.includes(barcode)) {
            state.recentScans.unshift(barcode);
            if (state.recentScans.length > 20) {
              const removed = state.recentScans.pop();
              delete state.scoredProducts[removed];
            }
          }
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(scoreProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Get Alternatives
    builder
      .addCase(getProductAlternatives.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductAlternatives.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(getProductAlternatives.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  addScoredProduct,
  clearScoreCache,
  removeCachedProduct,
  clearError,
} = productScoringSlice.actions;

// Selectors
export const selectScoredProducts = (state) =>
  state.productScoring.scoredProducts;
export const selectRecentScans = (state) => state.productScoring.recentScans;
export const selectScoredProduct = (state, barcode) =>
  state.productScoring.scoredProducts[barcode] || null;
export const selectProductScoringLoading = (state) =>
  state.productScoring.loading;
export const selectProductScoringError = (state) =>
  state.productScoring.error;

export default productScoringSlice.reducer;