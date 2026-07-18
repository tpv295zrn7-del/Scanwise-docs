/**
 * useNotification Hook - ENHANCED
 * 
 * Provides notification/toast functionality across app with:
 * - Redux integration for global state
 * - Auto-dismiss with configurable duration
 * - Manual dismiss capability
 * - Convenience methods for each notification type
 * - Persistent notification option (no auto-dismiss)
 */

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useRef } from 'react';
import {
  addNotification,
  removeNotification,
  dismissNotification,
  selectNotifications,
} from '../redux/slices/appSlice';

export const useNotification = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const timerRefs = useRef({});

  /**
   * Show notification with auto-dismiss
   * 
   * @param {string} message - Notification message
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration - Auto-dismiss delay in ms (0 = persistent)
   * @param {boolean} dismissible - Allow user to manually dismiss
   * @returns {number} notificationId for manual control
   */
  const showNotification = useCallback(
    (message, type = 'info', duration = 3000, dismissible = true) => {
      const notificationId = Date.now();

      dispatch(
        addNotification({
          id: notificationId,
          message,
          type,
          duration,
          dismissible,
        })
      );

      // Auto-dismiss after duration (if duration > 0)
      if (duration > 0) {
        // Clear any existing timer for this ID
        if (timerRefs.current[notificationId]) {
          clearTimeout(timerRefs.current[notificationId]);
        }

        timerRefs.current[notificationId] = setTimeout(() => {
          dispatch(removeNotification(notificationId));
          delete timerRefs.current[notificationId];
        }, duration);
      }

      return notificationId;
    },
    [dispatch]
  );

  /**
   * Manually dismiss a notification
   */
  const dismissNotificationManually = useCallback(
    (notificationId) => {
      dispatch(removeNotification(notificationId));
      if (timerRefs.current[notificationId]) {
        clearTimeout(timerRefs.current[notificationId]);
        delete timerRefs.current[notificationId];
      }
    },
    [dispatch]
  );

  /**
   * Show success notification (green, auto-dismiss 3s)
   */
  const showSuccess = useCallback(
    (message, duration = 3000, dismissible = true) => {
      return showNotification(message, 'success', duration, dismissible);
    },
    [showNotification]
  );

  /**
   * Show error notification (red, auto-dismiss 5s)
   */
  const showError = useCallback(
    (message, duration = 5000, dismissible = true) => {
      return showNotification(message, 'error', duration, dismissible);
    },
    [showNotification]
  );

  /**
   * Show warning notification (amber, auto-dismiss 4s)
   */
  const showWarning = useCallback(
    (message, duration = 4000, dismissible = true) => {
      return showNotification(message, 'warning', duration, dismissible);
    },
    [showNotification]
  );

  /**
   * Show info notification (blue, auto-dismiss 3s)
   */
  const showInfo = useCallback(
    (message, duration = 3000, dismissible = true) => {
      return showNotification(message, 'info', duration, dismissible);
    },
    [showNotification]
  );

  /**
   * Show persistent notification (no auto-dismiss)
   * User must manually dismiss or call dismissNotificationManually()
   */
  const showPersistent = useCallback(
    (message, type = 'info', dismissible = true) => {
      return showNotification(message, type, 0, dismissible);
    },
    [showNotification]
  );

  /**
   * Cleanup timers on unmount
   */
  const clearAllNotifications = useCallback(() => {
    Object.values(timerRefs.current).forEach(clearTimeout);
    timerRefs.current = {};
  }, []);

  return {
    // Core methods
    showNotification,
    dismissNotificationManually,
    clearAllNotifications,

    // Convenience methods by type
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPersistent,

    // Current notifications (for UI)
    notifications,
    notificationCount: notifications.length,
  };
};

export default useNotification;