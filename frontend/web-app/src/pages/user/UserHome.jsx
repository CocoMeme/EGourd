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

const UserHome = () => {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <UserLayout>
      <div className="user-home-page">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <h1>{getGreeting()}, {user?.firstName || 'Farmer'}! 👋</h1>
            <p>Welcome back to eGourd. Here's what's happening in your community.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <Link to="/user/forum/create" className="action-card create">
            <span className="action-icon">✍️</span>
            <span className="action-text">Create Post</span>
          </Link>
          <Link to="/user/forum" className="action-card forum">
            <span className="action-icon">💬</span>
            <span className="action-text">Browse Forum</span>
          </Link>
          <Link to="/user/news" className="action-card news">
            <span className="action-icon">📰</span>
            <span className="action-text">Read News</span>
          </Link>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Recent Forum Posts */}
          <div className="content-section">
            <div className="section-header">
              <div className="header-left">
                <ForumIcon />
                <h2>Recent Discussions</h2>
              </div>
              <Link to="/user/forum" className="view-all">
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
                    <div className="post-category">{post.category}</div>
                    <h3>{post.title}</h3>
                    <p>{post.content?.substring(0, 80)}...</p>
                    <div className="post-meta">
                      <span className="author">
                        {post.author?.firstName || 'Anonymous'}
                      </span>
                      <div className="stats">
                        <span><HeartIcon /> {post.likes?.length || 0}</span>
                        <span><MessageIcon /> {post.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No discussions yet. Be the first to start one!</p>
                <Link to="/user/forum/create" className="btn-link">Create a post</Link>
              </div>
            )}
          </div>

          {/* Recent News */}
          <div className="content-section">
            <div className="section-header">
              <div className="header-left">
                <NewsIcon />
                <h2>Latest News</h2>
              </div>
              <Link to="/user/news" className="view-all">
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
                    <div className="news-content">
                      <span className="news-category">{item.category || 'News'}</span>
                      <h3>{item.title}</h3>
                      <span className="news-date">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No news available at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="tips-section">
          <div className="tip-card">
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <h3>Farming Tip of the Day</h3>
              <p>Water your gourds in the early morning to reduce evaporation and prevent fungal diseases. Consistent watering promotes steady growth!</p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserHome;
