/**
 * Sentiment Analysis Service
 * Handles sentiment analysis of brand mentions in LLM responses
 */

class SentimentAnalysisService {
  /**
   * Analyze sentiment of brand mentions in response
   * @param {string} responseText - Full LLM response
   * @param {string} brandName - Brand to analyze
   * @param {Array} brandPatterns - Flexible brand patterns to match
   * @returns {object} - Sentiment analysis { sentiment, sentimentScore, drivers }
   */
  analyzeSentiment(responseText, brandName, brandPatterns = [brandName]) {
    // Expanded positive keywords - stronger signals
    const positiveKeywords = [
      'best', 'excellent', 'great', 'top', 'leading', 'trusted', 'reliable', 
      'recommended', 'popular', 'strong', 'superior', 'outstanding', 'premier',
      'robust', 'comprehensive', 'flexible', 'innovative', 'powerful', 'advanced',
      'seamless', 'easy', 'simple', 'efficient', 'effective', 'preferred', 'ideal',
      'unmatched', 'favored', 'recognized', 'renowned', 'good', 'quality', 'solid',
      'worthy', 'valuable', 'beneficial', 'helpful', 'useful', 'proven', 'established',
      'successful', 'well-regarded', 'highly', 'very', 'particularly', 'especially',
      'impressive', 'notable', 'significant', 'substantial', 'essential', 'important',
      'vital', 'crucial', 'advantageous', 'promising', 'suitable', 'appropriate'
    ];

    // Expanded negative keywords - stronger signals
    const negativeKeywords = [
      'bad', 'poor', 'worst', 'weak', 'limited', 'lacking', 'difficult', 
      'complicated', 'expensive', 'costly', 'slow', 'unreliable', 'problematic',
      'issues', 'problems', 'concerns', 'drawbacks', 'disadvantages', 'limitations',
      'struggles', 'fails', 'inferior', 'outdated', 'challenging', 'complex',
      'questionable', 'unclear', 'insufficient', 'inadequate', 'substandard',
      'disappointing', 'concerning', 'troublesome', 'risky', 'uncertain', 'weak',
      'fragile', 'unstable', 'inefficient', 'ineffective', 'unsuitable', 'inappropriate'
    ];

    // Negation words that flip sentiment
    const negationWords = ['not', 'no', 'never', 'none', 'neither', 'barely', 'hardly', 'scarcely', 'rarely', 'seldom'];

    // Extract sentences mentioning the brand using flexible patterns
    const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const brandSentences = sentences.filter(s => {
      const sentenceLower = s.toLowerCase();
      return brandPatterns.some(pattern => 
        sentenceLower.includes(pattern.toLowerCase())
      );
    });

    if (brandSentences.length === 0) {
      return { sentiment: 'neutral', sentimentScore: 0, drivers: [] };
    }

    // Analyze each sentence
    let totalScore = 0;
    const drivers = [];

    brandSentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      let sentenceScore = 0;
      const foundKeywords = [];

      // Check for negation words first
      const hasNegation = negationWords.some(neg => {
        const regex = new RegExp(`\\b${neg}\\b`, 'i');
        return regex.test(lowerSentence);
      });

      // Count positive keywords
      positiveKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerSentence)) {
          // If negation is present, flip to negative
          if (hasNegation) {
            sentenceScore -= 0.2;
            foundKeywords.push('-' + keyword + ' (negated)');
          } else {
            sentenceScore += 0.4; // Increased from 0.3 for better detection
            foundKeywords.push('+' + keyword);
          }
        }
      });

      // Count negative keywords
      negativeKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerSentence)) {
          // If negation is present, flip to positive
          if (hasNegation) {
            sentenceScore += 0.2;
            foundKeywords.push('+' + keyword + ' (negated)');
          } else {
            sentenceScore -= 0.4; // Increased from 0.3 for better detection
            foundKeywords.push('-' + keyword);
          }
        }
      });

      // Determine sentence sentiment with lower thresholds
      let sentenceSentiment = 'neutral';
      if (sentenceScore > 0.2) sentenceSentiment = 'positive'; // Lowered from 0.3
      else if (sentenceScore < -0.2) sentenceSentiment = 'negative'; // Lowered from -0.3

      if (foundKeywords.length > 0 || sentenceSentiment !== 'neutral') {
        drivers.push({
          text: sentence.substring(0, 150), // Increased length for better context
          sentiment: sentenceSentiment,
          keywords: foundKeywords
        });
      }

      totalScore += sentenceScore;
    });

    // Calculate overall sentiment with improved thresholds
    const avgScore = brandSentences.length > 0 ? totalScore / brandSentences.length : 0;
    const normalizedScore = Math.max(-1, Math.min(1, avgScore)); // Clamp to -1 to +1

    let overallSentiment = 'neutral';
    // Lowered thresholds for better detection
    if (normalizedScore > 0.1) overallSentiment = 'positive'; // Lowered from 0.2
    else if (normalizedScore < -0.1) overallSentiment = 'negative'; // Lowered from -0.2
    else if (drivers.some(d => d.sentiment === 'positive') && drivers.some(d => d.sentiment === 'negative')) {
      overallSentiment = 'mixed';
    }

    console.log(`         😊 Sentiment: ${overallSentiment} (Score: ${normalizedScore.toFixed(3)}, Drivers: ${drivers.length})`);

    return {
      sentiment: overallSentiment,
      sentimentScore: normalizedScore,
      drivers: drivers.slice(0, 5) // Top 5 drivers
    };
  }
}

module.exports = new SentimentAnalysisService();


