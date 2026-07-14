const apiClient = require('../axios-config');

module.exports = {
  report: (payload) => apiClient.post('/api/incidents', payload),
  vote: (id, payload) => apiClient.post(`/api/incidents/${id}/vote`, payload),
  list: (barcode) => apiClient.get(`/api/incidents/${barcode}`)
};
