const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Topic = require('../src/models/Topic');
const Persona = require('../src/models/Persona');
const PromptTest = require('../src/models/PromptTest');

async function fixSelectedItems() {
  try {
    console.log('🔧 Starting selected items fix script...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    // Get all prompt tests
    const promptTests = await PromptTest.find({ status: 'completed' });
    console.log(`📊 Found ${promptTests.length} prompt tests`);

    // Group by analysis
    const analysisGroups = {};
    promptTests.forEach(test => {
      const analysisId = test.urlAnalysisId?.toString();
      if (!analysisId) return;
      
      if (!analysisGroups[analysisId]) {
        analysisGroups[analysisId] = {
          topicIds: new Set(),
          personaIds: new Set()
        };
      }
      
      if (test.topicId) {
        analysisGroups[analysisId].topicIds.add(test.topicId.toString());
      }
      if (test.personaId) {
        analysisGroups[analysisId].personaIds.add(test.personaId.toString());
      }
    });

    console.log(`📊 Found ${Object.keys(analysisGroups).length} analyses with prompt tests`);

    // Update topics and personas to be selected for each analysis
    for (const [analysisId, data] of Object.entries(analysisGroups)) {
      console.log(`\n🔍 Processing analysis: ${analysisId}`);
      console.log(`   📊 Found ${data.topicIds.size} topics and ${data.personaIds.size} personas in prompt tests`);
      
      // Update topics
      if (data.topicIds.size > 0) {
        const topicResult = await Topic.updateMany(
          { 
            _id: { $in: Array.from(data.topicIds) },
            urlAnalysisId: analysisId
          },
          { selected: true }
        );
        console.log(`   ✅ Updated ${topicResult.modifiedCount} topics to selected: true`);
      }
      
      // Update personas
      if (data.personaIds.size > 0) {
        const personaResult = await Persona.updateMany(
          { 
            _id: { $in: Array.from(data.personaIds) },
            urlAnalysisId: analysisId
          },
          { selected: true }
        );
        console.log(`   ✅ Updated ${personaResult.modifiedCount} personas to selected: true`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    for (const [analysisId, data] of Object.entries(analysisGroups)) {
      const selectedTopics = await Topic.countDocuments({ 
        urlAnalysisId: analysisId, 
        selected: true 
      });
      const selectedPersonas = await Persona.countDocuments({ 
        urlAnalysisId: analysisId, 
        selected: true 
      });
      
      console.log(`📊 Analysis ${analysisId}:`);
      console.log(`   - Selected Topics: ${selectedTopics}`);
      console.log(`   - Selected Personas: ${selectedPersonas}`);
    }

    console.log('\n✅ Selected items fix completed!');

  } catch (error) {
    console.error('❌ Error fixing selected items:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixSelectedItems();
