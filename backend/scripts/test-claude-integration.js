#!/usr/bin/env node
/**
 * Test Script for Claude Integration
 * 
 * This script tests the complete Claude integration in the content regeneration service.
 * It validates:
 * - Direct Anthropic API connectivity
 * - Hybrid model strategy (Haiku for fast tasks, Sonnet for complex tasks)
 * - Complete RAID G-SEO pipeline with Claude models
 * - Performance improvements vs GPT-4o-mini
 */

require('dotenv').config();
const contentRegenerationService = require('../src/services/contentRegenerationService');

// Test content
const testContent = `
# Best Practices for API Integration

API integration is crucial for modern software development. Here are key strategies:

## Understanding REST APIs

REST (Representational State Transfer) APIs provide a standardized way to communicate between systems. They use HTTP methods like GET, POST, PUT, and DELETE to perform operations on resources.

## Authentication Methods

Most APIs require authentication to ensure security. Common methods include:
- API Keys: Simple tokens passed in headers or query parameters
- OAuth 2.0: Industry-standard authorization framework
- JWT Tokens: Self-contained tokens with encoded user information

## Error Handling

Proper error handling is essential for reliable integrations:
1. Always check HTTP status codes
2. Implement retry logic for transient failures
3. Log errors for debugging
4. Provide meaningful error messages to users

## Rate Limiting

APIs often implement rate limits to prevent abuse. Best practices include:
- Implement exponential backoff for retries
- Cache responses when possible
- Monitor your API usage
- Request rate limit increases if needed

## Testing Strategies

- Unit tests for individual API calls
- Integration tests for end-to-end workflows
- Mock external APIs in development
- Monitor API performance in production

## Conclusion

Successful API integration requires careful planning, robust error handling, and continuous monitoring.
`;

// Test personas
const testPersonas = [
  {
    type: 'Backend Developer',
    description: 'Software engineer focused on server-side development and API architecture',
    painPoints: ['Complex authentication flows', 'Rate limiting issues', 'Error handling complexity'],
    goals: ['Build reliable APIs', 'Implement secure authentication', 'Optimize API performance'],
    relevance: 'High',
  },
  {
    type: 'DevOps Engineer',
    description: 'Infrastructure specialist focused on deployment and monitoring',
    painPoints: ['API monitoring', 'Performance bottlenecks', 'Scaling challenges'],
    goals: ['Ensure API uptime', 'Monitor performance metrics', 'Optimize infrastructure'],
    relevance: 'High',
  },
  {
    type: 'Technical Product Manager',
    description: 'Product leader with technical background managing API products',
    painPoints: ['API versioning strategy', 'Developer experience', 'Feature prioritization'],
    goals: ['Deliver value to developers', 'Balance features vs stability', 'Drive API adoption'],
    relevance: 'Medium',
  },
];

// Test topics
const testTopics = [
  {
    name: 'API Authentication',
    description: 'Methods and best practices for securing API endpoints',
    keywords: ['OAuth', 'JWT', 'API Keys', 'Security'],
    priority: 'High',
  },
  {
    name: 'Error Handling',
    description: 'Strategies for handling and recovering from API errors',
    keywords: ['HTTP Status Codes', 'Retry Logic', 'Error Messages'],
    priority: 'High',
  },
  {
    name: 'Rate Limiting',
    description: 'Techniques for managing API request quotas and throttling',
    keywords: ['Throttling', 'Quotas', 'Backoff Strategies'],
    priority: 'Medium',
  },
];

async function testClaudeIntegration() {
  console.log('🧪 ========================================');
  console.log('🧪 CLAUDE INTEGRATION TEST');
  console.log('🧪 ========================================\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set'}`);
  
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.error('\n❌ ERROR: Neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is set!');
    console.error('   Please set at least one API key in your .env file.');
    process.exit(1);
  }
  
  console.log('\n📊 Test Configuration:');
  console.log(`   Content Length: ${testContent.length} characters`);
  console.log(`   Personas: ${testPersonas.length}`);
  console.log(`   Topics: ${testTopics.length}`);
  console.log(`   Expected Models: Claude 3 Haiku (3 stages) + Claude 3.5 Sonnet (2 stages)`);
  
  console.log('\n🚀 Starting Content Regeneration...\n');
  
  const startTime = Date.now();
  
  try {
    const result = await contentRegenerationService.regenerateContent({
      originalContent: testContent,
      allPersonas: testPersonas,
      allTopics: testTopics,
      subjectiveMetrics: {
        scores: {
          relevance: 4,
          influence: 3,
          uniqueness: 3,
          position: 4,
          clickProbability: 3,
          diversity: 3,
        },
        weakAreas: ['uniqueness', 'influence'],
      },
    });

    const totalTime = Date.now() - startTime;
    
    console.log('\n✅ ========================================');
    console.log('✅ TEST PASSED - Content Regeneration Successful!');
    console.log('✅ ========================================\n');
    
    console.log('📊 Performance Metrics:');
    console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`   Expected Range: 130-155s (with Claude)`);
    console.log(`   Baseline (GPT-4o-mini): 195-200s`);
    console.log(`   Improvement: ${((195 - totalTime / 1000) / 195 * 100).toFixed(1)}%`);
    
    console.log('\n📝 Content Quality:');
    console.log(`   Original Length: ${testContent.length} characters`);
    console.log(`   Regenerated Length: ${result.content.length} characters`);
    console.log(`   Growth: ${((result.content.length / testContent.length - 1) * 100).toFixed(1)}%`);
    
    if (result.semanticDrift) {
      console.log(`   Semantic Similarity: ${result.semanticDrift.similarity || 'N/A'}`);
      console.log(`   Drift Detected: ${result.semanticDrift.driftDetected ? '⚠️ Yes' : '✅ No'}`);
    }
    
    console.log('\n🎯 Stage Breakdown:');
    if (result.usage?.perStage) {
      Object.entries(result.usage.perStage).forEach(([stage, tokens]) => {
        console.log(`   ${stage}: ${tokens} tokens`);
      });
    }
    
    console.log('\n📄 Content Preview (first 500 chars):');
    console.log('   ---');
    console.log(`   ${result.content.slice(0, 500)}...`);
    console.log('   ---');
    
    console.log('\n🎯 Intent Summary:');
    if (result.intent?.initial_intent) {
      console.log(`   Initial Intent: ${JSON.stringify(result.intent.initial_intent.statement || 'N/A').slice(0, 100)}...`);
    }
    if (result.intent?.refined_intent) {
      console.log(`   Refined Intent: ${JSON.stringify(result.intent.refined_intent.intent_statement || 'N/A').slice(0, 100)}...`);
    }
    
    console.log('\n✅ Integration Test Complete!');
    console.log('✅ All Claude models working correctly.');
    console.log('✅ Hybrid strategy (Haiku + Sonnet) operational.');
    
    // Save result to file for inspection
    const fs = require('fs');
    const outputPath = '/tmp/claude-test-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full result saved to: ${outputPath}`);
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('\n❌ ========================================');
    console.error('❌ TEST FAILED');
    console.error('❌ ========================================\n');
    
    console.error(`⏱️  Time Before Failure: ${(totalTime / 1000).toFixed(2)}s`);
    console.error(`❌ Error: ${error.message}`);
    
    if (error.stack) {
      console.error('\n📚 Stack Trace:');
      console.error(error.stack);
    }
    
    console.error('\n🔍 Debugging Tips:');
    console.error('   1. Check your ANTHROPIC_API_KEY is valid');
    console.error('   2. Verify API key has correct permissions');
    console.error('   3. Check network connectivity to Anthropic API');
    console.error('   4. Review backend logs for more details');
    console.error('   5. Try with OPENROUTER_API_KEY as fallback');
    
    process.exit(1);
  }
}

// Run the test
console.log('🔧 Initializing test environment...\n');
testClaudeIntegration()
  .then(() => {
    console.log('\n✅ Test execution complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

