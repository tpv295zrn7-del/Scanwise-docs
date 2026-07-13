const apiClient = require('../axios-config');

module.exports = {
  submit: (payload) => apiClient.post('/api/corrections', payload),
  vote: (id, payload) => apiClient.post(`/api/corrections/${id}/vote`, payload),
  list: () => apiClient.get('/api/corrections')
};
