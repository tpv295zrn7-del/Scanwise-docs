import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import CheckBox from '@react-native-community/checkbox';
import { theme } from '../../theme/theme';
import { submitIncidentReport } from '../../redux/thunks/incidentThunks';
import { useNotification } from '../../hooks/useNotification';

/**
 * IncidentReportScreen
 * 
 * Multi-step incident reporting flow with:
 * - HIPAA-compliant consent disclosure
 * - Medical data collection (allergen, product, severity)
 * - Photo documentation (up to 5 images with timestamp + location)
 * - User narrative (symptoms, timeline, treatment)
 * - Medical professional verification
 * - Audit trail logging
 */

const ALLERGEN_OPTIONS = [
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Milk',
  'Eggs',
  'Fish',
  'Wheat',
  'Soy',
  'Sesame',
  'Sulfites',
  'Mustard',
  'Celery',
  'Other (specify)',
];

const SEVERITY_OPTIONS = [
  { label: 'Safe - No reaction', value: 'safe' },
  { label: 'Minor Reaction - No medical care needed', value: 'minor' },
  { label: 'Serious Reaction - Went to ER', value: 'serious' },
  { label: 'Life-Threatening - Needed ambulance/hospital', value: 'life_threatening' },
];

const EXPERIENCE_OPTIONS = [
  { label: 'First exposure to this allergen', value: 'first_exposure' },
  { label: 'Previously had reaction from this product', value: 'prior_experience' },
  { label: 'Reactions are worsening over time', value: 'worsening_pattern' },
];

const SYMPTOM_OPTIONS = [
  'Hives',
  'Rash',
  'Swelling (lips, tongue, throat)',
  'Throat tightness',
  'Difficulty breathing',
  'Itching',
  'Nausea',
  'Vomiting',
  'Abdominal pain',
  'Diarrhea',
  'Dizziness',
  'Other',
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  stepContainer: {
    marginBottom: theme.spacing.lg,
  },
  stepHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
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
  dropdown: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  dropdownText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  optionLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  checkboxContainer: {
    marginBottom: theme.spacing.md,
  },
  photoContainer: {
    marginBottom: theme.spacing.md,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
  narrativeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    fontSize: 14,
    color: theme.colors.text,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'right',
  },
  consentCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  consentHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  consentText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  consentCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  consentCheckboxLabel: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  requiredBadge: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  optionalBadge: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  legalLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
    fontSize: 13,
    marginBottom: theme.spacing.sm,
  },
  consentFooter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
});

export const IncidentReportScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const showNotification = useNotification();
  const { loading } = useSelector((state) => state.incidents);
  const { user } = useSelector((state) => state.auth);

  // Step 0: HIPAA Consent
  const [consentStep, setConsentStep] = useState(true);
  const [consentChecks, setConsentChecks] = useState({
    medicalTeamShare: false, // REQUIRED
    researchShare: false,
    databaseImprove: false, // REQUIRED
    brandShare: false,
  });

  // Step 1: Allergen Identification
  const [allergen, setAllergen] = useState('');
  const [allergenCustom, setAllergenCustom] = useState('');

  // Step 2: Product Identification
  const [barcode, setBarcode] = useState(route?.params?.barcode || '');
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');

  // Step 3: Safety Status
  const [severity, setSeverity] = useState('');

  // Step 4: Experience Type
  const [experienceType, setExperienceType] = useState('');

  // Step 5: Photo Capture
  const [photos, setPhotos] = useState([]); // Array of { uri, timestamp, location }

  // Step 6: Severity Details
  const [symptoms, setSymptoms] = useState([]);
  const [symptomOnsetTime, setSymptomOnsetTime] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [treatmentReceived, setTreatmentReceived] = useState('');

  // Step 7: User Narrative
  const [narrative, setNarrative] = useState('');

  // Step 8: Medical Consultation
  const [consultedDoctor, setConsultedDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorRecommendation, setDoctorRecommendation] = useState('');

  // ==================== HELPERS ====================

  /**
   * Validates HIPAA consent
   * Both medicalTeamShare and databaseImprove must be checked
   */
  const isConsentValid = () => {
    return consentChecks.medicalTeamShare && consentChecks.databaseImprove;
  };

  /**
   * Logs consent to audit trail (HIPAA requirement)
   */
  const logConsentAuditTrail = async () => {
    const auditData = {
      userId: user.id,
      timestamp: new Date().toISOString(),
      consentChoices: consentChecks,
      ipAddress: 'TBD', // Capture from backend
      deviceInfo: 'TBD', // Capture device details
    };
    // TODO: Send to backend API endpoint: POST /api/incidents/consent-audit-log
    console.log('Consent audit trail:', auditData);
  };

  /**
   * Handles HIPAA consent acceptance
   */
  const handleConsentAccept = async () => {
    if (!isConsentValid()) {
      Alert.alert(
        'Consent Required',
        'You must consent to medical team verification and database improvement to proceed.'
      );
      return;
    }
    await logConsentAuditTrail();
    setConsentStep(false);
  };

  /**
   * Launches camera to capture photo
   */
  const pickPhotoFromCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        includeExtra: true,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Camera Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets[0]) {
          const photo = {
            uri: response.assets[0].uri,
            timestamp: new Date().toISOString(),
            location: 'TBD', // TODO: Use geolocation service
            fileName: response.assets[0].fileName,
          };
          setPhotos([...photos, photo]);
          showNotification('Photo captured', 'success');
        }
      }
    );
  };

  /**
   * Launches image library to select photo
   */
  const pickPhotoFromLibrary = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        selectionLimit: 5 - photos.length, // Allow up to 5 total
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Gallery Error', response.errorMessage);
          return;
        }
        if (response.assets) {
          const newPhotos = response.assets.map((asset) => ({
            uri: asset.uri,
            timestamp: new Date().toISOString(),
            location: 'TBD',
            fileName: asset.fileName,
          }));
          setPhotos([...photos, ...newPhotos]);
          showNotification(
            `${newPhotos.length} photo(s) added`,
            'success'
          );
        }
      }
    );
  };

  /**
   * Remove photo from list
   */
  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  /**
   * Toggle symptom selection
   */
  const toggleSymptom = (symptom) => {
    if (symptoms.includes(symptom)) {
      setSymptoms(symptoms.filter((s) => s !== symptom));
    } else {
      setSymptoms([...symptoms, symptom]);
    }
  };

  /**
   * Handles life-threatening emergency
   */
  const handleEmergency = () => {
    Alert.alert(
      '🚨 EMERGENCY',
      'This is a life-threatening situation. Call 911 immediately or go to the nearest emergency room.',
      [
        {
          text: 'Call 911',
          onPress: () => {
            Linking.openURL('tel:911');
          },
        },
        {
          text: 'I need help',
          onPress: () => {
            // Could open emergency contact flow
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  /**
   * Validates all form fields
   */
  const validateForm = () => {
    if (!allergen || (allergen === 'Other (specify)' && !allergenCustom)) {
      showNotification('Please specify allergen', 'error');
      return false;
    }
    if (!barcode && !productName) {
      showNotification('Please provide product barcode or name', 'error');
      return false;
    }
    if (!severity) {
      showNotification('Please select severity level', 'error');
      return false;
    }
    if (!experienceType) {
      showNotification('Please select experience type', 'error');
      return false;
    }
    if (symptoms.length === 0) {
      showNotification('Please select at least one symptom', 'error');
      return false;
    }
    if (!narrative || narrative.length < 20) {
      showNotification('Please provide detailed description (min 20 characters)', 'error');
      return false;
    }
    return true;
  };

  /**
   * Submits incident report
   */
  const handleSubmitReport = async () => {
    if (!validateForm()) return;

    const incidentData = {
      allergen: allergen === 'Other (specify)' ? allergenCustom : allergen,
      barcode: barcode || null,
      productName,
      brand,
      batchNumber: batchNumber || null,
      purchaseLocation: purchaseLocation || null,
      severity,
      experienceType,
      symptoms,
      symptomOnsetTime,
      symptomDuration,
      treatmentReceived,
      narrative,
      consultedDoctor,
      doctorName: doctorName || null,
      doctorRecommendation: doctorRecommendation || null,
      photos: photos.map((p) => ({
        uri: p.uri,
        timestamp: p.timestamp,
        location: p.location,
      })),
      consentGiven: {
        medicalTeamShare: consentChecks.medicalTeamShare,
        researchShare: consentChecks.researchShare,
        databaseImprove: consentChecks.databaseImprove,
        brandShare: consentChecks.brandShare,
      },
    };

    try {
      await dispatch(submitIncidentReport(incidentData)).unwrap();
      showNotification(
        '+50 points! Your report will be reviewed by medical professionals.',
        'success'
      );
      // Reset form and navigate
      navigation.goBack();
    } catch (error) {
      showNotification(error.message || 'Failed to submit report', 'error');
    }
  };

  // ==================== RENDER CONSENT STEP ====================

  if (consentStep) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.consentCard}>
          <Text style={styles.consentHeader}>🔒 Privacy & Medical Data</Text>

          <Text style={styles.consentText}>
            You're about to share medical information including photos and health details. This
            information will help protect your community and save lives. Here's how it will be used:
          </Text>

          {/* Required Consent 1 */}
          <View style={styles.consentCheckbox}>
            <CheckBox
              value={consentChecks.medicalTeamShare}
              onValueChange={(newValue) =>
                setConsentChecks({ ...consentChecks, medicalTeamShare: newValue })
              }
              tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={styles.consentCheckboxLabel}>
              Shared with our medical team for verification
              <Text style={styles.requiredBadge}> *REQUIRED</Text>
            </Text>
          </View>

          {/* Optional Consent 2 */}
          <View style={styles.consentCheckbox}>
            <CheckBox
              value={consentChecks.researchShare}
              onValueChange={(newValue) =>
                setConsentChecks({ ...consentChecks, researchShare: newValue })
              }
              tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={styles.consentCheckboxLabel}>
              Anonymized and shared with health researchers
              <Text style={styles.optionalBadge}> (optional)</Text>
            </Text>
          </View>

          {/* Required Consent 3 */}
          <View style={styles.consentCheckbox}>
            <CheckBox
              value={consentChecks.databaseImprove}
              onValueChange={(newValue) =>
                setConsentChecks({ ...consentChecks, databaseImprove: newValue })
              }
              tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={styles.consentCheckboxLabel}>
              Used to improve our allergen database
              <Text style={styles.requiredBadge}> *REQUIRED</Text>
            </Text>
          </View>

          {/* Optional Consent 4 */}
          <View style={styles.consentCheckbox}>
            <CheckBox
              value={consentChecks.brandShare}
              onValueChange={(newValue) =>
                setConsentChecks({ ...consentChecks, brandShare: newValue })
              }
              tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={styles.consentCheckboxLabel}>
              Shared with brands/retailers for product safety
              <Text style={styles.optionalBadge}> (optional)</Text>
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Legal Links */}
          <TouchableOpacity onPress={() => Linking.openURL('https://scanwise.app/privacy')}>
            <Text style={styles.legalLink}>📄 View our Privacy Policy & HIPAA Notice</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL('https://scanwise.app/terms')}>
            <Text style={styles.legalLink}>📋 View Terms of Service</Text>
          </TouchableOpacity>

          <Text style={styles.consentFooter}>
            You can withdraw consent anytime in Settings. Timestamp recorded for compliance.
          </Text>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleConsentAccept}
          disabled={!isConsentValid()}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            I Understand & Consent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==================== RENDER INCIDENT FORM ====================

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Step 3: EMERGENCY WARNING */}
      {severity === 'life_threatening' && (
        <View style={styles.warningBox}>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
            <Text style={styles.emergencyButtonText}>🚨 CALL 911 NOW</Text>
          </TouchableOpacity>
          <Text style={styles.warningText}>
            This is a life-threatening situation. Seek immediate medical attention. Call 911 or go
            to the nearest emergency room.
          </Text>
        </View>
      )}

      {/* STEP 1: Allergen Identification */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 1: What Allergen?</Text>

        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>
            {allergen || 'Select allergen...'}
          </Text>
        </TouchableOpacity>

        {/* TODO: Implement dropdown picker component */}
        {/* For now, showing text input as fallback */}
        <View style={styles.optionRow}>
          {ALLERGEN_OPTIONS.slice(0, 3).map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionRow}
              onPress={() => setAllergen(option)}
            >
              <CheckBox
                value={allergen === option}
                onValueChange={() => setAllergen(option)}
                tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
              />
              <Text style={styles.optionLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {allergen === 'Other (specify)' && (
          <TextInput
            style={styles.input}
            placeholder="Specify rare allergen..."
            value={allergenCustom}
            onChangeText={setAllergenCustom}
            placeholderTextColor={theme.colors.textSecondary}
          />
        )}
      </View>

      {/* STEP 2: Product Identification */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 2: Which Product?</Text>

        <TextInput
          style={styles.input}
          placeholder="Barcode (scan or enter)"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          placeholder="Product name"
          value={productName}
          onChangeText={setProductName}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          placeholder="Brand"
          value={brand}
          onChangeText={setBrand}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          placeholder="Batch/Lot number (optional)"
          value={batchNumber}
          onChangeText={setBatchNumber}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          placeholder="Where purchased (store, online, etc.)"
          value={purchaseLocation}
          onChangeText={setPurchaseLocation}
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      {/* STEP 3: Safety Status */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 3: Safety Status</Text>

        {SEVERITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.optionRow}
            onPress={() => {
              setSeverity(option.value);
              if (option.value === 'life_threatening') {
                handleEmergency();
              }
            }}
          >
            <CheckBox
              value={severity === option.value}
              onValueChange={() => setSeverity(option.value)}
              tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={styles.optionLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* STEP 4: Experience Type */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 4: Experience Type</Text>

        {EXPERIENCE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.optionRow}
            onPress={() => setExperienceType(option.value)}
          >
            <CheckBox
              value={experienceType === option.value}
              onValueChange={() => setExperienceType(option.value)}
              tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={styles.optionLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* STEP 5: Photo Capture */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 5: Photo Documentation</Text>
        <Text style={styles.label}>
          Take photos of visible reactions (hives, rash, swelling) - Up to 5 images
        </Text>

        {/* Photo Grid */}
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <TouchableOpacity
                onPress={() => removePhoto(index)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < 5 && (
            <View style={styles.photoItem}>
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>📷</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {photos.length}/5
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Photo Buttons */}
        {photos.length < 5 && (
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={pickPhotoFromCamera}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>📷 Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={pickPhotoFromLibrary}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* STEP 6: Severity Details */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 6: Symptom Details</Text>

        <Text style={styles.label}>Which symptoms did you experience?</Text>
        {SYMPTOM_OPTIONS.map((symptom) => (
          <View key={symptom} style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => toggleSymptom(symptom)}
            >
              <CheckBox
                value={symptoms.includes(symptom)}
                onValueChange={() => toggleSymptom(symptom)}
                tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
              />
              <Text style={styles.optionLabel}>{symptom}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TextInput
          style={styles.input}
          placeholder="When did symptoms start? (e.g., 15 minutes after eating)"
          value={symptomOnsetTime}
          onChangeText={setSymptomOnsetTime}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          placeholder="How long did reaction last? (e.g., 1 hour)"
          value={symptomDuration}
          onChangeText={setSymptomDuration}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          placeholder="Treatment received? (e.g., Benadryl, EpiPen)"
          value={treatmentReceived}
          onChangeText={setTreatmentReceived}
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      {/* STEP 7: User Narrative */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 7: Your Story</Text>
        <Text style={styles.label}>Describe what happened in your own words</Text>
        <Text style={styles.label} style={{ fontSize: 12, color: theme.colors.textSecondary }}>
          Help others recognize early symptoms and act quickly. Include timeline and details.
        </Text>

        <TextInput
          style={styles.narrativeInput}
          placeholder="Tell us about your experience..."
          value={narrative}
          onChangeText={setNarrative}
          multiline
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={1000}
        />

        <Text style={styles.characterCount}>
          {narrative.length}/1000 characters
        </Text>
      </View>

      {/* STEP 8: Medical Consultation */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>Step 8: Medical Consultation</Text>

        <View style={styles.optionRow}>
          <CheckBox
            value={consultedDoctor}
            onValueChange={setConsultedDoctor}
            tintColors={{ true: theme.colors.primary, false: theme.colors.border }}
          />
          <Text style={styles.optionLabel}>I consulted a doctor about this</Text>
        </View>

        {consultedDoctor && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Doctor's name (optional)"
              value={doctorName}
              onChangeText={setDoctorName}
              placeholderTextColor={theme.colors.textSecondary}
            />

            <TextInput
              style={styles.input}
              placeholder="Doctor's recommendation (optional)"
              value={doctorRecommendation}
              onChangeText={setDoctorRecommendation}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
          </>
        )}
      </View>

      {/* SUBMIT BUTTON */}
      <TouchableOpacity
        style={[styles.button, styles.primaryButton, { paddingVertical: theme.spacing.lg }]}
        onPress={handleSubmitReport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Submit Report & Earn 50 Points
          </Text>
        )}
      </TouchableOpacity>

      {/* Info Box */}
      <View style={styles.consentCard}>
        <Text style={styles.consentText}>
          ✅ Your report will be reviewed by medical professionals
        </Text>
        <Text style={styles.consentText}>
          ✅ This helps protect your community from unsafe products
        </Text>
        <Text style={styles.consentText}>
          ✅ All data is handled securely and in compliance with HIPAA
        </Text>
      </View>
    </ScrollView>
  );
};

export default IncidentReportScreen;
