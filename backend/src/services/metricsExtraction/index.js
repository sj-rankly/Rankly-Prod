/**
 * Deterministic Metrics Extraction Service
 *
 * Instead of asking an LLM to calculate metrics (which is probabilistic),
 * this service extracts structured data from LLM responses and calculates
 * metrics mathematically for consistent, accurate results.
 *
 * This service now performs COMPLETE extraction of all brand mentions,
 * positions, word counts, and depth metrics from raw LLM responses.
 */

// Import modular components
const brandDetection = require('./brandDetection');
const textProcessing = require('./textProcessing');
const metrics = require('./metrics');
const citations = require('./citations');
const sentiment = require('./sentiment');

class MetricsExtractionService {
  constructor() {
    console.log('📊 MetricsExtractionService initialized');
  }

  /**
   * Extract COMPLETE metrics from a single prompt test response
   * This is the main entry point for deterministic extraction
   *
   * @param {Object} promptTest - PromptTest document with rawResponse
   * @param {Array} allBrandNames - All brands to track (user brand + competitors)
   * @returns {Object} - Complete extracted metrics for all brands
   */
  extractFromPromptTest(promptTest, allBrandNames) {
    const rawResponse = promptTest.rawResponse || '';

    if (!rawResponse) {
      console.warn('⚠️  No rawResponse found in prompt test');
      return null;
    }

    // Extract metrics for all brands
    const extraction = this.extractMetrics(rawResponse, allBrandNames);

    // Calculate depth of mention for each brand
    extraction.brandMetrics.forEach(brand => {
      brand.depthOfMention = metrics.calculateDepthOfMention(
        brand.sentences,
        extraction.response.totalSentences,
        extraction.response.totalWords
      );
    });

    return extraction;
  }

  /**
   * Extract all brand mentions and calculate metrics from an LLM response
   * @param {string} response - Raw LLM response text
   * @param {string[]} brandNames - List of brand names to track (including user's brand and competitors)
   * @returns {object} - Structured metrics data
   */
  extractMetrics(response, brandNames) {
    // Safety checks for demo reliability
    if (!response || typeof response !== 'string') {
      console.warn('⚠️ [SAFETY] Invalid response in extractMetrics, using empty string');
      response = '';
    }
    if (!Array.isArray(brandNames) || brandNames.length === 0) {
      console.warn('⚠️ [SAFETY] Invalid or empty brandNames array in extractMetrics');
      brandNames = ['Unknown Brand'];
    }

    // Split response into sentences
    const sentences = textProcessing.splitIntoSentences(response);
    const totalSentences = sentences.length;
    const totalWords = textProcessing.countWords(response);

    console.log(`   📝 [EXTRACT] Processing ${totalSentences} sentences, ${totalWords} words`);

    // Track metrics for each brand
    const brandMetrics = {};
    brandNames.forEach(brand => {
      brandMetrics[brand] = {
        brandName: brand,
        mentioned: false,
        firstPosition: null, // Position of first mention (1-indexed)
        mentionCount: 0,
        sentences: [], // Array of { text, position, wordCount }
        totalWordCount: 0
      };
    });

    // Process each sentence to find brand mentions
    sentences.forEach((sentence, index) => {
      const sentenceWords = textProcessing.countWords(sentence);

      brandNames.forEach(brand => {
        const detectionResult = brandDetection.containsBrand(sentence, brand);
        // Backward compatible: always returns { detected, confidence, method }
        // Check detected property (new format) or fallback to truthy check
        if (detectionResult && (detectionResult.detected || detectionResult === true)) {
          const metrics = brandMetrics[brand];
          metrics.mentioned = true;
          metrics.mentionCount++;
          
          // Store detection confidence (optional - for weighted calculations)
          // Only add if confidence is available (backward compatible)
          if (detectionResult.confidence !== undefined) {
            if (!metrics.detectionConfidences) {
              metrics.detectionConfidences = [];
            }
            metrics.detectionConfidences.push(detectionResult.confidence);
          }

          // Record first position (1-indexed)
          if (metrics.firstPosition === null) {
            metrics.firstPosition = index + 1;
          }

          // Store sentence with metadata (backward compatible structure)
          const sentenceData = {
            text: sentence,
            position: index,
            wordCount: sentenceWords
          };
          // Add optional enhanced metadata if available
          if (detectionResult.confidence !== undefined) {
            sentenceData.confidence = detectionResult.confidence;
          }
          if (detectionResult.method) {
            sentenceData.detectionMethod = detectionResult.method;
          }
          metrics.sentences.push(sentenceData);

          metrics.totalWordCount += sentenceWords;
        }
      });
    });

    console.log(`   ✅ [EXTRACT] Found mentions for ${Object.values(brandMetrics).filter(m => m.mentioned).length}/${brandNames.length} brands`);

    return {
      response: {
        text: response,
        totalSentences,
        totalWords
      },
      brandMetrics: Object.values(brandMetrics)
    };
  }

  /**
   * Calculate all metrics for a brand based on extracted data
   * Used for aggregation across multiple prompts/responses
   */
  calculateAggregatedMetrics(brandData, totalPrompts, allBrandMetrics, responseText = '') {
    return metrics.calculateAggregatedMetrics(
      brandData,
      totalPrompts,
      allBrandMetrics,
      responseText,
      citations.extractBrandHyperlinks,
      citations.extractTotalHyperlinks
    );
  }

  /**
   * Extract all citations in response, categorizing as brand, competitor, social, or earned.
   */
  extractCategorizedCitations(response, options) {
    return citations.extractCategorizedCitations(response, options);
  }

  /**
   * Filter citations to include only brand, competitor, social, or earned types
   */
  filterRelevantCitations(citations) {
    return citations.filterRelevantCitations(citations);
  }

  cleanDomain(url) {
    return citations.cleanDomain(url);
  }

  /**
   * Extract hyperlinks that mention a specific brand
   */
  extractBrandHyperlinks(brandData, response) {
    return citations.extractBrandHyperlinks(brandData, response);
  }

  /**
   * Analyze sentiment for a brand in the response
   */
  analyzeSentiment(brandData, response) {
    return sentiment.analyzeSentiment(brandData, response);
  }

  /**
   * Extract total number of hyperlinks across all brands
   */
  extractTotalHyperlinks(allBrandMetrics, responseText) {
    return citations.extractTotalHyperlinks(allBrandMetrics, responseText);
  }

  /**
   * Calculate depth of mention with exponential decay based on sentence position
   */
  calculateDepthOfMention(brandSentences, totalSentences, totalWordsInResponse) {
    return metrics.calculateDepthOfMention(brandSentences, totalSentences, totalWordsInResponse);
  }

  /**
   * Assign ranking position based on first mention
   */
  calculateMentionPosition(brandMetrics) {
    return metrics.calculateMentionPosition(brandMetrics);
  }

  /**
   * Split text into sentences using simple rules
   */
  splitIntoSentences(text) {
    return textProcessing.splitIntoSentences(text);
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return textProcessing.countWords(text);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const { levenshteinDistance } = require('./utils');
    return levenshteinDistance(str1, str2);
  }

  /**
   * Calculate similarity score between two strings
   */
  calculateSimilarity(str1, str2) {
    const { calculateSimilarity } = require('./utils');
    return calculateSimilarity(str1, str2);
  }

  /**
   * Remove common words from brand name
   */
  removeCommonWords(text) {
    return brandDetection.removeCommonWords(text);
  }

  /**
   * Extract first syllables from a word
   */
  extractFirstSyllables(word, maxSyllables = 3) {
    return brandDetection.extractFirstSyllables(word, maxSyllables);
  }

  /**
   * Get brand abbreviations
   */
  getBrandAbbreviations(brandName) {
    return brandDetection.getBrandAbbreviations(brandName);
  }

  /**
   * Check if a sentence contains a brand mention
   */
  containsBrand(sentence, brandName, options = {}) {
    return brandDetection.containsBrand(sentence, brandName, options);
  }

  /**
   * Generate common variations of a brand name
   */
  generateBrandVariations(brandName) {
    return brandDetection.generateBrandVariations(brandName);
  }

  /**
   * Rank brands by a specific metric
   */
  rankBrands(brandMetrics, metricKey, ascending = false) {
    return metrics.rankBrands(brandMetrics, metricKey, ascending);
  }

  /**
   * Calculate position distribution for each brand
   */
  calculatePositionDistribution(promptTests) {
    return metrics.calculatePositionDistribution(promptTests);
  }

  /**
   * Extract competitor names from response
   */
  extractCompetitorMentions(response, competitorNames) {
    return metrics.extractCompetitorMentions(response, competitorNames, brandDetection.containsBrand);
  }

  /**
   * Validate and normalize brand names
   */
  normalizeBrandName(brandName) {
    return textProcessing.normalizeBrandName(brandName);
  }
}

module.exports = new MetricsExtractionService();


