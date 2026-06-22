import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

export const TipCard = ({ tip, onDismiss, onNext }) => {
  const { t } = useTranslation();
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [tip]);

  if (!tip) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[theme.colors.secondary + '20', theme.colors.secondary + '10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.accentBar} />
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[theme.colors.secondary, '#c9c940']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="bulb-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.title}>{t('home.proTip')}</Text>
          </View>
          {onDismiss && (
            <TouchableOpacity 
              onPress={onDismiss} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.tipText}>{tip}</Text>
        
        {onNext && (
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>{t('home.nextTip')}</Text>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.secondary} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.large,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  gradient: {
    padding: theme.spacing.md,
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: theme.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  tipText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginLeft: 40,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    marginLeft: 40,
    paddingVertical: theme.spacing.xs,
  },
  nextButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.secondary,
    marginRight: 4,
  },
});
