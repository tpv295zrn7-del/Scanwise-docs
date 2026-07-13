const apiClient = require('../axios-config');

module.exports = {
  profile: () => apiClient.get('/api/user/profile'),
  updatePreferences: (payload) => apiClient.patch('/api/user/preferences', payload),
  exportData: () => apiClient.get('/api/user/export')
};
