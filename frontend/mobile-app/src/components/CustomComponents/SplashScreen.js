import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish, isUpdating = false }) => {
  const [showSecondLogo, setShowSecondLogo] = useState(false);
  const firstLogoFade = useRef(new Animated.Value(1)).current;
  const secondLogoFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  // Animation for updating text
  const updateTextOpacity = useRef(new Animated.Value(0)).current;

  // Blinking effect for update text
  useEffect(() => {
    if (isUpdating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(updateTextOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(updateTextOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      updateTextOpacity.setValue(0);
    }
  }, [isUpdating]);

  useEffect(() => {
    if (isUpdating) return; // Don't run finish animation while updating

    // Animation sequence
    Animated.sequence([
      // Scale up the first logo
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Wait for a moment
      Animated.delay(1200),
      // Fade out first logo
      Animated.timing(firstLogoFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
      ]).start(() => {
        // Call onFinish when animation completes
        if (onFinish) {
          onFinish();
        }
      });
    });
  }, [firstLogoFade, secondLogoFade, scaleAnim, onFinish, isUpdating]);

  return (
    <View style={styles.container}>
      {isUpdating && (
        <Animated.View style={[styles.updateContainer, { opacity: updateTextOpacity }]}>
           <Image
            source={require('../../../assets/logo/egourd-high-resolution-logo-transparent.png')}
            style={styles.updateLogo}
            resizeMode="contain"
          />
          <Animated.Text style={styles.updateText}>
            Updating EGourd...
          </Animated.Text>
        </Animated.View>
      )}

      {(!showSecondLogo && !isUpdating) && (
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
  updateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20
  },
  updateText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 20
  },
  updateLogo: {
    width: 100,
    height: 100,
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
});

export default SplashScreen;