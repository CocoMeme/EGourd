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
  rightComponent 
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
});