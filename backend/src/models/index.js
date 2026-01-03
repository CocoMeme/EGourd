// Export all models from a central location
const User = require('./User');
const News = require('./News');
const Pollination = require('./Pollination');
const Plant = require('./Plant'); // New comprehensive plant model
const ForumPost = require('./ForumPost');
const FlowerPrediction = require('./FlowerPrediction');
const YieldPrediction = require('./YieldPrediction');

module.exports = {
  User,
  News,
  Pollination,
  Plant, // New model for revised pollination management
  ForumPost,
  FlowerPrediction,
  YieldPrediction,
};