const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const insightsService = require('../services/insightsService');
const router = express.Router();


const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/insights/generate
 * Generate insights for a specific tab
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { tabType = 'visibility', urlAnalysisId, forceRegenerate = false } = req.body;
    const userId = req.userId;

    console.log(`🧠 [Insights API] Generating ${tabType} insights for user ${userId}${forceRegenerate ? ' (FORCE REGENERATE)' : ''}`);

    // Check if insights already exist and are fresh (unless force regenerating)
    if (!forceRegenerate) {
      const existingInsights = await insightsService.getStoredInsights(userId, urlAnalysisId, tabType);
      if (existingInsights) {
        console.log(`✅ [Insights API] Returning cached insights for ${tabType}`);
        return res.json({
          success: true,
          data: existingInsights,
          cached: true,
          message: `Fresh ${tabType} insights retrieved from cache`
        });
      }
    } else {
      console.log(`🔄 [Insights API] Force regenerating ${tabType} insights - ignoring cache`);
    }

    // Generate new insights
    const insights = await insightsService.generateInsights(userId, urlAnalysisId, tabType);
    
    res.json({
      success: true,
      data: insights,
      cached: false,
      message: `${tabType} insights generated successfully${forceRegenerate ? ' (force regenerated)' : ''}`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error generating insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate insights'
    });
  }
});

/**
 * GET /api/insights/:tabType
 * Get stored insights for a specific tab
 */
router.get('/:tabType', authenticateToken, async (req, res) => {
  try {
    const { tabType } = req.params;
    const { urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`📭 [Insights API] Getting ${tabType} insights for user ${userId}`);

    const insights = await insightsService.getStoredInsights(userId, urlAnalysisId, tabType);
    
    if (!insights) {
      return res.status(404).json({
        success: false,
        message: `No insights found for ${tabType} tab. Generate insights first.`
      });
    }

    // Transform insights to include metric and value fields for frontend display
    const transformInsight = (insight) => ({
      description: insight.description,
      metric: insight.metric || null, // Include metric name for frontend display
      value: insight.value || null, // Include value for frontend display
      impact: insight.impact,
      recommendation: insight.recommendation
    });

    const transformedData = {
      whatsWorking: (insights.whatsWorking || []).map(transformInsight),
      needsAttention: (insights.needsAttention || []).map(transformInsight),
      performanceInsights: insights.performanceInsights || [],
      generatedAt: insights.generatedAt
    };

    res.json({
      success: true,
      data: transformedData,
      message: `${tabType} insights retrieved successfully`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error getting insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve insights'
    });
  }
});

/**
 * DELETE /api/insights/:tabType
 * Clear stored insights for a specific tab
 */
router.delete('/:tabType', authenticateToken, async (req, res) => {
  try {
    const { tabType } = req.params;
    const { urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`🗑️ [Insights API] Clearing ${tabType} insights for user ${userId}${urlAnalysisId ? ` (urlAnalysisId: ${urlAnalysisId})` : ''}`);

    const result = await insightsService.clearInsights(userId, urlAnalysisId, tabType);
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Cleared ${result.deletedCount} ${tabType} insights successfully`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error clearing insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to clear insights'
    });
  }
});

/**
 * DELETE /api/insights/clear/all
 * Clear ALL stored insights for all tabs for the authenticated user
 */
router.delete('/clear/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    console.log(`🗑️ [Insights API] Clearing ALL insights for user ${userId}`);

    const result = await insightsService.clearAllInsights(userId);
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Cleared ${result.deletedCount} insights across all tabs successfully`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error clearing all insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to clear all insights'
    });
  }
});

/**
 * GET /api/insights/test/data-collection
 * Test endpoint to see how data is structured for insights
 */
router.get('/test/data-collection', authenticateToken, async (req, res) => {
  try {
    const { tabType = 'visibility', urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`🧪 [Insights API] Testing data collection for ${tabType}`);

    // Collect structured data without generating insights
    const structuredData = await insightsService.collectTabData(userId, urlAnalysisId, tabType);
    
    res.json({
      success: true,
      data: structuredData,
      message: `Data collection test for ${tabType} completed`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error in data collection test:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Data collection test failed'
    });
  }
});

/**
 * GET /api/insights/test/prompt
 * Test endpoint to see the generated prompt
 */
router.get('/test/prompt', authenticateToken, async (req, res) => {
  try {
    const { tabType = 'visibility', urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`🧪 [Insights API] Testing prompt generation for ${tabType}`);

    // Collect data and generate prompt
    const structuredData = await insightsService.collectTabData(userId, urlAnalysisId, tabType);
    const prompt = insightsService.generatePrompt(structuredData, tabType);
    
    res.json({
      success: true,
      data: {
        structuredData: structuredData,
        prompt: prompt
      },
      message: `Prompt generation test for ${tabType} completed`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error in prompt test:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Prompt generation test failed'
    });
  }
});

module.exports = router;
