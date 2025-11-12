/**
 * Scoring Service
 * Handles calculation of visibility scores and overall scores
 */

const brandPatternService = require('./brandPatternService');
const citationClassificationService = require('./citationClassificationService');
const sentimentAnalysisService = require('./sentimentAnalysisService');

class ScoringService {
  /**
   * Calculate deterministic score based on brand mentions, position, and citations
   * @param {string} responseText - LLM response text
   * @param {Array} citations - Extracted citations
   * @param {object} brandContext - Brand information
   * @returns {object} - Scorecard with visibility and overall scores
   */
  calculateDeterministicScore(responseText, citations, brandContext) {
    // Safety checks for demo reliability
    if (!responseText || typeof responseText !== 'string') {
      console.warn('⚠️ [SAFETY] Invalid responseText in calculateDeterministicScore');
      return this.getDefaultScorecard();
    }
    
    // Validate brandContext with fallbacks
    if (!brandContext || typeof brandContext !== 'object') {
      console.warn('⚠️ [SAFETY] Invalid brandContext in calculateDeterministicScore, using defaults');
      brandContext = { companyName: 'Unknown Brand', competitors: [] };
    }

    const brandName = brandContext.companyName || 'Unknown Brand';
    const competitors = Array.isArray(brandContext.competitors) ? brandContext.competitors : [];
    
    // Ensure citations is an array
    if (!Array.isArray(citations)) {
      console.warn('⚠️ [SAFETY] Invalid citations in calculateDeterministicScore, using empty array');
      citations = [];
    }

    console.log(`      🎯 [SCORING] Creating simple scorecard for: ${brandName}`);

    // Use sophisticated brand detection with confidence scoring
    // This is more accurate than simple pattern matching (avoids false positives)
    const metricsExtractionService = require('./metricsExtractionService');
    const detectionResult = metricsExtractionService.containsBrand(responseText, brandName);
    
    let brandMentions = 0;
    let brandMentioned = detectionResult.detected;
    
    // If brand is detected, count mentions using pattern matching for accurate count
    if (brandMentioned) {
      const brandPatterns = brandPatternService.generateBrandPatterns(brandName);
      // Use word boundaries to avoid false positives (e.g., "Platinum" in "American Express Platinum")
      for (const pattern of brandPatterns) {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        const matches = (responseText.match(regex) || []).length;
        brandMentions += matches;
      }
    }

    // Calculate brand position (which sentence brand first appears in)
    let brandPosition = null;
    if (brandMentioned) {
      const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        // Use sophisticated detection for each sentence to avoid false positives
        const sentenceDetection = metricsExtractionService.containsBrand(sentence, brandName);
        if (sentenceDetection.detected) {
          brandPosition = i + 1; // 1-indexed
          break;
        }
      }
    }

    // Categorize brand citations using flexible brand patterns
    // Generate patterns for citation filtering (needed for citation matching)
    const citationBrandPatterns = brandPatternService.generateBrandPatterns(brandName);
    const allBrandCitations = citations.filter(c => {
      // For citation markers, count them as citations if brand is mentioned
      if (c.type === 'citation_marker') {
        return brandMentioned; // If brand is mentioned, citation markers count as citations
      }
      // For URLs, check if they contain brand name
      const urlLower = c.url.toLowerCase();
      return citationBrandPatterns.some(pattern => 
        urlLower.includes(pattern.toLowerCase().replace(/\s+/g, ''))
      );
    });
    
    let brandCitationsCount = 0;
    let earnedCitationsCount = 0;
    let socialCitationsCount = 0;
    
    // Create all brands list for classification (with safety check)
    const allBrands = [brandName, ...competitors
      .filter(c => c && typeof c === 'object' && c.name && typeof c.name === 'string')
      .map(c => c.name)];
    
    allBrandCitations.forEach(cit => {
      // Clean and validate URL first
      const urlValidation = citationClassificationService.cleanAndValidateUrl(cit.url);
      if (!urlValidation.valid || !urlValidation.domain) {
        return; // Skip invalid URLs (use return in forEach, not continue)
      }
      
      const classification = citationClassificationService.categorizeCitation(urlValidation.cleanedUrl, brandName, allBrands);
      
      // Only process valid classifications
      if (classification.type === 'unknown') {
        return; // Skip unknown classifications (use return in forEach, not continue)
      }
      if (classification.type === 'brand') brandCitationsCount++;
      else if (classification.type === 'earned') earnedCitationsCount++;
      else if (classification.type === 'social') socialCitationsCount++;
    });
    
    const totalCitations = allBrandCitations.length;
    const citationPresent = totalCitations > 0;
    // Map citation types to schema enum values: 'direct_link', 'reference', 'mention', 'none'
    const citationType = brandCitationsCount > 0 ? 'direct_link' : 
                        earnedCitationsCount > 0 ? 'reference' : 
                        socialCitationsCount > 0 ? 'mention' : 'none'; // 'social' maps to 'mention' in schema

    // Find competitors mentioned in response using intelligent pattern matching
    const competitorsMentioned = [];
    
    // Safety check: ensure competitors is an array
    if (!Array.isArray(competitors)) {
      console.warn('⚠️ [SAFETY] Competitors is not an array, skipping competitor detection');
      competitors = [];
    }
    
    competitors.forEach(comp => {
      if (!comp || typeof comp !== 'object' || !comp.name || typeof comp.name !== 'string' || comp.name.trim().length === 0) {
        return;
      }
      
      // Use sophisticated brand detection for competitors (same as brand detection)
      // This avoids false positives from partial word matches
      const competitorDetection = metricsExtractionService.containsBrand(responseText, comp.name);
      let competitorMentioned = competitorDetection.detected;
      let totalMentions = 0;
      
      // If detected, count mentions using word-boundary pattern matching
      if (competitorMentioned) {
        const competitorPatterns = brandPatternService.generateBrandPatterns(comp.name);
        // Use word boundaries to avoid false positives
        for (const pattern of competitorPatterns) {
          const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
          const matches = (responseText.match(regex) || []).length;
          totalMentions += matches;
        }
      }
      
      if (competitorMentioned) {
        competitorsMentioned.push(comp.name);
        console.log(`         ✅ Competitor detected: ${comp.name} (${totalMentions} mentions)`);
      }
    });

    // Analyze sentiment for user's brand using flexible patterns
    // Generate patterns for sentiment analysis (needed for sentiment service)
    const brandPatterns = brandPatternService.generateBrandPatterns(brandName);
    const sentimentAnalysis = sentimentAnalysisService.analyzeSentiment(responseText, brandName, brandPatterns);

    console.log(`      📊 [SCORECARD] Brand: ${brandName}`);
    console.log(`         Mentioned: ${brandMentioned}, Count: ${brandMentions}, Position: ${brandPosition}`);
    console.log(`         Citations - Brand: ${brandCitationsCount}, Earned: ${earnedCitationsCount}, Social: ${socialCitationsCount}`);
    console.log(`         Sentiment: ${sentimentAnalysis.sentiment} (Score: ${sentimentAnalysis.sentimentScore.toFixed(2)})`);

    // Calculate visibility score using the correct formula:
    // VisibilityScore(b) = (# of prompts where Brand b appears / Total prompts) × 100
    // For individual prompt tests, this is either 100% (mentioned) or 0% (not mentioned)
    // The aggregation service will calculate the overall visibility across all prompts
    const visibilityScore = brandMentioned ? 100 : 0;
    
    // Calculate overall score (0-100) based on multiple factors
    // This is a composite score that considers visibility, position, citations, and sentiment
    let overallScore = 0;
    
    if (brandMentioned) {
      // Base score for being mentioned (visibility component)
      overallScore += 40;
      
      // Position bonus (earlier is better)
      if (brandPosition === 1) overallScore += 30;
      else if (brandPosition === 2) overallScore += 20;
      else if (brandPosition === 3) overallScore += 10;
      else if (brandPosition <= 5) overallScore += 5;
      
      // Citation bonus
      if (brandCitationsCount > 0) overallScore += 20;
      if (earnedCitationsCount > 0) overallScore += 10;
      
      // Sentiment bonus
      if (sentimentAnalysis.sentiment === 'positive') overallScore += 10;
      else if (sentimentAnalysis.sentiment === 'neutral') overallScore += 5;
    }

    return {
      brandMentioned,
      brandPosition,
      brandMentionCount: brandMentions,
      citationPresent,
      citationType,
      brandCitations: brandCitationsCount,
      earnedCitations: earnedCitationsCount,
      socialCitations: socialCitationsCount,
      totalCitations: totalCitations,
      sentiment: sentimentAnalysis.sentiment,
      sentimentScore: sentimentAnalysis.sentimentScore,
      competitorsMentioned,
      visibilityScore,
      overallScore
    };
  }

  /**
   * Get default scorecard structure for failed tests
   * @returns {Object} Default scorecard with all metrics set to default values
   */
  getDefaultScorecard() {
    return {
      brandMentioned: false,
      brandPosition: null,
      brandMentionCount: 0,
      citationPresent: false,
      citationType: 'none',
      brandCitations: 0,
      earnedCitations: 0,
      socialCitations: 0,
      totalCitations: 0,
      sentiment: 'neutral',
      sentimentScore: 0,
      competitorsMentioned: []
    };
  }
}

module.exports = new ScoringService();

