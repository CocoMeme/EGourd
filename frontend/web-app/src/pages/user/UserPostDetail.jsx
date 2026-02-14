import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { userForumService } from '../../services/userApi';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Clock,
  User,
  Send,
  Flag,
  Lightbulb,
  HelpCircle,
  Image as ImageIcon,
  MessagesSquare,
  Reply,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserLayout from '../../components/user/UserLayout';
import './UserPostDetail.css';

const categories = [
  { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb, color: '#10b981' },
  { id: 'questions', label: 'Q&A', icon: HelpCircle, color: '#3b82f6' },
  { id: 'showcase', label: 'Showcase', icon: ImageIcon, color: '#f59e0b' },
  { id: 'discussion', label: 'Discussion', icon: MessagesSquare, color: '#8b5cf6' },
];

const UserPostDetail = () => {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await userForumService.getPostById(postId);
      if (response.success) {
        setPost(response.data);
      } else {
        toast.error('Post not found');
        navigate('/user/forum');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
      navigate('/user/forum');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.warning('Please login to like posts');
      navigate('/user/login');
      return;
    }

    try {
      const response = await userForumService.toggleLike(postId);
      if (response.success) {
        setPost((prev) => ({
          ...prev,
          likeCount: response.data.likes,
          isLiked: response.data.isLiked,
        }));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.warning('Please login to comment');
      navigate('/user/login');
      return;
    }

    if (!commentText.trim()) {
      toast.warning('Please write a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await userForumService.addComment(postId, commentText.trim());
      if (response.success) {
        setCommentText('');
        fetchPost(); // Refresh to get new comment
        toast.success('Comment added!');
      } else {
        toast.error(response.message || 'Failed to add comment');
      }
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e, commentId) => {
    e.preventDefault();

    if (!user) {
      toast.warning('Please login to reply');
      navigate('/user/login');
      return;
    }

    if (!replyText.trim()) {
      toast.warning('Please write a reply');
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await userForumService.addReply(postId, commentId, replyText.trim());
      if (response.success) {
        setReplyText('');
        setReplyingTo(null);
        fetchPost(); // Refresh to get new reply
        // Auto-expand replies for this comment
        setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));
        toast.success('Reply added!');
      } else {
        toast.error(response.message || 'Failed to add reply');
      }
    } catch (error) {
      toast.error('Failed to add reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleReport = async () => {
    if (!user) {
      toast.warning('Please login to report');
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
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find((c) => c.id === categoryId) || categories[3];
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="post-detail-page">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading post...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!post) {
    return null;
  }

  const category = getCategoryInfo(post.category);
  const CategoryIcon = category.icon;

  return (
    <UserLayout>
      <div className="post-detail-page">
        {/* Back Button */}
        <button className="back-btn" onClick={() => navigate('/user/forum')}>
          <ArrowLeft size={20} />
          Back to Forum
        </button>

        {/* Post Content */}
        <article className="post-detail-card">
          <div className="post-detail-header">
            <div
              className="post-category-badge"
              style={{ backgroundColor: `${category.color}15`, color: category.color }}
            >
              <CategoryIcon size={16} />
              {category.label}
            </div>
            <span className="post-time">
              <Clock size={16} />
              {formatDate(post.createdAt)}
            </span>
          </div>

          <h1 className="post-detail-title">{post.title}</h1>

          <div className="post-author-info">
            <div className="author-avatar">
              {post.author?.profilePicture ? (
                <img src={post.author.profilePicture} alt="" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="author-details">
              <span className="author-name">{post.author?.username || 'Anonymous'}</span>
              <span className="author-badge">Member</span>
            </div>
          </div>

          <div className="post-detail-content">{post.content}</div>

          {post.images && post.images.length > 0 && (
            <div className="post-images">
              {post.images.map((img, index) => (
                <img key={index} src={img.url} alt={`Post image ${index + 1}`} />
              ))}
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="post-actions-bar">
            <button
              className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <Heart size={20} fill={post.isLiked ? 'currentColor' : 'none'} />
              <span>{post.likeCount || post.likes || 0} Likes</span>
            </button>
            <div className="action-btn">
              <MessageSquare size={20} />
              <span>{post.comments?.length || 0} Comments</span>
            </div>
            <button className="action-btn report-btn" onClick={handleReport}>
              <Flag size={18} />
              <span>Report</span>
            </button>
          </div>
        </article>

        {/* Comments Section */}
        <section className="comments-section">
          <h2>Comments ({post.comments?.length || 0})</h2>

          {/* Comment Form */}
          <form className="comment-form" onSubmit={handleComment}>
            <div className="comment-input-wrapper">
              <div className="user-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="" />
                ) : (
                  <User size={18} />
                )}
              </div>
              <input
                type="text"
                placeholder={user ? 'Write a comment...' : 'Login to comment...'}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!user || submitting}
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!user || !commentText.trim() || submitting}
              >
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="comments-list">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <div className="comment-main">
                    <div className="comment-avatar">
                      {comment.user?.profilePicture ? (
                        <img src={comment.user.profilePicture} alt="" />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <div className="comment-body">
                      <div className="comment-header">
                        <span className="comment-author">
                          {comment.user?.username || comment.user?.firstName || 'Anonymous'}
                        </span>
                        <span className="comment-time">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="comment-content">{comment.content}</p>
                      <div className="comment-actions">
                        <button
                          className="reply-btn"
                          onClick={() =>
                            setReplyingTo(replyingTo === comment._id ? null : comment._id)
                          }
                        >
                          <Reply size={14} />
                          Reply
                        </button>
                        {comment.replies && comment.replies.length > 0 && (
                          <button
                            className="view-replies-btn"
                            onClick={() => toggleReplies(comment._id)}
                          >
                            {expandedReplies[comment._id] ? (
                              <>
                                <ChevronUp size={14} />
                                Hide Replies ({comment.replies.length})
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                View Replies ({comment.replies.length})
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment._id && (
                    <form className="reply-form" onSubmit={(e) => handleReply(e, comment._id)}>
                      <div className="reply-input-wrapper">
                        <div className="user-avatar small">
                          {user?.profilePicture ? (
                            <img src={user.profilePicture} alt="" />
                          ) : (
                            <User size={14} />
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder={
                            user
                              ? `Reply to ${comment.user?.username || 'Anonymous'}...`
                              : 'Login to reply...'
                          }
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          disabled={!user || submittingReply}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="send-btn small"
                          disabled={!user || !replyText.trim() || submittingReply}
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Replies List */}
                  {expandedReplies[comment._id] &&
                    comment.replies &&
                    comment.replies.length > 0 && (
                      <div className="replies-list">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="reply-item">
                            <div className="reply-avatar">
                              {reply.user?.profilePicture ? (
                                <img src={reply.user.profilePicture} alt="" />
                              ) : (
                                <User size={14} />
                              )}
                            </div>
                            <div className="reply-body">
                              <div className="reply-header">
                                <span className="reply-author">
                                  {reply.user?.username || reply.user?.firstName || 'Anonymous'}
                                </span>
                                <span className="reply-time">{formatDate(reply.createdAt)}</span>
                              </div>
                              <p className="reply-content">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))
            ) : (
              <div className="no-comments">
                <MessageSquare size={32} />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </UserLayout>
  );
};

export default UserPostDetail;
