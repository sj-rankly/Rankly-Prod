#!/usr/bin/env node

/**
 * Recalculate Visibility Score for All Aggregated Metrics
 * 
 * This script adds the visibilityScore and visibilityRank fields to all existing
 * aggregatedmetrics documents in the database.
 * 
 * Usage:
 *   node scripts/recalculateVisibilityScore.js
 * 
 * What it does:
 * 1. Fetches all aggregatedmetrics documents
 * 2. Calculates visibilityScore for each brand: (totalAppearances / totalPrompts) × 100
 * 3. Assigns rankings based on visibility score (highest = rank 1)
 * 4. Updates the documents in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Calculate visibility score and rank for brand metrics
 */
function calculateVisibilityMetrics(brandMetrics, totalPrompts) {
  // Calculate visibility score for each brand
  brandMetrics.forEach(brand => {
    brand.visibilityScore = totalPrompts > 0
      ? parseFloat(((brand.totalAppearances / totalPrompts) * 100).toFixed(2))
      : 0;
  });

  // Sort by visibility score (highest first) and assign ranks
  const sorted = [...brandMetrics].sort((a, b) => b.visibilityScore - a.visibilityScore);
  
  sorted.forEach((brand, index) => {
    const originalBrand = brandMetrics.find(b => b.brandId === brand.brandId);
    if (originalBrand) {
      originalBrand.visibilityRank = index + 1;
    }
  });

  return brandMetrics;
}

/**
 * Main recalculation function
 */
async function recalculateAllMetrics() {
  try {
    console.log('\n🔄 Starting visibility score recalculation...\n');

    // Fetch all aggregated metrics documents
    const allMetrics = await AggregatedMetrics.find({}).lean();
    
    if (allMetrics.length === 0) {
      console.log('⚠️  No aggregated metrics found in database');
      return;
    }

    console.log(`📊 Found ${allMetrics.length} aggregated metrics documents\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each document
    for (const metric of allMetrics) {
      try {
        const { _id, scope, scopeValue, brandMetrics, totalPrompts } = metric;
        
        console.log(`Processing: ${scope} - ${scopeValue || 'all'}`);

        // Check if visibility score already exists
        const hasVisibilityScore = brandMetrics.every(b => b.visibilityScore !== undefined);
        if (hasVisibilityScore) {
          console.log(`  ⏭️  Skipped (already has visibility score)\n`);
          skippedCount++;
          continue;
        }

        // Calculate visibility metrics
        const updatedBrandMetrics = calculateVisibilityMetrics([...brandMetrics], totalPrompts);

        // Display calculated values
        console.log(`  📈 Calculated visibility scores:`);
        updatedBrandMetrics.forEach(brand => {
          console.log(`     ${brand.brandName}: ${brand.visibilityScore}% (Rank #${brand.visibilityRank})`);
        });

        // Update the document
        await AggregatedMetrics.findByIdAndUpdate(
          _id,
          { $set: { brandMetrics: updatedBrandMetrics } },
          { new: true }
        );

        console.log(`  ✅ Updated successfully\n`);
        updatedCount++;

      } catch (error) {
        console.error(`  ❌ Error processing ${metric.scope} - ${metric.scopeValue}:`, error.message);
        console.log('');
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RECALCULATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total documents: ${allMetrics.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (updatedCount > 0) {
      console.log('✨ Visibility scores have been recalculated successfully!');
      console.log('\nNext steps:');
      console.log('  1. Verify the data in MongoDB');
      console.log('  2. Test the dashboard API endpoints');
      console.log('  3. Check frontend displays visibility scores correctly\n');
    }

  } catch (error) {
    console.error('❌ Fatal error during recalculation:', error);
    throw error;
  }
}

/**
 * Verify the recalculation
 */
async function verifyRecalculation() {
  console.log('🔍 Verifying recalculation...\n');

  const sample = await AggregatedMetrics.findOne({ scope: 'overall' }).lean();
  
  if (!sample) {
    console.log('⚠️  No overall metrics found for verification');
    return;
  }

  console.log('Sample verification (overall metrics):');
  console.log('─'.repeat(60));
  
  sample.brandMetrics.forEach(brand => {
    const expectedVisibility = sample.totalPrompts > 0
      ? (brand.totalAppearances / sample.totalPrompts) * 100
      : 0;
    
    const actual = brand.visibilityScore;
    const match = Math.abs(expectedVisibility - actual) < 0.01 ? '✅' : '❌';
    
    console.log(`${match} ${brand.brandName}:`);
    console.log(`   Visibility: ${actual}% (expected: ${expectedVisibility.toFixed(2)}%)`);
    console.log(`   Rank: #${brand.visibilityRank}`);
    console.log(`   Appearances: ${brand.totalAppearances} / ${sample.totalPrompts} prompts`);
  });
  
  console.log('─'.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VISIBILITY SCORE RECALCULATION SCRIPT');
  console.log('='.repeat(60) + '\n');

  try {
    // Connect to database
    await connectDB();

    // Run recalculation
    await recalculateAllMetrics();

    // Verify results
    await verifyRecalculation();

    console.log('✅ Script completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Script interrupted by user');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { recalculateAllMetrics, calculateVisibilityMetrics };

