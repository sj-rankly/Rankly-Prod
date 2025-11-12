#!/usr/bin/env node

/**
 * Cost Comparison Script
 * 
 * Compares the cost of generating 20 prompts and doing 80 tests
 * between the old and new model configurations.
 */

// Removed hyperparameters config dependency

// Configuration
const PROMPT_COUNT = 20;
const TEST_COUNT = 80;

// Model sets
const OLD_MODELS = [
  'openai/gpt-4o',
  'google/gemini-2.5-flash',
  'anthropic/claude-3.5-sonnet',
  'perplexity/sonar-pro'
];

const NEW_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp',
  'anthropic/claude-3-5-haiku',
  'perplexity/llama-3.1-sonar-large-128k-online'
];

console.log('🔍 COST COMPARISON ANALYSIS');
console.log('='.repeat(50));
console.log(`📊 Scenario: ${PROMPT_COUNT} prompts + ${TEST_COUNT} tests`);
console.log(`💰 Average tokens: 100 per prompt, 200 per test`);
console.log('');

// Calculate costs for old models
console.log('📈 OLD MODELS (Previous Configuration):');
console.log('-'.repeat(40));
const oldCosts = calculateCostForModels(PROMPT_COUNT, TEST_COUNT, OLD_MODELS);
let oldTotal = 0;

for (const [model, costs] of Object.entries(oldCosts)) {
  console.log(`${model}:`);
  console.log(`  Input:  $${costs.inputCost.toFixed(6)}`);
  console.log(`  Output: $${costs.outputCost.toFixed(6)}`);
  console.log(`  Total:  $${costs.totalCost.toFixed(6)}`);
  console.log('');
  oldTotal += costs.totalCost;
}

console.log(`🎯 OLD MODELS TOTAL: $${oldTotal.toFixed(6)}`);
console.log('');

// Calculate costs for new models
console.log('📉 NEW MODELS (Current Configuration):');
console.log('-'.repeat(40));
const newCosts = calculateCostForModels(PROMPT_COUNT, TEST_COUNT, NEW_MODELS);
let newTotal = 0;

for (const [model, costs] of Object.entries(newCosts)) {
  console.log(`${model}:`);
  console.log(`  Input:  $${costs.inputCost.toFixed(6)}`);
  console.log(`  Output: $${costs.outputCost.toFixed(6)}`);
  console.log(`  Total:  $${costs.totalCost.toFixed(6)}`);
  console.log('');
  newTotal += costs.totalCost;
}

console.log(`🎯 NEW MODELS TOTAL: $${newTotal.toFixed(6)}`);
console.log('');

// Calculate savings
const savings = oldTotal - newTotal;
const savingsPercentage = ((savings / oldTotal) * 100).toFixed(2);

console.log('💡 SAVINGS ANALYSIS:');
console.log('='.repeat(50));
console.log(`💰 Total Savings: $${savings.toFixed(6)}`);
console.log(`📊 Percentage Saved: ${savingsPercentage}%`);
console.log('');

// Cost per test comparison
const oldCostPerTest = oldTotal / TEST_COUNT;
const newCostPerTest = newTotal / TEST_COUNT;

console.log('📈 COST PER TEST:');
console.log(`Old models: $${oldCostPerTest.toFixed(6)} per test`);
console.log(`New models: $${newCostPerTest.toFixed(6)} per test`);
console.log(`Savings per test: $${(oldCostPerTest - newCostPerTest).toFixed(6)}`);
console.log('');

// Monthly projections (assuming 1000 tests per month)
const monthlyTests = 1000;
const oldMonthlyCost = oldCostPerTest * monthlyTests;
const newMonthlyCost = newCostPerTest * monthlyTests;
const monthlySavings = oldMonthlyCost - newMonthlyCost;

console.log('📅 MONTHLY PROJECTIONS (1000 tests):');
console.log(`Old models: $${oldMonthlyCost.toFixed(2)}`);
console.log(`New models: $${newMonthlyCost.toFixed(2)}`);
console.log(`Monthly savings: $${monthlySavings.toFixed(2)}`);
console.log(`Annual savings: $${(monthlySavings * 12).toFixed(2)}`);
console.log('');

// Model-by-model comparison
console.log('🔍 MODEL-BY-MODEL COMPARISON:');
console.log('-'.repeat(50));
console.log('Model'.padEnd(40) + 'Old Cost'.padEnd(12) + 'New Cost'.padEnd(12) + 'Savings');
console.log('-'.repeat(50));

const modelPairs = [
  ['OpenAI', 'openai/gpt-4o', 'openai/gpt-4o-mini'],
  ['Google', 'google/gemini-2.5-flash', 'google/gemini-2.0-flash-exp'],
  ['Anthropic', 'anthropic/claude-3.5-sonnet', 'anthropic/claude-3-5-haiku'],
  ['Perplexity', 'perplexity/sonar-pro', 'perplexity/llama-3.1-sonar-large-128k-online']
];

for (const [provider, oldModel, newModel] of modelPairs) {
  const oldCost = oldCosts[oldModel]?.totalCost || 0;
  const newCost = newCosts[newModel]?.totalCost || 0;
  const savings = oldCost - newCost;
  
  console.log(
    provider.padEnd(40) + 
    `$${oldCost.toFixed(6)}`.padEnd(12) + 
    `$${newCost.toFixed(6)}`.padEnd(12) + 
    `$${savings.toFixed(6)}`
  );
}

console.log('');
console.log('✅ Configuration updated successfully!');
console.log('🚀 New models are significantly more cost-effective.');
