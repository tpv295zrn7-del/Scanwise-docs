/**
 * RootNavigator infrastructure orchestration.
 *
 * This module stays framework-agnostic on purpose so it can be tested in Node
 * while still mirroring React Navigation concerns used by mobile runtime.
 */

const ROUTES = Object.freeze({
  tabs: Object.freeze({
    MAIN: 'Main',
    SCAN: 'Scan',
    COMMUNITY: 'Community',
    PROFILE: 'Profile',
  }),
  mainStack: Object.freeze(['HomeScreen', 'ProductDetail', 'HealthProfile', 'Settings']),
  scanStack: Object.freeze(['ScanCamera', 'ScanResult', 'ProductDetail']),
  communityStack: Object.freeze(['CommunityFeed', 'IncidentDetail']),
  profileStack: Object.freeze(['UserProfile', 'HealthMetrics', 'Allergies', 'Settings']),
  authStack: Object.freeze(['OnboardingScreen', 'LoginScreen', 'SignupScreen']),
});

const LINKING_PREFIX = 'scanwise://';
const LOADING_SPINNER_ROUTE = 'NavigationLoading';
const OFFLINE_BANNER_MESSAGE = 'You are offline. Some features may be unavailable.';
const SCREEN_VIEW_EVENT = 'screen_view';
const PROTECTED_ROUTES = new Set([
  ...ROUTES.mainStack,
  ...ROUTES.scanStack,
  ...ROUTES.communityStack,
  ...ROUTES.profileStack,
]);

/**
 * @param {unknown} state
 * @returns {string | null}
 */
const defaultSelectCurrentRoute = (state) => state?.app?.currentRoute ?? null;

/**
 * @param {string} url
 * @returns {{name: string, params: Record<string, string>} | null}
 */
const parseDeepLink = (url) => {
  if (typeof url !== 'string' || !url.startsWith(LINKING_PREFIX)) {
    return null;
  }

  const path = url.slice(LINKING_PREFIX.length);
  const segments = path.split('/').filter(Boolean);
  const [resource, id] = segments;

  if (resource === 'product' && id) {
    return { name: 'ProductDetail', params: { productId: id } };
  }

  if (resource === 'scan') {
    return { name: 'ScanCamera', params: {} };
  }

  if (resource === 'community' && id) {
    return { name: 'IncidentDetail', params: { incidentId: id } };
  }

  return null;
};

/**
 * @param {string} routeName
 * @param {{isAuthenticated?: boolean}} context
 * @returns {{allowed: boolean, redirectTo?: string}}
 */
const guardRoute = (routeName, context = {}) => {
  const isProtectedRoute = PROTECTED_ROUTES.has(routeName);
  if (!isProtectedRoute) {
    return { allowed: true };
  }

  if (context.isAuthenticated) {
    return { allowed: true };
  }

  return { allowed: false, redirectTo: 'LoginScreen' };
};

/**
 * @param {Object} options
 * @param {(state: unknown) => string | null} [options.selectCurrentRoute]
 * @param {{logEvent?: Function}} [options.analytics]
 * @param {(error: Error, details: Record<string, unknown>) => void} [options.onNavigationError]
 * @returns {{
 *   root: string[],
 *   tabs: Record<string, string[]>,
 *   linking: {prefixes: string[], config: Record<string, unknown>},
 *   selectCurrentRoute: (state: unknown) => string | null,
 *   resolveDeepLink: (url: string, context?: {isAuthenticated?: boolean}) => {name: string, params: Record<string, string>} | null,
 *   trackScreenView: (routeName: string) => void,
 *   handleTransitionState: (isLoading: boolean) => {isLoading: boolean, overlayRoute: string | null},
 *   handleBackPress: (history: string[]) => {shouldExitApp: boolean, nextRoute: string | null},
 *   getOfflineBanner: (isConnected: boolean) => string | null,
 *   runWithBoundary: <T>(cb: () => T) => T | null
 * }}
 */
const createRootNavigator = (options = {}) => {
  const selectCurrentRoute = options.selectCurrentRoute || defaultSelectCurrentRoute;
  const analytics = options.analytics || {};
  const onNavigationError = options.onNavigationError || (() => {});

  return {
    root: ['AuthNavigator', 'MainTabsNavigator'],
    tabs: {
      [ROUTES.tabs.MAIN]: ROUTES.mainStack,
      [ROUTES.tabs.SCAN]: ROUTES.scanStack,
      [ROUTES.tabs.COMMUNITY]: ROUTES.communityStack,
      [ROUTES.tabs.PROFILE]: ROUTES.profileStack,
    },
    linking: {
      prefixes: [LINKING_PREFIX],
      config: {
        ProductDetail: 'product/:productId',
        ScanCamera: 'scan',
        IncidentDetail: 'community/:incidentId',
      },
    },
    selectCurrentRoute,
    resolveDeepLink(url, context = {}) {
      const resolved = parseDeepLink(url);
      if (!resolved) {
        return null;
      }

      const guard = guardRoute(resolved.name, context);
      if (!guard.allowed) {
        return { name: guard.redirectTo, params: {} };
      }

      return resolved;
    },
    trackScreenView(routeName) {
      if (!routeName || typeof analytics.logEvent !== 'function') {
        return;
      }

      analytics.logEvent(SCREEN_VIEW_EVENT, { screen_name: routeName });
    },
    handleTransitionState(isLoading) {
      return {
        isLoading: Boolean(isLoading),
        overlayRoute: isLoading ? LOADING_SPINNER_ROUTE : null,
      };
    },
    handleBackPress(history) {
      if (!Array.isArray(history) || history.length <= 1) {
        return { shouldExitApp: true, nextRoute: null };
      }

      return {
        shouldExitApp: false,
        nextRoute: history[history.length - 2],
      };
    },
    getOfflineBanner(isConnected) {
      return isConnected ? null : OFFLINE_BANNER_MESSAGE;
    },
    runWithBoundary(cb) {
      try {
        return cb();
      } catch (error) {
        onNavigationError(error, { scope: 'RootNavigator' });
        return null;
      }
    },
  };
};

module.exports = {
  ROUTES,
  LINKING_PREFIX,
  OFFLINE_BANNER_MESSAGE,
  parseDeepLink,
  guardRoute,
  createRootNavigator,
  root: ['AuthNavigator', 'MainTabsNavigator'],
};
