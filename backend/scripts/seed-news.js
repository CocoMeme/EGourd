#!/usr/bin/env node

/**
 * News Seed Runner
 * Populates the database with initial news articles
 * Usage: node backend/scripts/seed-news.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const path = require('path');

// Import models
const News = require('../src/models/News');

// Import seed data
const newsData = require('../seeds/news.seed');

async function seedNews() {
  try {
    // Connect to database
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/egourd';
    console.log('🔌 Connecting to database:', dbUri);
    
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing news (optional - comment out to append)
    console.log('🗑️  Clearing existing news articles...');
    await News.deleteMany({});
    console.log('✅ Cleared existing news');

    // Insert new news
    console.log('📰 Seeding news articles...');
    const inserted = await News.insertMany(newsData);
    console.log(`✅ Successfully seeded ${inserted.length} news article(s)`);

    // Display inserted records
    inserted.forEach((news, index) => {
      console.log(`\n📄 News ${index + 1}:`);
      console.log(`   Title: ${news.title}`);
      console.log(`   ID: ${news._id}`);
      console.log(`   Category: ${news.category}`);
      console.log(`   Status: ${news.status}`);
    });

    console.log('\n✨ News seeding completed successfully!');

    // Disconnect
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error seeding news:', error.message);
    process.exit(1);
  }
}

// Run seeder
seedNews();
