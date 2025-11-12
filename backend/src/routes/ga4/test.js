const express = require('express');
const { runReport } = require('../../utils/ga4ApiClient');
const { transformPagesData, getLLMFilterRegex } = require('../../utils/ga4DataTransformer');
const GA4DataSnapshot = require('../../models/GA4DataSnapshot');
const { getConversionEventMetric } = require('../../utils/ga4MetricHelpers');

const router = express.Router();

/**
 * GET /api/ga4/test-pages
 * Test endpoint to fetch fresh pages data with debug info (dev auth)
 */
router.get('/test-pages', async (req, res) => {
  try {
    // Use hardcoded dev values
    const propertyId = '417960995';
    const accessToken = process.env.GA4_TEST_TOKEN || ''; // Use environment variable for test token
    if (!accessToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Test token not configured. Set GA4_TEST_TOKEN in environment.' 
      });
    }
    const { conversionEvent = 'conversions' } = req.query;
    
    console.log('🧪 [test-pages] Testing fresh fetch for conversion event:', conversionEvent);
    
    // Clear cache for this specific conversion event
    const conversionMetric = getConversionEventMetric(conversionEvent);
    const cacheKey = `pages-${conversionMetric}`;
    await GA4DataSnapshot.deleteMany({ 
      userId: '6901f871c7ec53a22d975ef3', 
      propertyId, 
      dataType: cacheKey 
    });
    
    // Fetch fresh data - test both with and without LLM filter
    const { includeAllTraffic } = req.query;
    
    const reportConfig = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      // Only apply LLM filter if not testing all traffic
      ...(includeAllTraffic !== 'true' ? {
        dimensionFilter: {
          filter: {
            fieldName: 'sessionSource',
            stringFilter: {
              matchType: 'PARTIAL_REGEXP',
              value: getLLMFilterRegex(),
              caseSensitive: false
            }
          }
        }
      } : {}),
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10
    };
    
    const data = await runReport(accessToken, propertyId, reportConfig);
    const pagesData = transformPagesData(data);
    
    // Check for any non-zero conversion values
    const conversionIndex = 2; // conversions is always at index 2
    const nonZeroConversions = data.rows?.filter(row => 
      parseFloat(row.metricValues?.[conversionIndex]?.value || '0') > 0
    ) || [];
    
    res.json({
      success: true,
      data: {
        conversionEvent,
        conversionMetric,
        pagesData,
        debug: {
          totalRows: data.rows?.length || 0,
          metricHeaders: data.metricHeaders?.map(h => h.name) || [],
          sampleRow: data.rows?.[0] ? {
            dimensions: data.rows[0].dimensionValues?.map(d => d.value) || [],
            metrics: data.rows[0].metricValues?.map(m => m.value) || []
          } : null,
          nonZeroConversions: nonZeroConversions.length,
          conversionValues: data.rows?.map(row => ({
            page: row.dimensionValues?.[0]?.value,
            conversions: row.metricValues?.[conversionIndex]?.value
          })).slice(0, 5) || []
        }
      }
    });
  } catch (error) {
    console.error('Error in test-pages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


