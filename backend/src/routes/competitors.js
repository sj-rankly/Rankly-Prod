const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');
const Competitor = require('../models/Competitor');
const router = express.Router();


const { authenticateToken } = require('../middleware/auth');

// Get all competitors for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId } = req.query;
    
    // Build query with optional urlAnalysisId filtering
    const query = { userId: req.userId };
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }
    
    const competitors = await Competitor.find(query);
    
    res.json({
      success: true,
      data: competitors
    });

  } catch (error) {
    console.error('Get competitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get competitors'
    });
  }
});

// Create new competitor
router.post('/', authenticateToken, [
  body('name').trim().notEmpty(),
  body('url').isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, url, selected = false } = req.body;

    const competitor = new Competitor({
      userId: req.userId,
      name,
      url,
      selected
    });

    await competitor.save();

    res.status(201).json({
      success: true,
      message: 'Competitor created successfully',
      data: competitor
    });

  } catch (error) {
    console.error('Create competitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create competitor'
    });
  }
});

// Update competitor
router.put('/:id', authenticateToken, [
  body('name').optional().trim().notEmpty(),
  body('url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const competitor = await Competitor.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!competitor) {
      return res.status(404).json({
        success: false,
        message: 'Competitor not found'
      });
    }

    res.json({
      success: true,
      message: 'Competitor updated successfully',
      data: competitor
    });

  } catch (error) {
    console.error('Update competitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update competitor'
    });
  }
});

// Delete competitor
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const competitor = await Competitor.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!competitor) {
      return res.status(404).json({
        success: false,
        message: 'Competitor not found'
      });
    }

    res.json({
      success: true,
      message: 'Competitor deleted successfully'
    });

  } catch (error) {
    console.error('Delete competitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete competitor'
    });
  }
});

module.exports = router;

