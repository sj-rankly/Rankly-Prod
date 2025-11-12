/**
 * URL Cleanup Service
 * 
 * Handles comprehensive cleanup of all data associated with a URL analysis
 * when the same URL is being re-analyzed.
 */

const UrlAnalysis = require('../models/UrlAnalysis');
const PromptTest = require('../models/PromptTest');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const SubjectiveMetrics = require('../models/SubjectiveMetrics');
const Competitor = require('../models/Competitor');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Prompt = require('../models/Prompt');

class UrlCleanupService {
  constructor() {
    console.log('🧹 UrlCleanupService initialized');
  }

  /**
   * Clean up all data associated with a specific URL for a user
   * @param {string} userId - User ID
   * @param {string} url - URL to clean up
   * @returns {Promise<object>} - Cleanup results
   */
  async cleanupUrlData(userId, url) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧹 [CLEANUP] Starting cleanup for URL: ${url}`);
    console.log(`👤 User: ${userId}`);
    console.log(`${'='.repeat(60)}\n`);

    const results = {
      urlAnalyses: 0,
      promptTests: 0,
      aggregatedMetrics: 0,
      subjectiveMetrics: 0,
      competitors: 0,
      topics: 0,
      personas: 0,
      prompts: 0,
      totalDeleted: 0
    };

    try {
      // Step 1: Find all URL analyses for this URL and user
      const urlAnalyses = await UrlAnalysis.find({ userId, url });
      const urlAnalysisIds = urlAnalyses.map(analysis => analysis._id);
      
      console.log(`📋 Found ${urlAnalyses.length} URL analyses for ${url}`);

      if (urlAnalysisIds.length > 0) {
        // Step 2: Delete all prompt tests associated with these URL analyses
        const promptTestResult = await PromptTest.deleteMany({
          urlAnalysisId: { $in: urlAnalysisIds }
        });
        results.promptTests = promptTestResult.deletedCount;
        console.log(`🗑️  Deleted ${results.promptTests} prompt tests`);

        // Step 3: Delete all aggregated metrics associated with these URL analyses
        const metricsResult = await AggregatedMetrics.deleteMany({
          urlAnalysisId: { $in: urlAnalysisIds }
        });
        results.aggregatedMetrics = metricsResult.deletedCount;
        console.log(`📊 Deleted ${results.aggregatedMetrics} aggregated metrics`);

        // Step 4: Delete all subjective metrics for this user (since prompts will be regenerated)
        const subjectiveMetricsResult = await SubjectiveMetrics.deleteMany({
          userId
        });
        results.subjectiveMetrics = subjectiveMetricsResult.deletedCount;
        console.log(`🧠 Deleted ${results.subjectiveMetrics} subjective metrics`);

        // Step 5: Delete the URL analyses themselves
        const urlAnalysisResult = await UrlAnalysis.deleteMany({
          _id: { $in: urlAnalysisIds }
        });
        results.urlAnalyses = urlAnalysisResult.deletedCount;
        console.log(`🔗 Deleted ${results.urlAnalyses} URL analyses`);
      }

      // Step 6: Clean up user-specific data (competitors, topics, personas, prompts)
      // This ensures a completely fresh start for the new analysis
      
      // Get IDs of items to be deleted (for cleaning up related prompts)
      const oldTopicIds = await Topic.find({ userId }).distinct('_id');
      const oldPersonaIds = await Persona.find({ userId }).distinct('_id');
      
      // Delete old prompts that reference topics/personas about to be deleted
      if (oldTopicIds.length > 0 || oldPersonaIds.length > 0) {
        const promptResult = await Prompt.deleteMany({
          userId,
          $or: [
            { topicId: { $in: oldTopicIds } },
            { personaId: { $in: oldPersonaIds } }
          ]
        });
        results.prompts = promptResult.deletedCount;
        console.log(`📝 Deleted ${results.prompts} prompts`);
      }
      
      // Delete all user's competitors, topics, and personas
      const [competitorResult, topicResult, personaResult] = await Promise.all([
        Competitor.deleteMany({ userId }),
        Topic.deleteMany({ userId }),
        Persona.deleteMany({ userId })
      ]);
      
      results.competitors = competitorResult.deletedCount;
      results.topics = topicResult.deletedCount;
      results.personas = personaResult.deletedCount;
      
      console.log(`🏢 Deleted ${results.competitors} competitors`);
      console.log(`📚 Deleted ${results.topics} topics`);
      console.log(`👥 Deleted ${results.personas} personas`);

      // Calculate total
      results.totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

      console.log(`\n✅ [CLEANUP COMPLETE] Total items deleted: ${results.totalDeleted}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        message: `Successfully cleaned up ${results.totalDeleted} items for URL: ${url}`,
        results
      };

    } catch (error) {
      console.error('❌ [CLEANUP ERROR] Failed to cleanup URL data:', error);
      return {
        success: false,
        message: 'Failed to cleanup URL data',
        error: error.message,
        results
      };
    }
  }

  /**
   * Check if a URL already exists for a user
   * @param {string} userId - User ID
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} - True if URL exists
   */
  async urlExists(userId, url) {
    try {
      const count = await UrlAnalysis.countDocuments({ userId, url });
      return count > 0;
    } catch (error) {
      console.error('❌ Error checking if URL exists:', error);
      return false;
    }
  }

  /**
   * Get cleanup statistics for a URL
   * @param {string} userId - User ID
   * @param {string} url - URL to check
   * @returns {Promise<object>} - Cleanup statistics
   */
  async getCleanupStats(userId, url) {
    try {
      const urlAnalyses = await UrlAnalysis.find({ userId, url });
      const urlAnalysisIds = urlAnalyses.map(analysis => analysis._id);

      const stats = {
        urlAnalyses: urlAnalyses.length,
        promptTests: 0,
        aggregatedMetrics: 0,
        subjectiveMetrics: 0
      };

      if (urlAnalysisIds.length > 0) {
        const [promptTestCount, metricsCount, subjectiveMetricsCount] = await Promise.all([
          PromptTest.countDocuments({ urlAnalysisId: { $in: urlAnalysisIds } }),
          AggregatedMetrics.countDocuments({ urlAnalysisId: { $in: urlAnalysisIds } }),
          SubjectiveMetrics.countDocuments({ userId })
        ]);

        stats.promptTests = promptTestCount;
        stats.aggregatedMetrics = metricsCount;
        stats.subjectiveMetrics = subjectiveMetricsCount;
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      return {
        success: false,
        message: 'Failed to get cleanup statistics',
        error: error.message
      };
    }
  }
}

module.exports = new UrlCleanupService();

