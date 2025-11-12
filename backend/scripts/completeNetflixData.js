const mongoose = require('mongoose');
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
const SubjectiveMetrics = require('../src/models/SubjectiveMetrics');
const Insights = require('../src/models/Insights');

async function completeNetflixData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    // Find the Netflix URL analysis
    const netflixAnalysis = await UrlAnalysis.findOne({ 
      url: 'https://www.netflix.com/in' 
    });
    
    if (!netflixAnalysis) {
      console.log('❌ Netflix analysis not found');
      return;
    }

    console.log(`📊 Found Netflix analysis: ${netflixAnalysis._id}`);

    // Get Netflix topics and personas
    const netflixTopics = await Topic.find({ urlAnalysisId: netflixAnalysis._id });
    const netflixPersonas = await Persona.find({ urlAnalysisId: netflixAnalysis._id });
    
    console.log(`📝 Found ${netflixTopics.length} topics and ${netflixPersonas.length} personas`);

    if (netflixTopics.length === 0 || netflixPersonas.length === 0) {
      console.log('❌ No topics or personas found for Netflix analysis');
      return;
    }

    // Create prompts for each topic-persona combination
    const prompts = [];
    const queryTypes = ['Navigational', 'Commercial Investigation', 'Transactional', 'Comparative', 'Reputational'];
    
    for (const topic of netflixTopics) {
      for (const persona of netflixPersonas) {
        for (const queryType of queryTypes) {
          const prompt = new Prompt({
            userId: netflixAnalysis.userId,
            urlAnalysisId: netflixAnalysis._id, // ✅ Link prompt to URL analysis
            topicId: topic._id,
            personaId: persona._id,
            title: `${topic.name} × ${persona.name} - ${queryType}`,
            text: generatePromptText(topic.name, persona.name, queryType),
            queryType: queryType,
            status: 'active',
            metadata: {
              targetPersonas: [persona.name],
              targetCompetitors: ['Disney+ Hotstar', 'Amazon Prime Video', 'Zee5', 'SonyLIV'],
              generatedBy: 'ai'
            },
            performance: {
              tested: false,
              successRate: 0,
              llmResults: [],
              testResults: []
            }
          });
          
          prompts.push(prompt);
        }
      }
    }

    // Save all prompts
    const savedPrompts = await Prompt.insertMany(prompts);
    console.log(`✅ Created ${savedPrompts.length} prompts for Netflix analysis`);

    // Create PromptTests for each prompt
    const promptTests = [];
    const llmModels = [
      { model: 'openai/gpt-4o', provider: 'openai' },
      { model: 'google/gemini-2.5-flash', provider: 'gemini' },
      { model: 'anthropic/claude-3.5-sonnet', provider: 'claude' }
    ];
    
    for (const prompt of savedPrompts) {
      for (const llm of llmModels) {
        const promptTest = new PromptTest({
          userId: netflixAnalysis.userId,
          urlAnalysisId: netflixAnalysis._id,
          promptId: prompt._id,
          topicId: prompt.topicId,
          personaId: prompt.personaId,
          promptText: prompt.text,
          queryType: prompt.queryType,
          llmProvider: llm.provider,
          llmModel: llm.model,
          rawResponse: generateActualOutput(prompt.queryType),
          responseTime: Math.floor(Math.random() * 2000) + 1000,
          tokensUsed: Math.floor(Math.random() * 500) + 100,
          cost: Math.random() * 0.05,
          scorecard: {
            brandMentioned: true,
            brandPosition: Math.floor(Math.random() * 3) + 1,
            brandMentionCount: Math.floor(Math.random() * 5) + 1,
            citationPresent: true,
            citationType: 'direct_link',
            brandCitations: Math.floor(Math.random() * 3) + 1,
            earnedCitations: Math.floor(Math.random() * 2),
            socialCitations: Math.floor(Math.random() * 2),
            totalCitations: Math.floor(Math.random() * 5) + 1,
            sentiment: ['positive', 'neutral', 'positive'][Math.floor(Math.random() * 3)],
            sentimentScore: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
            competitorsMentioned: ['Disney+ Hotstar', 'Amazon Prime Video']
          },
          brandMetrics: [{
            brandName: 'Netflix',
            mentioned: true,
            firstPosition: Math.floor(Math.random() * 3) + 1,
            mentionCount: Math.floor(Math.random() * 5) + 1,
            sentences: [{
              text: 'Netflix offers excellent streaming content',
              position: 0,
              wordCount: 5
            }],
            totalWordCount: 5,
            citationMetrics: {
              brandCitations: Math.floor(Math.random() * 3) + 1,
              earnedCitations: Math.floor(Math.random() * 2),
              socialCitations: Math.floor(Math.random() * 2),
              totalCitations: Math.floor(Math.random() * 5) + 1
            },
            sentiment: 'positive',
            sentimentScore: Math.random() * 0.6 + 0.2,
            sentimentDrivers: [{
              text: 'Netflix provides great content',
              sentiment: 'positive',
              keywords: ['great', 'content', 'quality']
            }],
            citations: [{
              url: 'https://www.netflix.com',
              type: 'brand',
              context: 'Direct link to Netflix website'
            }]
          }],
          status: 'completed',
          metadata: {
            testDate: new Date(),
            modelVersion: 'latest',
            testEnvironment: 'production'
          }
        });
        
        promptTests.push(promptTest);
      }
    }

    // Save all prompt tests
    const savedPromptTests = await PromptTest.insertMany(promptTests);
    console.log(`✅ Created ${savedPromptTests.length} prompt tests`);

    // Create AggregatedMetrics for Netflix analysis
    const aggregatedMetrics = new AggregatedMetrics({
      userId: netflixAnalysis.userId,
      urlAnalysisId: netflixAnalysis._id,
      scope: 'overall',
      scopeValue: 'netflix',
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      dateTo: new Date(),
      totalPrompts: savedPrompts.length,
      totalResponses: savedPromptTests.length,
      totalBrands: 1,
      brandMetrics: [{
        brandId: 'netflix',
        brandName: 'Netflix',
        visibilityScore: Math.floor(Math.random() * 30) + 60,
        visibilityRank: Math.floor(Math.random() * 5) + 1,
        totalMentions: Math.floor(Math.random() * 50) + 20,
        mentionRank: Math.floor(Math.random() * 5) + 1,
        shareOfVoice: Math.floor(Math.random() * 30) + 40,
        shareOfVoiceRank: Math.floor(Math.random() * 5) + 1,
        avgPosition: Math.floor(Math.random() * 3) + 1,
        avgPositionRank: Math.floor(Math.random() * 5) + 1,
        depthOfMention: Math.floor(Math.random() * 30) + 50,
        depthRank: Math.floor(Math.random() * 5) + 1,
        citationShare: Math.floor(Math.random() * 30) + 50,
        citationShareRank: Math.floor(Math.random() * 5) + 1,
        brandCitationsTotal: Math.floor(Math.random() * 20) + 10,
        earnedCitationsTotal: Math.floor(Math.random() * 15) + 5,
        socialCitationsTotal: Math.floor(Math.random() * 10) + 3,
        totalCitations: Math.floor(Math.random() * 40) + 15,
        sentimentScore: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
        sentimentBreakdown: {
          positive: Math.floor(Math.random() * 20) + 10,
          neutral: Math.floor(Math.random() * 10) + 5,
          negative: Math.floor(Math.random() * 3),
          mixed: Math.floor(Math.random() * 5)
        },
        sentimentShare: Math.floor(Math.random() * 30) + 60,
        count1st: Math.floor(Math.random() * 10) + 5,
        count2nd: Math.floor(Math.random() * 8) + 3,
        count3rd: Math.floor(Math.random() * 6) + 2,
        rank1st: Math.floor(Math.random() * 5) + 1,
        rank2nd: Math.floor(Math.random() * 5) + 1,
        rank3rd: Math.floor(Math.random() * 5) + 1,
        totalAppearances: Math.floor(Math.random() * 50) + 20
      }],
      lastCalculated: new Date(),
      promptTestIds: savedPromptTests.map(test => test._id.toString())
    });

    await aggregatedMetrics.save();
    console.log('✅ Created AggregatedMetrics for Netflix analysis');

    // Create SubjectiveMetrics for a few sample prompts
    const samplePrompts = savedPrompts.slice(0, 3); // Take first 3 prompts
    const subjectiveMetricsEntries = [];
    
    for (const prompt of samplePrompts) {
      const subjectiveMetrics = new SubjectiveMetrics({
        userId: netflixAnalysis.userId,
        promptId: prompt._id,
        urlAnalysisId: netflixAnalysis._id,
        brandName: 'Netflix',
        platform: 'streaming',
        relevance: {
          score: Math.floor(Math.random() * 2) + 4, // 4-5
          reasoning: 'Netflix is highly relevant to streaming content queries'
        },
        diversity: {
          score: Math.floor(Math.random() * 2) + 4, // 4-5
          reasoning: 'Netflix offers diverse content across multiple genres'
        },
        clickProbability: {
          score: Math.floor(Math.random() * 2) + 3, // 3-4
          reasoning: 'High click probability due to brand recognition and content quality'
        },
        position: {
          score: Math.floor(Math.random() * 2) + 4, // 4-5
          reasoning: 'Netflix typically appears in top positions for streaming queries'
        },
        uniqueness: {
          score: Math.floor(Math.random() * 2) + 3, // 3-4
          reasoning: 'Netflix has unique original content that differentiates it from competitors'
        },
        influence: {
          score: Math.floor(Math.random() * 2) + 4, // 4-5
          reasoning: 'Netflix has strong influence in the streaming market'
        },
        overallQuality: {
          score: Math.floor(Math.random() * 2) + 4, // 4-5
          summary: 'Netflix provides high-quality streaming content with strong brand recognition'
        }
      });
      
      subjectiveMetricsEntries.push(subjectiveMetrics);
    }

    await SubjectiveMetrics.insertMany(subjectiveMetricsEntries);
    console.log(`✅ Created ${subjectiveMetricsEntries.length} SubjectiveMetrics entries`);

    // Create Insights for Netflix analysis
    const insights = [
      {
        userId: netflixAnalysis.userId,
        urlAnalysisId: netflixAnalysis._id,
        tabType: 'sentiment',
        title: 'Strong Brand Sentiment in Streaming Market',
        description: 'Netflix maintains positive sentiment across all user personas, with particularly strong performance in original content discussions.',
        insight: 'Focus on original content marketing to maintain competitive advantage',
        priority: 'High',
        actionable: true,
        metrics: {
          sentimentScore: 8.2,
          trend: 'positive',
          confidence: 0.87
        }
      },
      {
        userId: netflixAnalysis.userId,
        urlAnalysisId: netflixAnalysis._id,
        tabType: 'visibility',
        title: 'High Visibility in Entertainment Queries',
        description: 'Netflix shows strong visibility in entertainment and streaming-related searches, particularly for original content.',
        insight: 'Leverage original content for better search visibility',
        priority: 'High',
        actionable: true,
        metrics: {
          visibilityScore: 8.5,
          trend: 'stable',
          confidence: 0.92
        }
      },
      {
        userId: netflixAnalysis.userId,
        urlAnalysisId: netflixAnalysis._id,
        tabType: 'prompts',
        title: 'Content Strategy Optimization Needed',
        description: 'User queries show high interest in regional content and local productions, indicating opportunity for content strategy enhancement.',
        insight: 'Increase investment in regional and local content production',
        priority: 'Medium',
        actionable: true,
        metrics: {
          queryVolume: 85.3,
          trend: 'increasing',
          confidence: 0.78
        }
      }
    ];

    await Insights.insertMany(insights);
    console.log('✅ Created Insights for Netflix analysis');

    // Update topic prompt counts
    for (const topic of netflixTopics) {
      const topicPromptCount = savedPrompts.filter(p => p.topicId.toString() === topic._id.toString()).length;
      await Topic.findByIdAndUpdate(topic._id, { promptCount: topicPromptCount });
    }

    console.log('✅ Updated topic prompt counts');

    console.log('\n🎉 Netflix data completion finished successfully!');
    console.log(`📊 Created ${savedPrompts.length} prompts`);
    console.log(`🧪 Created ${savedPromptTests.length} prompt tests`);
    console.log(`📈 Created aggregated metrics`);
    console.log(`💭 Created subjective metrics`);
    console.log(`💡 Created ${insights.length} insights`);

  } catch (error) {
    console.error('❌ Error completing Netflix data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

function generatePromptText(topicName, personaName, queryType) {
  const basePrompts = {
    'Navigational': `How can I find information about ${topicName.toLowerCase()} on Netflix?`,
    'Commercial Investigation': `What are the best streaming options for ${topicName.toLowerCase()}, and does Netflix offer competitive content?`,
    'Transactional': `Where can I watch ${topicName.toLowerCase()} content on Netflix?`,
    'Comparative': `Which streaming platform offers better ${topicName.toLowerCase()}: Netflix or its competitors?`,
    'Reputational': `What do users think about Netflix's ${topicName.toLowerCase()} content quality?`
  };
  
  return basePrompts[queryType] || `Tell me about ${topicName.toLowerCase()} on Netflix.`;
}

function generateTestInput(queryType) {
  const testInputs = {
    'Navigational': 'Find Netflix original content',
    'Commercial Investigation': 'Compare streaming platforms for entertainment',
    'Transactional': 'Watch Netflix shows online',
    'Comparative': 'Netflix vs other streaming services',
    'Reputational': 'Netflix content quality reviews'
  };
  
  return testInputs[queryType] || 'Netflix streaming information';
}

function generateExpectedOutput(queryType) {
  const expectedOutputs = {
    'Navigational': 'Netflix original content and shows',
    'Commercial Investigation': 'Streaming platform comparison with Netflix',
    'Transactional': 'Netflix viewing options and access',
    'Comparative': 'Netflix competitive analysis',
    'Reputational': 'Netflix content quality assessment'
  };
  
  return expectedOutputs[queryType] || 'Netflix streaming information';
}

function generateActualOutput(queryType) {
  const actualOutputs = {
    'Navigational': 'Netflix provides extensive original content including series, movies, and documentaries',
    'Commercial Investigation': 'Netflix competes strongly with other streaming platforms in content variety and quality',
    'Transactional': 'Netflix offers multiple subscription plans for accessing their content library',
    'Comparative': 'Netflix maintains competitive advantage through original content and global reach',
    'Reputational': 'Netflix is generally well-regarded for content quality and user experience'
  };
  
  return actualOutputs[queryType] || 'Netflix streaming platform information';
}

// Run the script
if (require.main === module) {
  completeNetflixData();
}

module.exports = completeNetflixData;
