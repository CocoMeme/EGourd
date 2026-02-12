/**
 * AuthContext - Global state management for authentication
 * Handles login, logout, guest mode, and checking initial auth status.
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authService } from '../services';
import { guestStorageService } from '../services/guestStorageService';
import { guestMigrationService } from '../services/guestMigrationService';
import { pollinationNotificationHelper } from '../utils/pollinationNotificationHelper';

const AuthContext = createContext({
  isAuthenticated: false,
  isGuest: false,
  userRole: null,
  isLoading: true,
  checkAuthStatus: () => {},
  loginAsGuest: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First check if there is a real auth token
      const isAuth = await authService.initialize();
      
      if (isAuth) {
        // Real authenticated user
        setIsAuthenticated(true);
        setIsGuest(false);

        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('👤 User Data:', user);
          console.log('🔑 User Role:', user.role);
          setUserRole(user.role);
        }

        console.log('🔔 User authenticated - initializing notifications...');
        try {
          await pollinationNotificationHelper.initialize();
        } catch (error) {
          console.error('Error initializing notifications after login:', error);
        }

        // Check for guest data to migrate
        try {
          const hasData = await guestStorageService.hasGuestData();
          if (hasData) {
            console.log('📦 Found local guest data — migrating...');
            const result = await guestMigrationService.migrateGuestData();
            const parts = [];
            if (result.scans > 0) parts.push(`${result.scans} scan(s)`);
            if (result.plants > 0) parts.push(`${result.plants} plant(s)`);
            if (parts.length > 0) {
              const hasErrors = result.errors.length > 0;
              setTimeout(() => {
                Alert.alert(
                  hasErrors ? '⚠️ Partial Sync' : '✅ Data Synced',
                  hasErrors
                    ? `Synced ${parts.join(' and ')} to your account.\n\n${result.errors.length} item(s) failed and will retry on next login.`
                    : `Your guest data has been synced to your account: ${parts.join(' and ')}.`,
                  [{ text: 'OK' }]
                );
              }, 1000);
            }
          }
        } catch (migrationError) {
          console.error('Guest data migration error:', migrationError);
        }

        return;
      }

      // No real token — check if guest mode is active
      const guestMode = await guestStorageService.isGuestMode();
      if (guestMode) {
        console.log('👻 Guest mode active');
        setIsAuthenticated(true);
        setIsGuest(true);
        setUserRole('guest');
        return;
      }

      // Not authenticated at all
      setIsAuthenticated(false);
      setIsGuest(false);
      setUserRole(null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setIsGuest(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Enter guest mode — stores flag and sets auth state
   */
  const loginAsGuest = async () => {
    try {
      await guestStorageService.setGuestMode(true);
      setIsAuthenticated(true);
      setIsGuest(true);
      setUserRole('guest');
    } catch (error) {
      console.error('Error entering guest mode:', error);
    }
  };

  /**
   * Logout — handles both real users and guests
   */
  const logout = async () => {
    try {
      if (isGuest) {
        // Guest logout: clear guest flag only (preserve local data for potential future sign-in)
        await guestStorageService.clearGuestFlag();
      } else {
        await authService.logout();
      }
      setIsAuthenticated(false);
      setIsGuest(false);
      setUserRole(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isGuest,
        userRole,
        isLoading,
        checkAuthStatus,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
