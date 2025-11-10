/**
 * EvaluationPipelineService
 * 
 * Implements before/after evaluation pipeline for content regeneration.
 * Evaluates original content vs regenerated content using:
 * - PAWC (Position-Adjusted Word Count) = Depth of Mention
 * - 6 Subjective Impression Metrics
 * 
 * This allows measuring improvement from content optimization.
 */

const SubjectiveMetrics = require('../models/SubjectiveMetrics');
const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');

class EvaluationPipelineService {
  constructor() {
    console.log('📊 EvaluationPipelineService initialized');
  }

  /**
   * Evaluate content (original or regenerated) using PAWC and subjective metrics
   * 
   * @param {Object} params
   * @param {string} params.content - Content to evaluate (original or regenerated)
   * @param {string} params.pageUrl - Page URL
   * @param {string} params.brandName - Brand name
   * @param {string} params.userId - User ID
   * @param {string} params.urlAnalysisId - URL Analysis ID
   * @param {boolean} params.isRegenerated - Whether this is regenerated content (for after evaluation)
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateContent({ content, pageUrl, brandName, userId, urlAnalysisId, isRegenerated = false }) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 [EvaluationPipeline] Evaluating ${isRegenerated ? 'REGENERATED' : 'ORIGINAL'} content`);
    console.log(`   Page URL: ${pageUrl}`);
    console.log(`   Brand: ${brandName}`);
    console.log(`   Content length: ${content?.length || 0} chars`);
    console.log('='.repeat(70));

    const evaluation = {
      timestamp: new Date().toISOString(),
      pageUrl,
      brandName,
      isRegenerated,
      contentLength: content?.length || 0,
    };

    // 1. Calculate PAWC (Depth of Mention) from existing PromptTest data
    const pawcResult = await this.calculatePAWC({
      pageUrl,
      brandName,
      userId,
      urlAnalysisId,
      isRegenerated,
    });
    evaluation.pawc = pawcResult;

    // 2. Calculate/Retrieve Subjective Metrics
    const subjectiveResult = await this.calculateSubjectiveMetrics({
      pageUrl,
      brandName,
      userId,
      urlAnalysisId,
      isRegenerated,
    });
    evaluation.subjectiveMetrics = subjectiveResult;

    // 3. Calculate Content Quality Score (based on content structure)
    const contentQuality = this.calculateContentQualityScore(content);
    evaluation.contentQuality = contentQuality;

    console.log(`✅ [EvaluationPipeline] Evaluation complete`);
    console.log(`   PAWC: ${pawcResult.depthOfMention?.toFixed(2) || 'N/A'}%`);
    console.log(`   Subjective Metrics: ${subjectiveResult.averageScore?.toFixed(2) || 'N/A'}/5`);
    console.log(`   Content Quality: ${contentQuality.overallScore?.toFixed(2) || 'N/A'}/10`);

    return evaluation;
  }

  /**
   * Calculate PAWC (Depth of Mention) from PromptTest data
   * PAWC = Weighted word count based on position in LLM responses
   */
  async calculatePAWC({ pageUrl, brandName, userId, urlAnalysisId, isRegenerated }) {
    try {
      // Find PromptTests that cite this page URL
      const query = {
        userId,
        urlAnalysisId,
        status: 'completed',
        'brandMetrics.isOwner': true,
        'brandMetrics.citations.url': { $regex: pageUrl || '', $options: 'i' }
      };

      // If evaluating regenerated content, we might want to filter by date
      // For now, we'll use all available data
      const promptTests = await PromptTest.find(query)
        .select('brandMetrics responseMetadata')
        .limit(50) // Limit for performance
        .lean();

      if (!promptTests || promptTests.length === 0) {
        console.log(`ℹ️ [EvaluationPipeline] No PromptTests found for PAWC calculation`);
        return {
          depthOfMention: null,
          sampleSize: 0,
          note: 'No citation data available for this page'
        };
      }

      // Calculate average depth of mention across all prompt tests
      let totalDepth = 0;
      let count = 0;
      let totalWordCount = 0;
      let totalWeightedWordCount = 0;

      promptTests.forEach(test => {
        if (!test.brandMetrics || !test.responseMetadata) return;

        const brandMetric = test.brandMetrics.find(
          bm => bm.brandName?.toLowerCase() === brandName?.toLowerCase() && bm.isOwner
        );

        if (brandMetric && brandMetric.depthOfMention !== undefined) {
          totalDepth += brandMetric.depthOfMention;
          count++;
        }

        // Also calculate from sentences if available
        if (brandMetric?.sentences && test.responseMetadata?.totalSentences && test.responseMetadata?.totalWords) {
          const sentences = brandMetric.sentences;
          const totalSentences = test.responseMetadata.totalSentences;
          const totalWords = test.responseMetadata.totalWords;

          let weightedWordCount = 0;
          sentences.forEach(sentence => {
            const position1Indexed = (sentence.position || 0) + 1;
            const decayFactor = Math.exp(-position1Indexed / totalSentences);
            weightedWordCount += (sentence.wordCount || 0) * decayFactor;
          });

          if (totalWords > 0) {
            const depthPercentage = (weightedWordCount / totalWords) * 100;
            totalWeightedWordCount += depthPercentage;
            totalWordCount++;
          }
        }
      });

      // Use calculated depth if available, otherwise use stored depthOfMention
      let averageDepth = null;
      if (totalWordCount > 0) {
        averageDepth = totalWeightedWordCount / totalWordCount;
      } else if (count > 0) {
        averageDepth = totalDepth / count;
      }

      return {
        depthOfMention: averageDepth ? parseFloat(averageDepth.toFixed(4)) : null,
        sampleSize: Math.max(count, totalWordCount),
        note: averageDepth ? 'Calculated from citation data' : 'Insufficient data'
      };
    } catch (error) {
      console.error('❌ [EvaluationPipeline] Error calculating PAWC:', error);
      return {
        depthOfMention: null,
        sampleSize: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate/Retrieve Subjective Metrics for the page
   */
  async calculateSubjectiveMetrics({ pageUrl, brandName, userId, urlAnalysisId, isRegenerated }) {
    try {
      // Find PromptTests that cite this page URL
      const promptTests = await PromptTest.find({
        userId,
        urlAnalysisId,
        status: 'completed',
        'brandMetrics.isOwner': true,
        'brandMetrics.citations.url': { $regex: pageUrl || '', $options: 'i' }
      })
      .select('promptId')
      .limit(10)
      .lean();

      if (!promptTests || promptTests.length === 0) {
        console.log(`ℹ️ [EvaluationPipeline] No PromptTests found for subjective metrics`);
        return {
          scores: null,
          sampleSize: 0,
          note: 'No citation data available for this page'
        };
      }

      // Get subjective metrics for these prompts
      const promptIds = [...new Set(promptTests.map(pt => pt.promptId))];
      const metrics = await SubjectiveMetrics.find({
        userId,
        promptId: { $in: promptIds },
        brandName: brandName,
        status: 'completed'
      })
      .sort({ evaluatedAt: -1 })
      .limit(10)
      .lean();

      if (!metrics || metrics.length === 0) {
        console.log(`ℹ️ [EvaluationPipeline] No subjective metrics found`);
        return {
          scores: null,
          sampleSize: 0,
          note: 'No subjective metrics available for this page'
        };
      }

      // Calculate average scores
      const avgScores = {
        relevance: 0,
        influence: 0,
        uniqueness: 0,
        position: 0,
        clickProbability: 0,
        diversity: 0,
        overallQuality: 0
      };

      metrics.forEach(m => {
        avgScores.relevance += m.relevance?.score || 0;
        avgScores.influence += m.influence?.score || 0;
        avgScores.uniqueness += m.uniqueness?.score || 0;
        avgScores.position += m.position?.score || 0;
        avgScores.clickProbability += m.clickProbability?.score || 0;
        avgScores.diversity += m.diversity?.score || 0;
        avgScores.overallQuality += m.overallQuality?.score || 0;
      });

      const count = metrics.length;
      Object.keys(avgScores).forEach(key => {
        avgScores[key] = Math.round((avgScores[key] / count) * 10) / 10;
      });

      // Calculate average of all 6 metrics (excluding overallQuality)
      const sixMetrics = ['relevance', 'influence', 'uniqueness', 'position', 'clickProbability', 'diversity'];
      const averageScore = sixMetrics.reduce((sum, key) => sum + avgScores[key], 0) / 6;

      return {
        scores: avgScores,
        averageScore: parseFloat(averageScore.toFixed(2)),
        sampleSize: count,
        weakAreas: Object.entries(avgScores)
          .filter(([key, score]) => key !== 'overallQuality' && score < 3.0)
          .map(([key]) => key),
      };
    } catch (error) {
      console.error('❌ [EvaluationPipeline] Error calculating subjective metrics:', error);
      return {
        scores: null,
        sampleSize: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate Content Quality Score based on content structure
   * This is a proxy metric when citation data isn't available
   */
  calculateContentQualityScore(content) {
    if (!content || typeof content !== 'string') {
      return {
        overallScore: 0,
        wordCount: 0,
        headingCount: 0,
        structureScore: 0,
        note: 'No content provided'
      };
    }

    const words = content.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Count headings (H1-H6)
    const headingMatches = content.match(/^#{1,6}\s+.+$/gm) || [];
    const headingCount = headingMatches.length;

    // Count paragraphs
    const paragraphMatches = content.match(/\n\n+/g) || [];
    const paragraphCount = paragraphMatches.length + 1;

    // Count lists (bulleted or numbered)
    const listMatches = content.match(/^[\s]*[-*+]\s+|^[\s]*\d+\.\s+/gm) || [];
    const listCount = listMatches.length;

    // Structure score (0-10)
    // Based on: word count, headings, paragraphs, lists
    let structureScore = 0;
    
    // Word count score (0-4 points)
    if (wordCount >= 1000) structureScore += 4;
    else if (wordCount >= 500) structureScore += 3;
    else if (wordCount >= 300) structureScore += 2;
    else if (wordCount >= 100) structureScore += 1;

    // Heading score (0-2 points)
    if (headingCount >= 5) structureScore += 2;
    else if (headingCount >= 3) structureScore += 1.5;
    else if (headingCount >= 1) structureScore += 1;

    // Paragraph score (0-2 points)
    if (paragraphCount >= 10) structureScore += 2;
    else if (paragraphCount >= 5) structureScore += 1.5;
    else if (paragraphCount >= 3) structureScore += 1;

    // List score (0-2 points)
    if (listCount >= 5) structureScore += 2;
    else if (listCount >= 3) structureScore += 1;
    else if (listCount >= 1) structureScore += 0.5;

    // Cap at 10
    structureScore = Math.min(structureScore, 10);

    return {
      overallScore: parseFloat(structureScore.toFixed(2)),
      wordCount,
      headingCount,
      paragraphCount,
      listCount,
      structureScore: parseFloat(structureScore.toFixed(2)),
      note: 'Based on content structure analysis'
    };
  }

  /**
   * Compare before and after evaluations
   * Calculate improvement delta
   * 
   * @param {Object} beforeEvaluation - Evaluation of original content
   * @param {Object} afterEvaluation - Evaluation of regenerated content
   * @returns {Object} Improvement report
   */
  compareEvaluations(beforeEvaluation, afterEvaluation) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 [EvaluationPipeline] Comparing Before vs After`);
    console.log('='.repeat(70));

    const improvement = {
      timestamp: new Date().toISOString(),
      before: beforeEvaluation,
      after: afterEvaluation,
      improvements: {},
      overallImprovement: null,
    };

    // 1. PAWC Improvement
    if (beforeEvaluation.pawc?.depthOfMention !== null && afterEvaluation.pawc?.depthOfMention !== null) {
      const beforePAWC = beforeEvaluation.pawc.depthOfMention;
      const afterPAWC = afterEvaluation.pawc.depthOfMention;
      const deltaPAWC = afterPAWC - beforePAWC;
      const percentChange = beforePAWC > 0 ? ((deltaPAWC / beforePAWC) * 100) : 0;

      improvement.improvements.pawc = {
        before: beforePAWC,
        after: afterPAWC,
        delta: parseFloat(deltaPAWC.toFixed(4)),
        percentChange: parseFloat(percentChange.toFixed(2)),
        improved: deltaPAWC > 0,
      };
    } else {
      improvement.improvements.pawc = {
        before: beforeEvaluation.pawc?.depthOfMention || null,
        after: afterEvaluation.pawc?.depthOfMention || null,
        delta: null,
        note: 'Insufficient data for comparison'
      };
    }

    // 2. Subjective Metrics Improvement
    if (beforeEvaluation.subjectiveMetrics?.scores && afterEvaluation.subjectiveMetrics?.scores) {
      const beforeScores = beforeEvaluation.subjectiveMetrics.scores;
      const afterScores = afterEvaluation.subjectiveMetrics.scores;

      const metricDeltas = {};
      const sixMetrics = ['relevance', 'influence', 'uniqueness', 'position', 'clickProbability', 'diversity'];
      
      let totalDelta = 0;
      let improvedCount = 0;

      sixMetrics.forEach(metric => {
        const before = beforeScores[metric] || 0;
        const after = afterScores[metric] || 0;
        const delta = after - before;
        const percentChange = before > 0 ? ((delta / before) * 100) : (delta * 20); // 20% per point if starting from 0

        metricDeltas[metric] = {
          before: parseFloat(before.toFixed(2)),
          after: parseFloat(after.toFixed(2)),
          delta: parseFloat(delta.toFixed(2)),
          percentChange: parseFloat(percentChange.toFixed(2)),
          improved: delta > 0,
        };

        totalDelta += delta;
        if (delta > 0) improvedCount++;
      });

      const averageDelta = totalDelta / 6;

      improvement.improvements.subjectiveMetrics = {
        before: beforeScores,
        after: afterScores,
        deltas: metricDeltas,
        averageDelta: parseFloat(averageDelta.toFixed(2)),
        improvedMetricsCount: improvedCount,
        improvedMetrics: Object.entries(metricDeltas)
          .filter(([_, data]) => data.improved)
          .map(([metric]) => metric),
        degradedMetrics: Object.entries(metricDeltas)
          .filter(([_, data]) => !data.improved && data.delta < 0)
          .map(([metric]) => metric),
      };
    } else {
      improvement.improvements.subjectiveMetrics = {
        before: beforeEvaluation.subjectiveMetrics?.scores || null,
        after: afterEvaluation.subjectiveMetrics?.scores || null,
        note: 'Insufficient data for comparison'
      };
    }

    // 3. Content Quality Improvement
    if (beforeEvaluation.contentQuality && afterEvaluation.contentQuality) {
      const beforeQuality = beforeEvaluation.contentQuality.overallScore || 0;
      const afterQuality = afterEvaluation.contentQuality.overallScore || 0;
      const deltaQuality = afterQuality - beforeQuality;

      improvement.improvements.contentQuality = {
        before: beforeQuality,
        after: afterQuality,
        delta: parseFloat(deltaQuality.toFixed(2)),
        improved: deltaQuality > 0,
      };
    }

    // 4. Overall Improvement Score
    // Weighted average: PAWC (40%), Subjective Metrics (50%), Content Quality (10%)
    let overallScore = 0;
    let weightSum = 0;

    if (improvement.improvements.pawc?.delta !== null) {
      // Normalize PAWC delta (assuming max improvement of 10%)
      const normalizedPAWC = Math.min(Math.max(improvement.improvements.pawc.delta / 10, -1), 1);
      overallScore += normalizedPAWC * 0.4;
      weightSum += 0.4;
    }

    if (improvement.improvements.subjectiveMetrics?.averageDelta !== undefined) {
      // Normalize subjective delta (assuming max improvement of 2 points)
      const normalizedSubjective = Math.min(Math.max(improvement.improvements.subjectiveMetrics.averageDelta / 2, -1), 1);
      overallScore += normalizedSubjective * 0.5;
      weightSum += 0.5;
    }

    if (improvement.improvements.contentQuality?.delta !== undefined) {
      // Normalize content quality delta (assuming max improvement of 5 points)
      const normalizedQuality = Math.min(Math.max(improvement.improvements.contentQuality.delta / 5, -1), 1);
      overallScore += normalizedQuality * 0.1;
      weightSum += 0.1;
    }

    if (weightSum > 0) {
      improvement.overallImprovement = parseFloat((overallScore / weightSum * 100).toFixed(2)); // As percentage
    }

    // 5. Summary
    improvement.summary = {
      improved: improvement.overallImprovement > 0,
      improvementPercentage: improvement.overallImprovement || 0,
      keyImprovements: Object.entries(improvement.improvements.subjectiveMetrics?.deltas || {})
        .filter(([_, data]) => data.improved && data.delta > 0.3)
        .map(([metric]) => metric),
      keyDegradations: Object.entries(improvement.improvements.subjectiveMetrics?.deltas || {})
        .filter(([_, data]) => !data.improved && data.delta < -0.3)
        .map(([metric]) => metric),
    };

    console.log(`✅ [EvaluationPipeline] Comparison complete`);
    console.log(`   Overall Improvement: ${improvement.overallImprovement?.toFixed(2) || 'N/A'}%`);
    console.log(`   Improved Metrics: ${improvement.summary.keyImprovements.length}`);
    console.log(`   Degraded Metrics: ${improvement.summary.keyDegradations.length}`);

    return improvement;
  }

  /**
   * Evaluate before and after content regeneration
   * Main entry point for before/after evaluation
   * 
   * @param {Object} params
   * @param {string} params.originalContent - Original content
   * @param {string} params.regeneratedContent - Regenerated content
   * @param {string} params.pageUrl - Page URL
   * @param {string} params.brandName - Brand name
   * @param {string} params.userId - User ID
   * @param {string} params.urlAnalysisId - URL Analysis ID
   * @returns {Promise<Object>} Before/after comparison report
   */
  async evaluateBeforeAfter({ originalContent, regeneratedContent, pageUrl, brandName, userId, urlAnalysisId }) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 [EvaluationPipeline] Starting Before/After Evaluation`);
    console.log(`   Page: ${pageUrl}`);
    console.log(`   Brand: ${brandName}`);
    console.log('='.repeat(70));

    // Evaluate original content (BEFORE)
    const beforeEvaluation = await this.evaluateContent({
      content: originalContent,
      pageUrl,
      brandName,
      userId,
      urlAnalysisId,
      isRegenerated: false,
    });

    // Evaluate regenerated content (AFTER)
    const afterEvaluation = await this.evaluateContent({
      content: regeneratedContent,
      pageUrl,
      brandName,
      userId,
      urlAnalysisId,
      isRegenerated: true,
    });

    // Compare and calculate improvement
    const improvement = this.compareEvaluations(beforeEvaluation, afterEvaluation);

    return {
      before: beforeEvaluation,
      after: afterEvaluation,
      improvement,
    };
  }
}

module.exports = new EvaluationPipelineService();

