// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaView: jest.fn(({ children }) => children),
    useSafeAreaInsets: jest.fn(() => inset),
    SafeAreaConsumer: jest.fn(({ children }) => children(inset)),
  };
});

// Mock Expo Linear Gradient
jest.mock('expo-linear-gradient', () => {
  return {
    LinearGradient: jest.fn(({ children }) => children),
  };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: 'Ionicons',
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Google Sign-In native module
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
    hasPlayServices: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));
