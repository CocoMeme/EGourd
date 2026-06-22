import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert,
  Modal,
  Image,
  Switch
} from 'react-native';
// Removed @react-native-community/slider due to native module issues with Expo
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';
import { Button } from '../CustomComponents/Button';
import { ImageCapture } from './ImageCapture';
import { plantService, weatherService, getWeatherForDate, DEFAULT_SOIL_TYPE } from '../../services';

// Custom Value Stepper Component (replaces Slider to avoid native module issues)
const ValueStepper = ({ value, min, max, step, onChange, unit = '' }) => {
  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };
  
  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };
  
  return (
    <View style={stepperStyles.container}>
      <TouchableOpacity 
        style={stepperStyles.button} 
        onPress={handleDecrease}
        disabled={value <= min}
      >
        <Ionicons name="remove" size={20} color={value <= min ? '#ccc' : theme.colors.primary} />
      </TouchableOpacity>
      <View style={stepperStyles.valueContainer}>
        <Text style={stepperStyles.value}>{value}{unit}</Text>
      </View>
      <TouchableOpacity 
        style={stepperStyles.button} 
        onPress={handleIncrease}
        disabled={value >= max}
      >
        <Ionicons name="add" size={20} color={value >= max ? '#ccc' : theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 4,
  },
  button: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  }
});

export const PlantForm = ({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  title,
  isLoading = false 
}) => {
  const { t } = useTranslation();
  const formTitle = title || t('pollination.addNewPlant');
  // Gourd type configurations from backend
  const [gourdTypeConfigs, setGourdTypeConfigs] = useState({
    bitter_gourd: {
      optimalConditions: { minTemp: 26, maxTemp: 32, humidity: '65-80%' }
    },
    bottle_gourd: {
      optimalConditions: { minTemp: 25, maxTemp: 30, humidity: '60-75%' }
    },
    sponge_gourd: {
      optimalConditions: { minTemp: 25, maxTemp: 32, humidity: '70-85%' }
    },
    cucumber: {
      optimalConditions: { minTemp: 24, maxTemp: 30, humidity: '60-75%' }
    }
  });

  // Get initial weather data based on date
  const getInitialWeather = (date) => {
    const weather = getWeatherForDate(date);
    return {
      avgTemperature: weather.temperature,
      avgHumidity: weather.humidity,
      sunlightHours: weather.sunlightHours,
      soilType: DEFAULT_SOIL_TYPE, // Always silty based on Philippine farming practices
      soilPh: initialData.environment?.soilPh || 6.5,
      regionClimate: 'tropical_lowland',
      season: weather.season
    };
  };

  const initialDate = initialData.datePlanted ? new Date(initialData.datePlanted) : new Date();
  const initialWeather = getInitialWeather(initialDate);

  const [formData, setFormData] = useState({
    gourdType: initialData.gourdType || 'bitter_gourd',
    plantName: initialData.plantName || '',
    datePlanted: initialDate,
    notes: initialData.notes || '',
    // Environment settings - auto-populated from weather data
    environment: initialWeather,
    // Care settings
    care: {
      fertilizerType: initialData.care?.fertilizerType || 'organic',
      fertilizerFrequency: initialData.care?.fertilizerFrequency || 'weekly',
      wateringFrequency: initialData.care?.wateringFrequency || 'daily'
    }
  });

  const [showGourdTypeModal, setShowGourdTypeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [showCareModal, setShowCareModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Date picker state
  const [selectedYear, setSelectedYear] = useState(formData.datePlanted.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(formData.datePlanted.getMonth());
  const [selectedDay, setSelectedDay] = useState(formData.datePlanted.getDate());

  // Fetch gourd type configurations on mount
  useEffect(() => {
    const fetchGourdTypes = async () => {
      try {
        const response = await plantService.getGourdTypes();
        if (response.data) {
          setGourdTypeConfigs(response.data);
        }
      } catch (error) {
        console.log('Using default gourd type configurations');
      }
    };
    fetchGourdTypes();
  }, []);

  const gourdTypes = [
    { value: 'bitter_gourd', label: t('plantService.varieties.bitter_gourd'), icon: '🥒' },
    { value: 'bottle_gourd', label: t('plantService.varieties.bottle_gourd'), icon: '🫛' },
    { value: 'sponge_gourd', label: t('plantService.varieties.sponge_gourd'), icon: '🌿' },
    { value: 'cucumber', label: t('plantService.varieties.cucumber'), icon: '🥒' },
    { value: 'kalabasa', label: t('plantService.varieties.kalabasa'), icon: '🎃' },
  ];

  // Removed soilTypes, climateTypes, seasons as they are now auto-determined
  const fertilizerTypes = ['organic', 'chemical', 'mixed', 'none'];
  const frequencyOptions = ['daily', 'twice_daily', 'every_other_day', 'weekly', 'biweekly', 'monthly', 'none'];

  const handleInputChange = (field, value, nested = null) => {
    setFormData(prev => {
      if (nested) {
        return {
          ...prev,
          [nested]: {
            ...prev[nested],
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  // Update weather data when date changes
  const handleDateChange = (newDate) => {
    const weather = getWeatherForDate(newDate);
    setFormData(prev => ({
      ...prev,
      datePlanted: newDate,
      environment: {
        ...prev.environment,
        avgTemperature: weather.temperature,
        avgHumidity: weather.humidity,
        sunlightHours: weather.sunlightHours,
        season: weather.season
      }
    }));
  };

  // Update gourd type
  const handleGourdTypeChange = (gourdType) => {
    setFormData(prev => ({
      ...prev,
      gourdType
    }));
    setShowGourdTypeModal(false);
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.gourdType || !formData.datePlanted) {
      Alert.alert(t('pollination.missingInfo'), t('pollination.missingInfoDetail'));
      return;
    }

    // Check if planting date is not in the future
    if (formData.datePlanted > new Date()) {
      Alert.alert(t('common.invalidDate'), t('pollination.dateCannotBeFuture'));
      return;
    }

    // Prepare data for submission
    const submissionData = {
      gourdType: formData.gourdType,
      plantName: formData.plantName.trim() || `${formData.gourdType}_${Date.now()}`,
      datePlanted: formData.datePlanted.toISOString(),
      notes: formData.notes.trim() || undefined,
      environment: formData.environment,
      care: formData.care,
      // Include captured image
      image: capturedImage
    };

    onSubmit(submissionData);
  };

  const handleImageCaptured = (imageData) => {
    setCapturedImage(imageData);
  };

  const removeImage = () => {
    setCapturedImage(null);
  };

  const selectedGourd = gourdTypes.find(g => g.value === formData.gourdType);
  const optimalConditions = gourdTypeConfigs[formData.gourdType]?.optimalConditions;

  const formatLabel = (str) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{formTitle}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Gourd Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('pollination.gourdType')} *</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowGourdTypeModal(true)}
        >
          <Text style={styles.selectorText}>
            {selectedGourd?.icon} {selectedGourd?.label}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        {optimalConditions && (
          <View style={styles.conditionsHint}>
            <Text style={styles.conditionsText}>
              {t('pollination.optimalConditions', { minTemp: optimalConditions.minTemp, maxTemp: optimalConditions.maxTemp, humidity: optimalConditions.humidity })}
            </Text>
          </View>
        )}
      </View>

      {/* Plant Name (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('pollination.plantNameOptional')}</Text>
        <Text style={styles.sectionSubtitle}>{t('pollination.plantNameHint')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('pollination.plantNamePlaceholder')}
          value={formData.plantName}
          onChangeText={(value) => handleInputChange('plantName', value)}
          maxLength={50}
        />
      </View>

      {/* Date Planted */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('pollination.datePlanted')} *</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => {
            // Sync date picker state with current formData before opening
            setSelectedYear(formData.datePlanted.getFullYear());
            setSelectedMonth(formData.datePlanted.getMonth());
            setSelectedDay(formData.datePlanted.getDate());
            setShowDatePicker(true);
          }}
        >
          <Text style={styles.selectorText}>
            {formData.datePlanted.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Environment Settings Toggle */}
      <View style={styles.section}>
        <View style={styles.toggleHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('pollination.environmentSettings')}</Text>
            <Text style={styles.sectionSubtitle}>{t('pollination.environmentSettingsHint')}</Text>
          </View>
          <Switch
            value={showAdvancedSettings}
            onValueChange={setShowAdvancedSettings}
            trackColor={{ false: theme.colors.background.secondary, true: theme.colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {showAdvancedSettings && (
        <>
          {/* Auto-populated Weather Data (Read-only info) */}
          <View style={styles.weatherInfoCard}>
            <View style={styles.weatherHeader}>
              <Ionicons name="cloud-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.weatherTitle}>{t('pollination.weatherData')}</Text>
            </View>
            <Text style={styles.weatherSubtitle}>
              {t('pollination.weatherDataHint')}
            </Text>
            
            <View style={styles.weatherGrid}>
              <View style={styles.weatherItem}>
                <Ionicons name="thermometer-outline" size={24} color="#FF6B6B" />
                <Text style={styles.weatherValue}>{formData.environment.avgTemperature}°C</Text>
                <Text style={styles.weatherLabel}>{t('pollination.temperature')}</Text>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="water-outline" size={24} color="#4A90E2" />
                <Text style={styles.weatherValue}>{formData.environment.avgHumidity}%</Text>
                <Text style={styles.weatherLabel}>{t('pollination.humidity')}</Text>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="sunny-outline" size={24} color="#F5A623" />
                <Text style={styles.weatherValue}>{formData.environment.sunlightHours}h</Text>
                <Text style={styles.weatherLabel}>{t('pollination.sunlight')}</Text>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="leaf-outline" size={24} color="#7ED321" />
                <Text style={styles.weatherValue}>{formatLabel(formData.environment.season)}</Text>
                <Text style={styles.weatherLabel}>{t('pollination.season')}</Text>
              </View>
            </View>
            
            <View style={styles.soilInfo}>
              <Ionicons name="earth-outline" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.soilText}>
                {t('pollination.soilType')}
              </Text>
            </View>
          </View>

          {/* Care Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pollination.careSettings')}</Text>
          </View>

          <View style={styles.envRow}>
            <View style={styles.envRowItem}>
              <Text style={styles.envLabel}>{t('pollination.fertilizerType')}</Text>
              <View style={styles.optionRow}>
                {fertilizerTypes.map(fert => (
                  <TouchableOpacity
                    key={fert}
                    style={[
                      styles.optionButton,
                      formData.care.fertilizerType === fert && styles.optionButtonActive
                    ]}
                    onPress={() => handleInputChange('fertilizerType', fert, 'care')}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.care.fertilizerType === fert && styles.optionButtonTextActive
                    ]}>{formatLabel(fert)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.envRow}>
            <View style={styles.envRowItem}>
              <Text style={styles.envLabel}>{t('pollination.wateringFrequency')}</Text>
              <View style={styles.optionRow}>
                {['daily', 'twice_daily', 'every_other_day'].map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.optionButton,
                      formData.care.wateringFrequency === freq && styles.optionButtonActive
                    ]}
                    onPress={() => handleInputChange('wateringFrequency', freq, 'care')}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.care.wateringFrequency === freq && styles.optionButtonTextActive
                    ]}>{formatLabel(freq)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </>
      )}

      {/* Initial Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('pollination.notesOptional')}</Text>
        <TextInput
          style={styles.textArea}
          placeholder={t('pollination.notesPlaceholder')}
          value={formData.notes}
          onChangeText={(value) => handleInputChange('notes', value)}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {t('pollination.charCount', { count: formData.notes.length })}
        </Text>
      </View>

      {/* Plant Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('pollination.plantPhotoOptional')}</Text>
        <Text style={styles.sectionSubtitle}>
          {t('pollination.plantPhotoHint')}
        </Text>
        
        {capturedImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: capturedImage.uri }} style={styles.plantImage} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={removeImage}
            >
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.addPhotoButton}
          onPress={() => setShowImageCapture(true)}
        >
          <Ionicons name="camera" size={24} color={theme.colors.primary} />
          <Text style={styles.addPhotoText}>
            {capturedImage ? t('pollination.changePhoto') : t('pollination.addPhoto')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submit Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={t('common.cancel')}
          variant="outline"
          onPress={onCancel}
          style={styles.cancelButton}
        />
        <Button
          title={initialData.gourdType ? t('pollination.updatePlant') : t('pollination.addPlant')}
          onPress={handleSubmit}
          disabled={isLoading}
          style={styles.submitButton}
        />
      </View>

      {/* Gourd Type Modal */}
      <Modal
        visible={showGourdTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGourdTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('pollination.selectGourdType')}</Text>
              <TouchableOpacity onPress={() => setShowGourdTypeModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {gourdTypes.map((gourd) => (
              <TouchableOpacity
                key={gourd.value}
                style={styles.modalOption}
                onPress={() => handleGourdTypeChange(gourd.value)}
              >
                <Text style={styles.modalOptionText}>
                  {gourd.icon} {gourd.label}
                </Text>
                {formData.gourdType === gourd.value && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('pollination.selectPlantingDate')}</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              {/* Month Selection */}
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>{t('common.month')}</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {[
                    t('common.january'), t('common.february'), t('common.march'),
                    t('common.april'), t('common.may'), t('common.june'),
                    t('common.july'), t('common.august'), t('common.september'),
                    t('common.october'), t('common.november'), t('common.december')
                  ].map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.dateOption,
                        selectedMonth === index && styles.selectedDateOption
                      ]}
                      onPress={() => setSelectedMonth(index)}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        selectedMonth === index && styles.selectedDateText
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Selection */}
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>{t('common.day')}</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dateOption,
                        selectedDay === day && styles.selectedDateOption
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        selectedDay === day && styles.selectedDateText
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Selection */}
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>{t('common.year')}</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.dateOption,
                        selectedYear === year && styles.selectedDateOption
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        selectedYear === year && styles.selectedDateText
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={[styles.dateButton, styles.cancelDateButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelDateText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dateButton, styles.confirmDateButton]}
                onPress={() => {
                  const newDate = new Date(selectedYear, selectedMonth, selectedDay);
                  if (newDate > new Date()) {
                    Alert.alert(t('common.invalidDate'), t('pollination.dateCannotBeFuture'));
                    return;
                  }
                  handleDateChange(newDate); // This will also update weather data
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.confirmDateText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Image Capture Modal */}
      <ImageCapture
        visible={showImageCapture}
        onClose={() => setShowImageCapture(false)}
        onImageCaptured={handleImageCaptured}
        title={t('pollination.addPlantPhoto')}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  plantInfo: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    marginTop: theme.spacing.xs,
  },
  plantPreviewText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    marginBottom: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  selectorText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  modalOptionText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1,
  },
  textArea: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    height: 100,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  charCount: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
    flex: 0.45,
  },
  submitButton: {
    flex: 0.45,
  },
  // Image styles
  imageContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  plantImage: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.background.secondary,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  // Custom Date Picker Styles
  datePickerContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: theme.spacing.lg,
  },
  dateSection: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  dateSectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  dateScroll: {
    maxHeight: 160,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.small,
  },
  dateOption: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.primary,
    alignItems: 'center',
  },
  selectedDateOption: {
    backgroundColor: theme.colors.primary,
  },
  dateOptionText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  selectedDateText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 0.45,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  cancelDateButton: {
    backgroundColor: theme.colors.background.secondary,
  },
  confirmDateButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelDateText: {
    ...theme.typography.button,
    color: theme.colors.text.secondary,
  },
  confirmDateText: {
    ...theme.typography.button,
    color: '#FFFFFF',
  },
  // New styles for environment settings
  conditionsHint: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    marginTop: theme.spacing.xs,
  },
  conditionsText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envSection: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  envLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  envRow: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  envRowItem: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  optionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  optionButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionButtonText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  optionButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Weather info card styles
  weatherInfoCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  weatherTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  weatherSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  weatherGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  weatherItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  weatherLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontSize: 10,
  },
  soilInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.primary,
  },
  soilText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
});