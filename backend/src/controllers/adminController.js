const { User } = require('../models');
const ForumPost = require('../models/ForumPost');
const News = require('../models/News');
const Scan = require('../models/Scan');
const mongoose = require('mongoose');

/**
 * Admin Controller
 * Handles admin dashboard operations including user management
 */

/**
 * Get admin dashboard overview
 * @route GET /api/admin/dashboard
 * @access Private/Admin
 */
exports.getDashboardOverview = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
    const activeUserFilter = { deletedAt: null };

    const totalUsers = await User.countDocuments(activeUserFilter);
    const activeUsers = await User.countDocuments({ ...activeUserFilter, isActive: true });
    const inactiveUsers = await User.countDocuments({ ...activeUserFilter, isActive: false });
    const newUsers30Days = await User.countDocuments({
      ...activeUserFilter,
      createdAt: { $gte: thirtyDaysAgo },
    });
    const newUsers7Days = await User.countDocuments({
      ...activeUserFilter,
      createdAt: { $gte: sevenDaysAgo },
    });

    const usersByRole = await User.aggregate([
      { $match: activeUserFilter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const usersByProvider = await User.aggregate([
      { $match: activeUserFilter },
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
        },
      },
    ]);

    const verifiedUsers = await User.countDocuments({ ...activeUserFilter, isEmailVerified: true });
    const unverifiedUsers = await User.countDocuments({ ...activeUserFilter, isEmailVerified: false });

    const totalPosts = await ForumPost.countDocuments();
    const activePosts = await ForumPost.countDocuments({ status: 'active' });
    const pendingPosts = await ForumPost.countDocuments({ status: 'pending' });
    const flaggedPosts = await ForumPost.countDocuments({ status: 'flagged' });
    const rejectedPosts = await ForumPost.countDocuments({ status: 'rejected' });
    const deletedPosts = await ForumPost.countDocuments({ status: 'deleted' });
    const pinnedPosts = await ForumPost.countDocuments({ isPinned: true });

    const totalNews = await News.countDocuments();
    const publishedNews = await News.countDocuments({ status: 'published' });
    const draftNews = await News.countDocuments({ status: 'draft' });
    const archivedNews = await News.countDocuments({ status: 'archived' });

    const totalScans = await Scan.countDocuments();
    const scans7Days = await Scan.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const scans30Days = await Scan.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const scansByVariety = await Scan.aggregate([
      {
        $group: {
          _id: '$variety',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const scansByPrediction = await Scan.aggregate([
      {
        $group: {
          _id: '$prediction',
          count: { $sum: 1 },
        },
      },
    ]);

    const recentScans = await Scan.find()
      .select('userId imageUrl prediction variety confidence createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'email firstName lastName');

    const recentRegistrations = await User.find(activeUserFilter)
      .select('username email firstName lastName createdAt provider isActive')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: {
        overview: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          verifiedUsers,
          unverifiedUsers,
          newUsers30Days,
          newUsers7Days,
        },
        scanStats: {
          totalScans,
          scans7Days,
          scans30Days,
        },
        forumStats: {
          totalPosts,
          activePosts,
          pendingPosts,
          flaggedPosts,
          rejectedPosts,
          deletedPosts,
          pinnedPosts,
        },
        newsStats: {
          totalNews,
          publishedNews,
          draftNews,
          archivedNews,
        },
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        usersByProvider: usersByProvider.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentRegistrations,
        recentScans,
        scansByVariety: scansByVariety.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        scansByPrediction: scansByPrediction.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard overview',
      error: error.message,
    });
  }
};

/**
 * Get all users with pagination, filtering, and sorting
 * @route GET /api/admin/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      provider = '',
      isActive = '',
      isEmailVerified = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = { deletedAt: null };

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (provider) {
      filter.provider = provider;
    }

    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (isEmailVerified !== '') {
      filter.isEmailVerified = isEmailVerified === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const users = await User.find(filter)
      .select('-password -refreshTokens -verificationPin')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          usersPerPage: parseInt(limit),
          hasNextPage: skip + users.length < total,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

/**
 * Get all users with pagination, filtering, and sorting
 * @route GET /api/admin/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      provider = '',
      isActive = '',
      isEmailVerified = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter query
    const filter = { deletedAt: null };

    // Search by username, email, firstName, or lastName
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (role) {
      filter.role = role;
    }

    // Filter by provider
    if (provider) {
      filter.provider = provider;
    }

    // Filter by active status
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Filter by email verification status
    if (isEmailVerified !== '') {
      filter.isEmailVerified = isEmailVerified === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -refreshTokens -verificationPin')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          usersPerPage: parseInt(limit),
          hasNextPage: skip + users.length < total,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

/**
 * Get user profile by ID
 * @route GET /api/admin/users/:userId
 * @access Private/Admin
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findOne({ _id: userId, deletedAt: null }).select(
      '-password -refreshTokens -verificationPin'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message,
    });
  }
};

/**
 * Update user details
 * @route PUT /api/admin/users/:userId
 * @access Private/Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Prevent updating sensitive fields through this endpoint
    const restrictedFields = ['password', 'refreshTokens', 'verificationPin', '_id'];
    restrictedFields.forEach((field) => delete updates[field]);

    const user = await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -verificationPin');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

/**
 * Activate user account
 * @route PATCH /api/admin/users/:userId/activate
 * @access Private/Admin
 */
exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: { isActive: true } },
      { new: true }
    ).select('-password -refreshTokens -verificationPin');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User account activated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user account',
      error: error.message,
    });
  }
};

/**
 * Deactivate user account
 * @route PATCH /api/admin/users/:userId/deactivate
 * @access Private/Admin
 */
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body || {};

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    // First, find the user and revoke refresh tokens
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Revoke all refresh tokens if they exist
    if (user.refreshTokens && user.refreshTokens.length > 0) {
      user.refreshTokens.forEach((token) => {
        token.isActive = false;
      });
    }

    // Update user status
    user.isActive = false;
    if (reason) {
      user.deactivationReason = reason;
    }

    await user.save();

    // Return user without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;
    delete userResponse.verificationPin;

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully',
      data: { user: userResponse },
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user account',
      error: error.message,
    });
  }
};

/**
 * Suspend user account temporarily
 * @route PATCH /api/admin/users/:userId/suspend
 * @access Private/Admin
 */
exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body || {}; // duration in days

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Prevent admin from suspending themselves
    if (userId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot suspend your own account',
      });
    }

    const suspendUntil = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

    const user = await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      {
        $set: {
          isActive: false,
          suspendedAt: new Date(),
          suspendUntil,
          ...(reason && { suspensionReason: reason }),
        },
      },
      { new: true }
    ).select('-password -refreshTokens -verificationPin');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `User account suspended${suspendUntil ? ` until ${suspendUntil.toISOString()}` : ''}`,
      data: { user },
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user account',
      error: error.message,
    });
  }
};

/**
 * Delete user account (soft delete by default)
 * @route DELETE /api/admin/users/:userId
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Soft delete - mark as deleted with timestamp
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Mark as deleted and inactive
    user.deletedAt = new Date();
    user.isActive = false;

    // Revoke all refresh tokens if they exist
    if (user.refreshTokens && user.refreshTokens.length > 0) {
      user.refreshTokens.forEach((token) => {
        token.isActive = false;
      });
    }

    await user.save();

    // Return user without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;
    delete userResponse.verificationPin;

    res.status(200).json({
      success: true,
      message: 'User account deleted successfully',
      data: { user: userResponse },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user account',
      error: error.message,
    });
  }
};

/**
 * Change user role
 * @route PATCH /api/admin/users/:userId/role
 * @access Private/Admin
 */
exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body || {};

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Validate role (only user and admin allowed)
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Prevent changing own role if admin
    if (userId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }

    const user = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).select(
      '-password -refreshTokens -verificationPin'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `User role changed to ${role} successfully`,
      data: { user },
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change user role',
      error: error.message,
    });
  }
};

/**
 * Bulk update users
 * @route POST /api/admin/users/bulk-update
 * @access Private/Admin
 */
exports.bulkUpdateUsers = async (req, res) => {
  try {
    const { userIds, action, value } = req.body || {};

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required',
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required',
      });
    }

    // Validate all ObjectIds
    const validIds = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more invalid user IDs',
      });
    }

    // Prevent admin from including themselves in bulk actions
    if (validIds.includes(req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You cannot perform bulk actions on your own account',
      });
    }

    let update = {};
    let message = '';

    switch (action) {
      case 'activate':
        update = { isActive: true };
        message = 'Users activated successfully';
        break;
      case 'deactivate':
        update = { isActive: false };
        message = 'Users deactivated successfully';
        break;
      case 'changeRole':
        if (!['user', 'admin', 'researcher'].includes(value)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role value',
          });
        }
        update = { role: value };
        message = `Users role changed to ${value} successfully`;
        break;
      case 'verifyEmail':
        update = { isEmailVerified: true };
        message = 'Users email verified successfully';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
        });
    }

    const result = await User.updateMany({ _id: { $in: validIds } }, { $set: update });

    res.status(200).json({
      success: true,
      message,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update',
      error: error.message,
    });
  }
};

/**
 * Get user activity statistics
 * @route GET /api/admin/users/:userId/stats
 * @access Private/Admin
 */
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findOne({ _id: userId, deletedAt: null }).select(
      'stats loginCount lastLogin createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        userId,
        stats: user.stats,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        memberSince: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: error.message,
    });
  }
};

/**
 * Get all forum posts with pagination and filters
 * @route GET /api/admin/forum/posts
 * @access Private/Admin
 */
exports.getAllForumPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      status = '',
      isPinned,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter query
    const filter = {};

    // Search by title or content
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by pinned status if specified
    if (isPinned !== undefined) {
      filter.isPinned = isPinned === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Get posts with pagination
    const posts = await ForumPost.find(filter)
      .populate('author', 'username firstName lastName email emailVerified')
      .populate('comments.user', 'username firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await ForumPost.countDocuments(filter);

    // Format posts
    const formattedPosts = posts.map((post) => ({
      ...post,
      likeCount: post.likes?.length || 0,
      commentCount: post.comments?.length || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Forum posts retrieved successfully',
      data: {
        posts: formattedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPosts: total,
          postsPerPage: parseInt(limit),
          hasNextPage: skip + posts.length < total,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get all forum posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve forum posts',
      error: error.message,
    });
  }
};

/**
 * Get forum post by ID
 * @route GET /api/admin/forum/posts/:postId
 * @access Private/Admin
 */
exports.getForumPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    const post = await ForumPost.findById(postId)
      .populate('author', 'username firstName lastName email emailVerified')
      .populate('comments.user', 'username firstName lastName email')
      .populate('likes.user', 'username firstName lastName');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Forum post retrieved successfully',
      data: { post },
    });
  } catch (error) {
    console.error('Get forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve forum post',
      error: error.message,
    });
  }
};

/**
 * Update forum post status (active, archived, deleted, flagged)
 * @route PATCH /api/admin/forum/posts/:postId/status
 * @access Private/Admin
 */
exports.updateForumPostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body || {};

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    // Validate status
    const validStatuses = ['active', 'archived', 'deleted', 'flagged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const post = await ForumPost.findByIdAndUpdate(
      postId,
      { $set: { status } },
      { new: true }
    ).populate('author', 'username firstName lastName email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Forum post status updated to ${status}`,
      data: { post },
    });
  } catch (error) {
    console.error('Update forum post status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update forum post status',
      error: error.message,
    });
  }
};

/**
 * Delete forum post (soft delete only)
 * @route DELETE /api/admin/forum/posts/:postId
 * @access Private/Admin
 */
exports.deleteForumPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    // Soft delete - just change status to 'deleted'
    const post = await ForumPost.findByIdAndUpdate(
      postId,
      { $set: { status: 'deleted' } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Forum post removed from community (soft delete)',
      data: { post },
    });
  } catch (error) {
    console.error('Delete forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete forum post',
      error: error.message,
    });
  }
};

/**
 * Pin/Unpin forum post
 * @route PATCH /api/admin/forum/posts/:postId/pin
 * @access Private/Admin
 */
exports.togglePinPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.status(200).json({
      success: true,
      message: `Forum post ${post.isPinned ? 'pinned' : 'unpinned'}`,
      data: { post },
    });
  } catch (error) {
    console.error('Toggle pin post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle pin status',
      error: error.message,
    });
  }
};

/**
 * Lock/Unlock forum post
 * @route PATCH /api/admin/forum/posts/:postId/lock
 * @access Private/Admin
 */
exports.toggleLockPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    post.isLocked = !post.isLocked;
    await post.save();

    res.status(200).json({
      success: true,
      message: `Forum post ${post.isLocked ? 'locked' : 'unlocked'}`,
      data: { post },
    });
  } catch (error) {
    console.error('Toggle lock post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle lock status',
      error: error.message,
    });
  }
};

/**
 * Approve pending forum post
 * @route PATCH /api/admin/forum/posts/:postId/approve
 * @access Private/Admin
 */
exports.approvePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { note } = req.body || {};

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    const post = await ForumPost.findByIdAndUpdate(
      postId,
      {
        $set: {
          status: 'active',
          moderatedBy: req.user._id,
          moderatedAt: new Date(),
          ...(note && { moderationNote: note }),
        },
      },
      { new: true }
    ).populate('author', 'username firstName lastName email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Post approved and published to community',
      data: { post },
    });
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve post',
      error: error.message,
    });
  }
};

/**
 * Reject pending forum post
 * @route PATCH /api/admin/forum/posts/:postId/reject
 * @access Private/Admin
 */
exports.rejectPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body || {};

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const post = await ForumPost.findByIdAndUpdate(
      postId,
      {
        $set: {
          status: 'rejected',
          moderatedBy: req.user._id,
          moderatedAt: new Date(),
          moderationNote: reason.trim(),
        },
      },
      { new: true }
    ).populate('author', 'username firstName lastName email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Post rejected',
      data: { post },
    });
  } catch (error) {
    console.error('Reject post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject post',
      error: error.message,
    });
  }
};
