/**
 * SemanticDriftService
 * 
 * Measures semantic similarity between original and regenerated content
 * to detect semantic drift (unintended changes in meaning).
 * 
 * Uses embeddings (vector representations) to calculate cosine similarity.
 * Threshold: similarity < 0.7 = too much drift
 */

const axios = require('axios');

class SemanticDriftService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    // Use OpenAI's text-embedding-3-small (cost-effective, good quality)
    // Alternative: text-embedding-ada-002 (older, cheaper)
    this.embeddingModel = 'openai/text-embedding-3-small';
    
    // Semantic drift threshold
    // Similarity < 0.7 = too much drift (content has lost semantic core)
    // Similarity >= 0.7 = acceptable (content preserves semantic core)
    this.driftThreshold = 0.7;
    
    // Critical drift threshold (very high drift)
    this.criticalDriftThreshold = 0.5;
    
    if (!this.openRouterApiKey) {
      console.warn('⚠️ [SemanticDrift] OPENROUTER_API_KEY not found - semantic drift measurement will be disabled');
    }
    
    console.log('📊 SemanticDriftService initialized');
    console.log(`   Model: ${this.embeddingModel}`);
    console.log(`   Threshold: ${this.driftThreshold} (critical: ${this.criticalDriftThreshold})`);
  }

  /**
   * Get embeddings for text using OpenRouter API
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async getEmbedding(text) {
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text is required for embedding');
    }

    // Truncate text if too long (embedding models have token limits)
    // text-embedding-3-small supports up to 8191 tokens (~32k chars)
    const maxLength = 30000; // Safe limit
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '... [truncated]'
      : text;

    try {
      const response = await axios.post(
        `${this.openRouterBaseUrl}/embeddings`,
        {
          model: this.embeddingModel,
          input: truncatedText,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'https://rankly.ai',
            'X-Title': 'Rankly Semantic Drift Detection',
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const embedding = response.data?.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from API');
      }

      return embedding;
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message || 'Unknown error';
      console.error('❌ [SemanticDrift] Error getting embedding:', {
        status,
        message,
        model: this.embeddingModel,
      });
      throw new Error(`Failed to get embedding: ${message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vec1 - First vector
   * @param {number[]} vec2 - Second vector
   * @returns {number} Cosine similarity (0-1, where 1 = identical)
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Measure semantic drift between original and regenerated content
   * @param {string} originalContent - Original content
   * @param {string} regeneratedContent - Regenerated content
   * @returns {Promise<Object>} Drift measurement results
   */
  async measureDrift(originalContent, regeneratedContent) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 [SemanticDrift] Measuring semantic drift`);
    console.log(`   Original length: ${originalContent?.length || 0} chars`);
    console.log(`   Regenerated length: ${regeneratedContent?.length || 0} chars`);
    console.log('='.repeat(70));

    if (!originalContent || typeof originalContent !== 'string') {
      throw new Error('Original content is required');
    }

    if (!regeneratedContent || typeof regeneratedContent !== 'string') {
      throw new Error('Regenerated content is required');
    }

    if (!this.openRouterApiKey) {
      console.warn('⚠️ [SemanticDrift] API key not configured - skipping drift measurement');
      return {
        similarity: null,
        driftDetected: null,
        severity: null,
        threshold: this.driftThreshold,
        note: 'Semantic drift measurement disabled (API key not configured)',
      };
    }

    try {
      // Get embeddings for both texts
      console.log('📤 [SemanticDrift] Getting embeddings for original content...');
      const originalEmbedding = await this.getEmbedding(originalContent);
      console.log(`   ✅ Original embedding: ${originalEmbedding.length} dimensions`);

      console.log('📤 [SemanticDrift] Getting embeddings for regenerated content...');
      const regeneratedEmbedding = await this.getEmbedding(regeneratedContent);
      console.log(`   ✅ Regenerated embedding: ${regeneratedEmbedding.length} dimensions`);

      // Calculate cosine similarity
      console.log('📊 [SemanticDrift] Calculating cosine similarity...');
      const similarity = this.cosineSimilarity(originalEmbedding, regeneratedEmbedding);
      console.log(`   ✅ Similarity: ${similarity.toFixed(4)}`);

      // Determine drift status
      const driftDetected = similarity < this.driftThreshold;
      let severity = 'none';
      let recommendation = 'Content preserves semantic core';

      if (similarity < this.criticalDriftThreshold) {
        severity = 'critical';
        recommendation = 'CRITICAL: Content has lost semantic core - regeneration may have changed meaning significantly';
      } else if (similarity < this.driftThreshold) {
        severity = 'high';
        recommendation = 'WARNING: Content has drifted from original - review recommended';
      } else if (similarity >= 0.9) {
        severity = 'none';
        recommendation = 'Excellent: Content closely preserves semantic core';
      } else {
        severity = 'low';
        recommendation = 'Acceptable: Content preserves semantic core with minor variations';
      }

      const result = {
        similarity: parseFloat(similarity.toFixed(4)),
        driftDetected,
        severity,
        threshold: this.driftThreshold,
        criticalThreshold: this.criticalDriftThreshold,
        recommendation,
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ [SemanticDrift] Measurement complete`);
      console.log(`   Similarity: ${similarity.toFixed(4)}`);
      console.log(`   Drift detected: ${driftDetected ? 'YES' : 'NO'}`);
      console.log(`   Severity: ${severity.toUpperCase()}`);
      console.log(`   Recommendation: ${recommendation}`);

      return result;
    } catch (error) {
      console.error('❌ [SemanticDrift] Error measuring drift:', error);
      
      // Return error result but don't fail the entire regeneration
      return {
        similarity: null,
        driftDetected: null,
        severity: 'error',
        threshold: this.driftThreshold,
        error: error.message,
        note: 'Semantic drift measurement failed - continuing without drift check',
      };
    }
  }

  /**
   * Check if drift is acceptable
   * @param {Object} driftResult - Result from measureDrift()
   * @returns {boolean} True if drift is acceptable
   */
  isDriftAcceptable(driftResult) {
    if (!driftResult || driftResult.similarity === null) {
      // If measurement failed, assume acceptable (don't block regeneration)
      return true;
    }

    return !driftResult.driftDetected;
  }

  /**
   * Get human-readable drift summary
   * @param {Object} driftResult - Result from measureDrift()
   * @returns {string} Human-readable summary
   */
  getDriftSummary(driftResult) {
    if (!driftResult || driftResult.similarity === null) {
      return 'Semantic drift measurement unavailable';
    }

    const similarityPercent = (driftResult.similarity * 100).toFixed(1);
    return `${similarityPercent}% similarity - ${driftResult.recommendation}`;
  }
}

module.exports = new SemanticDriftService();

