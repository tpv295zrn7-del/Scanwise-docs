import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import CheckBox from '@react-native-community/checkbox';
import { theme } from '../../theme/theme';
import { useNotification } from '../../hooks/useNotification';

/**
 * OnboardingScreen
 * 
 * Complete guided onboarding experience
 * - Welcome & connection
 * - Health profile setup
 * - Personalization
 * - First scan tutorial
 * - Celebration & encouragement
 */

const HEALTH_CONDITIONS = [
  { id: 'diabetes_type1', label: '🩺 Manage Type 1 Diabetes', icon: '🩺' },
  { id: 'diabetes_type2', label: '🩺 Manage Type 2 Diabetes', icon: '🩺' },
  { id: 'prediabetes', label: '🩺 Prediabetes', icon: '🩺' },
  { id: 'heart_disease', label: '❤️ Keep Heart Healthy', icon: '❤️' },
  { id: 'hypertension', label: '❤️ Manage Blood Pressure', icon: '❤️' },
  { id: 'allergies', label: '🚫 Manage Food Allergies', icon: '🚫' },
  { id: 'weight_management', label: '⚖️ Lose Weight', icon: '⚖️' },
  { id: 'celiac', label: '🌾 Celiac/Gluten-Free', icon: '🌾' },
  { id: 'ibs', label: '🔄 Manage IBS', icon: '🔄' },
  { id: 'general_health', label: '💪 Get Healthier Overall', icon: '💪' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  conditionGrid: {
    marginBottom: theme.spacing.lg,
  },
  conditionOption: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  conditionEmoji: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  button: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: theme.colors.background,
  },
  secondaryButtonText: {
    color: theme.colors.text,
  },
  tip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  skipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

export const OnboardingScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const showNotification = useNotification();

  // Onboarding steps
  const [step, setStep] = useState(1); // 1-5
  const [loading, setLoading] = useState(false);

  // Step 1: Welcome (auto-progress)
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [diabetesType, setDiabetesType] = useState('');
  const [a1cGoal, setA1cGoal] = useState('');
  const [additionalConditions, setAdditionalConditions] = useState([]);

  const progressPercentage = (step / 5) * 100;

  const handleConditionToggle = (conditionId) => {
    if (selectedConditions.includes(conditionId)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== conditionId));
    } else {
      setSelectedConditions([...selectedConditions, conditionId]);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (step === 2 && selectedConditions.length === 0) {
      showNotification('Please select at least one health goal', 'warning');
      return;
    }

    if (step === 3 && selectedConditions.includes('diabetes_type1') && !diabetesType) {
      showNotification('Please specify your diabetes type', 'warning');
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // TODO: Save profile to Redux/backend
      const profileData = {
        selectedConditions,
        diabetesType,
        a1cGoal,
        additionalConditions,
      };
      console.log('Profile created:', profileData);
      showNotification('Welcome to ScanWise! Ready to scan?', 'success');
      navigation.replace('MainApp');
    } catch (error) {
      showNotification('Error completing setup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can set up your profile anytime in Settings.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => navigation.replace('MainApp'),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, styles.safeArea]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>

        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <View style={styles.header}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Welcome to ScanWise!</Text>
            <Text style={styles.subtitle}>
              Your personal health advisor every time you shop.
            </Text>
            <Text style={styles.subtitle}>
              Let's get to know you so we can give you the best advice.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep(2)}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Let's Get Started! →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: HEALTH CONDITIONS */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>What's Your Health Goal?</Text>
            <Text style={styles.subtitle}>
              Select what's most important for you right now. You can change this anytime.
            </Text>

            <View style={styles.conditionGrid}>
              {HEALTH_CONDITIONS.map((condition) => (
                <TouchableOpacity
                  key={condition.id}
                  style={[
                    styles.conditionOption,
                    selectedConditions.includes(condition.id) &&
                      styles.conditionOptionSelected,
                  ]}
                  onPress={() => handleConditionToggle(condition.id)}
                >
                  <Text style={styles.conditionEmoji}>{condition.icon}</Text>
                  <Text style={styles.conditionLabel}>{condition.label}</Text>
                  <CheckBox
                    value={selectedConditions.includes(condition.id)}
                    onValueChange={() => handleConditionToggle(condition.id)}
                    tintColors={{
                      true: theme.colors.primary,
                      false: theme.colors.border,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.button}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Next →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: DIABETES DETAILS (if diabetes selected) */}
        {step === 3 && selectedConditions.some((c) => c.includes('diabetes')) && (
          <View>
            <Text style={styles.title}>Let's Personalize for Diabetes</Text>
            <Text style={styles.subtitle}>
              A few quick questions so we can give you the best advice.
            </Text>

            <Text style={styles.label}>Do you have Type 1 or Type 2?</Text>
            <View style={{ marginBottom: theme.spacing.lg }}>
              <TouchableOpacity
                style={[
                  styles.conditionOption,
                  diabetesType === 'type1' && styles.conditionOptionSelected,
                ]}
                onPress={() => setDiabetesType('type1')}
              >
                <Text style={styles.conditionLabel}>Type 1 Diabetes</Text>
                <CheckBox
                  value={diabetesType === 'type1'}
                  onValueChange={() => setDiabetesType('type1')}
                  tintColors={{
                    true: theme.colors.primary,
                    false: theme.colors.border,
                  }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.conditionOption,
                  diabetesType === 'type2' && styles.conditionOptionSelected,
                ]}
                onPress={() => setDiabetesType('type2')}
              >
                <Text style={styles.conditionLabel}>Type 2 Diabetes</Text>
                <CheckBox
                  value={diabetesType === 'type2'}
                  onValueChange={() => setDiabetesType('type2')}
                  tintColors={{
                    true: theme.colors.primary,
                    false: theme.colors.border,
                  }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.conditionOption,
                  diabetesType === 'unsure' && styles.conditionOptionSelected,
                ]}
                onPress={() => setDiabetesType('unsure')}
              >
                <Text style={styles.conditionLabel}>Not Sure</Text>
                <CheckBox
                  value={diabetesType === 'unsure'}
                  onValueChange={() => setDiabetesType('unsure')}
                  tintColors={{
                    true: theme.colors.primary,
                    false: theme.colors.border,
                  }}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>What's your A1C goal?</Text>
            <TouchableOpacity
              style={styles.tip}
              onPress={() =>
                Alert.alert(
                  "What's A1C?",
                  "A1C measures your average blood sugar over 3 months. Most people aim for under 7. Ask your doctor what's right for you!"
                )
              }
            >
              <Text style={styles.tipText}>🔍 What's A1C? Tap to learn</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Enter your A1C goal (e.g., 7.0) or leave blank"
              value={a1cGoal}
              onChangeText={setA1cGoal}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { flex: 1 }]}
                onPress={handlePrevious}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1 }]}
                onPress={handleNext}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: ALLERGIES */}
        {step === 4 && (
          <View>
            <Text style={styles.title}>Any Other Conditions?</Text>
            <Text style={styles.subtitle}>
              Help us give you complete protection.
            </Text>

            <View style={styles.conditionGrid}>
              {[
                { id: 'allergies', label: '🚫 Food Allergies', icon: '🚫' },
                { id: 'celiac', label: '🌾 Celiac/Gluten', icon: '🌾' },
                { id: 'ibs', label: '🔄 IBS/Digestive', icon: '🔄' },
                { id: 'none', label: '✓ None', icon: '✓' },
              ].map((condition) => (
                <TouchableOpacity
                  key={condition.id}
                  style={[
                    styles.conditionOption,
                    additionalConditions.includes(condition.id) &&
                      styles.conditionOptionSelected,
                  ]}
                  onPress={() => {
                    if (additionalConditions.includes(condition.id)) {
                      setAdditionalConditions(
                        additionalConditions.filter((c) => c !== condition.id)
                      );
                    } else {
                      setAdditionalConditions([...additionalConditions, condition.id]);
                    }
                  }}
                >
                  <Text style={styles.conditionEmoji}>{condition.icon}</Text>
                  <Text style={styles.conditionLabel}>{condition.label}</Text>
                  <CheckBox
                    value={additionalConditions.includes(condition.id)}
                    onValueChange={() => {}}
                    tintColors={{
                      true: theme.colors.primary,
                      false: theme.colors.border,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { flex: 1 }]}
                onPress={handlePrevious}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1 }]}
                onPress={handleNext}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 5: READY TO SCAN */}
        {step === 5 && (
          <View style={styles.header}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>
              Now comes the fun part. Let's scan your first product together.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Start Your First Scan →
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
