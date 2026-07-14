const sortSavedItems = (items, sortBy = 'date') => {
  const copy = [...items];
  if (sortBy === 'name') return copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (sortBy === 'category') return copy.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  return copy.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
};

const searchSavedItems = (items, term) => {
  if (!term) return items;
  const needle = term.toLowerCase();
  return items.filter((item) => [item.name, item.brand, item.category].join(' ').toLowerCase().includes(needle));
};

module.exports = { sortSavedItems, searchSavedItems };
