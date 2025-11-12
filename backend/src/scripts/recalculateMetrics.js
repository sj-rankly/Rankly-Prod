/**
 * Recalculate Metrics Script
 *
 * This script recalculates ALL aggregated metrics using the new deterministic
 * extraction method. This ensures all metrics are accurate and consistent.
 *
 * Usage: node src/scripts/recalculateMetrics.js [userId]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const metricsAggregation = require('../services/metricsAggregationService');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const User = require('../models/User');
const PromptTest = require('../models/PromptTest');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const UrlAnalysis = require('../models/UrlAnalysis');

async function recalculateMetrics(userId = null) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 METRICS RECALCULATION SCRIPT');
    console.log('='.repeat(80) + '\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get users to process
    let users = [];
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ User ${userId} not found`);
        process.exit(1);
      }
      users = [user];
      console.log(`📊 Processing single user: ${user.email}\n`);
    } else {
      users = await User.find({});
      console.log(`📊 Processing ${users.length} users\n`);
    }

    let totalRecalculated = 0;

    for (const user of users) {
      console.log('\n' + '-'.repeat(80));
      console.log(`👤 User: ${user.email} (${user._id})`);
      console.log('-'.repeat(80));

      // Delete existing aggregated metrics for this user
      const deleteResult = await AggregatedMetrics.deleteMany({ userId: user._id.toString() });
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing metrics records`);

      // Recalculate all metrics
      try {
        const result = await metricsAggregation.calculateMetrics(user._id.toString(), {
          forceRefresh: true
        });

        if (result.success) {
          console.log(`✅ Recalculated ${result.totalCalculations} metric sets`);
          console.log(`   - Overall: ${result.results?.overall ? 'Yes' : 'No'}`);
          console.log(`   - Platforms: ${result.results?.platform?.length || 0}`);
          console.log(`   - Topics: ${result.results?.topic?.length || 0}`);
          console.log(`   - Personas: ${result.results?.persona?.length || 0}`);
          totalRecalculated += result.totalCalculations;
        } else {
          console.log(`⚠️  ${result.message}`);
        }
      } catch (error) {
        console.error(`❌ Error recalculating for user ${user.email}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ RECALCULATION COMPLETE`);
    console.log(`   Total users processed: ${users.length}`);
    console.log(`   Total metrics recalculated: ${totalRecalculated}`);
    console.log('='.repeat(80) + '\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args[0] || null;

// Run the script
recalculateMetrics(userId);
