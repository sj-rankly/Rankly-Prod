const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Import models
const UrlAnalysis = require('../src/models/UrlAnalysis');
const Competitor = require('../src/models/Competitor');
const Topic = require('../src/models/Topic');
const Persona = require('../src/models/Persona');
const Prompt = require('../src/models/Prompt');
const PromptTest = require('../src/models/PromptTest');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');

async function fixDataIsolation() {
  console.log('🔧 Starting data isolation fix...');

  try {
    // Connect to MongoDB
    console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const userId = '68f362f27979b83b67e50834'; // Hardcoded user ID

    // Get all analyses
    const analyses = await UrlAnalysis.find({ userId }).sort({ analysisDate: -1 });
    console.log(`📊 Found ${analyses.length} analyses`);

    if (analyses.length === 0) {
      console.log('⚠️ No analyses found. Exiting.');
      return;
    }

    // For each analysis, ensure data isolation
    for (const analysis of analyses) {
      console.log(`\n🔍 Processing analysis: ${analysis._id} (${analysis.url})`);
      
      // 1. Delete all topics/personas/competitors that don't belong to this analysis
      console.log('   🧹 Cleaning up topics...');
      const topicResult = await Topic.deleteMany({
        userId,
        urlAnalysisId: { $ne: analysis._id }
      });
      console.log(`   ✅ Deleted ${topicResult.deletedCount} topics from other analyses`);

      console.log('   🧹 Cleaning up personas...');
      const personaResult = await Persona.deleteMany({
        userId,
        urlAnalysisId: { $ne: analysis._id }
      });
      console.log(`   ✅ Deleted ${personaResult.deletedCount} personas from other analyses`);

      console.log('   🧹 Cleaning up competitors...');
      const competitorResult = await Competitor.deleteMany({
        userId,
        urlAnalysisId: { $ne: analysis._id }
      });
      console.log(`   ✅ Deleted ${competitorResult.deletedCount} competitors from other analyses`);

      // 2. Delete prompts that don't belong to this analysis
      console.log('   🧹 Cleaning up prompts...');
      const promptResult = await Prompt.deleteMany({
        userId,
        $or: [
          { topicId: { $nin: await Topic.find({ userId, urlAnalysisId: analysis._id }).distinct('_id') } },
          { personaId: { $nin: await Persona.find({ userId, urlAnalysisId: analysis._id }).distinct('_id') } }
        ]
      });
      console.log(`   ✅ Deleted ${promptResult.deletedCount} prompts from other analyses`);

      // 3. Delete prompt tests that don't belong to this analysis
      console.log('   🧹 Cleaning up prompt tests...');
      const promptTestResult = await PromptTest.deleteMany({
        userId,
        urlAnalysisId: { $ne: analysis._id }
      });
      console.log(`   ✅ Deleted ${promptTestResult.deletedCount} prompt tests from other analyses`);

      // 4. Delete aggregated metrics that don't belong to this analysis
      console.log('   🧹 Cleaning up aggregated metrics...');
      const metricsResult = await AggregatedMetrics.deleteMany({
        userId,
        urlAnalysisId: { $ne: analysis._id }
      });
      console.log(`   ✅ Deleted ${metricsResult.deletedCount} aggregated metrics from other analyses`);
    }

    // 5. Now recreate the correct data for each analysis
    for (const analysis of analyses) {
      console.log(`\n🔄 Recreating data for analysis: ${analysis._id}`);
      
      // Get the analysis data
      const analysisData = {
        competitors: analysis.competitors || [],
        topics: analysis.topics || [],
        personas: analysis.personas || []
      };

      // Create competitors for this analysis
      console.log('   🏢 Creating competitors...');
      for (const comp of analysisData.competitors) {
        await Competitor.findOneAndUpdate(
          { userId, name: comp.name, urlAnalysisId: analysis._id },
          {
            userId,
            name: comp.name,
            url: comp.url,
            reason: comp.reason,
            similarity: comp.similarity,
            source: 'ai',
            selected: false,
            urlAnalysisId: analysis._id
          },
          { upsert: true, new: true }
        );
      }

      // Create topics for this analysis
      console.log('   📚 Creating topics...');
      for (const topic of analysisData.topics) {
        await Topic.findOneAndUpdate(
          { userId, name: topic.name, urlAnalysisId: analysis._id },
          {
            userId,
            name: topic.name,
            description: topic.description,
            keywords: topic.keywords || [],
            priority: topic.priority,
            source: 'ai',
            selected: false,
            urlAnalysisId: analysis._id
          },
          { upsert: true, new: true }
        );
      }

      // Create personas for this analysis
      console.log('   👥 Creating personas...');
      for (const persona of analysisData.personas) {
        await Persona.findOneAndUpdate(
          { userId, type: persona.type, urlAnalysisId: analysis._id },
          {
            userId,
            type: persona.type,
            description: persona.description,
            painPoints: persona.painPoints || [],
            goals: persona.goals || [],
            relevance: persona.relevance,
            source: 'ai',
            selected: false,
            urlAnalysisId: analysis._id
          },
          { upsert: true, new: true }
        );
      }
    }

    console.log('\n✅ Data isolation fix completed successfully!');

    // Verification
    console.log('\n🔍 Verification:');
    for (const analysis of analyses) {
      const topics = await Topic.countDocuments({ userId, urlAnalysisId: analysis._id });
      const personas = await Persona.countDocuments({ userId, urlAnalysisId: analysis._id });
      const competitors = await Competitor.countDocuments({ userId, urlAnalysisId: analysis._id });
      
      console.log(`   Analysis ${analysis._id}: ${topics} topics, ${personas} personas, ${competitors} competitors`);
    }

  } catch (error) {
    console.error('❌ Error during data isolation fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixDataIsolation();
