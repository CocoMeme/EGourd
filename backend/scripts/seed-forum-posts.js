#!/usr/bin/env node

/**
 * Forum Posts Seed Runner
 * Populates the database with initial forum posts
 * Usage: node backend/scripts/seed-forum-posts.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const path = require('path');

// Import models
const ForumPost = require('../src/models/ForumPost');

// Import seed data
const forumPostsData = require('../seeds/forumPosts.seed');

async function seedForumPosts() {
  try {
    // Connect to database
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/egourd';
    console.log('🔌 Connecting to database:', dbUri);
    
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing forum posts from admin (optional - only clears posts by this author)
    const adminId = '69528d77c821503ec8de7fa0';
    console.log('🗑️  Clearing existing forum posts from EGourd Admin...');
    await ForumPost.deleteMany({ author: adminId });
    console.log('✅ Cleared existing admin forum posts');

    // Insert new forum posts
    console.log('📝 Seeding forum posts...');
    const inserted = await ForumPost.insertMany(forumPostsData);
    console.log(`✅ Successfully seeded ${inserted.length} forum post(s)`);

    // Display inserted records
    inserted.forEach((post, index) => {
      console.log(`\n📄 Post ${index + 1}:`);
      console.log(`   Title: ${post.title}`);
      console.log(`   ID: ${post._id}`);
      console.log(`   Category: ${post.category}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   Pinned: ${post.isPinned}`);
    });

    console.log('\n✨ Forum posts seeding completed successfully!');

    // Disconnect
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error seeding forum posts:', error.message);
    process.exit(1);
  }
}

// Run seeder
seedForumPosts();
