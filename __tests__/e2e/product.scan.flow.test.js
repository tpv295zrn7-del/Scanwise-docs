const { createProductScreenState } = require('../../src/screens/app/ProductScreen');

test('product scan flow starts in non-loading state', () => {
  expect(createProductScreenState().loading).toBe(false);
});
