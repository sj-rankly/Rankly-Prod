/**
 * Helper Script to Find a Good Prompt for Subjective Metrics Testing
 * 
 * Usage: node src/scripts/findTestPrompt.js [userId]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');
const PromptTest = require('../models/PromptTest');

async function findTestPrompt(userId) {
  try {
    console.log('\n🔍 Searching for suitable Prompts for testing...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB\n');

    // Build query
    let query = { status: 'active' };
    if (userId) {
      query.userId = userId;
    }

    // Find prompts
    const prompts = await Prompt.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (prompts.length === 0) {
      console.log('❌ No prompts found');
      if (userId) {
        console.log(`   Searched for userId: ${userId}`);
      }
      process.exit(1);
    }

    console.log(`Found ${prompts.length} prompts\n`);
    console.log('='.repeat(80));

    // For each prompt, find completed tests with brands
    const promptsWithTests = [];
    
    for (const prompt of prompts) {
      const tests = await PromptTest.find({
        promptId: prompt._id,
        status: 'completed'
      }).lean();

      if (tests.length === 0) continue;

      // Check if any test has brand mentions
      const testsWithBrands = tests.filter(test => {
        const mentioned = test.brandMetrics?.filter(bm => bm.mentioned) || [];
        return mentioned.length > 0;
      });

      if (testsWithBrands.length > 0) {
        promptsWithTests.push({
          prompt,
          tests: testsWithBrands,
          platforms: testsWithBrands.map(t => t.llmProvider),
          brands: [...new Set(testsWithBrands.flatMap(t => 
            t.brandMetrics?.filter(bm => bm.mentioned).map(bm => bm.brandName) || []
          ))]
        });
      }
    }

    if (promptsWithTests.length === 0) {
      console.log('❌ No prompts with completed tests and brand mentions found');
      process.exit(1);
    }

    console.log(`\n✅ Found ${promptsWithTests.length} prompts with completed tests\n`);
    console.log('TOP 5 PROMPTS FOR SUBJECTIVE METRICS EVALUATION:');
    console.log('='.repeat(80));

    // Display top 5 prompts
    promptsWithTests.slice(0, 5).forEach((item, index) => {
      const { prompt, tests, platforms, brands } = item;
      
      console.log(`\n${index + 1}. Prompt ID: ${prompt._id}`);
      console.log(`   Query: ${prompt.text.substring(0, 80)}...`);
      console.log(`   Status: ${prompt.status}`);
      console.log(`   Created: ${prompt.createdAt}`);
      console.log(`   Completed Tests: ${tests.length}`);
      console.log(`   Platforms: ${platforms.join(', ')}`);
      console.log(`   Brands Mentioned: ${brands.length}`);
      
      console.log(`\n   Top Brands:`);
      brands.slice(0, 3).forEach((brand, idx) => {
        // Count mentions across all platforms
        const totalMentions = tests.reduce((sum, test) => {
          const brandMetric = test.brandMetrics?.find(
            bm => bm.brandName === brand
          );
          return sum + (brandMetric?.mentionCount || 0);
        }, 0);
        
        console.log(`   ${idx + 1}. ${brand} - ${totalMentions} total mentions across ${platforms.length} platforms`);
      });
      
      console.log(`\n   💡 Test Command:`);
      console.log(`   node src/scripts/testSubjectiveMetrics.js ${prompt._id} "${brands[0]}"`);
      console.log('   ' + '-'.repeat(76));
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Copy one of the test commands above to run subjective metrics evaluation');
    console.log('💡 This will evaluate the brand across ALL platform responses for that prompt\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Get userId from command line if provided
const userId = process.argv[2];

if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
  console.log('\n❌ Invalid userId format!');
  console.log('Must be a valid MongoDB ObjectId (24 hex characters)\n');
  process.exit(1);
}

findTestPrompt(userId);
