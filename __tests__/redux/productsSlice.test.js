const { productsReducer, productsActions, productsInitialState } = require('../../src/redux/slices/productsSlice');

test('setCurrentProduct updates current and keeps recent history capped', () => {
  let state = productsInitialState;
  for (let i = 0; i < 7; i += 1) {
    state = productsReducer(state, productsActions.setCurrentProduct({ barcode: String(i), name: `P${i}` }));
  }
  expect(state.recent).toHaveLength(5);
  expect(state.currentProduct.barcode).toBe('6');
});
