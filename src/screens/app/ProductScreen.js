const scanModes = { camera: 'camera', manual: 'manual' };

const createProductScreenState = () => ({
  scanMode: scanModes.manual,
  loading: false,
  error: null,
  scanLimit: { used: 0, max: 10 },
  recentScans: []
});

module.exports = { scanModes, createProductScreenState };
