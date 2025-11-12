#!/usr/bin/env node

/**
 * Fix Trailing Punctuation URLs Script
 * 
 * This script specifically targets URLs with trailing punctuation
 * that should be classified as "brand" but are currently "earned".
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PromptTest = require('../src/models/PromptTest');
const AggregatedMetrics = require('../src/models/AggregatedMetrics');

// Improved categorization logic
function categorizeCitation(url, brandName) {
  const urlLower = url.toLowerCase();
  
  // Extract core brand name
  const brandParts = brandName.toLowerCase().split(/\s+/);
  const coreBrandName = brandParts.slice(0, Math.min(2, brandParts.length)).join('').replace(/[^a-z0-9]/g, '');
  
  // Extract domain from URL
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
      domain = match[1].replace(/[)\\].,;!?]+$/, '');
    }
  }
  
  // Check if the domain itself is the brand domain
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
  
  // Everything else is earned media
  return 'earned';
}

async function fixTrailingPunctuationUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    const userId = '68e9892f5e894a9df4c401ce';
    const promptTests = await PromptTest.find({ userId, status: 'completed' });
    console.log(`📊 Found ${promptTests.length} prompt tests to process`);

    let totalFixed = 0;
    let totalProcessed = 0;

    for (const test of promptTests) {
      let testUpdated = false;
      
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(brandMetric => {
          if (brandMetric.citations && Array.isArray(brandMetric.citations)) {
            brandMetric.citations.forEach(citation => {
              // Check if URL has trailing punctuation and is currently "earned"
              if (citation.url.match(/[)\\].,;!?]+$/) && citation.type === 'earned') {
                const newType = categorizeCitation(citation.url, brandMetric.brandName);
                if (newType === 'brand') {
                  console.log(`🔄 ${brandMetric.brandName}: ${citation.url} (${citation.type} → ${newType})`);
                  citation.type = newType;
                  testUpdated = true;
                  totalFixed++;
                }
              }
              totalProcessed++;
            });
          }
        });
      }
      
      if (testUpdated) {
        await test.save();
      }
    }

    console.log('\n═════════════════════════════════════════════════════════════════════════');
    console.log('📊 TRAILING PUNCTUATION FIX COMPLETE');
    console.log('═════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Citations processed: ${totalProcessed}`);
    console.log(`✅ Citations fixed: ${totalFixed}`);
    console.log(`✅ Prompt tests updated: ${promptTests.filter(t => t.isModified()).length}`);

    // Now update aggregated metrics
    console.log('\n🔄 Updating aggregated metrics...');
    const aggregatedMetrics = await AggregatedMetrics.find({ userId });
    
    for (const aggMetric of aggregatedMetrics) {
      if (aggMetric.brandMetrics && Array.isArray(aggMetric.brandMetrics)) {
        aggMetric.brandMetrics.forEach(brandMetric => {
          const brandName = brandMetric.brandName;
          const brandPromptTests = promptTests.filter(pt => 
            pt.brandMetrics && pt.brandMetrics.some(bm => bm.brandName === brandName)
          );
          
          let newBrandCitationsTotal = 0;
          let newEarnedCitationsTotal = 0;
          let newSocialCitationsTotal = 0;

          brandPromptTests.forEach(pt => {
            if (pt.brandMetrics) {
              pt.brandMetrics.forEach(bm => {
                if (bm.brandName === brandName && bm.citationMetrics) {
                  newBrandCitationsTotal += bm.citationMetrics.brandCitations || 0;
                  newEarnedCitationsTotal += bm.citationMetrics.earnedCitations || 0;
                  newSocialCitationsTotal += bm.citationMetrics.socialCitations || 0;
                }
              });
            }
          });

          brandMetric.brandCitationsTotal = newBrandCitationsTotal;
          brandMetric.earnedCitationsTotal = newEarnedCitationsTotal;
          brandMetric.socialCitationsTotal = newSocialCitationsTotal;
          brandMetric.totalCitations = newBrandCitationsTotal + newEarnedCitationsTotal + newSocialCitationsTotal;
        });
        
        await aggMetric.save();
      }
    }

    console.log('✅ Aggregated metrics updated');
    console.log('🎉 Trailing punctuation URL fix completed successfully!');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixTrailingPunctuationUrls();
