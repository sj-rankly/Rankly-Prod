/**
 * Test Page Scraping
 * Tests the scraping functionality with specific URLs
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const websiteAnalysisService = require('../src/services/websiteAnalysisService');

const TEST_URLS = [
  {
    name: 'Krvvy Shapewear Blog',
    url: 'https://www.krvvy.com/blogs/wardrobe-wisdom/3-tips-to-choose-the-best-shapewear-for-plus-size',
    expectedContent: ['shapewear', 'plus-size', 'tips'],
  },
  {
    name: 'Fibr.ai Homepage',
    url: 'https://fibr.ai',
    expectedContent: ['personalization', 'landing', 'page'],
  },
  {
    name: 'Example.com (Fallback)',
    url: 'https://example.com',
    expectedContent: ['example', 'domain'],
  }
];

async function testUrlScraping(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log(`🔗 URL: ${testCase.url}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const startTime = Date.now();
    
    console.log('📡 Attempting to scrape...');
    const result = await websiteAnalysisService.scrapeWebsite(testCase.url);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Scraping successful! (${duration}s)\n`);
    
    // Check results
    console.log('📊 Scrape Results:');
    console.log(`   Title: ${result.title || 'N/A'}`);
    console.log(`   Description: ${(result.description || 'N/A').slice(0, 100)}...`);
    console.log(`   Content Blocks: ${result.contentBlocks?.length || 0}`);
    console.log(`   Paragraphs: ${result.paragraphs?.length || 0}`);
    console.log(`   Headings: ${result.headings?.length || 0}`);
    console.log(`   HTML Snapshot: ${result.htmlSnapshot ? `${(result.htmlSnapshot.length / 1024).toFixed(1)}KB` : 'N/A'}`);
    
    // Check for expected content
    if (testCase.expectedContent?.length > 0) {
      console.log('\n🔍 Content Validation:');
      const allText = (result.contentBlocks || [])
        .map(block => block.text)
        .join(' ')
        .toLowerCase();
      
      testCase.expectedContent.forEach(keyword => {
        const found = allText.includes(keyword.toLowerCase());
        console.log(`   ${found ? '✅' : '❌'} "${keyword}": ${found ? 'Found' : 'Not found'}`);
      });
    }
    
    // Sample content
    if (result.contentBlocks?.length > 0) {
      console.log('\n📝 Sample Content (first 3 blocks):');
      result.contentBlocks.slice(0, 3).forEach((block, i) => {
        console.log(`   ${i + 1}. [${block.type}] ${block.text.slice(0, 80)}...`);
      });
    }
    
    // Check for filtered elements
    if (Array.isArray(result.headings) && result.headings.some(h => h.toLowerCase().includes('nav'))) {
      console.log('\n⚠️  Warning: Navigation elements may not be filtered properly');
    }
    
    // Debug: Check if we got content
    if (!result.contentBlocks || result.contentBlocks.length === 0) {
      console.log('\n⚠️  WARNING: No content blocks extracted!');
      console.log('   This could indicate:');
      console.log('   - Content is heavily filtered (in nav/header/footer)');
      console.log('   - Content is dynamically loaded (JavaScript required)');
      console.log('   - Site structure is unusual');
      console.log(`   HTML Snapshot size: ${result.htmlSnapshot ? `${(result.htmlSnapshot.length / 1024).toFixed(1)}KB` : '0KB'}`);
    }
    
    return { success: true, result, duration };
    
  } catch (error) {
    console.error(`❌ Scraping failed: ${error.message}\n`);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
    
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n🚀 Starting Page Scraping Tests\n');
  console.log(`Testing ${TEST_URLS.length} URLs...\n`);
  
  const results = [];
  
  for (const testCase of TEST_URLS) {
    const result = await testUrlScraping(testCase);
    results.push({
      name: testCase.name,
      url: testCase.url,
      ...result,
    });
    
    // Wait a bit between requests to avoid rate limiting
    if (TEST_URLS.indexOf(testCase) < TEST_URLS.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%\n`);
  
  // Detailed results
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}s)` : '';
    console.log(`${status} ${result.name}${duration}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});

