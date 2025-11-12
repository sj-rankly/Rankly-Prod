const mongoose = require('mongoose');
const PromptTest = require('../src/models/PromptTest');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');
const UrlAnalysis = require('../src/models/UrlAnalysis');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');

const recalculateSentimentMetrics = async () => {
  try {
    console.log('🔄 Starting sentiment metrics recalculation...');

    // Get all URL analyses
    const analyses = await UrlAnalysis.find({});
    console.log(`📊 Found ${analyses.length} URL analyses`);

    for (const analysis of analyses) {
      console.log(`\n🔄 Processing analysis: ${analysis.url}`);
      
      // Get all completed tests for this analysis
      const tests = await PromptTest.find({ 
        urlAnalysisId: analysis._id, 
        status: 'completed' 
      });
      
      console.log(`📊 Found ${tests.length} completed tests`);

      if (tests.length === 0) {
        console.log('⚠️ No completed tests found, skipping...');
        continue;
      }

      // Group by brand (for now, we'll use a simple approach)
      const brandSentimentCounts = {};
      
      tests.forEach(test => {
        // For now, let's assume Amazon India as the main brand
        const brandName = 'Amazon India';
        
        if (!brandSentimentCounts[brandName]) {
          brandSentimentCounts[brandName] = {
            positive: 0,
            neutral: 0,
            negative: 0,
            mixed: 0,
            total: 0
          };
        }
        
        const sentiment = test.scorecard?.sentiment || 'neutral';
        brandSentimentCounts[brandName][sentiment]++;
        brandSentimentCounts[brandName].total++;
      });

      // Create or update aggregated metrics
      for (const [brandName, counts] of Object.entries(brandSentimentCounts)) {
        console.log(`📊 ${brandName} sentiment counts:`, counts);
        
        // Calculate percentages
        const total = counts.total;
        const sentimentBreakdown = {
          positive: total > 0 ? Math.round((counts.positive / total) * 100) : 0,
          neutral: total > 0 ? Math.round((counts.neutral / total) * 100) : 0,
          negative: total > 0 ? Math.round((counts.negative / total) * 100) : 0,
          mixed: total > 0 ? Math.round((counts.mixed / total) * 100) : 0
        };
        
        console.log(`📊 ${brandName} sentiment percentages:`, sentimentBreakdown);

        // Create aggregated metrics document
        const aggregatedMetric = new AggregatedMetrics({
          userId: analysis.userId,
          urlAnalysisId: analysis._id,
          brandName: brandName,
          brandId: new mongoose.Types.ObjectId(),
          
          // Visibility metrics
          visibilityScore: 75, // Placeholder
          visibilityRank: 1,
          
          // Sentiment metrics
          sentimentScore: 0.1, // Placeholder
          sentimentBreakdown: sentimentBreakdown,
          
          // Citation metrics
          citationShare: 45, // Placeholder
          citationShareRank: 1,
          brandCitationsTotal: 10,
          earnedCitationsTotal: 5,
          socialCitationsTotal: 2,
          totalCitations: 17,
          
          // Ranking metrics
          totalBrands: 5,
          totalResponses: tests.length,
          totalAppearances: counts.total,
          rank1st: counts.positive,
          rank2nd: counts.neutral,
          rank3rd: counts.negative,
          
          // Date range
          dateFrom: new Date(),
          dateTo: new Date(),
          scope: 'analysis'
        });

        await aggregatedMetric.save();
        console.log(`✅ Created aggregated metrics for ${brandName}`);
      }
    }

    console.log('\n🎉 Sentiment metrics recalculation completed!');

  } catch (error) {
    console.error('❌ Error recalculating sentiment metrics:', error);
  } finally {
    mongoose.disconnect();
  }
};

recalculateSentimentMetrics();
