/**
 * Application entry orchestration.
 *
 * This module wires infrastructure concerns (redux, persist, navigation,
 * error handling, loading overlay, network listeners, deep linking).
 */

const { createRootNavigator } = require('./src/navigation/RootNavigator');
const { createErrorBoundary } = require('./src/components/ErrorBoundary');
const { createLoadingSpinner } = require('./src/components/LoadingSpinner');

const STARTUP_PHASES = Object.freeze({
  SPLASH: 'splash',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
});

/**
 * @param {Object} options
 * @param {unknown} [options.store]
 * @param {unknown} [options.persistor]
 * @param {(dispatch: Function, getState: Function) => Promise<void>} [options.initialize]
 * @param {{subscribe?: Function, getCurrentState?: Function}} [options.network]
 * @param {{trackEvent?: Function}} [options.analytics]
 * @param {{captureException?: Function}} [options.errorMonitoring]
 * @returns {{
 *   bootstrap: (startupUrl?: string) => Promise<Record<string, unknown>>,
 *   getRenderTree: () => Record<string, unknown>,
 *   getState: () => Record<string, unknown>
 * }}
 */
const createScanwiseApp = (options = {}) => {
  const store = options.store || null;
  const persistor = options.persistor || null;
  const analytics = options.analytics || {};
  const network = options.network || {};

  const boundary = createErrorBoundary({
    environment: process.env.NODE_ENV || 'development',
    monitoring: options.errorMonitoring,
    getReduxState: () => (store && typeof store.getState === 'function' ? store.getState() : null),
    resetAppState: () => {
      if (store && typeof store.dispatch === 'function') {
        store.dispatch({ type: 'app/logout' });
      }
    },
  });

  const spinner = createLoadingSpinner({
    selectIsLoading: (state) => Boolean(state?.app?.isLoading),
    onTimeout: (error) => {
      console.error('[App] Loading timeout', error.message);
      if (typeof analytics.trackEvent === 'function') {
        analytics.trackEvent('loading_timeout');
      }
    },
  });

  const navigator = createRootNavigator({
    analytics: {
      logEvent: (name, payload) => {
        if (typeof analytics.trackEvent === 'function') {
          analytics.trackEvent(name, payload);
        }
      },
    },
    onNavigationError: (error, details) => {
      boundary.captureError(error, details);
    },
  });

  const state = {
    startupPhase: STARTUP_PHASES.SPLASH,
    isNetworkConnected: true,
    startupRoute: 'OnboardingScreen',
    initialDeepLink: null,
  };

  if (typeof network.subscribe === 'function') {
    network.subscribe((isConnected) => {
      state.isNetworkConnected = Boolean(isConnected);
      if (store && typeof store.dispatch === 'function') {
        store.dispatch({ type: 'app/setNetworkConnected', payload: Boolean(isConnected) });
      }
    });
  } else if (typeof network.getCurrentState === 'function') {
    state.isNetworkConnected = Boolean(network.getCurrentState());
  }

  const bootstrap = async (startupUrl = null) => {
    state.startupPhase = STARTUP_PHASES.INITIALIZING;

    try {
      if (persistor && typeof persistor.flush === 'function') {
        await persistor.flush();
      }

      if (typeof options.initialize === 'function' && store) {
        await options.initialize(store.dispatch, store.getState);
      }

      if (startupUrl) {
        const deepLinkRoute = navigator.resolveDeepLink(startupUrl, {
          isAuthenticated: Boolean(store?.getState?.()?.app?.isAuthenticated),
        });

        if (deepLinkRoute) {
          state.initialDeepLink = deepLinkRoute;
          state.startupRoute = deepLinkRoute.name;
        }
      }

      state.startupPhase = STARTUP_PHASES.READY;

      if (typeof analytics.trackEvent === 'function') {
        analytics.trackEvent('app_bootstrapped', {
          startupRoute: state.startupRoute,
        });
      }

      return { ...state };
    } catch (error) {
      state.startupPhase = STARTUP_PHASES.ERROR;
      boundary.captureError(error, { stage: 'bootstrap' });
      throw error;
    }
  };

  const getRenderTree = () => {
    const reduxState = store && typeof store.getState === 'function' ? store.getState() : {};
    return {
      providers: ['ReduxProvider', 'PersistGate', 'ThemeProvider', 'NotificationProvider'],
      startupPhase: state.startupPhase,
      boundary: boundary.renderPayload(),
      loading: spinner.evaluate(reduxState, state.isNetworkConnected),
      navigator,
      offlineBanner: navigator.getOfflineBanner(state.isNetworkConnected),
      startupRoute: state.startupRoute,
    };
  };

  const getState = () => ({ ...state });

  return {
    bootstrap,
    getRenderTree,
    getState,
  };
};

module.exports = {
  STARTUP_PHASES,
  createScanwiseApp,
};
