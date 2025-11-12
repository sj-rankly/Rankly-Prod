/**
 * Centralized Error Handler Middleware
 * Provides consistent error responses and logging
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

/**
 * Format error response for client
 */
function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Operational errors (known errors)
  if (error instanceof AppError && error.isOperational) {
    const response = {
      success: false,
      error: error.message,
      code: error.code,
    };

    // Include validation errors if present
    if (error instanceof ValidationError && error.errors) {
      response.errors = error.errors;
    }

    // Include stack trace in development
    if (isDevelopment) {
      response.stack = error.stack;
      response.path = req.originalUrl;
      response.method = req.method;
    }

    return response;
  }

  // MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    // Duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return {
        success: false,
        error: `${field} already exists`,
        code: 'DUPLICATE_KEY',
      };
    }

    // Other MongoDB errors
    return {
      success: false,
      error: isDevelopment ? error.message : 'Database error occurred',
      code: 'DATABASE_ERROR',
    };
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors || {}).map(err => ({
      field: err.path,
      message: err.message,
    }));

    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
    };
  }

  // Cast errors (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return {
      success: false,
      error: `Invalid ${error.kind}: ${error.value}`,
      code: 'INVALID_INPUT',
    };
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return {
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    };
  }

  // Unknown errors - don't expose internal details in production
  return {
    success: false,
    error: isDevelopment ? error.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: error.stack, path: req.originalUrl, method: req.method }),
  };
}

/**
 * Log error with context
 */
function logError(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log Authorization header presence for debugging (don't log the actual token)
  const hasAuthHeader = !!req.headers.authorization;
  const authHeaderLength = req.headers.authorization ? req.headers.authorization.length : 0;
  
  const errorContext = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.userId || req.user?.id || 'anonymous',
    hasAuthHeader: hasAuthHeader,
    authHeaderLength: authHeaderLength,
    timestamp: new Date().toISOString(),
  };

  // Log differently based on error type
  if (error instanceof AppError && error.isOperational) {
    // Operational errors - log as warning
    console.warn('⚠️ [ErrorHandler] Operational error:', errorContext);
  } else {
    // Programming errors - log as error
    console.error('❌ [ErrorHandler] Unexpected error:', errorContext);
    
    // In production, send to error tracking service
    if (!isDevelopment) {
      // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
      // errorTracking.captureException(error, { extra: errorContext });
    }
  }
}

/**
 * Main error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  logError(err, req);

  // Format error response
  const errorResponse = formatErrorResponse(err, req);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle 404 Not Found
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};







