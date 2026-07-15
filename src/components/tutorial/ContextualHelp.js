import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../../theme/theme';

/**
 * ContextualHelp Component
 * 
 * Smart help system that shows contextual tooltips
 * Only appears on first visit to a screen
 * Can be dismissed or expanded for more info
 */

const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tooltipText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  learnMore: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnMoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dismiss: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  helpIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  helpIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

export const ContextualHelp = ({
  text,
  onLearnMore,
  onDismiss,
  showIcon = true,
  dismissible = true,
  autoHide = false,
  autoHideDelay = 5000,
}) => {
  const [visible, setVisible] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.tooltip, { opacity: fadeAnim }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={[styles.tooltipText, { flex: 1 }]}>{text}</Text>
        {showIcon && (
          <View style={styles.helpIcon}>
            <Text style={styles.helpIconText}>?</Text>
          </View>
        )}
      </View>

      {onLearnMore && (
        <TouchableOpacity
          style={styles.learnMore}
          onPress={() => {
            if (onLearnMore) onLearnMore();
          }}
        >
          <Text style={styles.learnMoreText}>Learn more →</Text>
        </TouchableOpacity>
      )}

      {dismissible && (
        <TouchableOpacity onPress={handleDismiss}>
          <Text style={styles.dismiss}>Dismiss</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default ContextualHelp;
