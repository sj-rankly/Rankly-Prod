/**
const { asyncHandler } = require('../middleware/errorHandler');
 * Dashboard Metrics API Routes
 * 
 * These routes provide data in the exact format needed by the Rankly Dashboard frontend.
 * All responses match the component requirements from DASHBOARD_TO_BACKEND_MAPPING.md
 */

const express = require('express');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const PromptTest = require('../models/PromptTest');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
const router = express.Router();


const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/all
 * 
 * Get all dashboard data in one request (recommended for initial load)
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo, urlAnalysisId, topics: topicsQuery, personas: personasQuery, platforms: platformsQuery } = req.query;
    const userId = req.userId;
    
    // Parse filter arrays from query parameters
    const selectedTopicFilters = topicsQuery ? (Array.isArray(topicsQuery) ? topicsQuery : [topicsQuery]) : [];
    const selectedPersonaFilters = personasQuery ? (Array.isArray(personasQuery) ? personasQuery : [personasQuery]) : [];
    const selectedPlatformFilters = platformsQuery ? (Array.isArray(platformsQuery) ? platformsQuery : [platformsQuery]) : [];
    
    console.log('🔍 [DASHBOARD] Received filter parameters:', {
      topics: selectedTopicFilters,
      personas: selectedPersonaFilters,
      platforms: selectedPlatformFilters
    });

    // Get user's brand from URL analysis
    const UrlAnalysis = require('../models/UrlAnalysis');
    
    // If urlAnalysisId is provided, get that specific analysis
    // Otherwise, get the latest analysis
    let urlAnalysis;
    if (urlAnalysisId) {
      urlAnalysis = await UrlAnalysis.findOne({
        _id: urlAnalysisId,
        userId: userId
      }).lean();
      
      if (!urlAnalysis) {
        // ✅ FIX: Check if metrics exist for this urlAnalysisId before falling back
        console.warn(`⚠️ [DASHBOARD] URL analysis ${urlAnalysisId} not found, checking if metrics exist...`);
        
        // Check if any metrics exist for this urlAnalysisId
        const metricsForAnalysis = await AggregatedMetrics.findOne({
          userId: userId,
          urlAnalysisId: urlAnalysisId
        }).lean();
        
        if (metricsForAnalysis) {
          // Metrics exist but analysis doesn't - this is a data inconsistency issue
          console.error(`❌ [DASHBOARD] DATA INCONSISTENCY: Metrics exist for analysis ${urlAnalysisId} but analysis document not found`);
          console.error(`   This suggests the analysis was deleted after metrics were calculated`);
          console.error(`   Attempting to find analysis by checking metrics...`);
          
          // Try to find the analysis by looking at the metrics' urlAnalysisId
          // But since it doesn't exist, we should return an error or try to find a related analysis
          // For now, fall through to latest analysis fallback
        }
        
        // ✅ FIX: Correct syntax - findOne doesn't support sort, use find().sort().limit(1)
        console.warn(`⚠️ [DASHBOARD] Falling back to latest analysis...`);
        const analysisList = await UrlAnalysis.find({
          userId: userId
        })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();
        urlAnalysis = analysisList[0] || null;
        
        if (!urlAnalysis) {
          return res.status(404).json({
            success: false,
            message: 'URL analysis not found. Please complete the onboarding flow first.'
          });
        }
        
        console.log(`✅ [DASHBOARD] Using latest analysis as fallback: ${urlAnalysis._id} (URL: ${urlAnalysis.url})`);
        console.warn(`⚠️ [DASHBOARD] WARNING: Metrics may not match this analysis. Original analysis ${urlAnalysisId} was not found.`);
      }
    } else {
      // ⚠️ FALLBACK: Get the latest analysis (should be avoided if possible)
      // ✅ FIX: Correct syntax - findOne doesn't support sort, use find().sort().limit(1)
      console.warn('⚠️ [DASHBOARD] No urlAnalysisId provided, using latest analysis (may not be correct for user)');
      const analysisList = await UrlAnalysis.find({
        userId: userId
      })
      .sort({ analysisDate: -1 })
      .limit(1)
      .lean();
      urlAnalysis = analysisList[0] || null;
      
      // If no analysis exists at all, return a helpful error message
      if (!urlAnalysis) {
        return res.status(404).json({
          success: false,
          message: 'No analysis found. Please complete the onboarding flow first.'
        });
      }
      
      console.log(`⚠️ [DASHBOARD] Using latest analysis: ${urlAnalysis._id} (URL: ${urlAnalysis.url})`);
      console.log('⚠️ [DASHBOARD] Recommendation: Frontend should always pass urlAnalysisId to ensure correct data');
    }

    let userBrandName = urlAnalysis?.brandContext?.companyName || null;
    let userBrandUrl = urlAnalysis?.url || null; // ✅ FIX: Get user's brand URL from UrlAnalysis (like prompts.js)
    let currentUrlAnalysisId = urlAnalysis?._id;

    console.log(`📊 [DASHBOARD] User: ${userId}, URL Analysis ID: ${currentUrlAnalysisId}, Brand: ${userBrandName}`);

    // Build query with optional urlAnalysisId filtering
    const buildQuery = (scope, additionalFilters = {}) => {
      const query = { 
        userId: userId, 
        scope: scope 
      };
      
      // Only add urlAnalysisId filter if it exists and is not null
      // Otherwise, don't filter by urlAnalysisId at all to include null values
      if (currentUrlAnalysisId) {
        query.urlAnalysisId = currentUrlAnalysisId;
      }
      // Note: If currentUrlAnalysisId is null/undefined, we don't add the filter
      // This allows the query to match records where urlAnalysisId is null
      
      if (dateFrom || dateTo) {
        if (dateFrom) query.dateFrom = { $gte: new Date(dateFrom) };
        if (dateTo) query.dateTo = { $lte: new Date(dateTo) };
      }
      
      return { ...query, ...additionalFilters };
    };

    // Get all metrics scopes with proper filtering
    const overallQuery = buildQuery('overall');
    const platformQuery = buildQuery('platform');
    const topicQuery = buildQuery('topic');
    const personaQuery = buildQuery('persona');
    
    console.log(`📊 [DASHBOARD] Queries:`, {
      overall: overallQuery,
      platform: platformQuery,
      topic: topicQuery,
      persona: personaQuery
    });

    let [overall, platforms, allTopics, allPersonas] = await Promise.all([
      AggregatedMetrics.findOne(overallQuery).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find(platformQuery).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find(topicQuery).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find(personaQuery).sort({ lastCalculated: -1 }).lean()
    ]);

    console.log(`📊 [DASHBOARD] Results:`, {
      overall: overall ? 'Found' : 'Not found',
      platforms: platforms?.length || 0,
      topics: allTopics?.length || 0,
      personas: allPersonas?.length || 0
    });

    // ✅ FALLBACK: If no metrics found with current urlAnalysisId, try fallback to any available metrics
    // BUT: Only use fallback if the current analysis actually exists (not just missing)
    if (!overall && platforms?.length === 0 && allTopics?.length === 0 && allPersonas?.length === 0 && currentUrlAnalysisId) {
      // ✅ FIX: Verify the analysis exists before using fallback metrics from different analysis
      const analysisExists = await UrlAnalysis.findOne({ 
        _id: currentUrlAnalysisId, 
        userId: userId 
      }).lean();
      
      if (!analysisExists) {
        console.warn(`⚠️ [DASHBOARD] Analysis ${currentUrlAnalysisId} does not exist in database`);
        console.warn(`⚠️ [DASHBOARD] This is a data inconsistency - metrics may exist but analysis was deleted`);
      }
      
      console.log('⚠️ [DASHBOARD] No metrics found for current urlAnalysisId, falling back to any available metrics...');
      console.log(`🔍 [DASHBOARD] DEBUG - Fallback conditions:`, {
        hasOverall: !!overall,
        platformsCount: platforms?.length || 0,
        allTopicsCount: allTopics?.length || 0,
        allPersonasCount: allPersonas?.length || 0,
        currentUrlAnalysisId: currentUrlAnalysisId,
        analysisExists: !!analysisExists
      });
      
      // ✅ FIX: Only use fallback if analysis doesn't exist OR if user explicitly wants to see other data
      // For now, allow fallback but log a warning
      if (analysisExists) {
        console.warn(`⚠️ [DASHBOARD] Analysis exists but has no metrics - this may indicate metrics haven't been calculated yet`);
      }
      
      // Find all metrics for this user (excluding null urlAnalysisId)
      const fallbackMetrics = await AggregatedMetrics.find({ 
        userId, 
        urlAnalysisId: { $ne: null } // Only metrics with valid urlAnalysisId
      }).sort({ lastCalculated: -1 }).lean();
      
      console.log(`🔍 [DASHBOARD] DEBUG - Found ${fallbackMetrics?.length || 0} metrics with urlAnalysisId`);
      
      if (fallbackMetrics && fallbackMetrics.length > 0) {
        // Group metrics by urlAnalysisId to find the most complete set
        const metricsByAnalysis = {};
        fallbackMetrics.forEach(m => {
          const id = m.urlAnalysisId?.toString();
          if (!metricsByAnalysis[id]) {
            metricsByAnalysis[id] = [];
          }
          metricsByAnalysis[id].push(m);
        });
        
        console.log(`🔍 [DASHBOARD] DEBUG - Found ${Object.keys(metricsByAnalysis).length} distinct analyses with metrics`);
        
        // Find the analysis with the most complete metrics (prioritize those with overall + platform + topic + persona)
        let bestAnalysisId = null;
        let bestMetricsCount = 0;
        let bestMetrics = null;
        
        Object.keys(metricsByAnalysis).forEach(analysisId => {
          const metrics = metricsByAnalysis[analysisId];
          const hasOverall = metrics.some(m => m.scope === 'overall');
          const platformCount = metrics.filter(m => m.scope === 'platform').length;
          const topicCount = metrics.filter(m => m.scope === 'topic').length;
          const personaCount = metrics.filter(m => m.scope === 'persona').length;
          
          // Score completeness: overall presence + platform/topic/persona counts
          const completenessScore = (hasOverall ? 10 : 0) + platformCount + topicCount + personaCount;
          
          console.log(`🔍 [DASHBOARD] DEBUG - Analysis ${analysisId}: score=${completenessScore}, overall=${hasOverall}, platforms=${platformCount}, topics=${topicCount}, personas=${personaCount}`);
          
          if (completenessScore > bestMetricsCount) {
            bestAnalysisId = analysisId;
            bestMetricsCount = completenessScore;
            bestMetrics = metrics;
          }
        });
        
        console.log(`✅ [DASHBOARD] Selected best analysis: ${bestAnalysisId} with score ${bestMetricsCount}`);
        console.log(`🔍 [DASHBOARD] DEBUG - Fallback metrics sample:`, bestMetrics.slice(0, 3).map(m => ({ 
          scope: m.scope, 
          urlAnalysisId: m.urlAnalysisId,
          lastCalculated: m.lastCalculated 
        })));
        
        // Group fallback metrics by scope
        const fallbackOverall = bestMetrics.find(m => m.scope === 'overall');
        const fallbackPlatforms = bestMetrics.filter(m => m.scope === 'platform');
        const fallbackTopics = bestMetrics.filter(m => m.scope === 'topic');
        const fallbackPersonas = bestMetrics.filter(m => m.scope === 'persona');
        
        console.log(`🔍 [DASHBOARD] DEBUG - Grouped fallback metrics:`, {
          overall: !!fallbackOverall,
          platforms: fallbackPlatforms.length,
          topics: fallbackTopics.length,
          personas: fallbackPersonas.length
        });
        
        if (fallbackOverall) {
          console.log('🔄 [DASHBOARD] DEBUG - Assigning fallback overall');
          overall = fallbackOverall;
        }
        if (fallbackPlatforms.length > 0) {
          console.log('🔄 [DASHBOARD] DEBUG - Assigning fallback platforms');
          platforms = fallbackPlatforms;
        }
        if (fallbackTopics.length > 0) {
          console.log('🔄 [DASHBOARD] DEBUG - Assigning fallback topics');
          allTopics = fallbackTopics;
        }
        if (fallbackPersonas.length > 0) {
          console.log('🔄 [DASHBOARD] DEBUG - Assigning fallback personas');
          allPersonas = fallbackPersonas;
        }
        
        console.log(`🔍 [DASHBOARD] DEBUG - After fallback assignment:`, {
          hasOverall: !!overall,
          platformsCount: platforms?.length || 0,
          allTopicsCount: allTopics?.length || 0,
          allPersonasCount: allPersonas?.length || 0
        });
        
        // Update currentUrlAnalysisId to the fallback analysis
        const fallbackUrlAnalysisId = fallbackOverall?.urlAnalysisId || fallbackPlatforms[0]?.urlAnalysisId;
        console.log(`🔍 [DASHBOARD] DEBUG - Fallback urlAnalysisId:`, { fallbackUrlAnalysisId, currentUrlAnalysisId });
        
        // ✅ FIX: Only switch to fallback if the original analysis doesn't exist
        // If original analysis exists but has no metrics, show empty metrics instead of wrong data
        if (fallbackUrlAnalysisId && currentUrlAnalysisId !== fallbackUrlAnalysisId) {
          // Check if original analysis exists
          const originalAnalysisExists = await UrlAnalysis.findOne({ 
            _id: currentUrlAnalysisId, 
            userId: userId 
          }).lean();
          
          if (!originalAnalysisExists) {
            // Original analysis doesn't exist - safe to switch to fallback
            console.log(`🔄 [DASHBOARD] Original analysis ${currentUrlAnalysisId} doesn't exist, switching to fallback: ${fallbackUrlAnalysisId}`);
            currentUrlAnalysisId = fallbackUrlAnalysisId;
            
            // Re-fetch the urlAnalysis to get correct brand name
            const fallbackUrlAnalysis = await UrlAnalysis.findOne({ _id: fallbackUrlAnalysisId, userId }).lean();
            if (fallbackUrlAnalysis) {
              userBrandName = fallbackUrlAnalysis.brandContext?.companyName || null;
              console.log(`🔄 [DASHBOARD] Using fallback brand name: ${userBrandName}`);
              console.warn(`⚠️ [DASHBOARD] WARNING: Showing metrics from analysis ${fallbackUrlAnalysisId} because original analysis ${currentUrlAnalysisId} was not found`);
            } else {
              console.log(`⚠️ [DASHBOARD] No urlAnalysis found for fallback urlAnalysisId: ${fallbackUrlAnalysisId}`);
            }
          } else {
            // Original analysis exists but has no metrics - don't show wrong data!
            console.warn(`⚠️ [DASHBOARD] Original analysis ${currentUrlAnalysisId} exists but has no metrics`);
            console.warn(`⚠️ [DASHBOARD] NOT switching to fallback - will show empty metrics instead of wrong brand data`);
            // Clear fallback metrics to prevent showing wrong data
            overall = null;
            platforms = [];
            allTopics = [];
            allPersonas = [];
          }
        } else if (!fallbackUrlAnalysisId) {
          console.log(`⚠️ [DASHBOARD] No fallback urlAnalysisId found (metrics have null urlAnalysisId)`);
        } else {
          console.log(`ℹ️ [DASHBOARD] Fallback urlAnalysisId matches current, no switching needed`);
        }
      } else {
        console.log(`❌ [DASHBOARD] No fallback metrics found for userId: ${userId}`);
      }
    }

    // Get selected topics and personas from their respective collections
    // Filter by urlAnalysisId if available, otherwise include null values
    const selectedTopicQuery = { userId: userId, selected: true };
    const selectedPersonaQuery = { userId: userId, selected: true };
    
    // Only add urlAnalysisId filter if it exists and is not null
    if (currentUrlAnalysisId) {
      selectedTopicQuery.urlAnalysisId = currentUrlAnalysisId;
      selectedPersonaQuery.urlAnalysisId = currentUrlAnalysisId;
    }
    // Note: If currentUrlAnalysisId is null/undefined, we don't add the filter
    // This allows the query to match records where urlAnalysisId is null
    
    const [selectedTopics, selectedPersonas] = await Promise.all([
      Topic.find(selectedTopicQuery).lean(),
      Persona.find(selectedPersonaQuery).lean()
    ]);

    // ✅ NEW: Use frontend filter parameters if provided, otherwise fall back to database selections
    let finalTopicFilters = [];
    let finalPersonaFilters = [];
    
    if (selectedTopicFilters.length > 0 && !selectedTopicFilters.includes('All Topics')) {
      // Use frontend filter selections
      finalTopicFilters = selectedTopicFilters;
      console.log('🔍 [DASHBOARD] Using frontend topic filters:', finalTopicFilters);
    } else {
      // Fall back to database selections
      const selectedTopicNames = selectedTopics.map(t => t.name);
      finalTopicFilters = selectedTopicNames;
      console.log('🔍 [DASHBOARD] Using database topic selections:', finalTopicFilters);
    }
    
    if (selectedPersonaFilters.length > 0 && !selectedPersonaFilters.includes('All Personas')) {
      // Use frontend filter selections
      finalPersonaFilters = selectedPersonaFilters;
      console.log('🔍 [DASHBOARD] Using frontend persona filters:', finalPersonaFilters);
    } else {
      // Fall back to database selections
      const selectedPersonaTypes = selectedPersonas.map(p => p.type);
      finalPersonaFilters = selectedPersonaTypes;
      console.log('🔍 [DASHBOARD] Using database persona selections:', finalPersonaFilters);
    }
    
    console.log(`📊 [DASHBOARD] Final filters:`, { topics: finalTopicFilters, personas: finalPersonaFilters });
    console.log(`📊 [DASHBOARD] Available topic metrics:`, allTopics.map(t => t.scopeValue));
    console.log(`📊 [DASHBOARD] Available persona metrics:`, allPersonas.map(p => p.scopeValue));
    
    // Filter aggregated metrics based on final filter selections
    let topics = allTopics.filter(topic => finalTopicFilters.includes(topic.scopeValue));
    let personas = allPersonas.filter(persona => finalPersonaFilters.includes(persona.scopeValue));
    
    // ✅ Fallback: If no matches found, show all available
    if (topics.length === 0 && allTopics.length > 0) {
      console.log('⚠️ [DASHBOARD] No topics match filters, showing all topics');
      topics = allTopics;
    }
    if (personas.length === 0 && allPersonas.length > 0) {
      console.log('⚠️ [DASHBOARD] No personas match filters, showing all personas');
      personas = allPersonas;
    }
    
    console.log(`📊 [DASHBOARD] Filtered topics:`, topics.length);
    console.log(`📊 [DASHBOARD] Filtered personas:`, personas.length);

    // ✅ NEW: Apply platform filtering
    let filteredPlatforms = platforms;
    let finalPlatformFilters = [];
    
    // Map frontend platform names to backend database values
    const platformNameMap = {
      'ChatGPT': 'openai',
      'OpenAI': 'openai',
      'Claude': 'claude',
      'Gemini': 'gemini',
      'Perplexity': 'perplexity'
    };
    
    if (selectedPlatformFilters.length > 0 && !selectedPlatformFilters.includes('All Platforms')) {
      // Map frontend platform names to backend database values
      finalPlatformFilters = selectedPlatformFilters.map(p => platformNameMap[p] || p);
      filteredPlatforms = platforms.filter(platform => finalPlatformFilters.includes(platform.scopeValue));
      console.log('🔍 [DASHBOARD] Frontend platform filters:', selectedPlatformFilters);
      console.log('🔍 [DASHBOARD] Mapped to backend values:', finalPlatformFilters);
      console.log(`📊 [DASHBOARD] Filtered platforms:`, filteredPlatforms.length, 'out of', platforms.length);
    } else {
      // Show all platforms
      finalPlatformFilters = platforms.map(p => p.scopeValue);
      filteredPlatforms = platforms;
      console.log('🔍 [DASHBOARD] Using all platforms:', finalPlatformFilters);
    }

    // ✅ NEW: Recalculate overall metrics if filters are applied
    let filteredOverall = overall;
    
    // Check if any filters are active (topics, personas, or platforms)
    const hasTopicFilter = finalTopicFilters.length > 0 && finalTopicFilters.length < allTopics.length;
    const hasPersonaFilter = finalPersonaFilters.length > 0 && finalPersonaFilters.length < allPersonas.length;
    const hasPlatformFilter = filteredPlatforms.length < platforms.length;
    
    if (hasTopicFilter || hasPersonaFilter || hasPlatformFilter) {
      
      console.log('🔄 [DASHBOARD] Recalculating overall metrics based on filters...', {
        hasTopicFilter,
        hasPersonaFilter,
        hasPlatformFilter
      });
      
      // Import the metrics aggregation service
      const metricsAggregationService = require('../services/metricsAggregationService');
      
      // Collect all metrics that match the filters
      const metricsToAggregate = [];
      
      // Add filtered topic metrics
      if (hasTopicFilter && topics.length > 0) {
        metricsToAggregate.push(...topics);
      }
      
      // Add filtered persona metrics
      if (hasPersonaFilter && personas.length > 0) {
        metricsToAggregate.push(...personas);
      }
      
      // ✅ NEW: Add filtered platform metrics (important for platform filtering)
      if (hasPlatformFilter && filteredPlatforms.length > 0) {
        metricsToAggregate.push(...filteredPlatforms);
        console.log('🔍 [DASHBOARD] Adding platform metrics to aggregation:', filteredPlatforms.map(p => p.scopeValue));
      }
      
      if (metricsToAggregate.length > 0) {
        // Aggregate the filtered metrics using the same logic as frontend
        // ✅ FIX: Pass userId and urlAnalysisId to filter to only selected competitors
        filteredOverall = await aggregateFilteredMetrics(metricsToAggregate, overall, userBrandName, userId, currentUrlAnalysisId);
        console.log('✅ [DASHBOARD] Overall metrics recalculated based on filters');
      }
    }

    res.json({
      success: true,
      data: {
        // ✅ Meta for triggering insights
        currentUrlAnalysisId,
        brandName: userBrandName,

        // ✅ Overall visibility-like data (already formatted)
        overall: filteredOverall,
        platforms: filteredPlatforms.map(p => ({
          scope: p.scope,
          scopeValue: p.scopeValue,
          brandMetrics: p.brandMetrics,
          lastCalculated: p.lastCalculated
        })),
        topics: topics,
        personas: personas,
        
        // ✅ NEW: Frontend-compatible data structure (using filtered overall)
        // ✅ FIX: Fetch competitor URLs once and pass to all formatting functions (including user's brand URL)
        metrics: await (async () => {
          const brandNames = filteredOverall?.brandMetrics?.map(b => b.brandName).filter(Boolean) || [];
          const competitorUrlMap = await getCompetitorUrlMap(userId, currentUrlAnalysisId, brandNames, userBrandName, userBrandUrl);
          
          return {
            visibilityScore: await formatVisibilityData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap),
            depthOfMention: await formatDepthData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap),
            averagePosition: await formatAveragePositionData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap),
            topicRankings: await formatTopicRankings(topics, userBrandName, userId, currentUrlAnalysisId, userBrandUrl), // ✅ FIX: Added await and missing params
            personaRankings: await formatPersonaRankings(personas, userBrandName, userId, currentUrlAnalysisId, userBrandUrl), // ✅ FIX: Added await and missing params
            performanceInsights: formatPerformanceInsights(filteredOverall, userBrandName),
            competitors: await formatCompetitorsData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, userBrandUrl),
            // ✅ NEW: Citation-specific data structure for Citations tab
            competitorsByCitation: await formatCompetitorsByCitationData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, userBrandUrl),
            // ✅ NEW: Citation share formatted data (similar to visibilityScore) for consistent fallback
            citationShare: await formatCitationShareData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap)
          };
        })(),
        
        // ✅ Keep backward compatibility (using filtered overall)
        // ✅ FIX: Fetch URLs for backward compatibility fields too (including user's brand URL)
        visibility: await (async () => {
          const brandNames = filteredOverall?.brandMetrics?.map(b => b.brandName).filter(Boolean) || [];
          const competitorUrlMap = await getCompetitorUrlMap(userId, currentUrlAnalysisId, brandNames, userBrandName, userBrandUrl);
          return await formatVisibilityData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap);
        })(),
        depthOfMention: await (async () => {
          const brandNames = filteredOverall?.brandMetrics?.map(b => b.brandName).filter(Boolean) || [];
          const competitorUrlMap = await getCompetitorUrlMap(userId, currentUrlAnalysisId, brandNames, userBrandName, userBrandUrl);
          return await formatDepthData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap);
        })(),
        averagePosition: await (async () => {
          const brandNames = filteredOverall?.brandMetrics?.map(b => b.brandName).filter(Boolean) || [];
          const competitorUrlMap = await getCompetitorUrlMap(userId, currentUrlAnalysisId, brandNames, userBrandName, userBrandUrl);
          return await formatAveragePositionData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, competitorUrlMap);
        })(),
        topicRankings: await formatTopicRankings(topics, userBrandName, userId, currentUrlAnalysisId, userBrandUrl),
        personaRankings: await formatPersonaRankings(personas, userBrandName, userId, currentUrlAnalysisId, userBrandUrl),
        performanceInsights: formatPerformanceInsights(filteredOverall, userBrandName),
        competitors: await formatCompetitorsData(filteredOverall, userBrandName, userId, currentUrlAnalysisId, userBrandUrl),
        
        // Platform-level data (formatted) - using filtered platforms
        platforms: filteredPlatforms.map(p => {
          // Map backend DB values to frontend display names
          const platformNameMap = {
            'openai': 'ChatGPT',
            'claude': 'Claude',
            'gemini': 'Gemini',
            'perplexity': 'Perplexity'
          };
          
          return {
            platform: platformNameMap[p.scopeValue] || p.scopeValue,
            visibility: formatVisibilityData(p, userBrandName),
            depth: formatDepthData(p, userBrandName)
          };
        }),
        
        // ✅ Raw platform data for citation analysis - using filtered platforms
        platformMetrics: filteredPlatforms,
        
        lastUpdated: filteredOverall?.lastCalculated || new Date()
      }
    });

  } catch (error) {
    console.error('❌ Get all dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

// ============================================================================
// Helper Functions for Data Formatting
// ============================================================================


/**
 * Format visibility score data for frontend
 */
async function formatVisibilityData(metrics, userBrandName, userId = null, urlAnalysisId = null, competitorUrlMap = null) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatVisibilityData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  // ✅ Find user's brand using isOwner flag from aggregated metrics (priority), then fallback to name match
  const userBrand = metrics.brandMetrics.find(b => b.isOwner === true) || 
                    metrics.brandMetrics.find(b => b.brandName === userBrandName) || 
                    metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.visibilityScore === 'undefined') {
    console.log('⚠️ [formatVisibilityData] User brand not found or missing visibilityScore:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      visibilityScore: userBrand?.visibilityScore
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.visibilityRank || 0) - (b.visibilityRank || 0));

  // ✅ FIX: Fetch URLs if not provided (include userBrandName and userBrandUrl for user's brand)
  let urlMap = competitorUrlMap;
  if (!urlMap && userId) {
    const brandNames = sortedBrands.map(b => b.brandName).filter(Boolean);
    // ✅ FIX: Get user's brand URL from UrlAnalysis if not provided
    let userBrandUrl = null;
    if (urlAnalysisId) {
      const UrlAnalysis = require('../models/UrlAnalysis');
      const analysis = await UrlAnalysis.findById(urlAnalysisId).lean();
      userBrandUrl = analysis?.url || null;
    }
    urlMap = await getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName, userBrandUrl);
  }

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.visibilityScore || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => {
      const brandName = b.brandName || 'Unknown';
      const url = urlMap?.get(brandName) || null;
      
      // ✅ DEBUG: Log if URL is missing
      if (!url) {
        console.warn(`⚠️ [formatVisibilityData] No URL found for brand: ${brandName}`, {
          brandName,
          urlMapSize: urlMap?.size || 0,
          urlMapKeys: urlMap ? Array.from(urlMap.keys()).slice(0, 10) : []
        });
      }
      
      return {
        name: brandName,
        value: b.visibilityScore || 0,
        fill: getColorForBrand(brandName),
        // ✅ FIX: Include URL for favicon display in charts
        url: url
      };
    }),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.visibilityScore || 0,
      rank: userBrand.visibilityRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.visibilityScore || 0,
      rank: b.visibilityRank || 0,
      // ✅ FIX: Include URL for favicon display
      url: urlMap?.get(b.brandName || 'Unknown') || null,
      // ✅ Use isOwner from aggregated metrics (already set correctly) instead of name comparison
      isOwner: b.isOwner !== undefined ? b.isOwner : (b.brandName === userBrandName),
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format citation share data for frontend (similar to formatVisibilityData)
 */
async function formatCitationShareData(metrics, userBrandName, userId = null, urlAnalysisId = null, competitorUrlMap = null) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatCitationShareData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  // ✅ Find user's brand using isOwner flag from aggregated metrics
  const userBrand = metrics.brandMetrics.find(b => b.isOwner === true) || 
                    metrics.brandMetrics.find(b => b.brandName === userBrandName) || 
                    metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.citationShare === 'undefined') {
    console.log('⚠️ [formatCitationShareData] User brand not found or missing citationShare:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      citationShare: userBrand?.citationShare
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by citation share rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.citationShareRank || 0) - (b.citationShareRank || 0));

  // ✅ FIX: Fetch URLs if not provided (include userBrandName and userBrandUrl for user's brand)
  let urlMap = competitorUrlMap;
  if (!urlMap && userId) {
    const brandNames = sortedBrands.map(b => b.brandName).filter(Boolean);
    // ✅ FIX: Get user's brand URL from UrlAnalysis if not provided
    let userBrandUrl = null;
    if (urlAnalysisId) {
      const UrlAnalysis = require('../models/UrlAnalysis');
      const analysis = await UrlAnalysis.findById(urlAnalysisId).lean();
      userBrandUrl = analysis?.url || null;
    }
    urlMap = await getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName, userBrandUrl);
  }

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.citationShare || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      value: b.citationShare || 0,
      fill: getColorForBrand(b.brandName),
      // ✅ FIX: Include URL for favicon display in charts
      url: urlMap?.get(b.brandName || 'Unknown') || null
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.citationShare || 0,
      rank: userBrand.citationShareRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.citationShare || 0,
      rank: b.citationShareRank || 0,
      // ✅ FIX: Include URL for favicon display
      url: urlMap?.get(b.brandName || 'Unknown') || null,
      // ✅ Use isOwner from aggregated metrics (already set correctly) instead of name comparison
      isOwner: b.isOwner !== undefined ? b.isOwner : (b.brandName === userBrandName),
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format depth of mention data for frontend
 */
async function formatDepthData(metrics, userBrandName, userId = null, urlAnalysisId = null, competitorUrlMap = null) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatDepthData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  // ✅ Find user's brand using isOwner flag from aggregated metrics (priority), then fallback to name match
  const userBrand = metrics.brandMetrics.find(b => b.isOwner === true) || 
                    metrics.brandMetrics.find(b => b.brandName === userBrandName) || 
                    metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.depthOfMention === 'undefined') {
    console.log('⚠️ [formatDepthData] User brand not found or missing depthOfMention:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      depthOfMention: userBrand?.depthOfMention
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.depthRank || 0) - (b.depthRank || 0));

  // ✅ FIX: Fetch URLs if not provided (include userBrandName and userBrandUrl for user's brand)
  let urlMap = competitorUrlMap;
  if (!urlMap && userId) {
    const brandNames = sortedBrands.map(b => b.brandName).filter(Boolean);
    // ✅ FIX: Get user's brand URL from UrlAnalysis if not provided
    let userBrandUrl = null;
    if (urlAnalysisId) {
      const UrlAnalysis = require('../models/UrlAnalysis');
      const analysis = await UrlAnalysis.findById(urlAnalysisId).lean();
      userBrandUrl = analysis?.url || null;
    }
    urlMap = await getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName, userBrandUrl);
  }

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.depthOfMention || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => {
      const brandName = b.brandName || 'Unknown';
      const url = urlMap?.get(brandName) || null;
      
      // ✅ DEBUG: Log if URL is missing
      if (!url) {
        console.warn(`⚠️ [formatDepthData] No URL found for brand: ${brandName}`, {
          brandName,
          urlMapSize: urlMap?.size || 0,
          urlMapKeys: urlMap ? Array.from(urlMap.keys()).slice(0, 10) : [],
          availableBrands: sortedBrands.map(b => b.brandName).slice(0, 10)
        });
      }
      
      return {
        name: brandName,
        value: b.depthOfMention || 0,
        fill: getColorForBrand(brandName),
        // ✅ FIX: Include URL for favicon display in charts
        url: url
      };
    }),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.depthOfMention || 0,
      rank: userBrand.depthRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.depthOfMention || 0,
      rank: b.depthRank || 0,
      // ✅ FIX: Include URL for favicon display
      url: urlMap?.get(b.brandName || 'Unknown') || null,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format average position data for frontend
 */
async function formatAveragePositionData(metrics, userBrandName, userId = null, urlAnalysisId = null, competitorUrlMap = null) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatAveragePositionData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  // ✅ Find user's brand using isOwner flag from aggregated metrics (priority), then fallback to name match
  const userBrand = metrics.brandMetrics.find(b => b.isOwner === true) || 
                    metrics.brandMetrics.find(b => b.brandName === userBrandName) || 
                    metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.avgPosition === 'undefined') {
    console.log('⚠️ [formatAveragePositionData] User brand not found or missing avgPosition:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      avgPosition: userBrand?.avgPosition
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.avgPositionRank || 0) - (b.avgPositionRank || 0));

  // ✅ FIX: Fetch URLs if not provided (include userBrandName and userBrandUrl for user's brand)
  let urlMap = competitorUrlMap;
  if (!urlMap && userId) {
    const brandNames = sortedBrands.map(b => b.brandName).filter(Boolean);
    // ✅ FIX: Get user's brand URL from UrlAnalysis if not provided
    let userBrandUrl = null;
    if (urlAnalysisId) {
      const UrlAnalysis = require('../models/UrlAnalysis');
      const analysis = await UrlAnalysis.findById(urlAnalysisId).lean();
      userBrandUrl = analysis?.url || null;
    }
    urlMap = await getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName, userBrandUrl);
  }

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.avgPosition || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => {
      const brandName = b.brandName || 'Unknown';
      const url = urlMap?.get(brandName) || null;
      
      // ✅ DEBUG: Log if URL is missing
      if (!url) {
        console.warn(`⚠️ [formatAveragePositionData] No URL found for brand: ${brandName}`, {
          brandName,
          urlMapSize: urlMap?.size || 0,
          urlMapKeys: urlMap ? Array.from(urlMap.keys()).slice(0, 10) : []
        });
      }
      
      return {
        name: brandName,
        value: b.avgPosition || 0,
        fill: getColorForBrand(brandName),
        // ✅ FIX: Include URL for favicon display in charts
        url: url
      };
    }),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.avgPosition || 0,
      rank: userBrand.avgPositionRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.avgPosition || 0,
      rank: b.avgPositionRank || 0,
      // ✅ FIX: Include URL for favicon display
      url: urlMap?.get(b.brandName || 'Unknown') || null,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format topic rankings for frontend
 */
async function formatTopicRankings(topicMetrics, userBrandName, userId, urlAnalysisId, userBrandUrl = null) {
  if (!topicMetrics || topicMetrics.length === 0) {
    console.log('⚠️ [formatTopicRankings] No topic metrics provided');
    return [];
  }

  console.log(`🔍 [formatTopicRankings] Processing ${topicMetrics.length} topic metrics`);
  
  // ✅ REMOVED: Name-based filtering - metrics are already filtered by urlAnalysisId during calculation
  // All brandMetrics in the database should already only contain:
  // 1. User's brand (isOwner: true)
  // 2. Selected competitors for this urlAnalysisId

  // ✅ FIX: Fetch URLs once for all topics
  const allBrandNames = new Set();
  topicMetrics.forEach(topic => {
    if (topic.brandMetrics) {
      topic.brandMetrics.forEach(b => allBrandNames.add(b.brandName));
    }
  });
  const competitorUrlMap = await getCompetitorUrlMap(userId, urlAnalysisId, Array.from(allBrandNames), userBrandName, userBrandUrl);

  const results = topicMetrics.map(topic => {
    if (!topic.brandMetrics || topic.brandMetrics.length === 0) {
      console.log(`⚠️ [formatTopicRankings] Topic "${topic.scopeValue}" has no brandMetrics`);
      return null;
    }

    // ✅ Use brandMetrics directly - already filtered correctly by urlAnalysisId
    const filteredBrandMetrics = topic.brandMetrics;

    console.log(`🔍 [formatTopicRankings] Topic "${topic.scopeValue}": ${filteredBrandMetrics.length} brands`);

    // ✅ FIX: Calculate ranks based on visibility scores WITHIN this topic (not overall ranks)
    // Sort by visibility score (higher is better) and assign ranks
    const sortedByScore = [...filteredBrandMetrics].sort((a, b) => {
      const scoreA = a.visibilityScore || 0;
      const scoreB = b.visibilityScore || 0;
      return scoreB - scoreA; // Descending: higher scores first
    });

    const userBrand = filteredBrandMetrics.find(b => b.isOwner === true) || 
                      filteredBrandMetrics.find(b => b.brandName === userBrandName);
    // Calculate user's rank within this topic
    const yourRank = userBrand ? sortedByScore.findIndex(b => b.brandName === userBrand.brandName) + 1 : 999;
    
    // Determine status
    let status, statusColor;
    if (yourRank === 1) {
      status = 'Leader';
      statusColor = 'green';
    } else if (yourRank <= 3) {
      status = 'Strong';
      statusColor = 'yellow';
    } else {
      status = 'Needs work';
      statusColor = 'red';
    }
    
    const rankings = sortedByScore
      .slice(0, 5) // Show top 5
      .map((b, index) => ({
        rank: index + 1, // Re-assign rank based on sorted order within this topic
        name: b.brandName,
        score: b.visibilityScore || 0,
        // ✅ FIX: Include URL for favicon display
        url: competitorUrlMap.get(b.brandName) || null,
        isOwner: b.isOwner !== undefined ? b.isOwner : (b.brandName === userBrandName)
      }));

    return {
      topic: topic.scopeValue,
      status,
      statusColor,
      yourRank,
      yourScore: userBrand?.visibilityScore || 0,
      rankings: rankings
    };
  }).filter(result => result !== null); // Remove null results

  console.log(`✅ [formatTopicRankings] Returning ${results.length} topic rankings`);
  return results;
}

/**
 * Format persona rankings for frontend
 */
async function formatPersonaRankings(personaMetrics, userBrandName, userId, urlAnalysisId, userBrandUrl = null) {
  if (!personaMetrics || personaMetrics.length === 0) {
    console.log('⚠️ [formatPersonaRankings] No persona metrics provided');
    return [];
  }

  console.log(`🔍 [formatPersonaRankings] Processing ${personaMetrics.length} persona metrics`);
  
  // ✅ REMOVED: Name-based filtering - metrics are already filtered by urlAnalysisId during calculation
  // All brandMetrics in the database should already only contain:
  // 1. User's brand (isOwner: true)
  // 2. Selected competitors for this urlAnalysisId

  // ✅ FIX: Fetch URLs once for all personas
  const allBrandNames = new Set();
  personaMetrics.forEach(persona => {
    if (persona.brandMetrics) {
      persona.brandMetrics.forEach(b => allBrandNames.add(b.brandName));
    }
  });
  const competitorUrlMap = await getCompetitorUrlMap(userId, urlAnalysisId, Array.from(allBrandNames), userBrandName, userBrandUrl);

  const results = personaMetrics.map(persona => {
    if (!persona.brandMetrics || persona.brandMetrics.length === 0) {
      console.log(`⚠️ [formatPersonaRankings] Persona "${persona.scopeValue}" has no brandMetrics`);
      return null;
    }

    // ✅ Use brandMetrics directly - already filtered correctly by urlAnalysisId
    const filteredBrandMetrics = persona.brandMetrics;

    console.log(`🔍 [formatPersonaRankings] Persona "${persona.scopeValue}": ${filteredBrandMetrics.length} brands`);

    // ✅ FIX: Calculate ranks based on visibility scores WITHIN this persona (not overall ranks)
    // Sort by visibility score (higher is better) and assign ranks
    const sortedByScore = [...filteredBrandMetrics].sort((a, b) => {
      const scoreA = a.visibilityScore || 0;
      const scoreB = b.visibilityScore || 0;
      return scoreB - scoreA; // Descending: higher scores first
    });

    const userBrand = filteredBrandMetrics.find(b => b.isOwner === true) || 
                      filteredBrandMetrics.find(b => b.brandName === userBrandName);
    // Calculate user's rank within this persona
    const yourRank = userBrand ? sortedByScore.findIndex(b => b.brandName === userBrand.brandName) + 1 : 999;
    
    // Determine status
    let status, statusColor;
    if (yourRank === 1) {
      status = 'Leader';
      statusColor = 'green';
    } else {
      status = 'Needs work';
      statusColor = 'red';
    }
    
    const rankings = sortedByScore
      .slice(0, 5) // Show top 5
      .map((b, index) => ({
        rank: index + 1, // Re-assign rank based on sorted order within this persona
        name: b.brandName,
        score: b.visibilityScore || 0,
        // ✅ FIX: Include URL for favicon display
        url: competitorUrlMap.get(b.brandName) || null,
        isOwner: b.isOwner !== undefined ? b.isOwner : (b.brandName === userBrandName)
      }));

    return {
      persona: persona.scopeValue,
      status,
      statusColor,
      yourRank,
      yourScore: userBrand?.visibilityScore || 0,
      rankings: rankings
    };
  }).filter(result => result !== null); // Remove null results

  console.log(`✅ [formatPersonaRankings] Returning ${results.length} persona rankings`);
  return results;
}

/**
 * Format performance insights (Share of Voice + Position Distribution)
 */
function formatPerformanceInsights(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatPerformanceInsights] No metrics or brand metrics found');
    return {
      shareOfVoice: {
        current: { percentage: 0, rank: 0 },
        brands: []
      },
      positionDistribution: {
        current: { firstRank: 0, secondRank: 0, thirdRank: 0, otherRank: 0 },
        brands: []
      }
    };
  }

  // ✅ Find user's brand using isOwner flag from aggregated metrics (priority), then fallback to name match
  const userBrand = metrics.brandMetrics.find(b => b.isOwner === true) || 
                    metrics.brandMetrics.find(b => b.brandName === userBrandName) || 
                    metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand) {
    console.log('⚠️ [formatPerformanceInsights] User brand not found:', {
      userBrandName,
      availableBrands: metrics.brandMetrics.map(b => b.brandName)
    });
    return {
      shareOfVoice: {
        current: { percentage: 0, rank: 0 },
        brands: []
      },
      positionDistribution: {
        current: { firstRank: 0, secondRank: 0, thirdRank: 0, otherRank: 0 },
        brands: []
      }
    };
  }
  
  // Calculate position distribution percentages
  const totalAppearances = (userBrand.count1st || 0) + (userBrand.count2nd || 0) + (userBrand.count3rd || 0) + (userBrand.countOther || 0);
  
  const positionDistribution = totalAppearances > 0 ? {
    firstRank: parseFloat((((userBrand.count1st || 0) / totalAppearances) * 100).toFixed(2)),
    secondRank: parseFloat((((userBrand.count2nd || 0) / totalAppearances) * 100).toFixed(2)),
    thirdRank: parseFloat((((userBrand.count3rd || 0) / totalAppearances) * 100).toFixed(2)),
    otherRank: parseFloat((((userBrand.countOther || 0) / totalAppearances) * 100).toFixed(2))
  } : {
    firstRank: 0,
    secondRank: 0,
    thirdRank: 0,
    otherRank: 0
  };

  return {
    shareOfVoice: {
      current: {
        percentage: userBrand.shareOfVoice || 0,
        rank: userBrand.shareOfVoiceRank || 0
      },
      brands: metrics.brandMetrics.map(b => ({
        name: b.brandName || 'Unknown',
        value: b.shareOfVoice || 0,
        rank: b.shareOfVoiceRank || 0,
        color: getColorForBrand(b.brandName),
        isOwner: b.brandName === userBrandName
      })).sort((a, b) => (a.rank || 0) - (b.rank || 0))
    },
    positionDistribution: {
      current: positionDistribution,
      brands: metrics.brandMetrics.map(b => {
        const total = b.count1st + b.count2nd + b.count3rd + (b.countOther || 0);
        return {
          name: b.brandName,
          count1st: b.count1st,
          count2nd: b.count2nd,
          count3rd: b.count3rd,
          firstRank: total > 0 ? parseFloat(((b.count1st / total) * 100).toFixed(2)) : 0,
          secondRank: total > 0 ? parseFloat(((b.count2nd / total) * 100).toFixed(2)) : 0,
          thirdRank: total > 0 ? parseFloat(((b.count3rd / total) * 100).toFixed(2)) : 0,
          rank1st: b.rank1st,
          rank2nd: b.rank2nd,
          rank3rd: b.rank3rd,
          color: getColorForBrand(b.brandName),
          isOwner: b.brandName === userBrandName
        };
      })
    }
  };
}

/**
 * Helper function to fetch competitor URLs in batch (including user's brand URL)
 * @param {string} userId - User ID
 * @param {string} urlAnalysisId - URL Analysis ID (optional)
 * @param {Array<string>} brandNames - Array of brand names to look up
 * @param {string} userBrandName - User's brand name (optional)
 * @param {string} userBrandUrl - User's brand URL from UrlAnalysis (optional)
 * @returns {Promise<Map<string, string>>} Map of brand name to URL
 */
async function getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName = null, userBrandUrl = null) {
  const urlMap = new Map();
  
  // ✅ FIX: Add user's brand URL first (like prompts.js does)
  if (userBrandName && userBrandUrl) {
    urlMap.set(userBrandName, userBrandUrl);
    console.log(`✅ [getCompetitorUrlMap] Added user's brand URL: ${userBrandName} -> ${userBrandUrl}`);
  }

  if (!brandNames || brandNames.length === 0) {
    return urlMap;
  }

  try {
    // ✅ FIX: Only fetch SELECTED competitors for this specific urlAnalysisId
    const query = {
      userId: userId,
      selected: true, // ✅ Only selected competitors
      name: { $in: brandNames }
    };
    
    // ✅ FIX: Filter by urlAnalysisId if provided
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }
    
    console.log('🔍 [getCompetitorUrlMap] Fetching selected competitors:', {
      userId,
      urlAnalysisId,
      brandNamesCount: brandNames.length,
      brandNames: brandNames.slice(0, 5), // Log first 5 for debugging
      query
    });
    
    const competitors = await Competitor.find(query).select('name url').lean();
    
    console.log(`🔍 [getCompetitorUrlMap] Found ${competitors.length} competitors in DB`);
    
    competitors.forEach(comp => {
      if (comp.url) {
        urlMap.set(comp.name, comp.url);
        console.log(`✅ [getCompetitorUrlMap] Added competitor URL: ${comp.name} -> ${comp.url}`);
      } else {
        console.log(`⚠️ [getCompetitorUrlMap] Competitor ${comp.name} has no URL`);
      }
    });

    // ✅ FIX: Also try fuzzy matching for brand names that don't match exactly
    // This handles cases where brand names in metrics might be longer (e.g., "HDFC Bank Platinum Debit Card" vs "HDFC Bank")
    const unmatchedBrands = brandNames.filter(brandName => !urlMap.has(brandName));
    if (unmatchedBrands.length > 0) {
      console.log(`🔍 [getCompetitorUrlMap] Trying fuzzy match for ${unmatchedBrands.length} unmatched brands:`, unmatchedBrands.slice(0, 5));
      
      // Try to find competitors where the brand name contains the competitor name or vice versa
      for (const brandName of unmatchedBrands) {
        // Try exact match first (case insensitive)
        const exactMatch = competitors.find(c => 
          c.name && brandName && 
          c.name.toLowerCase() === brandName.toLowerCase()
        );
        if (exactMatch && exactMatch.url) {
          urlMap.set(brandName, exactMatch.url);
          console.log(`✅ [getCompetitorUrlMap] Fuzzy matched (exact): ${brandName} -> ${exactMatch.name} -> ${exactMatch.url}`);
          continue;
        }
        
        // Try partial match (brand name contains competitor name or vice versa)
        const partialMatch = competitors.find(c => {
          if (!c.name || !brandName || !c.url) return false;
          const cNameLower = c.name.toLowerCase();
          const brandNameLower = brandName.toLowerCase();
          return brandNameLower.includes(cNameLower) || cNameLower.includes(brandNameLower);
        });
        if (partialMatch && partialMatch.url) {
          urlMap.set(brandName, partialMatch.url);
          console.log(`✅ [getCompetitorUrlMap] Fuzzy matched (partial): ${brandName} -> ${partialMatch.name} -> ${partialMatch.url}`);
        } else {
          console.log(`⚠️ [getCompetitorUrlMap] No match found for brand: ${brandName}`);
        }
      }
    }

    console.log(`✅ [getCompetitorUrlMap] Total URLs in map: ${urlMap.size} (requested ${brandNames.length} brands)`);
    console.log(`📊 [getCompetitorUrlMap] URL map contents:`, Array.from(urlMap.entries()).slice(0, 5));
    return urlMap;
  } catch (error) {
    console.error('⚠️ [getCompetitorUrlMap] Error fetching competitor URLs:', error);
    return urlMap; // Return map with at least user's brand URL if available
  }
}

/**
 * Format competitors data for frontend (matches Competitor interface)
 * Now includes URLs from Competitor model
 */
async function formatCompetitorsData(metrics, userBrandName, userId, urlAnalysisId, userBrandUrl = null) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatCompetitorsData] No metrics or brand metrics found');
    return [];
  }

  // ✅ REMOVED: Name-based filtering - metrics are already filtered by urlAnalysisId during calculation
  // All brandMetrics in the database should already only contain:
  // 1. User's brand (isOwner: true)
  // 2. Selected competitors for this urlAnalysisId

  // ✅ Use brandMetrics directly - already filtered correctly by urlAnalysisId
  const filteredBrandMetrics = metrics.brandMetrics;

  // Sort brands by visibility rank for consistent ordering
  const sortedBrands = filteredBrandMetrics
    .sort((a, b) => (a.visibilityRank || 0) - (b.visibilityRank || 0));

  // ✅ FIX: Batch fetch competitor URLs including user's brand URL (like prompts.js)
  const brandNames = sortedBrands.map(brand => brand.brandName || 'Unknown').filter(Boolean);
  const competitorUrlMap = await getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName, userBrandUrl);

  const competitors = sortedBrands.map((brand, index) => ({
    id: brand.brandId || `brand-${index}`,
    name: brand.brandName || 'Unknown',
    url: competitorUrlMap.get(brand.brandName || 'Unknown') || null, // Include URL from database
    logo: '', // Will be handled by frontend favicon logic
    score: brand.visibilityScore || 0,
    rank: brand.visibilityRank || 0,
    change: 0, // TODO: Calculate from historical data
    trend: 'stable', // TODO: Calculate from historical data
    // ✅ Use isOwner from aggregated metrics (already set correctly) instead of name comparison
    // This ensures consistency when brand names have special characters, whitespace, or capitalization differences
    isOwner: brand.isOwner !== undefined ? brand.isOwner : ((brand.brandName || 'Unknown') === userBrandName),
    // Sentiment data
    sentimentScore: brand.sentimentScore || 0,
    sentimentBreakdown: brand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 },
    // Citation data
    citationShare: brand.citationShare || 0,
    citationRank: brand.citationShareRank || 0,
    brandCitationsTotal: brand.brandCitationsTotal || 0,
    earnedCitationsTotal: brand.earnedCitationsTotal || 0,
    socialCitationsTotal: brand.socialCitationsTotal || 0,
    totalCitations: brand.totalCitations || 0
  }));
  
  // Debug log to verify isOwner is set correctly
  console.log('🔍 [formatCompetitorsData] User brand name:', userBrandName);
  console.log('🔍 [formatCompetitorsData] Competitors with isOwner:', competitors.map(c => ({ name: c.name, isOwner: c.isOwner })));
  
  return competitors;
}

/**
 * Format competitors data specifically for Citations tab (matches citations frontend expectations)
 * Now includes URLs from Competitor model
 */
async function formatCompetitorsByCitationData(metrics, userBrandName, userId, urlAnalysisId, userBrandUrl = null) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatCompetitorsByCitationData] No metrics or brand metrics found');
    return [];
  }

  // ✅ REMOVED: Name-based filtering - metrics are already filtered by urlAnalysisId during calculation
  // All brandMetrics in the database should already only contain:
  // 1. User's brand (isOwner: true)
  // 2. Selected competitors for this urlAnalysisId

  // ✅ Use brandMetrics directly - already filtered correctly by urlAnalysisId
  const filteredBrandMetrics = metrics.brandMetrics;

  // Sort brands by citation share rank for citation-specific ordering
  const sortedBrands = filteredBrandMetrics
    .sort((a, b) => (a.citationShareRank || 0) - (b.citationShareRank || 0));

  // ✅ FIX: Batch fetch competitor URLs including user's brand URL (like prompts.js)
  const brandNames = sortedBrands.map(brand => brand.brandName || 'Unknown').filter(Boolean);
  const competitorUrlMap = await getCompetitorUrlMap(userId, urlAnalysisId, brandNames, userBrandName, userBrandUrl);

  return sortedBrands.map((brand, index) => ({
    id: brand.brandId || `brand-${index}`,
    name: brand.brandName || 'Unknown',
    url: competitorUrlMap.get(brand.brandName || 'Unknown') || null, // Include URL from database
    // Citation-specific fields that frontend expects
    score: brand.citationShare || 0, // Frontend expects 'score' for citation share
    rank: brand.citationShareRank || 0,
    change: 0, // TODO: Calculate from historical data
    trend: 'stable', // TODO: Calculate from historical data
    // Citation breakdown data
    citationShare: brand.citationShare || 0,
    citationRank: brand.citationShareRank || 0,
    brandCitationsTotal: brand.brandCitationsTotal || 0,
    earnedCitationsTotal: brand.earnedCitationsTotal || 0,
    socialCitationsTotal: brand.socialCitationsTotal || 0,
    totalCitations: brand.totalCitations || 0,
    // Additional citation data
    // ✅ Use isOwner from aggregated metrics (already set correctly) instead of name comparison
    // This ensures consistency when brand names have special characters, whitespace, or capitalization differences
    isOwner: brand.isOwner !== undefined ? brand.isOwner : (brand.brandName === userBrandName)
  }));
}

/**
 * Get brand color based on name (matches frontend colors)
 */
function getColorForBrand(brandName) {
  const colorMap = {
    'JPMorgan Chase': '#3B82F6',
    'Bank of America': '#EF4444',
    'Wells Fargo': '#8B5CF6',
    'Citibank': '#06B6D4',
    'US Bank': '#10B981',
    'TechCorp': '#3B82F6',
    'DataFlow': '#EF4444',
    'CloudSync': '#8B5CF6',
    'SmartAI': '#06B6D4',
    'InnovateTech': '#10B981'
  };
  return colorMap[brandName] || '#9CA3AF';
}

/**
 * Aggregate multiple metric documents into one (backend version of frontend logic)
 * Combines metrics from multiple scopes (topics/personas) by averaging
 */
async function aggregateFilteredMetrics(metrics, fallback, userBrandName, userId = null, urlAnalysisId = null) {
  if (!metrics || metrics.length === 0) {
    return fallback;
  }

  console.log(`📊 [AGGREGATE] Combining ${metrics.length} metric documents`);

  // ✅ REMOVED: Name-based filtering - metrics are already filtered by urlAnalysisId during calculation
  // All brandMetrics in the database should already only contain:
  // 1. User's brand (isOwner: true)
  // 2. Selected competitors for this urlAnalysisId

  // Create a map to aggregate brand metrics
  const brandMap = new Map();

  // Aggregate each metric document
  metrics.forEach((metric, idx) => {
    console.log(`   Processing metric ${idx + 1}: scope=${metric.scope}, value=${metric.scopeValue}`);
    
    if (!metric.brandMetrics || !Array.isArray(metric.brandMetrics)) {
      console.log(`   ⚠️ No brandMetrics in document ${idx + 1}`);
      return;
    }

    metric.brandMetrics.forEach((brand) => {
      const key = brand.brandName;
      
      // ✅ Use brandMetrics directly - already filtered correctly by urlAnalysisId
      if (!brandMap.has(key)) {
        // Initialize with first occurrence
        brandMap.set(key, {
          brandId: brand.brandId || key,
          brandName: brand.brandName,
          isOwner: brand.isOwner !== undefined ? brand.isOwner : false, // Preserve isOwner flag
          visibilityScore: 0,
          visibilityRank: 0,
          totalMentions: 0,
          mentionRank: 0,
          shareOfVoice: 0,
          shareOfVoiceRank: 0,
          avgPosition: 0,
          avgPositionRank: 0,
          depthOfMention: 0,
          depthRank: 0,
          citationShare: 0,
          citationShareRank: 0,
          brandCitationsTotal: 0,
          earnedCitationsTotal: 0,
          socialCitationsTotal: 0,
          totalCitations: 0,
          sentimentScore: 0,
          sentimentBreakdown: {
            positive: 0,
            neutral: 0,
            negative: 0,
            mixed: 0
          },
          sentimentShare: 0,
          count1st: 0,
          count2nd: 0,
          count3rd: 0,
          totalAppearances: 0,
          _count: 0 // Track how many metrics we're averaging
        });
      }

      const existing = brandMap.get(key);
      
      // Preserve isOwner flag if any occurrence has it set to true
      if (brand.isOwner === true) {
        existing.isOwner = true;
      }
      
      // Sum up all metrics (we'll average later)
      existing.visibilityScore += brand.visibilityScore || 0;
      existing.totalMentions += brand.totalMentions || 0;
      existing.shareOfVoice += brand.shareOfVoice || 0;
      existing.avgPosition += brand.avgPosition || 0;
      existing.depthOfMention += brand.depthOfMention || 0;
      existing.citationShare += brand.citationShare || 0;
      existing.brandCitationsTotal += brand.brandCitationsTotal || 0;
      existing.earnedCitationsTotal += brand.earnedCitationsTotal || 0;
      existing.socialCitationsTotal += brand.socialCitationsTotal || 0;
      existing.totalCitations += brand.totalCitations || 0;
      existing.sentimentScore += brand.sentimentScore || 0;
      existing.sentimentShare += brand.sentimentShare || 0;
      existing.count1st += brand.count1st || 0;
      existing.count2nd += brand.count2nd || 0;
      existing.count3rd += brand.count3rd || 0;
      existing.totalAppearances += brand.totalAppearances || 0;
      
      // Aggregate sentiment breakdown
      if (brand.sentimentBreakdown) {
        existing.sentimentBreakdown.positive += brand.sentimentBreakdown.positive || 0;
        existing.sentimentBreakdown.neutral += brand.sentimentBreakdown.neutral || 0;
        existing.sentimentBreakdown.negative += brand.sentimentBreakdown.negative || 0;
        existing.sentimentBreakdown.mixed += brand.sentimentBreakdown.mixed || 0;
      }
      
      existing._count++;
    });
  });

  // Convert map to array and calculate averages
  const aggregatedBrandMetrics = Array.from(brandMap.values()).map((brand) => {
    const count = brand._count;
    
    return {
      brandId: brand.brandId,
      brandName: brand.brandName,
      visibilityScore: count > 0 ? parseFloat((brand.visibilityScore / count).toFixed(2)) : 0,
      visibilityRank: 0, // Will be calculated after sorting
      totalMentions: brand.totalMentions, // Sum, not average
      mentionRank: 0, // Will be calculated after sorting
      shareOfVoice: count > 0 ? parseFloat((brand.shareOfVoice / count).toFixed(2)) : 0,
      shareOfVoiceRank: 0, // Will be calculated after sorting
      avgPosition: count > 0 ? parseFloat((brand.avgPosition / count).toFixed(2)) : 0,
      avgPositionRank: 0, // Will be calculated after sorting
      depthOfMention: count > 0 ? parseFloat((brand.depthOfMention / count).toFixed(4)) : 0,
      depthRank: 0, // Will be calculated after sorting
      citationShare: count > 0 ? parseFloat((brand.citationShare / count).toFixed(2)) : 0,
      citationShareRank: 0, // Will be calculated after sorting
      brandCitationsTotal: brand.brandCitationsTotal, // Sum, not average
      earnedCitationsTotal: brand.earnedCitationsTotal, // Sum, not average
      socialCitationsTotal: brand.socialCitationsTotal, // Sum, not average
      totalCitations: brand.totalCitations, // Sum, not average
      sentimentScore: count > 0 ? parseFloat((brand.sentimentScore / count).toFixed(2)) : 0,
      sentimentBreakdown: {
        positive: count > 0 ? parseFloat((brand.sentimentBreakdown.positive / count).toFixed(2)) : 0,
        neutral: count > 0 ? parseFloat((brand.sentimentBreakdown.neutral / count).toFixed(2)) : 0,
        negative: count > 0 ? parseFloat((brand.sentimentBreakdown.negative / count).toFixed(2)) : 0,
        mixed: count > 0 ? parseFloat((brand.sentimentBreakdown.mixed / count).toFixed(2)) : 0
      },
      sentimentShare: count > 0 ? parseFloat((brand.sentimentShare / count).toFixed(2)) : 0,
      count1st: brand.count1st, // Sum, not average
      count2nd: brand.count2nd, // Sum, not average
      count3rd: brand.count3rd, // Sum, not average
      totalAppearances: brand.totalAppearances, // Sum, not average
      isOwner: brand.isOwner // Preserve isOwner flag if it exists
    };
  });

  // ✅ FIX: Calculate ranks properly for all metrics using the same logic as assignRanksByMetric
  // Helper function to assign ranks with tie handling
  const assignRanks = (brands, metricKey, rankKey, higherIsBetter) => {
    const sorted = [...brands].sort((a, b) => {
      const aVal = a[metricKey] || 0;
      const bVal = b[metricKey] || 0;
      return higherIsBetter ? bVal - aVal : aVal - bVal;
    });

    let currentRank = 1;
    sorted.forEach((sortedBrand, index) => {
      if (index > 0) {
        const prevValue = sorted[index - 1][metricKey] || 0;
        const currValue = sortedBrand[metricKey] || 0;
        if (prevValue !== currValue) {
          currentRank = index + 1;
        }
      }
      sortedBrand[rankKey] = currentRank;
    });
  };

  // Calculate ranks for all metrics
  assignRanks(aggregatedBrandMetrics, 'visibilityScore', 'visibilityRank', true);
  assignRanks(aggregatedBrandMetrics, 'totalMentions', 'mentionRank', true);
  assignRanks(aggregatedBrandMetrics, 'shareOfVoice', 'shareOfVoiceRank', true);
  assignRanks(aggregatedBrandMetrics, 'avgPosition', 'avgPositionRank', false); // Lower is better
  assignRanks(aggregatedBrandMetrics, 'depthOfMention', 'depthRank', true);
  assignRanks(aggregatedBrandMetrics, 'citationShare', 'citationShareRank', true);

  // Calculate total tests from all metrics
  const totalTests = metrics.reduce((sum, m) => sum + (m.totalResponses || m.totalTests || 0), 0);
  const totalBrands = aggregatedBrandMetrics.length;

  console.log(`✅ [AGGREGATE] Result: ${totalBrands} brands, ${totalTests} total tests`);

  // Return in the same format as backend metrics
  return {
    ...fallback,
    brandMetrics: aggregatedBrandMetrics,
    totalTests,
    totalResponses: totalTests,
    totalBrands,
    scope: 'filtered', // Mark as filtered
    lastCalculated: new Date()
  };
}

// Get real citation details for a specific brand and type
router.get('/citations/:brandName/:type', authenticateToken, async (req, res) => {
  try {
    const { brandName, type } = req.params;
    const { urlAnalysisId } = req.query; // ✅ FIX: Get urlAnalysisId from query params
    const userId = req.userId;

    console.log(`📊 [CITATION DETAILS] Fetching real citations for ${brandName} - ${type}`);

    // ✅ FIX: Filter by urlAnalysisId if provided to ensure data isolation
    const query = { userId };
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
      console.log(`🔍 [CITATION DETAILS] Filtering by urlAnalysisId: ${urlAnalysisId}`);
    } else {
      console.warn('⚠️ [CITATION DETAILS] No urlAnalysisId provided, may mix data from multiple analyses');
    }

    // Find all prompt tests for the user (filtered by urlAnalysisId)
    const promptTests = await PromptTest.find(query)
      .populate('promptId')
      .populate('topicId')
      .populate('personaId')
      .lean();

    const citationMap = new Map();

    // Helper function to extract URLs from raw response
    // ✅ FIX: Improved URL regex that captures full URLs including paths, not truncating
    const extractUrlsFromResponse = (rawResponse) => {
      // Pattern: http(s):// followed by non-whitespace characters, stopping at whitespace, closing parens/brackets
      // Captures full URLs including paths with special characters
      const urlRegex = /https?:\/\/[^\s\)\]\}]+(?:\/[^\s\)\]\}]*)*/g;
      const urls = rawResponse.match(urlRegex) || [];
      // Clean up URLs by removing trailing punctuation that may have been captured
      return urls.map(url => {
        // Remove trailing punctuation: ), ], }, ., ,, ;, !, ? but preserve URL structure
        return url.replace(/[)\],;.!?]+$/, '').trim();
      }).filter(url => url.length > 0);
    };

    // Helper function to map citation references to URLs
    const mapCitationRefToUrl = (rawResponse, citationRef) => {
      // Clean up URL if it's already a URL
      if (citationRef && citationRef.startsWith('http')) {
        return citationRef.replace(/[\)\]\}]+$/, ''); // Remove trailing punctuation
      }
      
      // Try to extract citation number from reference like "citation_2"
      const match = citationRef?.match(/citation_(\d+)/);
      if (match) {
        const citationNum = parseInt(match[1]);
        const urls = extractUrlsFromResponse(rawResponse);
        
        // Map citation number to URL index (citation_1 = first URL, citation_2 = second URL, etc.)
        if (citationNum > 0 && citationNum <= urls.length) {
          return urls[citationNum - 1];
        }
      }
      
      // Fallback to original reference
      return citationRef;
    };

    // Extract real citations from prompt tests and group by URL
    promptTests.forEach(test => {
      test.brandMetrics?.forEach(brandMetric => {
        if (brandMetric.brandName === brandName && brandMetric.citations) {
          brandMetric.citations.forEach(citation => {
            // Map citation types to match frontend expectations
            if ((type === 'Website' && citation.type === 'brand') ||
                (type === 'Blog' && citation.type === 'earned') ||
                (type === 'Social' && citation.type === 'social')) {
              
              // Map LLM provider to platform name
              const getPlatformName = (llmProvider, llmModel) => {
                if (llmProvider === 'openai') return 'OpenAI';
                if (llmProvider === 'claude') return 'Claude';
                if (llmProvider === 'perplexity') return 'Perplexity';
                if (llmProvider === 'gemini') return 'Gemini';
                return llmProvider || 'Unknown';
              };

              // Map citation reference to actual URL
              const actualUrl = mapCitationRefToUrl(test.rawResponse, citation.url);

              // Skip citations that couldn't be mapped to actual URLs
              if (!actualUrl || actualUrl.startsWith('citation_')) {
                return; // Skip this citation
              }

              const citationData = {
                id: `${test._id}-${citation._id}`,
                url: actualUrl,
                platform: getPlatformName(test.llmProvider, test.llmModel),
                context: citation.context,
                type: citation.type,
                promptId: test.promptId?._id || test.promptId,
                promptText: test.promptText || '',
                promptTitle: test.promptId?.title || 'Untitled Prompt',
                queryType: test.queryType || 'Unknown',
                topic: test.topicId?.name || 'Unknown',
                persona: test.personaId?.type || 'Unknown',
                testDate: test.createdAt,
                llmProvider: test.llmProvider,
                llmModel: test.llmModel
              };

              // Group by URL
              if (!citationMap.has(actualUrl)) {
                citationMap.set(actualUrl, {
                  url: actualUrl,
                  context: citation.context,
                  type: citation.type,
                  platforms: new Set(),
                  prompts: new Map() // Use Map to deduplicate by promptText
                });
              }

              const groupedCitation = citationMap.get(actualUrl);
              groupedCitation.platforms.add(citationData.platform);
              
              // Deduplicate prompts by promptText
              const promptKey = citationData.promptText;
              if (!groupedCitation.prompts.has(promptKey)) {
                groupedCitation.prompts.set(promptKey, {
                  promptText: citationData.promptText,
                  platforms: new Set()
                });
              }
              groupedCitation.prompts.get(promptKey).platforms.add(citationData.platform);
            }
          });
        }
      });
    });

    // Convert map to array and format platforms and prompts
    const citationDetails = Array.from(citationMap.values()).map(grouped => ({
      ...grouped,
      platforms: Array.from(grouped.platforms),
      prompts: Array.from(grouped.prompts.values()).map(prompt => ({
        ...prompt,
        platforms: Array.from(prompt.platforms)
      }))
    }));

    console.log(`✅ [CITATION DETAILS] Found ${citationDetails.length} real citations for ${brandName} - ${type}`);

    res.json({
      success: true,
      data: {
        brandName,
        type,
        details: citationDetails
      }
    });

  } catch (error) {
    console.error('❌ [CITATION DETAILS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch citation details',
      error: error.message
    });
  }
});

module.exports = router;

