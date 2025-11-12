/**
 * Data Cleanup Service
 * 
 * Handles cleanup of orphaned and inconsistent data to maintain database integrity.
 * This is crucial for long-term scalability and data consistency.
 */

const Prompt = require('../models/Prompt');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
const PromptTest = require('../models/PromptTest');

class DataCleanupService {
  
  /**
   * Clean up all orphaned prompts (prompts referencing non-existent topics/personas)
   * This happens when topics/personas are deleted but their prompts remain
   */
  async cleanOrphanedPrompts(userId = null) {
    try {
      console.log('\n🧹 [CLEANUP] Starting orphaned prompts cleanup...');
      
      // Get all existing topic and persona IDs
      const query = userId ? { userId } : {};
      const topics = await Topic.find(query).distinct('_id');
      const personas = await Persona.find(query).distinct('_id');
      
      console.log(`📊 [CLEANUP] Found ${topics.length} topics and ${personas.length} personas`);
      
      // Find prompts with non-existent references
      const orphanedPrompts = await Prompt.find({
        ...(userId && { userId }),
        $or: [
          { topicId: { $nin: topics } },
          { personaId: { $nin: personas } },
          { topicId: null },
          { personaId: null },
          { queryType: null }
        ]
      });
      
      console.log(`❌ [CLEANUP] Found ${orphanedPrompts.length} orphaned prompts`);
      
      if (orphanedPrompts.length > 0) {
        const orphanedIds = orphanedPrompts.map(p => p._id);
        
        // Also delete related test results
        const testDeleteResult = await PromptTest.deleteMany({
          promptId: { $in: orphanedIds }
        });
        console.log(`🗑️  [CLEANUP] Deleted ${testDeleteResult.deletedCount} related test results`);
        
        // Delete the orphaned prompts
        const promptDeleteResult = await Prompt.deleteMany({
          _id: { $in: orphanedIds }
        });
        console.log(`🗑️  [CLEANUP] Deleted ${promptDeleteResult.deletedCount} orphaned prompts`);
      }
      
      console.log('✅ [CLEANUP] Orphaned prompts cleanup complete\n');
      
      return {
        success: true,
        deletedPrompts: orphanedPrompts.length,
        message: `Cleaned up ${orphanedPrompts.length} orphaned prompts`
      };
      
    } catch (error) {
      console.error('❌ [CLEANUP] Orphaned prompts cleanup failed:', error);
      throw error;
    }
  }
  
  /**
   * Clean up orphaned test results (test results for deleted prompts)
   */
  async cleanOrphanedTestResults(userId = null) {
    try {
      console.log('\n🧹 [CLEANUP] Starting orphaned test results cleanup...');
      
      // Get all existing prompt IDs
      const query = userId ? { userId } : {};
      const existingPromptIds = await Prompt.find(query).distinct('_id');
      
      // Find test results for non-existent prompts
      const orphanedTests = await PromptTest.find({
        ...(userId && { userId }),
        promptId: { $nin: existingPromptIds }
      });
      
      console.log(`❌ [CLEANUP] Found ${orphanedTests.length} orphaned test results`);
      
      if (orphanedTests.length > 0) {
        const deleteResult = await PromptTest.deleteMany({
          ...(userId && { userId }),
          promptId: { $nin: existingPromptIds }
        });
        console.log(`🗑️  [CLEANUP] Deleted ${deleteResult.deletedCount} orphaned test results`);
      }
      
      console.log('✅ [CLEANUP] Orphaned test results cleanup complete\n');
      
      return {
        success: true,
        deletedTests: orphanedTests.length,
        message: `Cleaned up ${orphanedTests.length} orphaned test results`
      };
      
    } catch (error) {
      console.error('❌ [CLEANUP] Orphaned test results cleanup failed:', error);
      throw error;
    }
  }
  
  /**
   * Clean up all data for a specific user (for fresh start)
   * Use this when a user starts a new analysis
   */
  async cleanUserData(userId) {
    try {
      console.log(`\n🧹 [CLEANUP] Cleaning all data for user ${userId}...`);
      
      // Get IDs before deletion for cascade cleanup
      const topicIds = await Topic.find({ userId }).distinct('_id');
      const personaIds = await Persona.find({ userId }).distinct('_id');
      const promptIds = await Prompt.find({ userId }).distinct('_id');
      
      // Delete in correct order to maintain referential integrity
      const testResults = await PromptTest.deleteMany({ userId });
      const prompts = await Prompt.deleteMany({ userId });
      const topics = await Topic.deleteMany({ userId });
      const personas = await Persona.deleteMany({ userId });
      const competitors = await Competitor.deleteMany({ userId });
      
      console.log(`🗑️  [CLEANUP] Deleted:`);
      console.log(`   - ${competitors.deletedCount} competitors`);
      console.log(`   - ${topics.deletedCount} topics`);
      console.log(`   - ${personas.deletedCount} personas`);
      console.log(`   - ${prompts.deletedCount} prompts`);
      console.log(`   - ${testResults.deletedCount} test results`);
      
      console.log('✅ [CLEANUP] User data cleanup complete\n');
      
      return {
        success: true,
        deletedItems: {
          competitors: competitors.deletedCount,
          topics: topics.deletedCount,
          personas: personas.deletedCount,
          prompts: prompts.deletedCount,
          testResults: testResults.deletedCount
        }
      };
      
    } catch (error) {
      console.error(`❌ [CLEANUP] User data cleanup failed for ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Comprehensive cleanup - removes all orphaned data across the system
   * Run this periodically (e.g., daily cron job) to maintain database health
   */
  async comprehensiveCleanup() {
    try {
      console.log('\n' + '='.repeat(70));
      console.log('🧹 [CLEANUP] Starting comprehensive database cleanup...');
      console.log('='.repeat(70) + '\n');
      
      const results = {};
      
      // Clean orphaned prompts
      results.prompts = await this.cleanOrphanedPrompts();
      
      // Clean orphaned test results
      results.testResults = await this.cleanOrphanedTestResults();
      
      console.log('\n' + '='.repeat(70));
      console.log('✅ [CLEANUP] Comprehensive cleanup complete!');
      console.log('='.repeat(70) + '\n');
      
      return {
        success: true,
        results
      };
      
    } catch (error) {
      console.error('❌ [CLEANUP] Comprehensive cleanup failed:', error);
      throw error;
    }
  }
  
  /**
   * Get cleanup statistics (for monitoring/dashboard)
   */
  async getCleanupStats(userId = null) {
    try {
      const query = userId ? { userId } : {};
      
      // Get all IDs
      const topicIds = await Topic.find(query).distinct('_id');
      const personaIds = await Persona.find(query).distinct('_id');
      const promptIds = await Prompt.find(query).distinct('_id');
      
      // Count orphaned items
      const orphanedPrompts = await Prompt.countDocuments({
        ...(userId && { userId }),
        $or: [
          { topicId: { $nin: topicIds } },
          { personaId: { $nin: personaIds } },
          { topicId: null },
          { personaId: null }
        ]
      });
      
      const orphanedTests = await PromptTest.countDocuments({
        ...(userId && { userId }),
        promptId: { $nin: promptIds }
      });
      
      const totalPrompts = await Prompt.countDocuments(query);
      const totalTests = await PromptTest.countDocuments(query);
      
      return {
        orphanedPrompts,
        orphanedTests,
        validPrompts: totalPrompts - orphanedPrompts,
        validTests: totalTests - orphanedTests,
        healthScore: totalPrompts > 0 
          ? Math.round(((totalPrompts - orphanedPrompts) / totalPrompts) * 100) 
          : 100
      };
      
    } catch (error) {
      console.error('❌ [CLEANUP] Failed to get cleanup stats:', error);
      throw error;
    }
  }
}

module.exports = new DataCleanupService();

