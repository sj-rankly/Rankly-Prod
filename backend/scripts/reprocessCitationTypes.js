#!/usr/bin/env node

/**
 * Citation Type Reprocessing Script
 * 
 * This script reprocesses existing citation data in the database
 * using the fixed citation classification logic to correct
 * misclassified citations (e.g., Trustpilot URLs being marked as "brand").
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PromptTest = require('../src/models/PromptTest');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');

// Import the fixed categorization logic
function categorizeCitation(url, brandName) {
  const urlLower = url.toLowerCase();
  
  // Extract core brand name (e.g., "HDFC Bank" from "HDFC Bank Freedom Credit Card")
  const brandParts = brandName.toLowerCase().split(/\s+/);
  const coreBrandName = brandParts.slice(0, Math.min(2, brandParts.length)).join('').replace(/[^a-z0-9]/g, '');
  
  // Extract domain from URL to check if it's actually the brand's domain
  let domain = '';
  
  // First, clean up any trailing punctuation that might be in the URL
  const cleanUrl = url.replace(/[)\\].,;!?]+$/, '');
  
  try {
    const urlObj = new URL(cleanUrl);
    domain = urlObj.hostname.toLowerCase();
  } catch (e) {
    // If URL parsing fails, fall back to regex matching
    const match = cleanUrl.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([^\/\\)]+)/);
    if (match) {
      domain = match[1].replace(/[)\\].,;!?]+$/, ''); // Clean trailing punctuation from domain
    }
  }
  
  // Check if the domain itself is the brand domain (not just contains it in path)
  const brandDomains = [
    coreBrandName + '.com',
    'www.' + coreBrandName + '.com',
    coreBrandName + '.io',
    'www.' + coreBrandName + '.io',
    coreBrandName + '.ai',
    'www.' + coreBrandName + '.ai',
    coreBrandName + '.in',
    'www.' + coreBrandName + '.in',
    coreBrandName,
    'www.' + coreBrandName
  ];
  
  if (brandDomains.includes(domain)) {
    return 'brand';
  }
  
  // Check if it's social media
  const socialDomains = ['twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com'];
  if (socialDomains.some(socialDomain => domain.includes(socialDomain))) {
    return 'social';
  }
  
  // Everything else is earned media (third-party articles/reviews)
  return 'earned';
}

async function reprocessCitationTypes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    // Models are already imported
    
    console.log('🔍 Fetching all prompt tests...');
    const promptTests = await PromptTest.find({});
    console.log(`📊 Found ${promptTests.length} prompt tests to process`);

    let totalProcessed = 0;
    let totalCitationsProcessed = 0;
    let citationsChanged = 0;
    let brandCount = 0;
    let earnedCount = 0;
    let socialCount = 0;

    for (const promptTest of promptTests) {
      let testChanged = false;
      
      for (const brandMetric of promptTest.brandMetrics) {
        const originalCounts = {
          brand: brandMetric.citationMetrics?.brandCitations || 0,
          earned: brandMetric.citationMetrics?.earnedCitations || 0,
          social: brandMetric.citationMetrics?.socialCitations || 0
        };

        // Reprocess all citations for this brand
        const newCounts = { brand: 0, earned: 0, social: 0 };
        
        if (brandMetric.citations && brandMetric.citations.length > 0) {
          for (const citation of brandMetric.citations) {
            const newType = categorizeCitation(citation.url, brandMetric.brandName);
            
            // Update citation type
            if (citation.type !== newType) {
              console.log(`🔄 ${brandMetric.brandName}: ${citation.url} (${citation.type} → ${newType})`);
              citation.type = newType;
              testChanged = true;
            }
            
            newCounts[newType]++;
            totalCitationsProcessed++;
          }
        }

        // Update citation metrics
        if (brandMetric.citationMetrics) {
          brandMetric.citationMetrics.brandCitations = newCounts.brand;
          brandMetric.citationMetrics.earnedCitations = newCounts.earned;
          brandMetric.citationMetrics.socialCitations = newCounts.social;
          brandMetric.citationMetrics.totalCitations = newCounts.brand + newCounts.earned + newCounts.social;
        }

        // Track changes
        if (originalCounts.brand !== newCounts.brand || 
            originalCounts.earned !== newCounts.earned || 
            originalCounts.social !== newCounts.social) {
          citationsChanged++;
          console.log(`📊 ${brandMetric.brandName} citations updated:`, {
            before: originalCounts,
            after: newCounts
          });
        }

        // Update totals
        brandCount += newCounts.brand;
        earnedCount += newCounts.earned;
        socialCount += newCounts.social;
      }

      // Save the document if any changes were made
      if (testChanged) {
        await promptTest.save();
        totalProcessed++;
      }
    }

    console.log('\n═════════════════════════════════════════════════════════════════════════');
    console.log('📊 REPROCESSING COMPLETE');
    console.log('═════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Prompt tests processed: ${promptTests.length}`);
    console.log(`✅ Prompt tests updated: ${totalProcessed}`);
    console.log(`✅ Total citations processed: ${totalCitationsProcessed}`);
    console.log(`✅ Brand metrics updated: ${citationsChanged}`);
    console.log('');
    console.log('📈 FINAL CITATION TYPE BREAKDOWN:');
    console.log(`   Brand Citations:  ${brandCount} (${((brandCount / (brandCount + earnedCount + socialCount)) * 100).toFixed(1)}%)`);
    console.log(`   Earned Citations: ${earnedCount} (${((earnedCount / (brandCount + earnedCount + socialCount)) * 100).toFixed(1)}%)`);
    console.log(`   Social Citations: ${socialCount} (${((socialCount / (brandCount + earnedCount + socialCount)) * 100).toFixed(1)}%)`);
    console.log('');

    // Now update the aggregated metrics
    console.log('🔄 Updating aggregated metrics...');
    
    // Find and update aggregated metrics
    const aggregatedMetrics = await AggregatedMetrics.find({});
    for (const aggMetric of aggregatedMetrics) {
      if (aggMetric.brandMetrics && aggMetric.brandMetrics.length > 0) {
        for (const brandMetric of aggMetric.brandMetrics) {
          // Find the corresponding prompt test data to get updated citation counts
          const promptTest = promptTests.find(pt => 
            pt.brandMetrics.some(bm => bm.brandName === brandMetric.brandName)
          );
          
          if (promptTest) {
            const updatedBrandMetric = promptTest.brandMetrics.find(bm => 
              bm.brandName === brandMetric.brandName
            );
            
            if (updatedBrandMetric && updatedBrandMetric.citationMetrics) {
              brandMetric.brandCitationsTotal = updatedBrandMetric.citationMetrics.brandCitations;
              brandMetric.earnedCitationsTotal = updatedBrandMetric.citationMetrics.earnedCitations;
              brandMetric.socialCitationsTotal = updatedBrandMetric.citationMetrics.socialCitations;
              brandMetric.totalCitations = updatedBrandMetric.citationMetrics.totalCitations;
            }
          }
        }
        
        await aggMetric.save();
      }
    }
    
    console.log('✅ Aggregated metrics updated');

  } catch (error) {
    console.error('❌ Error during reprocessing:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the reprocessing
if (require.main === module) {
  reprocessCitationTypes()
    .then(() => {
      console.log('🎉 Citation type reprocessing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reprocessing failed:', error);
      process.exit(1);
    });
}

module.exports = { reprocessCitationTypes, categorizeCitation };
