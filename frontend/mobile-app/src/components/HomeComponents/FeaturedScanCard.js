import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

export const FeaturedScanCard = ({ onPress }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[theme.colors.primary, '#4a8a3f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{t('home.startScanning')}</Text>
            <Text style={styles.subtitle}>
              {t('home.analyzeRipeness')}
            </Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name="camera-outline" size={40} color="#FFFFFF" />
          </View>
        </View>
        
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  gradient: {
    padding: theme.spacing.md,
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -15,
    left: 30,
  },
});
