const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const subjectiveMetricsService = require('../services/subjectiveMetricsService');
const SubjectiveMetrics = require('../models/SubjectiveMetrics');
const PromptTest = require('../models/PromptTest');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/subjective-metrics/evaluate
 * Generate subjective metrics for a prompt across ALL platforms
 */
router.post('/evaluate',
  authenticateToken,
  [
    body('promptId').notEmpty().withMessage('promptId is required'),
    body('brandName').notEmpty().withMessage('brandName is required')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { promptId, brandName } = req.body;

      console.log('\n' + '='.repeat(70));
      console.log('📊 [API] POST /api/subjective-metrics/evaluate');
      console.log(`   User: ${req.userId}`);
      console.log(`   Prompt: ${promptId}`);
      console.log(`   Brand: ${brandName}`);
      console.log('='.repeat(70));

      // Verify prompt belongs to user
      const Prompt = require('../models/Prompt');
      const prompt = await Prompt.findOne({
        _id: promptId,
        userId: req.userId
      });

      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: 'Prompt not found or unauthorized'
        });
      }

      // ✅ FIX: Add userId filter for security - ensure user can only see their own metrics
      const existingMetrics = await SubjectiveMetrics.findOne({
        promptId,
        brandName,
        userId: req.userId
      });

      if (existingMetrics) {
        console.log('ℹ️  Metrics already exist, returning cached');
        return res.json({
          success: true,
          data: {
            subjectiveMetricsId: existingMetrics._id,
            metrics: existingMetrics,
            cached: true
          },
          message: 'Metrics already evaluated'
        });
      }

      // Evaluate metrics across ALL platform responses
      const metrics = await subjectiveMetricsService.evaluateMetrics(
        promptId,
        brandName,
        req.userId
      );

      console.log(`✅ [API] Evaluation successful`);

      res.json({
        success: true,
        data: {
          subjectiveMetricsId: metrics._id,
          metrics,
          cached: false
        },
        message: 'Metrics evaluated successfully'
      });

    } catch (error) {
      console.error('❌ [API ERROR] Subjective metrics evaluation failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to evaluate metrics'
      });
    }
  }
);

/**
 * GET /api/subjective-metrics/:promptId
 * Get existing subjective metrics for a prompt
 */
router.get('/:promptId',
  authenticateToken,
  async (req, res) => {
    try {
      const { promptId } = req.params;
      const { brandName } = req.query;

      // Verify prompt belongs to user
      const Prompt = require('../models/Prompt');
      const prompt = await Prompt.findOne({
        _id: promptId,
        userId: req.userId
      });

      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: 'Prompt not found or unauthorized'
        });
      }

      let query = { promptId };
      if (brandName) {
        query.brandName = brandName;
      }

      const metrics = await SubjectiveMetrics.find(query)
        .sort({ evaluatedAt: -1 });

      if (metrics.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No metrics found for this prompt'
        });
      }

      res.json({
        success: true,
        data: {
          metrics,
          lastEvaluated: metrics[0].evaluatedAt
        }
      });

    } catch (error) {
      console.error('❌ Get subjective metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get metrics'
      });
    }
  }
);

/**
 * POST /api/subjective-metrics/batch
 * Evaluate multiple prompts at once
 */
router.post('/batch',
  authenticateToken,
  [
    body('promptIds').isArray().withMessage('promptIds must be an array'),
    body('brandName').notEmpty().withMessage('brandName is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { promptIds, brandName } = req.body;

      console.log('\n' + '='.repeat(70));
      console.log('📊 [API] POST /api/subjective-metrics/batch');
      console.log(`   User: ${req.userId}`);
      console.log(`   Prompts: ${promptIds.length}`);
      console.log(`   Brand: ${brandName}`);
      console.log('='.repeat(70));

      // Verify all prompts belong to user
      const Prompt = require('../models/Prompt');
      const prompts = await Prompt.find({
        _id: { $in: promptIds },
        userId: req.userId
      });

      if (prompts.length !== promptIds.length) {
        return res.status(404).json({
          success: false,
          message: 'Some prompts not found or unauthorized'
        });
      }

      // Batch evaluation
      const result = await subjectiveMetricsService.evaluateBatch(
        promptIds,
        brandName,
        req.userId
      );

      console.log(`✅ [API] Batch evaluation complete`);

      res.json({
        success: true,
        data: result,
        message: `Evaluated ${result.results.length}/${promptIds.length} prompts`
      });

    } catch (error) {
      console.error('❌ [API ERROR] Batch evaluation failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to evaluate batch'
      });
    }
  }
);

/**
 * GET /api/subjective-metrics/prompt/:promptId
 * Get all metrics for a prompt across platforms
 */
router.get('/prompt/:promptId',
  authenticateToken,
  async (req, res) => {
    try {
      const { promptId } = req.params;
      const { brandName } = req.query;

      if (!brandName) {
        return res.status(400).json({
          success: false,
          message: 'brandName query parameter is required'
        });
      }

      const result = await subjectiveMetricsService.getPromptMetrics(
        promptId,
        brandName
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'No metrics found for this prompt'
        });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Get prompt metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get prompt metrics'
      });
    }
  }
);

/**
 * GET /api/subjective-metrics/summary/:userId
 * Get summary statistics for all evaluations by user
 */
router.get('/summary/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify authorization
      if (userId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const metrics = await SubjectiveMetrics.find({
        userId,
        status: 'completed'
      });

      if (metrics.length === 0) {
        return res.json({
          success: true,
          data: {
            totalEvaluations: 0,
            avgScores: null,
            platforms: [],
            brands: []
          }
        });
      }

      // Calculate summary
      const totals = {
        relevance: 0,
        influence: 0,
        uniqueness: 0,
        position: 0,
        clickProbability: 0,
        diversity: 0,
        overallQuality: 0
      };

      const platforms = new Set();
      const brands = new Set();

      metrics.forEach(metric => {
        totals.relevance += metric.relevance.score;
        totals.influence += metric.influence.score;
        totals.uniqueness += metric.uniqueness.score;
        totals.position += metric.position.score;
        totals.clickProbability += metric.clickProbability.score;
        totals.diversity += metric.diversity.score;
        totals.overallQuality += metric.overallQuality.score;
        
        platforms.add(metric.platform);
        brands.add(metric.brandName);
      });

      const count = metrics.length;
      const avgScores = {
        relevance: Math.round((totals.relevance / count) * 10) / 10,
        influence: Math.round((totals.influence / count) * 10) / 10,
        uniqueness: Math.round((totals.uniqueness / count) * 10) / 10,
        position: Math.round((totals.position / count) * 10) / 10,
        clickProbability: Math.round((totals.clickProbability / count) * 10) / 10,
        diversity: Math.round((totals.diversity / count) * 10) / 10,
        overallQuality: Math.round((totals.overallQuality / count) * 10) / 10
      };

      res.json({
        success: true,
        data: {
          totalEvaluations: count,
          avgScores,
          platforms: Array.from(platforms),
          brands: Array.from(brands),
          lastEvaluated: metrics[0].evaluatedAt
        }
      });

    } catch (error) {
      console.error('❌ Get summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get summary'
      });
    }
  }
);

/**
 * DELETE /api/subjective-metrics/:metricsId
 * Delete specific metrics (for re-evaluation)
 */
router.delete('/:metricsId',
  authenticateToken,
  async (req, res) => {
    try {
      const { metricsId } = req.params;

      const metrics = await SubjectiveMetrics.findOne({
        _id: metricsId,
        userId: req.userId
      });

      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: 'Metrics not found or unauthorized'
        });
      }

      await SubjectiveMetrics.deleteOne({ _id: metricsId });

      res.json({
        success: true,
        message: 'Metrics deleted successfully'
      });

    } catch (error) {
      console.error('❌ Delete metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete metrics'
      });
    }
  }
);

module.exports = router;

