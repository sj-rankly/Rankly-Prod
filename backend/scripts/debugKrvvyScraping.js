/**
 * Debug Krvvy Scraping
 * Deep dive into why Krvvy content isn't being extracted
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const KRVVY_URL = 'https://www.krvvy.com/blogs/wardrobe-wisdom/3-tips-to-choose-the-best-shapewear-for-plus-size';

async function debugKrvvyScraping() {
  console.log('\n🔍 Debugging Krvvy Scraping\n');
  console.log(`URL: ${KRVVY_URL}\n`);
  
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📡 Loading page...');
    await page.goto(KRVVY_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Page loaded\n');
    
    // Take screenshot for debugging
    const screenshotPath = path.join(__dirname, '../krvvy-debug-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshotPath}\n`);
    
    // Analyze the page structure
    const pageAnalysis = await page.evaluate(() => {
      const BLOCK_SELECTOR = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote'].join(', ');
      
      const BLOCKED_ANCESTOR_SELECTOR = [
        'header', 'nav', 'footer', 'aside',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.navbar', '.nav', '.site-header', '.site-footer',
        '[class*="footer"]', '[id*="footer"]',
        '[class*="nav"]', '[id*="nav"]',
        '[class*="header"]', '[id*="header"]',
      ].join(', ');
      
      const allElements = Array.from(document.querySelectorAll(BLOCK_SELECTOR));
      const blockedElements = allElements.filter(el => el.closest(BLOCKED_ANCESTOR_SELECTOR));
      const allowedElements = allElements.filter(el => !el.closest(BLOCKED_ANCESTOR_SELECTOR));
      
      // Get main content container
      const main = document.querySelector('main') || document.querySelector('article') || document.querySelector('[role="main"]');
      const mainElements = main ? Array.from(main.querySelectorAll(BLOCK_SELECTOR)) : [];
      
      // Sample some content
      const sampleContent = allowedElements.slice(0, 10).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.innerText.trim().slice(0, 100),
        parent: el.parentElement?.tagName.toLowerCase(),
        parentClass: el.parentElement?.className,
        inMain: main ? main.contains(el) : false,
      }));
      
      return {
        totalElements: allElements.length,
        blockedElements: blockedElements.length,
        allowedElements: allowedElements.length,
        mainExists: !!main,
        mainTag: main?.tagName.toLowerCase(),
        mainClass: main?.className,
        mainElements: mainElements.length,
        sampleContent,
        title: document.title,
        bodyClasses: document.body.className,
      };
    });
    
    console.log('📊 Page Structure Analysis:');
    console.log(`   Title: ${pageAnalysis.title}`);
    console.log(`   Body Classes: ${pageAnalysis.bodyClasses || 'none'}\n`);
    
    console.log('📐 Element Counts:');
    console.log(`   Total content elements: ${pageAnalysis.totalElements}`);
    console.log(`   Blocked (filtered): ${pageAnalysis.blockedElements} (${((pageAnalysis.blockedElements / pageAnalysis.totalElements) * 100).toFixed(1)}%)`);
    console.log(`   Allowed (extracted): ${pageAnalysis.allowedElements} (${((pageAnalysis.allowedElements / pageAnalysis.totalElements) * 100).toFixed(1)}%)\n`);
    
    console.log('🎯 Main Content Container:');
    console.log(`   Exists: ${pageAnalysis.mainExists ? 'Yes' : 'No'}`);
    if (pageAnalysis.mainExists) {
      console.log(`   Tag: <${pageAnalysis.mainTag}>`);
      console.log(`   Class: ${pageAnalysis.mainClass || 'none'}`);
      console.log(`   Elements inside: ${pageAnalysis.mainElements}\n`);
    } else {
      console.log('   ⚠️  No main/article element found - using body\n');
    }
    
    console.log('📝 Sample Content (first 10 allowed elements):');
    if (pageAnalysis.sampleContent.length > 0) {
      pageAnalysis.sampleContent.forEach((item, i) => {
        const inMainIndicator = item.inMain ? '✓' : '✗';
        console.log(`   ${i + 1}. [${item.tag}] ${inMainIndicator} ${item.text}...`);
        console.log(`      Parent: <${item.parent}> class="${item.parentClass}"`);
      });
    } else {
      console.log('   ⚠️  No content found!');
    }
    
    // Check if content might be in specific elements
    const contentLocations = await page.evaluate(() => {
      const checks = {
        inArticle: !!document.querySelector('article p'),
        inMain: !!document.querySelector('main p'),
        inDiv: !!document.querySelector('div p'),
        inSection: !!document.querySelector('section p'),
        anyP: document.querySelectorAll('p').length,
        anyH: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      };
      
      // Find all wrappers
      const wrappers = Array.from(document.querySelectorAll('[class*="blog"], [class*="post"], [class*="article"], [class*="content"]'))
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          class: el.className,
          hasContent: el.querySelector('p, h1, h2, h3, h4, h5, h6') ? true : false,
        }));
      
      return { ...checks, wrappers };
    });
    
    console.log('\n🔎 Content Location Analysis:');
    console.log(`   <p> tags found: ${contentLocations.anyP}`);
    console.log(`   Heading tags found: ${contentLocations.anyH}`);
    console.log(`   In <article>: ${contentLocations.inArticle ? 'Yes' : 'No'}`);
    console.log(`   In <main>: ${contentLocations.inMain ? 'Yes' : 'No'}`);
    console.log(`   In <section>: ${contentLocations.inSection ? 'Yes' : 'No'}`);
    
    if (contentLocations.wrappers.length > 0) {
      console.log('\n📦 Potential Content Wrappers:');
      contentLocations.wrappers.slice(0, 5).forEach((wrapper, i) => {
        console.log(`   ${i + 1}. <${wrapper.tag}> class="${wrapper.class}" ${wrapper.hasContent ? '✓ Has content' : '✗ Empty'}`);
      });
    }
    
    // Save HTML snapshot for inspection
    const html = await page.content();
    const htmlPath = path.join(__dirname, '../krvvy-debug-snapshot.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`\n💾 HTML saved: ${htmlPath}`);
    console.log(`   Size: ${(html.length / 1024).toFixed(1)}KB\n`);
    
    console.log('✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugKrvvyScraping().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

