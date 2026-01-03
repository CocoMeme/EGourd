import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../styles';
import { plantService } from '../../services';
import { PlantForm } from '../../components';

export const PlantFormScreen = ({ navigation, route }) => {
  const { plant, mode = 'create', title } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        // Extract image from formData before sending
        const { image, ...plantData } = formData;
        
        // Create the plant first
        const response = await plantService.createPlant(plantData);
        const newPlant = response.data;
        const prediction = newPlant?.flowering;
        
        // If an image was captured, upload it to the newly created plant
        if (image && newPlant?._id) {
          try {
            await plantService.uploadImage(newPlant._id, image.uri, 'Plant photo');
          } catch (imageError) {
            console.warn('Image upload failed:', imageError);
            // Don't fail the whole operation if image upload fails
          }
        }
        
        let successMessage = 'Plant added successfully!';
        if (prediction?.predictedDaysToFlower) {
          successMessage += `\n\n🌸 Flowering Prediction: ~${prediction.predictedDaysToFlower} days`;
          if (prediction.predictedFloweringDate) {
            successMessage += `\n📅 Expected Date: ${new Date(prediction.predictedFloweringDate).toLocaleDateString()}`;
          }
        }
        
        Alert.alert(
          'Success',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // Extract image from formData for updates too
        const { image, ...plantData } = formData;
        
        await plantService.updatePlant(plant._id, plantData);
        
        // If a new image was captured during edit, upload it
        if (image && plant?._id) {
          try {
            await plantService.uploadImage(plant._id, image.uri, 'Plant photo');
          } catch (imageError) {
            console.warn('Image upload failed:', imageError);
          }
        }
        
        Alert.alert(
          'Success',
          'Plant updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving plant:', error);
      
      let errorMessage = 'An error occurred while saving the plant.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(e => e.message).join('\n');
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <PlantForm
          initialData={plant}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          title={title || (mode === 'create' ? 'Add New Plant' : 'Edit Plant')}
          isLoading={isLoading}
        />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  content: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});