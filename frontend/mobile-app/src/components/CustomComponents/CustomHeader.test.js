import React from 'react';
import { render } from '@testing-library/react-native';
import { CustomHeader } from './CustomHeader';

// Mock StatusBar specifically
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => 'StatusBar');

// Mock theme to avoid undefined issues
jest.mock('../../styles', () => ({
  theme: {
    colors: {
      gradient: { start: '#000', end: '#fff' },
      surface: '#fff',
      background: { secondary: '#ccc' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    fonts: { regular: 'System', semiBold: 'System', bold: 'System' },
    borderRadius: { medium: 8 },
  },
}));

// Mock react-i18next to prevent test breakage when translation values change
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'customHeader.goodDay': 'Good day,',
        'customHeader.user': 'User',
        'customHeader.guest': 'Guest',
        'customHeader.welcome': 'Welcome',
        'customHeader.back': 'Back',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

describe('CustomHeader', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<CustomHeader title="Test Title" />);
    expect(getByText('Test Title')).toBeTruthy();
  });

  it('renders user initials when no profile picture', () => {
    const user = { firstName: 'John' };
    const { getByText } = render(<CustomHeader user={user} />);
    expect(getByText('J')).toBeTruthy();
    expect(getByText('John')).toBeTruthy();
  });

  it('renders default greeting when no user is provided', () => {
    const { getByText } = render(<CustomHeader />);
    expect(getByText('Good day,')).toBeTruthy();
    expect(getByText('User')).toBeTruthy();
  });
});
