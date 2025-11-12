const axios = require('axios');
const GAConnection = require('../models/GAConnection');

/**
 * GA4 Token Refresh Service
 * Handles refreshing expired GA4 access tokens
 */

/**
 * Refresh GA4 access token using refresh token
 * @param {Object} gaConnection - GA connection document
 * @returns {Promise<Object|null>} Updated tokens or null if failed
 */
async function refreshGA4Token(gaConnection) {
  try {
    if (!gaConnection.refreshToken) {
      console.error('No refresh token available');
      return null;
    }

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: process.env.GA4_CLIENT_ID,
        client_secret: process.env.GA4_CLIENT_SECRET,
        refresh_token: gaConnection.refreshToken,
        grant_type: 'refresh_token'
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      console.error('No access token in refresh response');
      return null;
    }

    // Calculate expiry time
    const accessTokenExpiry = new Date(Date.now() + (expires_in * 1000));

    // Update GA connection in database
    await GAConnection.findByIdAndUpdate(gaConnection._id, {
      accessToken: access_token,
      accessTokenExpiry: accessTokenExpiry
    });

    console.log('✅ GA4 token refreshed successfully');

    return {
      accessToken: access_token,
      accessTokenExpiry: accessTokenExpiry
    };
  } catch (error) {
    console.error('Error refreshing GA4 token:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Ensure GA4 access token is valid, refresh if needed
 * @param {Object} gaConnection - GA connection document
 * @returns {Promise<Object|null>} Updated connection data or null if failed
 */
async function ensureGA4AccessToken(gaConnection) {
  // Check if token is expired or expiring soon
  if (!gaConnection.accessTokenExpiry) {
    // No expiry info, assume valid
    return gaConnection;
  }

  const expiresIn = gaConnection.accessTokenExpiry.getTime() - Date.now();
  
  // Refresh if expires in less than 5 minutes
  if (expiresIn < 300000) {
    return await refreshGA4Token(gaConnection);
  }

  return gaConnection;
}

module.exports = {
  refreshGA4Token,
  ensureGA4AccessToken
};

