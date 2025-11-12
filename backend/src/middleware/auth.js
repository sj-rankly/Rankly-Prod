/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from Authorization header
 * 
 * Authentication Flow:
 * 1. User logs in via Google OAuth (routes/auth.js)
 * 2. Backend creates/finds User in MongoDB (config/passport.js)
 * 3. JWT token generated with user._id (routes/auth.js generateToken)
 * 4. Frontend stores token and sends in Authorization: Bearer <token> header
 * 5. This middleware extracts userId from JWT token
 * 6. All API routes use req.userId which comes from authenticated user
 * 
 * ✅ Authentication is ALWAYS required - no bypass functionality exists
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AuthenticationError } = require('./errorHandler');

/**
 * Authenticate JWT token from Authorization header
 * Sets req.userId if token is valid
 * 
 * userId comes from JWT token created during Google OAuth login
 */
const authenticateToken = async (req, res, next) => {
  // ✅ REMOVED: DEV_AUTH_BYPASS functionality - authentication is now always required
  // All requests must include a valid JWT token in the Authorization header
  // No authentication bypass is available, even in development mode

  // Require valid token for all requests
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.warn(`⚠️ [AUTH] No token provided for ${req.method} ${req.path} from IP: ${req.ip}`);
    return next(new AuthenticationError('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    if (!req.userId) {
      console.error(`❌ [AUTH] Token verified but no userId found in decoded token:`, decoded);
      return next(new AuthenticationError('Invalid token: no userId'));
    }
    
    // Check user access for dashboard routes
    if (req.path.includes('/dashboard') || req.path.includes('/api/dashboard')) {
      const user = await User.findById(req.userId);
      if (!user) {
        console.error(`❌ [AUTH] User not found: ${req.userId}`);
        return next(new AuthenticationError('User not found'));
      }
      
      // Check if user has access
      const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com'];
      const userEmail = user.email?.toLowerCase();
      const hasAccess = user.access === true || (userEmail && allowedEmails.includes(userEmail));
      
      if (!hasAccess) {
        console.warn(`⚠️ [AUTH] Access denied for user: ${req.userId} (${userEmail})`);
        return res.status(403).json({
          success: false,
          message: 'Dashboard access denied. Please contact support to get access.',
          code: 'ACCESS_DENIED'
        });
      }
      
      console.log(`✅ [AUTH] User has dashboard access: ${req.userId} (${userEmail})`);
    }
    
    // Log successful authentication (userId comes from JWT token created during Google OAuth)
    console.log(`✅ [AUTH] Authenticated user: ${req.userId} (from JWT token) for ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    // Log the actual error for debugging
    console.error(`❌ [AUTH] JWT verification failed for ${req.method} ${req.path}:`, {
      errorName: error.name,
      errorMessage: error.message,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      ip: req.ip
    });
    
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError(`Invalid token: ${error.message}`));
    }
    return next(new AuthenticationError(`Token verification failed: ${error.message}`));
  }
};

/**
 * Optional authentication - doesn't fail if no token, but sets userId if token exists
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
  } catch (error) {
    // Ignore errors for optional auth - just don't set userId
  }
  
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
};







