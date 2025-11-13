const express = require('express');
const router = express.Router();
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');
const { getCachedData, setCachedData } = require('../../services/ga4CacheService');
const { normalizeDateRange } = require('../../utils/ga4DateHelpers');

/**
 * GA4 Journey/Path Exploration API endpoint
 * Fetches sequential page paths: Platform → Page 1 → Page 2 → Page 3
 */
router.get('/journey', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate, endDate, dateRange } = req.query;
    const disableCache = req.query.disableCache === 'true';
    const userId = req.ga4Session.userId;

    // Normalize date range
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    const cacheKey = 'journey-paths';
    if (!disableCache) {
      const cachedData = await getCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate);
      
      if (cachedData) {
        console.log('✅ [journey] Returning cached data');
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }
      console.log('🔄 [journey] No cache found, fetching fresh data');
    }

    // GA4 API request for journey paths
    // We'll get pagePath, previousPagePath, and sessions to build the journey
    const reportConfig = {
      dateRanges: [
        {
          startDate: finalStartDate,
          endDate: finalEndDate
        }
      ],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'pageReferrer' },
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' }
      ],
      dimensionFilter: {
        orGroup: {
          expressions: [
            // ChatGPT/OpenAI
            {
              orGroup: {
                expressions: [
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'chatgpt', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'openai', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionMedium', stringFilter: { matchType: 'CONTAINS', value: 'chatgpt', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'chatgpt', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'openai', caseSensitive: false } } }
                ]
              }
            },
            // Claude/Anthropic
            {
              orGroup: {
                expressions: [
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'claude', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'anthropic', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionMedium', stringFilter: { matchType: 'CONTAINS', value: 'claude', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'claude', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'anthropic', caseSensitive: false } } }
                ]
              }
            },
            // Gemini/Bard
            {
              orGroup: {
                expressions: [
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'gemini', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'bard', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionMedium', stringFilter: { matchType: 'CONTAINS', value: 'gemini', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'gemini', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'bard', caseSensitive: false } } }
                ]
              }
            },
            // Perplexity
            {
              orGroup: {
                expressions: [
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'perplexity', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionMedium', stringFilter: { matchType: 'CONTAINS', value: 'perplexity', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'perplexity', caseSensitive: false } } }
                ]
              }
            },
            // Copilot
            {
              orGroup: {
                expressions: [
                  { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'copilot', caseSensitive: false } } },
                  { filter: { fieldName: 'sessionMedium', stringFilter: { matchType: 'CONTAINS', value: 'copilot', caseSensitive: false } } },
                  { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'copilot', caseSensitive: false } } }
                ]
              }
            },
            // Add more LLM platforms as needed...
          ]
        }
      },
      orderBys: [
        { metric: { metricName: 'sessions' }, desc: true }
      ],
      limit: 10000
    };

    console.log('🔍 [journey] Fetching GA4 journey data...');

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [journey] GA4 API error:', errorText);
      throw new Error(`GA4 API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [journey] GA4 data received:', {
      rows: data.rows?.length || 0
    });

    // Transform the data to build journey paths
    const transformedData = transformJourneyData(data);

    // Cache the result
    if (!disableCache) {
      await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, transformedData);
    }

    res.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('❌ [journey] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Transform GA4 journey data into sequential paths
 */
function transformJourneyData(ga4Response) {
  const rows = ga4Response.rows || [];
  
  console.log('🔄 [transformJourneyData] Processing journey data:', {
    totalRows: rows.length
  });

  // Detect platform from session data
  function detectPlatform(sessionSource, sessionMedium, pageReferrer) {
    const source = (sessionSource || '').toLowerCase();
    const medium = (sessionMedium || '').toLowerCase();
    const referrer = (pageReferrer || '').toLowerCase();
    
    const combined = `${source} ${medium} ${referrer}`;
    
    if (combined.includes('chatgpt') || combined.includes('openai')) return 'ChatGPT';
    if (combined.includes('claude') || combined.includes('anthropic')) return 'Claude';
    if (combined.includes('gemini') || combined.includes('bard')) return 'Gemini';
    if (combined.includes('perplexity')) return 'Perplexity';
    if (combined.includes('copilot')) return 'Copilot';
    if (combined.includes('grok')) return 'Grok';
    if (combined.includes('poe')) return 'Poe';
    
    return 'LLM Traffic';
  }

  // Build journey paths
  const journeyPaths = [];
  const pageVisits = new Map(); // Track page visits for building sequences

  for (const row of rows) {
    const sessionSource = row.dimensionValues?.[0]?.value || '';
    const sessionMedium = row.dimensionValues?.[1]?.value || '';
    const pageReferrer = row.dimensionValues?.[2]?.value || '';
    const pagePath = row.dimensionValues?.[3]?.value || '';
    const pageTitle = row.dimensionValues?.[4]?.value || pagePath;
    const sessions = parseInt(row.metricValues?.[0]?.value || '0');
    const pageViews = parseInt(row.metricValues?.[1]?.value || '0');

    const platform = detectPlatform(sessionSource, sessionMedium, pageReferrer);

    // Create journey link: Platform → Page
    journeyPaths.push({
      from: platform,
      to: pageTitle || pagePath,
      value: sessions,
      pagePath: pagePath,
      pageViews: pageViews
    });

    // Store page visit info
    const pageKey = `${platform}:${pagePath}`;
    if (!pageVisits.has(pageKey)) {
      pageVisits.set(pageKey, {
        platform,
        pagePath,
        pageTitle,
        sessions: 0,
        pageViews: 0
      });
    }
    const pageInfo = pageVisits.get(pageKey);
    pageInfo.sessions += sessions;
    pageInfo.pageViews += pageViews;
  }

  // Aggregate duplicate paths
  const aggregatedPaths = new Map();
  journeyPaths.forEach(path => {
    const key = `${path.from}|${path.to}`;
    if (!aggregatedPaths.has(key)) {
      aggregatedPaths.set(key, { ...path });
    } else {
      aggregatedPaths.get(key).value += path.value;
    }
  });

  const finalPaths = Array.from(aggregatedPaths.values());

  console.log('✅ [transformJourneyData] Transformed journey data:', {
    totalPaths: finalPaths.length,
    uniquePages: pageVisits.size,
    samplePaths: finalPaths.slice(0, 5)
  });

  return {
    paths: finalPaths,
    summary: {
      totalPaths: finalPaths.length,
      totalSessions: finalPaths.reduce((sum, p) => sum + p.value, 0)
    }
  };
}

module.exports = router;

