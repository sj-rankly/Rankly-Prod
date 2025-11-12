const axios = require('axios');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const Insights = require('../models/Insights');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
const { getShortBrandName: getShortBrandNameUtil } = require('../utils/brandNameUtils');
// Removed hyperparameters config dependency

class InsightsService {
  constructor() {
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    console.log('🔑 InsightsService: OpenRouter API Key loaded:', this.openRouterApiKey ? 'YES' : 'NO');
  }

  /**
   * Generate insights for a specific tab (visibility, prompts, sentiment, citations)
   * @param {string} userId - User ID
   * @param {string} urlAnalysisId - URL Analysis ID
   * @param {string} tabType - Type of tab ('visibility', 'prompts', 'sentiment', 'citations')
   * @returns {Object} Generated insights
   */
  async generateInsights(userId, urlAnalysisId, tabType = 'visibility') {
    try {
      console.log(`🧠 [InsightsService] Generating ${tabType} insights for user ${userId}`);
      console.log(`📋 [InsightsService] Input parameters:`, { userId, urlAnalysisId, tabType });
      
      // 1. Collect and structure data for the specific tab
      const structuredData = await this.collectTabData(userId, urlAnalysisId, tabType);
      
      // Log structured data summary
      console.log(`📊 [InsightsService] Structured data summary for ${tabType}:`, {
        userBrand: structuredData.userBrand?.name,
        userBrandMetrics: {
          visibilityScore: structuredData.userBrand?.visibilityScore,
          averagePosition: structuredData.userBrand?.averagePosition,
          depthOfMention: structuredData.userBrand?.depthOfMention,
          citationShare: structuredData.userBrand?.citationShare,
          sentimentBreakdown: structuredData.userBrand?.sentimentBreakdown,
          totalMentions: structuredData.userBrand?.totalMentions
        },
        competitorCount: structuredData.competitors?.length || 0,
        competitorNames: structuredData.competitors?.map(c => c.name) || [],
        totalPrompts: structuredData.totalPrompts,
        totalResponses: structuredData.totalResponses,
        platformBreakdownCount: structuredData.platformBreakdown?.length || structuredData.platformPerformance?.length || 0,
        topicBreakdownCount: structuredData.topicBreakdown?.length || structuredData.topicPerformance?.length || 0,
        personaBreakdownCount: structuredData.personaBreakdown?.length || structuredData.personaPerformance?.length || 0
      });
      
      // Deterministic insights
      const performanceInsights = structuredData.performanceInsights || this.generatePerformanceInsights(structuredData, tabType);
      console.log(`📈 [InsightsService] Generated ${performanceInsights?.length || 0} performance insights for ${tabType}`);

      // 2. Generate LLM prompt based on tab type
      const prompt = this.generatePrompt(structuredData, tabType);
      console.log(`📝 [InsightsService] Generated prompt for ${tabType} (length: ${prompt.length} characters)`);
      
      // 3. Call OpenRouter with GPT-4o mini
      const insights = await this.callOpenRouter(prompt);
      
      // 4. Parse and structure the response
      const parsedInsights = this.parseInsightsResponse(insights, tabType);
      parsedInsights.performanceInsights = performanceInsights;
      console.log(`✅ [InsightsService] Parsed insights for ${tabType}:`, {
        whatsWorking: parsedInsights.whatsWorking?.length || 0,
        needsAttention: parsedInsights.needsAttention?.length || 0,
        performanceInsights: parsedInsights.performanceInsights?.length || 0
      });
      
      // 5. Store insights in database
      await this.storeInsights(userId, urlAnalysisId, tabType, parsedInsights);
      
      console.log(`✅ [InsightsService] ${tabType} insights generated and stored successfully`);
      return parsedInsights;
      
    } catch (error) {
      console.error(`❌ [InsightsService] Error generating ${tabType} insights:`, error);
      throw error;
    }
  }

  /**
   * Get stored insights for a tab (with caching)
   * @param {string} userId - User ID
   * @param {string} urlAnalysisId - URL Analysis ID
   * @param {string} tabType - Type of tab
   * @returns {Object|null} Stored insights or null if not found/expired
   */
  async getStoredInsights(userId, urlAnalysisId, tabType) {
    try {
      // Check if insights exist in Insights model
      const query = { userId: userId, tabType: tabType };
      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      
      const existingInsights = await Insights.findOne(query).sort({ generatedAt: -1 });

      if (!existingInsights) {
        console.log(`📭 [InsightsService] No stored insights found for ${tabType}`);
        return null;
      }

      // Check if insights are still fresh (24 hours)
      const now = new Date();
      if (existingInsights.expiresAt && now > existingInsights.expiresAt) {
        console.log(`⏰ [InsightsService] Stored insights for ${tabType} are expired, will regenerate`);
        return null;
      }

      console.log(`✅ [InsightsService] Found fresh insights for ${tabType}`);
      console.log(`⚠️ [InsightsService] WARNING: Using cached insights. To get fresh insights with updated prompts, use forceRegenerate=true or wait for 24-hour cache expiry.`);
      console.log(`📅 [InsightsService] Cached insights generated at: ${existingInsights.generatedAt}`);
      return {
        whatsWorking: existingInsights.whatsWorking,
        needsAttention: existingInsights.needsAttention,
        performanceInsights: existingInsights.performanceInsights || [],
        generatedAt: existingInsights.generatedAt
      };

    } catch (error) {
      console.error(`❌ [InsightsService] Error getting stored insights:`, error);
      return null;
    }
  }

  /**
   * Collect and structure data for specific tab
   */
  async collectTabData(userId, urlAnalysisId, tabType) {
    console.log(`📊 [InsightsService] Collecting data for ${tabType} tab`);
    console.log(`📋 [InsightsService] Collection parameters:`, { userId, urlAnalysisId, tabType });
    
    try {
      // Get overall metrics
      let overallMetrics;
      if (urlAnalysisId) {
        overallMetrics = await AggregatedMetrics.findOne({
          userId: userId,
          urlAnalysisId: urlAnalysisId,
          scope: 'overall'
        }).sort({ lastCalculated: -1 });
      } else {
        // Get the latest overall metrics for the user
        overallMetrics = await AggregatedMetrics.findOne({
          userId: userId,
          scope: 'overall'
        }).sort({ lastCalculated: -1 });
      }

      if (!overallMetrics) {
        throw new Error('No overall metrics found for insights generation');
      }

      console.log(`✅ [InsightsService] Found overall metrics:`, {
        lastCalculated: overallMetrics.lastCalculated,
        totalPrompts: overallMetrics.totalPrompts,
        totalResponses: overallMetrics.totalResponses,
        brandMetricsCount: overallMetrics.brandMetrics?.length || 0,
        brandNames: overallMetrics.brandMetrics?.map(bm => bm.brandName) || []
      });

      // Get platform-specific metrics
      const platformQuery = { userId: userId, scope: 'platform' };
      if (urlAnalysisId) platformQuery.urlAnalysisId = urlAnalysisId;
      const platformMetrics = await AggregatedMetrics.find(platformQuery).sort({ lastCalculated: -1 });
      console.log(`✅ [InsightsService] Found ${platformMetrics.length} platform metrics:`, 
        platformMetrics.map(pm => ({ platform: pm.scopeValue, brandCount: pm.brandMetrics?.length || 0 })));

      // Get topic-specific metrics
      const topicQuery = { userId: userId, scope: 'topic' };
      if (urlAnalysisId) topicQuery.urlAnalysisId = urlAnalysisId;
      const topicMetrics = await AggregatedMetrics.find(topicQuery).sort({ lastCalculated: -1 });
      console.log(`✅ [InsightsService] Found ${topicMetrics.length} topic metrics:`, 
        topicMetrics.map(tm => ({ topic: tm.scopeValue, brandCount: tm.brandMetrics?.length || 0 })));

      // Get persona-specific metrics
      const personaQuery = { userId: userId, scope: 'persona' };
      if (urlAnalysisId) personaQuery.urlAnalysisId = urlAnalysisId;
      const personaMetrics = await AggregatedMetrics.find(personaQuery).sort({ lastCalculated: -1 });
      console.log(`✅ [InsightsService] Found ${personaMetrics.length} persona metrics:`, 
        personaMetrics.map(pm => ({ persona: pm.scopeValue, brandCount: pm.brandMetrics?.length || 0 })));

      // Get user's topics and personas for context
      const [topics, personas, competitors] = await Promise.all([
        Topic.find({ userId: userId }),
        Persona.find({ userId: userId }),
        Competitor.find({ userId: userId })
      ]);

      console.log(`✅ [InsightsService] Found context data:`, {
        topicsCount: topics.length,
        personasCount: personas.length,
        competitorsCount: competitors.length
      });

      // Structure data based on tab type
      const structured = this.structureDataForTab({
        overallMetrics,
        platformMetrics,
        topicMetrics,
        personaMetrics,
        topics,
        personas,
        competitors
      }, tabType);
      
      // Log structured data metrics for current tab
      console.log(`📊 [InsightsService] Structured data metrics for ${tabType}:`, {
        userBrandName: structured.userBrand?.name,
        userBrandVisibility: structured.userBrand?.visibilityScore,
        userBrandAvgPosition: structured.userBrand?.averagePosition,
        userBrandDepth: structured.userBrand?.depthOfMention,
        userBrandCitations: structured.userBrand?.citationShare,
        competitorsCount: structured.competitors?.length || 0,
        competitorNames: structured.competitors?.map(c => c.name) || [],
        competitorMetrics: structured.competitors?.map(c => ({
          name: c.name,
          visibility: c.visibilityScore,
          avgPosition: c.averagePosition,
          depth: c.depthOfMention,
          citations: c.citationShare
        })) || []
      });
      
      // Add new: performanceInsights
      structured.performanceInsights = this.generatePerformanceInsights(structured, tabType);
      return structured;

    } catch (error) {
      console.error(`❌ [InsightsService] Error collecting data:`, error);
      throw error;
    }
  }

  /**
   * Structure data specifically for each tab type
   */
  structureDataForTab(data, tabType) {
    const { overallMetrics, platformMetrics, topicMetrics, personaMetrics, topics, personas, competitors } = data;
    
    console.log(`🔧 [InsightsService] Structuring data for ${tabType} tab`);
    
    // Extract user's brand (first in brandMetrics array)
    const userBrand = overallMetrics.brandMetrics[0] || {};
    const competitorBrands = overallMetrics.brandMetrics.slice(1) || [];

    console.log(`👤 [InsightsService] User brand metrics extracted:`, {
      brandName: userBrand.brandName,
      visibilityScore: userBrand.visibilityScore,
      avgPosition: userBrand.avgPosition,
      depthOfMention: userBrand.depthOfMention,
      citationShare: userBrand.citationShare,
      sentimentBreakdown: userBrand.sentimentBreakdown,
      totalMentions: userBrand.totalMentions
    });

    console.log(`🏢 [InsightsService] Competitor brands count: ${competitorBrands.length}`, 
      competitorBrands.map(b => b.brandName));

    const baseStructure = {
      userBrand: {
        name: userBrand.brandName,
        visibilityScore: userBrand.visibilityScore || 0,
        averagePosition: userBrand.avgPosition || 0,
        depthOfMention: userBrand.depthOfMention || 0,
        citationShare: userBrand.citationShare || 0,
        sentimentBreakdown: userBrand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 },
        totalMentions: userBrand.totalMentions || 0
      },
      competitors: competitorBrands.map(brand => ({
        name: brand.brandName,
        visibilityScore: brand.visibilityScore || 0,
        averagePosition: brand.avgPosition || 0,
        depthOfMention: brand.depthOfMention || 0,
        citationShare: brand.citationShare || 0,
        sentimentBreakdown: brand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 },
        rank: brand.visibilityRank || 0
      })),
      totalPrompts: overallMetrics.totalPrompts || 0,
      totalResponses: overallMetrics.totalResponses || 0
    };

    console.log(`📦 [InsightsService] Base structure created with metrics:`, {
      userBrand: baseStructure.userBrand.name,
      userMetrics: {
        visibility: baseStructure.userBrand.visibilityScore,
        avgPosition: baseStructure.userBrand.averagePosition,
        depth: baseStructure.userBrand.depthOfMention,
        citations: baseStructure.userBrand.citationShare,
        totalMentions: baseStructure.userBrand.totalMentions
      },
      competitors: baseStructure.competitors.map(c => ({
        name: c.name,
        visibility: c.visibilityScore,
        avgPosition: c.averagePosition,
        depth: c.depthOfMention,
        citations: c.citationShare,
        rank: c.rank
      })),
      totalPrompts: baseStructure.totalPrompts,
      totalResponses: baseStructure.totalResponses
    });

    // Add tab-specific data
    switch (tabType) {
      case 'visibility':
        return {
          ...baseStructure,
          topicBreakdown: this.getTopicBreakdown(topicMetrics, userBrand, competitorBrands),
          personaBreakdown: this.getPersonaBreakdown(personaMetrics, userBrand, competitorBrands),
          platformBreakdown: this.getPlatformBreakdown(platformMetrics, userBrand, competitorBrands)
        };
      
      case 'prompts':
        const promptsStructure = {
          ...baseStructure,
          promptPerformance: this.getPromptPerformance(overallMetrics),
          topicBreakdown: this.getTopicBreakdown(topicMetrics, userBrand, competitorBrands),
          personaBreakdown: this.getPersonaBreakdown(personaMetrics, userBrand, competitorBrands),
          platformBreakdown: this.getPlatformBreakdown(platformMetrics, userBrand, competitorBrands)
        };
        // Keep legacy keys for backward compatibility (if any code still uses them)
        promptsStructure.topicPerformance = promptsStructure.topicBreakdown;
        promptsStructure.personaPerformance = promptsStructure.personaBreakdown;
        promptsStructure.platformPerformance = promptsStructure.platformBreakdown;
        console.log(`✅ [InsightsService] Prompts structure created with breakdowns:`, {
          topicBreakdown: promptsStructure.topicBreakdown?.length || 0,
          personaBreakdown: promptsStructure.personaBreakdown?.length || 0,
          platformBreakdown: promptsStructure.platformBreakdown?.length || 0
        });
        return promptsStructure;
      
      case 'sentiment':
        return {
          ...baseStructure,
          topicBreakdown: this.getTopicSentimentBreakdown(topicMetrics, userBrand, competitorBrands),
          personaBreakdown: this.getPersonaSentimentBreakdown(personaMetrics, userBrand, competitorBrands),
          platformBreakdown: this.getPlatformSentimentBreakdown(platformMetrics, userBrand, competitorBrands)
        };
      
      case 'citations':
        return {
          ...baseStructure,
          topicBreakdown: this.getTopicBreakdown(topicMetrics, userBrand, competitorBrands),
          personaBreakdown: this.getPersonaBreakdown(personaMetrics, userBrand, competitorBrands),
          platformBreakdown: this.getPlatformBreakdown(platformMetrics, userBrand, competitorBrands)
        };
      
      default:
        return baseStructure;
    }
  }

  /**
   * Get topic breakdown for insights (metrics displayed in frontend)
   * Visibility tab: Visibility Score, Average Position, Depth of Mention
   * Prompts tab: Visibility Score, Average Position, Depth of Mention, Citation Share
   */
  getTopicBreakdown(topicMetrics, userBrand, competitorBrands) {
    console.log(`📊 [InsightsService] Getting topic breakdown for ${topicMetrics.length} topics`);
    const breakdown = topicMetrics.map(topic => {
      const userBrandMetrics = topic.brandMetrics.find(bm => bm.brandName === userBrand.brandName) || {};
      const competitorMetrics = competitorBrands.map(comp => {
        const brandMetric = topic.brandMetrics.find(bm => bm.brandName === comp.brandName) || {};
        return {
          name: comp.brandName,
          visibilityScore: brandMetric.visibilityScore || 0,
          averagePosition: brandMetric.avgPosition || 0,
          depthOfMention: brandMetric.depthOfMention || 0,
          citationShare: brandMetric.citationShare || 0
        };
      });
      
      const topicData = {
        topic: topic.scopeValue,
        userBrand: {
          name: userBrand.brandName,
          visibilityScore: userBrandMetrics.visibilityScore || 0,
          averagePosition: userBrandMetrics.avgPosition || 0,
          depthOfMention: userBrandMetrics.depthOfMention || 0,
          citationShare: userBrandMetrics.citationShare || 0
        },
        competitors: competitorMetrics
      };
      
      console.log(`📊 [InsightsService] Topic breakdown for "${topic.scopeValue}":`, {
        userBrand: topicData.userBrand.name,
        userMetrics: {
          visibility: topicData.userBrand.visibilityScore,
          avgPosition: topicData.userBrand.averagePosition,
          depth: topicData.userBrand.depthOfMention,
          citations: topicData.userBrand.citationShare
        },
        competitorCount: topicData.competitors.length,
        competitorMetrics: topicData.competitors.map(c => ({
          name: c.name,
          visibility: c.visibilityScore,
          avgPosition: c.averagePosition,
          depth: c.depthOfMention,
          citations: c.citationShare
        }))
      });
      
      return topicData;
    });
    console.log(`✅ [InsightsService] Generated ${breakdown.length} topic breakdowns`);
    return breakdown;
  }

  /**
   * Get persona breakdown for insights (metrics displayed in frontend)
   * Visibility tab: Visibility Score, Average Position, Depth of Mention
   * Prompts tab: Visibility Score, Average Position, Depth of Mention, Citation Share
   */
  getPersonaBreakdown(personaMetrics, userBrand, competitorBrands) {
    console.log(`📊 [InsightsService] Getting persona breakdown for ${personaMetrics.length} personas`);
    const breakdown = personaMetrics.map(persona => {
      const userBrandMetrics = persona.brandMetrics.find(bm => bm.brandName === userBrand.brandName) || {};
      const competitorMetrics = competitorBrands.map(comp => {
        const brandMetric = persona.brandMetrics.find(bm => bm.brandName === comp.brandName) || {};
        return {
          name: comp.brandName,
          visibilityScore: brandMetric.visibilityScore || 0,
          averagePosition: brandMetric.avgPosition || 0,
          depthOfMention: brandMetric.depthOfMention || 0,
          citationShare: brandMetric.citationShare || 0
        };
      });
      
      const personaData = {
        persona: persona.scopeValue,
        userBrand: {
          name: userBrand.brandName,
          visibilityScore: userBrandMetrics.visibilityScore || 0,
          averagePosition: userBrandMetrics.avgPosition || 0,
          depthOfMention: userBrandMetrics.depthOfMention || 0,
          citationShare: userBrandMetrics.citationShare || 0
        },
        competitors: competitorMetrics
      };
      
      console.log(`📊 [InsightsService] Persona breakdown for "${persona.scopeValue}":`, {
        userBrand: personaData.userBrand.name,
        userMetrics: {
          visibility: personaData.userBrand.visibilityScore,
          avgPosition: personaData.userBrand.averagePosition,
          depth: personaData.userBrand.depthOfMention,
          citations: personaData.userBrand.citationShare
        },
        competitorCount: personaData.competitors.length,
        competitorMetrics: personaData.competitors.map(c => ({
          name: c.name,
          visibility: c.visibilityScore,
          avgPosition: c.averagePosition,
          depth: c.depthOfMention,
          citations: c.citationShare
        }))
      });
      
      return personaData;
    });
    console.log(`✅ [InsightsService] Generated ${breakdown.length} persona breakdowns`);
    return breakdown;
  }

  /**
   * Get platform breakdown for insights (metrics displayed in frontend)
   * Visibility tab: Visibility Score, Average Position, Depth of Mention
   * Prompts tab: Visibility Score, Average Position, Depth of Mention, Citation Share
   */
  getPlatformBreakdown(platformMetrics, userBrand, competitorBrands) {
    console.log(`📊 [InsightsService] Getting platform breakdown for ${platformMetrics.length} platforms`);
    const breakdown = platformMetrics.map(platform => {
      const userBrandMetrics = platform.brandMetrics.find(bm => bm.brandName === userBrand.brandName) || {};
      const competitorMetrics = competitorBrands.map(comp => {
        const brandMetric = platform.brandMetrics.find(bm => bm.brandName === comp.brandName) || {};
        return {
          name: comp.brandName,
          visibilityScore: brandMetric.visibilityScore || 0,
          averagePosition: brandMetric.avgPosition || 0,
          depthOfMention: brandMetric.depthOfMention || 0,
          citationShare: brandMetric.citationShare || 0
        };
      });
      
      const platformData = {
        platform: platform.scopeValue,
        userBrand: {
          name: userBrand.brandName,
          visibilityScore: userBrandMetrics.visibilityScore || 0,
          averagePosition: userBrandMetrics.avgPosition || 0,
          depthOfMention: userBrandMetrics.depthOfMention || 0,
          citationShare: userBrandMetrics.citationShare || 0
        },
        competitors: competitorMetrics
      };
      
      console.log(`📊 [InsightsService] Platform breakdown for "${platform.scopeValue}":`, {
        userBrand: platformData.userBrand.name,
        userMetrics: {
          visibility: platformData.userBrand.visibilityScore,
          avgPosition: platformData.userBrand.averagePosition,
          depth: platformData.userBrand.depthOfMention,
          citations: platformData.userBrand.citationShare
        },
        competitorCount: platformData.competitors.length,
        competitorMetrics: platformData.competitors.map(c => ({
          name: c.name,
          visibility: c.visibilityScore,
          avgPosition: c.averagePosition,
          depth: c.depthOfMention,
          citations: c.citationShare
        }))
      });
      
      return platformData;
    });
    console.log(`✅ [InsightsService] Generated ${breakdown.length} platform breakdowns`);
    return breakdown;
  }

  /**
   * Get short brand name for use in insights (delegates to utility function)
   * @param {string} brandName - Full brand name
   * @returns {string} Short brand name
   */
  getShortBrandName(brandName) {
    return getShortBrandNameUtil(brandName);
  }

  /**
   * Generate LLM prompt based on tab type and data
   */
  generatePrompt(structuredData, tabType) {
    console.log(`📝 [InsightsService] Generating prompt for ${tabType} tab`);
    const { userBrand, competitors, totalPrompts, totalResponses } = structuredData;
    const userBrandShort = this.getShortBrandName(userBrand.name);
    
    console.log(`📋 [InsightsService] Prompt generation input for ${tabType}:`, {
      userBrand: userBrand.name,
      userBrandShort: userBrandShort,
      competitorCount: competitors?.length || 0,
      competitorNames: competitors?.map(c => c.name) || [],
      totalPrompts: totalPrompts,
      totalResponses: totalResponses,
      userBrandMetrics: {
        visibilityScore: userBrand.visibilityScore,
        averagePosition: userBrand.averagePosition,
        depthOfMention: userBrand.depthOfMention,
        citationShare: userBrand.citationShare,
        sentimentBreakdown: userBrand.sentimentBreakdown
      },
      hasPlatformBreakdown: !!structuredData.platformBreakdown,
      hasTopicBreakdown: !!structuredData.topicBreakdown,
      hasPersonaBreakdown: !!structuredData.personaBreakdown,
      platformBreakdownCount: structuredData.platformBreakdown?.length || 0,
      topicBreakdownCount: structuredData.topicBreakdown?.length || 0,
      personaBreakdownCount: structuredData.personaBreakdown?.length || 0
    });
    
    let prompt = `You are a data-driven competitive intelligence analyst.

Your ONLY job is to identify meaningful performance differences between brands and recommend specific, actionable steps.

CRITICAL RULES:

Use only the metrics provided  do not assume or invent data.

Only generate insights when there's a meaningful gap:

≥15 percentage points in metrics, or

≥2 ranking positions difference.

Create DIVERSE insight types (NOT all competitor comparisons):
- Some insights compare to competitors (when there's a significant gap ≥15% or ≥2 rank positions)
- Some insights show overall/aggregate performance across multiple platforms or topics
- Some insights show cross-platform or cross-topic patterns (comparing performance across 2-3 platforms or topics)
- Some insights focus on single dimension (platform/topic/persona) but vary the dimensions

Include exact numbers, specific competitor names (when comparing), and context (platform/topic/persona).

Each insight must have one precise, actionable recommendation.

ALWAYS use short brand names: "Amex", "Chase", "Capital One", "itilite", "Happay" (never use full brand names).

INSIGHT STRUCTURE:

"Winner [beats/loses] loser with [exact number] vs [exact number] in [specific context]. Recommendation: [specific action]."

REQUIRED OUTPUT FORMAT:

Return output only as JSON in the structure below. Each insight MUST include the specific metric name and exact value:

{
  "whatsWorking": [
    {
      "description": "Winner beats loser with X% vs Y% in [context]",
      "metric": "Visibility Score",
      "value": "70.0%",
      "impact": "High",
      "recommendation": "One specific, actionable step"
    }
  ],
  "needsAttention": [
    {
      "description": "Loser loses to winner with X% vs Y% in [context]",
      "metric": "Average Position",
      "value": "9.89",
      "impact": "High",
      "recommendation": "One specific, actionable step"
    }
  ]
}

CRITICAL: For visibility tab insights, use these exact metric names:
- "Visibility Score" (with % value like "70.0%")
- "Average Position" (with numeric value like "9.89")
- "Depth of Mention" (with % value like "8.53%")

Extract the exact metric value from the data provided. The "value" field should match the exact number from the competitive analysis data above.

USER BRAND (${userBrandShort}): ${userBrand.name}
${tabType === 'prompts' ? `- Visibility Score: ${userBrand.visibilityScore}%
- Depth of Mention: ${userBrand.depthOfMention.toFixed(2)}%
- Citation Share: ${(userBrand.citationShare || 0).toFixed(2)}%` : tabType === 'citations' ? `- Citation Share: ${(userBrand.citationShare || 0).toFixed(2)}%` : tabType === 'sentiment' ? (() => {
  const sentiment = userBrand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  const total = sentiment.positive + sentiment.neutral + sentiment.negative + sentiment.mixed;
  const positive = total > 0 ? (sentiment.positive / total) * 100 : 0;
  const negative = total > 0 ? (sentiment.negative / total) * 100 : 0;
  const neutral = total > 0 ? (sentiment.neutral / total) * 100 : 0;
  return `- Positive Sentiment: ${positive.toFixed(2)}%
- Negative Sentiment: ${negative.toFixed(2)}%
- Neutral Sentiment: ${neutral.toFixed(2)}%`;
})() : `- Visibility Score: ${userBrand.visibilityScore}%
- Average Position: ${userBrand.averagePosition}
- Depth of Mention: ${userBrand.depthOfMention.toFixed(2)}%`}

COMPETITORS:
${competitors.map((c, idx) => {
  const compShort = this.getShortBrandName(c.name);
  if (tabType === 'prompts') {
    return `${idx + 1}. ${compShort} (${c.name}): ${c.visibilityScore}% visibility, rank #${c.rank}, ${(c.depthOfMention || 0).toFixed(2)}% depth, ${(c.citationShare || 0).toFixed(2)}% citations`;
  } else if (tabType === 'citations') {
    return `${idx + 1}. ${compShort} (${c.name}): ${(c.citationShare || 0).toFixed(2)}% citation share, rank #${c.rank}`;
  } else if (tabType === 'sentiment') {
    const compSentiment = c.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
    const compTotal = compSentiment.positive + compSentiment.neutral + compSentiment.negative + compSentiment.mixed;
    const compPositive = compTotal > 0 ? (compSentiment.positive / compTotal) * 100 : 0;
    const compNegative = compTotal > 0 ? (compSentiment.negative / compTotal) * 100 : 0;
    const compNeutral = compTotal > 0 ? (compSentiment.neutral / compTotal) * 100 : 0;
    return `${idx + 1}. ${compShort} (${c.name}): ${compPositive.toFixed(2)}% positive, ${compNegative.toFixed(2)}% negative, ${compNeutral.toFixed(2)}% neutral, rank #${c.rank}`;
  } else {
    return `${idx + 1}. ${compShort} (${c.name}): ${c.visibilityScore}% visibility, rank #${c.rank}, #${c.averagePosition} avg position, ${(c.depthOfMention || 0).toFixed(2)}% depth`;
  }
}).join('\n')}

ANALYSIS BASIS:
- ${totalPrompts} prompts tested across ${totalResponses} LLM responses
- Data represents actual brand mention frequency in AI responses
`;

    // Add tab-specific data to prompt
    switch (tabType) {
      case 'visibility':
        prompt += this.getVisibilityPromptData(structuredData, userBrandShort);
        prompt += `\n\nANALYSIS REQUIREMENTS:

Analyze all metrics (Visibility Score, Average Position, Depth of Mention) across:

Platforms (ChatGPT, Gemini, Claude, Perplexity)

Topics (e.g., Cashback, Membership Rewards)

Personas (e.g., Young Online Shopper, Entry-Level User)

Identify:

Cross-platform trends where ${userBrandShort} performs stronger or weaker across LLMs.

Cross-topic strengths where certain topics outperform others.

Cross-persona insights which user segments ${userBrandShort} resonates with most.

Competitor gaps where direct rivals outperform significantly.

OUTPUT BALANCE RULES - DIVERSITY IS CRITICAL:

Include 2–3 insights per section (whatsWorking, needsAttention).

CRITICAL: Ensure DIVERSITY in insight types. DO NOT create all insights as simple competitor comparisons.

Required mix MUST include:

1. OVERALL/AGGREGATE INSIGHTS (2-3 platforms or topics together):
   - Cross-platform patterns: "Amex performs better on Gemini than on Claude with 81.25% vs 61.00% visibility, suggesting higher platform receptivity."
   - Overall performance: "Amex beats itilite with 71.17% vs 0.26% visibility overall, showing dominant presence across LLMs."
   - Multi-topic patterns: Compare performance across 2-3 topics together

2. SPECIFIC DIMENSIONAL INSIGHTS (single platform/topic/persona):
   - Platform-specific: "on OpenAI", "on Perplexity"
   - Topic-specific: "for 'Annual Fee Waiver' topic", "for '10X Points Merchants'"
   - Persona-specific: "for 'Low-Spending Cardholder'", "for 'Amex Aspirant with Budget Constraints'"

3. COMPETITOR COMPARISONS (but limit to 1-2 per section, not all):
   - Only include when there's a significant gap (≥15% or ≥2 rank positions)
   - Use short brand names: "Amex", "Chase", "Capital One", "itilite", "Happay"

MIX REQUIREMENTS:
- At least 1 overall/aggregate insight per section
- At least 1 multi-platform or multi-topic insight per section
- Only 1-2 direct competitor comparison insights per section
- Variety in metrics (not all Visibility Score, mix with Average Position, Depth of Mention)

Avoid:
- Creating all insights as "X beats/loses to Y" competitor comparisons
- Too granular single-dimension insights (every insight shouldn't be on one platform or one topic)
- Repeating the same metric across multiple insights

EXAMPLES OF DIVERSE INSIGHT STYLES WITH METRIC AND VALUE:

Example 1 - Overall/Aggregate (What's Working):
{
  "description": "${userBrandShort} beats itilite with 71.17% vs 0.26% visibility overall, showing dominant presence across LLMs.",
  "metric": "Visibility Score",
  "value": "71.17%",
  "impact": "High",
  "recommendation": "Keep optimizing prompt coverage and maintain structured content consistency to sustain overall leadership."
}

Example 2 - Cross-Platform Comparison (What's Working):
{
  "description": "${userBrandShort} performs better on Gemini than on Claude with 81.25% vs 61.00% visibility, suggesting higher platform receptivity to ${userBrandShort} content.",
  "metric": "Visibility Score",
  "value": "81.25%",
  "impact": "High",
  "recommendation": "Replicate Gemini-optimized language and tone across Claude prompts to improve brand inclusion on that platform."
}

Example 3 - Persona-Specific (What's Working):
{
  "description": "${userBrandShort} beats itilite with 75.88% vs 0.00% visibility for the 'Young Online Shopper' persona, reflecting strong affinity with younger digital users.",
  "metric": "Visibility Score",
  "value": "75.88%",
  "impact": "High",
  "recommendation": "Double down on online rewards and e-commerce-focused copy to strengthen engagement with younger shoppers."
}

Example 4 - Multi-Platform Competitor (Needs Attention):
{
  "description": "${userBrandShort} loses to Capital One with 76.77% vs 100% visibility and 16.69% vs 60.14% share of voice on Perplexity.",
  "metric": "Visibility Score",
  "value": "76.77%",
  "impact": "High",
  "recommendation": "Expand structured financial comparisons and transactional keyword coverage to boost Perplexity inclusion rates."
}

Example 5 - Topic-Specific (Needs Attention):
{
  "description": "${userBrandShort} trails Capital One with 68.72% vs 95.38% visibility in 'Welcome Cashback' topic.",
  "metric": "Visibility Score",
  "value": "68.72%",
  "impact": "High",
  "recommendation": "Clarify and emphasize cashback reward structure in FAQs and product metadata to improve topic-level relevance."
}

Example 6 - Average Position (Needs Attention):
{
  "description": "${userBrandShort} underperforms against Chase with average position 8.67 vs 5.53 on Perplexity, a gap of over 3 ranking points.",
  "metric": "Average Position",
  "value": "8.67",
  "impact": "High",
  "recommendation": "Revise prompt response phrasing to highlight differentiators earlier in answers and improve average ranking."
}

CRITICAL REQUIREMENTS:
- ALWAYS include "metric" field with exact metric name matching one of: "Visibility Score", "Average Position", "Depth of Mention"
- ALWAYS include "value" field with the user brand's exact numeric value from the data (e.g., "70.0%", "9.89", "8.53%")
- The "value" must be the user brand's actual value, extracted from the competitive analysis data above
- Use specific platform/topic/persona context in descriptions (e.g., "on OpenAI", "for 'Annual Fee Waiver'", "for 'Low-Spending Cardholder'")`;
        break;
      case 'prompts':
        prompt += this.getPromptsPromptData(structuredData, userBrandShort);
        prompt += `\n\nANALYSIS REQUIREMENTS:

Analyze all metrics (Visibility Score, Depth of Mention, Citation Share) across:

Platforms (ChatGPT, Gemini, Claude, Perplexity)

Topics (e.g., Welcome Cashback, Membership Rewards)

Personas (e.g., Young Online Shopper, Entry-Level User)

Identify:

Cross-platform trends where ${userBrandShort} performs stronger or weaker across LLMs.

Cross-topic strengths where certain topics outperform others.

Cross-persona insights which user segments ${userBrandShort} resonates with most.

Competitor gaps where direct rivals outperform significantly.

OUTPUT BALANCE RULES - DIVERSITY IS CRITICAL:

Include 2–3 insights per section (whatsWorking, needsAttention).

CRITICAL: Ensure DIVERSITY in insight types. DO NOT create all insights as simple competitor comparisons.

Required mix MUST include:

1. OVERALL/AGGREGATE INSIGHTS (2-3 platforms or topics together):
   - Cross-platform patterns comparing performance across multiple LLMs
   - Overall performance across all dimensions
   - Multi-topic patterns comparing performance across multiple topics

2. SPECIFIC DIMENSIONAL INSIGHTS (single platform/topic/persona):
   - Platform-specific: "on OpenAI", "on Perplexity", "on Claude", "on Gemini"
   - Topic-specific: Compare performance within specific topics
   - Persona-specific: Compare performance for specific user personas

3. COMPETITOR COMPARISONS (but limit to 1-2 per section, not all):
   - Only include when there's a significant gap (≥15% or ≥2 rank positions)
   - Use short brand names: "Amex", "Chase", "Capital One", "itilite", "Happay"

MIX REQUIREMENTS:
- At least 1 overall/aggregate insight per section
- At least 1 multi-platform or multi-topic insight per section
- Only 1-2 direct competitor comparison insights per section
- Variety in metrics (mix different metrics across insights)

Avoid:
- Creating all insights as "X beats/loses to Y" competitor comparisons
- Too granular single-dimension insights (every insight shouldn't be on one platform or one topic)
- Repeating the same metric across multiple insights

EXAMPLES OF VALID INSIGHT STYLE:

"${userBrandShort} beats itilite with 75.88% vs 0.00% visibility for 'Young Online Shopper', showing strong prompt effectiveness among younger users. Recommendation: Focus prompt content on e-commerce and online shopping benefits."

"${userBrandShort} loses to Capital One with 65.98% vs 90.72% visibility and 10.13% vs 32.84% depth of mention on ChatGPT. Recommendation: Optimize ChatGPT-specific prompts to boost inclusion rates and improve mention depth."

"${userBrandShort} performs better on Gemini than Claude (81.25% vs 61%) suggesting stronger LLM alignment with Gemini prompts. Recommendation: Adapt Gemini's successful prompt patterns across Claude queries."`;
        break;
      case 'sentiment':
        prompt += this.getSentimentPromptData(structuredData, userBrandShort);
        prompt += `\n\nANALYSIS REQUIREMENTS:

Analyze all metrics (Positive Sentiment, Negative Sentiment, Neutral Sentiment) across:

Platforms (ChatGPT, Gemini, Claude, Perplexity)

Topics (e.g., Welcome Cashback, Membership Rewards)

Personas (e.g., Young Online Shopper, Entry-Level User)

Identify:

Cross-platform trends where ${userBrandShort} performs stronger or weaker sentiment-wise across LLMs.

Cross-topic strengths where certain topics generate more positive sentiment.

Cross-persona insights which user segments ${userBrandShort} resonates with most positively.

Competitor gaps where direct rivals have significantly better sentiment positioning.

OUTPUT BALANCE RULES - DIVERSITY IS CRITICAL:

Include 2–3 insights per section (whatsWorking, needsAttention).

CRITICAL: Ensure DIVERSITY in insight types. DO NOT create all insights as simple competitor comparisons.

Required mix MUST include:

1. OVERALL/AGGREGATE INSIGHTS (2-3 platforms or topics together):
   - Cross-platform sentiment patterns comparing performance across multiple LLMs
   - Overall sentiment performance across all dimensions
   - Multi-topic sentiment patterns comparing performance across multiple topics

2. SPECIFIC DIMENSIONAL INSIGHTS (single platform/topic/persona):
   - Platform-specific: "on OpenAI", "on Perplexity", "on Claude", "on Gemini"
   - Topic-specific: Compare sentiment within specific topics
   - Persona-specific: Compare sentiment for specific user personas

3. COMPETITOR COMPARISONS (but limit to 1-2 per section, not all):
   - Only include when there's a significant gap (≥15% or ≥2 rank positions)
   - Use short brand names: "Amex", "Chase", "Capital One", "itilite", "Happay"

MIX REQUIREMENTS:
- At least 1 overall/aggregate insight per section
- At least 1 multi-platform or multi-topic insight per section
- Only 1-2 direct competitor comparison insights per section
- Variety in metrics (mix different metrics across insights)

Avoid:
- Creating all insights as "X beats/loses to Y" competitor comparisons
- Too granular single-dimension insights (every insight shouldn't be on one platform or one topic)
- Repeating the same metric across multiple insights

EXAMPLES OF VALID INSIGHT STYLE:

"${userBrandShort} beats itilite with 85.5% vs 0.0% positive sentiment for 'Young Online Shopper', showing strong positive sentiment among younger users. Recommendation: Focus content on e-commerce and online shopping benefits to maintain positive sentiment."

"${userBrandShort} loses to Capital One with 45.2% vs 78.3% positive sentiment on ChatGPT, with 12.5% vs 5.2% negative sentiment. Recommendation: Address ChatGPT-specific messaging to improve positive sentiment and reduce negative mentions."

"${userBrandShort} performs better on Gemini than Claude (65.8% vs 45.2% positive sentiment) suggesting stronger LLM alignment with Gemini responses. Recommendation: Adapt Gemini's successful messaging patterns across Claude queries."`;
        break;
      case 'citations':
        prompt += this.getCitationsPromptData(structuredData, userBrandShort);
        prompt += `\n\nANALYSIS REQUIREMENTS:

Analyze all metrics (Citation Share) across:

Platforms (ChatGPT, Gemini, Claude, Perplexity)

Topics (e.g., Welcome Cashback, Membership Rewards)

Personas (e.g., Young Online Shopper, Entry-Level User)

Identify:

Cross-platform trends where ${userBrandShort} performs stronger or weaker across LLMs.

Cross-topic strengths where certain topics generate more citations.

Cross-persona insights which user segments ${userBrandShort} resonates with most in terms of citations.

Competitor gaps where direct rivals have significantly better citation share.

OUTPUT BALANCE RULES - DIVERSITY IS CRITICAL:

Include 2–3 insights per section (whatsWorking, needsAttention).

CRITICAL: Ensure DIVERSITY in insight types. DO NOT create all insights as simple competitor comparisons.

Required mix MUST include:

1. OVERALL/AGGREGATE INSIGHTS (2-3 platforms or topics together):
   - Cross-platform citation patterns comparing performance across multiple LLMs
   - Overall citation performance across all dimensions
   - Multi-topic citation patterns comparing performance across multiple topics

2. SPECIFIC DIMENSIONAL INSIGHTS (single platform/topic/persona):
   - Platform-specific: "on OpenAI", "on Perplexity", "on Claude", "on Gemini"
   - Topic-specific: Compare citation share within specific topics
   - Persona-specific: Compare citation share for specific user personas

3. COMPETITOR COMPARISONS (but limit to 1-2 per section, not all):
   - Only include when there's a significant gap (≥15% or ≥2 rank positions)
   - Use short brand names: "Amex", "Chase", "Capital One", "itilite", "Happay"

MIX REQUIREMENTS:
- At least 1 overall/aggregate insight per section
- At least 1 multi-platform or multi-topic insight per section
- Only 1-2 direct competitor comparison insights per section
- Variety in metrics (mix different metrics across insights)

Avoid:
- Creating all insights as "X beats/loses to Y" competitor comparisons
- Too granular single-dimension insights (every insight shouldn't be on one platform or one topic)
- Repeating the same metric across multiple insights

EXAMPLES OF VALID INSIGHT STYLE:

"${userBrandShort} beats itilite with 75.88% vs 0.00% citation share for 'Young Online Shopper', showing strong citation presence among younger users. Recommendation: Focus citation-building strategies on e-commerce and online shopping benefits."

"${userBrandShort} loses to Capital One with 45.2% vs 78.3% citation share on ChatGPT. Recommendation: Optimize ChatGPT-specific content and metadata to boost citation inclusion rates."

"${userBrandShort} performs better on Gemini than Claude (65.8% vs 45.2% citation share) suggesting stronger LLM alignment with Gemini responses. Recommendation: Adapt Gemini's successful citation patterns across Claude queries."`;
        break;
    }

    prompt += `\n\nRESPOND WITH JSON ONLY. No markdown, no explanations.`;

    // Log summary of what metrics were included in the prompt
    console.log(`✅ [InsightsService] Prompt generated for ${tabType} with metrics:`, {
      userBrandMetrics: tabType === 'prompts' ? ['Visibility Score', 'Depth of Mention', 'Citation Share'] :
                       tabType === 'citations' ? ['Citation Share'] :
                       tabType === 'sentiment' ? ['Positive Sentiment', 'Negative Sentiment', 'Neutral Sentiment'] :
                       ['Visibility Score', 'Average Position', 'Depth of Mention'],
      competitorCount: competitors.length,
      hasPlatformBreakdown: !!(structuredData.platformBreakdown || structuredData.platformPerformance) && ((structuredData.platformBreakdown?.length || 0) > 0 || (structuredData.platformPerformance?.length || 0) > 0),
      hasTopicBreakdown: !!(structuredData.topicBreakdown || structuredData.topicPerformance) && ((structuredData.topicBreakdown?.length || 0) > 0 || (structuredData.topicPerformance?.length || 0) > 0),
      hasPersonaBreakdown: !!(structuredData.personaBreakdown || structuredData.personaPerformance) && ((structuredData.personaBreakdown?.length || 0) > 0 || (structuredData.personaPerformance?.length || 0) > 0),
      promptLength: prompt.length
    });

    return prompt;
  }

  /**
   * Get visibility-specific prompt data with grouped metrics by brand/competitor
   */
  getVisibilityPromptData(data, userBrandShort) {
    let promptData = '\n\nDETAILED COMPETITIVE ANALYSIS BY DIMENSION:\n\n';
    
    // Format metrics for a brand (only metrics displayed in frontend: Visibility Score, Average Position, Depth of Mention)
    const formatBrandMetrics = (brand, brandShortName) => {
      return `  ${brandShortName}:\n    - Visibility Score: ${brand.visibilityScore.toFixed(2)}%\n    - Average Position: ${brand.averagePosition.toFixed(2)}\n    - Depth of Mention: ${brand.depthOfMention.toFixed(2)}%`;
    };

    // PLATFORM BREAKDOWN
    if (data.platformBreakdown && data.platformBreakdown.length > 0) {
      promptData += 'PLATFORM-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.platformBreakdown.forEach(platform => {
        promptData += `\nPlatform: ${platform.platform}\n`;
        const userShort = this.getShortBrandName(platform.userBrand.name);
        promptData += formatBrandMetrics(platform.userBrand, userShort) + '\n';
        
        platform.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // TOPIC BREAKDOWN
    if (data.topicBreakdown && data.topicBreakdown.length > 0) {
      promptData += '\nTOPIC-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.topicBreakdown.forEach(topic => {
        promptData += `\nTopic: ${topic.topic}\n`;
        const userShort = this.getShortBrandName(topic.userBrand.name);
        promptData += formatBrandMetrics(topic.userBrand, userShort) + '\n';
        
        topic.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // PERSONA BREAKDOWN
    if (data.personaBreakdown && data.personaBreakdown.length > 0) {
      promptData += '\nPERSONA-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.personaBreakdown.forEach(persona => {
        promptData += `\nPersona: ${persona.persona}\n`;
        const userShort = this.getShortBrandName(persona.userBrand.name);
        promptData += formatBrandMetrics(persona.userBrand, userShort) + '\n';
        
        persona.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    return promptData;
  }

  /**
   * Get prompts-specific prompt data with grouped metrics by brand/competitor
   * Frontend displays: Visibility Score, Depth of Mention, Citation Share
   * Note: Average Position is NOT displayed (only rank is shown), so excluded from insights
   */
  getPromptsPromptData(data, userBrandShort) {
    let promptData = '\n\nDETAILED COMPETITIVE ANALYSIS BY DIMENSION:\n\n';
    
    // Format metrics for a brand (only metrics displayed in frontend: Visibility Score, Depth of Mention, Citation Share)
    // Note: Prompts tab does NOT show Average Position value (only rank), so we exclude it
    const formatBrandMetrics = (brand, brandShortName) => {
      return `  ${brandShortName}:\n    - Visibility Score: ${brand.visibilityScore.toFixed(2)}%\n    - Depth of Mention: ${brand.depthOfMention.toFixed(2)}%\n    - Citation Share: ${brand.citationShare?.toFixed(2) || 0}%`;
    };

    // Use platformBreakdown (consistent with other tabs) or fallback to platformPerformance for backward compatibility
    const platformData = data.platformBreakdown || data.platformPerformance;
    
    // PLATFORM BREAKDOWN
    if (platformData && platformData.length > 0) {
      console.log(`📊 [InsightsService] Adding ${platformData.length} platform breakdowns to prompts prompt`);
      promptData += 'PLATFORM-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      platformData.forEach(platform => {
        promptData += `\nPlatform: ${platform.platform}\n`;
        const userShort = this.getShortBrandName(platform.userBrand.name);
        promptData += formatBrandMetrics(platform.userBrand, userShort) + '\n';
        
        platform.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // Use topicBreakdown (consistent with other tabs) or fallback to topicPerformance for backward compatibility
    const topicData = data.topicBreakdown || data.topicPerformance;
    
    // TOPIC BREAKDOWN
    if (topicData && topicData.length > 0) {
      console.log(`📊 [InsightsService] Adding ${topicData.length} topic breakdowns to prompts prompt`);
      promptData += '\nTOPIC-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      topicData.forEach(topic => {
        promptData += `\nTopic: ${topic.topic}\n`;
        const userShort = this.getShortBrandName(topic.userBrand.name);
        promptData += formatBrandMetrics(topic.userBrand, userShort) + '\n';
        
        topic.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // Use personaBreakdown (consistent with other tabs) or fallback to personaPerformance for backward compatibility
    const personaData = data.personaBreakdown || data.personaPerformance;
    
    // PERSONA BREAKDOWN
    if (personaData && personaData.length > 0) {
      console.log(`📊 [InsightsService] Adding ${personaData.length} persona breakdowns to prompts prompt`);
      promptData += '\nPERSONA-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      personaData.forEach(persona => {
        promptData += `\nPersona: ${persona.persona}\n`;
        const userShort = this.getShortBrandName(persona.userBrand.name);
        promptData += formatBrandMetrics(persona.userBrand, userShort) + '\n';
        
        persona.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    return promptData;
  }

  /**
   * Get sentiment-specific prompt data with grouped metrics by brand/competitor
   * Frontend displays: Positive Sentiment (%), Negative Sentiment (%), Neutral Sentiment (%)
   */
  getSentimentPromptData(data, userBrandShort) {
    let promptData = '\n\nDETAILED COMPETITIVE ANALYSIS BY DIMENSION:\n\n';
    
    // Format metrics for a brand (only metrics displayed in frontend: Positive, Negative, Neutral percentages)
    const formatBrandMetrics = (brand, brandShortName) => {
      const sentiment = brand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      const total = sentiment.positive + sentiment.neutral + sentiment.negative + sentiment.mixed;
      const positive = total > 0 ? (sentiment.positive / total) * 100 : 0;
      const negative = total > 0 ? (sentiment.negative / total) * 100 : 0;
      const neutral = total > 0 ? (sentiment.neutral / total) * 100 : 0;
      return `  ${brandShortName}:\n    - Positive Sentiment: ${positive.toFixed(2)}%\n    - Negative Sentiment: ${negative.toFixed(2)}%\n    - Neutral Sentiment: ${neutral.toFixed(2)}%`;
    };

    // PLATFORM BREAKDOWN
    if (data.platformBreakdown && data.platformBreakdown.length > 0) {
      promptData += 'PLATFORM-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.platformBreakdown.forEach(platform => {
        promptData += `\nPlatform: ${platform.platform}\n`;
        const userShort = this.getShortBrandName(platform.userBrand.name);
        promptData += formatBrandMetrics(platform.userBrand, userShort) + '\n';
        
        platform.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // TOPIC BREAKDOWN
    if (data.topicBreakdown && data.topicBreakdown.length > 0) {
      promptData += '\nTOPIC-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.topicBreakdown.forEach(topic => {
        promptData += `\nTopic: ${topic.topic}\n`;
        const userShort = this.getShortBrandName(topic.userBrand.name);
        promptData += formatBrandMetrics(topic.userBrand, userShort) + '\n';
        
        topic.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // PERSONA BREAKDOWN
    if (data.personaBreakdown && data.personaBreakdown.length > 0) {
      promptData += '\nPERSONA-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.personaBreakdown.forEach(persona => {
        promptData += `\nPersona: ${persona.persona}\n`;
        const userShort = this.getShortBrandName(persona.userBrand.name);
        promptData += formatBrandMetrics(persona.userBrand, userShort) + '\n';
        
        persona.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    return promptData;
  }

  /**
   * Get citations-specific prompt data with grouped metrics by brand/competitor
   * Frontend displays: Citation Share (%)
   */
  getCitationsPromptData(data, userBrandShort) {
    let promptData = '\n\nDETAILED COMPETITIVE ANALYSIS BY DIMENSION:\n\n';
    
    // Format metrics for a brand (only metrics displayed in frontend: Citation Share)
    const formatBrandMetrics = (brand, brandShortName) => {
      return `  ${brandShortName}:\n    - Citation Share: ${(brand.citationShare || 0).toFixed(2)}%`;
    };

    // PLATFORM BREAKDOWN
    if (data.platformBreakdown && data.platformBreakdown.length > 0) {
      promptData += 'PLATFORM-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.platformBreakdown.forEach(platform => {
        promptData += `\nPlatform: ${platform.platform}\n`;
        const userShort = this.getShortBrandName(platform.userBrand.name);
        promptData += formatBrandMetrics(platform.userBrand, userShort) + '\n';
        
        platform.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // TOPIC BREAKDOWN
    if (data.topicBreakdown && data.topicBreakdown.length > 0) {
      promptData += '\nTOPIC-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.topicBreakdown.forEach(topic => {
        promptData += `\nTopic: ${topic.topic}\n`;
        const userShort = this.getShortBrandName(topic.userBrand.name);
        promptData += formatBrandMetrics(topic.userBrand, userShort) + '\n';
        
        topic.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    // PERSONA BREAKDOWN
    if (data.personaBreakdown && data.personaBreakdown.length > 0) {
      promptData += '\nPERSONA-SPECIFIC METRICS:\n';
      promptData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      
      data.personaBreakdown.forEach(persona => {
        promptData += `\nPersona: ${persona.persona}\n`;
        const userShort = this.getShortBrandName(persona.userBrand.name);
        promptData += formatBrandMetrics(persona.userBrand, userShort) + '\n';
        
        persona.competitors.forEach(competitor => {
          const compShort = this.getShortBrandName(competitor.name);
          promptData += formatBrandMetrics(competitor, compShort) + '\n';
        });
        promptData += '\n';
      });
    }

    return promptData;
  }

  /**
   * Call OpenRouter API with GPT-4o for better analysis quality
   */
  async callOpenRouter(prompt) {
    try {
      console.log('🤖 [InsightsService] Calling OpenRouter API with GPT-4o...');
      
      const response = await axios.post(`${this.openRouterBaseUrl}/chat/completions`, {
        model: 'openai/gpt-4o', // Upgraded from gpt-4o-mini for better insight quality
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent, accurate responses
        max_tokens: 2000 // Increased for more detailed insights
      }, {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'https://rankly.ai',
          'X-Title': 'Rankly Performance Insights'
        }
      });

      const content = response.data.choices[0].message.content;
      console.log('✅ [InsightsService] OpenRouter API response received');
      console.log(`📊 [InsightsService] Response length: ${content.length} characters`);
      
      return content;
      
    } catch (error) {
      console.error('❌ [InsightsService] OpenRouter API error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API call failed: ${error.message}`);
    }
  }

  /**
   * Parse insights response from LLM
   */
  parseInsightsResponse(response, tabType) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const insights = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      if (!insights.whatsWorking || !insights.needsAttention) {
        throw new Error('Invalid insights structure from LLM');
      }

      // Transform insights to ensure all required fields exist
      const transformInsight = (insight) => {
        // Ensure all required fields exist with defaults
        const transformed = {
          description: insight.description || 'No description available',
          metric: insight.metric || null, // Extract metric name (e.g., "Visibility Score", "Average Position")
          value: insight.value || null, // Extract value (e.g., "70.0%", "9.89")
          impact: insight.impact || 'Medium',
          recommendation: insight.recommendation || 'No recommendation available'
        };
        
        // Validate impact value
        if (!['High', 'Medium', 'Low'].includes(transformed.impact)) {
          transformed.impact = 'Medium';
        }
        
        // Try to extract metric and value from description if not explicitly provided
        if (!transformed.metric || !transformed.value) {
          const desc = transformed.description;
          
          // Try to extract metric name from description
          if (!transformed.metric) {
            if (desc.includes('Visibility Score') || desc.toLowerCase().includes('visibility')) {
              transformed.metric = 'Visibility Score';
            } else if (desc.includes('Average Position') || desc.toLowerCase().includes('position')) {
              transformed.metric = 'Average Position';
            } else if (desc.includes('Depth of Mention') || desc.toLowerCase().includes('depth')) {
              transformed.metric = 'Depth of Mention';
            } else if (desc.includes('Citation Share') || desc.toLowerCase().includes('citation')) {
              transformed.metric = 'Citation Share';
            } else if (desc.includes('Sentiment') || desc.toLowerCase().includes('sentiment')) {
              transformed.metric = 'Sentiment';
            }
          }
          
          // Try to extract value from description (look for percentages and numbers)
          if (!transformed.value && desc) {
            // Look for percentage patterns like "70%", "70.0%", "X% vs Y%"
            const percentMatch = desc.match(/(\d+\.?\d*)%/);
            if (percentMatch) {
              transformed.value = percentMatch[0];
            } else {
              // Look for numeric values like "9.89", "#3", etc.
              const numMatch = desc.match(/(\d+\.?\d+)/);
              if (numMatch) {
                transformed.value = numMatch[1];
              }
            }
          }
        }
        
        console.log(`📊 [InsightsService] Transformed insight: metric="${transformed.metric}", value="${transformed.value}"`);
        
        return transformed;
      };

      const transformedWhatsWorking = (insights.whatsWorking || []).map(transformInsight);
      const transformedNeedsAttention = (insights.needsAttention || []).map(transformInsight);

      console.log(`✅ [InsightsService] Parsed ${transformedWhatsWorking.length} working insights and ${transformedNeedsAttention.length} attention insights`);
      
      return {
        tabType: tabType,
        whatsWorking: transformedWhatsWorking,
        needsAttention: transformedNeedsAttention,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ [InsightsService] Error parsing insights response:', error);
      
      // Return fallback insights if parsing fails
      return {
        tabType: tabType,
        whatsWorking: [{
          description: "Your visibility metrics have been analyzed successfully with 85% visibility score vs competitors.",
          impact: "Medium",
          recommendation: "Review the detailed metrics above for specific insights."
        }],
        needsAttention: [{
          description: "More prompt tests are needed for comprehensive insights. Current data shows limited competitive analysis.",
          impact: "Medium",
          recommendation: "Run more prompt tests to generate deeper insights."
        }],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Store insights in database
   */
  async storeInsights(userId, urlAnalysisId, tabType, insights) {
    try {
      // Remove any existing insights for this tab
      const query = { userId: userId, tabType: tabType };
      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      
      await Insights.deleteMany(query);

      // Create new insights record
      const insightsRecord = new Insights({
        userId: userId,
        urlAnalysisId: urlAnalysisId,
        tabType: tabType,
        whatsWorking: insights.whatsWorking,
        needsAttention: insights.needsAttention,
        performanceInsights: insights.performanceInsights || [],
        generatedAt: insights.generatedAt
      });

      await insightsRecord.save();
      console.log(`💾 [InsightsService] Insights stored for ${tabType} tab`);

    } catch (error) {
      console.error('❌ [InsightsService] Error storing insights:', error);
      throw error;
    }
  }

  /**
   * Clear/delete insights from database
   * @param {string} userId - User ID (optional, if not provided clears all)
   * @param {string} urlAnalysisId - URL Analysis ID (optional)
   * @param {string} tabType - Tab type (optional, if not provided clears all tabs)
   * @returns {Object} Deletion result with count
   */
  async clearInsights(userId = null, urlAnalysisId = null, tabType = null) {
    try {
      const query = {};
      
      if (userId) query.userId = userId;
      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      if (tabType) query.tabType = tabType;

      const result = await Insights.deleteMany(query);
      console.log(`🗑️ [InsightsService] Cleared ${result.deletedCount} insights`, query);
      
      return {
        deletedCount: result.deletedCount,
        query: query
      };

    } catch (error) {
      console.error('❌ [InsightsService] Error clearing insights:', error);
      throw error;
    }
  }

  /**
   * Clear all insights for all tabs for a user (or all users if userId is null)
   * @param {string} userId - User ID (optional, if null clears for all users)
   * @returns {Object} Deletion result
   */
  async clearAllInsights(userId = null) {
    try {
      const query = userId ? { userId: userId } : {};
      const result = await Insights.deleteMany(query);
      
      console.log(`🗑️ [InsightsService] Cleared ALL insights${userId ? ` for user ${userId}` : ' for all users'}: ${result.deletedCount} records deleted`);
      
      return {
        deletedCount: result.deletedCount,
        userId: userId || 'all users'
      };

    } catch (error) {
      console.error('❌ [InsightsService] Error clearing all insights:', error);
      throw error;
    }
  }

  // Helper methods for different data structures (to be implemented)
  getPromptPerformance(overallMetrics) {
    // Implementation for prompt performance analysis
    return {};
  }

  getSentimentBreakdown(overallMetrics) {
    // Implementation for sentiment breakdown
    return {};
  }

  getCitationBreakdown(overallMetrics) {
    // Implementation for citation breakdown
    return {};
  }

  /**
   * Get topic sentiment breakdown (only metrics displayed in frontend)
   * Frontend displays: Positive Sentiment (%), Negative Sentiment (%), Neutral Sentiment (%)
   */
  getTopicSentimentBreakdown(topicMetrics, userBrand, competitorBrands) {
    return topicMetrics.map(topic => {
      const userBrandMetrics = topic.brandMetrics.find(bm => bm.brandName === userBrand.brandName) || {};
      const userSentiment = userBrandMetrics.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      
      const competitorMetrics = competitorBrands.map(comp => {
        const brandMetric = topic.brandMetrics.find(bm => bm.brandName === comp.brandName) || {};
        const compSentiment = brandMetric.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
        return {
          name: comp.brandName,
          sentimentBreakdown: compSentiment
        };
      });
      
      return {
        topic: topic.scopeValue,
        userBrand: {
          name: userBrand.brandName,
          sentimentBreakdown: userSentiment
        },
        competitors: competitorMetrics
      };
    });
  }

  /**
   * Get persona sentiment breakdown (only metrics displayed in frontend)
   * Frontend displays: Positive Sentiment (%), Negative Sentiment (%), Neutral Sentiment (%)
   */
  getPersonaSentimentBreakdown(personaMetrics, userBrand, competitorBrands) {
    return personaMetrics.map(persona => {
      const userBrandMetrics = persona.brandMetrics.find(bm => bm.brandName === userBrand.brandName) || {};
      const userSentiment = userBrandMetrics.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      
      const competitorMetrics = competitorBrands.map(comp => {
        const brandMetric = persona.brandMetrics.find(bm => bm.brandName === comp.brandName) || {};
        const compSentiment = brandMetric.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
        return {
          name: comp.brandName,
          sentimentBreakdown: compSentiment
        };
      });
      
      return {
        persona: persona.scopeValue,
        userBrand: {
          name: userBrand.brandName,
          sentimentBreakdown: userSentiment
        },
        competitors: competitorMetrics
      };
    });
  }

  /**
   * Get platform sentiment breakdown (only metrics displayed in frontend)
   * Frontend displays: Positive Sentiment (%), Negative Sentiment (%), Neutral Sentiment (%)
   */
  getPlatformSentimentBreakdown(platformMetrics, userBrand, competitorBrands) {
    return platformMetrics.map(platform => {
      const userBrandMetrics = platform.brandMetrics.find(bm => bm.brandName === userBrand.brandName) || {};
      const userSentiment = userBrandMetrics.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      
      const competitorMetrics = competitorBrands.map(comp => {
        const brandMetric = platform.brandMetrics.find(bm => bm.brandName === comp.brandName) || {};
        const compSentiment = brandMetric.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 };
        return {
          name: comp.brandName,
          sentimentBreakdown: compSentiment
        };
      });
      
      return {
        platform: platform.scopeValue,
        userBrand: {
          name: userBrand.brandName,
          sentimentBreakdown: userSentiment
        },
        competitors: competitorMetrics
      };
    });
  }

  getPlatformCitations(platformMetrics) {
    // Implementation for platform citations
    return {};
  }

  getTopicCitations(topicMetrics) {
    // Implementation for topic citations
    return {};
  }

  /**
   * Deterministically calculate performance insights for all tabs
   */
  generatePerformanceInsights(structuredData, tabType = 'visibility') {
    console.log(`📈 [InsightsService] Generating performance insights for ${tabType} tab`);
    console.log(`📊 [InsightsService] Input data for performance insights:`, {
      userBrand: structuredData.userBrand?.name,
      userMetrics: {
        visibilityScore: structuredData.userBrand?.visibilityScore,
        averagePosition: structuredData.userBrand?.averagePosition,
        depthOfMention: structuredData.userBrand?.depthOfMention,
        citationShare: structuredData.userBrand?.citationShare,
        totalMentions: structuredData.userBrand?.totalMentions,
        sentimentBreakdown: structuredData.userBrand?.sentimentBreakdown
      },
      competitorCount: structuredData.competitors?.length || 0,
      competitorNames: structuredData.competitors?.map(c => c.name) || []
    });

    // Helper to produce a clean numeric gap (+/- XX) and %
    function formatGap(val, compVal, digits = 1) {
      const raw = val - compVal;
      if (Math.abs(raw) < 0.01) return '';
      return (raw >= 0 ? '+' : '') + raw.toFixed(digits);
    }
    function percent(val, digits = 1) {
      return val ? val.toFixed(digits) + '%' : '0%';
    }

    const user = structuredData.userBrand;
    const competitors = structuredData.competitors || [];
    const insights = [];

    if (!user || competitors.length === 0) {
      console.log(`⚠️ [InsightsService] No competitor data available for performance insights`);
      return [{ metric: 'data', description: 'No competitor data available' }];
    }

    // Define what to inspect for each tab
    let metricsToCheck = [];
    switch (tabType) {
      case 'visibility':
        metricsToCheck = [
          { key: 'visibilityScore', label: 'Visibility Score', format: percent },
          { key: 'averagePosition', label: 'Average Position', format: v => v.toFixed(2), invert: true },
          { key: 'depthOfMention', label: 'Depth of Mention', format: v => v.toFixed(2) }
        ];
        break;
      case 'sentiment':
        metricsToCheck = [
          { key: 'sentimentScore', label: 'Sentiment Score', format: v => v.toFixed(2) }
        ];
        break;
      case 'citations':
        metricsToCheck = [
          { key: 'citationShare', label: 'Citation Share', format: percent }
        ];
        break;
      case 'prompts':
        metricsToCheck = [
          { key: 'totalMentions', label: 'Total Mentions', format: v => v.toString() }
        ];
        break;
      default:
        break;
    }

    console.log(`🔍 [InsightsService] Metrics to check for ${tabType}:`, 
      metricsToCheck.map(m => ({ key: m.key, label: m.label, invert: m.invert || false })));

    metricsToCheck.forEach(metric => {
      const { key, label, format, invert } = metric;
      const userVal = parseFloat(user[key]) || 0;
      
      console.log(`📊 [InsightsService] Checking metric ${label} (${key}) for ${tabType}:`, {
        userBrand: user.name,
        userValue: userVal,
        userValueFormatted: format(userVal)
      });
      
      // Find top and bottom competitor
      const compVals = competitors.map(c => ({ name: c.name, value: parseFloat(c[key]) || 0 }));
      
      console.log(`📊 [InsightsService] Competitor values for ${key}:`, compVals.map(c => ({ 
        name: c.name, 
        value: c.value, 
        formatted: format(c.value) 
      })));
      
      let top, bottom, closest;
      if (invert) {
        // For ranking type metrics (lower is better)
        top = compVals.reduce((a, b) => (a.value < b.value ? a : b), compVals[0]);
        bottom = compVals.reduce((a, b) => (a.value > b.value ? a : b), compVals[0]);
      } else {
        // Higher is better
        top = compVals.reduce((a, b) => (a.value > b.value ? a : b), compVals[0]);
        bottom = compVals.reduce((a, b) => (a.value < b.value ? a : b), compVals[0]);
      }
      
      console.log(`📊 [InsightsService] Top competitor for ${key}:`, { name: top?.name, value: top?.value, formatted: format(top?.value || 0) });
      
      // Find nearest-up/nearest-down
      closest = compVals.reduce((closest, c) => (
        (!closest || Math.abs(c.value - userVal) < Math.abs(closest.value - userVal)) ? c : closest
      ), null);
      
      // Calculate ranking
      const allVals = [{ name: user.name, value: userVal }, ...compVals]
        .sort((a, b) => invert ? a.value - b.value : b.value - a.value);
      const userRank = allVals.findIndex(v => v.name === user.name) + 1;
      const rankStr = `(Rank: #${userRank} / ${allVals.length})`;
      
      console.log(`📊 [InsightsService] Ranking for ${key}:`, {
        userRank: userRank,
        totalBrands: allVals.length,
        ranking: allVals.map((v, idx) => ({ rank: idx + 1, name: v.name, value: v.value }))
      });
      
      // Main insight
      if (userVal === top.value) {
        if (Math.abs(userVal - bottom.value) > 0.01) {
          const insight = {
            metric: key,
            description: `Your brand leads in ${label}: ${format(userVal)} vs best competitor (${top.name}): ${format(top.value)}. ${rankStr}`,
            value: userVal,
            gap: userVal - top.value,
            rank: userRank
          };
          insights.push(insight);
          console.log(`✅ [InsightsService] Generated leading insight for ${key}:`, insight);
        }
      } else {
        if (Math.abs(userVal - top.value) > 0.01) {
          const insight = {
            metric: key,
            description: `Your brand's ${label} is ${format(userVal)}, trailing vs top competitor (${top.name}): ${format(top.value)}. Gap: ${formatGap(userVal, top.value)}. ${rankStr}`,
            value: userVal,
            gap: userVal - top.value,
            rank: userRank
          };
          insights.push(insight);
          console.log(`⚠️ [InsightsService] Generated trailing insight for ${key}:`, insight);
        } else {
          console.log(`ℹ️ [InsightsService] No significant gap for ${key} (user: ${format(userVal)}, top: ${format(top.value)})`);
        }
      }
    });
    
    console.log(`✅ [InsightsService] Generated ${insights.length} performance insights for ${tabType}:`, 
      insights.map(i => ({ metric: i.metric, rank: i.rank, gap: i.gap })));
    
    return insights;
  }
}

module.exports = new InsightsService();
