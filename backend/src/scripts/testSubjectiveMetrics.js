/**
 * Test Script for Subjective Metrics Service
 * 
 * This script tests the subjective metrics evaluation across ALL platform responses
 * 
 * Usage:
 * node src/scripts/testSubjectiveMetrics.js <promptId> <brandName>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const subjectiveMetricsService = require('../services/subjectiveMetricsService');
const Prompt = require('../models/Prompt');
const PromptTest = require('../models/PromptTest');
const SubjectiveMetrics = require('../models/SubjectiveMetrics');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testSubjectiveMetrics(promptId, brandName) {
  try {
    // Connect to MongoDB
    console.log(`\n${colors.cyan}Connecting to MongoDB...${colors.reset}`);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}\n`);

    // Fetch prompt to verify it exists
    console.log(`${colors.cyan}Fetching Prompt: ${promptId}${colors.reset}`);
    const prompt = await Prompt.findById(promptId).lean();
    
    if (!prompt) {
      console.log(`${colors.red}❌ Prompt not found!${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}✅ Prompt found${colors.reset}`);
    console.log(`   Query: ${prompt.text.substring(0, 100)}...`);
    console.log(`   Status: ${prompt.status}`);

    // Fetch all platform tests for this prompt
    const promptTests = await PromptTest.find({
      promptId: promptId,
      status: 'completed'
    }).lean();

    if (promptTests.length === 0) {
      console.log(`${colors.red}❌ No completed tests found for this prompt!${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}✅ Found ${promptTests.length} platform responses${colors.reset}`);
    console.log(`   Platforms: ${promptTests.map(pt => pt.llmProvider).join(', ')}`);

    // Check if brand is mentioned in any response
    let brandFound = false;
    let totalMentions = 0;
    const platformsWithBrand = [];

    promptTests.forEach(test => {
      const brandMetric = test.brandMetrics?.find(
        bm => bm.brandName.toLowerCase() === brandName.toLowerCase()
      );
      
      if (brandMetric && brandMetric.mentioned) {
        brandFound = true;
        totalMentions += brandMetric.mentionCount || 0;
        platformsWithBrand.push({
          platform: test.llmProvider,
          mentions: brandMetric.mentionCount,
          position: brandMetric.firstPosition,
          citations: brandMetric.citationMetrics?.totalCitations || 0
        });
      }
    });

    if (!brandFound) {
      console.log(`${colors.red}❌ Brand "${brandName}" not found in any platform response!${colors.reset}`);
      console.log(`\nAvailable brands in responses:`);
      
      const allBrands = new Set();
      promptTests.forEach(test => {
        test.brandMetrics?.forEach(bm => {
          if (bm.mentioned) {
            allBrands.add(bm.brandName);
          }
        });
      });
      
      Array.from(allBrands).forEach(brand => {
        console.log(`   - ${brand}`);
      });
      process.exit(1);
    }

    console.log(`${colors.green}✅ Brand "${brandName}" found in ${platformsWithBrand.length} platform(s)${colors.reset}`);
    console.log(`   Total mentions across all platforms: ${totalMentions}`);
    
    platformsWithBrand.forEach(p => {
      console.log(`   - ${p.platform}: ${p.mentions} mentions, position ${p.position}, ${p.citations} citations`);
    });

    // Check if metrics already exist
    const existingMetrics = await SubjectiveMetrics.findOne({
      promptId,
      brandName
    });

    if (existingMetrics) {
      console.log(`\n${colors.yellow}⚠️  Metrics already exist for this prompt + brand combination${colors.reset}`);
      console.log(`\nTo re-evaluate, delete existing metrics first:`);
      console.log(`${colors.cyan}db.subjectivemetrics.deleteOne({_id: ObjectId("${existingMetrics._id}")})${colors.reset}`);
      console.log(`\nOr view existing metrics below:\n`);
      displayMetrics(existingMetrics);
      process.exit(0);
    }

    // Evaluate metrics
    console.log(`\n${colors.cyan}${colors.bright}Starting Subjective Metrics Evaluation...${colors.reset}`);
    console.log(`${colors.yellow}Note: Evaluating across ${promptTests.length} platform responses${colors.reset}\n`);
    console.log('='.repeat(70));
    
    const startTime = Date.now();
    const metrics = await subjectiveMetricsService.evaluateMetrics(
      promptId,
      brandName,
      prompt.userId.toString()
    );
    const duration = Date.now() - startTime;

    console.log('='.repeat(70));
    console.log(`\n${colors.green}${colors.bright}✅ Evaluation Complete!${colors.reset}`);
    console.log(`Total time: ${duration}ms`);
    console.log(`Cost: $${metrics.cost.toFixed(4)}`);
    console.log(`Tokens: ${metrics.tokensUsed}`);
    console.log(`Platforms evaluated: ${platformsWithBrand.length}`);

    // Display results
    console.log(`\n${colors.cyan}${colors.bright}📊 SUBJECTIVE METRICS RESULTS${colors.reset}`);
    console.log(`${colors.yellow}Evaluated across: ${metrics.platform}${colors.reset}`);
    console.log('='.repeat(70));
    displayMetrics(metrics);

    // Save to file for inspection
    const fs = require('fs');
    const outputPath = './test-metrics-output.json';
    fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
    console.log(`\n${colors.green}✅ Full results saved to: ${outputPath}${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log(`${colors.cyan}MongoDB connection closed${colors.reset}\n`);
  }
}

function displayMetrics(metrics) {
  const scoreColor = (score) => {
    if (score >= 4) return colors.green;
    if (score >= 3) return colors.yellow;
    return colors.red;
  };

  console.log(`\n1. ${colors.bright}RELEVANCE${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.relevance.score)}${metrics.relevance.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.relevance.reasoning, 75)}`);

  console.log(`\n2. ${colors.bright}INFLUENCE${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.influence.score)}${metrics.influence.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.influence.reasoning, 75)}`);

  console.log(`\n3. ${colors.bright}UNIQUENESS${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.uniqueness.score)}${metrics.uniqueness.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.uniqueness.reasoning, 75)}`);

  console.log(`\n4. ${colors.bright}POSITION${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.position.score)}${metrics.position.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.position.reasoning, 75)}`);

  console.log(`\n5. ${colors.bright}CLICK PROBABILITY${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.clickProbability.score)}${metrics.clickProbability.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.clickProbability.reasoning, 75)}`);

  console.log(`\n6. ${colors.bright}DIVERSITY${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.diversity.score)}${metrics.diversity.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.diversity.reasoning, 75)}`);

  console.log(`\n${colors.cyan}${colors.bright}OVERALL QUALITY${colors.reset}`);
  console.log(`   Score: ${scoreColor(metrics.overallQuality.score)}${metrics.overallQuality.score}/5${colors.reset}`);
  console.log(`   ${wrapText(metrics.overallQuality.summary, 75)}`);

  const avgScore = (
    metrics.relevance.score +
    metrics.influence.score +
    metrics.uniqueness.score +
    metrics.position.score +
    metrics.clickProbability.score +
    metrics.diversity.score
  ) / 6;

  console.log(`\n${colors.bright}Average Score: ${scoreColor(avgScore)}${avgScore.toFixed(2)}/5${colors.reset}`);
  console.log('='.repeat(70));
}

// Helper to wrap long text
function wrapText(text, width) {
  if (text.length <= width) return text;
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length > width) {
      lines.push(currentLine.trim());
      currentLine = '   ' + word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n   ');
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`\n${colors.red}Usage: node testSubjectiveMetrics.js <promptId> <brandName>${colors.reset}`);
  console.log(`\nExample:`);
  console.log(`  node src/scripts/testSubjectiveMetrics.js 507f1f77bcf86cd799439011 "Stripe"\n`);
  console.log(`${colors.yellow}Note: This evaluates the brand across ALL platform responses for the prompt${colors.reset}\n`);
  process.exit(1);
}

const [promptId, brandName] = args;

// Validate promptId format
if (!mongoose.Types.ObjectId.isValid(promptId)) {
  console.log(`\n${colors.red}❌ Invalid promptId format!${colors.reset}`);
  console.log(`Must be a valid MongoDB ObjectId (24 hex characters)\n`);
  process.exit(1);
}

// Run test
testSubjectiveMetrics(promptId, brandName);
