const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors,
      code: 'VALIDATION_ERROR',
    });
  }

  next();
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),

  body('profile.firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .trim(),

  body('profile.lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .trim(),

  handleValidationErrors,
];

/**
 * User login validation
 */
const validateUserLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Email or username must be between 3 and 100 characters')
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),

  handleValidationErrors,
];

/**
 * User profile update validation
 */
const validateProfileUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('profile.firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .trim(),

  body('profile.lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .trim(),

  body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
    .trim(),

  handleValidationErrors,
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'New password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match new password');
    }
    return true;
  }),

  handleValidationErrors,
];

/**
 * Scan metadata validation
 */
const validateScanMetadata = [
  body('metadata.location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),

  body('metadata.location.coordinates.0')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('metadata.location.coordinates.1')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('metadata.device.platform')
    .optional()
    .isIn(['iOS', 'Android', 'Web'])
    .withMessage('Platform must be iOS, Android, or Web'),

  body('tags').optional().isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be a string between 1 and 50 characters')
    .trim(),

  handleValidationErrors,
];

/**
 * User feedback validation
 */
const validateUserFeedback = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('corrections').optional().isArray().withMessage('Corrections must be an array'),

  body('corrections.*.gourdIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Gourd index must be a non-negative integer'),

  body('corrections.*.field')
    .optional()
    .isIn(['gourdType', 'gender', 'growthStage', 'health'])
    .withMessage('Field must be one of: gourdType, gender, growthStage, health'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
    .trim(),

  body('useForTraining').optional().isBoolean().withMessage('useForTraining must be a boolean'),

  handleValidationErrors,
];

/**
 * GourdData validation
 */
const validateGourdData = [
  body('name')
    .notEmpty()
    .withMessage('Gourd name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),

  body('scientificName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Scientific name cannot exceed 100 characters')
    .trim(),

  body('category')
    .isIn([
      'bottle',
      'dipper',
      'ornamental',
      'birdhouse',
      'canteen',
      'snake',
      'spoon',
      'bowl',
      'other',
    ])
    .withMessage('Category must be a valid gourd type'),

  body('characteristics.size.minLength')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum length must be a positive number'),

  body('characteristics.size.maxLength')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum length must be a positive number'),

  body('tags').optional().isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be a string between 1 and 30 characters')
    .trim(),

  handleValidationErrors,
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`${paramName} must be a valid MongoDB ObjectId`),

  handleValidationErrors,
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sort field must be a string between 1 and 50 characters'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('Sort order must be asc, desc, 1, or -1'),

  handleValidationErrors,
];

/**
 * Search validation
 */
const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim(),

  query('category')
    .optional()
    .isIn([
      'bottle',
      'dipper',
      'ornamental',
      'birdhouse',
      'canteen',
      'snake',
      'spoon',
      'bowl',
      'other',
    ])
    .withMessage('Category must be a valid gourd type'),

  handleValidationErrors,
];

/**
 * File upload validation (for use with multer)
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded',
      code: 'NO_FILE',
    });
  }

  const file = req.file || (req.files && req.files[0]);

  // Check file size (5MB limit)
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
  if (file.size > maxSize) {
    return res.status(400).json({
      status: 'error',
      message: `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      code: 'FILE_TOO_LARGE',
    });
  }

  // Check file type
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(
    ','
  );
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      code: 'INVALID_FILE_TYPE',
    });
  }

  next();
};

/**
 * Pollination record validation
 */
const validatePollination = [
  body('name')
    .notEmpty()
    .withMessage('Plant name is required')
    .isIn(['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber'])
    .withMessage('Plant name must be one of: ampalaya_bilog, upo_smooth, patola, cucumber'),

  body('datePlanted')
    .notEmpty()
    .withMessage('Date planted is required')
    .isISO8601()
    .withMessage('Date planted must be a valid date')
    .custom((value) => {
      const plantedDate = new Date(value);
      const now = new Date();
      if (plantedDate > now) {
        throw new Error('Date planted cannot be in the future');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'undetermined'])
    .withMessage('Gender must be one of: male, female, undetermined'),

  body('location.garden')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Garden name cannot exceed 100 characters')
    .trim(),

  body('location.plot')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Plot name cannot exceed 50 characters')
    .trim(),

  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),

  handleValidationErrors,
];

/**
 * Pollination note validation
 */
const validateNote = [
  body('content')
    .notEmpty()
    .withMessage('Note content is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Note content must be between 1 and 500 characters')
    .trim(),

  body('type')
    .optional()
    .isIn(['observation', 'care', 'problem', 'milestone'])
    .withMessage('Note type must be one of: observation, care, problem, milestone'),

  handleValidationErrors,
];

/**
 * Flowering validation
 */
const validateFlowering = [
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female'])
    .withMessage('Gender must be either male or female'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date')
    .custom((value) => {
      if (value) {
        const floweringDate = new Date(value);
        const now = new Date();
        if (floweringDate > now) {
          throw new Error('Flowering date cannot be in the future');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Pollination date validation
 */
const validatePollinationDate = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date')
    .custom((value) => {
      if (value) {
        const pollinationDate = new Date(value);
        const now = new Date();
        if (pollinationDate > now) {
          throw new Error('Pollination date cannot be in the future');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Simple request body validation for required fields
 */
const validateRequestBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        missingFields: missingFields,
        code: 'MISSING_FIELDS',
      });
    }

    next();
  };
};

/**
 * Admin user update validation
 */
const validateUserUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .trim(),

  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .trim(),

  body('role')
    .optional()
    .isIn(['user', 'admin', 'researcher'])
    .withMessage('Role must be one of: user, admin, researcher'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  body('isEmailVerified').optional().isBoolean().withMessage('isEmailVerified must be a boolean'),

  handleValidationErrors,
];

/**
 * Bulk user update validation
 */
const validateBulkUpdate = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs must be a non-empty array'),

  body('userIds.*').isMongoId().withMessage('Each user ID must be a valid MongoDB ObjectId'),

  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['activate', 'deactivate', 'changeRole', 'verifyEmail'])
    .withMessage('Action must be one of: activate, deactivate, changeRole, verifyEmail'),

  body('value')
    .if(body('action').equals('changeRole'))
    .notEmpty()
    .withMessage('Value is required when action is changeRole')
    .isIn(['user', 'admin', 'researcher'])
    .withMessage('Role value must be one of: user, admin, researcher'),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateScanMetadata,
  validateUserFeedback,
  validateGourdData,
  validatePollination,
  validateNote,
  validateFlowering,
  validatePollinationDate,
  validateObjectId,
  validatePagination,
  validateSearch,
  validateFileUpload,
  validateRequestBody,
  validateUserUpdate,
  validateBulkUpdate,
};
