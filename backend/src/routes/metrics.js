const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const metricsAggregation = require('../services/metricsAggregationService');
const router = express.Router();


const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/metrics/calculate
 * Calculate and store aggregated metrics
 */
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📊 [API] POST /api/metrics/calculate');
    console.log(`👤 User: ${req.userId}`);
    console.log('='.repeat(70));

    const { dateFrom, dateTo, forceRefresh, urlAnalysisId } = req.body;

    const results = await metricsAggregation.calculateMetrics(req.userId, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      forceRefresh,
      urlAnalysisId: urlAnalysisId
    });

    res.json({
      success: true,
      message: `Calculated ${results.totalCalculations} metric sets`,
      data: results
    });

  } catch (error) {
    console.error('❌ [API ERROR] Calculate metrics failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate metrics'
    });
  }
});

/**
 * GET /api/metrics/aggregated
 * Get aggregated metrics by scope (overall, platform, topic, persona)
 */
router.get('/aggregated', authenticateToken, async (req, res) => {
  try {
    const { scope, dateFrom, dateTo, urlAnalysisId } = req.query;

    const query = {
      userId: req.userId
    };

    if (scope) {
      query.scope = scope;
    }

    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }

    if (dateFrom || dateTo) {
      query.dateFrom = { $gte: dateFrom ? new Date(dateFrom) : new Date(0) };
      query.dateTo = { $lte: dateTo ? new Date(dateTo) : new Date() };
    }

    const metrics = await AggregatedMetrics.find(query)
      .sort({ lastCalculated: -1 })
      .lean();

    if (!metrics || metrics.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No metrics found. Please run calculations first.'
      });
    }

    // If scope is specified, return single metric or array
    if (scope === 'overall') {
      const overallMetric = metrics.find(m => m.scope === 'overall');
      if (!overallMetric) {
        return res.status(404).json({
          success: false,
          message: 'No overall metrics found. Please run calculations first.'
        });
      }
      return res.json({
        success: true,
        data: overallMetric
      });
    } else {
      // Return array of metrics for the specified scope
      const scopedMetrics = metrics.filter(m => m.scope === scope);
      return res.json({
        success: true,
        data: scopedMetrics
      });
    }

  } catch (error) {
    console.error('❌ [API ERROR] Get aggregated metrics failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/metrics/overall
 * Get overall metrics (all prompts, all platforms)
 */
router.get('/overall', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const query = {
      userId: req.userId,
      scope: 'overall'
    };

    if (dateFrom || dateTo) {
      query.dateFrom = { $gte: dateFrom ? new Date(dateFrom) : new Date(0) };
      query.dateTo = { $lte: dateTo ? new Date(dateTo) : new Date() };
    }

    // ✅ FIX: Correct syntax - findOne doesn't support sort, use find().sort().limit(1)
    const metrics = await AggregatedMetrics.find(query)
      .sort({ lastCalculated: -1 })
      .limit(1)
      .lean()
      .then(results => results[0] || null);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'No metrics found. Please run calculations first.'
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get overall metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/metrics/platform/:platform
 * Get metrics for a specific platform (e.g., chatgpt, claude)
 */
router.get('/platform/:platform', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;

    const metrics = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'platform',
      scopeValue: platform
    })
    .sort({ lastCalculated: -1 })
    .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for platform: ${platform}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get platform metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform metrics'
    });
  }
});

/**
 * GET /api/metrics/topic/:topic
 * Get metrics for a specific topic
 */
router.get('/topic/:topic', authenticateToken, async (req, res) => {
  try {
    const { topic } = req.params;

    const metrics = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'topic',
      scopeValue: topic
    })
    .sort({ lastCalculated: -1 })
    .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for topic: ${topic}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get topic metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topic metrics'
    });
  }
});

/**
 * GET /api/metrics/persona/:persona
 * Get metrics for a specific persona
 */
router.get('/persona/:persona', authenticateToken, async (req, res) => {
  try {
    const { persona } = req.params;

    const metrics = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'persona',
      scopeValue: persona
    })
    .sort({ lastCalculated: -1 })
    .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for persona: ${persona}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get persona metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get persona metrics'
    });
  }
});

/**
 * GET /api/metrics/analyses
 * Get list of all analyses (URL analyses) for the user
 */
router.get('/analyses', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all URL analyses for the user
    const UrlAnalysis = require('../models/UrlAnalysis');
    const analyses = await UrlAnalysis.find({ userId })
      .select('url domain createdAt updatedAt status brandContext')
      .sort({ createdAt: -1 })
      .lean();

    // For each analysis, get the latest metrics to show summary
    const analysesWithMetrics = await Promise.all(
      analyses.map(async (analysis) => {
        // First try to find metrics with specific urlAnalysisId
        let latestMetrics = await AggregatedMetrics.findOne({
          userId,
          urlAnalysisId: analysis._id,
          scope: 'overall'
        })
        .sort({ lastCalculated: -1 })
        .lean();

        // If no metrics found with urlAnalysisId, check for metrics without urlAnalysisId
        // (This handles the case where metrics were created before urlAnalysisId was properly set)
        if (!latestMetrics) {
          latestMetrics = await AggregatedMetrics.findOne({
            userId,
            urlAnalysisId: null, // Metrics without urlAnalysisId
            scope: 'overall'
          })
          .sort({ lastCalculated: -1 })
          .lean();
        }

        // Extract brand name from URL analysis
        const brandName = analysis.brandContext?.companyName || analysis.domain;

        return {
          id: analysis._id,
          url: analysis.url,
          domain: analysis.domain,
          brandName: brandName,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt,
          status: analysis.status,
          hasData: !!latestMetrics,
          totalPrompts: latestMetrics?.totalPrompts || 0,
          totalResponses: latestMetrics?.totalResponses || 0,
          totalBrands: latestMetrics?.brandMetrics?.length || 0,
          lastCalculated: latestMetrics?.lastCalculated || null
        };
      })
    );

    res.json({
      success: true,
      data: analysesWithMetrics
    });

  } catch (error) {
    console.error('❌ Get analyses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analyses'
    });
  }
});


module.exports = router;
