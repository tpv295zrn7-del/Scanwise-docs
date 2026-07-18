/**
 * LoadingSpinner infrastructure controller.
 *
 * A pure controller that supplies full-screen loading overlay state,
 * timeout fail-safe behavior, and accessibility metadata.
 */

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_LOADING_MESSAGE = 'Loading...';
const OFFLINE_MESSAGE = 'Offline mode';

/**
 * @param {Object} options
 * @param {(state: unknown) => boolean} [options.selectIsLoading]
 * @param {(error: Error) => void} [options.onTimeout]
 * @param {number} [options.timeoutMs]
 * @returns {{
 *   evaluate: (state: unknown, networkConnected?: boolean, loadingMessage?: string) => Record<string, unknown>,
 *   begin: () => void,
 *   end: () => void,
 *   isTimedOut: () => boolean
 * }}
 */
const createLoadingSpinner = (options = {}) => {
  const selectIsLoading = options.selectIsLoading || ((state) => Boolean(state?.app?.isLoading));
  const onTimeout = options.onTimeout || (() => {});
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;

  let loadingSince = null;
  let timedOut = false;

  return {
    evaluate(state, networkConnected = true, loadingMessage = DEFAULT_LOADING_MESSAGE) {
      const isLoading = Boolean(selectIsLoading(state));

      if (isLoading && loadingSince === null) {
        loadingSince = Date.now();
        timedOut = false;
      }

      if (!isLoading) {
        loadingSince = null;
        timedOut = false;
      }

      if (isLoading && loadingSince !== null && Date.now() - loadingSince > timeoutMs && !timedOut) {
        timedOut = true;
        onTimeout(new Error('Loading timeout exceeded'));
      }

      return {
        visible: isLoading,
        message: loadingMessage || DEFAULT_LOADING_MESSAGE,
        isBlocking: true,
        spinnerType: 'native',
        offlineIndicator: networkConnected ? null : OFFLINE_MESSAGE,
        hasTimedOut: timedOut,
        accessibilityLabel: 'Loading screen',
        accessibilityRole: 'progressbar',
        highContrast: true,
      };
    },
    begin() {
      loadingSince = Date.now();
      timedOut = false;
    },
    end() {
      loadingSince = null;
      timedOut = false;
    },
    isTimedOut() {
      return timedOut;
    },
  };
};

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_LOADING_MESSAGE,
  OFFLINE_MESSAGE,
  createLoadingSpinner,
};
