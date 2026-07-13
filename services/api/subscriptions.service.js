const apiClient = require('../axios-config');

module.exports = {
  status: () => apiClient.get('/api/subscriptions/status'),
  startTrial: () => apiClient.post('/api/subscriptions/start'),
  upgrade: (payload) => apiClient.post('/api/subscriptions/upgrade', payload)
};
