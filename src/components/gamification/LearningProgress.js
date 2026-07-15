import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

/**
 * LearningProgress Component
 * 
 * Displays user's learning journey and progress
 * Shows completed steps and next suggested actions
 */

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.sm,
  },
  stepCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  stepPending: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  stepIcon: {
    fontSize: 18,
    marginRight: theme.spacing.md,
    width: 24,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  stepCompleteText: {
    color: '#10B981',
    fontWeight: '600',
  },
  stepPendingText: {
    color: theme.colors.textSecondary,
  },
  suggestion: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    padding: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  suggestionText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  suggestionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export const LearningProgress = ({ steps = [], nextSuggestion = null }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📚 Your Learning Journey</Text>

      {steps.map((step, index) => (
        <View
          key={index}
          style={[
            styles.step,
            step.completed ? styles.stepCompleted : styles.stepPending,
          ]}
        >
          <Text style={styles.stepIcon}>
            {step.completed ? '✅' : '⏳'}
          </Text>
          <Text
            style={[
              styles.stepText,
              step.completed ? styles.stepCompleteText : styles.stepPendingText,
            ]}
          >
            {step.title}
          </Text>
        </View>
      ))}

      {nextSuggestion && (
        <View style={styles.suggestion}>
          <Text style={styles.suggestionText}>💡 Next Step</Text>
          <Text style={styles.suggestionDescription}>
            {nextSuggestion}
          </Text>
        </View>
      )}
    </View>
  );
};

export default LearningProgress;
