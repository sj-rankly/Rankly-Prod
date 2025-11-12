/**
 * Metrics calculation functions
 */
const sentimentAnalysisService = require('../sentimentAnalysisService');

/**
 * Calculate depth of mention with exponential decay based on sentence position
 * Formula: Σ [words × exp(-position/totalSentences)] / total words in response
 * Position is 1-indexed (first sentence = position 1, not 0)
 */
function calculateDepthOfMention(brandSentences, totalSentences, totalWordsInResponse) {
  if (brandSentences.length === 0 || totalWordsInResponse === 0) {
    return 0;
  }

  let weightedWordCount = 0;

  brandSentences.forEach(sentence => {
    // Convert 0-indexed position to 1-indexed for correct decay calculation
    const position1Indexed = sentence.position + 1;
    const decayFactor = Math.exp(-position1Indexed / totalSentences);
    weightedWordCount += sentence.wordCount * decayFactor;
  });

  // Return as percentage of total words
  return (weightedWordCount / totalWordsInResponse) * 100;
}

/**
 * Calculate all metrics for a brand based on extracted data
 * Used for aggregation across multiple prompts/responses
 */
function calculateAggregatedMetrics(brandData, totalPrompts, allBrandMetrics, responseText = '', extractBrandHyperlinks, extractTotalHyperlinks) {
  const brandName = brandData.brandName;

  // Visibility Score: % of prompt responses where brand appears
  const appearanceCount = brandData.totalAppearances || 0;
  const visibilityScore = (appearanceCount / totalPrompts) * 100; // totalPrompts here represents total responses

  // Citation Share: % of hyperlinks that mention the brand
  const brandHyperlinks = extractBrandHyperlinks(brandData, responseText);
  const totalHyperlinks = extractTotalHyperlinks(allBrandMetrics, responseText);
  const citationShare = totalHyperlinks > 0 
    ? (brandHyperlinks / totalHyperlinks) * 100 
    : 0;

  // Average Position: average first-mention position
  const avgPosition = appearanceCount > 0
    ? brandData.sumPositions / appearanceCount
    : 0;

  // Depth of Mention: word count weighted by position (with exponential decay)
  // This is already calculated in the detailed extraction
  const depthOfMention = brandData.weightedWordCount || 0;

  // Sentiment analysis
  const sentimentData = sentimentAnalysisService.analyzeSentiment(brandData, responseText);

  return {
    brandName,
    visibilityScore: parseFloat(visibilityScore.toFixed(2)),
    citationShare: parseFloat(citationShare.toFixed(2)), // Citation share (hyperlinks)
    avgPosition: parseFloat(avgPosition.toFixed(2)),
    depthOfMention: parseFloat(depthOfMention.toFixed(4)),
    
    // Sentiment analysis
    ...sentimentData,

    // Raw counts (for internal calculations)
    totalAppearances: appearanceCount,
    totalMentions: brandData.totalMentions || 0,
    totalWordCount: brandData.totalWordCount || 0,
    totalCitations: brandHyperlinks
  };
}

/**
 * Assign ranking position based on first mention
 * Returns 1, 2, 3, or higher
 */
function calculateMentionPosition(brandMetrics) {
  // Filter brands that were mentioned
  const mentionedBrands = brandMetrics
    .filter(b => b.mentioned && b.firstPosition !== null)
    .sort((a, b) => a.firstPosition - b.firstPosition);

  // Assign positions
  mentionedBrands.forEach((brand, index) => {
    brand.rankPosition = index + 1;
  });

  return brandMetrics;
}

/**
 * Calculate position distribution (1st, 2nd, 3rd) for each brand
 * across all prompts
 */
function calculatePositionDistribution(promptTests) {
  const distribution = {};

  promptTests.forEach(test => {
    if (!test.brandMetrics) return;

    // Sort brands by first position for this prompt
    const ranked = [...test.brandMetrics]
      .filter(b => b.mentioned && b.firstPosition !== null)
      .sort((a, b) => a.firstPosition - b.firstPosition);

    // Count 1st, 2nd, 3rd positions
    ranked.forEach((brand, index) => {
      if (!distribution[brand.brandName]) {
        distribution[brand.brandName] = {
          count1st: 0,
          count2nd: 0,
          count3rd: 0
        };
      }

      if (index === 0) distribution[brand.brandName].count1st++;
      else if (index === 1) distribution[brand.brandName].count2nd++;
      else if (index === 2) distribution[brand.brandName].count3rd++;
    });
  });

  return distribution;
}

/**
 * Rank brands by a specific metric
 * @param {Array} brandMetrics - Array of brand metrics
 * @param {string} metricKey - Key to rank by (e.g., 'visibilityScore')
 * @param {boolean} ascending - True for ascending (lower is better), false for descending
 * @returns {Array} - Brands with rank assigned
 */
function rankBrands(brandMetrics, metricKey, ascending = false) {
  const sorted = [...brandMetrics].sort((a, b) => {
    if (ascending) {
      return a[metricKey] - b[metricKey];
    }
    return b[metricKey] - a[metricKey];
  });

  sorted.forEach((brand, index) => {
    brand.rank = index + 1;
  });

  return sorted;
}

/**
 * Extract competitor names from response with confidence scores
 * Useful for identifying which competitors are being mentioned
 * Returns array of { name, confidence }
 */
function extractCompetitorMentions(response, competitorNames, containsBrand) {
  const mentioned = [];

  competitorNames.forEach(competitor => {
    const detectionResult = containsBrand(response, competitor);
    if (detectionResult.detected) {
      mentioned.push({
        name: competitor,
        confidence: detectionResult.confidence,
        method: detectionResult.method
      });
    }
  });

  return mentioned;
}

module.exports = {
  calculateDepthOfMention,
  calculateAggregatedMetrics,
  calculateMentionPosition,
  calculatePositionDistribution,
  rankBrands,
  extractCompetitorMentions
};


