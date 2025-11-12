const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const UrlAnalysis = require('../src/models/UrlAnalysis');
const PromptTest = require('../src/models/PromptTest');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');
const SubjectiveMetrics = require('../src/models/SubjectiveMetrics');
const Competitor = require('../src/models/Competitor');
const Topic = require('../src/models/Topic');
const Persona = require('../src/models/Persona');
const Prompt = require('../src/models/Prompt');
const User = require('../src/models/User');

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log('🎯 Preserving HDFC Bank Freedom Card analysis: 68f34f8edea37c0ff001454d');
    console.log('🎯 Preserving URL: https://www.hdfcbank.com/personal/pay/cards/credit-cards/freedom-card-new');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    const targetUrlAnalysisId = '68f34f8edea37c0ff001454d';
    const targetUrl = 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/freedom-card-new';

    // Step 1: Find the target URL analysis
    const targetAnalysis = await UrlAnalysis.findById(targetUrlAnalysisId);
    if (!targetAnalysis) {
      console.log('❌ Target URL analysis not found:', targetUrlAnalysisId);
      return;
    }

    console.log('✅ Found target analysis:', {
      id: targetAnalysis._id,
      url: targetAnalysis.url,
      userId: targetAnalysis.userId
    });

    const targetUserId = targetAnalysis.userId.toString();

    // Step 2: Get all URL analyses for this user
    const allAnalyses = await UrlAnalysis.find({ userId: targetUserId });
    console.log(`📊 Found ${allAnalyses.length} total analyses for user`);

    // Step 3: Identify analyses to keep vs delete
    const analysesToKeep = allAnalyses.filter(analysis => 
      analysis._id.toString() === targetUrlAnalysisId
    );
    const analysesToDelete = allAnalyses.filter(analysis => 
      analysis._id.toString() !== targetUrlAnalysisId
    );

    console.log(`✅ Keeping ${analysesToKeep.length} analysis(es)`);
    console.log(`🗑️ Deleting ${analysesToDelete.length} analysis(es)`);

    if (analysesToDelete.length > 0) {
      const analysesToDeleteIds = analysesToDelete.map(a => a._id);

      // Step 4: Delete prompt tests for analyses to be removed
      const promptTestResult = await PromptTest.deleteMany({
        urlAnalysisId: { $in: analysesToDeleteIds }
      });
      console.log(`🗑️ Deleted ${promptTestResult.deletedCount} prompt tests`);

      // Step 5: Delete aggregated metrics for analyses to be removed
      const metricsResult = await AggregatedMetrics.deleteMany({
        urlAnalysisId: { $in: analysesToDeleteIds }
      });
      console.log(`📊 Deleted ${metricsResult.deletedCount} aggregated metrics`);

      // Step 6: Delete the URL analyses to be removed
      const urlAnalysisResult = await UrlAnalysis.deleteMany({
        _id: { $in: analysesToDeleteIds }
      });
      console.log(`🔗 Deleted ${urlAnalysisResult.deletedCount} URL analyses`);
    }

    // Step 7: Clean up competitors, topics, personas, and prompts
    // Keep only those associated with the target analysis
    console.log('\n🧹 Cleaning up competitors, topics, personas, and prompts...');

    // Get IDs of items to keep (associated with target analysis)
    const keepCompetitors = await Competitor.find({ 
      userId: targetUserId, 
      urlAnalysisId: targetUrlAnalysisId 
    });
    const keepTopics = await Topic.find({ 
      userId: targetUserId, 
      urlAnalysisId: targetUrlAnalysisId 
    });
    const keepPersonas = await Persona.find({ 
      userId: targetUserId, 
      urlAnalysisId: targetUrlAnalysisId 
    });

    console.log(`📊 Found ${keepCompetitors.length} competitors to keep`);
    console.log(`📊 Found ${keepTopics.length} topics to keep`);
    console.log(`📊 Found ${keepPersonas.length} personas to keep`);

    // Delete all competitors, topics, personas not associated with target analysis
    const [competitorResult, topicResult, personaResult] = await Promise.all([
      Competitor.deleteMany({ 
        userId: targetUserId, 
        urlAnalysisId: { $ne: targetUrlAnalysisId } 
      }),
      Topic.deleteMany({ 
        userId: targetUserId, 
        urlAnalysisId: { $ne: targetUrlAnalysisId } 
      }),
      Persona.deleteMany({ 
        userId: targetUserId, 
        urlAnalysisId: { $ne: targetUrlAnalysisId } 
      })
    ]);

    console.log(`🗑️ Deleted ${competitorResult.deletedCount} competitors`);
    console.log(`🗑️ Deleted ${topicResult.deletedCount} topics`);
    console.log(`🗑️ Deleted ${personaResult.deletedCount} personas`);

    // Delete prompts not associated with kept topics/personas
    const keepTopicIds = keepTopics.map(t => t._id);
    const keepPersonaIds = keepPersonas.map(p => p._id);

    const promptResult = await Prompt.deleteMany({
      userId: targetUserId,
      $and: [
        { topicId: { $nin: keepTopicIds } },
        { personaId: { $nin: keepPersonaIds } }
      ]
    });
    console.log(`📝 Deleted ${promptResult.deletedCount} prompts`);

    // Step 8: Clean up subjective metrics (keep only for target user)
    const subjectiveMetricsResult = await SubjectiveMetrics.deleteMany({
      userId: { $ne: targetUserId }
    });
    console.log(`🧠 Deleted ${subjectiveMetricsResult.deletedCount} subjective metrics from other users`);

    // Step 9: Clean up other users' data (optional - uncomment if you want to remove other users)
    // const otherUsersResult = await User.deleteMany({ _id: { $ne: targetUserId } });
    // console.log(`👥 Deleted ${otherUsersResult.deletedCount} other users`);

    // Step 10: Verification
    console.log('\n🔍 Verification:');
    const finalAnalyses = await UrlAnalysis.find({ userId: targetUserId });
    const finalCompetitors = await Competitor.find({ userId: targetUserId });
    const finalTopics = await Topic.find({ userId: targetUserId });
    const finalPersonas = await Persona.find({ userId: targetUserId });
    const finalPrompts = await Prompt.find({ userId: targetUserId });
    const finalMetrics = await AggregatedMetrics.find({ userId: targetUserId });

    console.log(`✅ Final counts for user ${targetUserId}:`);
    console.log(`   - URL Analyses: ${finalAnalyses.length}`);
    console.log(`   - Competitors: ${finalCompetitors.length}`);
    console.log(`   - Topics: ${finalTopics.length}`);
    console.log(`   - Personas: ${finalPersonas.length}`);
    console.log(`   - Prompts: ${finalPrompts.length}`);
    console.log(`   - Aggregated Metrics: ${finalMetrics.length}`);

    if (finalAnalyses.length > 0) {
      console.log(`✅ Preserved analysis: ${finalAnalyses[0].url}`);
    }

    console.log('\n✅ Database cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupDatabase();
