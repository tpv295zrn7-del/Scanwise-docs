import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/theme';

/**
 * LearningBadge Component
 * 
 * Displays earned badges for learning milestones
 * - New Scanner (first scan)
 * - Smart Shopper (3 scans)
 * - Community Helper (first share)
 * - Health Champion (50 scans)
 */

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  badgeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  badgeEmoji: {
    fontSize: 48,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

const BADGES = {
  new_scanner: {
    emoji: '🎯',
    name: 'New Scanner',
    description: 'Completed your first scan',
    color: '#3B82F6',
  },
  smart_shopper: {
    emoji: '🛒',
    name: 'Smart Shopper',
    description: 'Made 3 informed product choices',
    color: '#10B981',
  },
  community_helper: {
    emoji: '🤝',
    name: 'Community Helper',
    description: 'Shared your first experience',
    color: '#F59E0B',
  },
  health_champion: {
    emoji: '👑',
    name: 'Health Champion',
    description: '50 informed scans! You\'re a pro',
    color: '#8B5CF6',
  },
};

export const LearningBadge = ({ badgeId, animated = false }) => {
  const badge = BADGES[badgeId];
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated, scaleAnim]);

  if (!badge) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        animated && {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.badgeCircle, { backgroundColor: badge.color }]}>
        <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
      </View>
      <Text style={styles.badgeName}>{badge.name}</Text>
      <Text style={styles.badgeDescription}>{badge.description}</Text>
    </Animated.View>
  );
};

export default LearningBadge;
