/**
 * Reset and Retest Script
 *
 * This script:
 * 1. Deletes old prompt test results (with wrong brand)
 * 2. Deletes old aggregated metrics
 * 3. Re-runs prompt tests with correct brand from URL analysis
 * 4. Recalculates metrics with correct brand
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PromptTest = require('../models/PromptTest');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const Prompt = require('../models/Prompt');
const UrlAnalysis = require('../models/UrlAnalysis');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
const promptTestingService = require('../services/promptTestingService');
const metricsAggregationService = require('../services/metricsAggregationService');

async function resetAndRetest(userId) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 RESET AND RETEST - Starting cleanup and retest process');
    console.log('='.repeat(80) + '\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Get user's brand from URL analysis
    console.log('📊 Step 1: Fetching user brand from URL analysis...');
    const urlAnalysis = await UrlAnalysis.findOne({ userId }).sort({ analysisDate: -1 }).lean();

    if (!urlAnalysis || !urlAnalysis.brandContext) {
      console.error('❌ No URL analysis found for user. Please run URL analysis first.');
      process.exit(1);
    }

    const userBrand = urlAnalysis.brandContext.companyName;
    console.log(`   ✅ User brand identified: ${userBrand}\n`);

    // 2. Delete old prompt tests
    console.log('🗑️  Step 2: Deleting old prompt tests...');
    const deleteTestsResult = await PromptTest.deleteMany({ userId });
    console.log(`   ✅ Deleted ${deleteTestsResult.deletedCount} old prompt tests\n`);

    // 3. Delete old aggregated metrics
    console.log('🗑️  Step 3: Deleting old aggregated metrics...');
    const deleteMetricsResult = await AggregatedMetrics.deleteMany({ userId });
    console.log(`   ✅ Deleted ${deleteMetricsResult.deletedCount} old metric records\n`);

    // 4. Get all prompts for the user
    console.log('📝 Step 4: Fetching user prompts...');
    const prompts = await Prompt.find({ userId, status: 'active' });
    console.log(`   ✅ Found ${prompts.length} active prompts\n`);

    if (prompts.length === 0) {
      console.log('⚠️  No active prompts found. Please generate prompts first.');
      process.exit(0);
    }

    // 5. Re-run prompt tests with correct brand
    console.log('🧪 Step 5: Re-testing all prompts with correct brand...');
    console.log(`   Brand to track: ${userBrand}\n`);

    const testResults = await promptTestingService.testAllPrompts(userId);
    console.log(`   ✅ Completed ${testResults.totalTests} prompt tests\n`);

    // 6. Recalculate metrics with correct brand
    console.log('📊 Step 6: Recalculating metrics with correct brand...');
    const metricsResults = await metricsAggregationService.calculateAllMetrics(userId);
    console.log(`   ✅ Calculated ${metricsResults.totalCalculations} metric sets\n`);

    console.log('='.repeat(80));
    console.log('✅ RESET AND RETEST COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   - User Brand: ${userBrand}`);
    console.log(`   - Prompts Tested: ${testResults.totalTests}`);
    console.log(`   - Metrics Calculated: ${metricsResults.totalCalculations}`);
    console.log(`   - Old Tests Removed: ${deleteTestsResult.deletedCount}`);
    console.log(`   - Old Metrics Removed: ${deleteMetricsResult.deletedCount}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during reset and retest:', error);
    process.exit(1);
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: Please provide userId as argument');
  console.log('Usage: node resetAndRetest.js <userId>');
  process.exit(1);
}

// Run the script
resetAndRetest(userId);
