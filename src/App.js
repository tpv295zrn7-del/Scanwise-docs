const { createAppStore } = require('./redux/store');
const RootNavigator = require('./navigation/RootNavigator');

const bootstrapApp = () => ({
  store: createAppStore(),
  navigator: RootNavigator
});

module.exports = { bootstrapApp };
