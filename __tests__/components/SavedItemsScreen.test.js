const { sortSavedItems, searchSavedItems } = require('../../src/screens/app/SavedItemsScreen');

test('sortSavedItems by name', () => {
  const items = [{ name: 'B' }, { name: 'A' }];
  expect(sortSavedItems(items, 'name')[0].name).toBe('A');
});

test('searchSavedItems filters by term', () => {
  const items = [{ name: 'Almond Milk', brand: 'X' }, { name: 'Soda', brand: 'Y' }];
  expect(searchSavedItems(items, 'almond')).toHaveLength(1);
});
