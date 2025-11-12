const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, companyName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if email is in allowed list for dashboard access
    const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com'];
    const userEmailLower = email.toLowerCase();
    const hasAccess = allowedEmails.includes(userEmailLower);
    
    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      companyName: companyName || '',
      access: hasAccess // Set access based on email
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ Email registration successful for user:', user.email);
    console.log('✅ User saved to MongoDB with ID:', user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ Email login successful for user:', user.email);
    console.log('✅ User authenticated with ID:', user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Email verification endpoint (placeholder)
router.post('/verify-email', [
  body('token').notEmpty()
], async (req, res) => {
  try {
    const { token } = req.body;
    
    // Find user by verification token
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account' // Force Google to show account selection screen
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/onboarding?error=oauth_failed` }),
  (req, res) => {
    try {
      // Generate JWT token for the authenticated user
      const token = generateToken(req.user._id);
      
      console.log('✅ Google OAuth successful for user:', req.user.email);
      console.log('✅ User saved to MongoDB with ID:', req.user._id);
      
      // All users can now complete onboarding - access check happens on results page
      // Redirect to frontend with token and step parameter to go directly to website URL section
      console.log('✅ [OAuth] User authenticated, redirecting to onboarding');
      const redirectUrl = `${process.env.FRONTEND_URL}/onboarding?token=${token}&oauth=google&step=4`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/onboarding?error=oauth_callback_failed`);
    }
  }
);

// Google OAuth success endpoint (alternative to redirect)
router.get('/google/success', (req, res) => {
  if (req.user) {
    const token = generateToken(req.user._id);
    res.json({
      success: true,
      message: 'Google OAuth successful',
      data: {
        user: req.user.toJSON(),
        token
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Google OAuth failed'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

module.exports = router;
