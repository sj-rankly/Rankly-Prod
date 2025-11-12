const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const GAConnection = require('../models/GAConnection');

const router = express.Router();

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge
 */
function generateCodeChallenge(codeVerifier) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Build Google OAuth URL with GA4 scopes
 */
function buildGoogleAuthUrl(codeChallenge) {
  const clientId = process.env.GA4_CLIENT_ID;
  const redirectUri = process.env.GA4_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('GA4_CLIENT_ID and GA4_REDIRECT_URI must be set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: 'ga4_oauth'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * GET /api/auth/ga4
 * Initiate GA4 OAuth flow
 */
router.get('/', (req, res) => {
  try {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store code verifier in session
    req.session.ga4CodeVerifier = codeVerifier;

    // Build OAuth URL
    const authUrl = buildGoogleAuthUrl(codeChallenge);

    console.log('✅ GA4 OAuth URL generated');

    // Redirect to Google OAuth consent screen
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating GA4 OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate GA4 authentication'
    });
  }
});

/**
 * GET /api/auth/ga4/callback
 * Handle GA4 OAuth callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    if (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(`${frontendUrl}/agent-analytics?error=${error}`);
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/agent-analytics?error=missing_code`);
    }

    const codeVerifier = req.session.ga4CodeVerifier;

    if (!codeVerifier) {
      return res.redirect(`${frontendUrl}/agent-analytics?error=missing_code_verifier`);
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: process.env.GA4_CLIENT_ID,
        client_secret: process.env.GA4_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GA4_REDIRECT_URI,
        code_verifier: codeVerifier
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token || !refresh_token) {
      console.error('Missing tokens:', { access: !!access_token, refresh: !!refresh_token });
      return res.redirect(`${frontendUrl}/agent-analytics?error=no_tokens`);
    }

    // Get user info
    const userInfoResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`
    );

    const userInfo = userInfoResponse.data;
    console.log('✅ GA4 OAuth successful for user:', userInfo.email);

    // Create access token expiry
    const accessTokenExpiry = new Date(Date.now() + (expires_in * 1000));

    // Save to MongoDB
    const connectionData = {
      userId: userInfo.id,
      email: userInfo.email,
      accessToken: access_token,
      accessTokenExpiry: accessTokenExpiry,
      refreshToken: refresh_token,
      isActive: false, // Not active until property selected
      deleted: false
    };

    const existing = await GAConnection.findOne({
      userId: userInfo.id,
      deleted: { $ne: true }
    });

    if (existing) {
      await GAConnection.findByIdAndUpdate(existing._id, connectionData);
      console.log('✅ Updated existing GA connection:', userInfo.id);
    } else {
      await GAConnection.create(connectionData);
      console.log('✅ Created new GA connection:', userInfo.id);
    }

    // Create GA4 session data
    const sessionData = {
      userId: userInfo.id,
      email: userInfo.email,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // Encode session as base64 cookie
    const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Set session cookie
    res.cookie('ga4_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Support cross-site in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined // Support subdomains
    });

    // Clear code verifier from session
    delete req.session.ga4CodeVerifier;

    console.log('✅ GA4 session created for user:', userInfo.id);

    // Redirect to frontend with success flag
    res.redirect(`${frontendUrl}/agent-analytics?oauth_complete=true`);
  } catch (error) {
    console.error('GA4 OAuth callback error:', error.response?.data || error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/agent-analytics?error=callback_error`);
  }
});

module.exports = router;

