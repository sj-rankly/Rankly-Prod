/**
 * Test Competitor Domain Rejection
 * Verifies that competitor domains are NEVER classified as "brand"
 * Only the target brand's domains should be "brand"
 */

require('dotenv').config();

const citationFacade = require('../src/services/citationClassificationServiceFacade');

console.log('🧪 Testing Competitor Domain Rejection\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test scenario: Analyzing Apollo.io, but citations include competitors
const testScenarios = [
  {
    brandName: 'Apollo.io',
    competitors: ['ZoomInfo', 'Lusha', 'Clay'],
    testCases: [
      {
        url: 'https://apollo.io',
        expectedType: 'brand',
        expectedBrand: 'Apollo.io',
        description: 'Own domain should be "brand"'
      },
      {
        url: 'https://www.apollo.io',
        expectedType: 'brand',
        expectedBrand: 'Apollo.io',
        description: 'Own domain with www should be "brand"'
      },
      {
        url: 'https://blog.apollo.io',
        expectedType: 'brand',
        expectedBrand: 'Apollo.io',
        description: 'Own subdomain should be "brand"'
      },
      {
        url: 'https://zoominfo.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor ZoomInfo should be "earned" NOT "brand"'
      },
      {
        url: 'https://www.zoominfo.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor ZoomInfo with www should be "earned" NOT "brand"'
      },
      {
        url: 'https://lusha.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor Lusha should be "earned" NOT "brand"'
      },
      {
        url: 'https://www.clay.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor Clay should be "earned" NOT "brand"'
      },
      {
        url: 'https://techcrunch.com/article',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Third-party site should be "earned"'
      }
    ]
  },
  {
    brandName: 'ZoomInfo',
    competitors: ['Apollo.io', 'Lusha', 'Clay'],
    testCases: [
      {
        url: 'https://zoominfo.com',
        expectedType: 'brand',
        expectedBrand: 'ZoomInfo',
        description: 'Own domain should be "brand"'
      },
      {
        url: 'https://apollo.io',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor Apollo should be "earned" NOT "brand"'
      },
      {
        url: 'https://lusha.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor Lusha should be "earned" NOT "brand"'
      }
    ]
  },
  {
    brandName: 'Chase',
    competitors: ['American Express', 'Capital One', 'Citibank'],
    testCases: [
      {
        url: 'https://chase.com',
        expectedType: 'brand',
        expectedBrand: 'Chase',
        description: 'Own domain should be "brand"'
      },
      {
        url: 'https://americanexpress.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor American Express should be "earned" NOT "brand"'
      },
      {
        url: 'https://capitalone.com',
        expectedType: 'earned',
        expectedBrand: null,
        description: 'Competitor Capital One should be "earned" NOT "brand"'
      }
    ]
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

// Run all test scenarios
for (const scenario of testScenarios) {
  console.log(`\n📊 Scenario: Analyzing "${scenario.brandName}"`);
  console.log(`   Competitors: ${scenario.competitors.join(', ')}`);
  console.log('   ─────────────────────────────────────────────────────\n');
  
  // Create allBrands array (target brand + competitors)
  const allBrands = [
    { name: scenario.brandName },
    ...scenario.competitors.map(name => ({ name }))
  ];
  
  // Run test cases
  for (const testCase of scenario.testCases) {
    totalTests++;
    
    // Classify
    const result = citationFacade.categorizeCitation(
      testCase.url,
      scenario.brandName,
      allBrands
    );
    
    // Check if result matches expected
    const typeMatches = result.type === testCase.expectedType;
    const brandMatches = result.brand === testCase.expectedBrand;
    const passed = typeMatches && brandMatches;
    
    if (passed) {
      passedTests++;
      console.log(`   ✅ PASS: ${testCase.description}`);
      console.log(`      URL: ${testCase.url}`);
      console.log(`      Expected: type="${testCase.expectedType}", brand="${testCase.expectedBrand || 'null'}"`);
      console.log(`      Got:      type="${result.type}", brand="${result.brand || 'null'}"`);
    } else {
      failedTests++;
      console.log(`   ❌ FAIL: ${testCase.description}`);
      console.log(`      URL: ${testCase.url}`);
      console.log(`      Expected: type="${testCase.expectedType}", brand="${testCase.expectedBrand || 'null'}"`);
      console.log(`      Got:      type="${result.type}", brand="${result.brand || 'null'}"`);
      
      failures.push({
        scenario: scenario.brandName,
        url: testCase.url,
        description: testCase.description,
        expected: { type: testCase.expectedType, brand: testCase.expectedBrand },
        actual: { type: result.type, brand: result.brand }
      });
    }
    console.log('');
  }
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 TEST SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`Total Tests:  ${totalTests}`);
console.log(`✅ Passed:    ${passedTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
console.log(`❌ Failed:    ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);

if (failedTests > 0) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ FAILED TESTS DETAILS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  failures.forEach((failure, index) => {
    console.log(`${index + 1}. ${failure.description}`);
    console.log(`   Scenario: ${failure.scenario}`);
    console.log(`   URL: ${failure.url}`);
    console.log(`   Expected: type="${failure.expected.type}", brand="${failure.expected.brand || 'null'}"`);
    console.log(`   Got:      type="${failure.actual.type}", brand="${failure.actual.brand || 'null'}"`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  SOME TESTS FAILED - Review and fix issues above');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
} else {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL TESTS PASSED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 Competitor domain rejection is working correctly!');
  console.log('   • Own brand domains → "brand" ✅');
  console.log('   • Competitor domains → "earned" (NOT "brand") ✅');
  console.log('   • Third-party sites → "earned" ✅');
  console.log('\n✅ No competitor confusion - citations are properly isolated!\n');
  process.exit(0);
}

