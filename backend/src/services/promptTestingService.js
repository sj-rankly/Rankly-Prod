const axios = require('axios');
const PromptTest = require('../models/PromptTest');
const Prompt = require('../models/Prompt');
const UrlAnalysis = require('../models/UrlAnalysis');

// Import modular services
const citationExtractionService = require('./citationExtractionService');
const citationClassificationService = require('./citationClassificationService');
const brandPatternService = require('./brandPatternService');
const sentimentAnalysisService = require('./sentimentAnalysisService');
const scoringService = require('./scoringService');

class PromptTestingService {
  constructor(options = {}) {
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    // Default LLM models configuration - Low-cost models for testing
    // ✅ FIX: Enable web search (:online) for better citation accuracy with real-time URLs
    // Web search allows models to access real-time web data and provide more accurate, specific URLs
    // instead of just domain names from training data
    this.llmModels = options.models || {
      openai: 'openai/gpt-4o-mini:online', // Enabled web search for real-time URLs
      gemini: 'google/gemini-2.0-flash-001:online', // Enabled web search for real-time URLs
      claude: 'anthropic/claude-3-5-haiku:online', // Enabled web search for real-time URLs
      perplexity: 'perplexity/sonar' // Perplexity already has web search built-in
    };

    // PHASE 1 OPTIMIZATION: Default prompt testing configuration
    // Changed default from 5 to Infinity (test all prompts) for better coverage
    // Users can still override with options.maxPromptsToTest if needed
    this.maxPromptsToTest = options.maxPromptsToTest ?? Infinity; // Test all prompts by default
    
    // Default parallelization setting
    this.aggressiveParallelization = true;
    
    // Testing strategy: 'all', 'sample', 'priority'
    this.testingStrategy = options.testingStrategy || 'all';

    console.log('📋 [LLM MODELS] Configured:', this.llmModels);
    console.log(`🎯 [TEST LIMIT] Max prompts to test: ${this.maxPromptsToTest === Infinity ? 'ALL (unlimited)' : this.maxPromptsToTest}`);
    console.log(`🎯 [TEST STRATEGY] Strategy: ${this.testingStrategy}`);
    console.log('🧪 PromptTestingService initialized (optimized - Phase 1)');
  }

  /**
   * Main function: Test all prompts for a user
   * @param {string} userId - User ID
   * @param {object} options - Testing options
   * @returns {Promise<object>} - Test results summary
   */
  async testAllPrompts(userId, options = {}) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 [TEST START] Starting prompt testing for user: ${userId}`);
      console.log(`📅 Timestamp: ${new Date().toISOString()}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // ✅ CRITICAL FIX: Filter prompts by urlAnalysisId if provided
      // Fetch active prompts for the user (filtered by urlAnalysisId if provided)
      console.log(`🔍 [QUERY] Fetching active prompts for user ${userId}...`);
      
      // Build query with optional urlAnalysisId filter
      const promptQuery = { 
        userId, 
        status: 'active',
        topicId: { $exists: true, $ne: null },
        personaId: { $exists: true, $ne: null },
        queryType: { $exists: true, $ne: null }
      };
      
      // ✅ CRITICAL FIX: Filter by urlAnalysisId if provided in options
      if (options.urlAnalysisId) {
        // ✅ FIX: Ensure urlAnalysisId is properly converted to ObjectId for query
        const mongoose = require('mongoose');
        const urlAnalysisId = typeof options.urlAnalysisId === 'string' 
          ? new mongoose.Types.ObjectId(options.urlAnalysisId)
          : options.urlAnalysisId;
        promptQuery.urlAnalysisId = urlAnalysisId;
        console.log(`🔍 [FILTER] Filtering prompts by urlAnalysisId: ${urlAnalysisId} (type: ${typeof urlAnalysisId})`);
      } else {
        console.warn('⚠️ [WARNING] No urlAnalysisId provided - will test prompts from ALL analyses (may mix data)');
      }
      
      console.log('🔍 [QUERY] Prompt query:', JSON.stringify(promptQuery, null, 2));
      const allPrompts = await Prompt.find(promptQuery)
        .populate('topicId')
        .populate('personaId')
        .lean();
      
      console.log(`🔍 [FILTER] Only fetching prompts with topicId, personaId, and queryType`);
      console.log(`✅ [QUERY] Found ${allPrompts.length} prompts${options.urlAnalysisId ? ` for analysis ${options.urlAnalysisId}` : ' (all analyses)'}`);
      
      // PHASE 1 OPTIMIZATION: Apply smart sampling if limit is set
      const testLimit = options.testLimit ?? options.maxPromptsToTest ?? this.maxPromptsToTest;
      
      let prompts;
      if (testLimit === Infinity || testLimit >= allPrompts.length) {
        // Test all prompts (no sampling needed)
        prompts = allPrompts;
        console.log(`✅ [TESTING MODE] Testing ALL ${prompts.length} prompts (unlimited mode)`);
      } else {
        // Apply smart sampling for subset
        prompts = this.samplePrompts(allPrompts, testLimit);
        console.log(`🎲 [SAMPLING] Selected ${prompts.length} prompts to test (limit: ${testLimit})`);
        console.log(`⚠️  [TESTING MODE] Testing ${prompts.length}/${allPrompts.length} prompts (${((prompts.length / allPrompts.length) * 100).toFixed(1)}% coverage)`);
      }
      
      if (prompts.length === 0) {
        console.error('❌ [ERROR] No prompts found for testing');
        throw new Error('No prompts found for testing');
      }
      
      console.log(`📊 [INFO] Prompts breakdown:`);
      prompts.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.text.substring(0, 50)}...`);
        console.log(`      Raw topicId type: ${typeof p.topicId}, value:`, p.topicId);
        console.log(`      Raw personaId type: ${typeof p.personaId}, value:`, p.personaId);
        console.log(`      Topic: ${p.topicId?.name || 'NULL'} (ID: ${p.topicId?._id || p.topicId || 'NULL'})`);
        console.log(`      Persona: ${p.personaId?.type || 'NULL'} (ID: ${p.personaId?._id || p.personaId || 'NULL'})`);
        console.log(`      QueryType: ${p.queryType || 'NULL'}`);
      });
      
      // Get URL analysis for this user (either specific one or latest)
      console.log(`\n🔗 [URL] Fetching URL analysis...`);
      let latestUrlAnalysis;
      
      if (options.urlAnalysisId) {
        // Use specific URL analysis if provided
        latestUrlAnalysis = await UrlAnalysis.findOne({ 
          _id: options.urlAnalysisId, 
          userId 
        }).lean();
        
        if (!latestUrlAnalysis) {
          throw new Error(`URL analysis ${options.urlAnalysisId} not found for user ${userId}`);
        }
        
        console.log(`   ✅ Using specific URL analysis: ${options.urlAnalysisId}`);
      } else {
        // Get latest URL analysis
        latestUrlAnalysis = await UrlAnalysis.findOne({ userId })
          .sort({ analysisDate: -1 })
          .lean();
        
        if (!latestUrlAnalysis) {
          throw new Error('No URL analysis found. Please complete onboarding first.');
        }
        
        console.log(`   ✅ Using latest URL analysis: ${latestUrlAnalysis._id}`);
      }

      console.log(`✅ [URL] Found URL analysis: ${latestUrlAnalysis.url} (ID: ${latestUrlAnalysis._id})`);

      // Get brand name for scoring context
      console.log(`\n🏢 [CONTEXT] Fetching brand context for scoring...`);
      // ✅ FIX: Pass urlAnalysisId to getBrandContext to ensure data isolation
      const brandContext = await this.getBrandContext(userId, latestUrlAnalysis._id);
      console.log(`✅ [CONTEXT] Brand: ${brandContext.companyName}, Competitors: ${brandContext.competitors.length}`);
      
      let flatResults;
      
      if (this.aggressiveParallelization) {
        // FIX #5: Rate-limited batching to prevent rate limit failures while maintaining performance
        const BATCH_SIZE = 10; // Process 10 prompts at a time (each prompt = 4 LLM calls = 40 concurrent calls)
        const RATE_LIMIT_DELAY = 100; // 100ms delay between batches to avoid rate limits
        
        console.log(`\n🚀 [RATE-LIMITED BATCHING] Processing ${prompts.length} prompts in batches of ${BATCH_SIZE}`);
        console.log(`⚡ With retry logic, this balances speed and reliability`);
        console.log(`${'─'.repeat(60)}\n`);
        
        const allStartTime = Date.now();
        const allResults = [];
        const totalBatches = Math.ceil(prompts.length / BATCH_SIZE);
        
        for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
          const batch = prompts.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          
          console.log(`   📦 [BATCH ${batchNum}/${totalBatches}] Processing ${batch.length} prompts...`);
          const batchStartTime = Date.now();
          
          // Process batch in parallel
          const batchResults = await Promise.allSettled(
            batch.map(prompt => this.testSinglePrompt(prompt, brandContext, latestUrlAnalysis._id))
          );
          
          const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
          allResults.push(...batchResults);
          
          const batchSuccess = batchResults.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(r => r && r.status === 'completed').length;
          const batchFailed = batchResults.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(r => r && r.status === 'failed').length;
          
          console.log(`   ✅ [BATCH ${batchNum}] Complete in ${batchDuration}s - Success: ${batchSuccess}, Failed: ${batchFailed}`);
          
          // Add delay between batches to avoid rate limits (except for last batch)
          if (i + BATCH_SIZE < prompts.length) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          }
        }
        
        const totalDuration = ((Date.now() - allStartTime) / 1000).toFixed(2);
        
        // Flatten results and handle any rejected promises
        flatResults = allResults
          .map(result => result.status === 'fulfilled' ? result.value : [])
          .flat()
          .filter(r => r && r !== null && r !== undefined);
        
        const completedTests = flatResults.filter(r => r.status === 'completed').length;
        const failedTests = flatResults.filter(r => r.status === 'failed').length;
        
        console.log(`\n✅ [BATCHING COMPLETE] All ${prompts.length} prompts processed in ${totalDuration}s`);
        console.log(`📊 Success: ${completedTests}, Failed: ${failedTests}\n`);
      } else {
        // FALLBACK: Process prompts in batches (safer for rate limits)
        const batchSize = options.batchSize || 5;
        const allResults = [];
        const totalBatches = Math.ceil(prompts.length / batchSize);
        
        console.log(`\n🔄 [BATCHING] Processing ${prompts.length} prompts in ${totalBatches} batches (size: ${batchSize})\n`);
        
        for (let i = 0; i < prompts.length; i += batchSize) {
          const batch = prompts.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          
          console.log(`${'─'.repeat(60)}`);
          console.log(`📦 [BATCH ${batchNum}/${totalBatches}] Processing ${batch.length} prompts`);
          console.log(`${'─'.repeat(60)}`);
          
          const batchStartTime = Date.now();
          const batchResults = await Promise.all(
            batch.map(prompt => this.testSinglePrompt(prompt, brandContext, latestUrlAnalysis._id))
          );
          const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
          
          allResults.push(...batchResults);
          
          const batchSuccess = batchResults.flat().filter(r => r && r.status === 'completed').length;
          const batchFailed = batchResults.flat().filter(r => r && r.status === 'failed').length;
          console.log(`✅ [BATCH ${batchNum}] Complete in ${batchDuration}s - Success: ${batchSuccess}, Failed: ${batchFailed}\n`);
        }
        
        flatResults = allResults.flat().filter(r => r !== null && r !== undefined);
      }
      
      // Calculate summary statistics
      console.log(`📊 [SUMMARY] Calculating aggregate statistics...`);
      const summary = this.calculateSummary(flatResults);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ [TEST COMPLETE] All testing finished`);
      console.log(`📊 Total Tests: ${flatResults.length}`);
      console.log(`✅ Completed: ${flatResults.filter(r => r.status === 'completed').length}`);
      console.log(`❌ Failed: ${flatResults.filter(r => r.status === 'failed').length}`);
      console.log(`📈 Avg Visibility: ${summary.averageVisibilityScore}%`);
      console.log(`🎯 Brand Mention Rate: ${summary.brandMentionRate}%`);
      console.log(`🏆 Best LLM: ${summary.bestPerformingLLM}`);
      console.log(`${'='.repeat(60)}\n`);
      
      return {
        success: true,
        summary,
        totalTests: flatResults.length,
        completedTests: flatResults.filter(r => r.status === 'completed').length,
        failedTests: flatResults.filter(r => r.status === 'failed').length
      };
      
    } catch (error) {
      console.error(`\n❌ [FATAL ERROR] Prompt testing failed:`, error);
      console.error(`Stack trace:`, error.stack);
      throw error;
    }
  }

  /**
   * Test a single prompt across all 4 LLMs
   * @param {object} prompt - Prompt document
   * @param {object} brandContext - Brand context for scoring
   * @param {string} urlAnalysisId - URL analysis ID to link test to
   * @returns {Promise<Array>} - Array of test results
   */
  async testSinglePrompt(prompt, brandContext, urlAnalysisId) {
    try {
      // Safety checks for demo reliability
      if (!prompt || typeof prompt !== 'object') {
        throw new Error('Invalid prompt object provided to testSinglePrompt');
      }
      if (!brandContext || typeof brandContext !== 'object') {
        console.warn('⚠️ [SAFETY] Invalid brandContext in testSinglePrompt, using defaults');
        brandContext = { companyName: 'Unknown Brand', competitors: [] };
      }
      if (!urlAnalysisId) {
        console.warn('⚠️ [SAFETY] Missing urlAnalysisId in testSinglePrompt');
        // Don't throw - continue with undefined (may cause save to fail gracefully)
      }

      const promptText = prompt.text || '';
      if (!promptText || promptText.trim().length === 0) {
        console.error('   ❌ [ERROR] Prompt text is empty, cannot test');
        throw new Error('Prompt text is empty');
      }
      
      console.log(`\n🔬 [PROMPT] Testing: "${promptText.substring(0, 60)}..."`);
      console.log(`   Prompt ID: ${prompt._id || 'MISSING'}`);
      console.log(`   Query Type: ${prompt.queryType || 'MISSING'}`);
      console.log(`   Topic ID: ${prompt.topicId?._id || prompt.topicId || 'MISSING'}`);
      console.log(`   Persona ID: ${prompt.personaId?._id || prompt.personaId || 'MISSING'}`);
      
      // Step 1: Send prompt to all 4 LLMs in parallel
      console.log(`   🚀 [STEP 1] Sending to 4 LLMs in parallel...`);
      const llmStartTime = Date.now();

      const llmResponses = await Promise.allSettled([
        this.callLLM(promptText, 'openai', prompt),
        this.callLLM(promptText, 'gemini', prompt),
        this.callLLM(promptText, 'claude', prompt),
        this.callLLM(promptText, 'perplexity', prompt)
      ]);
      
      const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(2);
      const llmSuccess = llmResponses.filter(r => r.status === 'fulfilled').length;
      console.log(`   ✅ [STEP 1] LLM calls complete in ${llmDuration}s (${llmSuccess}/4 successful)`);
      
      // Step 2: Score each response in parallel
      console.log(`   🎯 [STEP 2] Scoring ${llmResponses.length} responses...`);
      const scoringStartTime = Date.now();
      
      const scoringPromises = llmResponses.map(async (result, index) => {
        const llmProvider = ['openai', 'gemini', 'claude', 'perplexity'][index];
        
        if (result.status === 'rejected') {
          console.error(`   ❌ [${llmProvider.toUpperCase()}] LLM call failed:`, result.reason.message);
          return this.createFailedTest(prompt, llmProvider, result.reason.message, urlAnalysisId);
        }
        
        const llmResponse = result.value;
        console.log(`   📝 [${llmProvider.toUpperCase()}] Response received (${llmResponse.responseTime}ms, ${llmResponse.tokensUsed} tokens)`);

        try {
          // Calculate metrics deterministically from citations and brand mentions
          // Safety check: validate llmResponse structure
          if (!llmResponse || typeof llmResponse !== 'object' || !llmResponse.response) {
            console.error(`   ❌ [${llmProvider.toUpperCase()}] Invalid LLM response structure`);
            return this.createFailedTest(prompt, llmProvider, 'Invalid LLM response structure', urlAnalysisId);
          }

          // Calculate metrics deterministically from citations and brand mentions
          const scorecard = scoringService.calculateDeterministicScore(
            llmResponse.response || '',
            llmResponse.citations || [],
            brandContext
          );

          console.log(`   ✅ [${llmProvider.toUpperCase()}] Score calculated - Visibility: ${scorecard.visibilityScore}/100, Overall: ${scorecard.overallScore}/100`);

          // Save test result to database
          const testResult = await this.saveTestResult(
            prompt,
            llmProvider,
            llmResponse,
            scorecard,
            urlAnalysisId,
            brandContext
          );
          
          console.log(`   💾 [${llmProvider.toUpperCase()}] Saved to database (ID: ${testResult._id})`);
          return testResult;
          
        } catch (scoringError) {
          console.error(`   ❌ [${llmProvider.toUpperCase()}] Scoring failed:`, scoringError.message);
          return this.createFailedTest(prompt, llmProvider, scoringError.message, urlAnalysisId);
        }
      });
      
      const results = await Promise.all(scoringPromises);
      const scoringDuration = ((Date.now() - scoringStartTime) / 1000).toFixed(2);
      const scoringSuccess = results.filter(r => r && r.status === 'completed').length;
      
      console.log(`   ✅ [STEP 2] Scoring complete in ${scoringDuration}s (${scoringSuccess}/4 successful)`);
      console.log(`   ✨ [COMPLETE] Prompt testing finished\n`);
      
      return results;
      
    } catch (error) {
      console.error(`   ❌ [ERROR] Failed to test prompt ${prompt._id}:`, error.message);
      console.error(`   Stack:`, error.stack);
      throw error;
    }
  }

  /**
   * Get system prompt for LLMs to request citations
   * @returns {string} - System prompt text
   */
  getLLMSystemPrompt() {
    const { getLLMSystemPrompt } = require('./promptTesting/llm');
    return getLLMSystemPrompt();
  }

  /**
   * Call a specific LLM via OpenRouter with retry logic
   * @param {string} promptText - The prompt to send
   * @param {string} llmProvider - LLM provider name
   * @param {object} promptDoc - Original prompt document
   * @param {number} retryCount - Current retry attempt (internal use)
   * @returns {Promise<object>} - LLM response with metadata
   */
  async callLLM(promptText, llmProvider, promptDoc, retryCount = 0) {
    const { callLLM: callLLMModule } = require('./promptTesting/llm');
    const config = {
      openRouterApiKey: this.openRouterApiKey,
      openRouterBaseUrl: this.openRouterBaseUrl,
      llmModels: this.llmModels
    };
    return callLLMModule(promptText, llmProvider, promptDoc, config, retryCount);
  }

  /**
   * Legacy callLLM implementation - kept for reference
   * @deprecated Use the modular version from promptTesting/llm
   */
  async callLLMLegacy(promptText, llmProvider, promptDoc, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    const startTime = Date.now();

    try {
      const model = this.llmModels[llmProvider];
      if (retryCount === 0) {
        console.log(`      🌐 [API] Calling ${llmProvider} (${model})...`);
      }

      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: this.getLLMSystemPrompt()
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
            'Authorization': `Bearer ${this.openRouterApiKey}`,
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
      
      // FIX #4: Check if error is retryable and retry with exponential backoff
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
        return this.callLLM(promptText, llmProvider, promptDoc, retryCount + 1);
      }
      
      // For non-retryable errors or max retries exceeded, throw error
      console.error(`      ❌ [API ERROR] ${llmProvider} failed${retryCount > 0 ? ` after ${retryCount} retries` : ''}:`, errorMsg);
      if (error.response?.status) {
        console.error(`      Status: ${error.response.status}`);
      }
      throw new Error(`${llmProvider} API call failed: ${errorMsg}`);
    }
  }

  /**
   * Extract brand metrics from response text with sentence-level data
   * @param {string} responseText - LLM response
   * @param {Array} citations - Extracted citations
   * @param {string} brandName - Primary brand name
   * @param {Array} competitors - Competitor brands
   * @returns {Array} - brandMetrics array with complete data
   */
  extractBrandMetrics(responseText, citations, brandName, competitors = []) {
    // Safety checks for demo reliability
    if (!responseText || typeof responseText !== 'string') {
      console.warn('⚠️ [SAFETY] Invalid responseText in extractBrandMetrics, using empty string');
      responseText = '';
    }
    if (!brandName || typeof brandName !== 'string') {
      console.warn('⚠️ [SAFETY] Invalid brandName in extractBrandMetrics, using fallback');
      brandName = 'Unknown Brand';
    }
    if (!Array.isArray(citations)) {
      console.warn('⚠️ [SAFETY] Invalid citations array, using empty array');
      citations = [];
    }
    if (!Array.isArray(competitors)) {
      console.warn('⚠️ [SAFETY] Invalid competitors array, using empty array');
      competitors = [];
    }

    // ✅ FIX: Use metricsExtractionService for sophisticated brand detection
    const metricsExtractionService = require('./metricsExtractionService');

    // Split response into sentences
    const sentences = responseText
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0);

    // ✅ FIX: Build expected brands set for validation
    const expectedBrands = new Set([brandName]);
    competitors.filter(c => c && c.name).forEach(c => expectedBrands.add(c.name));
    
    const allBrands = [brandName, ...competitors.filter(c => c && c.name).map(c => c.name)];
    const brandMetrics = [];

    // Process each brand
    allBrands.forEach((brand) => {
      // ✅ FIX: Validate that brand is in expected list (prevent false positives)
      if (!expectedBrands.has(brand)) {
        console.warn(`⚠️ [VALIDATION] Skipping unexpected brand: ${brand} (not in expected list)`);
        return;
      }

      // ✅ FIX: Use sophisticated brand detection instead of simple regex
      // This uses multi-strategy detection: exact match, abbreviation, partial, fuzzy, variation
      const brandPatterns = brandPatternService.generateBrandPatterns(brand);
      
      // Count brand mentions and track sentences using sophisticated detection
      const brandSentences = [];
      let mentionCount = 0;
      let firstPosition = null;
      let totalWordCount = 0;

      sentences.forEach((sentence, idx) => {
        // ✅ FIX: Use containsBrand() for accurate detection with word boundaries
        const detectionResult = metricsExtractionService.containsBrand(sentence, brand);
        
        if (detectionResult.detected) {
          // Count mentions using word-boundary pattern matching for accuracy
          let sentenceMentions = 0;
          for (const pattern of brandPatterns) {
            // Use word boundaries to avoid false positives
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Only use word boundaries for multi-word patterns or single words > 3 chars
            const useWordBoundary = pattern.split(/\s+/).length > 1 || pattern.length > 3;
            const regex = useWordBoundary 
              ? new RegExp(`\\b${escaped}\\b`, 'gi')
              : new RegExp(escaped, 'gi');
            const matches = (sentence.match(regex) || []).length;
            sentenceMentions += matches;
          }
          
          // Use at least 1 mention if detected (even if pattern matching found 0)
          mentionCount += Math.max(sentenceMentions, 1);

          if (firstPosition === null) {
            firstPosition = idx + 1; // 1-indexed
          }

          const words = sentence.trim().split(/\s+/).length;
          totalWordCount += words;

          brandSentences.push({
            text: sentence.trim(),
            position: idx,        // 0-indexed for depth calculation
            wordCount: words
          });
        }
      });

      // Get and categorize citations for this brand using the new classification system
      // Use intelligent brand pattern generation for citation classification
      const citationBrandPatterns = brandPatternService.generateBrandPatterns(brand);
      
      // Safety check: ensure citations is an array
      if (!Array.isArray(citations)) {
        console.warn(`⚠️ [SAFETY] Citations is not an array for brand ${brand}, using empty array`);
        citations = [];
      }
      
      // Filter citations that match this brand using the same logic as calculateDeterministicScore
      const allBrandCitations = citations.filter(cit => {
        if (!cit || typeof cit !== 'object' || !cit.url || typeof cit.url !== 'string') {
          return false;
        }
        const urlLower = cit.url.toLowerCase();
        
        // ✅ FIX: Citation markers are just placeholder references, not actual citations
        if (cit.url.startsWith('citation_')) {
          return false; // Don't count citation markers as citations
        }
        
        // For URLs, check if they contain any of the brand patterns
        return citationBrandPatterns.some(pattern => 
          urlLower.includes(pattern.toLowerCase().replace(/\s+/g, ''))
        );
      });

      // Categorize citations using the new classification system
      let brandCitationsCount = 0;
      let earnedCitationsCount = 0;
      let socialCitationsCount = 0;

      // Create all brands list for classification
      const allBrandsForClassification = [brand, ...competitors.map(c => c.name)];
      
      const categorizedCitations = allBrandCitations.map(cit => {
        // Clean and validate URL first
        const urlValidation = citationClassificationService.cleanAndValidateUrl(cit.url);
        
        // Skip invalid URLs
        if (!urlValidation.valid || !urlValidation.domain) {
          return null;
        }
        
        const classification = citationClassificationService.categorizeCitation(urlValidation.cleanedUrl, brand, allBrandsForClassification);
        
        // Only count if classification is valid and not unknown
        if (classification.type === 'brand' && classification.brand === brand) {
          brandCitationsCount++;
        } else if (classification.type === 'earned') {
          earnedCitationsCount++;
        } else if (classification.type === 'social') {
          socialCitationsCount++;
        } else {
          // Skip unknown/invalid citations
          return null;
        }

        return {
          url: urlValidation.cleanedUrl, // Use cleaned URL
          type: classification.type,
          brand: classification.brand,
          confidence: classification.confidence || 0.8, // Ensure confidence is always set
          context: cit.text || 'Citation'
        };
      }).filter(cit => cit !== null); // Remove null entries

      // Analyze sentiment for this brand
      const sentimentAnalysis = sentimentAnalysisService.analyzeSentiment(responseText, brand);

      // ✅ FIX: Recalculate citationMetrics from actual categorizedCitations array to ensure accuracy
      // This ensures citationMetrics matches the actual citations array
      const actualBrandCitations = categorizedCitations.filter(c => c.type === 'brand' && c.brand === brand).length;
      const actualEarnedCitations = categorizedCitations.filter(c => c.type === 'earned').length;
      const actualSocialCitations = categorizedCitations.filter(c => c.type === 'social').length;
      const actualTotalCitations = categorizedCitations.length;

      // Only add to metrics if brand was mentioned
      if (mentionCount > 0) {
        brandMetrics.push({
          brandName: brand,
          mentioned: true,
          firstPosition,
          mentionCount,
          sentences: brandSentences,        // For depth calculation
          totalWordCount: totalWordCount,   // For depth calculation
          citationMetrics: {
            // ✅ FIX: Use actual counts from categorizedCitations array
            brandCitations: actualBrandCitations,
            earnedCitations: actualEarnedCitations,
            socialCitations: actualSocialCitations,
            totalCitations: actualTotalCitations
          },
          sentiment: sentimentAnalysis.sentiment,
          sentimentScore: sentimentAnalysis.sentimentScore,
          sentimentDrivers: sentimentAnalysis.drivers,
          citations: categorizedCitations,
          // NEW: owner flag
          isOwner: (brand.trim().toLowerCase() === brandName.trim().toLowerCase())
        });
      }
    });

    // Add earned citations to primary brand if mentioned
    // These are citations that weren't matched to any brand, so classify them as earned
    const assignedUrls = new Set(
      brandMetrics.flatMap(bm => bm.citations.map(c => c.url))
    );
    const unassignedCitations = citations.filter(cit => !assignedUrls.has(cit.url));

    if (unassignedCitations.length > 0 && brandMetrics.length > 0) {
      const allBrandsForClassification = [brandName, ...competitors.map(c => c.name)];
      
      const validUnassignedCitations = unassignedCitations
        .map(cit => {
          // Classify unassigned citations properly (should be earned or social)
          // Clean and validate URL first
          const urlValidation = citationClassificationService.cleanAndValidateUrl(cit.url);
          if (!urlValidation.valid || !urlValidation.domain) {
            return null; // Skip invalid URLs
          }
          
          const classification = citationClassificationService.categorizeCitation(urlValidation.cleanedUrl, brandName, allBrandsForClassification);
          
          // Only include valid classifications
          if (classification.type === 'unknown') {
            return null;
          }
          
          return {
            url: urlValidation.cleanedUrl, // Use cleaned URL
            type: classification.type === 'unknown' ? 'earned' : classification.type, // Default to earned if unknown
            brand: classification.brand,
            confidence: classification.confidence || 0.8, // Default confidence for earned citations
            context: cit.text || 'Citation'
          };
        })
        .filter(cit => cit !== null); // Remove null entries
      
      brandMetrics[0].citations.push(...validUnassignedCitations);
    }

    return brandMetrics;
  }

  /**
   * Save test result to database
   */
  async saveTestResult(prompt, llmProvider, llmResponse, scorecard, urlAnalysisId, brandContext) {
    try {
      console.log(`      💾 [SAVE] Preparing to save test result for ${llmProvider}`);

      // Safety checks for demo reliability
      if (!prompt || typeof prompt !== 'object') {
        throw new Error('Invalid prompt object provided to saveTestResult');
      }
      if (!llmResponse || typeof llmResponse !== 'object') {
        throw new Error('Invalid llmResponse object provided to saveTestResult');
      }
      if (!scorecard || typeof scorecard !== 'object') {
        console.warn('      ⚠️ [SAFETY] Invalid scorecard, using default');
        scorecard = scoringService.getDefaultScorecard();
      }

      // Extract IDs from populated objects if needed
      const topicId = prompt.topicId?._id || prompt.topicId;
      const personaId = prompt.personaId?._id || prompt.personaId;

      console.log(`      📋 [SAVE] Extracted IDs - topicId: ${topicId}, personaId: ${personaId}, queryType: ${prompt.queryType}`);

      // Ensure we have the required fields with graceful fallback
      if (!topicId || !personaId || !prompt.queryType) {
        console.error(`      ❌ [SAVE ERROR] Missing required fields in prompt:`, {
          topicId,
          personaId,
          queryType: prompt.queryType,
          promptId: prompt._id,
          rawTopicId: prompt.topicId,
          rawPersonaId: prompt.personaId
        });
        // For demo reliability, create a failed test instead of throwing
        console.warn('      ⚠️ [SAFETY] Creating failed test instead of throwing error');
        return await this.createFailedTest(
          prompt,
          llmProvider,
          `Missing required fields: topicId=${!!topicId}, personaId=${!!personaId}, queryType=${!!prompt.queryType}`,
          urlAnalysisId
        );
      }

      // Safety check: ensure brandContext is valid
      if (!brandContext || typeof brandContext !== 'object') {
        console.warn('      ⚠️ [SAFETY] Invalid brandContext, using defaults');
        brandContext = { companyName: 'Unknown Brand', competitors: [] };
      }

      // Extract complete brand metrics (mentions, positions, sentences, citations)
      const brandMetrics = this.extractBrandMetrics(
        llmResponse.response || '',
        llmResponse.citations || [],
        brandContext.companyName || 'Unknown Brand',
        brandContext.competitors || []
      );

      console.log(`      📊 [SAVE] Extracted ${brandMetrics.length} brand entries with complete metrics`);

      // Calculate response metadata for depth calculations
      const sentences = llmResponse.response.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const totalSentences = sentences.length;
      const totalWords = llmResponse.response.trim().split(/\s+/).length;

      const testResult = new PromptTest({
        userId: prompt.userId,
        urlAnalysisId: urlAnalysisId,
        promptId: prompt._id,
        topicId: topicId,
        personaId: personaId,
        promptText: prompt.text,
        queryType: prompt.queryType,
        llmProvider: llmProvider,
        llmModel: llmResponse.model,
        rawResponse: llmResponse.response,
        responseTime: llmResponse.responseTime,
        tokensUsed: llmResponse.tokensUsed,
        scorecard: scorecard,
        brandMetrics: brandMetrics,
        responseMetadata: {
          totalSentences: totalSentences,
          totalWords: totalWords,
          totalBrandsDetected: brandMetrics.length
        },
        status: 'completed',
        scoredAt: new Date()
      });

      await testResult.save();
      console.log(`      ✅ [SAVE] Test result saved successfully with ${brandMetrics.length} brand metrics`);
      return testResult;

    } catch (error) {
      console.error('      ❌ [SAVE ERROR] Failed to save test result:', error.message);
      throw error;
    }
  }

  /**
   * Create a failed test record
   */
  async createFailedTest(prompt, llmProvider, errorMessage, urlAnalysisId) {
    try {
      console.log(`      💾 [FAILED TEST] Saving failed test for ${llmProvider}`);

      // Extract IDs from populated objects if needed
      const topicId = prompt.topicId?._id || prompt.topicId;
      const personaId = prompt.personaId?._id || prompt.personaId;

      // Check if we have required fields, return plain object if not (can't save)
      if (!topicId || !personaId || !prompt.queryType) {
        console.error(`      ❌ [FAILED TEST] Cannot save - missing required fields`);
        return {
          status: 'failed',
          error: errorMessage,
          llmProvider: llmProvider
        };
      }

      const testResult = new PromptTest({
        userId: prompt.userId,
        urlAnalysisId: urlAnalysisId,
        promptId: prompt._id,
        topicId: topicId,
        personaId: personaId,
        promptText: prompt.text,
        queryType: prompt.queryType,
        llmProvider: llmProvider,
        llmModel: this.llmModels[llmProvider],
        rawResponse: 'N/A - Test Failed',
        scorecard: scoringService.getDefaultScorecard(),
        status: 'failed',
        error: errorMessage
      });
      
      await testResult.save();
      console.log(`      ✅ [FAILED TEST] Saved to database`);
      return testResult;
      
    } catch (error) {
      console.error('      ❌ [FAILED TEST ERROR] Could not save:', error.message);
      // Return a plain object instead of null to avoid null reference errors
      return {
        status: 'failed',
        error: errorMessage,
        llmProvider: llmProvider
      };
    }
  }

  /**
   * Smart sampling: Select a balanced subset of prompts
   * Ensures even distribution across topic×persona combinations
   * @param {Array} prompts - All available prompts
   * @param {number} limit - Maximum number of prompts to select
   * @returns {Array} - Sampled prompts
   */
  samplePrompts(prompts, limit) {
    const { samplePrompts: samplePromptsModule } = require('./promptTesting/sampling');
    return samplePromptsModule(prompts, limit);
  }

  /**
   * Legacy samplePrompts implementation - kept for reference
   * @deprecated Use the modular version from promptTesting/sampling
   */
  samplePromptsLegacy(prompts, limit) {
    if (prompts.length <= limit) {
      console.log(`   ℹ️  All ${prompts.length} prompts will be tested (under limit of ${limit})`);
      return prompts;
    }

    // Group prompts by topic×persona combination for balanced sampling
    const promptsByCombination = {};
    prompts.forEach(prompt => {
      const topicId = prompt.topicId?._id || prompt.topicId;
      const personaId = prompt.personaId?._id || prompt.personaId;
      const combinationKey = `${topicId}_${personaId}`;
      
      if (!promptsByCombination[combinationKey]) {
        promptsByCombination[combinationKey] = [];
      }
      promptsByCombination[combinationKey].push(prompt);
    });

    const combinations = Object.keys(promptsByCombination).sort(); // Sort for deterministic order
    const promptsPerCombination = Math.floor(limit / combinations.length);
    const remainder = limit % combinations.length;

    console.log(`   📊 Sampling strategy:`);
    console.log(`      - Total prompts: ${prompts.length}`);
    console.log(`      - Limit: ${limit}`);
    console.log(`      - Topic×Persona combinations: ${combinations.length}`);
    console.log(`      - Per combination: ${promptsPerCombination} (+ ${remainder} for first ${remainder} combinations)`);

    const sampledPrompts = [];

    // Sample evenly from each topic×persona combination
    combinations.forEach((combinationKey, index) => {
      const comboPrompts = promptsByCombination[combinationKey];
      // Add 1 extra to first few combinations to handle remainder
      const sampleCount = index < remainder ? promptsPerCombination + 1 : promptsPerCombination;
      
      // Randomly sample from this combination
      const shuffled = comboPrompts.sort(() => Math.random() - 0.5);
      const sampled = shuffled.slice(0, Math.min(sampleCount, comboPrompts.length));
      
      const topicName = sampled[0]?.topicId?.name || 'Unknown';
      const personaName = sampled[0]?.personaId?.type || 'Unknown';
      console.log(`      - ${topicName} × ${personaName}: ${sampled.length}/${comboPrompts.length} prompts`);
      sampledPrompts.push(...sampled);
    });

    console.log(`   ✅ Final sample: ${sampledPrompts.length} prompts selected`);
    return sampledPrompts;
  }

  async getBrandContext(userId, urlAnalysisId = null) {
    try {
      const UrlAnalysis = require('../models/UrlAnalysis');
      const Competitor = require('../models/Competitor');
      
      // ✅ FIX: Filter by urlAnalysisId if provided to ensure data isolation
      let analysis;
      if (urlAnalysisId) {
        analysis = await UrlAnalysis.findOne({ 
          _id: urlAnalysisId,
          userId 
        }).lean();
        console.log(`🔍 [getBrandContext] Filtering by urlAnalysisId: ${urlAnalysisId}`);
      } else {
        console.warn('⚠️ [getBrandContext] No urlAnalysisId provided, using latest analysis (may mix data)');
        const analysisList = await UrlAnalysis.find({ userId })
          .sort({ analysisDate: -1 })
          .limit(1)
          .lean();
        analysis = analysisList[0] || null;
      }
      
      // ✅ FIX: Filter competitors by urlAnalysisId if provided
      const competitorQuery = { userId, selected: true };
      if (urlAnalysisId) {
        competitorQuery.urlAnalysisId = urlAnalysisId;
      } else {
        console.warn('⚠️ [getBrandContext] No urlAnalysisId for competitors query, may get competitors from other analyses');
      }
      
      const competitors = await Competitor.find(competitorQuery)
        .limit(4)
        .lean();
      
      // Extract correct brand name from URL if stored name is "Unknown Product"
      let companyName = analysis?.brandContext?.companyName || 'Unknown';
      
      if (companyName === 'Unknown Product' && analysis?.url) {
        try {
          const url = new URL(analysis.url);
          const domain = url.hostname.replace('www.', '');
          const domainParts = domain.split('.');
          if (domainParts.length > 1) {
            // Use the generic domain-to-brand mapping function from citation classification service
            companyName = citationClassificationService.extractBrandFromDomain(domain);
          }
        } catch {
          // URL parsing failed, keep original name
        }
      }
      
      return {
        companyName: companyName,
        competitors: competitors.map(c => ({ name: c.name, url: c.url }))
      };
      
    } catch (error) {
      console.error('❌ Failed to get brand context:', error);
      return { companyName: 'Unknown', competitors: [] };
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(results) {
    const { calculateSummary: calculateSummaryModule } = require('./promptTesting/summary');
    return calculateSummaryModule(results);
  }

  /**
   * Legacy calculateSummary implementation - kept for reference
   * @deprecated Use the modular version from promptTesting/summary
   */
  calculateSummaryLegacy(results) {
    // Filter out null/undefined results
    const validResults = results.filter(r => r !== null && r !== undefined);
    const completed = validResults.filter(r => r.status === 'completed');
    
    console.log(`   📊 [CALC] Valid results: ${validResults.length}, Completed: ${completed.length}`);
    
    if (completed.length === 0) {
      console.log(`   ⚠️  [CALC] No completed tests to summarize`);
      return {
        averageVisibilityScore: 0,
        averageOverallScore: 0,
        brandMentionRate: 0,
        bestPerformingLLM: 'none',
        worstPerformingLLM: 'none',
        llmPerformance: {}
      };
    }
    
    const avgVisibility = completed.reduce((sum, r) => sum + r.scorecard.visibilityScore, 0) / completed.length;
    const avgOverall = completed.reduce((sum, r) => sum + r.scorecard.overallScore, 0) / completed.length;
    const mentionRate = (completed.filter(r => r.scorecard.brandMentioned).length / completed.length) * 100;
    
    // Calculate average score per LLM
    const llmScores = {};
    completed.forEach(r => {
      if (!llmScores[r.llmProvider]) {
        llmScores[r.llmProvider] = [];
      }
      llmScores[r.llmProvider].push(r.scorecard.overallScore);
    });
    
    const llmAverages = {};
    for (const [llm, scores] of Object.entries(llmScores)) {
      llmAverages[llm] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    
    const sortedLLMs = Object.entries(llmAverages).sort((a, b) => b[1] - a[1]);
    
    return {
      averageVisibilityScore: Math.round(avgVisibility),
      averageOverallScore: Math.round(avgOverall),
      brandMentionRate: Math.round(mentionRate),
      bestPerformingLLM: sortedLLMs[0]?.[0] || 'none',
      worstPerformingLLM: sortedLLMs[sortedLLMs.length - 1]?.[0] || 'none',
      llmPerformance: llmAverages
    };
  }
}

module.exports = new PromptTestingService();

