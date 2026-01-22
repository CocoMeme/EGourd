import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import './LandingPage.css';

// Import logo
import logoTransparent from '../../assets/gourdvision-name-high-resolution-logo-transparent.png';
import logoIcon from '../../assets/gourdvision-high-resolution-logo-green.png';

// Import Muntinlupa farm images for hero carousel
import heroImg1 from '../../assets/images/muntinlupa/IMG_20251201_103711.jpg';
import heroImg2 from '../../assets/images/muntinlupa/20260113_100915.jpg';
import heroImg3 from '../../assets/images/muntinlupa/20260113_100951.jpg';
import heroImg4 from '../../assets/images/muntinlupa/20260113_101232.jpg';
import heroImg5 from '../../assets/images/muntinlupa/20260113_102142.jpg';
import heroImg6 from '../../assets/images/muntinlupa/IMG_8444.jpg';
import heroImg7 from '../../assets/images/muntinlupa/IMG_8946.jpg';
import heroImg8 from '../../assets/images/muntinlupa/IMG_8982.jpg';
import heroImg9 from '../../assets/images/muntinlupa/IMG_8997.jpg';

// Hero carousel images array
const heroCarouselImages = [
  { id: 1, src: heroImg1, alt: 'Muntinlupa Farm' },
  { id: 2, src: heroImg2, alt: 'Muntinlupa Farm' },
  { id: 3, src: heroImg3, alt: 'Muntinlupa Farm' },
  { id: 4, src: heroImg4, alt: 'Muntinlupa Farm' },
  { id: 5, src: heroImg5, alt: 'Muntinlupa Farm' },
  { id: 6, src: heroImg6, alt: 'Muntinlupa Farm' },
  { id: 7, src: heroImg7, alt: 'Muntinlupa Farm' },
  { id: 8, src: heroImg8, alt: 'Muntinlupa Farm' },
  { id: 9, src: heroImg9, alt: 'Muntinlupa Farm' },
];

const LandingPage = () => {
  const { isAuthenticated, isEmailVerified, user } = useUserAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // Auto-advance hero carousel
  useEffect(() => {
    if (heroCarouselImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeroSlide((prev) => (prev + 1) % heroCarouselImages.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, []);

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % heroCarouselImages.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + heroCarouselImages.length) % heroCarouselImages.length);
  };

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect logged-in users to user home (not landing page anymore)
  useEffect(() => {
    if (isAuthenticated) {
      if (isEmailVerified) {
        navigate('/user/home', { replace: true });
      } else {
        navigate('/user/verify-email', { state: { email: user?.email, sendPin: true }, replace: true });
      }
    }
  }, [isAuthenticated, isEmailVerified, user, navigate]);


  // Features data
  const features = [
    { icon: '🔬', title: 'AI Analysis', desc: 'Smart crop analysis' },
    { icon: '📈', title: 'Yield Prediction', desc: 'Accurate forecasts' },
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
  ];

  // Muntinlupa City Farms data
  // To add your own images, place them in: src/assets/images/muntinlupa/
  // Then import them at the top and add them to the image property
  const muntinlupaFarms = [
    { 
      id: 1, 
      name: 'Tunasan Community Farm',
      location: 'Barangay Tunasan',
      description: 'A thriving community farm specializing in gourd cultivation with over 2 hectares of productive land.',
      image: null, // Replace with: muntinlupaFarm1 after importing
      placeholder: '🌾',
      crops: ['Ampalaya', 'Upo', 'Patola']
    },
    { 
      id: 2, 
      name: 'Poblacion Urban Garden',
      location: 'Barangay Poblacion',
      description: 'Urban farming initiative bringing fresh gourds to the heart of Muntinlupa City.',
      image: null, // Replace with: muntinlupaFarm2 after importing
      placeholder: '🥬',
      crops: ['Kalabasa', 'Sayote']
    },
    { 
      id: 3, 
      name: 'Sucat Agricultural Center',
      location: 'Barangay Sucat',
      description: 'Modern agricultural facility combining traditional methods with smart farming technology.',
      image: null, // Replace with: muntinlupaFarm3 after importing
      placeholder: '👨‍🌾',
      crops: ['Ampalaya', 'Kalabasa', 'Upo']
    },
    { 
      id: 4, 
      name: 'Alabang Hills Farm',
      location: 'Barangay Alabang',
      description: 'Premium organic gourd farm serving local markets and restaurants.',
      image: null, // Replace with: muntinlupaFarm4 after importing
      placeholder: '🌱',
      crops: ['Patola', 'Upo', 'Sayote']
    },
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
            <img src={logoTransparent} alt="GourdVision" className="logo-img" />
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
            <Link to="/user/register" className="btn-get-started">Get Started</Link>
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
          <div className="hero-image-bg"></div>
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              <span>Part of future Agriculture</span>
            </div>
            <h1>
              Smart Gourd Farming
              <span className="highlight"> with AI Technology</span>
            </h1>
            <p className="hero-description">
              Elevate your agricultural operations to new heights with our AI-powered gourd farming platform. 
              Get real-time insights, yield predictions, and expert guidance for sustainable farming.
            </p>
            <div className="hero-buttons">
              <Link to="/user/register" className="btn-primary">
                <span>Explore Platform</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <a href="#about" className="btn-outline-light">
                <span>Learn More</span>
              </a>
            </div>

            {/* Weather Widget */}
            <div className="weather-widget">
              <div className="weather-icon">☀️</div>
              <div className="weather-info">
                <span className="weather-temp">29°</span>
                <span className="weather-desc">Perfect for farming</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-carousel">
              {heroCarouselImages.length > 0 ? (
                <>
                  <div className="hero-carousel-track">
                    {heroCarouselImages.map((img, index) => (
                      <div
                        key={img.id}
                        className={`hero-carousel-slide ${index === currentHeroSlide ? 'active' : ''}`}
                      >
                        <img src={img.src} alt={img.alt} className="hero-carousel-image" />
                      </div>
                    ))}
                  </div>
                  {heroCarouselImages.length > 1 && (
                    <>
                      <button className="hero-carousel-btn hero-prev" onClick={prevHeroSlide}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 18l-6-6 6-6"/>
                        </svg>
                      </button>
                      <button className="hero-carousel-btn hero-next" onClick={nextHeroSlide}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                      <div className="hero-carousel-dots">
                        {heroCarouselImages.map((_, index) => (
                          <button
                            key={index}
                            className={`hero-dot ${index === currentHeroSlide ? 'active' : ''}`}
                            onClick={() => setCurrentHeroSlide(index)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="hero-image-container">
                  <div className="hero-main-visual">
                    <img src={logoIcon} alt="GourdVision" className="hero-main-image hero-logo-fallback" />
                  </div>
                </div>
              )}
              <div className="floating-card card-accuracy">
                <span className="card-icon">📊</span>
                <div className="card-info">
                  <span className="card-value">98%</span>
                  <span className="card-label">Accuracy</span>
                </div>
              </div>
              <div className="floating-card card-yield">
                <span className="card-icon">🌾</span>
                <div className="card-info">
                  <span className="card-value">+45%</span>
                  <span className="card-label">Yield Increase</span>
                </div>
              </div>
              <div className="floating-card card-farmers">
                <span className="card-icon">👨‍🌾</span>
                <div className="card-info">
                  <span className="card-value">5K+</span>
                  <span className="card-label">Farmers</span>
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
                <div className="feature-text">
                  <span className="feature-title">{feature.title}</span>
                  <span className="feature-desc">{feature.desc}</span>
                </div>
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

      {/* Muntinlupa City Farms Section */}
      <section id="muntinlupa-farms" className="muntinlupa-farms-section">
        <div className="muntinlupa-container">
          <div className="muntinlupa-header">
            <div className="section-label">
              <span className="label-line"></span>
              <span>Partner Farms</span>
            </div>
            <h2 className="section-title">
              Farms of
              <span className="title-accent"> Muntinlupa City</span>
            </h2>
            <p className="section-description">
              Discover our partner farms in Muntinlupa City, where local farmers are growing quality gourds 
              using sustainable practices and modern agricultural technology.
            </p>
          </div>

          <div className="muntinlupa-farms-grid">
            {muntinlupaFarms.map((farm) => (
              <div key={farm.id} className="farm-card">
                <div className="farm-image-wrapper">
                  {farm.image ? (
                    <img src={farm.image} alt={farm.name} className="farm-image" />
                  ) : (
                    <div className="farm-image-placeholder">
                      <span>{farm.placeholder}</span>
                    </div>
                  )}
                  <div className="farm-location-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{farm.location}</span>
                  </div>
                </div>
                <div className="farm-content">
                  <h3 className="farm-name">{farm.name}</h3>
                  <p className="farm-description">{farm.description}</p>
                  <div className="farm-crops">
                    {farm.crops.map((crop, index) => (
                      <span key={index} className="crop-tag">{crop}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="muntinlupa-cta">
            <p>Are you a farm owner in Muntinlupa City?</p>
            <Link to="/user/register" className="btn-partner">
              Become a Partner Farm
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
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
                <img src={logoTransparent} alt="GourdVision" className="footer-logo-img" />
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
