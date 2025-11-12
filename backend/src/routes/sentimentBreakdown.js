const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();
const PromptTest = require('../models/PromptTest');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Prompt = require('../models/Prompt');


const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/sentiment/breakdown
 * Returns sentiment breakdown data by topic/persona with prompts
 */
router.get('/breakdown', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId, sortBy = 'topics' } = req.query;
    const userId = req.userId;

    console.log(`📊 [SENTIMENT BREAKDOWN] User: ${userId}, URL Analysis ID: ${urlAnalysisId}, Sort By: ${sortBy}`);

    // Validate sortBy parameter
    if (sortBy && !['topics', 'personas'].includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sortBy parameter. Must be "topics" or "personas"'
      });
    }

    // Build query
    const query = { userId, status: 'completed' };
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }

    // Get all completed tests with populated data
    const tests = await PromptTest.find(query)
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .populate('promptId', 'text queryType')
      .lean();

    console.log(`📊 [SENTIMENT BREAKDOWN] Found ${tests.length} completed tests`);

    if (tests.length === 0) {
      console.log('📊 [SENTIMENT BREAKDOWN] No completed tests found');
      return res.json({
        success: true,
        data: [],
        message: 'No completed tests found'
      });
    }

    // Group data by topic or persona based on sortBy
    const groupBy = sortBy === 'personas' ? 'personaId' : 'topicId';
    const groupName = sortBy === 'personas' ? 'persona' : 'topic';
    const groupDisplayName = sortBy === 'personas' ? 'type' : 'name';

    const groupedData = {};

    tests.forEach(test => {
      const groupId = test[groupBy]?._id?.toString();
      // Extract the name/type properly from populated object
      let groupNameValue = 'Unknown';
      if (test[groupBy]) {
        if (typeof test[groupBy] === 'object') {
          groupNameValue = test[groupBy][groupDisplayName] || 'Unknown';
        } else {
          groupNameValue = String(test[groupBy]);
        }
      }
      
      if (!groupId) return;

      if (!groupedData[groupId]) {
        groupedData[groupId] = {
          id: groupId,
          topic: groupNameValue, // Always use 'topic' field name for frontend compatibility
          sentimentSplit: {
            positive: 0,
            negative: 0,
            neutral: 0,
            mixed: 0
          },
          prompts: [],
          totalSentiment: 0
        };
      }

      // Aggregate sentiment data - use scorecard.sentiment field
      const sentiment = test.scorecard?.sentiment || 'neutral';
      
      
      groupedData[groupId].sentimentSplit[sentiment]++;
      groupedData[groupId].totalSentiment++;

      // Add prompt data
      const promptId = test.promptId?._id?.toString();
      const existingPrompt = groupedData[groupId].prompts.find(p => p.id === promptId);
      
      if (existingPrompt) {
        existingPrompt.sentimentSplit[sentiment]++;
        existingPrompt.totalTests++;
      } else {
        groupedData[groupId].prompts.push({
          id: promptId,
          text: test.promptText || test.promptId?.text || 'Unknown prompt',
          queryType: test.queryType,
          sentimentSplit: {
            positive: sentiment === 'positive' ? 1 : 0,
            negative: sentiment === 'negative' ? 1 : 0,
            neutral: sentiment === 'neutral' ? 1 : 0,
            mixed: sentiment === 'mixed' ? 1 : 0
          },
          totalTests: 1
        });
      }
    });

    // Convert to array and calculate percentages
    const result = Object.values(groupedData).map(item => {
      const total = item.totalSentiment;
      
      
      // Calculate percentages for sentiment split
      const sentimentSplit = {
        positive: total > 0 ? Math.round((item.sentimentSplit.positive / total) * 100) : 0,
        negative: total > 0 ? Math.round((item.sentimentSplit.negative / total) * 100) : 0,
        neutral: total > 0 ? Math.round((item.sentimentSplit.neutral / total) * 100) : 0,
        mixed: total > 0 ? Math.round((item.sentimentSplit.mixed / total) * 100) : 0
      };

      // Calculate percentages for each prompt
      const prompts = item.prompts.map(prompt => {
        const promptTotal = prompt.totalTests;
        return {
          ...prompt,
          sentimentSplit: {
            positive: promptTotal > 0 ? Math.round((prompt.sentimentSplit.positive / promptTotal) * 100) : 0,
            negative: promptTotal > 0 ? Math.round((prompt.sentimentSplit.negative / promptTotal) * 100) : 0,
            neutral: promptTotal > 0 ? Math.round((prompt.sentimentSplit.neutral / promptTotal) * 100) : 0,
            mixed: promptTotal > 0 ? Math.round((prompt.sentimentSplit.mixed / promptTotal) * 100) : 0
          }
        };
      });

      return {
        ...item,
        sentimentSplit,
        prompts
      };
    });

    // Sort by topic name (always use 'topic' field for frontend compatibility)
    result.sort((a, b) => a.topic.localeCompare(b.topic));

    console.log(`📊 [SENTIMENT BREAKDOWN] Returning ${result.length} ${groupName} with sentiment data`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Get sentiment breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sentiment breakdown data'
    });
  }
});

module.exports = router;
