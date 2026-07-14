const axios = require('axios');

const apiClient = axios.create({
  baseURL: process.env.SCANWISE_API_URL || 'http://localhost:3001',
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  const token = process.env.SCANWISE_AUTH_TOKEN;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

module.exports = apiClient;
