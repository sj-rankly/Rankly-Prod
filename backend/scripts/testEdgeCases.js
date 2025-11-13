/**
 * Test Edge Cases and Potential Issues
 * Comprehensive test for unusual scenarios
 */

require('dotenv').config();
process.env.USE_V2_CITATION_CLASSIFICATION = 'true';

const citationFacade = require('../src/services/citationClassificationServiceFacade');
const CitationServiceV2 = require('../src/services/citationClassificationServiceV2');

console.log('🧪 Testing Edge Cases and Potential Issues\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(description, testFn) {
  try {
    const result = testFn();
    if (result.pass) {
      passed++;
      console.log(`✅ PASS: ${description}`);
      if (result.details) console.log(`   ${result.details}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${description}`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Got: ${result.got}`);
    }
  } catch (error) {
    failed++;
    console.log(`❌ ERROR: ${description}`);
    console.log(`   ${error.message}`);
  }
  console.log('');
}

console.log('📊 EDGE CASE TESTS:\n');

// Test 1: Multi-word brand names
test('Multi-word brand: "American Express"', () => {
  const result = citationFacade.categorizeCitation(
    'https://americanexpress.com',
    'American Express',
    [{ name: 'American Express' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'American Express',
    expected: 'brand: American Express',
    got: `${result.type}: ${result.brand}`,
    details: `Confidence: ${result.confidence?.overall || 0}`
  };
});

// Test 2: Brand with special characters
test('Brand with hyphen: "Coca-Cola"', () => {
  const result = citationFacade.categorizeCitation(
    'https://coca-cola.com',
    'Coca-Cola',
    [{ name: 'Coca-Cola' }]
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `Brand: ${result.brand}, Confidence: ${result.confidence?.overall || 0}`
  };
});

// Test 3: Very short brand name
test('Short brand name: "HP"', () => {
  const result = citationFacade.categorizeCitation(
    'https://hp.com',
    'HP',
    [{ name: 'HP' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'HP',
    expected: 'brand: HP',
    got: `${result.type}: ${result.brand}`,
    details: `Confidence: ${result.confidence?.overall || 0}`
  };
});

// Test 4: Brand with numbers
test('Brand with numbers: "3M"', () => {
  const result = citationFacade.categorizeCitation(
    'https://3m.com',
    '3M',
    [{ name: '3M' }]
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `Brand: ${result.brand}, Confidence: ${result.confidence?.overall || 0}`
  };
});

// Test 5: International TLD (.co.uk)
test('International TLD: .co.uk', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.co.uk',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Chase',
    expected: 'brand: Chase',
    got: `${result.type}: ${result.brand}`,
    details: `Confidence: ${result.confidence?.overall || 0}`
  };
});

// Test 6: Subdomain with path
test('Subdomain with path: blog.brand.com/article', () => {
  const result = citationFacade.categorizeCitation(
    'https://blog.chase.com/article/test',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Chase',
    expected: 'brand: Chase',
    got: `${result.type}: ${result.brand}`,
    details: `Should recognize blog.chase.com as brand`
  };
});

// Test 7: Case sensitivity
test('Case insensitive: APOLLO.IO vs apollo.io', () => {
  const result = citationFacade.categorizeCitation(
    'https://APOLLO.IO',
    'Apollo.io',
    [{ name: 'Apollo.io' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Apollo.io',
    expected: 'brand: Apollo.io',
    got: `${result.type}: ${result.brand}`,
    details: `Should be case-insensitive`
  };
});

// Test 8: Query parameters
test('URL with query params: ?utm_source=test', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com?utm_source=test&utm_medium=social',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Chase',
    expected: 'brand: Chase',
    got: `${result.type}: ${result.brand}`,
    details: `Query params should be ignored`
  };
});

// Test 9: URL with fragment
test('URL with fragment: #section', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com#about',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Chase',
    expected: 'brand: Chase',
    got: `${result.type}: ${result.brand}`,
    details: `Fragment should be ignored`
  };
});

// Test 10: Empty/null parameters
test('Null brandName handling', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com',
    null,
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type !== 'brand', // Should not classify as brand without targetBrandName
    expected: 'not brand (no target)',
    got: result.type,
    details: `Without targetBrandName, should not classify as specific brand`
  };
});

// Test 11: Empty allBrands array
test('Empty allBrands array', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com',
    'Chase',
    []
  );
  return {
    pass: result.type !== 'brand', // Should not classify as brand without brands list
    expected: 'not brand (no brands)',
    got: result.type,
    details: `Without brands, should not classify as brand`
  };
});

// Test 12: Competitor with similar name
test('Similar brand names: "Capital" vs "Capital One"', () => {
  const result = citationFacade.categorizeCitation(
    'https://capitalone.com',
    'Capital',
    [
      { name: 'Capital' },
      { name: 'Capital One' }
    ]
  );
  // This should match Capital One as competitor and reject it if analyzing "Capital"
  return {
    pass: result.type === 'earned', // Should be earned, not brand
    expected: 'earned (competitor)',
    got: result.type,
    details: `Capital One should not match "Capital" as brand`
  };
});

// Test 13: Brand name with .com in it
test('Brand name is "Monday.com"', () => {
  const result = citationFacade.categorizeCitation(
    'https://monday.com',
    'Monday.com',
    [{ name: 'Monday.com' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Monday.com',
    expected: 'brand: Monday.com',
    got: `${result.type}: ${result.brand}`,
    details: `Should handle TLD in brand name`
  };
});

// Test 14: Brand name is "Notion.so"
test('Brand name is "Notion.so"', () => {
  const result = citationFacade.categorizeCitation(
    'https://notion.so',
    'Notion.so',
    [{ name: 'Notion.so' }]
  );
  return {
    pass: result.type === 'brand' && result.brand === 'Notion.so',
    expected: 'brand: Notion.so',
    got: `${result.type}: ${result.brand}`,
    details: `Should handle .so TLD in brand name`
  };
});

// Test 15: Very long domain
test('Very long domain name', () => {
  const result = citationFacade.categorizeCitation(
    'https://this-is-a-very-long-domain-name-for-testing-purposes.com',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'earned', // Should not match Chase
    expected: 'earned',
    got: result.type,
    details: `Long domain should not falsely match`
  };
});

// Test 16: IP address instead of domain
test('IP address: 192.168.1.1', () => {
  const result = citationFacade.categorizeCitation(
    'https://192.168.1.1',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'unknown', // Should reject IP
    expected: 'unknown/invalid',
    got: result.type,
    details: `IP addresses should be rejected`
  };
});

// Test 17: Localhost
test('Localhost domain', () => {
  const result = citationFacade.categorizeCitation(
    'https://localhost:3000',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'unknown', // Should reject localhost
    expected: 'unknown/invalid',
    got: result.type,
    details: `Localhost should be rejected`
  };
});

// Test 18: Brand with apostrophe
test('Brand with apostrophe: "McDonald\'s"', () => {
  const result = citationFacade.categorizeCitation(
    'https://mcdonalds.com',
    "McDonald's",
    [{ name: "McDonald's" }]
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `Should handle apostrophe in brand name`
  };
});

// Test 19: Multiple competitors with one matching
test('Multiple competitors, one matching domain', () => {
  const result = citationFacade.categorizeCitation(
    'https://zoominfo.com',
    'Apollo.io',
    [
      { name: 'Apollo.io' },
      { name: 'ZoomInfo' },
      { name: 'Lusha' },
      { name: 'Clay' }
    ]
  );
  return {
    pass: result.type === 'earned', // ZoomInfo is competitor, should be earned
    expected: 'earned (competitor)',
    got: result.type,
    details: `ZoomInfo should be classified as earned for Apollo.io`
  };
});

// Test 20: Social media subdomain
test('Social media subdomain: m.facebook.com', () => {
  const result = citationFacade.categorizeCitation(
    'https://m.facebook.com/page',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'social',
    expected: 'social',
    got: result.type,
    details: `Mobile Facebook should be recognized as social`
  };
});

// Test 21: Confidence filtering
test('Confidence filtering for uncertain citation', () => {
  const result = CitationServiceV2.classifyWithFiltering(
    'https://random-unknown-site-xyz123.com',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result === null, // Should be filtered out
    expected: 'null (filtered)',
    got: result === null ? 'null' : 'result',
    details: `Uncertain citations should be filtered`
  };
});

// Test 22: Protocol variations (http vs https)
test('HTTP vs HTTPS: http://chase.com', () => {
  const result = citationFacade.categorizeCitation(
    'http://chase.com',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `HTTP should work same as HTTPS`
  };
});

// Test 23: Trailing slash
test('Trailing slash: https://chase.com/', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com/',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `Trailing slash should be handled`
  };
});

// Test 24: Port number in URL
test('Port number: https://chase.com:443', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com:443',
    'Chase',
    [{ name: 'Chase' }]
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `Port should be ignored`
  };
});

// Test 25: Brand array with string instead of object
test('Brand array with strings: ["Chase", "Amex"]', () => {
  const result = citationFacade.categorizeCitation(
    'https://chase.com',
    'Chase',
    ['Chase', 'American Express'] // Strings instead of objects
  );
  return {
    pass: result.type === 'brand',
    expected: 'brand',
    got: result.type,
    details: `Should handle string array format`
  };
});

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 EDGE CASE TEST SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const total = passed + failed;
console.log(`Total Tests:  ${total}`);
console.log(`✅ Passed:    ${passed} (${(passed/total*100).toFixed(1)}%)`);
console.log(`❌ Failed:    ${failed} (${(failed/total*100).toFixed(1)}%)`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed === 0) {
  console.log('✅ ALL EDGE CASE TESTS PASSED!');
  console.log('\n🎉 No issues found - system is robust!\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME EDGE CASES FAILED');
  console.log('\n🔍 Review failed tests above for potential issues.\n');
  process.exit(1);
}

