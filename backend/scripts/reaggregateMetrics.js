#!/usr/bin/env node

/**
 * Re-aggregate All Metrics from Prompt Tests
 * 
 * This script re-runs the full aggregation pipeline to recalculate all metrics
 * including the corrected visibility score using unique prompt counting.
 * 
 * Usage:
 *   node scripts/reaggregateMetrics.js [userId]
 * 
 * What it does:
 * 1. Fetches all prompt tests for the user
 * 2. Runs the full aggregation service with new logic
 * 3. Calculates all metrics: visibility, depth, SOV, position, citations, sentiment
 * 4. Saves updated metrics to database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MetricsAggregationService = require('../src/services/metricsAggregationService');
const PromptTest = require('../src/models/PromptTest');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Get user ID from command line or find first user
 */
async function getUserId() {
  const cmdLineUserId = process.argv[2];
  
  if (cmdLineUserId) {
    console.log(`📋 Using user ID from command line: ${cmdLineUserId}`);
    return cmdLineUserId;
  }
  
  // Find first user from prompt tests
  const test = await PromptTest.findOne({}).lean();
  if (!test) {
    throw new Error('No prompt tests found in database');
  }
  
  const userId = test.userId.toString();
  console.log(`📋 Auto-detected user ID: ${userId}`);
  return userId;
}

/**
 * Main re-aggregation function
 */
async function reaggregateMetrics(userId) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 RE-AGGREGATING METRICS FROM PROMPT TESTS');
    console.log('='.repeat(60));
    console.log(`👤 User ID: ${userId}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

    // Fetch all completed prompt tests for the user
    const tests = await PromptTest.find({
      userId,
      status: 'completed'
    })
    .populate('topicId', 'name')
    .populate('personaId', 'type')
    .lean();

    if (tests.length === 0) {
      console.log('⚠️  No completed prompt tests found for this user');
      console.log('   Please run prompt tests first: POST /api/prompts/test\n');
      return;
    }

    console.log(`📊 Found ${tests.length} completed prompt tests`);
    
    // Count unique prompts
    const uniquePrompts = new Set(tests.map(t => t.promptId.toString()));
    console.log(`📝 Unique prompts: ${uniquePrompts.size}`);
    console.log(`🤖 Platforms tested: ${new Set(tests.map(t => t.llmProvider)).size}`);
    console.log(`📚 Topics: ${new Set(tests.map(t => t.topicId?.name).filter(Boolean)).size}`);
    console.log(`👥 Personas: ${new Set(tests.map(t => t.personaId?.type).filter(Boolean)).size}\n`);

    // Use aggregation service (it's already a singleton instance)
    const aggregationService = MetricsAggregationService;

    // Run aggregation at all levels
    console.log('🔄 Running aggregation...\n');
    
    const result = await aggregationService.calculateMetrics(userId, {});

    console.log('\n' + '='.repeat(60));
    console.log('✅ AGGREGATION COMPLETE');
    console.log('='.repeat(60));
    console.log('Metrics have been recalculated and saved to database');
    console.log('='.repeat(60) + '\n');

    return result;

  } catch (error) {
    console.error('❌ Error during re-aggregation:', error);
    throw error;
  }
}

/**
 * Verify the results
 */
async function verifyResults(userId) {
  const AggregatedMetrics = require('../src/models/AggregatedMetrics');
  
  console.log('🔍 Verifying re-aggregated metrics...\n');

  const overall = await AggregatedMetrics.findOne({
    userId,
    scope: 'overall'
  }).lean();

  if (!overall) {
    console.log('⚠️  No overall metrics found');
    return;
  }

  console.log('Overall Metrics Summary:');
  console.log('─'.repeat(60));
  console.log(`Total unique prompts: ${overall.totalPrompts}`);
  console.log(`Total responses (tests): ${overall.totalResponses}`);
  console.log(`Total brands detected: ${overall.totalBrands}\n`);

  console.log('Brand Visibility Scores (should be 0-100%):');
  console.log('─'.repeat(60));
  
  overall.brandMetrics.forEach((brand, index) => {
    const visibility = brand.visibilityScore || 0;
    const status = visibility <= 100 ? '✅' : '❌';
    
    console.log(`${status} ${index + 1}. ${brand.brandName}`);
    console.log(`   Visibility Score: ${visibility}% (Rank #${brand.visibilityRank})`);
    console.log(`   Appears in: ${brand.totalAppearances} / ${overall.totalPrompts} unique prompts`);
    console.log(`   Total mentions: ${brand.totalMentions}`);
    console.log(`   Share of Voice: ${brand.shareOfVoice}%`);
    console.log(`   Avg Position: ${brand.avgPosition}`);
    console.log(`   Depth of Mention: ${brand.depthOfMention}%`);
    
    if (visibility > 100) {
      console.log(`   ⚠️  WARNING: Visibility > 100% - check totalAppearances calculation!`);
    }
    console.log('');
  });
  
  console.log('─'.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Connect to database
    await connectDB();

    // Get user ID
    const userId = await getUserId();

    // Run re-aggregation
    await reaggregateMetrics(userId);

    // Verify results
    await verifyResults(userId);

    console.log('✅ Re-aggregation completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Check the metrics in MongoDB');
    console.log('  2. Test the dashboard API: GET /api/metrics/dashboard');
    console.log('  3. Verify frontend displays correctly\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Script interrupted by user');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { reaggregateMetrics };

