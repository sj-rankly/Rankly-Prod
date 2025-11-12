const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');
const { runReport } = require('../../utils/ga4ApiClient');
const {
  transformGeoData,
  transformDeviceData,
  getLLMFilterRegex,
  LLM_PATTERNS
} = require('../../utils/ga4DataTransformer');
const { normalizeDateRange } = require('../../utils/ga4DateHelpers');
const { getConversionEventMetric } = require('../../utils/ga4MetricHelpers');
const { getCachedData, setCachedData } = require('../../services/ga4CacheService');

const router = express.Router();
const CACHE_DURATION_MINUTES = 5; // Cache for 5 minutes

/**
 * GET /api/ga4/geo
 * Fetch geographic data (LLM traffic only)
 */
router.get('/geo', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate, endDate, dateRange } = req.query;
    const userId = req.session.userId;
    
    // Normalize date range consistently
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    // Check cache first
    const cacheKey = 'geo';
    const cachedData = await getCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate);
    
    if (cachedData) {
      console.log('✅ [geo] Returning cached data');
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    console.log('🔄 [geo] No cache found, fetching fresh data');

    // Main geo report - fetch ALL traffic, filter LLMs in transformer (same approach as llm-platforms)
    // This ensures we catch LLM traffic from sessionSource, sessionMedium, AND pageReferrer
    const reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [
        { name: 'country' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'pageReferrer' }
      ],
      // NO dimensionFilter - we'll filter LLM traffic in the transformer
      // This matches the approach used in llm-platforms endpoint for consistency
      metrics: [
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000, // Increased limit to catch all LLM traffic
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    };

    console.log('🌍 [geo] Fetching geo data with LLM filtering in transformer (matching llm-platforms approach)', {
      dateRange: { finalStartDate, finalEndDate },
      dateRangeParam: dateRange
    });

    const data = await runReport(accessToken, propertyId, reportConfig);
    
    // Log raw data stats before filtering
    console.log('🌍 [geo] Raw GA4 data received:', {
      rowCount: data.rows?.length || 0,
      sampleRows: data.rows?.slice(0, 3).map(r => ({
        country: r.dimensionValues?.[0]?.value,
        source: r.dimensionValues?.[1]?.value,
        medium: r.dimensionValues?.[2]?.value,
        referrer: r.dimensionValues?.[3]?.value?.substring(0, 50) || '',
        sessions: r.metricValues?.[0]?.value
      })),
      dateRange: { finalStartDate, finalEndDate }
    });
    
    const geoData = transformGeoData(data, true); // Pass flag to enable LLM filtering
    
    console.log('🌍 [geo] Final geo data:', {
      totalSessions: geoData.totalSessions,
      countries: geoData.countries?.length || 0,
      dateRange: { finalStartDate, finalEndDate }
    });

    // Also fetch platform breakdown for header display
    // Use same approach as main geo query - fetch all, filter in transformer
    const platformConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'pageReferrer' }
      ],
      // NO dimensionFilter - filter LLMs in transformer for consistency
      metrics: [{ name: 'sessions' }],
      keepEmptyRows: false,
      limit: 10000 // Increased limit to catch all LLM traffic
    };

    let platformBreakdown = [];
    try {
      const platformData = await runReport(accessToken, propertyId, platformConfig);
      const platformMap = new Map();
      
      // Use same LLM detection logic as transformToLLMPlatforms
      for (const row of platformData.rows || []) {
        const source = row.dimensionValues?.[0]?.value || '';
        const medium = row.dimensionValues?.[1]?.value || '';
        const referrer = row.dimensionValues?.[2]?.value || '';
        const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
        
        // Detect LLM platform using same logic as transformToLLMPlatforms
        let detectedLLM = null;
        if (referrer) {
          for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
            if (pattern.test(referrer)) {
              detectedLLM = platform;
              break;
            }
          }
        }
        if (!detectedLLM && source) {
          for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
            if (pattern.test(source)) {
              detectedLLM = platform;
              break;
            }
          }
        }
        
        // Only process LLM platforms
        if (!detectedLLM || sessions === 0) continue;
        
        const platform = detectedLLM;
        
        // Get favicon URL
        const getLLMDomain = (platform) => {
          const platformLower = platform.toLowerCase();
          if (platformLower.includes('chatgpt') || platformLower.includes('openai')) return 'chatgpt.com';
          if (platformLower.includes('claude') || platformLower.includes('anthropic')) return 'claude.ai';
          if (platformLower.includes('gemini') || platformLower.includes('bard')) return 'gemini.google.com';
          if (platformLower.includes('perplexity')) return 'perplexity.ai';
          if (platformLower.includes('copilot')) return 'copilot.microsoft.com';
          if (platformLower.includes('grok')) return 'x.com';
          if (platformLower.includes('poe')) return 'poe.com';
          if (platformLower.includes('character')) return 'character.ai';
          return 'google.com';
        };
        
        const favicon = `https://www.google.com/s2/favicons?domain=${getLLMDomain(platform)}&sz=32`;
        
        const existing = platformMap.get(platform);
        if (existing) {
          existing.sessions += Math.round(sessions);
        } else {
          platformMap.set(platform, {
            name: platform,
            favicon,
            sessions: Math.round(sessions)
          });
        }
      }
      
      platformBreakdown = Array.from(platformMap.values()).sort((a, b) => b.sessions - a.sessions);
      
      console.log('🌍 [geo] Platform breakdown:', {
        totalPlatforms: platformBreakdown.length,
        totalSessions: platformBreakdown.reduce((sum, p) => sum + p.sessions, 0),
        platforms: platformBreakdown.map(p => ({ name: p.name, sessions: p.sessions }))
      });
    } catch (platformError) {
      console.warn('⚠️ [geo] Could not fetch platform breakdown:', platformError.message);
    }

    // Combine geo data with platform breakdown
    const finalData = {
      ...geoData,
      platformBreakdown
    };

    // Save to cache
    await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, finalData, CACHE_DURATION_MINUTES);
    console.log('💾 [geo] Data cached');

    res.json({
      success: true,
      data: finalData
    });
  } catch (error) {
    console.error('Error fetching geo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geographic data'
    });
  }
});

/**
 * GET /api/ga4/devices
 * Fetch device data (LLM traffic only)
 */
router.get('/devices', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate, endDate, dateRange, conversionEvent = 'conversions' } = req.query;
    const userId = req.session.userId;
    
    // Normalize date range consistently
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    const conversionMetric = getConversionEventMetric(conversionEvent);

    // Check cache first
    const cacheKey = `devices-${conversionEvent}`;
    const cachedData = await getCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate);
    
    if (cachedData) {
      console.log('✅ [devices] Returning cached data');
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    console.log('🔄 [devices] No cache found, fetching fresh data');

    const reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [
        { name: 'deviceCategory' },
        { name: 'operatingSystem' },
        { name: 'browser' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'pageReferrer' }
      ],
      // Remove API-level filter - we'll filter LLMs in the transformer
      metrics: [
        { name: 'sessions' },
        { name: conversionMetric },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    
    // Log raw data stats before filtering
    console.log('📱 [devices] Raw GA4 data received:', {
      rowCount: data.rows?.length || 0,
      sampleRows: data.rows?.slice(0, 3).map(r => ({
        device: r.dimensionValues?.[0]?.value,
        os: r.dimensionValues?.[1]?.value,
        browser: r.dimensionValues?.[2]?.value,
        source: r.dimensionValues?.[3]?.value,
        medium: r.dimensionValues?.[4]?.value,
        referrer: r.dimensionValues?.[5]?.value?.substring(0, 50) || '',
        sessions: r.metricValues?.[0]?.value
      })),
      dateRange: { finalStartDate, finalEndDate },
      dateRangeParam: dateRange
    });
    
    // Filter LLMs in the transformer (filterLLMs = true)
    const deviceData = transformDeviceData(data, true);
    
    console.log('📱 [devices] Final device data:', {
      totalSessions: deviceData.totalSessions,
      deviceBreakdownCount: deviceData.deviceBreakdown?.length || 0,
      dateRange: { finalStartDate, finalEndDate }
    });

    // Save to cache
    await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, deviceData, CACHE_DURATION_MINUTES);
    console.log('💾 [devices] Data cached');

    res.json({
      success: true,
      data: deviceData
    });
  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device data'
    });
  }
});

module.exports = router;


