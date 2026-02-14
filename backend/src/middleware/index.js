// Export all middleware from a central location
const auth = require('./auth');
const validation = require('./validation');
const errorHandler = require('./errorHandler');
const security = require('./security');

module.exports = {
  ...auth,
  ...validation,
  ...errorHandler,
  ...security,
};
