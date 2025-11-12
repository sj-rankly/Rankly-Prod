/**
 * Metrics Aggregation Service
 *
 * Aggregates PromptTest results into dashboard metrics using deterministic formulas.
 * Calculates metrics at: Overall, Platform, Topic, Persona levels
 *
 * Uses sentence-level data from PromptTest.brandMetrics to calculate:
 * - Total Mentions (primary ranking metric)
 * - Depth of Mention (exponential decay formula)
 * - Average Position
 * - Share of Voice
 * - Citation Share (brand, earned, social)
 * - Sentiment Score & Breakdown
 * - Position Distribution
 */

const PromptTest = require('../models/PromptTest');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const UrlAnalysis = require('../models/UrlAnalysis');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');

class MetricsAggregationService {
  constructor() {
    console.log('📊 MetricsAggregationService initialized');
  }

  /**
   * Calculate and store all metrics for a user
   * @param {string} userId - User ID
   * @param {object} filters - Optional filters { urlAnalysisId, dateFrom, dateTo }
   * @returns {Promise<object>} - Aggregation results
   */
  async calculateMetrics(userId, filters = {}) {
    try {
      console.log('📊 Starting metrics aggregation for user:', userId);

      const { urlAnalysisId, dateFrom, dateTo } = filters;

      // Build query
      const query = {
        userId,
        status: 'completed'
      };

      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      if (dateFrom || dateTo) {
        query.testedAt = {};
        if (dateFrom) query.testedAt.$gte = new Date(dateFrom);
        if (dateTo) query.testedAt.$lte = new Date(dateTo);
      }

      // Fetch all completed tests
      const tests = await PromptTest.find(query)
        .populate('topicId', 'name')
        .populate('personaId', 'type')
        .lean();

      if (!tests || tests.length === 0) {
        console.log('⚠️  No completed tests found');
        return { success: false, message: 'No tests to aggregate' };
      }

      console.log(`✅ Found ${tests.length} tests to aggregate`);
      
      // Debug: Show sample test data
      if (tests.length > 0) {
        console.log('🔍 Sample test data:');
        console.log(`   First test llmProvider: ${tests[0].llmProvider}`);
        console.log(`   First test brandMetrics count: ${tests[0].brandMetrics?.length || 0}`);
        if (tests[0].brandMetrics?.length > 0) {
          console.log(`   First test first brand: ${tests[0].brandMetrics[0].brandName}`);
        }
      }

      // Calculate metrics at each scope level
      const results = {
        overall: await this.aggregateOverall(userId, tests, filters),
        platform: await this.aggregatePlatform(userId, tests, filters),
        topic: await this.aggregateTopic(userId, tests, filters),
        persona: await this.aggregatePersona(userId, tests, filters)
      };

      const totalCalculations = 
        (results.overall ? 1 : 0) + 
        results.platform.length + 
        results.topic.length + 
        results.persona.length;

      console.log('✅ Metrics aggregation complete');
      console.log('   Overall:', results.overall ? 'saved' : 'skipped');
      console.log('   Platforms:', results.platform.length, 'saved');
      console.log('   Topics:', results.topic.length, 'saved');
      console.log('   Personas:', results.persona.length, 'saved');
      console.log('   Total calculations:', totalCalculations);


      return { 
        success: true, 
        results,
        totalCalculations
      };

    } catch (error) {
      console.error('❌ Metrics aggregation error:', error);
      throw error;
    }
  }

  /**
   * Aggregate metrics at OVERALL level (all tests combined)
   */
  async aggregateOverall(userId, tests, filters) {
    console.log('  → Aggregating OVERALL metrics');

    const brandMetrics = await this.calculateBrandMetrics(tests, userId, filters.urlAnalysisId);

    const metricsDoc = {
      userId,
      urlAnalysisId: filters.urlAnalysisId,
      scope: 'overall',
      scopeValue: 'all',
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(tests[0].testedAt),
      dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(tests[tests.length - 1].testedAt),
      totalPrompts: new Set(tests.map(t => t.promptId.toString())).size,
      totalResponses: tests.length,
      totalBrands: brandMetrics.length,
      brandMetrics,
      lastCalculated: new Date(),
      promptTestIds: tests.map(t => t._id.toString())
    };

    // Upsert (replace existing or create new)
    await AggregatedMetrics.findOneAndUpdate(
      { userId, scope: 'overall', scopeValue: 'all', urlAnalysisId: filters.urlAnalysisId },
      metricsDoc,
      { upsert: true, new: true }
    );

    return metricsDoc;
  }

  /**
   * Aggregate metrics at PLATFORM level (per LLM provider)
   */
  async aggregatePlatform(userId, tests, filters) {
    console.log('  → Aggregating PLATFORM metrics');

    const platforms = ['openai', 'gemini', 'claude', 'perplexity'];
    const saved = [];

    // Debug: Show platform distribution
    console.log('🔍 Platform distribution:');
    platforms.forEach(platform => {
      const count = tests.filter(t => t.llmProvider === platform).length;
      console.log(`   ${platform}: ${count} tests`);
    });

    for (const platform of platforms) {
      const platformTests = tests.filter(t => t.llmProvider === platform);

      if (platformTests.length === 0) continue;

      const brandMetrics = await this.calculateBrandMetrics(platformTests, userId, filters.urlAnalysisId);

      const metricsDoc = {
        userId,
        urlAnalysisId: filters.urlAnalysisId,
        scope: 'platform',
        scopeValue: platform,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(platformTests[0].testedAt),
        dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(platformTests[platformTests.length - 1].testedAt),
        totalPrompts: new Set(platformTests.map(t => t.promptId.toString())).size,
        totalResponses: platformTests.length,
        totalBrands: brandMetrics.length,
        brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: platformTests.map(t => t._id.toString())
      };

      await AggregatedMetrics.findOneAndUpdate(
        { userId, scope: 'platform', scopeValue: platform, urlAnalysisId: filters.urlAnalysisId },
        metricsDoc,
        { upsert: true, new: true }
      );

      saved.push(metricsDoc);
    }

    return saved;
  }

  /**
   * Aggregate metrics at TOPIC level
   */
  async aggregateTopic(userId, tests, filters) {
    console.log('  → Aggregating TOPIC metrics');

    // Group tests by topic
    const topicGroups = {};
    tests.forEach(t => {
      const topicName = t.topicId?.name || 'Unknown';
      if (!topicGroups[topicName]) topicGroups[topicName] = [];
      topicGroups[topicName].push(t);
    });

    const saved = [];

    for (const [topicName, topicTests] of Object.entries(topicGroups)) {
      const brandMetrics = await this.calculateBrandMetrics(topicTests, userId, filters.urlAnalysisId);

      const metricsDoc = {
        userId,
        urlAnalysisId: filters.urlAnalysisId,
        scope: 'topic',
        scopeValue: topicName,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(topicTests[0].testedAt),
        dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(topicTests[topicTests.length - 1].testedAt),
        totalPrompts: new Set(topicTests.map(t => t.promptId.toString())).size,
        totalResponses: topicTests.length,
        totalBrands: brandMetrics.length,
        brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: topicTests.map(t => t._id.toString())
      };

      await AggregatedMetrics.findOneAndUpdate(
        { userId, scope: 'topic', scopeValue: topicName, urlAnalysisId: filters.urlAnalysisId },
        metricsDoc,
        { upsert: true, new: true }
      );

      saved.push(metricsDoc);
    }

    return saved;
  }

  /**
   * Aggregate metrics at PERSONA level
   */
  async aggregatePersona(userId, tests, filters) {
    console.log('  → Aggregating PERSONA metrics');

    // Group tests by persona
    const personaGroups = {};
    tests.forEach(t => {
      const personaType = t.personaId?.type || 'Unknown';
      if (!personaGroups[personaType]) personaGroups[personaType] = [];
      personaGroups[personaType].push(t);
    });

    const saved = [];

    for (const [personaType, personaTests] of Object.entries(personaGroups)) {
      const brandMetrics = await this.calculateBrandMetrics(personaTests, userId, filters.urlAnalysisId);

      const metricsDoc = {
        userId,
        urlAnalysisId: filters.urlAnalysisId,
        scope: 'persona',
        scopeValue: personaType,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(personaTests[0].testedAt),
        dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(personaTests[personaTests.length - 1].testedAt),
        totalPrompts: new Set(personaTests.map(t => t.promptId.toString())).size,
        totalResponses: personaTests.length,
        totalBrands: brandMetrics.length,
        brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: personaTests.map(t => t._id.toString())
      };

      await AggregatedMetrics.findOneAndUpdate(
        { userId, scope: 'persona', scopeValue: personaType, urlAnalysisId: filters.urlAnalysisId },
        metricsDoc,
        { upsert: true, new: true }
      );

      saved.push(metricsDoc);
    }

    return saved;
  }

  /**
   * Calculate brand metrics from a set of tests using dashboard formulas
   * Now includes ALL selected competitors, even if they have 0 mentions
   */
  async calculateBrandMetrics(tests, userId, urlAnalysisId = null) {
    // ✅ Step 1: Get user's brand name from UrlAnalysis
    const UrlAnalysis = require('../models/UrlAnalysis');
    const Competitor = require('../models/Competitor');
    
    const urlAnalysis = await UrlAnalysis.findOne({ 
      userId,
      ...(urlAnalysisId && { _id: urlAnalysisId })
    }).sort({ createdAt: -1 }).lean();
    
    console.log(`     🔍 UrlAnalysis query result:`, {
      found: !!urlAnalysis,
      urlAnalysisId: urlAnalysisId,
      userId: userId,
      brandContext: urlAnalysis?.brandContext
    });
    
    const userBrandName = urlAnalysis?.brandContext?.companyName || 'Unknown Brand';
    console.log(`     🏢 User's brand: ${userBrandName}`);
    
    // ✅ Step 2: Get all selected competitors from database
    const query = { userId, selected: true };
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }
    
    const selectedCompetitors = await Competitor.find(query).lean();
    console.log(`     🎯 Selected competitors from database: ${selectedCompetitors.length}`);
    console.log(`     🔍 Competitor query:`, query);
    selectedCompetitors.forEach(comp => {
      console.log(`        → ${comp.name}`);
    });
    
    // ✅ Step 3: Initialize with ONLY user's brand + selected competitors for this analysis
    // CRITICAL FIX: Only include brands that are:
    // 1. The user's brand
    // 2. Selected competitors for this urlAnalysisId
    // DO NOT add brands from tests - they may be from other analyses or unselected competitors
    const allBrandNames = new Set([userBrandName]);
    selectedCompetitors.filter(comp => comp.name && comp.selected).forEach(comp => allBrandNames.add(comp.name));
    
    console.log(`     📊 Total brands to calculate metrics for: ${allBrandNames.size} (user brand + selected competitors only)`);
    allBrandNames.forEach(brand => {
      console.log(`        → ${brand}`);
    });
    
    // ✅ VALIDATION: Log if any tests mention brands not in our selected set (for debugging)
    const mentionedBrands = new Set();
    tests.forEach(test => {
      test.brandMetrics?.forEach(bm => {
        if (bm.brandName) mentionedBrands.add(bm.brandName);
      });
    });
    
    const unselectedBrands = Array.from(mentionedBrands).filter(brand => !allBrandNames.has(brand));
    if (unselectedBrands.length > 0) {
      console.warn(`     ⚠️ [WARNING] Tests mention brands not in selected set (will be filtered out):`, unselectedBrands);
      console.warn(`     ⚠️ [WARNING] This may indicate data inconsistency or brands from other analyses`);
    }

    const brandMetrics = [];

    // ✅ Step 4: Calculate metrics ONLY for selected brands (user brand + selected competitors)
    // This ensures we only show competitors that:
    // 1. Were selected by the user
    // 2. Belong to this urlAnalysisId
    for (const brandName of allBrandNames) {
      const metrics = this.calculateSingleBrandMetrics(brandName, tests, userBrandName);
      brandMetrics.push(metrics);
    }

    // ✅ Step 6: Calculate ranks for each metric
    this.assignRanks(brandMetrics);

    // Debug log to verify isOwner is set correctly
    console.log('🔍 [calculateBrandMetrics] User brand name:', userBrandName);
    console.log('🔍 [calculateBrandMetrics] Brand metrics with isOwner:', brandMetrics.map(b => ({ name: b.brandName, isOwner: b.isOwner })));

    return brandMetrics;
  }

  /**
   * Calculate all metrics for a single brand across tests
   */
  calculateSingleBrandMetrics(brandName, tests, userBrandName) {
    const brandData = {
      brandId: brandName.toLowerCase().replace(/\s+/g, '-'),
      brandName,
      totalAppearances: 0, // Will be set from uniquePromptIds.size
      totalMentions: 0,
      firstPositions: [],
      sentences: [],
      count1st: 0,
      count2nd: 0,
      count3rd: 0,
      
      // Citation data
      brandCitations: 0,
      earnedCitations: 0,
      socialCitations: 0,
      totalCitations: 0,
      citationCount: 0, // Number of tests with citations
      
      // Sentiment data
      sentimentScores: [],
      sentimentCounts: {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0
      },
      
      // ✅ Track unique prompts (not tests)
      uniquePromptIds: new Set()
    };

    // Store total words in ALL responses for depth calculation denominator
    let totalWordsAllResponses = 0;
    tests.forEach(test => {
      totalWordsAllResponses += test.responseMetadata?.totalWords || 0;
    });

    // Extract data from each test
    tests.forEach(test => {
      const brandMetric = test.brandMetrics?.find(bm => bm.brandName === brandName);

      if (brandMetric && brandMetric.mentioned) {
        // ✅ Track unique prompts (same prompt tested on different platforms counts as 1)
        if (test.promptId) {
          brandData.uniquePromptIds.add(test.promptId.toString());
        }
        
        brandData.totalMentions += brandMetric.mentionCount || 0;

        // First positions
        if (brandMetric.firstPosition) {
          brandData.firstPositions.push(brandMetric.firstPosition);
        }

        // Sentences for depth calculation (with test metadata for position normalization)
        if (brandMetric.sentences && brandMetric.sentences.length > 0) {
          const totalSentences = test.responseMetadata?.totalSentences || 1;
          brandMetric.sentences.forEach(sent => {
            brandData.sentences.push({
              ...sent,
              totalSentences // Pass total sentences for normalization
            });
          });
        }

        // Position distribution (rank among brands)
        if (brandMetric.rankPosition === 1) brandData.count1st++;
        else if (brandMetric.rankPosition === 2) brandData.count2nd++;
        else if (brandMetric.rankPosition === 3) brandData.count3rd++;
        
        // Citation data - derive deterministically from labeled citations only
        // Ignore unlabeled/unknown or malformed URLs
        // Use confidence-weighted counting for better accuracy
        if (Array.isArray(brandMetric.citations)) {
          const validTypes = new Set(['brand', 'earned', 'social']);

          let brandCount = 0;
          let earnedCount = 0;
          let socialCount = 0;

          brandMetric.citations.forEach(c => {
            if (!c || !c.url || typeof c.url !== 'string') return;
            const type = c.type;
            if (!validTypes.has(type)) return;

            // Use confidence-weighted counting (confidence from classification)
            // Default confidence: 0.8 if not specified (backward compatible)
            const confidence = c.confidence !== undefined ? c.confidence : 0.8;
            
            // Type-specific weights (brand = highest confidence, social = lowest)
            const typeWeight = type === 'brand' ? 1.0 : 
                             type === 'earned' ? 0.9 : 0.8;
            
            // Weighted count = confidence * type weight
            const weightedCount = confidence * typeWeight;

            if (type === 'brand') brandCount += weightedCount;
            else if (type === 'earned') earnedCount += weightedCount;
            else if (type === 'social') socialCount += weightedCount;
          });

          // Round to integer for display, but keep precision for calculations
          const total = brandCount + earnedCount + socialCount;

          brandData.brandCitations += brandCount;
          brandData.earnedCitations += earnedCount;
          brandData.socialCitations += socialCount;
          brandData.totalCitations += total;
          if (total > 0) {
            brandData.citationCount++;
          }
        } else if (brandMetric.citationMetrics) {
          // Fallback to precomputed metrics if citations array is unavailable
          brandData.brandCitations += brandMetric.citationMetrics?.brandCitations || 0;
          brandData.earnedCitations += brandMetric.citationMetrics?.earnedCitations || 0;
          brandData.socialCitations += brandMetric.citationMetrics?.socialCitations || 0;
          const total = (brandMetric.citationMetrics?.brandCitations || 0)
            + (brandMetric.citationMetrics?.earnedCitations || 0)
            + (brandMetric.citationMetrics?.socialCitations || 0);
          brandData.totalCitations += total;
          if (total > 0) {
            brandData.citationCount++;
          }
        }
        
        // Sentiment data
        if (brandMetric.sentimentScore !== undefined && brandMetric.sentimentScore !== null) {
          brandData.sentimentScores.push(brandMetric.sentimentScore);
        }
        
        // ✅ FIXED: Sentiment calculation logic
        let sentiment;
        if (brandName === userBrandName) {
          // For main brand (Amazon India), use the overall test sentiment
          sentiment = test.scorecard?.sentiment;
        } else {
          // For competitors, use overall test sentiment when they are mentioned
          const competitorsMentioned = test.scorecard?.competitorsMentioned || [];
          if (competitorsMentioned.includes(brandName)) {
            sentiment = test.scorecard?.sentiment;
          }
        }
        
        if (sentiment) {
          brandData.sentimentCounts[sentiment]++;
        }
      }
    });

    // ✅ UPDATED: Calculate totalAppearances using deterministic extraction (brandMetrics.mentioned)
    // Count tests where this brand was marked mentioned by the extractor, not raw substring checks
    const testsWithBrandMention = tests.filter(test =>
      Array.isArray(test.brandMetrics) &&
      test.brandMetrics.some(bm => bm.brandName === brandName && bm.mentioned)
    );

    brandData.totalAppearances = testsWithBrandMention.length;

    console.log(`     ✅ Total prompt responses where ${brandName} is mentioned: ${brandData.totalAppearances}`);
    console.log(`     📊 Total mentions across all LLM responses: ${brandData.totalMentions}`);

    // Calculate total unique prompt responses in the dataset (for visibility score denominator)
    const totalResponses = tests.length; // Total number of LLM responses

    // 1. Visibility Score = (# of prompt responses where brand appears / total prompt responses) × 100
    // Formula: VisibilityScore(b) = (# of prompt responses where Brand b appears / Total prompt responses) × 100
    const visibilityScore = totalResponses > 0
      ? parseFloat(((brandData.totalAppearances / totalResponses) * 100).toFixed(2))
      : 0;
    
    console.log(`     📈 Visibility Score: ${visibilityScore}% (${brandData.totalAppearances} / ${totalResponses} unique responses)`);

    // 2. Average Position = Sum of positions / Count of appearances
    // Formula: AvgPos(b) = (Σ positions of Brand b) / (# of tests where Brand b appears)
    const avgPosition = brandData.firstPositions.length > 0
      ? parseFloat((brandData.firstPositions.reduce((a, b) => a + b, 0) / brandData.firstPositions.length).toFixed(2))
      : 0;

    // 3. Depth of Mention = Weighted word count with exponential decay
    // Formula: Depth(b) = (Σ [words in Brand b sentences × exp(− pos(sentence)/totalSentences)] / (Σ words in all responses) × 100
    let depthOfMention = 0;
    if (brandData.sentences.length > 0 && totalWordsAllResponses > 0) {
      let weightedWordCount = 0;

      brandData.sentences.forEach(sent => {
        const totalSentences = sent.totalSentences || 1;
        const normalizedPosition = sent.position / totalSentences; // Normalize 0-1
        const decay = Math.exp(-normalizedPosition); // Exponential decay
        weightedWordCount += sent.wordCount * decay;
      });

      depthOfMention = parseFloat(((weightedWordCount / totalWordsAllResponses) * 100).toFixed(4));
    }

    // 4. Citation Share = Will be calculated later in assignRanks()
    // Formula: CitationShare(b) = (Total citations of Brand b / Total citations of all brands) × 100
    const citationShare = 0; // Will be calculated in assignRanks() with proper formula

    // 5. Sentiment Score = Average sentiment score
    const sentimentScore = brandData.sentimentScores.length > 0
      ? parseFloat((brandData.sentimentScores.reduce((a, b) => a + b, 0) / brandData.sentimentScores.length).toFixed(2))
      : 0;

    // 6. Sentiment Share = % positive mentions
    const totalSentimentCounts = Object.values(brandData.sentimentCounts).reduce((a, b) => a + b, 0);
    const sentimentShare = totalSentimentCounts > 0
      ? parseFloat(((brandData.sentimentCounts.positive / totalSentimentCounts) * 100).toFixed(2))
      : 0;

    // 7. Share of Voice = (brand mentions / total mentions) × 100
    // Will be calculated after we know total mentions across all brands

    return {
      brandId: brandData.brandId,
      brandName: brandData.brandName,
      isOwner: brandData.brandName === userBrandName, // Mark user's brand

      // Visibility Score (primary metric)
      visibilityScore,
      visibilityRank: 0, // Assigned later

      // Total mentions metric
      totalMentions: brandData.totalMentions,
      mentionRank: 0, // Assigned later

      shareOfVoice: 0, // Calculated after total mentions known
      shareOfVoiceRank: 0,

      avgPosition,
      avgPositionRank: 0, // Assigned later

      depthOfMention,
      depthRank: 0, // Assigned later

      // Citation metrics
      citationShare,
      citationShareRank: 0, // Assigned later
      brandCitationsTotal: brandData.brandCitations,
      earnedCitationsTotal: brandData.earnedCitations,
      socialCitationsTotal: brandData.socialCitations,
      totalCitations: brandData.totalCitations,

      // Sentiment metrics
      sentimentScore,
      sentimentBreakdown: {
        positive: brandData.sentimentCounts.positive,
        neutral: brandData.sentimentCounts.neutral,
        negative: brandData.sentimentCounts.negative,
        mixed: brandData.sentimentCounts.mixed
      },
      sentimentShare,

      count1st: brandData.count1st,
      count2nd: brandData.count2nd,
      count3rd: brandData.count3rd,
      rank1st: 0, // Assigned later
      rank2nd: 0,
      rank3rd: 0,

      totalAppearances: brandData.totalAppearances
    };
  }

  /**
   * Assign ranks to all brands for each metric
   */
  assignRanks(brandMetrics) {
    // Calculate Share of Voice first (needs total mentions)
    const totalMentions = brandMetrics.reduce((sum, b) => sum + b.totalMentions, 0);

    brandMetrics.forEach(b => {
      b.shareOfVoice = totalMentions > 0
        ? parseFloat(((b.totalMentions / totalMentions) * 100).toFixed(2))
        : 0;
    });

    // Calculate Citation Share (needs total citations across all brands)
    // Formula: CitationShare(b) = (Total citations of Brand b / Total citations of all brands) × 100
    // Apply statistical smoothing for small sample sizes to reduce variance
    const totalCitationsAllBrands = brandMetrics.reduce((sum, b) => sum + (b.totalCitations || 0), 0);
    
    const MIN_CITATION_SAMPLE = 10; // Minimum total citations across all brands
    const brandCount = brandMetrics.length;
    
    brandMetrics.forEach(b => {
      const rawCitationShare = totalCitationsAllBrands > 0
        ? (b.totalCitations / totalCitationsAllBrands) * 100
        : 0;

      // Apply Bayesian smoothing for small samples (same as metricsCalculator)
      let citationShare = rawCitationShare;
      if (totalCitationsAllBrands < MIN_CITATION_SAMPLE) {
        const priorWeight = (MIN_CITATION_SAMPLE - totalCitationsAllBrands) / MIN_CITATION_SAMPLE;
        const equalShare = 100 / brandCount; // Equal prior distribution
        citationShare = rawCitationShare * (1 - priorWeight) + equalShare * priorWeight;
      }

      b.citationShare = parseFloat(citationShare.toFixed(2));
    });

    // Assign ranks for each metric
    // Higher is better: visibility, mentions, depth, share of voice, citation share
    // Lower is better: average position

    this.assignRanksByMetric(brandMetrics, 'visibilityScore', 'visibilityRank', true);
    this.assignRanksByMetric(brandMetrics, 'totalMentions', 'mentionRank', true);
    this.assignRanksByMetric(brandMetrics, 'depthOfMention', 'depthRank', true);
    this.assignRanksByMetric(brandMetrics, 'shareOfVoice', 'shareOfVoiceRank', true);
    // Average Position: lower is better (position 2.83 is better than 3.35)
    // higherIsBetter = false means we sort ascending (lower values first), so rank 1 = best (lowest position)
    this.assignRanksByMetric(brandMetrics, 'avgPosition', 'avgPositionRank', false);
    this.assignRanksByMetric(brandMetrics, 'citationShare', 'citationShareRank', true);

    // Position distribution ranks
    this.assignRanksByMetric(brandMetrics, 'count1st', 'rank1st', true);
    this.assignRanksByMetric(brandMetrics, 'count2nd', 'rank2nd', true);
    this.assignRanksByMetric(brandMetrics, 'count3rd', 'rank3rd', true);
  }

  /**
   * Helper to assign ranks based on a metric
   * @param {Array} brands - Array of brand metrics
   * @param {String} metricKey - Key of metric to rank by
   * @param {String} rankKey - Key to store rank in
   * @param {Boolean} higherIsBetter - true if higher values get rank 1
   */
  assignRanksByMetric(brands, metricKey, rankKey, higherIsBetter) {
    // Create mapping of brandName to brand object for faster lookup
    const brandMap = {};
    brands.forEach(b => {
      brandMap[b.brandName] = b;
    });

    // Sort by metric (copy array so we don't mutate original order)
    const sorted = [...brands].sort((a, b) => {
      const aVal = a[metricKey] || 0;
      const bVal = b[metricKey] || 0;

      return higherIsBetter
        ? bVal - aVal  // Descending (higher is better)
        : aVal - bVal; // Ascending (lower is better)
    });

    // ✅ FIX: Assign ranks with proper tie handling (same value = same rank)
    let currentRank = 1;
    sorted.forEach((sortedBrand, index) => {
      const brand = brandMap[sortedBrand.brandName];
      if (brand) {
        // If this is not the first item and the value differs from previous, update rank
        if (index > 0) {
          const prevValue = sorted[index - 1][metricKey] || 0;
          const currValue = sortedBrand[metricKey] || 0;
          
          // If values are different, increment rank
          if (prevValue !== currValue) {
            currentRank = index + 1;
          }
          // If values are the same, keep the same rank (tie handling)
        }
        
        brand[rankKey] = currentRank;
      }
    });
  }
}

module.exports = new MetricsAggregationService();
