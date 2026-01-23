import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';

const UserProtectedRoute = ({ children }) => {
  const { isAuthenticated, isEmailVerified, user, loading } = useUserAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#40916c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/user/login" state={{ from: location }} replace />;
  }

  // Redirect admin users to admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to verify email if not verified
  if (!isEmailVerified) {
    return <Navigate to="/user/verify-email" state={{ email: user?.email, sendPin: true }} replace />;
  }

  return children;
};

export default UserProtectedRoute;
