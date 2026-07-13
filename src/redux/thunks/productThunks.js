const productsService = require('../../../services/api/products.service');
const { productsActions } = require('../slices/productsSlice');

const scanProductThunk = (barcode) => async (dispatch) => {
  dispatch(productsActions.productsStart());
  try {
    const { data } = await productsService.lookup(barcode);
    dispatch(productsActions.setCurrentProduct(data));
  } catch (error) {
    dispatch(productsActions.productsFailure(error.message));
  }
};

const fetchAlternativesThunk = (barcode, goals) => async (dispatch, getState) => {
  dispatch(productsActions.productsStart());
  try {
    const { data } = await productsService.alternatives(barcode, goals);
    const isPremium = getState().user.subscription.tier === 'premium';
    dispatch(productsActions.setAlternatives(isPremium ? data.slice(0, 3) : data.slice(0, 1)));
  } catch (error) {
    dispatch(productsActions.productsFailure(error.message));
  }
};

module.exports = { scanProductThunk, fetchAlternativesThunk };
