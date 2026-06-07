import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { pollinationService } from '../../services/pollinationService';

const PredictYieldScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [useExistingPlant, setUseExistingPlant] = useState(false);
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');

  const [formData, setFormData] = useState({
    plantType: 'bitter_gourd',
    plantAgeDays: '',
    vineLengthCm: '',
    nodeCount: '',
    maleFlowerCount: '',
    femaleFlowerCount: '',
    temperatureCelsius: '',
    soilMoisturePercent: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (useExistingPlant) {
      fetchPlants();
    }
  }, [useExistingPlant]);

  const fetchPlants = async () => {
    try {
      setLoadingPlants(true);
      const response = await pollinationService.getPollinations();
      if (response.success) {
        setPlants(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoadingPlants(false);
    }
  };

  const handlePlantSelection = (plantId) => {
    setSelectedPlantId(plantId);
    const selectedPlant = plants.find(p => p._id === plantId);
    
    if (selectedPlant) {
      // Auto-fill form with plant data
      setFormData({
        ...formData,
        plantType: selectedPlant.plantType || formData.plantType,
        plantAgeDays: selectedPlant.plantAge?.toString() || '',
        vineLengthCm: selectedPlant.vineLength?.toString() || '',
        nodeCount: selectedPlant.nodeCount?.toString() || '',
        maleFlowerCount: selectedPlant.maleFlowerCount?.toString() || '',
        femaleFlowerCount: selectedPlant.femaleFlowerCount?.toString() || '',
        temperatureCelsius: selectedPlant.temperature?.toString() || '',
        soilMoisturePercent: selectedPlant.soilMoisture?.toString() || ''
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.plantType) newErrors.plantType = 'Plant type is required';
    if (!formData.plantAgeDays) newErrors.plantAgeDays = 'Plant age is required';
    if (!formData.vineLengthCm) newErrors.vineLengthCm = 'Vine length is required';
    if (!formData.nodeCount) newErrors.nodeCount = 'Node count is required';
    if (!formData.maleFlowerCount) newErrors.maleFlowerCount = 'Male flower count is required';
    if (!formData.femaleFlowerCount) newErrors.femaleFlowerCount = 'Female flower count is required';
    if (!formData.temperatureCelsius) newErrors.temperatureCelsius = 'Temperature is required';
    if (!formData.soilMoisturePercent) newErrors.soilMoisturePercent = 'Soil moisture is required';

    // Numeric range validations
    const age = parseFloat(formData.plantAgeDays);
    if (formData.plantAgeDays && (isNaN(age) || age < 0 || age > 200)) {
      newErrors.plantAgeDays = 'Must be between 0-200 days';
    }

    const vineLength = parseFloat(formData.vineLengthCm);
    if (formData.vineLengthCm && (isNaN(vineLength) || vineLength < 0 || vineLength > 1000)) {
      newErrors.vineLengthCm = 'Must be between 0-1000 cm';
    }

    const nodes = parseFloat(formData.nodeCount);
    if (formData.nodeCount && (isNaN(nodes) || nodes < 0 || nodes > 100)) {
      newErrors.nodeCount = 'Must be between 0-100';
    }

    const maleFlowers = parseFloat(formData.maleFlowerCount);
    if (formData.maleFlowerCount && (isNaN(maleFlowers) || maleFlowers < 0 || maleFlowers > 100)) {
      newErrors.maleFlowerCount = 'Must be between 0-100';
    }

    const femaleFlowers = parseFloat(formData.femaleFlowerCount);
    if (formData.femaleFlowerCount && (isNaN(femaleFlowers) || femaleFlowers < 0 || femaleFlowers > 100)) {
      newErrors.femaleFlowerCount = 'Must be between 0-100';
    }

    const temp = parseFloat(formData.temperatureCelsius);
    if (formData.temperatureCelsius && (isNaN(temp) || temp < 10 || temp > 45)) {
      newErrors.temperatureCelsius = 'Must be between 10-45°C';
    }

    const moisture = parseFloat(formData.soilMoisturePercent);
    if (formData.soilMoisturePercent && (isNaN(moisture) || moisture < 0 || moisture > 100)) {
      newErrors.soilMoisturePercent = 'Must be between 0-100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check all fields and try again');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        pollinationId: useExistingPlant ? selectedPlantId : undefined,
        plantType: formData.plantType,
        plantAgeDays: parseFloat(formData.plantAgeDays),
        vineLengthCm: parseFloat(formData.vineLengthCm),
        nodeCount: parseFloat(formData.nodeCount),
        maleFlowerCount: parseFloat(formData.maleFlowerCount),
        femaleFlowerCount: parseFloat(formData.femaleFlowerCount),
        temperatureCelsius: parseFloat(formData.temperatureCelsius),
        soilMoisturePercent: parseFloat(formData.soilMoisturePercent),
        notes: formData.notes || ''
      };

      const response = await pollinationService.predictYield(requestData);

      if (response.success) {
        navigation.navigate('YieldResults', {
          prediction: response.data
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to generate prediction');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      Alert.alert('Error', error.message || 'Failed to generate yield prediction');
    } finally {
      setLoading(false);
    }
  };

  const getPlantTypeLabel = (type) => {
    const labels = {
      bitter_gourd: 'Bitter Gourd',
      bottle_gourd: 'Bottle Gourd',
      sponge_gourd: 'Sponge Gourd',
      cucumber: 'Cucumber',
      kalabasa: 'Squash'
    };
    return labels[type] || type;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2e7d32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Predict Crop Yield</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Data Source Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Source</Text>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !useExistingPlant && styles.toggleButtonActive
              ]}
              onPress={() => {
                setUseExistingPlant(false);
                setSelectedPlantId('');
              }}
            >
              <Ionicons 
                name="create-outline" 
                size={20} 
                color={!useExistingPlant ? '#fff' : '#2e7d32'} 
              />
              <Text style={[
                styles.toggleText,
                !useExistingPlant && styles.toggleTextActive
              ]}>
                Manual Entry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                useExistingPlant && styles.toggleButtonActive
              ]}
              onPress={() => setUseExistingPlant(true)}
            >
              <Ionicons 
                name="leaf-outline" 
                size={20} 
                color={useExistingPlant ? '#fff' : '#2e7d32'} 
              />
              <Text style={[
                styles.toggleText,
                useExistingPlant && styles.toggleTextActive
              ]}>
                Select Plant
              </Text>
            </TouchableOpacity>
          </View>

          {/* Existing Plant Selection */}
          {useExistingPlant && (
            <View style={styles.pickerContainer}>
              {loadingPlants ? (
                <ActivityIndicator size="small" color="#2e7d32" />
              ) : (
                <Picker
                  selectedValue={selectedPlantId}
                  onValueChange={handlePlantSelection}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select a plant --" value="" />
                  {plants.map(plant => (
                    <Picker.Item
                      key={plant._id}
                      label={`${plant.plantName || plant.plantType} - ${plant.status}`}
                      value={plant._id}
                    />
                  ))}
                </Picker>
              )}
            </View>
          )}
        </View>

        {/* Plant Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plant Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.plantType}
                onValueChange={(value) => handleInputChange('plantType', value)}
                style={styles.picker}
                enabled={!useExistingPlant || !selectedPlantId}
              >
                <Picker.Item label="Bitter Gourd" value="bitter_gourd" />
                <Picker.Item label="Bottle Gourd" value="bottle_gourd" />
                <Picker.Item label="Sponge Gourd" value="sponge_gourd" />
                <Picker.Item label="Cucumber" value="cucumber" />
                <Picker.Item label="Squash" value="kalabasa" />
              </Picker>
            </View>
            {errors.plantType && <Text style={styles.errorText}>{errors.plantType}</Text>}
          </View>

          {/* Plant Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Age (days) *</Text>
            <TextInput
              style={[styles.input, errors.plantAgeDays && styles.inputError]}
              value={formData.plantAgeDays}
              onChangeText={(value) => handleInputChange('plantAgeDays', value)}
              keyboardType="numeric"
              placeholder="e.g., 60"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Optimal: 45-80 days depending on plant type</Text>
            {errors.plantAgeDays && <Text style={styles.errorText}>{errors.plantAgeDays}</Text>}
          </View>

          {/* Vine Length */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vine Length (cm) *</Text>
            <TextInput
              style={[styles.input, errors.vineLengthCm && styles.inputError]}
              value={formData.vineLengthCm}
              onChangeText={(value) => handleInputChange('vineLengthCm', value)}
              keyboardType="numeric"
              placeholder="e.g., 300"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Typical range: 200-500 cm</Text>
            {errors.vineLengthCm && <Text style={styles.errorText}>{errors.vineLengthCm}</Text>}
          </View>

          {/* Node Count */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Node Count *</Text>
            <TextInput
              style={[styles.input, errors.nodeCount && styles.inputError]}
              value={formData.nodeCount}
              onChangeText={(value) => handleInputChange('nodeCount', value)}
              keyboardType="numeric"
              placeholder="e.g., 35"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Number of nodes on the main vine</Text>
            {errors.nodeCount && <Text style={styles.errorText}>{errors.nodeCount}</Text>}
          </View>
        </View>

        {/* Flower Counts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flowering Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Male Flower Count *</Text>
            <TextInput
              style={[styles.input, errors.maleFlowerCount && styles.inputError]}
              value={formData.maleFlowerCount}
              onChangeText={(value) => handleInputChange('maleFlowerCount', value)}
              keyboardType="numeric"
              placeholder="e.g., 20"
              placeholderTextColor="#999"
            />
            {errors.maleFlowerCount && <Text style={styles.errorText}>{errors.maleFlowerCount}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Female Flower Count *</Text>
            <TextInput
              style={[styles.input, errors.femaleFlowerCount && styles.inputError]}
              value={formData.femaleFlowerCount}
              onChangeText={(value) => handleInputChange('femaleFlowerCount', value)}
              keyboardType="numeric"
              placeholder="e.g., 10"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Female flowers develop into fruits</Text>
            {errors.femaleFlowerCount && <Text style={styles.errorText}>{errors.femaleFlowerCount}</Text>}
          </View>
        </View>

        {/* Environmental Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environmental Conditions</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Temperature (°C) *</Text>
            <TextInput
              style={[styles.input, errors.temperatureCelsius && styles.inputError]}
              value={formData.temperatureCelsius}
              onChangeText={(value) => handleInputChange('temperatureCelsius', value)}
              keyboardType="numeric"
              placeholder="e.g., 27"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Optimal: 24-31°C</Text>
            {errors.temperatureCelsius && <Text style={styles.errorText}>{errors.temperatureCelsius}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soil Moisture (%) *</Text>
            <TextInput
              style={[styles.input, errors.soilMoisturePercent && styles.inputError]}
              value={formData.soilMoisturePercent}
              onChangeText={(value) => handleInputChange('soilMoisturePercent', value)}
              keyboardType="numeric"
              placeholder="e.g., 70"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Optimal: 60-85%</Text>
            {errors.soilMoisturePercent && <Text style={styles.errorText}>{errors.soilMoisturePercent}</Text>}
          </View>
        </View>

        {/* Optional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            placeholder="Any additional observations..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Generate Prediction</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        paddingTop: 50
      },
      android: {
        paddingTop: 16
      }
    })
  },
  backButton: {
    marginRight: 16
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2e7d32'
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff'
  },
  toggleButtonActive: {
    backgroundColor: '#2e7d32'
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32'
  },
  toggleTextActive: {
    color: '#fff'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff'
  },
  inputError: {
    borderColor: '#d32f2f'
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top'
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 24
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  }
});

export default PredictYieldScreen;
