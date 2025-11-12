const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const PromptTest = require('../models/PromptTest');
const Prompt = require('../models/Prompt');
const router = express.Router();


const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/clusters
 * Returns clustered topic analysis
 * Groups related topics/prompts and shows their performance
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId } = req.query;

    const query = { userId: req.userId, status: 'completed' };
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }

    // Get all completed tests with topic and persona info
    const tests = await PromptTest.find(query)
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .populate('promptId', 'text queryType')
      .lean();

    if (tests.length === 0) {
      return res.json({
        success: true,
        data: {
          clusters: [],
          summary: {
            totalClusters: 0,
            totalTopics: 0,
            avgVisibility: 0
          }
        }
      });
    }

    // Group by topic to create clusters
    const topicClusters = {};
    
    tests.forEach(test => {
      const topicName = test.topicId?.name || 'Uncategorized';
      
      if (!topicClusters[topicName]) {
        topicClusters[topicName] = {
          id: test.topicId?._id || 'uncategorized',
          name: topicName,
          prompts: [],
          tests: [],
          visibilityScores: [],
          platforms: new Set(),
          personas: new Set()
        };
      }
      
      topicClusters[topicName].tests.push(test);
      topicClusters[topicName].visibilityScores.push(test.scorecard?.visibilityScore || 0);
      topicClusters[topicName].platforms.add(test.llmProvider);
      if (test.personaId?.type) {
        topicClusters[topicName].personas.add(test.personaId.type);
      }
      
      // Add unique prompts
      const promptText = test.promptId?.text || test.promptText;
      if (promptText && !topicClusters[topicName].prompts.find(p => p.text === promptText)) {
        topicClusters[topicName].prompts.push({
          id: test.promptId?._id || test._id,
          text: promptText,
          queryType: test.promptId?.queryType || test.queryType,
          visibilityScore: test.scorecard?.visibilityScore || 0
        });
      }
    });

    // Transform to cluster format
    const clusters = Object.entries(topicClusters).map(([topicName, data]) => {
      const avgVisibility = data.visibilityScores.length > 0
        ? Math.round(data.visibilityScores.reduce((sum, score) => sum + score, 0) / data.visibilityScores.length)
        : 0;
      
      const brandMentionRate = data.tests.length > 0
        ? Math.round((data.tests.filter(t => t.scorecard?.brandMentioned).length / data.tests.length) * 100)
        : 0;

      // Sort prompts by visibility score
      const topPrompts = data.prompts
        .sort((a, b) => b.visibilityScore - a.visibilityScore)
        .slice(0, 5);

      return {
        id: data.id,
        name: topicName,
        promptCount: data.prompts.length,
        testCount: data.tests.length,
        avgVisibility,
        brandMentionRate,
        platforms: Array.from(data.platforms),
        personas: Array.from(data.personas),
        topPrompts: topPrompts.map(p => ({
          id: p.id,
          text: p.text.length > 100 ? p.text.substring(0, 100) + '...' : p.text,
          queryType: p.queryType,
          visibilityScore: p.visibilityScore
        })),
        metrics: {
          totalMentions: data.tests.filter(t => t.scorecard?.brandMentioned).length,
          avgPosition: calculateAvgPosition(data.tests),
          citationRate: calculateCitationRate(data.tests)
        }
      };
    });

    // Sort clusters by average visibility (descending)
    clusters.sort((a, b) => b.avgVisibility - a.avgVisibility);

    // Calculate summary
    const summary = {
      totalClusters: clusters.length,
      totalTopics: clusters.length,
      totalPrompts: clusters.reduce((sum, c) => sum + c.promptCount, 0),
      totalTests: clusters.reduce((sum, c) => sum + c.testCount, 0),
      avgVisibility: clusters.length > 0
        ? Math.round(clusters.reduce((sum, c) => sum + c.avgVisibility, 0) / clusters.length)
        : 0,
      topPerforming: clusters.slice(0, 3).map(c => ({
        name: c.name,
        score: c.avgVisibility
      })),
      needsAttention: clusters.filter(c => c.avgVisibility < 30).slice(0, 3).map(c => ({
        name: c.name,
        score: c.avgVisibility
      }))
    };

    res.json({
      success: true,
      data: {
        clusters,
        summary
      }
    });

  } catch (error) {
    console.error('Get clusters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cluster data',
      error: error.message
    });
  }
});

/**
 * GET /api/clusters/:clusterId
 * Get detailed view of a specific cluster
 */
router.get('/:clusterId', authenticateToken, async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { urlAnalysisId } = req.query;

    const query = { 
      userId: req.userId, 
      topicId: clusterId,
      status: 'completed'
    };
    
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }

    const tests = await PromptTest.find(query)
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .populate('promptId', 'text queryType')
      .sort({ 'scorecard.visibilityScore': -1 })
      .lean();

    if (tests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }

    const clusterName = tests[0].topicId?.name || 'Uncategorized';

    // Platform breakdown
    const platformBreakdown = {};
    tests.forEach(test => {
      if (!platformBreakdown[test.llmProvider]) {
        platformBreakdown[test.llmProvider] = {
          platform: test.llmProvider,
          tests: 0,
          avgVisibility: 0,
          mentions: 0
        };
      }
      platformBreakdown[test.llmProvider].tests++;
      if (test.scorecard?.brandMentioned) {
        platformBreakdown[test.llmProvider].mentions++;
        platformBreakdown[test.llmProvider].avgVisibility += test.scorecard.visibilityScore;
      }
    });

    Object.values(platformBreakdown).forEach(platform => {
      if (platform.mentions > 0) {
        platform.avgVisibility = Math.round(platform.avgVisibility / platform.mentions);
      }
      platform.mentionRate = Math.round((platform.mentions / platform.tests) * 100);
    });

    // Prompt performance
    const promptPerformance = {};
    tests.forEach(test => {
      const promptId = test.promptId?._id?.toString() || 'unknown';
      if (!promptPerformance[promptId]) {
        promptPerformance[promptId] = {
          id: promptId,
          text: test.promptId?.text || test.promptText,
          queryType: test.promptId?.queryType || test.queryType,
          tests: 0,
          totalVisibility: 0,
          mentions: 0
        };
      }
      promptPerformance[promptId].tests++;
      if (test.scorecard?.brandMentioned) {
        promptPerformance[promptId].mentions++;
        promptPerformance[promptId].totalVisibility += test.scorecard.visibilityScore;
      }
    });

    const prompts = Object.values(promptPerformance).map(p => ({
      ...p,
      avgVisibility: p.mentions > 0 ? Math.round(p.totalVisibility / p.mentions) : 0,
      mentionRate: Math.round((p.mentions / p.tests) * 100)
    })).sort((a, b) => b.avgVisibility - a.avgVisibility);

    res.json({
      success: true,
      data: {
        id: clusterId,
        name: clusterName,
        summary: {
          totalTests: tests.length,
          totalPrompts: prompts.length,
          avgVisibility: prompts.length > 0
            ? Math.round(prompts.reduce((sum, p) => sum + p.avgVisibility, 0) / prompts.length)
            : 0,
          brandMentionRate: Math.round((tests.filter(t => t.scorecard?.brandMentioned).length / tests.length) * 100)
        },
        platformBreakdown: Object.values(platformBreakdown),
        prompts
      }
    });

  } catch (error) {
    console.error('Get cluster detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cluster details',
      error: error.message
    });
  }
});

// Helper functions
function calculateAvgPosition(tests) {
  const positionedTests = tests.filter(t => t.scorecard?.brandPosition > 0);
  if (positionedTests.length === 0) return 0;
  
  const totalPosition = positionedTests.reduce((sum, t) => sum + t.scorecard.brandPosition, 0);
  return Math.round((totalPosition / positionedTests.length) * 10) / 10;
}

function calculateCitationRate(tests) {
  if (tests.length === 0) return 0;
  const withCitations = tests.filter(t => t.scorecard?.citationPresent).length;
  return Math.round((withCitations / tests.length) * 100);
}

module.exports = router;

