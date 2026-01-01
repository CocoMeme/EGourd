// Export all models from a central location
const User = require('./User');
const News = require('./News');
const Pollination = require('./Pollination');
const ForumPost = require('./ForumPost');
const FlowerPrediction = require('./FlowerPrediction');
const YieldPrediction = require('./YieldPrediction');

module.exports = {
  User,
  News,
  Pollination,
  ForumPost,
  FlowerPrediction,
  YieldPrediction,
};