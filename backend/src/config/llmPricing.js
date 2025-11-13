/**
 * LLM Pricing Configuration
 * Prices are per 1 million tokens (USD)
 * Updated as of November 2024
 * 
 * Sources:
 * - OpenRouter: https://openrouter.ai/models
 * - Anthropic: https://www.anthropic.com/pricing
 * - OpenAI: https://openai.com/api/pricing/
 */

const LLM_PRICING = {
  // ============================================
  // OpenAI Models (via OpenRouter)
  // ============================================
  openai: {
    'gpt-4o': {
      input: 2.50,   // $2.50 per 1M input tokens
      output: 10.00, // $10.00 per 1M output tokens
    },
    'gpt-4o-mini': {
      input: 0.15,   // $0.15 per 1M input tokens
      output: 0.60,  // $0.60 per 1M output tokens
    },
    'gpt-4-turbo': {
      input: 10.00,  // $10.00 per 1M input tokens
      output: 30.00, // $30.00 per 1M output tokens
    },
    'gpt-4': {
      input: 30.00,  // $30.00 per 1M input tokens
      output: 60.00, // $60.00 per 1M output tokens
    },
    'gpt-3.5-turbo': {
      input: 0.50,   // $0.50 per 1M input tokens
      output: 1.50,  // $1.50 per 1M output tokens
    },
    'text-embedding-3-small': {
      input: 0.02,   // $0.02 per 1M tokens (embeddings don't have output)
      output: 0.00,
    },
    'text-embedding-3-large': {
      input: 0.13,   // $0.13 per 1M tokens
      output: 0.00,
    },
  },

  // ============================================
  // Anthropic Claude Models (Direct API)
  // ============================================
  anthropic: {
    // Claude 3.x Haiku
    'claude-3-haiku': {
      input: 0.25,   // $0.25 per 1M input tokens
      output: 1.25,  // $1.25 per 1M output tokens
    },
    'claude-3-haiku-20240307': {
      input: 0.25,
      output: 1.25,
    },
    'claude-3-5-haiku': {
      input: 1.00,   // $1.00 per 1M input tokens
      output: 5.00,  // $5.00 per 1M output tokens
    },
    'claude-3-5-haiku-20241022': {
      input: 1.00,
      output: 5.00,
    },

    // Claude 3.x Sonnet
    'claude-3-sonnet': {
      input: 3.00,   // $3.00 per 1M input tokens
      output: 15.00, // $15.00 per 1M output tokens
    },
    'claude-3-sonnet-20240229': {
      input: 3.00,
      output: 15.00,
    },
    'claude-3-5-sonnet': {
      input: 3.00,   // $3.00 per 1M input tokens
      output: 15.00, // $15.00 per 1M output tokens
    },
    'claude-3-5-sonnet-20241022': {
      input: 3.00,
      output: 15.00,
    },
    'claude-3-7-sonnet-20250219': {
      input: 3.00,   // Claude 3.7 Sonnet (successor to 3.5)
      output: 15.00,
    },

    // Claude 3.x Opus
    'claude-3-opus': {
      input: 15.00,  // $15.00 per 1M input tokens
      output: 75.00, // $75.00 per 1M output tokens
    },
    'claude-3-opus-20240229': {
      input: 15.00,
      output: 75.00,
    },

    // Claude 4.x Sonnet
    'claude-sonnet-4': {
      input: 3.00,   // $3.00 per 1M input tokens (estimated)
      output: 15.00, // $15.00 per 1M output tokens (estimated)
    },
    'claude-sonnet-4-20250514': {
      input: 3.00,
      output: 15.00,
    },
    'claude-sonnet-4-5': {
      input: 3.00,
      output: 15.00,
    },
    'claude-sonnet-4-5-20250929': {
      input: 3.00,
      output: 15.00,
    },

    // Claude 4.x Opus
    'claude-opus-4': {
      input: 15.00,  // $15.00 per 1M input tokens (estimated)
      output: 75.00, // $75.00 per 1M output tokens (estimated)
    },
    'claude-opus-4-20250514': {
      input: 15.00,
      output: 75.00,
    },
    'claude-opus-4-1': {
      input: 15.00,
      output: 75.00,
    },
    'claude-opus-4-1-20250805': {
      input: 15.00,
      output: 75.00,
    },

    // Claude 4.x Haiku
    'claude-haiku-4-5': {
      input: 1.00,   // $1.00 per 1M input tokens (estimated)
      output: 5.00,  // $5.00 per 1M output tokens (estimated)
    },
    'claude-haiku-4-5-20251001': {
      input: 1.00,
      output: 5.00,
    },
  },

  // ============================================
  // Google Gemini Models (via OpenRouter)
  // ============================================
  gemini: {
    'gemini-2.0-flash-001': {
      input: 0.10,   // $0.10 per 1M input tokens (estimated via OpenRouter)
      output: 0.40,  // $0.40 per 1M output tokens (estimated)
    },
    'gemini-2.0-flash-001:online': {
      input: 0.10,
      output: 0.40,
    },
    'gemini-pro': {
      input: 0.50,
      output: 1.50,
    },
    'gemini-flash': {
      input: 0.075,
      output: 0.30,
    },
  },

  // ============================================
  // Perplexity Models (via OpenRouter)
  // ============================================
  perplexity: {
    'sonar': {
      input: 1.00,   // $1.00 per 1M input tokens (estimated via OpenRouter)
      output: 1.00,  // $1.00 per 1M output tokens (estimated)
    },
    'sonar-online': {
      input: 1.00,
      output: 1.00,
    },
  },

  // ============================================
  // OpenRouter (generic fallback)
  // ============================================
  openrouter: {
    // Generic fallback pricing for unknown models
    'default': {
      input: 1.00,
      output: 1.00,
    },
  },
};

/**
 * Get pricing for a specific model
 * @param {string} provider - Provider name (openai, anthropic, gemini, perplexity)
 * @param {string} model - Model name
 * @returns {Object} Pricing object with input and output costs per 1M tokens
 */
function getModelPricing(provider, model) {
  // Normalize provider name
  const normalizedProvider = provider.toLowerCase();
  
  // Clean model name (remove provider prefix if present)
  let cleanModel = model;
  if (model.includes('/')) {
    const parts = model.split('/');
    cleanModel = parts[parts.length - 1];
  }
  
  // Remove :online suffix if present
  cleanModel = cleanModel.replace(':online', '');

  // Try to find exact match
  if (LLM_PRICING[normalizedProvider] && LLM_PRICING[normalizedProvider][cleanModel]) {
    return LLM_PRICING[normalizedProvider][cleanModel];
  }

  // Try with :online suffix
  const onlineModel = `${cleanModel}:online`;
  if (LLM_PRICING[normalizedProvider] && LLM_PRICING[normalizedProvider][onlineModel]) {
    return LLM_PRICING[normalizedProvider][onlineModel];
  }

  // Try to find partial match (for versioned models)
  if (LLM_PRICING[normalizedProvider]) {
    const providerPricing = LLM_PRICING[normalizedProvider];
    
    // Try exact match first
    for (const [key, pricing] of Object.entries(providerPricing)) {
      if (key === cleanModel || cleanModel.startsWith(key)) {
        return pricing;
      }
    }

    // Try partial match (model name contains key)
    for (const [key, pricing] of Object.entries(providerPricing)) {
      if (cleanModel.includes(key) || key.includes(cleanModel)) {
        return pricing;
      }
    }
  }

  // Fallback to default pricing
  console.warn(`⚠️ [Pricing] No pricing found for ${provider}/${model}, using default pricing`);
  return LLM_PRICING.openrouter.default;
}

/**
 * Calculate cost for API usage
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Total cost in USD
 */
function calculateCost(provider, model, inputTokens = 0, outputTokens = 0) {
  const pricing = getModelPricing(provider, model);
  
  // Calculate cost (pricing is per 1M tokens)
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Get all available providers
 */
function getAllProviders() {
  return Object.keys(LLM_PRICING);
}

/**
 * Get all models for a provider
 */
function getProviderModels(provider) {
  const normalizedProvider = provider.toLowerCase();
  if (LLM_PRICING[normalizedProvider]) {
    return Object.keys(LLM_PRICING[normalizedProvider]);
  }
  return [];
}

module.exports = {
  LLM_PRICING,
  getModelPricing,
  calculateCost,
  getAllProviders,
  getProviderModels,
};

