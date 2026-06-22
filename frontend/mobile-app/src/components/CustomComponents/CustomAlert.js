import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

export const CustomAlert = ({
  visible,
  onClose,
  title,
  message,
  type = 'info', // 'success', 'error', 'info', 'warning'
  buttons = [],
  autoCloseDuration = 7000, // milliseconds (7 seconds default)
}) => {
  const { t } = useTranslation();
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [scaleAnim] = React.useState(new Animated.Value(0.8));
  const [timerAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    if (visible) {
      // Reset timer animation
      timerAnim.setValue(1);
      
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Start timer animation (only if no buttons, auto-close)
      if (buttons.length === 0) {
        Animated.timing(timerAnim, {
          toValue: 0,
          duration: autoCloseDuration,
          useNativeDriver: false,
        }).start();

        // Auto-close after duration
        const timer = setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, autoCloseDuration);

        return () => clearTimeout(timer);
      }
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle',
          color: theme.colors.primary,
          gradientColors: [theme.colors.primary, '#4a8a3f'],
        };
      case 'error':
        return {
          name: 'close-circle',
          color: theme.colors.error,
          gradientColors: ['#e74c3c', '#c0392b'],
        };
      case 'warning':
        return {
          name: 'warning',
          color: theme.colors.secondary,
          gradientColors: [theme.colors.secondary, '#c9c940'],
        };
      default:
        return {
          name: 'information-circle',
          color: theme.colors.info,
          gradientColors: [theme.colors.info, '#2874a6'],
        };
    }
  };

  const iconConfig = getIconConfig();

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Timer Progress Bar */}
          {buttons.length === 0 && (
            <Animated.View
              style={[
                styles.timerBar,
                {
                  width: timerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={iconConfig.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timerGradient}
              />
            </Animated.View>
          )}

          {/* Header with Icon and Title */}
          <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
              <LinearGradient
                colors={iconConfig.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons
                  name={iconConfig.name}
                  size={32}
                  color="#FFFFFF"
                />
              </LinearGradient>
              <Text style={styles.title}>{title}</Text>
            </View>
            
            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.length === 0 ? (
              <TouchableOpacity
                onPress={onClose}
                style={styles.singleButton}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#4a8a3f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{t('common.ok')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  style={[
                    styles.multiButton,
                    button.style === 'cancel' && styles.cancelButton,
                  ]}
                >
                  {button.style === 'cancel' ? (
                    <View style={styles.cancelButtonInner}>
                      <Text style={styles.cancelButtonText}>{button.text}</Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={[theme.colors.primary, '#4a8a3f']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>{button.text}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.large,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  timerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    zIndex: 10,
    borderTopLeftRadius: theme.borderRadius.large,
    borderTopRightRadius: theme.borderRadius.large,
  },
  timerGradient: {
    flex: 1,
    height: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    textAlign: 'left',
  },
  message: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  singleButton: {
    flex: 1,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
  multiButton: {
    flex: 1,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.text.secondary,
  },
  buttonGradient: {
    paddingVertical: theme.spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonInner: {
    paddingVertical: theme.spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.secondary,
  },
});
