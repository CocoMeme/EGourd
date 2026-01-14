import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { userForumService } from '../../services/userApi';
import { 
  MessageSquare, 
  Heart, 
  Search, 
  Plus, 
  Filter, 
  Lightbulb, 
  HelpCircle, 
  Image, 
  MessagesSquare,
  ChevronRight,
  Clock,
  User,
  Flag,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserLayout from '../../components/user/UserLayout';
import './UserForum.css';

const categories = [
  { id: 'all', label: 'All Posts', icon: MessagesSquare, color: '#6b7280' },
  { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb, color: '#10b981' },
  { id: 'questions', label: 'Q&A', icon: HelpCircle, color: '#3b82f6' },
  { id: 'showcase', label: 'Showcase', icon: Image, color: '#f59e0b' },
  { id: 'discussion', label: 'Discussion', icon: MessageSquare, color: '#8b5cf6' },
];

const UserForum = () => {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      const params = { limit: 20, sortBy: 'recent' };
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await userForumService.getAllPosts(params);
      
      if (response.success) {
        setPosts(response.data || []);
      } else {
        toast.error(response.message || 'Failed to load posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Unable to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.trim() || searchQuery === '') {
        fetchPosts();
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (e, postId) => {
    e.stopPropagation();
    
    if (!user) {
      toast.warning('Please login to like posts');
      navigate('/user/login');
      return;
    }

    try {
      const response = await userForumService.toggleLike(postId);
      if (response.success) {
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId
              ? { ...post, likeCount: response.data.likes, isLiked: response.data.isLiked }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleReport = async (e, postId) => {
    e.stopPropagation();
    
    if (!user) {
      toast.warning('Please login to report posts');
      return;
    }

    if (window.confirm('Report this post for inappropriate content?')) {
      try {
        const response = await userForumService.reportPost(postId);
        if (response.success) {
          toast.success('Post reported. Our team will review it.');
        }
      } catch (error) {
        toast.error('Failed to report post');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(c => c.id === categoryId) || categories[0];
  };

  return (
    <UserLayout>
      <div className="user-forum-page">
        {/* Header */}
        <div className="forum-header">
          <div className="forum-header-content">
            <h1>Community Forum</h1>
            <p>Connect with fellow gourd enthusiasts</p>
          </div>
          <button 
            className="btn btn-primary create-post-btn"
            onClick={() => navigate('/user/forum/create')}
          >
            <Plus size={20} />
            New Post
          </button>
        </div>

        {/* Search & Filter */}
        <div className="forum-controls">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={20} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>

        {/* Categories */}
        <div className="category-tabs">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
                style={{ '--cat-color': cat.color }}
              >
                <Icon size={18} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Posts List */}
        <div className="posts-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={48} />
              <h3>No posts found</h3>
              <p>Be the first to start a discussion!</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/user/forum/create')}
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map(post => {
                const category = getCategoryInfo(post.category);
                const CategoryIcon = category.icon;
                
                return (
                  <div 
                    key={post._id} 
                    className="post-card"
                    onClick={() => navigate(`/user/forum/post/${post._id}`)}
                  >
                    <div className="post-header">
                      <div 
                        className="post-category-badge"
                        style={{ backgroundColor: `${category.color}15`, color: category.color }}
                      >
                        <CategoryIcon size={14} />
                        {category.label}
                      </div>
                      <span className="post-time">
                        <Clock size={14} />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>

                    <h3 className="post-title">{post.title}</h3>
                    <p className="post-content">{post.content?.substring(0, 150)}...</p>

                    {post.images && post.images.length > 0 && (
                      <div className="post-images-preview">
                        <Image size={16} />
                        <span>{post.images.length} image{post.images.length > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="post-footer">
                      <div className="post-author">
                        <div className="author-avatar">
                          {post.author?.profilePicture ? (
                            <img src={post.author.profilePicture} alt="" />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <span>{post.author?.username || 'Anonymous'}</span>
                      </div>

                      <div className="post-stats">
                        <button 
                          className={`stat-btn like-btn ${post.isLiked ? 'liked' : ''}`}
                          onClick={(e) => handleLike(e, post._id)}
                        >
                          <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                          <span>{post.likeCount || 0}</span>
                        </button>
                        <div className="stat-item">
                          <MessageSquare size={18} />
                          <span>{post.commentCount || 0}</span>
                        </div>
                        <button 
                          className="stat-btn report-btn"
                          onClick={(e) => handleReport(e, post._id)}
                          title="Report post"
                        >
                          <Flag size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserForum;
