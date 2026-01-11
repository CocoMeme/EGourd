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

const SplashScreen = ({ onFinish, updateStatus = 'idle' }) => {
  const [showSecondLogo, setShowSecondLogo] = useState(false);
  
  // Internal state for update text display, to handle the sequence visually
  const [displayedStatus, setDisplayedStatus] = useState(updateStatus);

  const firstLogoFade = useRef(new Animated.Value(1)).current;
  const secondLogoFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Fake progress bar animation for indeterminate state
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Sync internal display status with prop, but with logic
  useEffect(() => {
    // If we moved from checking -> idle, show "No updates" for a bit?
    // Actually, updateStatus logic in useAppResources transitions checking -> idle instantly if no update.
    // We want the user to SEE "Checking..." then "No updates" then proceed.
    // So we might need to artifically ensure "Checking" is shown.
    
    // Simple pass-through for now, refined below
    setDisplayedStatus(updateStatus);
  }, [updateStatus]);

  // Infinite progress bar animation loop
  useEffect(() => {
    if (displayedStatus === 'downloading') {
         Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
                Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false })
            ])
         ).start();
    } else {
        progressAnim.setValue(0);
    }
  }, [displayedStatus]);

  useEffect(() => {
    const isUpdating = updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'complete';
    
    if (isUpdating) {
       // While updating, lock visuals to first logo
       firstLogoFade.setValue(1);
       secondLogoFade.setValue(0);
       return; 
    }

    // Normal Sequence (or Resume after update check finished with 'idle')
    
    // If we just finished checking and are now idle, we might want to delay slightly to show "No updates"?
    // But let's follow the standard animation flow now.
    
    // Animation sequence
    Animated.sequence([
      // Scale up the first logo
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Maintain first logo for longer (Minimum 3 seconds total)
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
  }, [firstLogoFade, secondLogoFade, scaleAnim, onFinish, updateStatus]);

  const getStatusText = () => {
      switch (displayedStatus) {
          case 'checking': return 'Checking for updates...';
          case 'downloading': return 'Updating EGourd...';
          case 'complete': return 'Download complete';
          case 'idle': return 'Starting up...';
          default: return '';
      }
  };

  const isUpdating = updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'complete';

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

      {/* Update/Loading Status - Bottom Left */}
      {(isUpdating) && (
        <Animated.View style={[styles.bottomLeftContainer, { opacity: firstLogoFade }]}>
             {displayedStatus === 'checking' && <ActivityIndicator size="small" color="#2E7D32" />}
             
             <View style={{justifyContent: 'center'}}>
                 <Text style={styles.updateText}>{getStatusText()}</Text>
                 
                 {/* Bar Animation for downloading */}
                 {displayedStatus === 'downloading' && (
                     <View style={{height: 3, width: 100, backgroundColor: '#E0E0E0', marginTop: 4, borderRadius: 2, overflow: 'hidden'}}>
                         <Animated.View style={{
                             height: '100%', 
                             backgroundColor: '#2E7D32',
                             width: '30%', // Moving block size
                             transform: [{
                                 translateX: progressAnim.interpolate({
                                     inputRange: [0, 1],
                                     outputRange: [-30, 100] // Move from left to right
                                 })
                             }]
                         }}/>
                     </View>
                 )}
             </View>
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