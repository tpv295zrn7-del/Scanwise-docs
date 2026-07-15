import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { theme } from '../../theme/theme';

/**
 * TutorialOverlay Component
 * 
 * Contextual, non-intrusive tutorial system
 * Shows helpful guidance at the right moment without being annoying
 */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  tutorialCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.spacing.lg,
    borderTopRightRadius: theme.spacing.lg,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  content: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  highlight: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stepContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  stepText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: theme.colors.background,
  },
  secondaryButtonText: {
    color: theme.colors.text,
  },
  dismissLink: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  celebration: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
});

export const TutorialOverlay = ({
  visible,
  title,
  content,
  steps,
  onDismiss,
  onPrimaryAction,
  primaryButtonText = "Got it!",
  secondaryButtonText = "Learn more",
  showDismiss = true,
  celebrationEmoji = null,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.tutorialCard}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {celebrationEmoji && (
            <Text style={styles.celebration}>{celebrationEmoji}</Text>
          )}

          <Text style={styles.header}>{title}</Text>

          {content && <Text style={styles.content}>{content}</Text>}

          {steps && steps.length > 0 && (
            <>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepContainer}>
                  <Text style={styles.stepNumber}>Step {index + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onPrimaryAction || onDismiss}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                {primaryButtonText}
              </Text>
            </TouchableOpacity>

            {secondaryButtonText && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onDismiss}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showDismiss && (
            <TouchableOpacity onPress={onDismiss}>
              <Text style={styles.dismissLink}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

export default TutorialOverlay;
