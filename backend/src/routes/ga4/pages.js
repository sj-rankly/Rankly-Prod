const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');
const { runReport } = require('../../utils/ga4ApiClient');
const {
  transformPagesData,
  transformToPlatformSplit,
  calculateComparisonDates,
  getLLMFilterRegex
} = require('../../utils/ga4DataTransformer');
const GAConnection = require('../../models/GAConnection');
const { normalizeDateRange } = require('../../utils/ga4DateHelpers');
const { getConversionEventMetric } = require('../../utils/ga4MetricHelpers');
const { getCachedData, setCachedData } = require('../../services/ga4CacheService');

const router = express.Router();
const CACHE_DURATION_MINUTES = 5; // Cache for 5 minutes

/**
 * GET /api/ga4/pages
 * Fetch pages data with LLM platform breakdown
 */
router.get('/pages', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  let reportConfig; // Declare outside try block for error handler access
  let conversionEvent; // Declare outside try block for error handler access
  let conversionMetric; // Declare outside try block for error handler access
  let propertyId; // Declare outside try block for error handler access
  let accessToken; // Declare outside try block for error handler access
  
  try {
    ({ propertyId, accessToken } = req.ga4Connection);
    ({ startDate, endDate, limit = 10, dateRange, conversionEvent = 'conversions' } = req.query);
    const disableCache = req.query.disableCache === 'true';
    const cacheBust = req.query.cacheBust || null;
    const userId = req.session.userId;

    // Normalize date range consistently (always uses 'today' as endDate)
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    // Convert conversion event to valid GA4 metric name
    conversionMetric = getConversionEventMetric(conversionEvent);

    const cacheKey = `pages-${conversionEvent}`;
    if (!disableCache) {
      const cachedData = await getCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate);
      
      if (cachedData) {
        console.log('✅ [pages] Returning cached data');
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }
      console.log('🔄 [pages] No cache found, fetching fresh data for conversion metric:', conversionMetric);
    } else {
      console.log('🚫 [pages] Cache bypass requested. disableCache=true', {
        conversionEvent,
        cacheBust,
      });
    }

    reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'pageReferrer' } // Add pageReferrer for accurate LLM detection (matches Platform Tab)
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionSource',
          stringFilter: {
            matchType: 'PARTIAL_REGEXP',
            value: getLLMFilterRegex(),
            caseSensitive: false
          }
        }
      },
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric }, // Use the converted metric name
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: parseInt(limit) || 10000
    };

    console.log('📄 [pages] Calling GA4 API with config:', {
      propertyId,
      startDate: finalStartDate,
      endDate: finalEndDate,
      conversionEvent,
      conversionMetric, // Log the converted metric
      dimensions: reportConfig.dimensions.map(d => d.name),
      metrics: reportConfig.metrics.map(m => m.name)
    });

    const data = await runReport(accessToken, propertyId, reportConfig);
    
    // Get default URI from connection, or fetch it if missing
    let defaultUri = req.ga4Connection.defaultUri || null;
    
    // If defaultUri is missing, try to fetch it from GA4 Admin API
    if (!defaultUri) {
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
        defaultUri = propertyResponse.data?.defaultUri || null;
        
        // Update the connection with the defaultUri for future use
        if (defaultUri) {
          await GAConnection.findOneAndUpdate(
            { userId: req.session.userId, deleted: { $ne: true } },
            { defaultUri },
            { new: true }
          );
          console.log('✅ [pages] Fetched and saved defaultUri:', defaultUri);
        } else {
          // If defaultUri is not available, try to get it from web streams
          try {
            const streamsResponse = await axios.get(
              `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
            const streams = streamsResponse.data?.dataStreams || [];
            if (streams.length > 0 && streams[0].webStreamData?.defaultUri) {
              defaultUri = streams[0].webStreamData.defaultUri;
              await GAConnection.findOneAndUpdate(
                { userId: req.session.userId, deleted: { $ne: true } },
                { defaultUri },
                { new: true }
              );
              console.log('✅ [pages] Fetched defaultUri from web stream:', defaultUri);
            }
          } catch (streamError) {
            console.warn('⚠️ [pages] Could not fetch from web streams:', streamError.message);
          }
        }
      } catch (uriError) {
        console.warn('⚠️ [pages] Could not fetch property default URI:', uriError.message);
        // Try to extract domain from propertyName as fallback
        if (req.ga4Connection.propertyName) {
          // Property name might contain domain info, try to extract
          const domainMatch = req.ga4Connection.propertyName.match(/(https?:\/\/[^\s]+)/i);
          if (domainMatch) {
            defaultUri = domainMatch[1].replace(/\/$/, ''); // Remove trailing slash
            console.log('✅ [pages] Extracted defaultUri from propertyName:', defaultUri);
          }
        }
      }
    }
    
    // Debug: Log GA4 response structure for conversion metric
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      console.log('🔍 [pages] GA4 API response sample:', {
        conversionMetric,
        totalRows: data.rows.length,
        defaultUri,
        metricNames: data.metricHeaders?.map(h => h.name) || [],
        firstRowMetrics: firstRow.metricValues?.map((m, i) => ({
          index: i,
          name: data.metricHeaders?.[i]?.name || 'unknown',
          value: m.value
        })) || []
      });
    }
    
    const pagesData = transformPagesData(data, defaultUri);

    // Fetch Platform Tab's LLM sessions total for consistency
    // Use the EXACT same logic as Platform Tab endpoint: same date range, same comparison data
    let platformLLMSessions = null;
    try {
      // Use the same normalized date range as the Pages endpoint for consistency
      // This ensures Platform Tab and Pages Tab use identical date ranges
      const platformStartDate = finalStartDate;
      const platformEndDate = finalEndDate;
      
      const platformSplitConfig = {
        dateRanges: [{ startDate: platformStartDate, endDate: platformEndDate }],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
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
        limit: 10000
      };

      const llmReferrerConfig = {
        dateRanges: [{ startDate: platformStartDate, endDate: platformEndDate }],
        dimensions: [{ name: 'pageReferrer' }],
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
        limit: 10000
      };

      const [platformSplitData, llmReferrerData] = await Promise.all([
        runReport(accessToken, propertyId, platformSplitConfig),
        runReport(accessToken, propertyId, llmReferrerConfig)
      ]);
      
      // Fetch comparison data to match Platform Tab's behavior exactly
      const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(platformStartDate, platformEndDate);
      const comparisonConfig = {
        ...platformSplitConfig,
        dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
      };
      const comparisonLlmRefConfig = {
        ...llmReferrerConfig,
        dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
      };

      const [comparisonData, comparisonLlmReferrerData] = await Promise.all([
        runReport(accessToken, propertyId, comparisonConfig),
        runReport(accessToken, propertyId, comparisonLlmRefConfig)
      ]);
      
      // Use same transform logic as Platform Tab endpoint
      const transformedPlatformSplit = transformToPlatformSplit(platformSplitData, comparisonData, {
        llmReferrerData,
        llmComparisonData: comparisonLlmReferrerData,
        conversionMetric
      });
      
      // Extract LLM sessions total from platform split - use the aggregated 'LLMs' platform
      // This matches exactly what Platform Tab shows as "Total LLM Sessions"
      const llmsPlatform = transformedPlatformSplit.performanceData?.find(p => p.name === 'LLMs');
      const llmBreakdown = transformedPlatformSplit.summary?.llmBreakdown || [];
      
      // Use LLMs platform sessions (aggregated total) - this is the authoritative source
      platformLLMSessions = llmsPlatform?.sessions || 
        llmBreakdown.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;

      console.log('✅ [pages] Fetched Platform Tab LLM sessions:', {
        total: platformLLMSessions,
        fromLLMsPlatform: llmsPlatform?.sessions || 0,
        llmBreakdownSum: llmBreakdown.reduce((s, p) => s + (p.sessions || 0), 0),
        breakdown: llmBreakdown.map(p => ({ platform: p.platform || p.name, sessions: p.sessions })),
        dateRange: `${platformStartDate} to ${platformEndDate}`,
        comparisonRange: `${comparisonStartDate} to ${comparisonEndDate}`
      });
    } catch (platformError) {
      console.warn('⚠️ [pages] Could not fetch Platform Tab LLM sessions, using calculated total:', platformError.message);
      // Fall back to calculated total if Platform Tab fetch fails
      platformLLMSessions = pagesData.summary?.totalSessions || 0;
    }

    // Use Platform Tab's LLM sessions total for consistency
    if (platformLLMSessions !== null && platformLLMSessions > 0) {
      // Recalculate avgSQS using Platform Tab's total sessions for consistency
      const totalPageSessions = pagesData.pages.reduce((sum, page) => sum + (page.sessions || 0), 0);
      const weightedSQS = pagesData.pages.reduce((sum, page) => sum + (parseFloat(page.sqs || 0) * (page.sessions || 0)), 0);
      const avgSQS = platformLLMSessions > 0 ? (weightedSQS / platformLLMSessions) : pagesData.summary.avgSQS;
      
      pagesData.summary.totalSessions = platformLLMSessions;
      pagesData.summary.avgSQS = avgSQS;
      
      console.log('✅ [pages] Updated summary with Platform Tab values:', {
        totalSessions: platformLLMSessions,
        avgSQS: avgSQS.toFixed(2),
        weightedSQS: weightedSQS.toFixed(2),
        totalPageSessions: totalPageSessions
      });
    }

    if (!disableCache) {
      await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, pagesData, CACHE_DURATION_MINUTES);
      console.log('💾 [pages] Data cached');
    } else {
      console.log('🚫 [pages] Cache bypass active - response not cached');
    }

    console.log('✅ Pages response:', {
      pagesCount: pagesData.pages?.length || 0,
      totalSessions: pagesData.summary?.totalSessions || 0,
      platformLLMSessions: platformLLMSessions,
      conversionMetric
    });

    res.json({
      success: true,
      data: pagesData
    });
  } catch (error) {
    console.error('Error fetching pages data:', error);
    
    // Extract error message from axios error
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorCode = error.response?.data?.error?.code || error.response?.status;
    
    console.error('📄 [pages] Error details:', {
      errorMessage,
      errorCode,
      conversionEvent,
      conversionMetric
    });
    
    // If error is about invalid metric, try falling back to conversions
    if (errorMessage.includes('not a valid metric') || errorCode === 400) {
      console.warn(`⚠️ [pages] Conversion event "${conversionEvent}" (metric: "${conversionMetric}") is not valid, falling back to "conversions"`);
      
      // If it's not already conversions, retry with conversions
      if (conversionEvent !== 'conversions') {
        try {
          const fallbackMetric = 'conversions';
          const fallbackConfig = {
            ...reportConfig,
            metrics: reportConfig.metrics.map(m => m.name === conversionMetric ? { name: fallbackMetric } : m)
          };
          
          console.log('🔄 [pages] Retrying with fallback metric "conversions"');
          const fallbackData = await runReport(accessToken, propertyId, fallbackConfig);
          const fallbackPagesData = transformPagesData(fallbackData);
          
          // Respect disableCache flag even for fallback responses to avoid serving stale data
          if (!disableCache) {
            const fallbackCacheKey = `pages-conversions`;
            await setCachedData(userId, propertyId, fallbackCacheKey, finalStartDate, finalEndDate, fallbackPagesData, CACHE_DURATION_MINUTES);
          } else {
            console.log('🚫 [pages] Cache bypass active - fallback response not cached');
          }
          
          return res.json({
            success: true,
            data: fallbackPagesData,
            warning: `Conversion event "${conversionEvent}" is not available in GA4. Showing "conversions" instead.`
          });
        } catch (fallbackError) {
          console.error('❌ [pages] Error with fallback conversion metric:', fallbackError);
        }
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

module.exports = router;


