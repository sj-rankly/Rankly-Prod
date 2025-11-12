const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const GA4DataSnapshot = require('../../models/GA4DataSnapshot');

const router = express.Router();

/**
 * POST /api/ga4/clear-cache
 * Clear GA4 data cache for user
 */
router.post('/clear-cache', ga4SessionMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { dataType } = req.body; // Optional: clear specific data type
    
    const filter = { userId };
    if (dataType) {
      filter.dataType = dataType;
    }
    
    const result = await GA4DataSnapshot.deleteMany(filter);
    console.log(`🗑️ [clear-cache] Cleared ${result.deletedCount} cache entries for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: `Cache cleared (${result.deletedCount} entries)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

module.exports = router;












