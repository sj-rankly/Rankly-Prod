const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');
const { runReport } = require('../../utils/ga4ApiClient');
const { transformMetricsData } = require('../../utils/ga4DataTransformer');

const router = express.Router();

/**
 * GET /api/ga4/data
 * Fetch basic GA4 metrics
 */
router.get('/data', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;

    const reportConfig = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }
      ]
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    const metrics = transformMetricsData(data);

    res.json({
      success: true,
      data: {
        property: {
          id: propertyId,
          name: req.ga4Connection.propertyName,
          account: req.ga4Connection.accountName
        },
        summary: metrics
      }
    });
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GA4 data'
    });
  }
});

module.exports = router;












