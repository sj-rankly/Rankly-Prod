const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  prompt: 'select_account' // Force Google to show account selection screen
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      // Update access if email is in allowed list (in case user was created before access field existed)
      const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com'];
      const userEmail = profile.emails[0].value.toLowerCase();
      if (allowedEmails.includes(userEmail) && !user.access) {
        user.access = true;
      }
      await user.save();
      return done(null, user);
    }

    // Check if user exists with same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.lastLogin = new Date();
      // Update access if email is in allowed list (in case user was created before access field existed)
      const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com'];
      const userEmail = profile.emails[0].value.toLowerCase();
      if (allowedEmails.includes(userEmail) && !user.access) {
        user.access = true;
      }
      await user.save();
      return done(null, user);
    }

    // Create new user
    // Check if email is in allowed list for dashboard access
    const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com'];
    const userEmail = profile.emails[0].value.toLowerCase();
    const hasAccess = allowedEmails.includes(userEmail);
    
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      isEmailVerified: true, // Google emails are pre-verified
      access: hasAccess, // Set access based on email
      lastLogin: new Date()
    });

    await newUser.save();
    return done(null, newUser);

  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
