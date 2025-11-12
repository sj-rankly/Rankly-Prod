/**
 * Add isOwner Flag Script
 * 
 * This script adds the missing `isOwner` field to all brandMetrics in PromptTest records.
 * 
 * Usage: node src/scripts/addIsOwnerFlag.js [userId]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');
const User = require('../models/User');

async function addIsOwnerFlag(userId = null) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 ADD ISOWNER FLAG SCRIPT');
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

    let totalUpdated = 0;
    let totalTests = 0;

    for (const user of users) {
      console.log('\n' + '-'.repeat(80));
      console.log(`👤 User: ${user.email} (${user._id})`);
      console.log('-'.repeat(80));

      // Get user's brand name from latest URL analysis
      const analysis = await UrlAnalysis.findOne({ userId: user._id })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();

      if (!analysis || !analysis.brandContext || !analysis.brandContext.companyName) {
        console.log(`⚠️  No brand name found for user, skipping...`);
        continue;
      }

      const brandName = analysis.brandContext.companyName;
      console.log(`🏢 User's brand: ${brandName}`);

      // Find all prompt tests for this user
      const promptTests = await PromptTest.find({ userId: user._id }).lean();
      console.log(`📊 Found ${promptTests.length} prompt tests`);

      let userUpdated = 0;

      for (const test of promptTests) {
        let needsUpdate = false;
        const updatedBrandMetrics = (test.brandMetrics || []).map(bm => {
          // Check if isOwner field is missing or incorrect
          const isOwner = bm.brandName && brandName && 
                         bm.brandName.trim().toLowerCase() === brandName.trim().toLowerCase();
          
          if (!bm.hasOwnProperty('isOwner') || bm.isOwner !== isOwner) {
            needsUpdate = true;
            return { ...bm, isOwner };
          }
          return bm;
        });

        if (needsUpdate) {
          await PromptTest.updateOne(
            { _id: test._id },
            { $set: { brandMetrics: updatedBrandMetrics } }
          );
          userUpdated++;
        }
      }

      console.log(`✅ Updated ${userUpdated}/${promptTests.length} prompt tests`);
      totalUpdated += userUpdated;
      totalTests += promptTests.length;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ UPDATE COMPLETE`);
    console.log(`   Total users processed: ${users.length}`);
    console.log(`   Total prompt tests checked: ${totalTests}`);
    console.log(`   Total prompt tests updated: ${totalUpdated}`);
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
addIsOwnerFlag(userId);















