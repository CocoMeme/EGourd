export const theme = {
  colors: {
    primary: '#559c49',
    secondary: '#dede50',
    accent: '#FF5722',
    background: {
      primary: '#FFFFFF',
      secondary: '#F5F5F5',
    },
    surface: '#FFFFFF',
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    error: '#F44336',
    success: '#559c49',
    warning: '#FF9800',
    info: '#2196F3',
    gradient: {
      start: '#559c49',
      end: '#dede50',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 16,
  },
  profile: {
    card: {
      borderRadius: 8, // theme.borderRadius.medium
      margin: 16, // theme.spacing.md
      padding: 16, // theme.spacing.md
      elevation: 2,
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    item: {
      paddingVertical: 16, // theme.spacing.md
      fontSize: 14,
      descriptionSize: 12,
      valueSize: 14,
    },
    icon: {
      size: 36,
      borderRadius: 6,
      background: 'rgba(85, 156, 73, 0.1)',
    },
    badge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
      fontSize: 10,
    },
    button: {
      height: 48,
      borderRadius: 8,
      fontSize: 14,
      letterSpacing: 0.5,
    }
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
  fonts: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: 'bold',
      fontFamily: 'Poppins_700Bold',
    },
    h2: {
      fontSize: 20,
      fontWeight: 'bold',
      fontFamily: 'Poppins_600SemiBold',
    },
    h3: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
    },
    body: {
      fontSize: 16,
      fontFamily: 'Poppins_400Regular',
    },
    bodyMedium: {
      fontSize: 16,
      fontFamily: 'Poppins_500Medium',
    },
    caption: {
      fontSize: 12,
      fontFamily: 'Poppins_400Regular',
    },
    profileTitle: {
      fontSize: 16,
      fontFamily: 'Poppins_700Bold',
    },
    profileItemTitle: {
      fontSize: 14,
      fontFamily: 'Poppins_500Medium',
    },
    profileItemDescription: {
      fontSize: 12,
      fontFamily: 'Poppins_400Regular',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
    },
  },
};