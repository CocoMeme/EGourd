import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

export const CustomHeader = ({ 
  user, 
  onNotificationPress, 
  onMenuPress,
  showAvatar = true,
  title,
  rightComponent,
  // Props for enhanced header variants
  onBackPress,
  showBackButton = false,
  subtitle,
  centerComponent,
  variant = 'default', // 'default', 'scanner', 'results', 'management'
  backgroundColor,
}) => {
  // Get first letter of first name or fallback to 'U'
  const getInitials = () => {
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.firstName) {
      return user.firstName;
    }
    return 'User';
  };

  // Results variant - Clean minimal header for scan results
  if (variant === 'results') {
    return (
      <View style={[styles.resultsContainer, backgroundColor && { backgroundColor }]}>
        <View style={styles.resultsContent}>
          {/* Left - Back Button */}
          <TouchableOpacity 
            style={styles.resultsBackButton} 
            onPress={onBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* Center - Title */}
          <View style={styles.resultsCenter}>
            {title && <Text style={styles.resultsTitle}>{title}</Text>}
            {subtitle && <Text style={styles.resultsSubtitle}>{subtitle}</Text>}
          </View>

          {/* Right - Custom Component */}
          <View style={styles.resultsRight}>
            {rightComponent ? rightComponent() : <View style={styles.resultsPlaceholder} />}
          </View>
        </View>
      </View>
    );
  }

  // Management variant - Modern header for management screens
  if (variant === 'management') {
    return (
      <SafeAreaView style={styles.managementSafeArea}>
        <View style={styles.managementContainer}>
          {/* Left - Back Button (optional) */}
          {showBackButton && (
            <TouchableOpacity 
              style={styles.managementBackButton} 
              onPress={onBackPress}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Center - Title */}
          <View style={[styles.managementCenter, !showBackButton && { marginLeft: 16 }]}>
            {title && <Text style={styles.managementTitle}>{title}</Text>}
            {subtitle && <Text style={styles.managementSubtitle}>{subtitle}</Text>}
          </View>

          {/* Right - Action Buttons */}
          {rightComponent && (
            <View style={styles.managementRight}>
              {rightComponent()}
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Scanner variant - dark background, minimal UI
  if (variant === 'scanner') {
    return (
      <View style={[styles.scannerContainer, backgroundColor && { backgroundColor }]}>
        <View style={styles.scannerContent}>
          {/* Left - Back Button */}
          <TouchableOpacity 
            style={styles.scannerButton} 
            onPress={onBackPress}
          >
            <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center - Title or Custom Component */}
          <View style={styles.scannerCenter}>
            {centerComponent ? centerComponent() : (
              <>
                {title && <Text style={styles.scannerTitle}>{title}</Text>}
                {subtitle && <Text style={styles.scannerSubtitle}>{subtitle}</Text>}
              </>
            )}
          </View>

          {/* Right - Custom Component or Empty */}
          <View style={styles.scannerRight}>
            {rightComponent ? rightComponent() : <View style={styles.scannerButton} />}
          </View>
        </View>
      </View>
    );
  }

  // If title prop is provided, render simple header with title and right component
  if (title) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
          {rightComponent && (
            <View style={styles.rightSection}>
              {rightComponent()}
            </View>
          )}
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Default home screen style header
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Left side - Avatar and Name */}
        <View style={styles.leftSection}>
          {showAvatar && (
            <View style={styles.avatarContainer}>
              {user?.profilePicture ? (
                <Image 
                  source={{ uri: user.profilePicture }} 
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.userName}>{getDisplayName()}</Text>
          </View>
        </View>

        {/* Right side - Action Icons */}
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={onNotificationPress}
          >
            <Ionicons 
              name="notifications-outline" 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={onMenuPress}
          >
            <Ionicons 
              name="ellipsis-vertical" 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.gradient.start,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + theme.spacing.xs : theme.spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  nameContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  userName: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Scanner variant styles
  scannerContainer: {
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + theme.spacing.xs : theme.spacing.lg,
  },
  scannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    height: 56,
  },
  scannerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  scannerSubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  scannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Results variant styles
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : theme.spacing.sm,
  },
  resultsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    height: 56,
  },
  resultsBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: '#333',
  },
  resultsSubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: '#666',
    marginTop: 2,
  },
  resultsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
  },
  resultsPlaceholder: {
    width: 44,
    height: 44,
  },
  // Management variant styles
  managementSafeArea: {
    backgroundColor: '#4CAF50',
  },
  managementContainer: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 50,
  },
  managementBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  managementCenter: {
    flex: 1,
  },
  managementTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },
  managementSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
  },
  managementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});