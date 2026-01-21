import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { userForumService, userNewsService } from '../../services/userApi';
import UserLayout from '../../components/user/UserLayout';
import './UserHome.css';

// Icons
const ForumIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const NewsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
    <path d="M18 14h-8"></path>
    <path d="M15 18h-5"></path>
    <path d="M10 6h8v4h-8V6Z"></path>
  </svg>
);

const HeartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 18 6-6-6-6"></path>
  </svg>
);

const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>
);

const UserHome = () => {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Farming tips
  const farmingTips = [
    { icon: '💧', title: 'Morning Watering', tip: 'Water your gourds in the early morning to reduce evaporation and prevent fungal diseases.' },
    { icon: '🌱', title: 'Soil Health', tip: 'Add organic compost to your soil regularly for better nutrient absorption and healthier plants.' },
    { icon: '🐝', title: 'Pollination', tip: 'Encourage pollinators by planting flowers nearby to improve your gourd yield.' },
    { icon: '✂️', title: 'Pruning', tip: 'Prune excess vines to direct energy to fruit production and improve air circulation.' },
    { icon: '🌡️', title: 'Temperature', tip: 'Gourds thrive in temperatures between 65-85°F (18-29°C). Monitor your growing conditions.' },
  ];

  const [currentTip] = useState(farmingTips[Math.floor(Math.random() * farmingTips.length)]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsRes, newsRes] = await Promise.all([
        userForumService.getAllPosts({ limit: 3 }),
        userNewsService.getAllNews({ limit: 3 })
      ]);
      
      if (postsRes.success) {
        setRecentPosts(postsRes.data?.posts || postsRes.data || []);
      }
      if (newsRes.success) {
        setRecentNews(newsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: '🌅', period: 'morning' };
    if (hour < 18) return { text: 'Good afternoon', icon: '☀️', period: 'afternoon' };
    return { text: 'Good evening', icon: '🌙', period: 'evening' };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const greeting = getGreeting();

  return (
    <UserLayout>
      <div className="user-home-page">
        {/* Hero Welcome Section */}
        <div className="welcome-hero">
          <div className="welcome-bg-pattern"></div>
          <div className="welcome-content">
            <div className="welcome-left">
              <span className="welcome-badge">
                <span className="badge-icon">{greeting.icon}</span>
                Dashboard
              </span>
              <h1>{greeting.text}, {user?.firstName || 'Farmer'}!</h1>
              <p>Welcome back to your farming hub. Here's what's happening in your community today.</p>
              <div className="welcome-stats">
                <div className="mini-stat">
                  <span className="mini-stat-icon">🌱</span>
                  <div className="mini-stat-content">
                    <span className="mini-stat-number">{recentPosts.length}</span>
                    <span className="mini-stat-label">New Posts</span>
                  </div>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat-icon">📰</span>
                  <div className="mini-stat-content">
                    <span className="mini-stat-number">{recentNews.length}</span>
                    <span className="mini-stat-label">News Updates</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="welcome-illustration">
              <div className="illustration-scene">
                <span className="scene-sun">☀️</span>
                <span className="scene-plant plant-1">🌱</span>
                <span className="scene-plant plant-2">🥒</span>
                <span className="scene-plant plant-3">🎃</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions">
            <Link to="/user/forum/create" className="action-card action-create">
              <div className="action-icon-wrapper">
                <span className="action-icon">✍️</span>
              </div>
              <div className="action-info">
                <span className="action-title">Create Post</span>
                <span className="action-desc">Share your thoughts</span>
              </div>
              <ChevronRightIcon />
            </Link>
            <Link to="/user/forum" className="action-card action-forum">
              <div className="action-icon-wrapper">
                <span className="action-icon">💬</span>
              </div>
              <div className="action-info">
                <span className="action-title">Browse Forum</span>
                <span className="action-desc">Join discussions</span>
              </div>
              <ChevronRightIcon />
            </Link>
            <Link to="/user/news" className="action-card action-news">
              <div className="action-icon-wrapper">
                <span className="action-icon">📰</span>
              </div>
              <div className="action-info">
                <span className="action-title">Read News</span>
                <span className="action-desc">Stay informed</span>
              </div>
              <ChevronRightIcon />
            </Link>
            <Link to="/user/learn" className="action-card action-learn">
              <div className="action-icon-wrapper">
                <span className="action-icon">📚</span>
              </div>
              <div className="action-info">
                <span className="action-title">Learn</span>
                <span className="action-desc">Farming guides</span>
              </div>
              <ChevronRightIcon />
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Recent Forum Posts */}
          <div className="content-section">
            <div className="section-header">
              <div className="header-left">
                <div className="header-icon">
                  <ForumIcon />
                </div>
                <div className="header-text">
                  <h2>Community Discussions</h2>
                  <p>Latest from fellow farmers</p>
                </div>
              </div>
              <Link to="/user/forum" className="view-all-btn">
                View all <ChevronRightIcon />
              </Link>
            </div>
            
            {loading ? (
              <div className="loading-cards">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card"></div>
                ))}
              </div>
            ) : recentPosts.length > 0 ? (
              <div className="posts-list">
                {recentPosts.slice(0, 3).map(post => (
                  <div 
                    key={post._id} 
                    className="post-card"
                    onClick={() => navigate(`/user/forum/post/${post._id}`)}
                  >
                    <div className="post-header">
                      <div className="post-avatar">
                        {post.author?.firstName?.[0] || 'U'}
                      </div>
                      <div className="post-author-info">
                        <span className="post-author-name">{post.author?.firstName || 'Anonymous'}</span>
                        <span className="post-time">{formatDate(post.createdAt)}</span>
                      </div>
                      <span className="post-category">{post.category}</span>
                    </div>
                    <h3 className="post-title">{post.title}</h3>
                    <p className="post-excerpt">{post.content?.substring(0, 100)}...</p>
                    <div className="post-footer">
                      <div className="post-stats">
                        <span className="stat-item"><HeartIcon /> {post.likes?.length || 0}</span>
                        <span className="stat-item"><MessageIcon /> {post.comments?.length || 0}</span>
                      </div>
                      <span className="read-more">Read more →</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No discussions yet</h3>
                <p>Be the first to start a conversation!</p>
                <Link to="/user/forum/create" className="empty-cta">Create a post</Link>
              </div>
            )}
          </div>

          {/* Recent News */}
          <div className="content-section">
            <div className="section-header">
              <div className="header-left">
                <div className="header-icon news-icon">
                  <NewsIcon />
                </div>
                <div className="header-text">
                  <h2>Latest News</h2>
                  <p>Updates & announcements</p>
                </div>
              </div>
              <Link to="/user/news" className="view-all-btn">
                View all <ChevronRightIcon />
              </Link>
            </div>
            
            {loading ? (
              <div className="loading-cards">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card"></div>
                ))}
              </div>
            ) : recentNews.length > 0 ? (
              <div className="news-list">
                {recentNews.slice(0, 3).map(item => (
                  <div 
                    key={item._id} 
                    className="news-card"
                    onClick={() => navigate(`/user/news/${item._id}`)}
                  >
                    <div className="news-image">
                      {item.category === 'Tips' && '💡'}
                      {item.category === 'Update' && '📢'}
                      {item.category === 'Event' && '🎉'}
                      {!['Tips', 'Update', 'Event'].includes(item.category) && '📰'}
                    </div>
                    <div className="news-content">
                      <span className="news-category">{item.category || 'News'}</span>
                      <h3>{item.title}</h3>
                      <div className="news-meta">
                        <span className="news-date">{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📰</div>
                <h3>No news yet</h3>
                <p>Check back soon for updates!</p>
              </div>
            )}
          </div>
        </div>

        {/* Farming Tip Section */}
        <div className="tip-section">
          <div className="tip-card">
            <div className="tip-header">
              <span className="tip-badge">💡 Tip of the Day</span>
            </div>
            <div className="tip-body">
              <span className="tip-icon">{currentTip.icon}</span>
              <div className="tip-content">
                <h3>{currentTip.title}</h3>
                <p>{currentTip.tip}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Farm Services Banner */}
        <div className="services-banner">
          <div className="banner-content">
            <div className="banner-text">
              <h3>Grow Smarter with GourdVision</h3>
              <p>Access AI-powered tools, connect with experts, and optimize your harvest.</p>
            </div>
            <Link to="/user/learn" className="banner-cta">
              Explore Features
              <ChevronRightIcon />
            </Link>
          </div>
          <div className="banner-decoration">
            <span className="deco-item">🌱</span>
            <span className="deco-item">🥒</span>
            <span className="deco-item">🎃</span>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserHome;
