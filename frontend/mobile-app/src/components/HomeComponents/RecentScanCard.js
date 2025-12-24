import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

export const RecentScanCard = ({ imageUri, result, date, confidence, onPress }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getStatusConfig = (result) => {
    const lowerResult = result?.toLowerCase() || '';
    if (lowerResult.includes('ready') || lowerResult.includes('female')) {
      return {
        color: theme.colors.primary,
        backgroundColor: 'rgba(85, 156, 73, 0.1)',
        icon: 'female',
        label: 'Female'
      };
    }
    if (lowerResult.includes('male')) {
      return {
        color: theme.colors.info,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        icon: 'male',
        label: 'Male'
      };
    }
    if (lowerResult.includes('almost')) {
      return {
        color: theme.colors.secondary,
        backgroundColor: 'rgba(222, 222, 80, 0.15)',
        icon: 'time',
        label: 'Pending'
      };
    }
    return {
      color: theme.colors.text.secondary,
      backgroundColor: theme.colors.background.secondary,
      icon: 'help-circle',
      label: 'Unknown'
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
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const status = getStatusConfig(result);
  
  const getFormattedConfidence = (val) => {
    if (val == null) return null;
    const num = Number(val);
    // If value is <= 1 (e.g., 0.95), treat as decimal fraction -> 95%
    // If value is > 1 (e.g., 95), treat as percentage -> 95%
    const percentage = num <= 1 ? num * 100 : num;
    return `${Math.round(percentage)}%`;
  };

  const formattedConfidence = getFormattedConfidence(confidence);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
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
            <Ionicons name="image-outline" size={24} color={theme.colors.text.secondary} />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.resultText} numberOfLines={1}>
            {result || 'Unknown Scan'}
          </Text>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        </View>
        
        <View style={styles.footerRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          
          {formattedConfidence && (
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <Text style={styles.confidenceValue}>{formattedConfidence}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.profile.card.borderRadius,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.profile.card.shadowOpacity,
    shadowRadius: theme.profile.card.shadowRadius,
    elevation: theme.profile.card.elevation,
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
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
    borderRadius: 12,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontFamily: theme.fonts.regular,
  },
  confidenceValue: {
    fontSize: 12,
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.semiBold,
  },
});
