import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import UserLayout from '../../components/user/UserLayout';
import './UserHome.css';

// Import logo
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

const UserHome = () => {
  const { user } = useUserAuth();
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

  // Features/Quick Actions
  const quickActions = [
    { 
      icon: '📊', 
      title: 'Dashboard', 
      desc: 'View your farming insights and analytics',
      link: '/user/dashboard',
      color: 'green'
    },
    { 
      icon: '🔬', 
      title: 'AI Scanner', 
      desc: 'Scan and analyze your gourd crops',
      link: '/user/scan',
      color: 'blue'
    },
    { 
      icon: '💬', 
      title: 'Forum', 
      desc: 'Connect with other gourd farmers',
      link: '/user/forum',
      color: 'purple'
    },
    { 
      icon: '📰', 
      title: 'News', 
      desc: 'Latest agricultural updates and tips',
      link: '/user/news',
      color: 'orange'
    },
    { 
      icon: '📚', 
      title: 'Learn', 
      desc: 'Educational resources for better farming',
      link: '/user/learn',
      color: 'teal'
    },
    { 
      icon: '📈', 
      title: 'Yield Prediction', 
      desc: 'AI-powered harvest forecasting',
      link: '/user/yield',
      color: 'lime'
    },
  ];

  // Farming tips
  const farmingTips = [
    { icon: '💧', title: 'Morning Watering', tip: 'Water your gourds in the early morning to reduce evaporation.' },
    { icon: '🌱', title: 'Soil Health', tip: 'Add organic compost regularly for better nutrient absorption.' },
    { icon: '🐝', title: 'Pollination', tip: 'Encourage pollinators by planting flowers nearby.' },
  ];

  // Muntinlupa City Farms data
  // To add your own images, place them in: src/assets/images/muntinlupa/
  // Then import them at the top and add them to the image property
  const muntinlupaFarms = [
    { 
      id: 1, 
      name: 'Tunasan Community Farm',
      location: 'Brgy. Tunasan',
      image: null, // Replace with your imported image
      placeholder: '🌾',
      crops: ['Ampalaya', 'Upo']
    },
    { 
      id: 2, 
      name: 'Poblacion Urban Garden',
      location: 'Brgy. Poblacion',
      image: null, // Replace with your imported image
      placeholder: '🥬',
      crops: ['Kalabasa', 'Sayote']
    },
    { 
      id: 3, 
      name: 'Sucat Agricultural Center',
      location: 'Brgy. Sucat',
      image: null, // Replace with your imported image
      placeholder: '👨‍🌾',
      crops: ['Ampalaya', 'Kalabasa']
    },
    { 
      id: 4, 
      name: 'Alabang Hills Farm',
      location: 'Brgy. Alabang',
      image: null, // Replace with your imported image
      placeholder: '🌱',
      crops: ['Patola', 'Upo']
    },
  ];

  return (
    <UserLayout>
      <div className="user-home">
        {/* Welcome Hero Section */}
        <section className="welcome-hero">
          {/* Background Carousel */}
          <div className="hero-bg-carousel">
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
                <div className="hero-overlay"></div>
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
              <div className="hero-bg-fallback"></div>
            )}
          </div>
          
          {/* Content Overlay */}
          <div className="welcome-content">
            <div className="welcome-text">
              <div className="welcome-badge">
                <span className="badge-dot"></span>
                <span>Welcome back, {user?.firstName || 'Farmer'}!</span>
              </div>
              <h1>
                Your Smart Farming
                <span className="highlight"> Command Center</span>
              </h1>
              <p className="welcome-description">
                Access all your farming tools, connect with the community, and leverage AI-powered insights 
                to optimize your gourd farming operations.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="quick-actions-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
            <p>Access your most used features</p>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <Link 
                key={index} 
                to={action.link} 
                className={`action-card ${action.color}`}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <h3>{action.title}</h3>
                  <p>{action.desc}</p>
                </div>
                <div className="action-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Farming Tips Section */}
        <section className="tips-section">
          <div className="section-header">
            <h2>Daily Farming Tips</h2>
            <p>Expert advice for better yields</p>
          </div>
          <div className="tips-grid">
            {farmingTips.map((tip, index) => (
              <div key={index} className="tip-card">
                <div className="tip-icon">{tip.icon}</div>
                <h3>{tip.title}</h3>
                <p>{tip.tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Muntinlupa City Farms Section */}
        <section className="muntinlupa-section">
          <div className="section-header">
            <h2>Farms of Muntinlupa City</h2>
            <p>Our partner farms in your local area</p>
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
                </div>
                <div className="farm-info">
                  <h3>{farm.name}</h3>
                  <p className="farm-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {farm.location}
                  </p>
                  <div className="farm-crops">
                    {farm.crops.map((crop, index) => (
                      <span key={index} className="crop-tag">{crop}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="home-cta">
          <div className="cta-content">
            <h2>Ready to analyze your crops?</h2>
            <p>Use our AI-powered scanner to get instant insights about your gourd plants.</p>
            <Link to="/user/dashboard" className="cta-button">
              <span>Go to Dashboard</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </UserLayout>
  );
};

export default UserHome;
