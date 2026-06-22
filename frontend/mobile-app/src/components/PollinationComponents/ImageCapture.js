import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator,
  Modal 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';
import { Button } from '../CustomComponents/Button';

export const ImageCapture = ({ 
  onImageCaptured, 
  visible, 
  onClose,
  title,
  imageType = 'general'
}) => {
  const { t } = useTranslation();
  const captureTitle = title || t('common.addPhoto');
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = React.useRef(null);

  const requestCameraPermission = async () => {
    if (!permission) {
      const response = await requestPermission();
      return response.granted;
    }
    return permission.granted;
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const handleCameraCapture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        t('imageCapture.cameraPermissionTitle'),
        t('imageCapture.cameraPermissionMessage'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    setShowCamera(true);
  };

  const handleGalleryPick = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert(
        t('imageCapture.galleryPermissionTitle'),
        t('imageCapture.galleryPermissionMessage'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setIsProcessing(true);
    try {
      console.log('📸 Opening gallery picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ImagePicker.MediaType?.Images || 'Images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📸 Gallery result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 Selected image asset:', asset);
        
        // Get the file extension from the URI or use jpg as default
        let fileExtension = 'jpg';
        if (asset.uri) {
          const uriParts = asset.uri.split('.');
          if (uriParts.length > 1) {
            fileExtension = uriParts[uriParts.length - 1].toLowerCase();
          }
        }
        
        // Ensure proper mime type
        let mimeType = 'image/jpeg';
        if (fileExtension === 'png') mimeType = 'image/png';
        else if (fileExtension === 'jpg' || fileExtension === 'jpeg') mimeType = 'image/jpeg';
        
        const imageData = {
          uri: asset.uri,
          type: mimeType,
          name: asset.fileName || `plant_${imageType}_${Date.now()}.${fileExtension}`
        };
        
        console.log('📸 Processed image data for gallery:', imageData);
        setCapturedImage(imageData);
      } else {
        console.log('📸 Gallery selection canceled or no asset');
      }
    } catch (error) {
      console.error('❌ Gallery pick error:', error);
      Alert.alert(t('common.error'), t('imageCapture.galleryError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      console.log('📸 Camera photo captured:', photo);

      setCapturedImage({
        uri: photo.uri,
        type: 'image/jpeg',
        name: `plant_${imageType}_${Date.now()}.jpg`
      });
      setShowCamera(false);
    } catch (error) {
      console.error('❌ Camera capture error:', error);
      Alert.alert(t('common.error'), t('imageCapture.captureError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageConfirm = () => {
    if (capturedImage) {
      onImageCaptured(capturedImage);
      setCapturedImage(null);
      onClose();
    }
  };

  const handleImageRetake = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  const handleClose = () => {
    setCapturedImage(null);
    setShowCamera(false);
    onClose();
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (showCamera && visible) {
    return (
      <Modal visible={visible && showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView 
            style={styles.camera} 
            facing={facing}
            ref={cameraRef}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity 
                  style={styles.cameraButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={30} color="#FFFFFF" />
                </TouchableOpacity>
                
                <Text style={styles.cameraTitle}>{captureTitle}</Text>
                
                <TouchableOpacity 
                  style={styles.cameraButton}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.cameraFooter}>
                <TouchableOpacity 
                  style={styles.captureButton}
                  onPress={takePicture}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <View style={styles.captureButtonInner} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {capturedImage ? (
            // Image Preview
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>{t('imageCapture.photoPreview')}</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} />
              
              <View style={styles.previewActions}>
                <Button
                  title={t('imageCapture.retake')}
                  variant="outline"
                  onPress={handleImageRetake}
                  style={styles.previewButton}
                />
                <Button
                  title={t('imageCapture.usePhoto')}
                  onPress={handleImageConfirm}
                  style={styles.previewButton}
                />
              </View>
            </View>
          ) : (
            // Image Source Selection
            <View style={styles.optionsContainer}>
              <View style={styles.optionsHeader}>
                <Text style={styles.optionsTitle}>{captureTitle}</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.optionsSubtitle}>
                {t('imageCapture.chooseHow')}
              </Text>

              <View style={styles.optionsList}>
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleCameraCapture}
                  disabled={isProcessing}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="camera" size={32} color={theme.colors.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{t('imageCapture.takePhoto')}</Text>
                    <Text style={styles.optionDescription}>
                      {t('imageCapture.takePhotoDescription')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleGalleryPick}
                  disabled={isProcessing}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="images" size={32} color={theme.colors.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{t('imageCapture.chooseFromGallery')}</Text>
                    <Text style={styles.optionDescription}>
                      {t('imageCapture.chooseFromGalleryDescription')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {isProcessing && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>{t('imageCapture.processing')}</Text>
                </View>
              )}

              <Button
                title={t('common.cancel')}
                variant="outline"
                onPress={handleClose}
                style={styles.cancelButton}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    width: '90%',
    maxHeight: '80%',
  },
  
  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: theme.spacing.md,
  },
  cameraTitle: {
    ...theme.typography.h3,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cameraButton: {
    padding: theme.spacing.sm,
  },
  cameraFooter: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },

  // Options styles
  optionsContainer: {
    padding: theme.spacing.lg,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  optionsTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  optionsSubtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  optionsList: {
    marginBottom: theme.spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },

  // Preview styles
  previewContainer: {
    padding: theme.spacing.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  previewTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.lg,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewButton: {
    flex: 0.45,
  },

  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  cancelButton: {
    marginTop: theme.spacing.sm,
  },
});