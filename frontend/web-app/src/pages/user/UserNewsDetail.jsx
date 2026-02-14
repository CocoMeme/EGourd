import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userNewsService } from '../../services/userApi';
import UserLayout from '../../components/user/UserLayout';
import './UserNewsDetail.css';

// Icons
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m15 18-6-6 6-6"></path>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);

const NewspaperIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
    <path d="M18 14h-8"></path>
    <path d="M15 18h-5"></path>
    <path d="M10 6h8v4h-8V6Z"></path>
  </svg>
);

const UserNewsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNewsDetail();
  }, [id]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      const response = await userNewsService.getNewsById(id);
      if (response.success) {
        setNews(response.data);
      } else {
        setError('News article not found');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('Failed to load news article');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      update: '#3b82f6',
      announcement: '#ef4444',
      tips: '#10b981',
      community: '#8b5cf6',
    };
    return colors[category] || '#6b7280';
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: news.title,
          text: news.content?.substring(0, 100),
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="news-detail-page">
          <div className="news-detail-skeleton">
            <div className="skeleton-header"></div>
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error || !news) {
    return (
      <UserLayout>
        <div className="news-detail-page">
          <div className="news-not-found">
            <NewspaperIcon />
            <h2>Article Not Found</h2>
            <p>{error || 'The news article you are looking for does not exist.'}</p>
            <button onClick={() => navigate('/user/news')} className="back-btn">
              <ArrowLeftIcon />
              Back to News
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="news-detail-page">
        {/* Navigation */}
        <div className="news-detail-nav">
          <button className="back-btn" onClick={() => navigate('/user/news')}>
            <ArrowLeftIcon />
            Back to News
          </button>
          <button className="share-btn" onClick={handleShare}>
            <ShareIcon />
            Share
          </button>
        </div>

        {/* Article */}
        <article className="news-article">
          {/* Category Badge */}
          {news.category && (
            <span
              className="article-category"
              style={{ background: getCategoryColor(news.category) }}
            >
              {news.category}
            </span>
          )}

          {/* Title */}
          <h1 className="article-title">{news.title}</h1>

          {/* Meta */}
          <div className="article-meta">
            <span className="meta-date">
              <CalendarIcon />
              {formatDate(news.createdAt)}
            </span>
            {news.author && (
              <span className="meta-author">
                By {news.author.firstName} {news.author.lastName}
              </span>
            )}
          </div>

          {/* Featured Image */}
          {news.image && (
            <div className="article-image">
              <img src={news.image} alt={news.title} />
            </div>
          )}

          {/* Content */}
          <div className="article-content">
            {news.content
              ?.split('\n')
              .map((paragraph, index) => paragraph.trim() && <p key={index}>{paragraph}</p>)}
          </div>

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <div className="article-tags">
              {news.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Related Articles */}
        {/* Could be added here in the future */}
      </div>
    </UserLayout>
  );
};

export default UserNewsDetail;
