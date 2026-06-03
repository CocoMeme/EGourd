import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

const services = [
  {
    title: 'AI Scan',
    description: 'Quick flower and leaf classification powered by the scan workflow used in the app.',
  },
  {
    title: 'Pollination Tracking',
    description: 'Track planting stages, flowering, and pollination progress from one place.',
  },
  {
    title: 'Yield Prediction',
    description: 'Use scan and farm data to estimate harvest readiness and production outcomes.',
  },
  {
    title: 'Community & News',
    description: 'Stay connected with farmer updates, educational content, and community posts.',
  },
];

const supportItems = [
  'Flower and leaf scanning',
  'Pollination and plant tracking',
  'Yield and harvest insights',
  'Mobile-friendly farm tools',
];

const UserHome = () => {
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
    setCurrentHeroSlide(
      (prev) => (prev - 1 + heroCarouselImages.length) % heroCarouselImages.length
    );
  };

  return (
    <div className="user-landing-page">
      <div className="user-landing-backdrop">
        <span className="blob blob-left" />
        <span className="blob blob-right" />
        <span className="blob blob-bottom" />
      </div>

      <div className="user-landing-shell">
        <header className="user-landing-header">
          <Link to="/user/home" className="landing-brand">
            <img src={logoIcon} alt="GourdVision" className="landing-brand-logo" />
          </Link>

          <nav className="landing-nav">
            <a href="#about">About Us</a>
            <a href="#services">Services</a>
          </nav>

          <div className="landing-header-actions">
            <Link to="/user/register" className="landing-signup">
              Sign Up
            </Link>
            <Link to="/user/login" className="landing-signin">
              Sign In
            </Link>
          </div>
        </header>

        <main className="landing-panel">
          <section id="home" className="landing-hero">
            <div className="landing-copy">
              <span className="landing-kicker">Farm Landscape</span>
              <h1>Smarter farming with AI guidance</h1>
              <p>
                Analyze crops, track growth, and make confident decisions with a clean, modern
                workspace built for farmers.
              </p>

              <div className="landing-actions-row">
                <Link to="/user/login" className="landing-ghost-btn">
                  Sign In
                </Link>
                <Link to="/user/register" className="landing-primary-btn">
                  Get Started
                </Link>
              </div>

              <div className="landing-dots" aria-hidden="true">
                <span className="active" />
                <span />
                <span />
              </div>
            </div>

            <div className="landing-visual">
              <div className="landing-carousel">
                <div className="landing-carousel-track">
                  {heroCarouselImages.map((img, index) => (
                    <div
                      key={img.id}
                      className={`landing-carousel-slide ${index === currentHeroSlide ? 'active' : ''}`}
                    >
                      <img src={img.src} alt={img.alt} className="landing-carousel-image" />
                    </div>
                  ))}
                </div>

                <button className="landing-carousel-btn landing-prev" onClick={prevHeroSlide}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button className="landing-carousel-btn landing-next" onClick={nextHeroSlide}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                <div className="landing-carousel-dots" aria-hidden="true">
                  {heroCarouselImages.map((_, index) => (
                    <button
                      key={index}
                      className={`landing-carousel-dot ${index === currentHeroSlide ? 'active' : ''}`}
                      onClick={() => setCurrentHeroSlide(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="landing-info-grid">
            <article className="landing-about-card">
              <span className="section-tag">About Us</span>
              <h2>Built for farmers who want clarity, speed, and confidence.</h2>
              <p>
                GourdVision helps you classify flowers and leaves, monitor planting and pollination
                progress, and keep your farming workflow organized across web and mobile.
              </p>
            </article>

            <article className="landing-support-card">
              <span className="section-tag light">What We Support</span>
              <ul>
                {supportItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

          <section id="services" className="landing-services">
            <div className="section-head">
              <span className="section-tag">Services</span>
              <h2>Tools that support the full growing cycle.</h2>
            </div>

            <div className="services-grid">
              {services.map((service) => (
                <article key={service.title} className="service-card">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default UserHome;
