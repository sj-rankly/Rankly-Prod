/**
 * Low-Cost Model Configuration
 * 
 * These models are significantly cheaper than production models,
 * allowing cost-effective testing of prompt combinations.
 * Estimated cost per test: ~$0.08 per URL (20 prompts × 4 LLMs × 80 tokens avg)
 */

const lowCostModels = {
  openai: 'openai/gpt-4o-mini',           
  gemini: 'google/gemini-2.0-flash-001',    
  claude: 'anthropic/claude-3-5-haiku',    
  perplexity: 'perplexity/sonar'
};

// Estimated pricing for cost calculation (per 1M tokens)
const pricing = {
  openai: {
    input: 0.15,   // $0.15 per 1M tokens
    output: 0.60   // $0.60 per 1M tokens
  },
  gemini: {
    input: 0.075,  // $0.075 per 1M tokens
    output: 0.30   // $0.30 per 1M tokens
  },
  claude: {
    input: 0.25,   // $0.25 per 1M tokens
    output: 1.25   // $1.25 per 1M tokens
  },
  perplexity: {
    input: 0.20,   // $0.20 per 1M tokens
    output: 0.20   // $0.20 per 1M tokens
  }
};

/**
 * Estimate cost for a single prompt test across all 4 LLMs
 * @param {number} avgInputTokens - Average input tokens per prompt (~80)
 * @param {number} avgOutputTokens - Average output tokens per response (~800)
 * @returns {number} Estimated cost in USD
 */
function estimateCostPerPrompt(avgInputTokens = 80, avgOutputTokens = 800) {
  let totalCost = 0;
  
  Object.keys(lowCostModels).forEach(provider => {
    const providerPricing = pricing[provider];
    const inputCost = (avgInputTokens / 1000000) * providerPricing.input;
    const outputCost = (avgOutputTokens / 1000000) * providerPricing.output;
    totalCost += inputCost + outputCost;
  });
  
  return totalCost;
}

/**
 * Estimate cost for a full test run
 * @param {number} numUrls - Number of URLs to test
 * @param {number} numCombinations - Number of test combinations
 * @param {number} shortsPerTest - Number of prompts per test (default: 20)
 * @returns {object} Cost breakdown
 */
function estimateTestCost(numUrls, numCombinations, promptsPerTest = 20) {
  const costPerPrompt = estimateCostPerPrompt();
  const totalPrompts = numUrls * numCombinations * promptsPerTest;
  const totalCost = totalPrompts * costPerPrompt;
  
  return {
    costPerPrompt: costPerPrompt.toFixed(4),
    totalPrompts,
    totalCost: totalCost.toFixed(2),
    costPerUrl: (totalCost / numUrls).toFixed(2),
    costPerCombination: (totalCost / numCombinations).toFixed(2)
  };
}

module.exports = {
  lowCostModels,
  pricing,
  estimateCostPerPrompt,
  estimateTestCost
};

