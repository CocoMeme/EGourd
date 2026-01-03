import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert,
  Modal,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { Button } from '../CustomComponents/Button';
import { ImageCapture } from './ImageCapture';

export const PlantForm = ({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  title = 'Add New Plant',
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || 'ampalaya',
    datePlanted: initialData.datePlanted ? new Date(initialData.datePlanted) : new Date(),
    gender: initialData.gender || 'undetermined',
    notes: initialData.notes?.[0]?.content || ''
  });

  const [showPlantTypeModal, setShowPlantTypeModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Date picker state
  const [selectedYear, setSelectedYear] = useState(formData.datePlanted.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(formData.datePlanted.getMonth());
  const [selectedDay, setSelectedDay] = useState(formData.datePlanted.getDate());

  const plantTypes = [
    { value: 'ampalaya_bilog', english: 'Round Bitter Gourd', tagalog: 'Ampalaya Bilog' },
    { value: 'upo_smooth', english: 'Smooth Bottle Gourd', tagalog: 'Upo Smooth' },
    { value: 'patola', english: 'Sponge Gourd', tagalog: 'Patola' },
    { value: 'cucumber', english: 'Cucumber', tagalog: 'Cucumber' },
  ];

  const genderTypes = [
    { value: 'undetermined', label: 'Not Determined Yet' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ];

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

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.datePlanted) {
      Alert.alert('Missing Information', 'Please fill in plant type and planting date.');
      return;
    }

    // Check if planting date is not in the future
    if (formData.datePlanted > new Date()) {
      Alert.alert('Invalid Date', 'Planting date cannot be in the future.');
      return;
    }

    // Prepare data for submission
    const submissionData = {
      name: formData.name,
      datePlanted: formData.datePlanted.toISOString(),
      gender: formData.gender,
      // Only include notes if provided
      notes: formData.notes.trim() || undefined,
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

  const selectedPlant = plantTypes.find(plant => plant.value === formData.name);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Plant Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant Type</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowPlantTypeModal(true)}
        >
          <Text style={styles.selectorText}>
            {selectedPlant?.english} ({selectedPlant?.tagalog})
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Date Planted */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date Planted</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowDatePicker(true)}
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

      {/* Gender */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant Gender</Text>
        <Text style={styles.sectionSubtitle}>
          You can update this later when flowers appear
        </Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowGenderModal(true)}
        >
          <Text style={styles.selectorText}>
            {genderTypes.find(g => g.value === formData.gender)?.label}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Initial Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Initial Notes (Optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Add any observations about the planting..."
          value={formData.notes}
          onChangeText={(value) => handleInputChange('notes', value)}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {formData.notes.length}/500 characters
        </Text>
      </View>

      {/* Plant Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant Photo (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          Add a photo to track your plant's growth
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
            {capturedImage ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submit Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onCancel}
          style={styles.cancelButton}
        />
        <Button
          title={initialData.name ? 'Update Plant' : 'Add Plant'}
          onPress={handleSubmit}
          disabled={isLoading}
          style={styles.submitButton}
        />
      </View>

      {/* Plant Type Modal */}
      <Modal
        visible={showPlantTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlantTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Plant Type</Text>
              <TouchableOpacity onPress={() => setShowPlantTypeModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {plantTypes.map((plant) => (
              <TouchableOpacity
                key={plant.value}
                style={styles.modalOption}
                onPress={() => {
                  handleInputChange('name', plant.value);
                  setShowPlantTypeModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>
                  {plant.english} ({plant.tagalog})
                </Text>
                {formData.name === plant.value && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Plant Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {genderTypes.map((gender) => (
              <TouchableOpacity
                key={gender.value}
                style={styles.modalOption}
                onPress={() => {
                  handleInputChange('gender', gender.value);
                  setShowGenderModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{gender.label}</Text>
                {formData.gender === gender.value && (
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
              <Text style={styles.modalTitle}>Select Planting Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              {/* Month Selection */}
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>Month</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
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
                <Text style={styles.dateSectionTitle}>Day</Text>
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
                <Text style={styles.dateSectionTitle}>Year</Text>
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
                <Text style={styles.cancelDateText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dateButton, styles.confirmDateButton]}
                onPress={() => {
                  const newDate = new Date(selectedYear, selectedMonth, selectedDay);
                  if (newDate > new Date()) {
                    Alert.alert('Invalid Date', 'Planting date cannot be in the future.');
                    return;
                  }
                  handleInputChange('datePlanted', newDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.confirmDateText}>Confirm</Text>
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
        title="Add Plant Photo"
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
});