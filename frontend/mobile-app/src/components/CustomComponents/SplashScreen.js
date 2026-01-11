import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish, isUpdating = false }) => {
  const [showSecondLogo, setShowSecondLogo] = useState(false);
  const firstLogoFade = useRef(new Animated.Value(1)).current;
  const secondLogoFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isUpdating) {
       // If updating, ensure first logo stays visible and second logo hidden
       firstLogoFade.setValue(1);
       secondLogoFade.setValue(0);
       return; 
    }

    // Animation sequence
    Animated.sequence([
      // Scale up the first logo
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Maintain first logo for longer (Minimum 3 seconds total: 800 + 2200 = 3000ms)
      Animated.delay(2200),
      // Fade out first logo
      Animated.timing(firstLogoFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        // Switch to second logo
        setShowSecondLogo(true);
        
        // Animate second logo
        Animated.sequence([
          // Fade in second logo
          Animated.timing(secondLogoFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          // Wait for a moment
          Animated.delay(1200),
          // Fade out second logo
          Animated.timing(secondLogoFade, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(({ finished: finishedSecond }) => {
             if (finishedSecond && onFinish) {
                 onFinish();
             }
        });
      }
    });
  }, [firstLogoFade, secondLogoFade, scaleAnim, onFinish, isUpdating]);

  return (
    <View style={styles.container}>
      {/* First Logo */}
      {(!showSecondLogo || isUpdating) && (
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: firstLogoFade,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/logo/egourd-high-resolution-logo-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Second Logo */}
      {(showSecondLogo && !isUpdating) && (
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: secondLogoFade,
            },
          ]}
        >
          <Image
            source={require('../../../assets/logo/egourd-high-resolution-logo-name-transparent.png')}
            style={styles.logoWithName}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Update/Loading Status - Always visible during first logo phase */}
      {(!showSecondLogo || isUpdating) && (
        <Animated.View style={[styles.bottomLeftContainer, { opacity: firstLogoFade }]}>
             <Text style={styles.updateText}>EGourd Updating</Text>
             <ActivityIndicator size="small" color="#2E7D32" />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  logo: {
    width: 150,
    height: 150,
  },
  logoWithName: {
    width: 250,
    height: 150,
  },
  // Bottom Left Indicator
  bottomLeftContainer: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default SplashScreen;