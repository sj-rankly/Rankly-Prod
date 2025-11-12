const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Competitor = require('../src/models/Competitor');
const Topic = require('../src/models/Topic');
const Persona = require('../src/models/Persona');
const UrlAnalysis = require('../src/models/UrlAnalysis');
const PromptTest = require('../src/models/PromptTest');

async function fixAnalysisMapping() {
  try {
    console.log('🔧 Starting analysis mapping fix script...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    // Get all analyses
    const analyses = await UrlAnalysis.find({}).sort({ analysisDate: -1 });
    console.log(`📊 Found ${analyses.length} analyses`);

    for (const analysis of analyses) {
      console.log(`\n🔍 Processing analysis: ${analysis._id} (${analysis.brandContext?.companyName || 'Unknown'})`);
      
      // Find prompt tests for this analysis
      const promptTests = await PromptTest.find({ urlAnalysisId: analysis._id });
      console.log(`   📝 Found ${promptTests.length} prompt tests`);
      
      if (promptTests.length === 0) {
        console.log(`   ⚠️  No prompt tests found for this analysis, skipping...`);
        continue;
      }
      
      // Get unique topic and persona IDs from prompt tests
      const topicIds = [...new Set(promptTests.map(test => test.topicId?.toString()).filter(Boolean))];
      const personaIds = [...new Set(promptTests.map(test => test.personaId?.toString()).filter(Boolean))];
      
      console.log(`   📊 Found ${topicIds.length} unique topics and ${personaIds.length} unique personas in prompt tests`);
      
      // Update topics to belong to this analysis
      if (topicIds.length > 0) {
        const topicResult = await Topic.updateMany(
          { _id: { $in: topicIds } },
          { urlAnalysisId: analysis._id }
        );
        console.log(`   ✅ Updated ${topicResult.modifiedCount} topics`);
      }
      
      // Update personas to belong to this analysis
      if (personaIds.length > 0) {
        const personaResult = await Persona.updateMany(
          { _id: { $in: personaIds } },
          { urlAnalysisId: analysis._id }
        );
        console.log(`   ✅ Updated ${personaResult.modifiedCount} personas`);
      }
      
      // Update competitors to belong to this analysis (based on analysis competitors)
      if (analysis.competitors && analysis.competitors.length > 0) {
        const competitorUrls = analysis.competitors.map(comp => comp.url);
        const competitorResult = await Competitor.updateMany(
          { url: { $in: competitorUrls } },
          { urlAnalysisId: analysis._id }
        );
        console.log(`   ✅ Updated ${competitorResult.modifiedCount} competitors`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    for (const analysis of analyses) {
      const topicsCount = await Topic.countDocuments({ urlAnalysisId: analysis._id });
      const personasCount = await Persona.countDocuments({ urlAnalysisId: analysis._id });
      const competitorsCount = await Competitor.countDocuments({ urlAnalysisId: analysis._id });
      const promptTestsCount = await PromptTest.countDocuments({ urlAnalysisId: analysis._id });
      
      console.log(`📊 Analysis ${analysis._id} (${analysis.brandContext?.companyName || 'Unknown'}):`);
      console.log(`   - Topics: ${topicsCount}`);
      console.log(`   - Personas: ${personasCount}`);
      console.log(`   - Competitors: ${competitorsCount}`);
      console.log(`   - Prompt Tests: ${promptTestsCount}`);
    }

    console.log('\n✅ Analysis mapping fix completed!');

  } catch (error) {
    console.error('❌ Error fixing analysis mapping:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixAnalysisMapping();
