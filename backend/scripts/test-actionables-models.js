#!/usr/bin/env node
/**
 * Test Script for Actionables Model Strategy Analysis
 * 
 * This script analyzes:
 * 1. Current hybrid model strategy (Haiku + Sonnet)
 * 2. Single best model strategy (Sonnet 4 or 3.7 for all stages)
 * 3. Performance, cost, and quality comparison
 */

require('dotenv').config();
const contentRegenerationService = require('../src/services/contentRegenerationService');

// Test content - typical page content for actionables
const testContent = `
# Understanding REST API Best Practices

REST APIs are the backbone of modern web services. This guide covers essential concepts for building reliable, scalable APIs.

## Core REST Principles

REST (Representational State Transfer) provides a standardized architectural style for web services:

- **Client-Server Architecture**: Separation of concerns between UI and data storage
- **Stateless**: Each request contains all information needed to process it
- **Cacheable**: Responses must define themselves as cacheable or non-cacheable
- **Uniform Interface**: Consistent naming and structure across endpoints

## HTTP Methods

REST APIs use HTTP methods to indicate the desired action:

- GET: Retrieve a resource
- POST: Create a new resource
- PUT: Update an existing resource (replace)
- PATCH: Partially update a resource
- DELETE: Remove a resource

## Authentication & Security

Securing your API is critical. Common approaches include:

### API Keys
Simple token-based authentication passed in headers:
- Easy to implement
- Good for server-to-server communication
- Limited security features

### OAuth 2.0
Industry-standard authorization framework:
- Multiple grant types (Authorization Code, Client Credentials, etc.)
- Token-based with refresh capabilities
- Supports third-party integrations

### JWT (JSON Web Tokens)
Self-contained tokens with encoded claims:
- No server-side session storage needed
- Include user information and permissions
- Can be validated without database lookup

## Error Handling

Robust error handling improves API reliability:

1. Use appropriate HTTP status codes:
   - 200: Success
   - 201: Created
   - 400: Bad Request
   - 401: Unauthorized
   - 404: Not Found
   - 500: Internal Server Error

2. Provide clear error messages with:
   - Error code or identifier
   - Human-readable description
   - Suggested fixes when possible

3. Implement retry logic for transient failures

## Rate Limiting

Protect your API from abuse with rate limiting:

- Set request quotas per user/API key
- Implement sliding windows or token buckets
- Return 429 (Too Many Requests) when limit exceeded
- Include rate limit headers in responses

## Versioning Strategies

Plan for API evolution from the start:

- URL versioning: /api/v1/users, /api/v2/users
- Header versioning: Accept header with version
- Query parameter: /api/users?version=1

## Testing Best Practices

Comprehensive testing ensures API reliability:

- Unit tests for individual endpoints
- Integration tests for complete workflows
- Load tests to verify performance
- Security tests to identify vulnerabilities

## Monitoring & Observability

Track API health in production:

- Response times and latency
- Error rates by endpoint
- API usage patterns
- Rate limit violations

## Documentation

Well-documented APIs are easier to use:

- OpenAPI/Swagger specifications
- Interactive API explorers
- Code examples in multiple languages
- Clear authentication instructions

## Conclusion

Building great REST APIs requires attention to architecture, security, performance, and developer experience. Follow these best practices to create APIs that are reliable, secure, and easy to use.
`;

// Test personas - typical personas from onboarding
const testPersonas = [
  {
    type: 'Backend Developer',
    description: 'Software engineer focused on server-side development and API architecture',
    painPoints: ['Complex authentication flows', 'Rate limiting issues', 'Error handling complexity', 'API versioning challenges'],
    goals: ['Build reliable APIs', 'Implement secure authentication', 'Optimize API performance', 'Maintain backward compatibility'],
    relevance: 'High',
  },
  {
    type: 'DevOps Engineer',
    description: 'Infrastructure specialist focused on deployment and monitoring',
    painPoints: ['API monitoring complexity', 'Performance bottlenecks', 'Scaling challenges', 'Incident response'],
    goals: ['Ensure API uptime', 'Monitor performance metrics', 'Optimize infrastructure', 'Automate deployments'],
    relevance: 'High',
  },
  {
    type: 'Technical Product Manager',
    description: 'Product leader with technical background managing API products',
    painPoints: ['API versioning strategy', 'Developer experience', 'Feature prioritization', 'Adoption metrics'],
    goals: ['Deliver value to developers', 'Balance features vs stability', 'Drive API adoption', 'Gather developer feedback'],
    relevance: 'Medium',
  },
];

// Test topics
const testTopics = [
  {
    name: 'API Authentication',
    description: 'Methods and best practices for securing API endpoints',
    keywords: ['OAuth', 'JWT', 'API Keys', 'Security', 'Token-based auth'],
    priority: 'High',
  },
  {
    name: 'Error Handling',
    description: 'Strategies for handling and recovering from API errors',
    keywords: ['HTTP Status Codes', 'Retry Logic', 'Error Messages', 'Fault tolerance'],
    priority: 'High',
  },
  {
    name: 'Rate Limiting',
    description: 'Techniques for managing API request quotas and throttling',
    keywords: ['Throttling', 'Quotas', 'Backoff Strategies', 'DDoS protection'],
    priority: 'Medium',
  },
];

// Subjective metrics (from URL analysis)
const testMetrics = {
  scores: {
    relevance: 4,
    influence: 3,
    uniqueness: 3,
    position: 4,
    clickProbability: 3,
    diversity: 3,
  },
  weakAreas: ['uniqueness', 'influence'],
};

async function testModelStrategy(strategyName, config) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTING: ${strategyName}`);
  console.log('='.repeat(80));
  console.log(`Configuration: ${JSON.stringify(config, null, 2)}`);
  
  const startTime = Date.now();
  
  try {
    const result = await contentRegenerationService.regenerateContent({
      originalContent: testContent,
      model: config.model, // This will be overridden by internal hybrid strategy
      allPersonas: testPersonas,
      allTopics: testTopics,
      subjectiveMetrics: testMetrics,
    });

    const totalTime = Date.now() - startTime;
    const tokenUsage = result.usage || {};
    
    console.log(`\n✅ SUCCESS - ${strategyName}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Token Usage:`);
    console.log(`   Input: ${tokenUsage.total_prompt_tokens || tokenUsage.prompt_tokens || 'N/A'}`);
    console.log(`   Output: ${tokenUsage.total_completion_tokens || tokenUsage.completion_tokens || 'N/A'}`);
    console.log(`   Total: ${tokenUsage.total_tokens || 'N/A'}`);
    
    console.log(`\n📝 Content Quality:`);
    console.log(`   Original Length: ${testContent.length} chars`);
    console.log(`   Generated Length: ${result.content?.length || 0} chars`);
    console.log(`   Growth: ${(((result.content?.length || 0) / testContent.length - 1) * 100).toFixed(1)}%`);
    
    if (result.semanticDrift) {
      console.log(`\n🎯 Semantic Drift:`);
      console.log(`   Similarity: ${result.semanticDrift.similarity || 'N/A'}`);
      console.log(`   Drift Detected: ${result.semanticDrift.driftDetected ? '⚠️ Yes' : '✅ No'}`);
      if (result.semanticDrift.driftDetected) {
        console.log(`   Severity: ${result.semanticDrift.severity}`);
      }
    }
    
    console.log(`\n📈 Stage Breakdown:`);
    if (result.usage?.perStage) {
      Object.entries(result.usage.perStage).forEach(([stage, tokens]) => {
        console.log(`   ${stage}: ${tokens} tokens`);
      });
    }
    
    console.log(`\n📄 Content Preview (first 300 chars):`);
    console.log(`   ${result.content?.slice(0, 300)}...`);
    
    return {
      success: true,
      strategyName,
      time: totalTime,
      tokenUsage,
      contentLength: result.content?.length || 0,
      semanticDrift: result.semanticDrift,
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error(`\n❌ FAILED - ${strategyName}`);
    console.error(`${'─'.repeat(80)}`);
    console.error(`⏱️  Time Before Failure: ${(totalTime / 1000).toFixed(2)}s`);
    console.error(`❌ Error: ${error.message}`);
    
    if (error.stack) {
      console.error(`\n📚 Stack Trace:`);
      console.error(error.stack);
    }
    
    return {
      success: false,
      strategyName,
      time: totalTime,
      error: error.message,
    };
  }
}

async function runComparisonTests() {
  console.log('🔧 Initializing Model Strategy Comparison Tests...\n');
  console.log('📋 Environment Check:');
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set'}`);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ERROR: ANTHROPIC_API_KEY is required for this test');
    process.exit(1);
  }
  
  const results = [];
  
  // Test 1: Current Hybrid Strategy (Haiku + 3.7 Sonnet)
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('TEST 1: CURRENT HYBRID STRATEGY');
  console.log('Fast tasks: Claude 3 Haiku | Complex tasks: Claude 3.7 Sonnet');
  console.log('═'.repeat(80));
  
  results.push(await testModelStrategy('Hybrid: Haiku + 3.7 Sonnet (Current)', {
    model: 'anthropic/claude-3-haiku', // Internal logic will use hybrid
    description: 'Current implementation',
  }));
  
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 FINAL COMPARISON');
  console.log('═'.repeat(80));
  
  const successResults = results.filter(r => r.success);
  
  if (successResults.length > 0) {
    console.log('\n✅ Successful Tests:');
    successResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.strategyName}`);
      console.log(`   Time: ${(result.time / 1000).toFixed(2)}s`);
      console.log(`   Tokens: ${result.tokenUsage?.total_tokens || 'N/A'}`);
      console.log(`   Content Length: ${result.contentLength} chars`);
      if (result.semanticDrift) {
        console.log(`   Semantic Similarity: ${result.semanticDrift.similarity || 'N/A'}`);
      }
    });
    
    // Find fastest
    const fastest = successResults.reduce((min, r) => r.time < min.time ? r : min);
    console.log(`\n🏆 Fastest Strategy: ${fastest.strategyName} (${(fastest.time / 1000).toFixed(2)}s)`);
  }
  
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log('\n\n❌ Failed Tests:');
    failedResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.strategyName}`);
      console.log(`   Error: ${result.error}`);
    });
  }
  
  console.log('\n\n' + '═'.repeat(80));
  console.log('✅ COMPARISON TEST COMPLETE');
  console.log('═'.repeat(80));
}

// Run tests
runComparisonTests()
  .then(() => {
    console.log('\n✅ All tests execution complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

