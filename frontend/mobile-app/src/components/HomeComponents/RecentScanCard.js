import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

export const RecentScanCard = ({ 
  imageUri, 
  result, 
  date, 
  confidence, 
  name, 
  gender,
  onPress,
  onDelete,
  style 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeThreshold = -80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate for horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < swipeThreshold) {
          // Swipe far enough - snap to open
          Animated.spring(translateX, {
            toValue: swipeThreshold,
            useNativeDriver: true,
            tension: 50,
          }).start();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
          }).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    // Animate out and call delete
    Animated.timing(translateX, {
      toValue: -400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDelete?.();
    });
  };

  const getGenderConfig = (genderStr) => {
    const lower = genderStr?.toLowerCase() || '';
    if (lower === 'female') {
      return {
        color: theme.colors.primary,
        icon: 'female',
      };
    }
    if (lower === 'male') {
      return {
        color: theme.colors.info,
        icon: 'male',
      };
    }
    return {
      color: theme.colors.text.secondary,
      icon: 'help-circle',
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const genderConfig = getGenderConfig(gender);
  
  const getFormattedConfidence = (val) => {
    if (val == null) return null;
    const num = Number(val);
    const percentage = num <= 1 ? num * 100 : num;
    return `${Math.round(percentage)}%`;
  };

  const formattedConfidence = getFormattedConfidence(confidence);

  return (
    <View style={[styles.wrapper, style]}>
      {/* Delete Button Behind */}
      <View style={styles.deleteContainer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Main Card */}
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.innerContainer}
          onPress={onPress} 
          activeOpacity={0.7}
        >
          {/* Image */}
          <View style={styles.imageContainer}>
            {imageUri ? (
              <>
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.image}
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                />
                {isLoading && (
                  <View style={[styles.image, styles.loadingOverlay]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={20} color={theme.colors.text.secondary} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.nameText} numberOfLines={1}>
              {name || result || 'Unnamed Scan'}
            </Text>
            
            <View style={styles.metaRow}>
              {/* Gender Badge */}
              <View style={[styles.genderBadge, { borderColor: genderConfig.color }]}>
                <Ionicons name={genderConfig.icon} size={12} color={genderConfig.color} />
              </View>

              {/* Confidence */}
              {formattedConfidence && (
                <Text style={styles.confidenceText}>{formattedConfidence}</Text>
              )}

              {/* Date */}
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    borderRadius: 12,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  deleteText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    marginTop: 2,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  innerContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  imageContainer: {
    marginRight: 10,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  nameText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 10,
    fontFamily: theme.fonts.medium,
  },
  confidenceText: {
    fontSize: 11,
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.semiBold,
  },
  dateText: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginLeft: 'auto',
  },
});
