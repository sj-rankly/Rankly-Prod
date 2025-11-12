const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');
const { fetchAccountSummaries } = require('../../utils/ga4ApiClient');
const GAConnection = require('../../models/GAConnection');

const router = express.Router();

/**
 * GET /api/ga4/accounts-properties
 * Fetch GA4 accounts and properties
 */
router.get('/accounts-properties', ga4SessionMiddleware, async (req, res) => {
  try {
    const { accessToken, userId } = req.ga4Session;

    if (!accessToken) {
      console.error('❌ [accounts-properties] No access token in session');
      return res.status(401).json({
        success: false,
        error: 'No access token found in session'
      });
    }

    console.log('🔄 [accounts-properties] Fetching accounts for user:', userId);

    // Fetch accounts and properties from Google Analytics Admin API
    const accountsData = await fetchAccountSummaries(accessToken);

    if (!accountsData || !accountsData.accountSummaries) {
      console.error('❌ [accounts-properties] Invalid response from GA4 API:', accountsData);
      return res.status(500).json({
        success: false,
        error: 'Invalid response from GA4 API'
      });
    }

    // Transform response
    const accounts = (accountsData.accountSummaries || []).map(account => ({
      accountId: account.account?.split('/')[1],
      accountName: account.displayName,
      properties: (account.propertySummaries || []).map(property => ({
        propertyId: property.property?.split('/')[1],
        propertyName: property.displayName
      }))
    }));

    console.log('✅ [accounts-properties] Found', accounts.length, 'accounts with', 
      accounts.reduce((sum, acc) => sum + acc.properties.length, 0), 'total properties');

    res.json({
      success: true,
      data: {
        accounts
      }
    });
  } catch (error) {
    console.error('❌ [accounts-properties] Error:', error.message);
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      console.error('❌ [accounts-properties] Authentication failed - token may be expired');
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Please reconnect your GA4 account.'
      });
    }

    // Check if it's a permission error
    if (error.response?.status === 403) {
      console.error('❌ [accounts-properties] Permission denied');
      return res.status(403).json({
        success: false,
        error: 'Permission denied. Please ensure you have access to GA4 accounts.'
      });
    }

    // Log full error details for debugging
    if (error.response?.data) {
      console.error('❌ [accounts-properties] GA4 API error details:', JSON.stringify(error.response.data, null, 2));
    }

    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to fetch GA4 accounts'
    });
  }
});

/**
 * POST /api/ga4/save-property
 * Save selected GA4 property
 */
router.post('/save-property', ga4SessionMiddleware, async (req, res) => {
  try {
    const { accountId, propertyId } = req.body;
    const { userId, accessToken } = req.ga4Session;

    if (!accountId || !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing accountId or propertyId'
      });
    }

    // Fetch account summaries to get names and property default URI
    const accountsData = await fetchAccountSummaries(accessToken);
    
    // Fetch property details to get default URI
    let propertyDefaultUri = null;
    try {
      const axios = require('axios');
      const propertyResponse = await axios.get(
        `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      propertyDefaultUri = propertyResponse.data?.defaultUri || null;
      console.log('🔍 [save-property] Property default URI:', propertyDefaultUri);
    } catch (uriError) {
      console.warn('⚠️ [save-property] Could not fetch property default URI:', uriError.message);
    }

    // Find account and property names
    let accountName = '';
    let propertyName = '';

    for (const account of accountsData.accountSummaries || []) {
      const currentAccountId = account.account?.split('/')[1];
      if (currentAccountId === accountId) {
        accountName = account.displayName;
        for (const property of account.propertySummaries || []) {
          const currentPropertyId = property.property?.split('/')[1];
          if (currentPropertyId === propertyId) {
            propertyName = property.displayName;
            break;
          }
        }
        break;
      }
    }

    if (!accountName || !propertyName) {
      return res.status(404).json({
        success: false,
        error: 'Account or property not found'
      });
    }

    // Update GA connection with default URI
    const updatedConnection = await GAConnection.findOneAndUpdate(
      { userId, deleted: { $ne: true } },
      {
        accountId,
        propertyId,
        accountName,
        propertyName,
        defaultUri: propertyDefaultUri, // Store the default URI
        isActive: true // Now connection is active!
      },
      { new: true }
    );

    console.log('✅ GA property saved:', { userId, accountId, propertyId });

    // Update session cookie with property info
    const updatedSessionData = {
      ...req.ga4Session,
      propertyId,
      accountId,
      accountName,
      propertyName
    };

    const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');

    res.cookie('ga4_session', updatedSessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      data: {
        accountId: updatedConnection.accountId,
        propertyId: updatedConnection.propertyId,
        accountName: updatedConnection.accountName,
        propertyName: updatedConnection.propertyName
      }
    });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save property'
    });
  }
});

/**
 * GET /api/ga4/connection-status
 * Check GA4 connection status
 */
router.get('/connection-status', ga4SessionMiddleware, async (req, res) => {
  try {
    const { userId } = req.ga4Session;
    console.log('🔍 [connection-status] Checking status for user:', userId);

    const gaConnection = await GAConnection.findOne({
      userId,
      deleted: { $ne: true }
    });

    if (!gaConnection) {
      console.log('❌ [connection-status] No connection found for user:', userId);
      return res.json({
        connected: false,
        isActive: false
      });
    }

    console.log('✅ [connection-status] Connection found:', {
      userId,
      isActive: gaConnection.isActive,
      propertyName: gaConnection.propertyName
    });

    res.json({
      connected: true,
      isActive: gaConnection.isActive,
      propertyName: gaConnection.propertyName,
      accountName: gaConnection.accountName
    });
  } catch (error) {
    console.error('❌ [connection-status] Error checking connection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check connection status'
    });
  }
});

/**
 * POST /api/ga4/disconnect
 * Disconnect GA4 connection
 */
router.post('/disconnect', ga4SessionMiddleware, async (req, res) => {
  try {
    const { userId } = req.ga4Session;

    await GAConnection.findOneAndUpdate(
      { userId, deleted: { $ne: true } },
      { deleted: true }
    );

    // Clear session cookie
    res.clearCookie('ga4_session', { path: '/' });

    console.log('✅ GA4 disconnected for user:', userId);

    res.json({
      success: true,
      message: 'GA4 disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting GA4:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect GA4'
    });
  }
});

module.exports = router;


