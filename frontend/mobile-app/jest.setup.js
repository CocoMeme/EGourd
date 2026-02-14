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
