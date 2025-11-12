const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');
const { runReport } = require('../../utils/ga4ApiClient');
const {
  transformToPlatformSplit,
  transformToLLMPlatforms,
  transformTrendData,
  calculateComparisonDates,
  getLLMFilterRegex
} = require('../../utils/ga4DataTransformer');
const { normalizeDateRange } = require('../../utils/ga4DateHelpers');
const { getConversionEventMetric } = require('../../utils/ga4MetricHelpers');
const { getCachedData, setCachedData } = require('../../services/ga4CacheService');

const router = express.Router();
const CACHE_DURATION_MINUTES = 5; // Cache for 5 minutes

/**
 * GET /api/ga4/llm-platforms
 * Fetch LLM platform traffic data
 */
router.get('/llm-platforms', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate, endDate, dateRange, conversionEvent = 'conversions' } = req.query;
    const userId = req.session.userId;
    
    // Normalize date range consistently
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    // Check cache first
    const cacheKey = `llm-platforms-${conversionEvent}`;
    const cachedData = await getCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate);
    
    if (cachedData) {
      console.log('✅ [llm-platforms] Returning cached data');
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    console.log('🔄 [llm-platforms] No cache found, fetching fresh data');

    // Convert conversion event to valid GA4 metric name
    const conversionMetric = getConversionEventMetric(conversionEvent);
    console.log('🎯 [llm-platforms] Using conversion event:', { conversionEvent, conversionMetric });

    const reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [{ name: 'pageReferrer' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric }, // Dynamic conversion metric
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
    };

    let currentData;
    try {
      currentData = await runReport(accessToken, propertyId, reportConfig);
    } catch (apiError) {
      console.error('❌ [llm-platforms] GA4 API call failed:', {
        error: apiError.message,
        conversionMetric,
        reportConfig: {
          metrics: reportConfig.metrics.map(m => m.name),
          dimensions: reportConfig.dimensions.map(d => d.name)
        }
      });
      throw apiError;
    }
    
    // Log conversion data from sample rows to debug zero conversions
    const sampleRowsWithConversions = (currentData.rows || []).slice(0, 5).map(row => ({
      pageReferrer: row.dimensionValues?.[0]?.value || '',
      metrics: row.metricValues?.map((m, idx) => ({
        index: idx,
        value: m?.value || '0',
        name: reportConfig.metrics[idx]?.name || 'unknown'
      })) || []
    }));
    
    // Find the index of the conversion metric in the metrics array
    const conversionMetricIndex = reportConfig.metrics.findIndex(m => m.name === conversionMetric);
    console.log('🔍 [llm-platforms] Conversion metric lookup:', {
      conversionMetric,
      conversionMetricIndex,
      metricsArray: reportConfig.metrics.map((m, idx) => ({ index: idx, name: m.name })),
      metricFound: conversionMetricIndex !== -1
    });
    
    // Calculate total conversions from all rows using the correct index
    const totalConversionsInResponse = conversionMetricIndex !== -1 
      ? (currentData.rows || []).reduce((sum, row) => {
          return sum + parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0');
        }, 0)
      : 0;
    
    // Find all rows with conversions to see where they came from
    const llmReferrerPattern = new RegExp(getLLMFilterRegex(), 'i');

    const rowsWithConversions = conversionMetricIndex !== -1
      ? (currentData.rows || [])
          .filter(row => parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0') > 0)
          .map(row => ({
            referrer: row.dimensionValues?.[0]?.value?.substring(0, 80) || '',
            sessions: row.metricValues?.[0]?.value || '0',
            conversions: row.metricValues?.[conversionMetricIndex]?.value || '0',
            conversionMetricIndex: conversionMetricIndex
          }))
      : [];
    
    const llmRowsWithConversions = rowsWithConversions.filter(row => row.referrer && llmReferrerPattern.test(row.referrer));
    
    // Log detailed metric information
    const firstRowMetrics = currentData.rows?.[0]?.metricValues?.map((m, idx) => ({
      index: idx,
      value: m?.value || '0',
      metricName: reportConfig.metrics[idx]?.name || 'unknown'
    })) || [];
    
    // Check if GA4 returned column headers (metadata about metrics)
    const metricHeaders = currentData.metricHeaders?.map((h, idx) => ({
      index: idx,
      name: h.name,
      type: h.type,
      expectedName: reportConfig.metrics[idx]?.name
    })) || [];
    
    console.log('📊 [llm-platforms] Current data fetched:', {
      rowCount: currentData.rows?.length || 0,
      startDate: finalStartDate,
      endDate: finalEndDate,
      conversionEvent,
      conversionMetric,
      conversionMetricIndex,
      totalConversionsInResponse,
      rowsWithConversionsCount: rowsWithConversions.length,
      llmRowsWithConversionsCount: llmRowsWithConversions.length,
      rowsWithConversions: rowsWithConversions.slice(0, 3), // Limit to 3 for readability
      llmRowsWithConversions: llmRowsWithConversions,
      sampleRowsWithConversions: sampleRowsWithConversions.slice(0, 2), // Limit to 2 for readability
      metricNames: reportConfig.metrics.map(m => m.name),
      metricHeaders: metricHeaders,
      firstRowMetricBreakdown: firstRowMetrics,
      hasAPIWarnings: !!(currentData.warningMessages && currentData.warningMessages.length > 0),
      apiWarnings: currentData.warningMessages || []
    });
    
    // Calculate comparison date range
    const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(finalStartDate, finalEndDate);
    
    // Calculate period length for logging
    let periodLength = 0;
    try {
      const end = finalEndDate === 'today' ? new Date() : new Date(finalEndDate);
      const start = finalStartDate.includes('daysAgo') 
        ? new Date(Date.now() - parseInt(finalStartDate) * 24 * 60 * 60 * 1000)
        : new Date(finalStartDate);
      periodLength = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    } catch (e) {
      console.warn('Could not calculate period length:', e);
    }
    
    console.log('📊 [llm-platforms] Comparison dates calculated:', {
      comparisonStartDate,
      comparisonEndDate,
      currentStartDate: finalStartDate,
      currentEndDate: finalEndDate,
      periodLengthDays: periodLength,
      comparisonPeriod: `${comparisonStartDate} to ${comparisonEndDate}`,
      currentPeriod: `${finalStartDate} to ${finalEndDate}`
    });
    
    // Fetch comparison period data
    const comparisonConfig = {
      ...reportConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };
    
    const comparisonData = await runReport(accessToken, propertyId, comparisonConfig);
    console.log('📊 [llm-platforms] Comparison data fetched:', {
      rowCount: comparisonData.rows?.length || 0,
      hasData: (comparisonData.rows?.length || 0) > 0,
      comparisonStartDate,
      comparisonEndDate,
      sampleRows: comparisonData.rows?.slice(0, 5) || []
    });
    
    // Check if GA4 API returned any errors or warnings
    if (currentData.error) {
      console.error('❌ [llm-platforms] GA4 API error:', currentData.error);
    }
    if (currentData.warningMessages && currentData.warningMessages.length > 0) {
      console.warn('⚠️ [llm-platforms] GA4 API warnings:', currentData.warningMessages);
    }
    
    // Transform with comparison
    const platforms = transformToLLMPlatforms(currentData, comparisonData, {
      conversionMetric
    });

    // Save to cache
    await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, platforms, CACHE_DURATION_MINUTES);
    console.log('💾 [llm-platforms] Data cached');

    console.log('✅ [llm-platforms] LLM platforms response:', {
      platformsCount: platforms.platforms?.length || 0,
      performanceDataCount: platforms.performanceData?.length || 0,
      totalLLMSessions: platforms.summary?.totalLLMSessions || 0,
      samplePlatform: platforms.platforms?.[0] || null,
      hasComparisonData: (comparisonData.rows?.length || 0) > 0
    });

    res.json({
      success: true,
      data: platforms
    });
  } catch (error) {
    console.error('Error fetching LLM platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM platforms data'
    });
  }
});

/**
 * GET /api/ga4/llm-platform-trends
 * Fetch LLM platform trend data
 */
router.get('/llm-platform-trends', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate, endDate, dateRange } = req.query;
    
    // Normalize date range consistently
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    console.log('📈 [llm-platform-trends] Fetching data:', { propertyId, startDate: finalStartDate, endDate: finalEndDate });

    const reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }],
      keepEmptyRows: false,
      limit: 10000
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    console.log('📈 [llm-platform-trends] GA4 API success:', { rowCount: data.rows?.length || 0 });

    // Transform data similar to traffic-analytics
    const transformed = transformTrendData(data);

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching LLM platform trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM platform trends'
    });
  }
});

/**
 * GET /api/ga4/platform-split
 * Fetch platform split data
 */
router.get('/platform-split', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate, endDate, dateRange, conversionEvent = 'conversions' } = req.query;
    const userId = req.session.userId;
    
    // Normalize date range consistently
    const { startDate: finalStartDate, endDate: finalEndDate } = normalizeDateRange(startDate, endDate, dateRange);

    // Check cache first
    const cacheKey = `platform-split-${conversionEvent}`;
    const cachedData = await getCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate);
    
    if (cachedData) {
      console.log('✅ [platform-split] Returning cached data');
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    console.log('🔄 [platform-split] No cache found, fetching fresh data');

    // Convert conversion event to valid GA4 metric name
    const conversionMetric = getConversionEventMetric(conversionEvent);
    console.log('🎯 [platform-split] Using conversion event:', { conversionEvent, conversionMetric });

    const reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric }, // Dynamic conversion metric
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
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
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

    let currentData;
    let llmReferrerData;
    try {
      currentData = await runReport(accessToken, propertyId, reportConfig);
      llmReferrerData = await runReport(accessToken, propertyId, llmReferrerConfig);
    } catch (apiError) {
      console.error('❌ [platform-split] GA4 API call failed:', {
        error: apiError.message,
        conversionMetric,
        reportConfig: {
          metrics: reportConfig.metrics.map(m => m.name),
          dimensions: reportConfig.dimensions.map(d => d.name)
        },
        llmReferrerConfig: {
          metrics: llmReferrerConfig.metrics.map(m => m.name),
          dimensions: llmReferrerConfig.dimensions.map(d => d.name)
        }
      });
      throw apiError;
    }
    
    // Check if GA4 API returned any errors or warnings
    if (currentData.error) {
      console.error('❌ [platform-split] GA4 API error:', currentData.error);
    }
    if (currentData.warningMessages && currentData.warningMessages.length > 0) {
      console.warn('⚠️ [platform-split] GA4 API warnings:', currentData.warningMessages);
    }
    
    // Log conversion data from sample rows
    const conversionMetricIndex = reportConfig.metrics.findIndex(m => m.name === conversionMetric);
    const totalConversionsInResponse = conversionMetricIndex !== -1 
      ? (currentData.rows || []).reduce((sum, row) => {
          return sum + parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0');
        }, 0)
      : 0;
    
    const rowsWithConversions = conversionMetricIndex !== -1
      ? (currentData.rows || [])
          .filter(row => parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0') > 0)
          .slice(0, 5)
          .map(row => ({
            source: row.dimensionValues?.[0]?.value || '',
            medium: row.dimensionValues?.[1]?.value || '',
            sessions: row.metricValues?.[0]?.value || '0',
            conversions: row.metricValues?.[conversionMetricIndex]?.value || '0'
          }))
      : [];
    
    const metricHeaders = currentData.metricHeaders?.map((h, idx) => ({
      index: idx,
      name: h.name,
      type: h.type,
      expectedName: reportConfig.metrics[idx]?.name
    })) || [];
    
    console.log('📊 [platform-split] Current data fetched:', {
      rowCount: currentData.rows?.length || 0,
      startDate: finalStartDate,
      endDate: finalEndDate,
      conversionEvent,
      conversionMetric,
      conversionMetricIndex,
      totalConversionsInResponse,
      rowsWithConversionsCount: rowsWithConversions.length,
      sampleRowsWithConversions: rowsWithConversions,
      metricHeaders: metricHeaders
    });
    
    // Calculate comparison date range
    const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(finalStartDate, finalEndDate);
    console.log('📊 [platform-split] Comparison dates calculated:', {
      comparisonStartDate,
      comparisonEndDate,
      currentStartDate: finalStartDate,
      currentEndDate: finalEndDate
    });
    
    // Fetch comparison period data
    const comparisonConfig = {
      ...reportConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };

    const comparisonLlmReferrerConfig = {
      ...llmReferrerConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };

    const comparisonDataPromise = runReport(accessToken, propertyId, comparisonConfig);
    const comparisonLlmDataPromise = runReport(accessToken, propertyId, comparisonLlmReferrerConfig);

    const [comparisonData, comparisonLlmReferrerData] = await Promise.all([
      comparisonDataPromise,
      comparisonLlmDataPromise
    ]);
    console.log('📊 [platform-split] Comparison data fetched:', {
      rowCount: comparisonData.rows?.length || 0,
      hasData: (comparisonData.rows?.length || 0) > 0,
      comparisonStartDate,
      comparisonEndDate
    });
    
    // Transform with comparison
    const transformed = transformToPlatformSplit(currentData, comparisonData, {
      llmReferrerData,
      llmComparisonData: comparisonLlmReferrerData,
      conversionMetric
    });
    console.log('📊 [platform-split] Transformation complete:', {
      platformCount: transformed.rankings?.length || 0,
      sampleRanking: transformed.rankings?.[0] || null,
      hasComparisonData: comparisonData.rows?.length > 0
    });

    // Validate LLM sessions match llm-platforms endpoint
    try {
      const llmFilterPattern = llmReferrerPattern;
      const llmPlatformsSessions = (llmReferrerData.rows || [])
        .filter(row => {
          const referrer = row.dimensionValues?.[0]?.value || '';
          return llmFilterPattern.test(referrer);
        })
        .reduce((sum, row) => {
        return sum + parseFloat(row.metricValues?.[0]?.value || '0');
      }, 0);
      
      const platformSplitLLMSessions = transformed.summary?.llmBreakdown?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;
      
      console.log('🔍 LLM Sessions Validation:', {
        llmPlatformsTotal: llmPlatformsSessions,
        platformSplitLLMTotal: platformSplitLLMSessions,
        difference: llmPlatformsSessions - platformSplitLLMSessions,
        match: Math.abs(llmPlatformsSessions - platformSplitLLMSessions) < 1
      });
      
      // If there's a mismatch, log detailed breakdown
      if (Math.abs(llmPlatformsSessions - platformSplitLLMSessions) > 1) {
        console.warn('⚠️ LLM sessions mismatch detected:', {
          llmPlatformsEndpoint: llmPlatformsSessions,
          platformSplitEndpoint: platformSplitLLMSessions,
          difference: llmPlatformsSessions - platformSplitLLMSessions,
          llmBreakdown: transformed.summary?.llmBreakdown
        });
      }
    } catch (validationError) {
      console.warn('Could not validate LLM sessions:', validationError.message);
    }

    // Save to cache
    await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, transformed, CACHE_DURATION_MINUTES);
    console.log('💾 [platform-split] Data cached');

    console.log('✅ Platform split response:', {
      platformSplitCount: transformed.platformSplit?.length || 0,
      rankingsCount: transformed.rankings?.length || 0,
      performanceDataCount: transformed.performanceData?.length || 0,
      totalSessions: transformed.totalSessions,
      llmSessions: transformed.summary?.llmBreakdown?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0
    });

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching platform split:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform split data'
    });
  }
});

module.exports = router;


