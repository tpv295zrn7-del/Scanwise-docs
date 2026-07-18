/**
 * useNotification Hook
 * 
 * Provides notification/toast functionality across app
 * Dispatches notifications through Redux for global management
 */

import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { addNotification, removeNotification } from '../redux/slices/appSlice';

export const useNotification = () => {
  const dispatch = useDispatch();

  const showNotification = useCallback(
    (message, type = 'info', duration = 3000) => {
      const notificationId = Date.now();

      dispatch(
        addNotification({
          id: notificationId,
          message,
          type, // 'success', 'error', 'warning', 'info'
          duration,
        })
      );

      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          dispatch(removeNotification(notificationId));
        }, duration);
      }

      return notificationId;
    },
    [dispatch]
  );

  const showSuccess = useCallback(
    (message, duration = 3000) => {
      return showNotification(message, 'success', duration);
    },
    [showNotification]
  );

  const showError = useCallback(
    (message, duration = 5000) => {
      return showNotification(message, 'error', duration);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message, duration = 4000) => {
      return showNotification(message, 'warning', duration);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message, duration = 3000) => {
      return showNotification(message, 'info', duration);
    },
    [showNotification]
  );

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useNotification;