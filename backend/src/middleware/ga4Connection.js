const GAConnection = require('../models/GAConnection');
const { ensureGA4AccessToken } = require('../services/ga4TokenRefresh');

/**
 * GA4 Connection Validator Middleware
 * Ensures active GA4 connection exists
 */

async function ga4ConnectionMiddleware(req, res, next) {
  try {
    // Require GA4 session (must use ga4SessionMiddleware first)
    if (!req.ga4Session) {
      return res.status(401).json({
        success: false,
        error: 'GA4 session required'
      });
    }

    const { userId } = req.ga4Session;

    // Fetch GA connection from MongoDB
    const gaConnection = await GAConnection.findOne({
      userId,
      deleted: { $ne: true }
    });

    if (!gaConnection) {
      return res.status(404).json({
        success: false,
        error: 'No GA4 connection found'
      });
    }

    // Check if connection is active
    if (!gaConnection.isActive) {
      return res.status(403).json({
        success: false,
        error: 'GA4 connection not active. Please select a property first.'
      });
    }

    // Refresh token if expired
    if (gaConnection.accessTokenExpiry && Date.now() >= gaConnection.accessTokenExpiry.getTime() - 300000) {
      // Token expires in less than 5 minutes, refresh it
      const refreshed = await ensureGA4AccessToken(gaConnection);
      if (refreshed) {
        // Update session cookie with new token
        req.ga4Session.accessToken = refreshed.accessToken;
        // Update req.ga4Connection with refreshed data
        Object.assign(gaConnection, refreshed);
      }
    }

    // Attach connection to request
    req.ga4Connection = {
      propertyId: gaConnection.propertyId,
      accountId: gaConnection.accountId,
      propertyName: gaConnection.propertyName,
      accountName: gaConnection.accountName,
      accessToken: gaConnection.accessToken,
      defaultUri: gaConnection.defaultUri || null // Include default URI
    };
    next();
  } catch (error) {
    console.error('Error in GA4 connection middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  ga4ConnectionMiddleware
};

