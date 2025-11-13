/**
 * Test Citation Filtering
 * Demonstrates how uncertain citations can be ignored
 */

require('dotenv').config();

const CitationServiceV2 = require('../src/services/citationClassificationServiceV2');

console.log('🧪 Testing Citation Filtering (Ignore Uncertain Citations)\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test scenarios with varying confidence levels
const testCases = [
  {
    url: 'https://apollo.io',
    brandName: 'Apollo.io',
    allBrands: [{ name: 'Apollo.io' }],
    description: 'Own brand domain (high confidence)'
  },
  {
    url: 'https://facebook.com',
    brandName: 'Apollo.io',
    allBrands: [{ name: 'Apollo.io' }],
    description: 'Social media (high confidence)'
  },
  {
    url: 'https://techcrunch.com',
    brandName: 'Apollo.io',
    allBrands: [{ name: 'Apollo.io' }],
    description: 'News media (moderate confidence)'
  },
  {
    url: 'https://random-blog-123.xyz',
    brandName: 'Apollo.io',
    allBrands: [{ name: 'Apollo.io' }],
    description: 'Random unknown site (low confidence)'
  },
  {
    url: 'https://bit.ly/test',
    brandName: 'Apollo.io',
    allBrands: [{ name: 'Apollo.io' }],
    description: 'URL shortener (should be flagged)'
  },
  {
    url: 'not-a-valid-url',
    brandName: 'Apollo.io',
    allBrands: [{ name: 'Apollo.io' }],
    description: 'Invalid URL (should be rejected)'
  }
];

let totalTests = 0;
let keptCitations = 0;
let ignoredCitations = 0;

console.log('📊 Classification Results:\n');

for (const testCase of testCases) {
  totalTests++;
  
  // Test with regular classification
  const regularResult = CitationServiceV2.categorizeCitation(
    testCase.url,
    testCase.brandName,
    testCase.allBrands
  );
  
  // Test with filtering (ignores low-confidence)
  const filteredResult = CitationServiceV2.classifyWithFiltering(
    testCase.url,
    testCase.brandName,
    testCase.allBrands
  );
  
  const confidence = regularResult.confidence?.overall || 0;
  const shouldIgnore = CitationServiceV2.shouldIgnoreCitation(regularResult);
  
  console.log(`${totalTests}. ${testCase.description}`);
  console.log(`   URL: ${testCase.url}`);
  console.log(`   Classification: ${regularResult.type || 'unknown'}`);
  console.log(`   Confidence: ${confidence.toFixed(2)}`);
  
  if (shouldIgnore) {
    ignoredCitations++;
    console.log(`   📊 Decision: ❌ IGNORE (confidence too low or uncertain)`);
    console.log(`   Reason: ${regularResult.type === 'unknown' ? 'Unknown type' : `Confidence ${confidence.toFixed(2)} below threshold`}`);
  } else {
    keptCitations++;
    console.log(`   📊 Decision: ✅ KEEP (high confidence)`);
  }
  
  console.log('');
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 FILTERING SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`Total Citations Analyzed: ${totalTests}`);
console.log(`✅ Kept (High Confidence):  ${keptCitations} (${(keptCitations/totalTests*100).toFixed(1)}%)`);
console.log(`❌ Ignored (Low/Uncertain): ${ignoredCitations} (${(ignoredCitations/totalTests*100).toFixed(1)}%)`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ FILTERING PHILOSOPHY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🎯 "Not all citations need to be mapped."');
console.log('   Better to ignore noisy/uncertain citations');
console.log('   than risk misclassification.\n');

console.log('📊 Confidence Thresholds:');
console.log(`   • Brand:  ≥ ${CitationServiceV2.constructor.CONFIDENCE_THRESHOLDS.BRAND} required`);
console.log(`   • Social: ≥ ${CitationServiceV2.constructor.CONFIDENCE_THRESHOLDS.SOCIAL} required`);
console.log(`   • Earned: ≥ ${CitationServiceV2.constructor.CONFIDENCE_THRESHOLDS.EARNED} required`);
console.log(`   • Ignore: < ${CitationServiceV2.constructor.CONFIDENCE_THRESHOLDS.IGNORE_BELOW} (too noisy)`);

console.log('\n💡 Usage Example:');
console.log(`   const result = CitationServiceV2.classifyWithFiltering(...);`);
console.log(`   if (result === null) {`);
console.log(`     // Ignore - too uncertain`);
console.log(`   } else {`);
console.log(`     // Keep - high confidence`);
console.log(`     storeCitation(result);`);
console.log(`   }\n`);

process.exit(0);

