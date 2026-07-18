/**
 * ErrorBoundary infrastructure controller.
 *
 * Designed to mirror React ErrorBoundary behavior while remaining runtime-light
 * for unit testing and platform-independent orchestration.
 */

const GENERIC_PRODUCTION_MESSAGE =
  'Something went wrong. Please try again. If this keeps happening, restart the app.';
const DEVELOPMENT_MESSAGE = 'A rendering error occurred. Review stack trace below.';
const MAX_RECOVERY_ATTEMPTS = 3;

/**
 * @param {unknown} snapshot
 * @returns {Record<string, unknown> | null}
 */
const sanitizeReduxSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(snapshot));
  } catch (error) {
    console.error('[ErrorBoundary] Failed to serialize redux snapshot', error);
    return { serializationError: true };
  }
};

/**
 * @param {Object} options
 * @param {'development'|'production'} [options.environment]
 * @param {{captureException?: Function}} [options.monitoring]
 * @param {(context?: Record<string, unknown>) => void} [options.resetAppState]
 * @param {() => unknown} [options.getReduxState]
 * @returns {{
 *   getState: () => Record<string, unknown>,
 *   captureError: (error: Error, errorInfo?: Record<string, unknown>) => Record<string, unknown>,
 *   retry: (callback?: Function) => {recovered: boolean, reason?: string},
 *   dismiss: () => void,
 *   renderPayload: () => Record<string, unknown>
 * }}
 */
const createErrorBoundary = (options = {}) => {
  const environment = options.environment || process.env.NODE_ENV || 'development';
  const monitoring = options.monitoring || {};
  const resetAppState = options.resetAppState || (() => {});
  const getReduxState = options.getReduxState || (() => null);

  const state = {
    hasError: false,
    error: null,
    errorInfo: null,
    reduxSnapshot: null,
    recoveryAttempts: 0,
    lastCapturedAt: null,
  };

  return {
    getState() {
      return { ...state };
    },
    captureError(error, errorInfo = null) {
      state.hasError = true;
      state.error = error instanceof Error ? error : new Error(String(error));
      state.errorInfo = errorInfo;
      state.reduxSnapshot = sanitizeReduxSnapshot(getReduxState());
      state.lastCapturedAt = new Date().toISOString();

      console.error('[ErrorBoundary] Caught rendering error', {
        message: state.error.message,
        errorInfo,
      });

      if (typeof monitoring.captureException === 'function') {
        monitoring.captureException(state.error, {
          extra: {
            errorInfo,
            reduxSnapshot: state.reduxSnapshot,
            timestamp: state.lastCapturedAt,
          },
        });
      }

      return this.renderPayload();
    },
    retry(callback = null) {
      if (!state.hasError) {
        return { recovered: true };
      }

      state.recoveryAttempts += 1;
      if (state.recoveryAttempts > MAX_RECOVERY_ATTEMPTS) {
        return { recovered: false, reason: 'max_retries_exceeded' };
      }

      try {
        if (typeof callback === 'function') {
          callback();
        }
        state.hasError = false;
        state.error = null;
        state.errorInfo = null;
        return { recovered: true };
      } catch (error) {
        state.error = error;
        return { recovered: false, reason: 'retry_failed' };
      }
    },
    dismiss() {
      resetAppState({ reason: 'error_boundary_dismissed' });
      state.hasError = false;
      state.error = null;
      state.errorInfo = null;
      state.reduxSnapshot = null;
      state.recoveryAttempts = 0;
    },
    renderPayload() {
      const isDevelopment = environment === 'development';
      return {
        hasError: state.hasError,
        title: 'Oops! We hit a problem',
        message: isDevelopment ? DEVELOPMENT_MESSAGE : GENERIC_PRODUCTION_MESSAGE,
        canRetry: state.recoveryAttempts < MAX_RECOVERY_ATTEMPTS,
        retryLabel: 'Try again',
        dismissLabel: 'Reset app',
        stack: isDevelopment ? state.error?.stack || null : null,
        accessibilityLabel: 'Application error message',
      };
    },
  };
};

module.exports = {
  GENERIC_PRODUCTION_MESSAGE,
  DEVELOPMENT_MESSAGE,
  MAX_RECOVERY_ATTEMPTS,
  sanitizeReduxSnapshot,
  createErrorBoundary,
};
