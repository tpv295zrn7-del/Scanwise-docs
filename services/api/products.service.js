const apiClient = require('../axios-config');

module.exports = {
  scan: (barcode) => apiClient.get(`/api/products/${barcode}`),
  lookup: (barcode) => apiClient.get(`/api/products/${barcode}`),
  alternatives: (barcode, goals = []) =>
    apiClient.get(`/api/alternatives/${barcode}`, { params: { goals: goals.join(',') } }),
  search: (query) => apiClient.get('/api/products/search', { params: { q: query } }),
  savedItems: () => apiClient.get('/api/saved-items'),
  saveItem: (payload) => apiClient.post('/api/saved-items', payload),
  removeSaved: (barcode) => apiClient.delete(`/api/saved-items/${barcode}`)
};
