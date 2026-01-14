import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userNewsService } from '../../services/userApi';
import UserLayout from '../../components/user/UserLayout';
import './UserNews.css';

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
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

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 18 6-6-6-6"></path>
  </svg>
);

const NewspaperIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
    <path d="M18 14h-8"></path>
    <path d="M15 18h-5"></path>
    <path d="M10 6h8v4h-8V6Z"></path>
  </svg>
);

const UserNews = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All News' },
    { id: 'update', label: 'Updates' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'tips', label: 'Tips & Guides' },
    { id: 'community', label: 'Community' }
  ];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await userNewsService.getAllNews();
      if (response.success) {
        setNews(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateContent = (content, maxLength = 150) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getCategoryColor = (category) => {
    const colors = {
      update: '#3b82f6',
      announcement: '#ef4444',
      tips: '#10b981',
      community: '#8b5cf6'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <UserLayout>
      <div className="user-news-page">
        {/* Header */}
        <div className="news-header">
          <div className="header-content">
            <h1>📰 News & Updates</h1>
            <p>Stay informed with the latest eGourd announcements and tips</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="news-controls">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`cat-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* News Content */}
        {loading ? (
          <div className="news-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="news-skeleton">
                <div className="skeleton-image"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNews.length > 0 ? (
          <div className="news-grid">
            {/* Featured news (first item) */}
            {filteredNews.length > 0 && (
              <div 
                className="news-featured"
                onClick={() => navigate(`/user/news/${filteredNews[0]._id}`)}
              >
                <div className="featured-image">
                  {filteredNews[0].image ? (
                    <img src={filteredNews[0].image} alt={filteredNews[0].title} />
                  ) : (
                    <div className="placeholder-image">
                      <NewspaperIcon />
                    </div>
                  )}
                  <span 
                    className="featured-badge"
                    style={{ background: getCategoryColor(filteredNews[0].category) }}
                  >
                    {filteredNews[0].category || 'News'}
                  </span>
                </div>
                <div className="featured-content">
                  <h2>{filteredNews[0].title}</h2>
                  <p>{truncateContent(filteredNews[0].content, 200)}</p>
                  <div className="featured-meta">
                    <span className="date">
                      <CalendarIcon />
                      {formatDate(filteredNews[0].createdAt)}
                    </span>
                    <span className="read-more">
                      Read more <ChevronRightIcon />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Other news items */}
            <div className="news-list">
              {filteredNews.slice(1).map(item => (
                <div 
                  key={item._id}
                  className="news-card"
                  onClick={() => navigate(`/user/news/${item._id}`)}
                >
                  <div className="card-image">
                    {item.image ? (
                      <img src={item.image} alt={item.title} />
                    ) : (
                      <div className="placeholder-image small">
                        <NewspaperIcon />
                      </div>
                    )}
                  </div>
                  <div className="card-content">
                    <span 
                      className="card-category"
                      style={{ color: getCategoryColor(item.category) }}
                    >
                      {item.category || 'News'}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{truncateContent(item.content, 100)}</p>
                    <span className="card-date">
                      <CalendarIcon />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="news-empty">
            <NewspaperIcon />
            <h3>No news found</h3>
            <p>
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Check back later for updates'}
            </p>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserNews;
