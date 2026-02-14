import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { userForumService } from '../../services/userApi';
import {
  ArrowLeft,
  Send,
  Lightbulb,
  HelpCircle,
  Image as ImageIcon,
  MessagesSquare,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserLayout from '../../components/user/UserLayout';
import './UserCreatePost.css';

const categories = [
  {
    id: 'tips',
    label: 'Tips & Tricks',
    icon: Lightbulb,
    color: '#10b981',
    description: 'Share your gardening wisdom',
  },
  {
    id: 'questions',
    label: 'Q&A',
    icon: HelpCircle,
    color: '#3b82f6',
    description: 'Ask the community for help',
  },
  {
    id: 'showcase',
    label: 'Showcase',
    icon: ImageIcon,
    color: '#f59e0b',
    description: 'Show off your gourds',
  },
  {
    id: 'discussion',
    label: 'Discussion',
    icon: MessagesSquare,
    color: '#8b5cf6',
    description: 'General discussions',
  },
];

const UserCreatePost = () => {
  const navigate = useNavigate();
  const { user } = useUserAuth();

  const [selectedCategory, setSelectedCategory] = useState('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (!tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.warning('Please login to create a post');
      navigate('/user/login');
      return;
    }

    if (!title.trim()) {
      toast.warning('Please enter a title');
      return;
    }

    if (!content.trim()) {
      toast.warning('Please enter some content');
      return;
    }

    if (title.length > 200) {
      toast.error('Title is too long (max 200 characters)');
      return;
    }

    if (content.length > 5000) {
      toast.error('Content is too long (max 5000 characters)');
      return;
    }

    setLoading(true);

    try {
      const postData = {
        category: selectedCategory,
        title: title.trim(),
        content: content.trim(),
        tags: tags,
      };

      const response = await userForumService.createPost(postData);

      if (response.success) {
        toast.success('Post created successfully!');
        navigate('/user/forum');
      } else {
        toast.error(response.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserLayout>
      <div className="create-post-page">
        {/* Header */}
        <div className="create-post-header">
          <button className="back-btn" onClick={() => navigate('/user/forum')}>
            <ArrowLeft size={20} />
            Cancel
          </button>
          <h1>Create New Post</h1>
        </div>

        <form className="create-post-form" onSubmit={handleSubmit}>
          {/* Category Selection */}
          <div className="form-section">
            <label className="section-label">Category</label>
            <div className="category-grid">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-option ${selectedCategory === cat.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{ '--cat-color': cat.color }}
                  >
                    <Icon size={24} />
                    <span className="cat-label">{cat.label}</span>
                    <span className="cat-desc">{cat.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="form-section">
            <label className="section-label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              type="text"
              className="title-input"
              placeholder="What's your post about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <span className="char-count">{title.length}/200</span>
          </div>

          {/* Content */}
          <div className="form-section">
            <label className="section-label" htmlFor="content">
              Content
            </label>
            <textarea
              id="content"
              className="content-input"
              placeholder="Share your thoughts, tips, or questions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              maxLength={5000}
            />
            <span className="char-count">{content.length}/5000</span>
          </div>

          {/* Tags */}
          <div className="form-section">
            <label className="section-label">Tags (optional)</label>
            <div className="tags-container">
              {tags.map((tag, index) => (
                <span key={index} className="tag-item">
                  #{tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    <X size={14} />
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  className="tag-input"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              )}
            </div>
            <span className="helper-text">Press Enter to add a tag (max 5 tags)</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !title.trim() || !content.trim()}
          >
            {loading ? (
              'Publishing...'
            ) : (
              <>
                <Send size={20} />
                Publish Post
              </>
            )}
          </button>
        </form>
      </div>
    </UserLayout>
  );
};

export default UserCreatePost;
