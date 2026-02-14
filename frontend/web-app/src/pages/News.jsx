import React, { useEffect, useState } from 'react';
import { newsService } from '../services/api';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import './News.css';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('published');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    body: '',
    category: 'feature',
    status: 'published',
    display: {
      showAsPopup: false,
      priority: 5,
    },
  });

  useEffect(() => {
    fetchNews();
  }, [categoryFilter, statusFilter]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 50,
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        status: statusFilter,
      };
      const response = await newsService.getAllNews(params);
      if (response.success) {
        setNews(response.data);
      }
    } catch (error) {
      toast.error('Failed to load news');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingNews) {
        await newsService.updateNews(editingNews._id, formData);
        toast.success('News updated successfully');
      } else {
        await newsService.createNews(formData);
        toast.success('News created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchNews();
    } catch (error) {
      toast.error(editingNews ? 'Failed to update news' : 'Failed to create news');
      console.error(error);
    }
  };

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      description: newsItem.description,
      body: newsItem.body,
      category: newsItem.category,
      status: newsItem.status,
      display: newsItem.display || { showAsPopup: false, priority: 5 },
    });
    setShowModal(true);
  };

  const handleDelete = async (newsId) => {
    if (!window.confirm('Are you sure you want to delete this news article?')) return;

    try {
      await newsService.deleteNews(newsId);
      toast.success('News deleted successfully');
      fetchNews();
    } catch (error) {
      toast.error('Failed to delete news');
    }
  };

  const resetForm = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      description: '',
      body: '',
      category: 'feature',
      status: 'published',
      display: { showAsPopup: false, priority: 5 },
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="news-page">
      <div className="page-header">
        <div>
          <h1>News Management</h1>
          <p>Create and manage news articles</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Create News
        </button>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters">
          <div className="filter-group">
            <label>Category:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="feature">Feature</option>
              <option value="model_update">Model Update</option>
              <option value="announcement">Announcement</option>
              <option value="tips">Tips</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* News Grid */}
      <div className="news-grid">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading news...</p>
          </div>
        ) : (
          news.map((item) => (
            <div key={item._id} className="news-card">
              <div className="news-header">
                <span className={`category-badge category-${item.category}`}>{item.category}</span>
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
              </div>

              <h3>{item.title}</h3>
              <p className="news-description">{item.description}</p>

              <div className="news-meta">
                <div className="meta-item">
                  <Eye size={14} />
                  <span>{item.engagement?.views || 0} views</span>
                </div>
                <span className="news-date">{formatDate(item.createdAt)}</span>
              </div>

              <div className="news-actions">
                <button onClick={() => handleEdit(item)} className="btn btn-outline btn-sm">
                  <Edit size={16} />
                  Edit
                </button>
                <button onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNews ? 'Edit News' : 'Create News'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="news-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter news title"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Brief description"
                />
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  required
                  rows={10}
                  placeholder="Full article content (Markdown supported)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="feature">Feature</option>
                    <option value="model_update">Model Update</option>
                    <option value="announcement">Announcement</option>
                    <option value="tips">Tips</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.display.showAsPopup}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display: { ...formData.display, showAsPopup: e.target.checked },
                        })
                      }
                    />{' '}
                    Show as popup
                  </label>
                </div>

                <div className="form-group">
                  <label>Priority (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.display.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display: { ...formData.display, priority: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingNews ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
