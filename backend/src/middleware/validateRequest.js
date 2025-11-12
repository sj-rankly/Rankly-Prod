/**
 * Request Validation Middleware
 * Validates and sanitizes request data
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Validate URL format
 */
const validateUrl = (field = 'url') => {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isURL({ 
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true 
    })
    .withMessage('Invalid URL format. Must include http:// or https://')
    .normalizeURL()
    .isLength({ max: 2048 })
    .withMessage('URL must be less than 2048 characters');
};

/**
 * Validate email
 */
const validateEmail = (field = 'email') => {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail();
};

/**
 * Validate password
 */
const validatePassword = (field = 'password', minLength = 6) => {
  return body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: minLength })
    .withMessage(`${field} must be at least ${minLength} characters`);
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (field = 'id') => {
  return param(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage(`Invalid ${field} format`);
};

/**
 * Validate string field
 */
const validateString = (field, options = {}) => {
  const { required = true, minLength = 1, maxLength = 500 } = options;
  let validator = body(field).trim();
  
  if (required) {
    validator = validator.notEmpty().withMessage(`${field} is required`);
  }
  
  if (minLength) {
    validator = validator.isLength({ min: minLength })
      .withMessage(`${field} must be at least ${minLength} characters`);
  }
  
  if (maxLength) {
    validator = validator.isLength({ max: maxLength })
      .withMessage(`${field} must be less than ${maxLength} characters`);
  }
  
  return validator;
};

/**
 * Validate array field
 */
const validateArray = (field, options = {}) => {
  const { required = true, minItems = 0, maxItems = 100 } = options;
  let validator = body(field);
  
  if (required) {
    validator = validator.notEmpty().withMessage(`${field} is required`);
  }
  
  return validator
    .isArray()
    .withMessage(`${field} must be an array`)
    .isLength({ min: minItems })
    .withMessage(`${field} must have at least ${minItems} items`)
    .isLength({ max: maxItems })
    .withMessage(`${field} must have at most ${maxItems} items`);
};

/**
 * Validate date field
 */
const validateDate = (field = 'date') => {
  return body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`);
};

/**
 * Middleware to check validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    throw new ValidationError('Validation failed', errorMessages);
  }
  
  next();
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, ''); // Remove potential XSS characters
};

/**
 * Sanitize request body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

module.exports = {
  validateUrl,
  validateEmail,
  validatePassword,
  validateObjectId,
  validateString,
  validateArray,
  validateDate,
  handleValidationErrors,
  sanitizeBody,
};















