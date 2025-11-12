const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Competitor = require('../src/models/Competitor');
const Topic = require('../src/models/Topic');
const Persona = require('../src/models/Persona');
const UrlAnalysis = require('../src/models/UrlAnalysis');

async function fixUrlAnalysisId() {
  try {
    console.log('🔧 Starting urlAnalysisId fix script...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    // Get all UrlAnalysis records
    const urlAnalyses = await UrlAnalysis.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${urlAnalyses.length} UrlAnalysis records`);

    if (urlAnalyses.length === 0) {
      console.log('❌ No UrlAnalysis records found. Cannot proceed.');
      return;
    }

    // Use the latest analysis as the default
    const latestAnalysis = urlAnalyses[0];
    console.log(`🎯 Using latest analysis: ${latestAnalysis._id} (${latestAnalysis.url})`);

    // Fix Competitors
    console.log('\n🔧 Fixing Competitors...');
    const competitorResult = await Competitor.updateMany(
      { urlAnalysisId: null },
      { urlAnalysisId: latestAnalysis._id }
    );
    console.log(`✅ Updated ${competitorResult.modifiedCount} competitors`);

    // Fix Topics
    console.log('\n🔧 Fixing Topics...');
    const topicResult = await Topic.updateMany(
      { urlAnalysisId: null },
      { urlAnalysisId: latestAnalysis._id }
    );
    console.log(`✅ Updated ${topicResult.modifiedCount} topics`);

    // Fix Personas
    console.log('\n🔧 Fixing Personas...');
    const personaResult = await Persona.updateMany(
      { urlAnalysisId: null },
      { urlAnalysisId: latestAnalysis._id }
    );
    console.log(`✅ Updated ${personaResult.modifiedCount} personas`);

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const remainingNullCompetitors = await Competitor.countDocuments({ urlAnalysisId: null });
    const remainingNullTopics = await Topic.countDocuments({ urlAnalysisId: null });
    const remainingNullPersonas = await Persona.countDocuments({ urlAnalysisId: null });

    console.log(`📊 Remaining null urlAnalysisId counts:`);
    console.log(`   - Competitors: ${remainingNullCompetitors}`);
    console.log(`   - Topics: ${remainingNullTopics}`);
    console.log(`   - Personas: ${remainingNullPersonas}`);

    if (remainingNullCompetitors === 0 && remainingNullTopics === 0 && remainingNullPersonas === 0) {
      console.log('✅ All urlAnalysisId values have been fixed!');
    } else {
      console.log('⚠️ Some records still have null urlAnalysisId values');
    }

    // Show some examples of fixed data
    console.log('\n📋 Sample of fixed data:');
    const sampleCompetitors = await Competitor.find({ urlAnalysisId: latestAnalysis._id }).limit(3);
    const sampleTopics = await Topic.find({ urlAnalysisId: latestAnalysis._id }).limit(3);
    const samplePersonas = await Persona.find({ urlAnalysisId: latestAnalysis._id }).limit(3);

    console.log('Competitors:', sampleCompetitors.map(c => ({ name: c.name, urlAnalysisId: c.urlAnalysisId })));
    console.log('Topics:', sampleTopics.map(t => ({ name: t.name, urlAnalysisId: t.urlAnalysisId })));
    console.log('Personas:', samplePersonas.map(p => ({ type: p.type, urlAnalysisId: p.urlAnalysisId })));

  } catch (error) {
    console.error('❌ Error fixing urlAnalysisId:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixUrlAnalysisId();
