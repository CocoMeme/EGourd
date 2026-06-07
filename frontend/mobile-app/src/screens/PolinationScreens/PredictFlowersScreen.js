import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../../styles';
import { pollinationService } from '../../services';
import { Ionicons } from '@expo/vector-icons';

export const PredictFlowersScreen = ({ navigation, route }) => {
  const { plant } = route.params || {}; // Optional plant from pollination record
  
  const [isLoading, setIsLoading] = useState(false);
  const [userPlants, setUserPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Plant selection
    selectedPlantId: plant?._id || '',
    plantType: plant?.name || 'bitter_gourd',
    plantAge: plant?.ageInDays?.toString() || '',
    
    // Environmental factors - manual input
    temperature: '28',
    humidity: '70',
    sunlightHours: '6',
    soilPH: '6.5',
    soilType: 'loamy',
    season: 'wet',
    
    // Care data
    wateringFrequency: '4',
    fertilizerType: 'organic',
    fertilizerFrequency: '2',
    pestControl: 'as-needed',
    
    // Growth metrics
    height: '',
    leafCount: '',
    stemThickness: '',
    healthRating: '3',
    
    // Optional notes
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Load user's plants for selection
  useEffect(() => {
    loadUserPlants();
  }, []);

  const loadUserPlants = async () => {
    setLoadingPlants(true);
    try {
      const response = await pollinationService.getPollinations();
      if (response.data && response.data.data) {
        setUserPlants(response.data.data);
      }
    } catch (error) {
      console.error('Error loading plants:', error);
    } finally {
      setLoadingPlants(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required numeric fields (temperature, humidity, sunlight are auto-filled now)
    const numericFields = {
      plantAge: { min: 0, max: 365, name: 'Plant Age' },
      wateringFrequency: { min: 0, max: 21, name: 'Watering Frequency' }
    };

    Object.entries(numericFields).forEach(([field, config]) => {
      const value = parseFloat(formData[field]);
      if (!formData[field] || isNaN(value)) {
        newErrors[field] = `${config.name} is required`;
      } else if (value < config.min || value > config.max) {
        newErrors[field] = `${config.name} must be between ${config.min} and ${config.max}`;
      }
    });

    // Optional numeric fields with validation if provided
    if (formData.soilPH && (parseFloat(formData.soilPH) < 4 || parseFloat(formData.soilPH) > 9)) {
      newErrors.soilPH = 'Soil pH must be between 4 and 9';
    }

    if (formData.fertilizerFrequency && (parseFloat(formData.fertilizerFrequency) < 0)) {
      newErrors.fertilizerFrequency = 'Fertilizer frequency cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare data for API
      const predictionData = {
        pollinationId: formData.selectedPlantId || undefined,
        plantType: formData.plantType,
        plantAge: parseInt(formData.plantAge),
        environmental: {
          temperature: parseFloat(formData.temperature),
          humidity: parseFloat(formData.humidity),
          sunlightHours: parseFloat(formData.sunlightHours),
          soilPH: formData.soilPH ? parseFloat(formData.soilPH) : undefined,
          soilType: formData.soilType
        },
        care: {
          wateringFrequency: parseFloat(formData.wateringFrequency),
          fertilizerType: formData.fertilizerType,
          fertilizerFrequency: formData.fertilizerFrequency ? parseFloat(formData.fertilizerFrequency) : 2,
          pestControl: formData.pestControl
        },
        growth: {
          height: formData.height ? parseFloat(formData.height) : 150,
          leafCount: formData.leafCount ? parseInt(formData.leafCount) : 30,
          stemThickness: formData.stemThickness ? parseFloat(formData.stemThickness) : 10,
          healthRating: parseInt(formData.healthRating)
        },
        notes: formData.notes || undefined
      };

      const response = await pollinationService.predictFlowers(predictionData);
      
      if (response.data && response.data.success) {
        // Navigate to results screen
        navigation.navigate('PredictionResults', {
          prediction: response.data.data,
          plant: userPlants.find(p => p._id === formData.selectedPlantId)
        });
      }
    } catch (error) {
      console.error('Error predicting flowers:', error);
      
      let errorMessage = 'An error occurred while generating the prediction.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlantSelection = (plantId) => {
    updateField('selectedPlantId', plantId);
    
    if (plantId) {
      const selectedPlant = userPlants.find(p => p._id === plantId);
      if (selectedPlant) {
        updateField('plantType', selectedPlant.name);
        updateField('plantAge', selectedPlant.ageInDays?.toString() || '');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="analytics-outline" size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Flower Production Predictor</Text>
          <Text style={styles.subtitle}>
            Enter plant data to predict how many male and female flowers will be produced
          </Text>
        </View>

        {/* Plant Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} /> Plant Information
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Plant (Optional)</Text>
            {loadingPlants ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.selectedPlantId}
                  onValueChange={handlePlantSelection}
                  style={styles.picker}
                >
                  <Picker.Item label="Manual Entry" value="" />
                  {userPlants.map(plant => (
                    <Picker.Item
                      key={plant._id}
                      label={`${plant.displayName?.english || plant.name} - ${plant.ageInDays} days old`}
                      value={plant._id}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.plantType}
                onValueChange={(value) => updateField('plantType', value)}
                style={styles.picker}
                enabled={!formData.selectedPlantId}
              >
                <Picker.Item label="Bitter Gourd" value="bitter_gourd" />
                <Picker.Item label="Bottle Gourd" value="bottle_gourd" />
                <Picker.Item label="Sponge Gourd" value="sponge_gourd" />
                <Picker.Item label="Cucumber" value="cucumber" />
                <Picker.Item label="Squash" value="kalabasa" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Age (days) *</Text>
            <TextInput
              style={[styles.input, errors.plantAge && styles.inputError]}
              value={formData.plantAge}
              onChangeText={(value) => updateField('plantAge', value)}
              keyboardType="numeric"
              placeholder="e.g., 45"
              editable={!formData.selectedPlantId}
            />
            {errors.plantAge && <Text style={styles.errorText}>{errors.plantAge}</Text>}
          </View>
        </View>

        {/* Environmental Factors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="sunny-outline" size={20} color={theme.colors.primary} /> Environmental Conditions
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Temperature (°C) *</Text>
            <TextInput
              style={[styles.input, errors.temperature && styles.inputError]}
              value={formData.temperature}
              onChangeText={(value) => updateField('temperature', value)}
              keyboardType="decimal-pad"
              placeholder="e.g., 28"
            />
            {errors.temperature && <Text style={styles.errorText}>{errors.temperature}</Text>}
            <Text style={styles.hint}>Optimal: 25-32°C</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Humidity (%) *</Text>
            <TextInput
              style={[styles.input, errors.humidity && styles.inputError]}
              value={formData.humidity}
              onChangeText={(value) => updateField('humidity', value)}
              keyboardType="decimal-pad"
              placeholder="e.g., 70"
            />
            {errors.humidity && <Text style={styles.errorText}>{errors.humidity}</Text>}
            <Text style={styles.hint}>Optimal: 60-80%</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Sunlight (hours) *</Text>
            <TextInput
              style={[styles.input, errors.sunlightHours && styles.inputError]}
              value={formData.sunlightHours}
              onChangeText={(value) => updateField('sunlightHours', value)}
              keyboardType="decimal-pad"
              placeholder="e.g., 6"
            />
            {errors.sunlightHours && <Text style={styles.errorText}>{errors.sunlightHours}</Text>}
            <Text style={styles.hint}>Optimal: 6-8 hours</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soil pH (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.soilPH}
              onChangeText={(value) => updateField('soilPH', value)}
              keyboardType="decimal-pad"
              placeholder="e.g., 6.5"
            />
            {errors.soilPH && <Text style={styles.errorText}>{errors.soilPH}</Text>}
            <Text style={styles.hint}>Optimal: 6.0-6.8</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soil Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.soilType}
                onValueChange={(value) => updateField('soilType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Loamy" value="loamy" />
                <Picker.Item label="Clay" value="clay" />
                <Picker.Item label="Sandy" value="sandy" />
                <Picker.Item label="Silty" value="silty" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Season</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.season}
                onValueChange={(value) => updateField('season', value)}
                style={styles.picker}
              >
                <Picker.Item label="Wet Season (June - November)" value="wet" />
                <Picker.Item label="Dry Season (December - May)" value="dry" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Plant Care Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="water-outline" size={20} color={theme.colors.primary} /> Plant Care
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Watering Frequency (times/week) *</Text>
            <TextInput
              style={[styles.input, errors.wateringFrequency && styles.inputError]}
              value={formData.wateringFrequency}
              onChangeText={(value) => updateField('wateringFrequency', value)}
              keyboardType="numeric"
              placeholder="e.g., 4"
            />
            {errors.wateringFrequency && <Text style={styles.errorText}>{errors.wateringFrequency}</Text>}
            <Text style={styles.hint}>Optimal: 3-5 times per week</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fertilizer Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.fertilizerType}
                onValueChange={(value) => updateField('fertilizerType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Organic" value="organic" />
                <Picker.Item label="Chemical" value="chemical" />
                <Picker.Item label="Mixed" value="mixed" />
                <Picker.Item label="None" value="none" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fertilizer Frequency (times/month)</Text>
            <TextInput
              style={styles.input}
              value={formData.fertilizerFrequency}
              onChangeText={(value) => updateField('fertilizerFrequency', value)}
              keyboardType="numeric"
              placeholder="e.g., 2"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pest Control</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.pestControl}
                onValueChange={(value) => updateField('pestControl', value)}
                style={styles.picker}
              >
                <Picker.Item label="Regular" value="regular" />
                <Picker.Item label="Occasional" value="occasional" />
                <Picker.Item label="As Needed" value="as-needed" />
                <Picker.Item label="None" value="none" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Growth Metrics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} /> Growth Metrics
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Height (cm, optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(value) => updateField('height', value)}
              keyboardType="decimal-pad"
              placeholder="e.g., 120"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Leaf Count (optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.leafCount}
              onChangeText={(value) => updateField('leafCount', value)}
              keyboardType="numeric"
              placeholder="e.g., 25"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stem Thickness (mm, optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.stemThickness}
              onChangeText={(value) => updateField('stemThickness', value)}
              keyboardType="decimal-pad"
              placeholder="e.g., 8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Overall Health Rating *</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    formData.healthRating === rating.toString() && styles.ratingButtonActive
                  ]}
                  onPress={() => updateField('healthRating', rating.toString())}
                >
                  <Text style={[
                    styles.ratingText,
                    formData.healthRating === rating.toString() && styles.ratingTextActive
                  ]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>1 = Poor, 5 = Excellent</Text>
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} /> Notes (Optional)
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Any additional observations or comments..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.hint}>{formData.notes.length}/500 characters</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.submitButtonText}>Generate Prediction</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  ratingButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  ratingTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  bottomPadding: {
    height: 32,
  },
});

export default PredictFlowersScreen;