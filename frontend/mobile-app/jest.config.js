module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@google/generative-ai|react-native-safe-area-context|expo-linear-gradient|expo-camera|@react-native-async-storage/async-storage|react-native-paper|react-native-screens|react-native-gesture-handler|react-native-reanimated)',
  ],
  setupFiles: ['./jest.setup.js'],
};
