import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { Search, CheckCircle, XCircle, Pin, Lock, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import './Forum.css';

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      };

      const response = await adminService.getAllForumPosts(params);
      if (response.success) {
        setPosts(response.data.posts);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load forum posts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (postId) => {
    try {
      await adminService.approvePost(postId);
      toast.success('Post approved');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to approve post');
    }
  };

  const handleReject = async (postId) => {
    try {
      await adminService.rejectPost(postId);
      toast.success('Post rejected');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to reject post');
    }
  };

  const handleTogglePin = async (postId) => {
    try {
      await adminService.togglePinPost(postId);
      toast.success('Post pin status updated');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  const handleToggleLock = async (postId) => {
    try {
      await adminService.toggleLockPost(postId);
      toast.success('Post lock status updated');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to update lock status');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await adminService.deleteForumPost(postId);
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="forum-page">
      <div className="page-header">
        <div>
          <h1>Forum Management</h1>
          <p>Moderate forum posts and discussions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Posts</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="card">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : (
          <>
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post._id} className="post-card">
                  <div className="post-header">
                    <div className="post-title-section">
                      <h3>{post.title}</h3>
                      <div className="post-meta">
                        <span className="post-author">by {post.author?.username || 'Unknown'}</span>
                        <span className="post-date">{formatDate(post.createdAt)}</span>
                        <span className={`post-status status-${post.status}`}>{post.status}</span>
                        {post.isPinned && <Pin size={14} className="pin-icon" />}
                        {post.isLocked && <Lock size={14} className="lock-icon" />}
                      </div>
                    </div>
                    <div className="post-stats">
                      <div className="stat-item">
                        <span className="stat-value">{post.likes?.length || 0}</span>
                        <span className="stat-label">Likes</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">{post.comments?.length || 0}</span>
                        <span className="stat-label">Comments</span>
                      </div>
                    </div>
                  </div>

                  <div className="post-content">
                    <p>{post.content.substring(0, 200)}...</p>
                  </div>

                  <div className="post-actions">
                    {post.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(post._id)}
                          className="btn btn-success btn-sm"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(post._id)}
                          className="btn btn-danger btn-sm"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleTogglePin(post._id)}
                      className={`btn btn-outline btn-sm ${post.isPinned ? 'active' : ''}`}
                    >
                      <Pin size={16} />
                      {post.isPinned ? 'Unpin' : 'Pin'}
                    </button>

                    <button
                      onClick={() => handleToggleLock(post._id)}
                      className={`btn btn-outline btn-sm ${post.isLocked ? 'active' : ''}`}
                    >
                      <Lock size={16} />
                      {post.isLocked ? 'Unlock' : 'Lock'}
                    </button>

                    <button
                      onClick={() => handleDelete(post._id)}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {posts.length === 0 && (
                <div className="no-data">
                  <p>No forum posts found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="pagination">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="btn btn-outline"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn btn-outline"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Forum;
