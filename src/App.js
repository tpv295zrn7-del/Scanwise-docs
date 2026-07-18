const { createScanwiseApp } = require('../App');

const bootstrapApp = (options = {}) =>
  createScanwiseApp({
    store: options.store || null,
    persistor: options.persistor || null,
    analytics: options.analytics,
    network: options.network,
    initialize: options.initialize,
    errorMonitoring: options.errorMonitoring,
  });

module.exports = { bootstrapApp };
