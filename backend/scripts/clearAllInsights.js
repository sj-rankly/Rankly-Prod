#!/usr/bin/env node

/**
 * Script to clear ALL cached performance insights from MongoDB
 * This directly connects to MongoDB and deletes all insights records
 * 
 * Usage:
 *   node backend/scripts/clearAllInsights.js [userId]
 * 
 * If userId is provided, only clears insights for that user
 * If userId is not provided, clears ALL insights for ALL users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Insights = require('../src/models/Insights');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}\n`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearAllInsights(userId = null) {
  try {
    await connectDB();

    const query = userId ? { userId: userId } : {};
    const queryDesc = userId ? `for user ${userId}` : 'for ALL users';

    console.log(`🗑️  Clearing all insights ${queryDesc}...`);
    console.log(`📋 Query:`, query);
    console.log('');

    // Get count before deletion
    const countBefore = await Insights.countDocuments(query);
    console.log(`📊 Found ${countBefore} insights to delete`);

    if (countBefore === 0) {
      console.log('ℹ️  No insights found. Nothing to clear.');
      await mongoose.disconnect();
      return { deletedCount: 0 };
    }

    // Delete all insights
    const result = await Insights.deleteMany(query);

    console.log(`✅ Successfully deleted ${result.deletedCount} insights`);
    
    // Show breakdown by tab type
    if (result.deletedCount > 0) {
      console.log('\n📊 Verifying deletion...');
      const countAfter = await Insights.countDocuments(query);
      console.log(`✅ Remaining insights: ${countAfter}`);
    }

    await mongoose.disconnect();
    console.log('\n🏁 Disconnected from MongoDB');
    
    return {
      deletedCount: result.deletedCount,
      userId: userId || 'all users'
    };

  } catch (error) {
    console.error('❌ Error clearing insights:', error);
    await mongoose.disconnect();
    throw error;
  }
}

async function showInsightsCount() {
  try {
    await connectDB();

    console.log('📊 Current Insights Count:\n');
    
    // Total count
    const totalCount = await Insights.countDocuments({});
    console.log(`   Total insights: ${totalCount}`);

    if (totalCount > 0) {
      // Count by tab type
      const tabTypes = ['visibility', 'prompts', 'sentiment', 'citations'];
      console.log('\n   Breakdown by tab type:');
      for (const tabType of tabTypes) {
        const count = await Insights.countDocuments({ tabType });
        console.log(`   - ${tabType}: ${count}`);
      }

      // Count by user (top 10)
      console.log('\n   Top users by insights count:');
      const userCounts = await Insights.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      userCounts.forEach((item, idx) => {
        console.log(`   ${idx + 1}. User ${item._id}: ${item.count} insights`);
      });
    }

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error getting insights count:', error);
    await mongoose.disconnect();
  }
}

async function main() {
  const userId = process.argv[2]; // Optional user ID from command line
  const showCount = process.argv.includes('--count') || process.argv.includes('-c');

  try {
    if (showCount) {
      await showInsightsCount();
      return;
    }

    if (userId) {
      console.log(`🧹 Clearing insights for user: ${userId}\n`);
    } else {
      console.log('🧹 Clearing ALL insights for ALL users\n');
      console.log('⚠️  WARNING: This will delete insights for all users!');
      console.log('   To clear for a specific user, run: node backend/scripts/clearAllInsights.js <userId>\n');
    }

    const result = await clearAllInsights(userId);
    
    console.log('\n✨ Done!');
    console.log(`📊 Deleted ${result.deletedCount} insights ${userId ? `for user ${userId}` : 'for all users'}`);
    console.log('🔄 Next time you visit any tab, fresh insights will be generated with updated prompts.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { clearAllInsights, showInsightsCount };








