/**
 * Create Mock URL Analysis Script
 * 
 * This script creates a complete mock URL analysis with all related documents
 * to test URL analysis toggling functionality without running expensive AI analysis.
 */

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const UrlAnalysis = require('../src/models/UrlAnalysis');
const Topic = require('../src/models/Topic');
const Persona = require('../src/models/Persona');
const Competitor = require('../src/models/Competitor');
const Prompt = require('../src/models/Prompt');
const PromptTest = require('../src/models/PromptTest');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');
const Insights = require('../src/models/Insights');
const SubjectiveMetrics = require('../src/models/SubjectiveMetrics');

// Mock data for a different company (Netflix India)
const MOCK_ANALYSIS_DATA = {
  url: 'https://www.netflix.com/in',
  companyName: 'Netflix India',
  industry: 'Streaming Entertainment',
  businessModel: 'Subscription-based streaming service',
  targetMarket: 'Indian consumers seeking entertainment content',
  valueProposition: 'Unlimited access to movies, TV shows, documentaries, and original content',
  keyServices: [
    'Streaming movies and TV shows',
    'Original Netflix content',
    'Multiple device support',
    'Offline downloads',
    'Parental controls'
  ],
  brandTone: 'Entertaining, innovative, diverse, customer-focused',
  marketPosition: 'Leading streaming platform in India with strong local content focus',
  
  competitors: [
    {
      name: 'Disney+ Hotstar',
      url: 'https://www.hotstar.com',
      reason: 'Major streaming competitor with sports and entertainment content',
      similarity: 'High'
    },
    {
      name: 'Amazon Prime Video',
      url: 'https://www.primevideo.com',
      reason: 'Streaming service with original content and Prime membership benefits',
      similarity: 'High'
    },
    {
      name: 'Zee5',
      url: 'https://www.zee5.com',
      reason: 'Indian streaming platform with regional content and originals',
      similarity: 'High'
    },
    {
      name: 'SonyLIV',
      url: 'https://www.sonyliv.com',
      reason: 'Sony\'s streaming platform with sports and entertainment content',
      similarity: 'Medium'
    },
    {
      name: 'Voot',
      url: 'https://www.voot.com',
      reason: 'Viacom18\'s streaming platform with regional and international content',
      similarity: 'Medium'
    }
  ],
  
  topics: [
    {
      name: 'Streaming Content and Entertainment Trends',
      description: 'Focus on the growing streaming industry in India, content consumption patterns, and Netflix\'s role in entertainment',
      keywords: ['streaming trends', 'entertainment', 'Netflix India', 'content consumption', 'digital entertainment'],
      priority: 'High'
    },
    {
      name: 'Original Content and Local Productions',
      description: 'Highlighting Netflix\'s investment in Indian original content and local productions',
      keywords: ['Netflix originals', 'Indian content', 'local productions', 'regional content', 'Netflix India originals'],
      priority: 'High'
    },
    {
      name: 'Subscription Plans and Pricing',
      description: 'Content around Netflix subscription plans, pricing strategies, and value propositions for Indian consumers',
      keywords: ['Netflix plans', 'subscription pricing', 'value for money', 'Netflix membership', 'streaming costs'],
      priority: 'High'
    },
    {
      name: 'Mobile and Multi-Device Streaming',
      description: 'Content about Netflix\'s mobile-first approach and multi-device streaming capabilities',
      keywords: ['mobile streaming', 'Netflix app', 'multi-device', 'offline downloads', 'streaming devices'],
      priority: 'Medium'
    },
    {
      name: 'Parental Controls and Family Entertainment',
      description: 'Content about Netflix\'s family-friendly features and parental control options',
      keywords: ['parental controls', 'family entertainment', 'kids content', 'Netflix Kids', 'safe streaming'],
      priority: 'Medium'
    }
  ],
  
  personas: [
    {
      type: 'Entertainment Content Manager',
      description: 'Manages content strategy and programming for streaming platforms, responsible for content acquisition and original productions',
      painPoints: ['Content licensing complexity', 'Audience engagement measurement', 'Competition for exclusive content'],
      goals: ['Increase subscriber engagement', 'Acquire popular content', 'Develop successful originals'],
      relevance: 'High'
    },
    {
      type: 'Digital Marketing Specialist',
      description: 'Focuses on promoting streaming services and content to Indian audiences through digital channels',
      painPoints: ['Reaching diverse audiences', 'Content discovery challenges', 'Competition for attention'],
      goals: ['Increase brand awareness', 'Drive subscriptions', 'Promote original content'],
      relevance: 'High'
    },
    {
      type: 'Subscription Business Analyst',
      description: 'Analyzes subscription metrics, churn rates, and pricing strategies for streaming services',
      painPoints: ['Churn rate management', 'Pricing optimization', 'Market competition analysis'],
      goals: ['Reduce churn', 'Optimize pricing', 'Increase lifetime value'],
      relevance: 'Medium'
    },
    {
      type: 'Family Entertainment Coordinator',
      description: 'Focuses on family-friendly content and parental control features for streaming platforms',
      painPoints: ['Content appropriateness', 'Parental control complexity', 'Age-appropriate recommendations'],
      goals: ['Ensure child safety', 'Improve family experience', 'Build trust with parents'],
      relevance: 'Medium'
    }
  ]
};

// Mock prompts for the analysis
const MOCK_PROMPTS = [
  {
    title: 'Best streaming platforms in India 2024',
    text: 'What are the top streaming platforms available in India in 2024? Compare features, pricing, and content libraries.',
    queryType: 'Comparative',
    topicName: 'Streaming Content and Entertainment Trends',
    personaType: 'Entertainment Content Manager'
  },
  {
    title: 'Netflix India original content recommendations',
    text: 'Recommend the best Netflix original shows and movies from India. What makes them stand out?',
    queryType: 'Navigational',
    topicName: 'Original Content and Local Productions',
    personaType: 'Digital Marketing Specialist'
  },
  {
    title: 'Netflix subscription plans comparison',
    text: 'Compare Netflix subscription plans in India. Which plan offers the best value for money?',
    queryType: 'Commercial Investigation',
    topicName: 'Subscription Plans and Pricing',
    personaType: 'Subscription Business Analyst'
  },
  {
    title: 'Family-friendly streaming options',
    text: 'What are the best family-friendly streaming options in India? How do parental controls work?',
    queryType: 'Navigational',
    topicName: 'Parental Controls and Family Entertainment',
    personaType: 'Family Entertainment Coordinator'
  },
  {
    title: 'Mobile streaming quality comparison',
    text: 'How does Netflix perform on mobile devices compared to other streaming platforms in India?',
    queryType: 'Comparative',
    topicName: 'Mobile and Multi-Device Streaming',
    personaType: 'Entertainment Content Manager'
  }
];

// Mock test results with realistic brand mentions
const MOCK_TEST_RESULTS = {
  'openai': {
    response: `Netflix India is the leading streaming platform in India, offering a vast library of movies, TV shows, and original content. Key competitors include Disney+ Hotstar, Amazon Prime Video, and Zee5. Netflix stands out with its premium original content like "Sacred Games" and "Delhi Crime". The platform offers multiple subscription plans starting from ₹149/month for mobile-only access. Netflix's mobile-first approach and offline download feature make it popular among Indian users.`,
    brandMentions: {
      'Netflix India': { mentioned: true, position: 1, sentiment: 'positive' },
      'Disney+ Hotstar': { mentioned: true, position: 2, sentiment: 'neutral' },
      'Amazon Prime Video': { mentioned: true, position: 3, sentiment: 'neutral' },
      'Zee5': { mentioned: true, position: 4, sentiment: 'neutral' }
    }
  },
  'claude': {
    response: `In India's competitive streaming market, Netflix India leads with premium content and strong brand recognition. Disney+ Hotstar offers sports content and regional programming, while Amazon Prime Video provides value through Prime membership benefits. Zee5 and SonyLIV focus on regional content. Netflix's investment in Indian originals like "The Family Man" and "Lust Stories" has strengthened its position. The platform's ₹199/month standard plan offers HD streaming on multiple devices.`,
    brandMentions: {
      'Netflix India': { mentioned: true, position: 1, sentiment: 'positive' },
      'Disney+ Hotstar': { mentioned: true, position: 2, sentiment: 'neutral' },
      'Amazon Prime Video': { mentioned: true, position: 3, sentiment: 'neutral' },
      'Zee5': { mentioned: true, position: 4, sentiment: 'neutral' },
      'SonyLIV': { mentioned: true, position: 5, sentiment: 'neutral' }
    }
  },
  'gemini': {
    response: `Netflix India dominates the premium streaming segment with its original content strategy. The platform's ₹149 mobile plan and ₹199 standard plan cater to different user segments. Disney+ Hotstar leads in sports content, while Amazon Prime Video offers additional benefits through Prime membership. Netflix's focus on Indian originals like "Sacred Games" and "Delhi Crime" has created a loyal subscriber base. The platform's offline download feature and multi-device support make it ideal for Indian families.`,
    brandMentions: {
      'Netflix India': { mentioned: true, position: 1, sentiment: 'positive' },
      'Disney+ Hotstar': { mentioned: true, position: 2, sentiment: 'neutral' },
      'Amazon Prime Video': { mentioned: true, position: 3, sentiment: 'neutral' }
    }
  },
  'perplexity': {
    response: `Netflix India is the top streaming platform in India, known for its original content and premium user experience. Disney+ Hotstar leads in sports and regional content, while Amazon Prime Video offers value through Prime benefits. Netflix's ₹199 standard plan provides HD streaming on multiple devices. The platform's investment in Indian originals like "The Family Man" and "Sacred Games" has strengthened its market position. Netflix's mobile-first approach and offline downloads make it popular among Indian users.`,
    brandMentions: {
      'Netflix India': { mentioned: true, position: 1, sentiment: 'positive' },
      'Disney+ Hotstar': { mentioned: true, position: 2, sentiment: 'neutral' },
      'Amazon Prime Video': { mentioned: true, position: 3, sentiment: 'neutral' }
    }
  }
};

async function createMockAnalysis() {
  try {
    console.log('🚀 Starting mock analysis creation...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB\n');
    
    // Get the existing user
    const user = await User.findOne({ email: 'sj@tryrankly.com' });
    if (!user) {
      throw new Error('User not found');
    }
    console.log(`👤 Found user: ${user.firstName} ${user.lastName}\n`);
    
    // Create URL Analysis
    console.log('📊 Creating URL Analysis...');
    const urlAnalysis = new UrlAnalysis({
      userId: user._id,
      url: MOCK_ANALYSIS_DATA.url,
      analysisDate: new Date(),
      analysisLevel: 'company',
      brandContext: {
        companyName: MOCK_ANALYSIS_DATA.companyName,
        industry: MOCK_ANALYSIS_DATA.industry,
        businessModel: MOCK_ANALYSIS_DATA.businessModel,
        targetMarket: MOCK_ANALYSIS_DATA.targetMarket,
        valueProposition: MOCK_ANALYSIS_DATA.valueProposition,
        keyServices: MOCK_ANALYSIS_DATA.keyServices,
        brandTone: MOCK_ANALYSIS_DATA.brandTone,
        marketPosition: MOCK_ANALYSIS_DATA.marketPosition
      },
      competitors: MOCK_ANALYSIS_DATA.competitors,
      topics: MOCK_ANALYSIS_DATA.topics,
      personas: MOCK_ANALYSIS_DATA.personas,
      status: 'completed'
    });
    
    const savedUrlAnalysis = await urlAnalysis.save();
    console.log(`✅ URL Analysis created: ${savedUrlAnalysis._id}\n`);
    
    // Create Topics
    console.log('📝 Creating Topics...');
    const topicIds = [];
    for (const topicData of MOCK_ANALYSIS_DATA.topics) {
      const topic = new Topic({
        userId: user._id,
        urlAnalysisId: savedUrlAnalysis._id,
        name: topicData.name,
        description: topicData.description,
        keywords: topicData.keywords,
        priority: topicData.priority,
        selected: topicData.priority === 'High', // Select high priority topics
        source: 'ai'
      });
      const savedTopic = await topic.save();
      topicIds.push(savedTopic._id);
      console.log(`  ✅ Topic: ${topicData.name}`);
    }
    console.log(`✅ Created ${topicIds.length} topics\n`);
    
    // Create Personas
    console.log('👥 Creating Personas...');
    const personaIds = [];
    for (const personaData of MOCK_ANALYSIS_DATA.personas) {
      const persona = new Persona({
        userId: user._id,
        urlAnalysisId: savedUrlAnalysis._id,
        type: personaData.type,
        description: personaData.description,
        painPoints: personaData.painPoints,
        goals: personaData.goals,
        relevance: personaData.relevance,
        selected: personaData.relevance === 'High', // Select high relevance personas
        source: 'ai'
      });
      const savedPersona = await persona.save();
      personaIds.push(savedPersona._id);
      console.log(`  ✅ Persona: ${personaData.type}`);
    }
    console.log(`✅ Created ${personaIds.length} personas\n`);
    
    // Create Competitors
    console.log('🏢 Creating Competitors...');
    const competitorIds = [];
    for (const competitorData of MOCK_ANALYSIS_DATA.competitors) {
      const competitor = new Competitor({
        userId: user._id,
        urlAnalysisId: savedUrlAnalysis._id,
        name: competitorData.name,
        url: competitorData.url,
        reason: competitorData.reason,
        similarity: competitorData.similarity,
        selected: competitorData.similarity === 'High', // Select high similarity competitors
        source: 'ai'
      });
      const savedCompetitor = await competitor.save();
      competitorIds.push(savedCompetitor._id);
      console.log(`  ✅ Competitor: ${competitorData.name}`);
    }
    console.log(`✅ Created ${competitorIds.length} competitors\n`);
    
    // Create Prompts
    console.log('💬 Creating Prompts...');
    const promptIds = [];
    for (const promptData of MOCK_PROMPTS) {
      const topic = await Topic.findOne({ name: promptData.topicName, urlAnalysisId: savedUrlAnalysis._id });
      const persona = await Persona.findOne({ type: promptData.personaType, urlAnalysisId: savedUrlAnalysis._id });
      
      const prompt = new Prompt({
        userId: user._id,
        urlAnalysisId: savedUrlAnalysis._id, // ✅ Link prompt to URL analysis
        topicId: topic._id,
        personaId: persona._id,
        title: promptData.title,
        text: promptData.text,
        queryType: promptData.queryType,
        status: 'active',
        metadata: {
          targetPersonas: [persona.type],
          targetCompetitors: MOCK_ANALYSIS_DATA.competitors.filter(c => c.similarity === 'High').map(c => c.name),
          generatedBy: 'ai'
        }
      });
      const savedPrompt = await prompt.save();
      promptIds.push(savedPrompt._id);
      console.log(`  ✅ Prompt: ${promptData.title}`);
    }
    console.log(`✅ Created ${promptIds.length} prompts\n`);
    
    // Create Prompt Tests
    console.log('🧪 Creating Prompt Tests...');
    const testIds = [];
    const llmProviders = ['openai', 'claude', 'gemini', 'perplexity'];
    
    for (const promptId of promptIds) {
      const prompt = await Prompt.findById(promptId).populate('topicId personaId');
      
      for (const llmProvider of llmProviders) {
        const testResult = MOCK_TEST_RESULTS[llmProvider];
        const brandMentions = testResult.brandMentions;
        
        // Create brand metrics
        const brandMetrics = [];
        for (const [brandName, mentionData] of Object.entries(brandMentions)) {
          brandMetrics.push({
            brandName,
            mentioned: mentionData.mentioned,
            firstPosition: mentionData.position,
            sentiment: mentionData.sentiment,
            sentimentScore: mentionData.sentiment === 'positive' ? 0.8 : 
                           mentionData.sentiment === 'negative' ? -0.3 : 0.1,
            citations: mentionData.mentioned ? [{
              url: `https://example.com/${brandName.toLowerCase().replace(/\s+/g, '-')}`,
              type: 'brand',
              context: `Mention of ${brandName} in streaming context`
            }] : []
          });
        }
        
        const promptTest = new PromptTest({
          userId: user._id,
          promptId: promptId,
          topicId: prompt.topicId._id,
          personaId: prompt.personaId._id,
          promptText: prompt.text,
          queryType: prompt.queryType,
          llmProvider: llmProvider,
          llmModel: llmProvider === 'openai' ? 'gpt-4' : 
                   llmProvider === 'claude' ? 'claude-3-sonnet' :
                   llmProvider === 'gemini' ? 'gemini-pro' : 'llama-2-70b-chat',
          rawResponse: testResult.response,
          brandMetrics: brandMetrics,
          status: 'completed',
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last week
        });
        
        const savedTest = await promptTest.save();
        testIds.push(savedTest._id);
        console.log(`  ✅ Test: ${prompt.title} - ${llmProvider}`);
      }
    }
    console.log(`✅ Created ${testIds.length} prompt tests\n`);
    
    // Create Aggregated Metrics
    console.log('📈 Creating Aggregated Metrics...');
    
    // Calculate metrics from test results
    const allBrands = new Set();
    const brandData = new Map();
    
    for (const testId of testIds) {
      const test = await PromptTest.findById(testId);
      for (const brandMetric of test.brandMetrics) {
        allBrands.add(brandMetric.brandName);
        if (!brandData.has(brandMetric.brandName)) {
          brandData.set(brandMetric.brandName, {
            totalMentions: 0,
            totalTests: 0,
            positions: [],
            sentiments: [],
            citations: []
          });
        }
        
        const data = brandData.get(brandMetric.brandName);
        data.totalTests++;
        if (brandMetric.mentioned) {
          data.totalMentions++;
          data.positions.push(brandMetric.firstPosition);
          data.sentiments.push(brandMetric.sentimentScore);
          data.citations.push(...brandMetric.citations);
        }
      }
    }
    
    // Create brand metrics for aggregated data
    const brandMetrics = Array.from(allBrands).map((brandName, index) => {
      const data = brandData.get(brandName);
      const mentionRate = data.totalMentions / data.totalTests;
      const avgPosition = data.positions.length > 0 ? 
        data.positions.reduce((a, b) => a + b, 0) / data.positions.length : 0;
      const avgSentiment = data.sentiments.length > 0 ?
        data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length : 0;
      
      return {
        brandId: `brand-${index}`,
        brandName,
        visibilityScore: Math.round(mentionRate * 100),
        visibilityRank: index + 1,
        totalMentions: data.totalMentions,
        mentionRank: index + 1,
        shareOfVoice: Math.round(mentionRate * 100),
        shareOfVoiceRank: index + 1,
        avgPosition: Math.round(avgPosition * 10) / 10,
        avgPositionRank: index + 1,
        depthOfMention: Math.round(mentionRate * 100),
        depthRank: index + 1,
        citationShare: Math.round(mentionRate * 100),
        citationShareRank: index + 1,
        brandCitationsTotal: data.citations.filter(c => c.type === 'brand').length,
        earnedCitationsTotal: data.citations.filter(c => c.type === 'earned').length,
        socialCitationsTotal: data.citations.filter(c => c.type === 'social').length,
        totalCitations: data.citations.length,
        sentimentScore: Math.round(avgSentiment * 100) / 100,
        sentimentBreakdown: {
          positive: data.sentiments.filter(s => s > 0.1).length,
          neutral: data.sentiments.filter(s => s >= -0.1 && s <= 0.1).length,
          negative: data.sentiments.filter(s => s < -0.1).length,
          mixed: 0
        },
        sentimentShare: Math.round((data.sentiments.filter(s => s > 0.1).length / data.sentiments.length) * 100),
        count1st: data.positions.filter(p => p === 1).length,
        count2nd: data.positions.filter(p => p === 2).length,
        count3rd: data.positions.filter(p => p === 3).length,
        rank1st: index + 1,
        rank2nd: index + 1,
        rank3rd: index + 1,
        totalAppearances: data.totalMentions
      };
    });
    
    // Create overall aggregated metrics
    const overallMetrics = new AggregatedMetrics({
      userId: user._id.toString(),
      urlAnalysisId: savedUrlAnalysis._id,
      scope: 'overall',
      scopeValue: null,
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      dateTo: new Date(),
      totalPrompts: promptIds.length,
      totalResponses: testIds.length,
      totalBrands: allBrands.size,
      brandMetrics: brandMetrics,
      lastCalculated: new Date(),
      promptTestIds: testIds
    });
    
    await overallMetrics.save();
    console.log('✅ Overall aggregated metrics created');
    
    // Create platform-specific metrics
    for (const llmProvider of llmProviders) {
      const platformMetrics = new AggregatedMetrics({
        userId: user._id.toString(),
        urlAnalysisId: savedUrlAnalysis._id,
        scope: 'platform',
        scopeValue: llmProvider,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date(),
        totalPrompts: promptIds.length,
        totalResponses: testIds.filter((_, i) => i % llmProviders.length === llmProviders.indexOf(llmProvider)).length,
        totalBrands: allBrands.size,
        brandMetrics: brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: testIds.filter((_, i) => i % llmProviders.length === llmProviders.indexOf(llmProvider))
      });
      
      await platformMetrics.save();
      console.log(`✅ Platform metrics created for ${llmProvider}`);
    }
    
    // Create topic-specific metrics
    for (const topicId of topicIds) {
      const topic = await Topic.findById(topicId);
      const topicMetrics = new AggregatedMetrics({
        userId: user._id.toString(),
        urlAnalysisId: savedUrlAnalysis._id,
        scope: 'topic',
        scopeValue: topic.name,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date(),
        totalPrompts: 1, // One prompt per topic
        totalResponses: llmProviders.length,
        totalBrands: allBrands.size,
        brandMetrics: brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: testIds.slice(0, llmProviders.length) // Simplified for demo
      });
      
      await topicMetrics.save();
      console.log(`✅ Topic metrics created for ${topic.name}`);
    }
    
    // Create persona-specific metrics
    for (const personaId of personaIds) {
      const persona = await Persona.findById(personaId);
      const personaMetrics = new AggregatedMetrics({
        userId: user._id.toString(),
        urlAnalysisId: savedUrlAnalysis._id,
        scope: 'persona',
        scopeValue: persona.type,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date(),
        totalPrompts: 1, // One prompt per persona
        totalResponses: llmProviders.length,
        totalBrands: allBrands.size,
        brandMetrics: brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: testIds.slice(0, llmProviders.length) // Simplified for demo
      });
      
      await personaMetrics.save();
      console.log(`✅ Persona metrics created for ${persona.type}`);
    }
    
    // Create Insights for each tab
    console.log('💡 Creating Insights...');
    const tabTypes = ['visibility', 'prompts', 'sentiment', 'citations'];
    
    for (const tabType of tabTypes) {
      const insights = new Insights({
        userId: user._id.toString(),
        urlAnalysisId: savedUrlAnalysis._id,
        tabType: tabType,
        whatsWorking: [
          {
            description: `Strong performance in ${tabType} metrics for Netflix India`,
            impact: 'High',
            recommendation: `Continue current ${tabType} strategy and monitor competitor moves`
          }
        ],
        needsAttention: [
          {
            description: `Opportunity to improve ${tabType} positioning against competitors`,
            impact: 'Medium',
            recommendation: `Analyze competitor ${tabType} strategies and implement improvements`
          }
        ],
        generatedAt: new Date()
      });
      
      await insights.save();
      console.log(`  ✅ Insights created for ${tabType} tab`);
    }
    console.log('✅ All insights created');
    
    // Create Subjective Metrics
    console.log('📊 Creating Subjective Metrics...');
    for (const promptId of promptIds) {
      const prompt = await Prompt.findById(promptId);
      const subjectiveMetrics = new SubjectiveMetrics({
        userId: user._id,
        promptId: promptId,
        urlAnalysisId: savedUrlAnalysis._id,
        brandName: 'Netflix India',
        platform: 'openai',
        relevance: {
          score: 4,
          reasoning: 'High relevance for streaming content queries and entertainment discussions'
        },
        influence: {
          score: 4,
          reasoning: 'Strong influence on user decision-making for entertainment choices'
        },
        uniqueness: {
          score: 5,
          reasoning: 'Unique positioning with original content and premium streaming experience'
        },
        position: {
          score: 4,
          reasoning: 'Consistently appears in top positions for streaming-related queries'
        },
        clickProbability: {
          score: 4,
          reasoning: 'High click probability due to brand recognition and content quality'
        },
        diversity: {
          score: 3,
          reasoning: 'Good diversity in content recommendations and platform features'
        },
        overallQuality: {
          score: 4,
          summary: 'Netflix India demonstrates strong overall quality in streaming content recommendations with high brand recognition and user trust'
        },
        evaluatedAt: new Date(),
        model: 'gpt-4o',
        status: 'completed'
      });
      
      await subjectiveMetrics.save();
      console.log(`  ✅ Subjective metrics created for prompt: ${prompt.title}`);
    }
    console.log('✅ Subjective metrics created');
    
    console.log('\n🎉 Mock analysis creation completed successfully!');
    console.log(`📊 URL Analysis ID: ${savedUrlAnalysis._id}`);
    console.log(`📝 Topics: ${topicIds.length}`);
    console.log(`👥 Personas: ${personaIds.length}`);
    console.log(`🏢 Competitors: ${competitorIds.length}`);
    console.log(`💬 Prompts: ${promptIds.length}`);
    console.log(`🧪 Tests: ${testIds.length}`);
    console.log(`📈 Metrics: Multiple aggregated metrics created`);
    console.log(`💡 Insights: Created`);
    console.log(`📊 Subjective Metrics: Created`);
    
    console.log('\n✅ You can now test URL analysis toggling in the dashboard!');
    
  } catch (error) {
    console.error('❌ Error creating mock analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createMockAnalysis();
}

module.exports = { createMockAnalysis };
