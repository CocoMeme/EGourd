const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    // Basic news information
    title: {
      type: String,
      required: [true, 'News title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'News description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    body: {
      type: String,
      required: [true, 'News body is required'],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        'model_update', // ML model updates
        'feature', // New features
        'bug_fix', // Bug fixes
        'maintenance', // System maintenance
        'announcement', // General announcements
        'improvement', // Performance improvements
        'security', // Security updates
        'other',
      ],
      required: true,
      default: 'announcement',
    },

    // Version information (for model updates and app versions)
    version: {
      modelVersion: String, // e.g., "v1.10.30"
      appVersion: String, // e.g., "1.0.0"
      versionNumber: String, // Generic version field
    },

    // Additional metadata
    metadata: {
      datasetSize: String, // e.g., "2.6GB"
      datasetInfo: String, // e.g., "Ampalaya Bilog"
      improvements: [String], // List of improvements
      technicalDetails: String, // Technical information
      affectedPlatforms: [String], // iOS, Android, Web
    },

    // Media attachments
    media: {
      images: [
        {
          url: String,
          cloudinaryId: String,
          caption: String,
          altText: String,
        },
      ],
      thumbnail: {
        url: String,
        cloudinaryId: String,
      },
    },

    // Release and scheduling
    releaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    scheduledPublishDate: {
      type: Date,
    },

    expiryDate: {
      type: Date, // Optional: When the news should no longer be highlighted
    },

    // Display settings
    display: {
      isPinned: { type: Boolean, default: false }, // Pin to top
      isHighlighted: { type: Boolean, default: false }, // Highlight in UI
      showAsPopup: { type: Boolean, default: false }, // Show as popup on login
      priority: {
        // Display priority
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },
    },

    // User engagement
    engagement: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      readBy: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          readAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Content management
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    tags: [String],

    // Status and visibility
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'scheduled'],
      default: 'draft',
    },

    isPublic: {
      type: Boolean,
      default: true,
    },

    // SEO and sharing
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
newsSchema.index({ status: 1, releaseDate: -1 });
newsSchema.index({ category: 1, releaseDate: -1 });
newsSchema.index({ 'display.isPinned': 1, 'display.priority': -1 });
newsSchema.index({ 'display.showAsPopup': 1, releaseDate: -1 });
newsSchema.index({ tags: 1 });
newsSchema.index({ releaseDate: -1 });

// Text search index
newsSchema.index(
  {
    title: 'text',
    description: 'text',
    body: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      description: 5,
      tags: 3,
      body: 1,
    },
  }
);

// Virtual for read status
newsSchema.virtual('isNew').get(function () {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return this.releaseDate > threeDaysAgo;
});

// Virtual for engagement rate
newsSchema.virtual('engagementRate').get(function () {
  if (this.engagement.views === 0) return 0;
  return ((this.engagement.likes / this.engagement.views) * 100).toFixed(2);
});

// Static method to get published news
newsSchema.statics.getPublishedNews = function (filters = {}, limit = 10, skip = 0) {
  return this.find({
    status: 'published',
    isPublic: true,
    releaseDate: { $lte: new Date() },
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } },
    ],
    ...filters,
  })
    .sort({ 'display.isPinned': -1, 'display.priority': -1, releaseDate: -1 })
    .limit(limit)
    .skip(skip)
    .populate('author', 'username email');
};

// Static method to get news for popup (shown on login)
newsSchema.statics.getPopupNews = function (userId) {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return this.find({
    status: 'published',
    isPublic: true,
    'display.showAsPopup': true,
    releaseDate: {
      $gte: threeDaysAgo,
      $lte: new Date(),
    },
    'engagement.readBy.user': { $ne: userId },
  })
    .sort({ 'display.priority': -1, releaseDate: -1 })
    .limit(3);
};

// Static method to get news by category
newsSchema.statics.getNewsByCategory = function (category, limit = 10) {
  return this.find({
    status: 'published',
    isPublic: true,
    category: category,
    releaseDate: { $lte: new Date() },
  })
    .sort({ releaseDate: -1 })
    .limit(limit);
};

// Static method to search news
newsSchema.statics.searchNews = function (query, limit = 20) {
  return this.find({
    $text: { $search: query },
    status: 'published',
    isPublic: true,
    releaseDate: { $lte: new Date() },
  })
    .sort({ score: { $meta: 'textScore' }, releaseDate: -1 })
    .limit(limit);
};

// Instance method to mark as read by user
newsSchema.methods.markAsRead = async function (userId) {
  const alreadyRead = this.engagement.readBy.some(
    (read) => read.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.engagement.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    await this.save();
  }
};

// Instance method to increment views
newsSchema.methods.incrementViews = async function () {
  this.engagement.views += 1;
  await this.save();
};

// Instance method to increment likes
newsSchema.methods.incrementLikes = async function () {
  this.engagement.likes += 1;
  await this.save();
};

// Pre-save middleware to auto-publish scheduled news
newsSchema.pre('save', function (next) {
  if (
    this.status === 'scheduled' &&
    this.scheduledPublishDate &&
    this.scheduledPublishDate <= new Date()
  ) {
    this.status = 'published';
  }
  next();
});

const News = mongoose.model('News', newsSchema);

module.exports = News;
