const apiClient = require('../axios-config');

module.exports = {
  getStats: () => apiClient.get('/api/gamification/stats'),
  leaderboard: () => apiClient.get('/api/gamification/leaderboard')
};
