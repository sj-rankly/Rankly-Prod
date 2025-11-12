/**
 * Data Cleanup Routes
 * 
 * Admin/monitoring endpoints for database cleanup and health checks
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const dataCleanupService = require('../services/dataCleanupService');
const router = express.Router();

// JWT Authentication middleware
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/cleanup/stats
 * Get database health statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await dataCleanupService.getCleanupStats(req.userId);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get cleanup stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cleanup statistics'
    });
  }
});

/**
 * POST /api/cleanup/orphaned-prompts
 * Clean up orphaned prompts for current user
 */
router.post('/orphaned-prompts', authenticateToken, async (req, res) => {
  try {
    const result = await dataCleanupService.cleanOrphanedPrompts(req.userId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Clean orphaned prompts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean orphaned prompts'
    });
  }
});

/**
 * POST /api/cleanup/orphaned-tests
 * Clean up orphaned test results for current user
 */
router.post('/orphaned-tests', authenticateToken, async (req, res) => {
  try {
    const result = await dataCleanupService.cleanOrphanedTestResults(req.userId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Clean orphaned tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean orphaned test results'
    });
  }
});

/**
 * POST /api/cleanup/comprehensive
 * Run comprehensive cleanup (admin only - checks for specific env var)
 */
router.post('/comprehensive', authenticateToken, async (req, res) => {
  try {
    // Only allow comprehensive cleanup if admin mode is enabled
    if (process.env.ADMIN_MODE !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Admin mode required for comprehensive cleanup'
      });
    }
    
    const result = await dataCleanupService.comprehensiveCleanup();
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Comprehensive cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run comprehensive cleanup'
    });
  }
});

module.exports = router;

