/**
 * LLM API calling logic for prompt testing
 */
const axios = require('axios');

/**
 * Get system prompt for LLMs to request citations
 * @returns {string} - System prompt text
 */
function getLLMSystemPrompt() {
  return `You are a helpful AI assistant providing comprehensive answers to user questions.

IMPORTANT: When providing information about companies, brands, products, or services, please include relevant citations and links whenever possible. This helps users verify information and access additional resources.

Guidelines for citations:
1. Include hyperlinks to official websites, documentation, or authoritative sources
2. Use markdown link format: [link text](https://example.com)
3. Provide citations for:
   - Company websites and official pages
   - Product documentation and features
   - Reviews and testimonials (when available)
   - Pricing and service information
   - News articles and press releases

If you cannot find or provide specific links, mention that information is based on your training data and suggest where users might find more current information.

Be thorough, accurate, and helpful in your responses.`;
}

/**
 * Call a specific LLM via OpenRouter with retry logic
 * @param {string} promptText - The prompt to send
 * @param {string} llmProvider - LLM provider name
 * @param {object} promptDoc - Original prompt document
 * @param {object} config - Configuration object with API key, base URL, models, etc.
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<object>} - LLM response with metadata
 */
async function callLLM(promptText, llmProvider, promptDoc, config, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds
  const startTime = Date.now();

  try {
    const model = config.llmModels[llmProvider];
    if (retryCount === 0) {
      console.log(`      🌐 [API] Calling ${llmProvider} (${model})...`);
    }

    const response = await axios.post(
      `${config.openRouterBaseUrl}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: getLLMSystemPrompt()
          },
          {
            role: 'user',
            content: promptText
          }
        ],
        temperature: 0.6, // Reduced for more consistent outputs
        top_p: 0.9, // Nucleus sampling for focused responses
        max_tokens: 1500, // Reduced to control costs
        frequency_penalty: 0.3, // Discourage repetition
        presence_penalty: 0.3 // Encourage variety
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouterApiKey}`,
          'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'https://rankly.ai',
          'X-Title': 'Rankly AEO Platform',
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 minute timeout (with retry logic, this is safe and faster failure detection)
      }
    );

    // Check if response structure is valid
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.error(`❌ Invalid response structure for LLM call (${llmProvider}):`, response.data);
      throw new Error('Invalid response from AI service');
    }

    const responseTime = Date.now() - startTime;
    const content = response.data.choices[0].message.content;
    
    // Check if content looks like an error message
    if (typeof content === 'string' && (
      content.toLowerCase().includes('too many requests') ||
      content.toLowerCase().includes('rate limit') ||
      content.toLowerCase().includes('error') ||
      content.toLowerCase().includes('unauthorized') ||
      content.toLowerCase().includes('forbidden') ||
      content.startsWith('Too many') ||
      content.startsWith('Rate limit') ||
      content.startsWith('Error:') ||
      content.startsWith('Unauthorized') ||
      content.startsWith('Forbidden')
    )) {
      console.error(`❌ API returned error message instead of response for ${llmProvider}:`, content);
      throw new Error(`AI service returned error: ${content}`);
    }
    const tokensUsed = response.data.usage?.total_tokens || 0;

    // Extract citations from response using citation extraction service
    const citationExtractionService = require('../citationExtractionService');
    const citations = citationExtractionService.extractCitations(response.data, llmProvider, content);

    if (retryCount > 0) {
      console.log(`      ✅ [API] ${llmProvider} responded after ${retryCount} retry(ies) in ${responseTime}ms (${tokensUsed} tokens, ${content.length} chars, ${citations.length} citations)`);
    } else {
      console.log(`      ✅ [API] ${llmProvider} responded in ${responseTime}ms (${tokensUsed} tokens, ${content.length} chars, ${citations.length} citations)`);
    }

    return {
      response: content,
      citations,
      responseTime,
      tokensUsed,
      model: model
    };

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    
    // Check if error is retryable and retry with exponential backoff
    const isRetryableError = (err) => {
      // Rate limiting
      if (err.response?.status === 429) return true;
      // Server errors (5xx)
      if (err.response?.status >= 500 && err.response?.status < 600) return true;
      // Network errors
      if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;
      // Timeout errors
      if (err.message?.includes('timeout') || err.code === 'ECONNABORTED') return true;
      return false;
    };
    
    // Retry on retryable errors
    if (isRetryableError(error) && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff: 2s, 4s, 8s
      const errorType = error.response?.status === 429 ? 'Rate limit' : 
                       error.response?.status >= 500 ? 'Server error' :
                       'Network error';
      console.warn(`      ⚠️  [${llmProvider}] ${errorType} encountered - retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callLLM(promptText, llmProvider, promptDoc, config, retryCount + 1);
    }
    
    // For non-retryable errors or max retries exceeded, throw error
    console.error(`      ❌ [API ERROR] ${llmProvider} failed${retryCount > 0 ? ` after ${retryCount} retries` : ''}:`, errorMsg);
    if (error.response?.status) {
      console.error(`      Status: ${error.response.status}`);
    }
    throw new Error(`${llmProvider} API call failed: ${errorMsg}`);
  }
}

module.exports = {
  callLLM,
  getLLMSystemPrompt
};


