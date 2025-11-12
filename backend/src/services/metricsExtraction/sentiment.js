/**
 * Sentiment analysis for brand mentions
 * Note: This is a wrapper around the existing sentimentAnalysisService
 * to maintain consistency with the modular structure
 */
const sentimentAnalysisService = require('../sentimentAnalysisService');

/**
 * Analyze sentiment for a brand in the response
 * @param {object} brandData - Brand data object
 * @param {string} response - LLM response text
 * @returns {object} - Sentiment analysis results
 */
function analyzeSentiment(brandData, response) {
  if (!response || !brandData || !brandData.sentences) {
    return {
      sentimentScore: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      neutralMentions: 0
    };
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  // Simple sentiment analysis based on keywords
  const positiveWords = [
    'leading', 'best', 'excellent', 'outstanding', 'superior', 'premium', 'advanced',
    'innovative', 'reliable', 'trusted', 'comprehensive', 'strong', 'well-regarded',
    'excel', 'attractive', 'competitive', 'expert', 'specialized', 'dedicated'
  ];
  
  const negativeWords = [
    'poor', 'bad', 'worst', 'inferior', 'weak', 'unreliable', 'expensive', 'limited',
    'outdated', 'slow', 'problematic', 'issues', 'concerns', 'disappointing', 'failing'
  ];

  brandData.sentences.forEach(sentence => {
    const text = sentence.text.toLowerCase();
    let sentiment = 'neutral';
    
    // Check for positive words
    const positiveMatches = positiveWords.filter(word => text.includes(word));
    const negativeMatches = negativeWords.filter(word => text.includes(word));
    
    if (positiveMatches.length > negativeMatches.length) {
      sentiment = 'positive';
      positiveCount++;
    } else if (negativeMatches.length > positiveMatches.length) {
      sentiment = 'negative';
      negativeCount++;
    } else {
      neutralCount++;
    }
  });

  const totalSentences = brandData.sentences.length;
  const sentimentScore = totalSentences > 0 
    ? ((positiveCount - negativeCount) / totalSentences) * 100 
    : 0;

  console.log(`   😊 [SENTIMENT] ${brandData.brandName}: ${sentimentScore.toFixed(1)} (${positiveCount}+, ${negativeCount}-, ${neutralCount}~)`);
  
  return {
    sentimentScore: parseFloat(sentimentScore.toFixed(2)),
    positiveMentions: positiveCount,
    negativeMentions: negativeCount,
    neutralMentions: neutralCount
  };
}

module.exports = {
  analyzeSentiment
};


