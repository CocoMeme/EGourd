/**
 * AuthContext - Global state management for authentication
 * Handles login, logout, and checking initial auth status.
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services';
import { pollinationNotificationHelper } from '../utils/pollinationNotificationHelper';

const AuthContext = createContext({
  isAuthenticated: false,
  userRole: null,
  isLoading: true,
  checkAuthStatus: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await authService.initialize();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
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
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUserRole(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        isLoading,
        checkAuthStatus,
        logout
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
