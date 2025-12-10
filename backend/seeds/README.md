# News Seeding Guide

This guide explains how to use the news seeding system to populate your database with initial news articles.

## Files Structure

```
backend/
├── seeds/
│   └── news.seed.js          # News data seed file
├── scripts/
│   └── seed-news.js          # Seed runner script
└── src/
    └── models/
        └── News.js           # News model

frontend/mobile-app/src/assets/
└── news/
    └── first-ml-model-release-v1.10.30.json  # News asset file
```

## Quick Start

### Option 1: Using the Seed Script (Recommended)

Run the seeding script from the backend directory:

```bash
cd backend
node scripts/seed-news.js
```

**What it does:**
- ✅ Connects to MongoDB using `MONGODB_URI` from `.env`
- ✅ Clears existing news articles (optional - you can comment this out)
- ✅ Inserts seed data from `seeds/news.seed.js`
- ✅ Displays inserted records with their IDs
- ✅ Disconnects from MongoDB

**Expected Output:**
```
🔌 Connecting to database: mongodb://localhost:27017/egourd
✅ Connected to MongoDB
🗑️  Clearing existing news articles...
✅ Cleared existing news
📰 Seeding news articles...
✅ Successfully seeded 1 news article(s)

📄 News 1:
   Title: First ML Model Release - Ampalaya Bilog v1.10.30
   ID: 6908b03889439ddc640ca3c9
   Category: model_update
   Status: published

✨ News seeding completed successfully!
🔌 Disconnected from MongoDB
```

### Option 2: Manual Database Insertion

If you prefer to insert manually, you can use MongoDB Compass or the mongo shell:

```javascript
// Connect to your database and run:
db.news.insertOne({
  // ... data from seeds/news.seed.js
})
```

## News Asset File

The news data is also saved as a JSON asset file for reference:

**Location:** `frontend/mobile-app/src/assets/news/first-ml-model-release-v1.10.30.json`

**Purpose:**
- Can be used for testing without database
- Serves as a backup of news data
- Can be imported into the app statically if needed

## Adding More News Articles

To add more news articles:

1. **Edit** `backend/seeds/news.seed.js`
2. **Add** your new article object to the `newsData` array
3. **Run** `node scripts/seed-news.js` again

Example:
```javascript
const newsData = [
  // ... existing news ...
  {
    title: "New Feature Release - Real-time Analysis",
    description: "...",
    body: "...",
    category: "feature_update",
    // ... other fields
  }
];
```

## News Article Structure

Each news article follows this schema:

```javascript
{
  title: String,                    // Article title
  description: String,              // Short description
  body: String,                     // Full markdown content
  category: String,                 // Category (model_update, feature_update, etc)
  version: {
    modelVersion: String,           // e.g., "v1.10.30"
    appVersion: String,             // e.g., "1.0.0"
    versionNumber: String           // e.g., "1.10.30"
  },
  metadata: {
    datasetSize: String,            // e.g., "2.6GB"
    datasetInfo: String,            // Description of dataset
    improvements: [String],         // List of improvements
    technicalDetails: String,       // Technical info
    affectedPlatforms: [String]     // iOS, Android, Web, etc
  },
  media: {
    images: [String]                // Image URLs
  },
  releaseDate: Date,                // Release date
  display: {
    isPinned: Boolean,              // Pin to top
    isHighlighted: Boolean,         // Highlight article
    showAsPopup: Boolean,           // Show popup on app start
    priority: Number                // Priority level (1-10)
  },
  engagement: {
    views: Number,                  // View count
    likes: Number,                  // Like count
    readBy: [Object]                // User read history
  },
  tags: [String],                   // Search tags
  status: String,                   // "draft" or "published"
  isPublic: Boolean,                // Public visibility
  seo: {
    metaTitle: String,              // SEO title
    metaDescription: String,        // SEO description
    keywords: [String]              // SEO keywords
  }
}
```

## Categories

Common news categories:

- `model_update` - Machine learning model updates
- `feature_update` - New features
- `bug_fix` - Bug fixes and patches
- `announcement` - General announcements
- `maintenance` - Maintenance notices
- `tutorial` - How-to guides
- `changelog` - Version changelogs

## Troubleshooting

### Connection Error
**Error:** `Cannot connect to MongoDB`
- Check that MongoDB is running
- Verify `MONGODB_URI` in `.env` is correct

### Model Not Found
**Error:** `Cannot find module 'News'`
- Ensure the News model exists at `backend/src/models/News.js`
- Check that the path is correct

### Permission Denied
**Error:** `EACCES: permission denied`
- Try running with `sudo` (if on Linux/Mac)
- Or use: `node scripts/seed-news.js` instead of `./scripts/seed-news.js`

## Next Steps

Once seeded, you can:

1. **Fetch news in the app:**
   ```javascript
   const response = await fetch('/api/news');
   const news = await response.json();
   ```

2. **Display news in UI:**
   - Create a news list screen
   - Show highlighted articles in modals
   - Pin important updates to the top

3. **Add more articles:**
   - Update `seeds/news.seed.js`
   - Re-run the seed script

4. **Manage via API:**
   - Use admin dashboard to create/edit/delete news
   - Track engagement metrics
   - Schedule future releases

Happy news management! 📰
