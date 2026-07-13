const { createProductScreenState } = require('../../src/screens/app/ProductScreen');

test('product screen initializes with free tier scan limit', () => {
  const state = createProductScreenState();
  expect(state.scanLimit.max).toBe(10);
});
