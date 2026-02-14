const { News } = require('../models');

/**
 * Get all published news
 * @route GET /api/news
 */
exports.getAllNews = async (req, res) => {
  try {
    const { category, status, limit = 10, skip = 0, search } = req.query;

    let news;

    if (search) {
      news = await News.searchNews(search, parseInt(limit));
    } else {
      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;

      // If user is authenticated (admin view), allow viewing all statuses
      // Otherwise, use getPublishedNews for public view
      if (req.user) {
        news = await News.find(filters)
          .sort({ 'display.isPinned': -1, 'display.priority': -1, createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .populate('author', 'username email');
      } else {
        news = await News.getPublishedNews(filters, parseInt(limit), parseInt(skip));
      }
    }

    res.status(200).json({
      success: true,
      count: news.length,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message,
    });
  }
};

/**
 * Get news by ID
 * @route GET /api/news/:id
 */
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findById(id).populate('author', 'username email');

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    // Increment views
    await news.incrementViews();

    res.status(200).json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching news by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message,
    });
  }
};

/**
 * Get popup news for logged-in user
 * @route GET /api/news/popup
 */
exports.getPopupNews = async (req, res) => {
  try {
    const userId = req.user._id;
    const news = await News.getPopupNews(userId);

    res.status(200).json({
      success: true,
      count: news.length,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching popup news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popup news',
      error: error.message,
    });
  }
};

/**
 * Get news by category
 * @route GET /api/news/category/:category
 */
exports.getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const news = await News.getNewsByCategory(category, parseInt(limit));

    res.status(200).json({
      success: true,
      count: news.length,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news by category',
      error: error.message,
    });
  }
};

/**
 * Mark news as read
 * @route POST /api/news/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    await news.markAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'News marked as read',
      data: news,
    });
  } catch (error) {
    console.error('Error marking news as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark news as read',
      error: error.message,
    });
  }
};

/**
 * Like news
 * @route POST /api/news/:id/like
 */
exports.likeNews = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    await news.incrementLikes();

    res.status(200).json({
      success: true,
      message: 'News liked',
      data: {
        likes: news.engagement.likes,
      },
    });
  } catch (error) {
    console.error('Error liking news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like news',
      error: error.message,
    });
  }
};

/**
 * Create news (Admin only)
 * @route POST /api/news
 */
exports.createNews = async (req, res) => {
  try {
    const newsData = {
      ...req.body,
      author: req.user._id,
    };

    const news = await News.create(newsData);

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: news,
    });
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create news',
      error: error.message,
    });
  }
};

/**
 * Update news (Admin only)
 * @route PUT /api/news/:id
 */
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'News updated successfully',
      data: news,
    });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update news',
      error: error.message,
    });
  }
};

/**
 * Delete news (Admin only)
 * @route DELETE /api/news/:id
 */
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findByIdAndDelete(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'News deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete news',
      error: error.message,
    });
  }
};
