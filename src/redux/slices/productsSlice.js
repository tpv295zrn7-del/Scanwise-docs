const { createSlice } = require('@reduxjs/toolkit');

const initialState = {
  currentProduct: null,
  alternatives: [],
  saved: [],
  recent: [],
  loading: false,
  error: null
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    productsStart(state) {
      state.loading = true;
      state.error = null;
    },
    setCurrentProduct(state, action) {
      state.loading = false;
      state.currentProduct = action.payload;
      state.recent = [action.payload, ...state.recent.filter((p) => p.barcode !== action.payload.barcode)].slice(0, 5);
    },
    setAlternatives(state, action) {
      state.loading = false;
      state.alternatives = action.payload || [];
    },
    setSavedProducts(state, action) {
      state.saved = action.payload || [];
    },
    addSavedProduct(state, action) {
      const exists = state.saved.some((item) => item.barcode === action.payload.barcode);
      if (!exists) {
        state.saved.unshift(action.payload);
      }
    },
    removeSavedProduct(state, action) {
      state.saved = state.saved.filter((item) => item.barcode !== action.payload);
    },
    productsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    }
  }
});

module.exports = {
  productsReducer: productsSlice.reducer,
  productsActions: productsSlice.actions,
  productsInitialState: initialState
};
