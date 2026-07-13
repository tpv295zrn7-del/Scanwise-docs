const apiClient = require('../axios-config');

module.exports = {
  register: (payload) => apiClient.post('/api/auth/register', payload),
  login: (payload) => apiClient.post('/api/auth/login', payload),
  logout: () => apiClient.post('/api/auth/logout'),
  resetPassword: (payload) => apiClient.post('/api/auth/reset-password', payload)
};
