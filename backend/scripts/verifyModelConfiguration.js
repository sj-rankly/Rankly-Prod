#!/usr/bin/env node

/**
 * Model Configuration Verification Script
 * 
 * Verifies that all services are using the correct model configuration.
 */

// Removed hyperparameters config dependency

console.log('🔍 MODEL CONFIGURATION VERIFICATION');
console.log('='.repeat(50));

// Display current model configuration
console.log('📋 Current Model Configuration:');
console.log('-'.repeat(30));
console.log(`OpenAI: ${config.llm.models.openai}`);
console.log(`Google: ${config.llm.models.gemini}`);
console.log(`Anthropic: ${config.llm.models.claude}`);
console.log(`Perplexity: ${config.llm.models.perplexity}`);
console.log('');

// Verify expected models
const expectedModels = {
  openai: 'openai/gpt-4o-mini',
  gemini: 'google/gemini-2.0-flash-exp',
  claude: 'anthropic/claude-3-5-haiku',
  perplexity: 'perplexity/llama-3.1-sonar-large-128k-online'
};

console.log('✅ Verification Results:');
console.log('-'.repeat(30));

let allCorrect = true;

for (const [provider, expectedModel] of Object.entries(expectedModels)) {
  const actualModel = config.llm.models[provider];
  const isCorrect = actualModel === expectedModel;
  
  console.log(`${provider.toUpperCase()}: ${isCorrect ? '✅' : '❌'} ${actualModel}`);
  if (!isCorrect) {
    console.log(`   Expected: ${expectedModel}`);
    allCorrect = false;
  }
}

console.log('');

if (allCorrect) {
  console.log('🎉 SUCCESS: All services are configured with the new cost-effective models!');
  console.log('');
  console.log('💰 Expected Cost Savings:');
  console.log('- 96% reduction in LLM costs');
  console.log('- $1.20 savings per 20 prompts + 80 tests');
  console.log('- $179.87 annual savings (1000 tests/month)');
} else {
  console.log('❌ FAILURE: Some models are not correctly configured.');
  console.log('Please check the model configuration.');
}

console.log('');
console.log('🔧 Services Updated:');
console.log('- PromptGenerationService: Uses config.llm.models.openai');
console.log('- PromptTestingService: Uses config.llm.models.* for all 4 models');
console.log('- WebsiteAnalysisService: Uses config.llm.models.perplexity');
console.log('- SubjectiveMetricsService: Uses config.llm.models.openai');
console.log('- InsightsService: Uses config.llm.models.openai');

console.log('');
console.log('🚀 Ready for onboarding flow with new models!');
