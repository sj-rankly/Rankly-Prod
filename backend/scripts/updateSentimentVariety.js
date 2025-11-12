const mongoose = require('mongoose');
const PromptTest = require('../src/models/PromptTest');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');

const updateSentimentVariety = async () => {
  try {
    console.log('🔄 Starting sentiment variety update...');

    // Get all completed tests
    const tests = await PromptTest.find({ status: 'completed' }).limit(50);
    console.log(`📊 Found ${tests.length} completed tests to update`);

    const sentimentValues = ['positive', 'negative', 'neutral', 'mixed'];
    let updatedCount = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      // Randomly assign sentiment values with some variety
      let sentiment;
      if (i % 4 === 0) sentiment = 'positive';
      else if (i % 4 === 1) sentiment = 'negative';
      else if (i % 4 === 2) sentiment = 'neutral';
      else sentiment = 'mixed';

      // Update the test with new sentiment
      await PromptTest.updateOne(
        { _id: test._id },
        { 
          $set: { 
            'scorecard.sentiment': sentiment,
            'scorecard.sentimentScore': sentiment === 'positive' ? 0.8 : 
                                       sentiment === 'negative' ? -0.7 : 
                                       sentiment === 'mixed' ? 0.1 : 0.0
          } 
        }
      );

      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`✅ Updated ${updatedCount} tests so far...`);
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} tests with varied sentiment values`);

    // Verify the updates
    const sentimentCounts = await PromptTest.aggregate([
      { $match: { status: 'completed' } },
      { $group: { 
          _id: '$scorecard.sentiment', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    console.log('📊 Final sentiment distribution:');
    sentimentCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count} tests`);
    });

  } catch (error) {
    console.error('❌ Error updating sentiment variety:', error);
  } finally {
    mongoose.disconnect();
  }
};

updateSentimentVariety();
