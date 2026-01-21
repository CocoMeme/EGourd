import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const { isAuthenticated, isEmailVerified, user } = useUserAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Statistics data
  const stats = [
    { value: '100%', label: 'Customer Satisfaction', icon: '✓' },
    { value: '20+', label: 'Partner Farms', icon: '🌾' },
    { value: '5K+', label: 'Active Farmers', icon: '👨‍🌾' },
    { value: '98%', label: 'Prediction Accuracy', icon: '📊' },
  ];

  // Features data
  const features = [
    { icon: '🔬', title: 'AI Analysis', desc: 'Smart crop analysis' },
    { icon: '📈', title: 'Yield Prediction', desc: 'Accurate forecasts' },
    { icon: '🌡️', title: 'Weather Sync', desc: 'Real-time updates' },
    { icon: '💡', title: 'Smart Tips', desc: 'Expert guidance' },
    { icon: '🤝', title: 'Community', desc: 'Farmer network' },
    { icon: '📱', title: 'Mobile App', desc: 'Farm on the go' },
  ];

  // Gallery images (using placeholders - these would be real farm images)
  const galleryImages = [
    { id: 1, title: 'Gourd Farm Field', category: 'Fields' },
    { id: 2, title: 'Harvest Season', category: 'Harvest' },
    { id: 3, title: 'Ampalaya Vines', category: 'Crops' },
    { id: 4, title: 'Organic Farming', category: 'Methods' },
    { id: 5, title: 'Farm Workers', category: 'Community' },
    { id: 6, title: 'Fresh Produce', category: 'Products' },
  ];

  // FAQ data
  const faqs = [
    {
      question: 'How can I start using GourdVision?',
      answer: 'Simply create a free account, set up your farm profile, and start using our AI-powered tools to analyze your crops. Our onboarding process guides you through every step.'
    },
    {
      question: 'What types of gourds does the platform support?',
      answer: 'GourdVision supports all major gourd varieties including Ampalaya (Bitter Melon), Upo (Bottle Gourd), Patola (Sponge Gourd), Kalabasa (Squash), and Sayote (Chayote).'
    },
    {
      question: 'Is the AI analysis accurate?',
      answer: 'Our AI models achieve 98% accuracy in crop classification and disease detection. The system continuously learns and improves from new data provided by our farming community.'
    },
    {
      question: 'Can I connect with other farmers?',
      answer: 'Yes! Our community forum allows you to connect with thousands of gourd farmers across the Philippines. Share experiences, ask questions, and learn from each other.'
    },
    {
      question: 'Is there a mobile app available?',
      answer: 'Yes, GourdVision is available as a mobile app for both Android and iOS devices. Take photos directly in the field and get instant analysis results.'
    },
  ];

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">GourdVision</span>
          </Link>
          
          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="#home" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#about" className="nav-link" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#services" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Services</a>
            <a href="#gallery" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Gallery</a>
            <a href="#faq" className="nav-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </nav>

          <div className="header-actions">
            <Link to="/user/login" className="btn-login">Sign In</Link>
            <Link to="/user/register" className="btn-contact">Get Started</Link>
          </div>

          <button 
            className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
          <div className="hero-pattern"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1>
              Grow the Future with
              <span className="highlight"> Smart Gourd</span>
              <span className="highlight"> Farming</span>
            </h1>
            <p className="hero-description">
              Harness the power of AI technology to optimize your gourd farming operations. 
              From seed to harvest, we provide intelligent insights for sustainable agriculture.
            </p>
            <div className="hero-buttons">
              <Link to="/user/register" className="btn-primary">
                <span>Explore Our Platform</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <a href="#about" className="btn-secondary">
                <span>Learn More</span>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-container">
              <div className="hero-image-placeholder">
                <div className="farmer-illustration">
                  <div className="farmer-icon">👨‍🌾</div>
                  <div className="plant-icons">
                    <span>🌱</span>
                    <span>🥒</span>
                    <span>🌿</span>
                  </div>
                </div>
              </div>
              <div className="floating-card card-1">
                <span className="card-icon">📊</span>
                <div className="card-info">
                  <span className="card-value">98%</span>
                  <span className="card-label">Accuracy</span>
                </div>
              </div>
              <div className="floating-card card-2">
                <span className="card-icon">🌾</span>
                <div className="card-info">
                  <span className="card-value">+45%</span>
                  <span className="card-label">Yield Increase</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Bar */}
        <div className="features-bar">
          <div className="features-bar-container">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-title">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-left">
            <div className="section-label">
              <span className="label-line"></span>
              <span>About GourdVision</span>
            </div>
            <h2 className="section-title">
              Innovating the Future
              <span className="title-accent"> of Agriculture</span>
            </h2>
            
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="about-right">
            <div className="about-image-grid">
              <div className="about-image main-image">
                <div className="image-placeholder">
                  <span>🌱</span>
                  <p>Sustainable Farming</p>
                </div>
              </div>
              <div className="about-image secondary-image">
                <div className="image-placeholder">
                  <span>🥬</span>
                  <p>Fresh Harvest</p>
                </div>
              </div>
              <div className="about-image tertiary-image">
                <div className="image-placeholder">
                  <span>👨‍🌾</span>
                  <p>Expert Farmers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="services" className="technology-section">
        <div className="tech-container">
          <div className="tech-header">
            <div className="section-label light">
              <span className="label-line"></span>
              <span>Our Technology</span>
            </div>
            <h2 className="section-title light">
              Where Technology Meets
              <span className="title-accent"> the Roots of Nature</span>
            </h2>
            <p className="section-description">
              Our AI-powered platform combines cutting-edge machine learning with traditional farming wisdom 
              to help you achieve better yields and healthier crops.
            </p>
          </div>

          <div className="tech-content">
            <div className="tech-cards">
              <div className="tech-card">
                <div className="tech-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <h3>Real-Time Analysis</h3>
                <p>Get instant results from our AI when you scan your crops. No waiting, no delays.</p>
              </div>

              <div className="tech-card">
                <div className="tech-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <h3>Data-Driven Insights</h3>
                <p>Make informed decisions with comprehensive analytics and predictive modeling.</p>
              </div>

              <div className="tech-card">
                <div className="tech-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3>Community Support</h3>
                <p>Connect with thousands of farmers and agricultural experts in our community.</p>
              </div>
            </div>

            <div className="tech-visual">
              <div className="circular-progress-container">
                <div className="circular-progress">
                  <svg viewBox="0 0 100 100">
                    <circle className="progress-bg" cx="50" cy="50" r="45"/>
                    <circle className="progress-fill" cx="50" cy="50" r="45" 
                      style={{ strokeDasharray: '283', strokeDashoffset: '28' }}/>
                  </svg>
                  <div className="progress-content">
                    <span className="progress-value">100%</span>
                    <span className="progress-label">Satisfaction</span>
                  </div>
                </div>
                <div className="circular-progress small">
                  <svg viewBox="0 0 100 100">
                    <circle className="progress-bg" cx="50" cy="50" r="45"/>
                    <circle className="progress-fill" cx="50" cy="50" r="45" 
                      style={{ strokeDasharray: '283', strokeDashoffset: '57' }}/>
                  </svg>
                  <div className="progress-content">
                    <span className="progress-value">80%</span>
                    <span className="progress-label">Efficiency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="gallery-section">
        <div className="gallery-container">
          <div className="gallery-header">
            <div className="section-label">
              <span className="label-line"></span>
              <span>Our Gallery</span>
            </div>
            <h2 className="section-title">
              See Our Partner Farms
              <span className="title-accent"> in Action</span>
            </h2>
          </div>

          <div className="gallery-grid">
            {galleryImages.map((image) => (
              <div key={image.id} className={`gallery-item item-${image.id}`}>
                <div className="gallery-image">
                  <div className="image-placeholder gallery-placeholder">
                    <span>{image.id === 1 ? '🌾' : image.id === 2 ? '🧺' : image.id === 3 ? '🥒' : image.id === 4 ? '🌿' : image.id === 5 ? '👨‍🌾' : '🥬'}</span>
                  </div>
                  <div className="gallery-overlay">
                    <span className="gallery-category">{image.category}</span>
                    <h4>{image.title}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="faq-container">
          <div className="faq-left">
            <div className="section-label light">
              <span className="label-line"></span>
              <span>FAQ</span>
            </div>
            <h2 className="section-title light">
              Got Questions?
              <span className="title-accent"> We've Got Answers</span>
            </h2>
            <p className="faq-description">
              Find answers to commonly asked questions about GourdVision and how it can help transform your farming operations.
            </p>
            <div className="faq-image">
              <div className="image-placeholder faq-placeholder">
                <span>🌱</span>
                <p>Growing Together</p>
              </div>
            </div>
          </div>

          <div className="faq-right">
            <div className="accordion">
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className={`accordion-item ${activeAccordion === index ? 'active' : ''}`}
                >
                  <button 
                    className="accordion-header"
                    onClick={() => toggleAccordion(index)}
                  >
                    <span>{faq.question}</span>
                    <svg 
                      className="accordion-icon" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  <div className="accordion-content">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to Transform Your Farm?</h2>
            <p>Join thousands of Filipino farmers who are already growing smarter with GourdVision.</p>
            <div className="cta-buttons">
              <Link to="/user/register" className="btn-cta-primary">
                Start Free Trial
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link to="/user/login" className="btn-cta-secondary">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <Link to="/" className="footer-logo">
                <span className="logo-icon">🌱</span>
                <span className="logo-text">GourdVision</span>
              </Link>
              <p className="footer-tagline">
                Empowering Filipino farmers with smart agricultural technology for a sustainable future.
              </p>
              <div className="footer-social">
                <a href="#" className="social-link" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4>Platform</h4>
                <ul>
                  <li><a href="#about">About Us</a></li>
                  <li><a href="#services">Services</a></li>
                  <li><a href="#gallery">Gallery</a></li>
                  <li><a href="#faq">FAQ</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <ul>
                  <li><Link to="/user/login">Community Forum</Link></li>
                  <li><Link to="/user/login">News & Updates</Link></li>
                  <li><Link to="/user/login">Learning Center</Link></li>
                  <li><a href="#faq">Help Center</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Contact</h4>
                <ul>
                  <li><a href="mailto:support@gourdvision.com">support@gourdvision.com</a></li>
                  <li><a href="tel:+639123456789">+63 912 345 6789</a></li>
                  <li><span>Manila, Philippines</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} GourdVision. All rights reserved. Made with 💚 for Filipino farmers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
