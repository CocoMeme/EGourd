import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';

/**
 * CircularProgress — pure RN animated donut ring, no SVG dependency.
 * @param {number} value - Progress value 0–100
 * @param {string} color - Ring fill color
 * @param {number} size - Outer diameter in pixels (default 60)
 * @param {string} backgroundColor - Inner circle background color (default '#FFF')
 * @param {React.ReactNode} children - Content rendered inside the inner circle
 */
const CircularProgress = ({ value, color, size = 60, backgroundColor = '#FFF', children }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [clamped]);

  const bw = Math.max(5, Math.round(size * 0.09));
  const innerSize = size - bw * 2;

  const rightRotate = animatedProgress.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '0deg', '0deg'],
  });
  const leftRotate = animatedProgress.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '-180deg', '0deg'],
  });

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      {/* Track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderWidth: bw,
          borderColor: '#E8E8E8',
          borderRadius: size / 2,
        }}
      />
      {/* Right half */}
      <View style={{ position: 'absolute', width: size / 2, height: size, right: 0, overflow: 'hidden' }}>
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: bw,
            borderColor: color,
            position: 'absolute',
            right: 0,
            transform: [{ rotate: rightRotate }],
          }}
        />
      </View>
      {/* Left half */}
      <View style={{ position: 'absolute', width: size / 2, height: size, left: 0, overflow: 'hidden' }}>
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: bw,
            borderColor: color,
            position: 'absolute',
            left: 0,
            transform: [{ rotate: leftRotate }],
          }}
        />
      </View>
      {/* Inner circle */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
};

export default CircularProgress;
