import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const { isAuthenticated, isEmailVerified, user } = useUserAuth();
  const navigate = useNavigate();

  // Redirect logged-in users appropriately
  useEffect(() => {
    if (isAuthenticated) {
      if (isEmailVerified) {
        navigate('/user/home', { replace: true });
      } else {
        navigate('/user/verify-email', { state: { email: user?.email, sendPin: true }, replace: true });
      }
    }
  }, [isAuthenticated, isEmailVerified, user, navigate]);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">eGourd</span>
          </Link>
          <nav className="header-nav">
            <Link to="/user/login" className="nav-link">Login</Link>
            <Link to="/user/register" className="nav-btn">Get Started</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🎉 Smart Farming Made Easy</div>
          <h1 className="hero-title">
            Grow Smarter with <span className="highlight">eGourd</span>
          </h1>
          <p className="hero-description">
            Your intelligent companion for gourd farming. Monitor growth, predict yields, 
            connect with fellow farmers, and get expert tips - all in one platform.
          </p>
          <div className="hero-actions">
            <Link to="/user/register" className="btn-primary">
              Start Growing Today
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </Link>
            <Link to="/user/login" className="btn-secondary">
              I have an account
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Farmers</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Gourds Tracked</span>
            </div>
            <div className="stat">
              <span className="stat-number">98%</span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image">
            <div className="floating-card card-1">
              <span className="card-icon">🎃</span>
              <span className="card-text">Yield Prediction</span>
            </div>
            <div className="floating-card card-2">
              <span className="card-icon">📊</span>
              <span className="card-text">Growth Analytics</span>
            </div>
            <div className="floating-card card-3">
              <span className="card-icon">🌡️</span>
              <span className="card-text">Climate Monitor</span>
            </div>
            <div className="gourd-illustration">🌱</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Everything You Need to Succeed</h2>
          <p>Powerful tools designed specifically for gourd farmers</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h3>AI Classification</h3>
            <p>Snap a photo and let our AI identify gourd varieties, detect diseases, and assess maturity.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Yield Prediction</h3>
            <p>Get accurate harvest predictions based on your gourd's growth patterns and environmental data.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Community Forum</h3>
            <p>Connect with fellow farmers, share tips, ask questions, and learn from experienced growers.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📰</div>
            <h3>Latest News</h3>
            <p>Stay updated with farming tips, seasonal guides, and the latest agricultural innovations.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌦️</div>
            <h3>Weather Integration</h3>
            <p>Real-time weather data and alerts to help you make informed farming decisions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Mobile Ready</h3>
            <p>Access your farm data anywhere with our mobile app - in the field or at home.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Farming?</h2>
          <p>Join thousands of farmers who are already growing smarter with eGourd.</p>
          <Link to="/user/register" className="btn-cta">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">eGourd</span>
          </div>
          <p className="footer-copyright">
            © 2026 eGourd. All rights reserved. Made with 💚 for farmers.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
