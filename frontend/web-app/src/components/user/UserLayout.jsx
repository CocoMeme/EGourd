import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import './UserLayout.css';

// Icons
const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9,22 9,12 15,12 15,22"></polyline>
  </svg>
);

const ForumIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const NewsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
    <path d="M18 14h-8"></path>
    <path d="M15 18h-5"></path>
    <path d="M10 6h8v4h-8V6Z"></path>
  </svg>
);

const LearnIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
  </svg>
);

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="12" x2="20" y2="12"></line>
    <line x1="4" y1="6" x2="20" y2="6"></line>
    <line x1="4" y1="18" x2="20" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const UserLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useUserAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/user/home', label: 'Home', icon: HomeIcon },
    { path: '/user/forum', label: 'Forum', icon: ForumIcon },
    { path: '/user/news', label: 'News', icon: NewsIcon },
    { path: '/user/learn', label: 'Learn', icon: LearnIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="user-layout">
      {/* Header */}
      <header className="user-header">
        <div className="header-container">
          {/* Logo */}
          <Link to="/user/home" className="header-logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">eGourd</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              >
                <item.icon />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="header-actions">
            {isAuthenticated ? (
              <div className="user-menu">
                <div className="user-info">
                  <div className="user-avatar">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt={user.firstName} />
                    ) : (
                      <span>{user?.firstName?.[0] || 'U'}</span>
                    )}
                  </div>
                  <span className="user-name">{user?.firstName || 'User'}</span>
                </div>
                <button className="logout-btn" onClick={handleLogout} title="Logout">
                  <LogoutIcon />
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/user/login" className="login-btn">Login</Link>
                <Link to="/user/register" className="register-btn">Register</Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <item.icon />
            <span>{item.label}</span>
          </Link>
        ))}
        {isAuthenticated ? (
          <button className="mobile-nav-link logout" onClick={handleLogout}>
            <LogoutIcon />
            <span>Logout</span>
          </button>
        ) : (
          <>
            <Link to="/user/login" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <UserIcon />
              <span>Login</span>
            </Link>
            <Link to="/user/register" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <UserIcon />
              <span>Register</span>
            </Link>
          </>
        )}
      </nav>

      {/* Main Content */}
      <main className="user-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="user-footer">
        <div className="footer-container">
          <p>&copy; {new Date().getFullYear()} eGourd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;
