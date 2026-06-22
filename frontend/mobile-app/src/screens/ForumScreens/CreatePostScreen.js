import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  PanResponder,
  Dimensions,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../styles';
import { forumService } from '../../services';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.95;

const CreatePostScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { onPostCreated } = route.params || {};
  const { t } = useTranslation();
  
  const translateY = useRef(new Animated.Value(0)).current;
  const lastGestureDy = useRef(0);
  
  const [selectedCategory, setSelectedCategory] = useState('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dy } = gestureState;
        return dy > 5; // Only respond to downward swipes
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          // Swipe down to close
          Animated.timing(translateY, {
            toValue: DRAWER_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => navigation.goBack());
        } else {
          // Reset to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const categories = [
    { id: 'tips', label: t('forum.categories.tips'), icon: 'bulb-outline', color: theme.colors.success },
    { id: 'questions', label: t('forum.categories.qa'), icon: 'help-circle-outline', color: theme.colors.info },
    { id: 'showcase', label: t('forum.categories.showcase'), icon: 'image-outline', color: theme.colors.warning },
    { id: 'discussion', label: t('forum.categories.discussion'), icon: 'chatbubbles-outline', color: theme.colors.primary },
  ];

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert(t('forum.missingTitle'), t('forum.missingTitleMessage'));
      return;
    }

    if (!content.trim()) {
      Alert.alert(t('forum.missingContent'), t('forum.missingContentMessage'));
      return;
    }

    if (title.length < 5) {
      Alert.alert(t('forum.titleTooShort'), t('forum.titleTooShortMessage'));
      return;
    }

    if (content.length < 10) {
      Alert.alert(t('forum.contentTooShort'), t('forum.contentTooShortMessage'));
      return;
    }

    setLoading(true);

    try {
      // Parse tags
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 5); // Max 5 tags

      const postData = {
        category: selectedCategory,
        title: title.trim(),
        content: content.trim(),
        tags: tagArray,
      };

      // Add images if present
      if (images.length > 0) {
        postData.images = images;
      }

      const response = await forumService.createPost(postData);

      if (response.success) {
        Alert.alert(
          t('forum.postSuccess'),
          t('forum.postSuccessMessage'),
          [
            {
              text: 'OK',
              onPress: () => {
                if (onPostCreated) {
                  onPostCreated();
                }
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(t('forum.postFailed'), response.message || t('forum.postFailed'));
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(t('forum.postFailed'), t('forum.postFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert(t('forum.maxImages'), t('forum.maxImagesMessage'));
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('forum.permissionRequired'), t('forum.permissionRequiredMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        
        // Create image object with base64 data
        const imageData = {
          url: result.assets[0].uri,
          base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
        };
        
        setImages([...images, imageData]);
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('errors.generic'), t('forum.failedToPickImage'));
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="rgba(0,0,0,0.5)" 
        translucent={true} 
      />
      
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />
      
      {/* Drawer */}
      <Animated.View 
        style={[
          styles.drawer,
          {
            transform: [{ translateY }],
          },
        ]}
      >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Drag Handle & Header - Combined draggable area */}
        <View {...panResponder.panHandlers}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('forum.createPostTitle')}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t('forum.post')}</Text>
            )}
          </TouchableOpacity>
        </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category Selection - Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('forum.category')} *</Text>
            <Text style={styles.hint}>{t('forum.categoryDesc')}</Text>
            <View style={styles.categoryDropdownWrapper}>
              <TouchableOpacity 
                style={styles.categoryDropdown}
                onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryDropdownContent}>
                  <Ionicons
                    name={categories.find(c => c.id === selectedCategory)?.icon || 'apps-outline'}
                    size={20}
                    color={categories.find(c => c.id === selectedCategory)?.color || theme.colors.primary}
                  />
                  <Text style={styles.categoryDropdownText}>
                    {categories.find(c => c.id === selectedCategory)?.label || t('forum.category')}
                  </Text>
                </View>
                <Ionicons 
                  name={categoryDropdownVisible ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.colors.text.secondary} 
                />
              </TouchableOpacity>

              {/* Category Dropdown List - Absolute positioned */}
              {categoryDropdownVisible && (
                <View style={styles.dropdownList}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.dropdownListItem,
                        selectedCategory === category.id && styles.dropdownListItemSelected
                      ]}
                      onPress={() => {
                        setSelectedCategory(category.id);
                        setCategoryDropdownVisible(false);
                      }}
                    >
                      <View style={styles.dropdownListItemContent}>
                        <View style={[styles.dropdownListIconContainer, { backgroundColor: category.color + '15' }]}>
                          <Ionicons
                            name={category.icon}
                            size={20}
                            color={category.color}
                          />
                        </View>
                        <Text style={[
                          styles.dropdownListItemText,
                          selectedCategory === category.id && { color: category.color, fontFamily: theme.fonts.bold }
                        ]}>
                          {category.label}
                        </Text>
                      </View>
                      {selectedCategory === category.id && (
                        <Ionicons name="checkmark-circle" size={22} color={category.color} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('forum.title')} *</Text>
            <Text style={styles.hint}>{t('forum.titleDesc')}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder={t('forum.titlePlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              multiline
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Content Input */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('forum.content')} *</Text>
            <Text style={styles.hint}>{t('forum.contentDesc')}</Text>
            <TextInput
              style={styles.contentInput}
              placeholder={t('forum.contentPlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={content}
              onChangeText={setContent}
              maxLength={2000}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length}/2000</Text>
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('forum.images')} ({t('common.optional')})</Text>
            <Text style={styles.hint}>{t('forum.imagesDesc')}</Text>
            
            {/* Image Gallery */}
            {images.length > 0 && (
              <View style={styles.imagesGallery}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: img.url }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removeImageButton} 
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={28} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Image Button */}
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.imagePickerButton} 
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color={theme.colors.primary} />
                    <Text style={styles.imagePickerText}>
                      {images.length === 0 ? t('forum.tapToAddImages') : `${t('forum.addMore')} (${images.length}/5)`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Tags Input */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('forum.tags')}</Text>
            <Text style={styles.hint}>{t('forum.tagsDesc')}</Text>
            <TextInput
              style={styles.tagsInput}
              placeholder={t('forum.tagsPlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={tags}
              onChangeText={setTags}
              autoCapitalize="none"
            />
            {tags.trim() && (
              <View style={styles.tagsPreview}>
                {tags.split(',').filter(t => t.trim()).slice(0, 5).map((tag, index) => (
                  <View key={index} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{tag.trim().toLowerCase()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} />
            <View style={styles.guidelinesContent}>
              <Text style={styles.guidelinesTitle}>{t('forum.guidelinesReminder')}</Text>
              <Text style={styles.guidelinesText}>
                {t('forum.guidelinesText')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    height: DRAWER_HEIGHT,
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  handleContainer: {
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.secondary + '40',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    height: 36,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    minHeight: 56,
  },
  categoryDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDropdownText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  categoryDropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownList: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1001,
  },
  dropdownListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  dropdownListItemSelected: {
    backgroundColor: theme.colors.background.secondary,
  },
  dropdownListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownListIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  dropdownListItemText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
  },
  titleInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
    minHeight: 60,
    maxHeight: 100,
  },
  contentInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
    minHeight: 200,
    maxHeight: 300,
  },
  tagsInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
    height: 48,
  },
  imagePickerButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 2,
    borderColor: theme.colors.primary + '40',
    borderStyle: 'dashed',
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  imagesGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    width: '48%',
    margin: 4,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background.secondary,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
  },
  charCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  tagChip: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  guidelinesBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.info + '30',
  },
  guidelinesContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  guidelinesText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
});

CreatePostScreen.routeName = 'CreatePost';
export default CreatePostScreen;
