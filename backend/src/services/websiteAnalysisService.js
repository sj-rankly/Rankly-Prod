const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { SYSTEM_PROMPTS, ANALYSIS_TEMPLATES } = require('../config/aiPrompts');
// Removed hyperparameters config dependency
const UrlAnalysisHelper = require('../utils/urlAnalysisHelper');
const ProductDataExtractor = require('../utils/productDataExtractor');

class WebsiteAnalysisService {
  constructor() {
    // Ensure dotenv is loaded
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    // Simple validation
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    console.log('🔑 OpenRouter API Key loaded:', this.openRouterApiKey ? 'YES' : 'NO');
  }

  // Main analysis function - Now context-aware!
  async analyzeWebsite(url) {
    try {
      // Basic URL validation
      this.validateUrl(url);
      
      console.log(`🔍 Starting website analysis for: ${url}`);
      
      // Step 1: Detect analysis level (product/category/company)
      const urlContext = UrlAnalysisHelper.getAnalysisContext(url);
      console.log(`📊 Analysis Level: ${urlContext.analysisLevel.toUpperCase()}`);
      
      // Step 2: Scrape website content
      const websiteData = await this.scrapeWebsite(url);
      
      // Step 3: Extract context-specific data
      let contextData = null;
      if (urlContext.analysisLevel === 'product') {
        contextData = ProductDataExtractor.extractProductData(websiteData, urlContext);
      } else if (urlContext.analysisLevel === 'category') {
        contextData = ProductDataExtractor.extractCategoryData(websiteData, urlContext);
      }
      
      // Step 4: Perform context-aware AI analysis
      const analysisResults = await this.performAIAnalysis(
        websiteData, 
        url, 
        urlContext.analysisLevel,
        contextData
      );
      
      // Step 5: Add analysis metadata
      analysisResults.analysisLevel = urlContext.analysisLevel;
      analysisResults.urlContext = urlContext;
      if (contextData) {
        analysisResults.contextData = contextData;
      }
      
      console.log('✅ Website analysis completed successfully');
      return analysisResults;
      
    } catch (error) {
      console.error('❌ Website analysis failed:', error.message);
      throw new Error(`Website analysis failed: ${error.message}`);
    }
  }

  // Simple URL validation
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }
    
    // Check for basic security
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }
  }

  // Scrape website content using Puppeteer
  async scrapeWebsite(url) {
    console.log(`📄 Scraping website: ${url}`);
    
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the website with more lenient wait condition
      await page.goto(url, {
        waitUntil: 'domcontentloaded',  // Changed from 'networkidle2' to 'domcontentloaded'
        timeout: 30000  // Reduced timeout to 30 seconds (was 60s)
      });

      // Minimal wait for dynamic content to load (reduced from 2s to 500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Extract website data
      const websiteData = await page.evaluate(() => {
        // Helper function to safely get text content
        const getTextContent = (element) => {
          return element ? element.innerText.trim() : '';
        };
        
        // Helper function to get meta content
        const getMetaContent = (name) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta ? meta.content : '';
        };
        
        const BLOCK_SELECTOR = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'li', 'blockquote'
        ].join(', ');

        const BLOCKED_ANCESTOR_SELECTOR = [
          'header',
          'nav',
          'footer',
          'aside',
          '[role="navigation"]',
          '.navbar',
          '.nav',
          '.top-nav',
          '.sidebar',
          '.site-header',
          '.site-footer',
          '.breadcrumb',
          '.breadcrumbs',
          '[class*="footer"]',
          '[id*="footer"]',
          '[class*="nav"]',
          '[id*="nav"]',
          '[class*="menu"]',
          '[id*="menu"]',
        ].join(', ');

        const getContentRoot = () => {
          return (
            document.querySelector('article') ||
            document.querySelector('main') ||
            document.querySelector('[role="main"]') ||
            document.body
          );
        };

        const shouldSkipElement = (element) => {
          if (!element) {
            return true;
          }
          if (element.closest(BLOCKED_ANCESTOR_SELECTOR)) {
            return true;
          }
          return false;
        };

        const hasMeaningfulText = (text, tag = '') => {
          if (!text) {
            return false;
          }
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          const length = text.length;
          const containsPunctuation = /[.?!]/.test(text);

          if (tag.startsWith('h')) {
            if (wordCount < 2) return false;
            if (length < 8) return false;
            return true;
          }

          if (tag === 'li' || tag === 'p' || tag === 'blockquote') {
            if (wordCount >= 4) return true;
            if (length >= 30) return true;
            if (containsPunctuation) return true;
            return false;
          }

          return wordCount > 1 && length >= 6;
        };

        const buildContentBlocks = () => {
          const container = getContentRoot();
          if (!container) {
            return [];
          }

          const elements = Array.from(container.querySelectorAll(BLOCK_SELECTOR));

          return elements
            .map((element) => {
              if (shouldSkipElement(element)) {
                return null;
              }

              const text = element.innerText.trim().replace(/\s+/g, ' ');
              if (!text) {
                return null;
              }
              if (!hasMeaningfulText(text, tag)) {
                return null;
              }

              const tag = element.tagName.toLowerCase();

              let listType = null;
              if (tag === 'li') {
                const parentTag = element.parentElement?.tagName.toLowerCase();
                if (parentTag === 'ol') {
                  listType = 'ordered';
                } else if (parentTag === 'ul') {
                  listType = 'unordered';
                }
              }

              return {
                type: tag,
                text,
                listType,
              };
            })
            .filter(Boolean);
        };

        const collectParagraphs = () => {
          const container = getContentRoot();
          if (!container) {
            return [];
          }

          return Array.from(container.querySelectorAll('p'))
            .filter((p) => !shouldSkipElement(p))
            .map(p => p.innerText.trim())
            .filter((text) => hasMeaningfulText(text, 'p'));
        };

        return {
          // Basic page info
          title: document.title,
          url: window.location.href,
          description: getMetaContent('description'),
          keywords: getMetaContent('keywords'),
          
          // Content analysis
          headings: {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim())
          },
          
          // Main content ordered blocks
          contentBlocks: buildContentBlocks(),
          paragraphs: collectParagraphs(),
          
          // Navigation
          navigation: Array.from(document.querySelectorAll('nav a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href
          })),
          
          // Contact info
          contactInfo: { emails: Array.from(document.querySelectorAll('a[href^="mailto:"]'))
              .map(a => a.href.replace('mailto:', '')),
            phones: Array.from(document.querySelectorAll('a[href^="tel:"]'))
              .map(a => a.href.replace('tel:', '')),
            addresses: Array.from(document.querySelectorAll('address'))
              .map(addr => addr.innerText.trim())
          },
          
          // Social links
          socialLinks: Array.from(document.querySelectorAll('a[href*="facebook"], a[href*="twitter"], a[href*="linkedin"], a[href*="instagram"]'))
            .map(a => a.href),
          
          // Business info
          businessInfo: {
            companyName: document.querySelector('h1')?.innerText.trim() || '',
            tagline: document.querySelector('.tagline, .subtitle, .hero-subtitle')?.innerText.trim() || '',
            services: Array.from(document.querySelectorAll('a[href*="service"], a[href*="product"]'))
              .map(a => a.innerText.trim())
          }
        };
      });
      
      // ✅ NEW: Capture full HTML for preview injection
      const fullHtml = await page.content();
      websiteData.htmlSnapshot = fullHtml;
      
      console.log('✅ Website scraping completed', {
        contentBlocksCount: websiteData.contentBlocks?.length || 0,
        htmlSnapshotSize: fullHtml.length,
      });
      return websiteData;

    } catch (error) {
      console.error('❌ Scraping failed:', error.message);

      // Try fallback with simpler method
      console.log('🔄 Attempting fallback scraping method...');
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000 // Increased slightly for fallback, but still reasonable (was 10s)
        });

        const $ = cheerio.load(response.data);

        const BLOCKED_ANCESTOR_SELECTOR = 'header, nav, footer, aside, [role="navigation"], .navbar, .nav, .top-nav, .sidebar, .site-header, .site-footer, .breadcrumb, .breadcrumbs, [class*="footer"], [id*="footer"], [class*="nav"], [id*="nav"], [class*="menu"], [id*="menu"]';

        const getContentRoot = () => {
          if ($('article').length) return $('article');
          if ($('main').length) return $('main');
          if ($('[role="main"]').length) return $('[role="main"]');
          return $('body');
        };

        const shouldSkipElement = (element) => {
          if (!element) {
            return true;
          }
          return $(element).closest(BLOCKED_ANCESTOR_SELECTOR).length > 0;
        };

        const hasMeaningfulText = (text, tag = '') => {
          if (!text) {
            return false;
          }
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          const length = text.length;
          const containsPunctuation = /[.?!]/.test(text);

          if (tag.startsWith('h')) {
            if (wordCount < 2) return false;
            if (length < 8) return false;
            return true;
          }

          if (tag === 'li' || tag === 'p' || tag === 'blockquote') {
            if (wordCount >= 4) return true;
            if (length >= 30) return true;
            if (containsPunctuation) return true;
            return false;
          }

          return wordCount > 1 && length >= 6;
        };

        const buildContentBlocks = () => {
          const container = getContentRoot();
          if (!container || !container.length) {
            return [];
          }

          const blockElements = container.find('h1, h2, h3, h4, h5, h6, p, li, blockquote');

          const blocks = [];
          blockElements.each((_, element) => {
            if (shouldSkipElement(element)) {
              return;
            }

            const rawTag = element.tagName || element.name;
            const tag = rawTag ? rawTag.toLowerCase() : null;
            if (!tag) {
              return;
            }
            const text = $(element).text().trim().replace(/\s+/g, ' ');
            if (!text) {
              return;
            }
            if (!hasMeaningfulText(text, tag)) {
              return;
            }

            let listType = null;
            if (tag === 'li') {
              const parentElement = element.parent || element.parentNode;
              if (shouldSkipElement(parentElement)) {
                return;
              }
              const rawParentTag = parentElement && (parentElement.tagName || parentElement.name);
              const parentTag = rawParentTag ? rawParentTag.toLowerCase() : null;
              if (parentTag === 'ol') {
                listType = 'ordered';
              } else if (parentTag === 'ul') {
                listType = 'unordered';
              }
            }

            blocks.push({
              type: tag,
              text,
              listType,
            });
          });

          return blocks;
        };

        const collectParagraphs = () => {
          const paragraphs = [];
          const container = getContentRoot();
          if (!container || !container.length) {
            return paragraphs;
          }

          container.find('p').each((_, el) => {
            if (shouldSkipElement(el)) {
              return;
            }
            const text = $(el).text().trim();
            if (hasMeaningfulText(text, 'p')) {
              paragraphs.push(text);
            }
          });
          return paragraphs;
        };

        const fallbackData = {
          title: $('title').text() || '',
          url: url,
          description: $('meta[name="description"]').attr('content') || '',
          keywords: $('meta[name="keywords"]').attr('content') || '',
          headings: {
            h1: $('h1').map((i, el) => $(el).text().trim()).get(),
            h2: $('h2').map((i, el) => $(el).text().trim()).get(),
            h3: $('h3').map((i, el) => $(el).text().trim()).get()
          },
          contentBlocks: buildContentBlocks(),
          paragraphs: collectParagraphs(),
          navigation: [],
          contactInfo: { emails: [], phones: [], addresses: [] },
          socialLinks: [],
          businessInfo: {
            companyName: $('h1').first().text().trim() || '',
            tagline: '',
            services: []
          }
        };

        console.log('✅ Fallback scraping successful');
        return fallbackData;

      } catch (fallbackError) {
        console.error('❌ Fallback scraping also failed:', fallbackError.message);
        throw new Error(`Failed to scrape website: ${error.message}`);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Fast-fail timeout wrapper for AI tasks
  async withTimeout(promise, timeoutMs, analysisType, defaultResponse) {
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => {
        console.warn(`⚠️ ${analysisType} task timed out after ${timeoutMs}ms, using default response`);
        resolve(defaultResponse);
      }, timeoutMs)
    );
    
    return Promise.race([
      promise.catch(error => {
        // If the task fails with an error, return default response
        console.warn(`⚠️ ${analysisType} task failed:`, error.message, '- using default response');
        return defaultResponse;
      }),
      timeoutPromise
    ]);
  }

  // Perform AI analysis using OpenRouter - Now context-aware!
  async performAIAnalysis(websiteData, originalUrl, analysisLevel = 'company', contextData = null) {
    console.log(`🤖 Starting ${analysisLevel.toUpperCase()}-level AI analysis...`);

    let analysisTasks;
    let resultKeys;

    if (analysisLevel === 'product') {
      // Product-level analysis
      console.log('   🎯 Using product-specific analysis tasks...');
      analysisTasks = [
        this.analyzeProductContext(websiteData, originalUrl, contextData),
        this.findProductCompetitors(websiteData, originalUrl, contextData),
        this.extractProductTopics(websiteData, contextData),
        this.identifyProductPersonas(websiteData, contextData)
      ];
      resultKeys = ['productContext', 'competitors', 'topics', 'personas'];
    } else if (analysisLevel === 'category') {
      // Category-level analysis
      console.log('   📂 Using category-specific analysis tasks...');
      analysisTasks = [
        this.analyzeCategoryContext(websiteData, originalUrl, contextData),
        this.findCategoryCompetitors(websiteData, originalUrl, contextData),
        this.extractCategoryTopics(websiteData, contextData),
        this.identifyCategoryPersonas(websiteData, contextData)
      ];
      resultKeys = ['categoryContext', 'competitors', 'topics', 'personas'];
    } else {
      // Company-level analysis (default)
      console.log('   🏢 Using company-level analysis tasks...');
      analysisTasks = [
        this.analyzeBrandContext(websiteData, originalUrl),
        this.findCompetitors(websiteData, originalUrl),
        this.extractTopics(websiteData),
        this.identifyUserPersonas(websiteData)
      ];
      resultKeys = ['brandContext', 'competitors', 'topics', 'personas'];
    }

    // Wrap each task with 120-second timeout for fast-fail (tasks typically complete in 30-60s)
    const FAST_FAIL_TIMEOUT = 120000; // 120 seconds
    const wrappedTasks = analysisTasks.map((task, index) => {
      const analysisType = resultKeys[index];
      const defaultResponse = this.getDefaultResponse(analysisType === 'brandContext' ? 'brandContext' : 
                                                       analysisType === 'competitors' ? 'competitors' :
                                                       analysisType === 'topics' ? 'topics' : 'personas');
      return this.withTimeout(task, FAST_FAIL_TIMEOUT, analysisType, defaultResponse);
    });

    let results = await Promise.all(wrappedTasks);

    // ✅ Retry competitor finding only if we have < 3 competitors (max 2 retries)
    const MAX_COMPETITOR_RETRIES = 2;
    const MIN_COMPETITORS_THRESHOLD = 3; // Only retry if we have fewer than 3
    let competitorRetries = 0;
    let competitorsResult = results[1];
    const initialCompetitorCount = competitorsResult?.competitors?.length || 0;
    
    // Only retry if we have fewer than the threshold
    if (initialCompetitorCount < MIN_COMPETITORS_THRESHOLD) {
      console.log(`⚠️ Found only ${initialCompetitorCount} competitor(s), retrying to find more (target: ${MIN_COMPETITORS_THRESHOLD}+)...`);
      
      while (competitorRetries < MAX_COMPETITOR_RETRIES) {
        competitorRetries++;
        console.log(`🔄 Retrying competitor detection (attempt ${competitorRetries}/${MAX_COMPETITOR_RETRIES})...`);
        
        try {
          // Retry the competitor finding task with timeout
          let retryTask;
          if (analysisLevel === 'product') {
            retryTask = this.findProductCompetitors(websiteData, originalUrl, contextData);
          } else if (analysisLevel === 'category') {
            retryTask = this.findCategoryCompetitors(websiteData, originalUrl, contextData);
          } else {
            retryTask = this.findCompetitors(websiteData, originalUrl);
          }
          
          const defaultCompetitors = this.getDefaultResponse('competitors');
          competitorsResult = await this.withTimeout(retryTask, 120000, 'competitors-retry', defaultCompetitors);
          
          // Update results array with retried competitor result
          results[1] = competitorsResult;
          
          const newCount = competitorsResult?.competitors?.length || 0;
          if (newCount >= MIN_COMPETITORS_THRESHOLD) {
            console.log(`✅ Found ${newCount} competitors on retry attempt ${competitorRetries} (target met)`);
            break; // Stop retrying if we have enough
          } else if (newCount > initialCompetitorCount) {
            console.log(`✅ Found ${newCount} competitors on retry attempt ${competitorRetries} (improved from ${initialCompetitorCount})`);
            // Continue retrying to try to get more
          } else {
            console.log(`⚠️ Retry ${competitorRetries} found ${newCount} competitors (no improvement)`);
          }
        } catch (retryError) {
          console.error(`❌ Retry ${competitorRetries} failed:`, retryError.message);
          // Continue to next retry
        }
      }
    } else {
      console.log(`✅ Found ${initialCompetitorCount} competitors (target met, skipping retries)`);
    }
    
    const finalCompetitorCount = competitorsResult?.competitors?.length || 0;
    if (finalCompetitorCount < MIN_COMPETITORS_THRESHOLD) {
      console.log(`⚠️ Final competitor count: ${finalCompetitorCount} (target was ${MIN_COMPETITORS_THRESHOLD}+). Continuing with available competitors.`);
    }

    // Build results object dynamically based on analysis level
    const analysisResults = {
      [resultKeys[0]]: results[0], // context (brand/product/category)
      competitors: results[1].competitors || [],
      topics: results[2].topics || [],
      personas: results[3].personas || [],
      analysisDate: new Date().toISOString()
    };

    console.log(`✅ ${analysisLevel.toUpperCase()}-level analysis completed`);
    console.log(`   📊 Found ${analysisResults.competitors.length} competitors`);
    console.log(`   📚 Found ${analysisResults.topics.length} topics`);
    console.log(`   👥 Found ${analysisResults.personas.length} personas`);

    return analysisResults;
  }

  // Task 1: Analyze brand context
  async analyzeBrandContext(websiteData, url) {
    const prompt = `
Analyze this website data and provide a comprehensive brand context analysis.

Website Data:
- URL: ${url}
- Title: ${websiteData.title}
- Description: ${websiteData.description}
- Company Name: ${websiteData.businessInfo.companyName}
- Tagline: ${websiteData.businessInfo.tagline}
- Main Headings: ${websiteData.headings.h1.join(', ')}
- Key Content: ${websiteData.paragraphs.slice(0, 5).join(' ')}
- Services: ${websiteData.businessInfo.services.join(', ')}

Provide a structured analysis in JSON format:
{
  "companyName": "string",
  "industry": "string",
  "businessModel": "string",
  "targetMarket": "string",
  "valueProposition": "string",
  "keyServices": ["string"],
  "brandTone": "string",
  "marketPosition": "string"
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'brandContext');
  }

  // Task 2: Find competitors
  async findCompetitors(websiteData, url) {
    const prompt = `
Based on this website analysis, identify 4-6 DIRECT competitors with similar business profiles.

Website Analysis:
- Company: ${websiteData.businessInfo.companyName}
- URL: ${url}
- Industry: [Analyze from content - be specific]
- Services: ${websiteData.businessInfo.services.join(', ')}
- Target Market: [Analyze from content]
- Business Model: [Analyze from content]

COMPETITOR SELECTION - PRIORITY ORDER (most important first):

**PRIORITY 1 - MUST MATCH:**
1. **Industry & Product Category**: Same industry and similar product/service offerings
   - Example: If analyzing a credit card company, find other credit card/financial services companies
   - Example: If analyzing SaaS CRM, find other SaaS CRM companies

**PRIORITY 2 - STRONGLY PREFERRED (match at least 2 of these):**
2. **Revenue Scale**: Similar revenue size (within 5x range is acceptable)
   - Startup (<$10M) → Find other startups or small companies
   - Mid-market ($10M-$100M) → Find mid-market competitors
   - Enterprise (>$100M) → Find large enterprise competitors
   
3. **Funding Stage**: Similar funding/valuation stage
   - Seed/Series A → Find early-stage companies
   - Series B/C → Find growth-stage companies
   - Public/Late-stage → Find mature companies
   
4. **Market Segment**: Similar target customer base
   - B2B vs B2C should match
   - Enterprise vs SMB can be flexible if other criteria match

**PRIORITY 3 - NICE TO HAVE:**
5. Geographic market overlap
6. Similar business model/monetization

SEARCH STRATEGY (in order of priority):
1. First, search: "[Industry] competitors to [Company Name]" or "[Product Category] companies"
2. If few results, search: "[Industry] companies" and filter by revenue/funding similarity
3. If still few results, broaden to: "[Industry] alternatives" or "[Industry] options"

FLEXIBILITY RULES:
- If you can't find exact matches on ALL criteria, prioritize competitors that match:
  ✅ Same industry/category (REQUIRED)
  ✅ Similar revenue OR funding stage (at least one)
  ✅ Similar target market (preferred)
- It's better to find 4-6 good competitors with 2-3 matching criteria than 1-2 with perfect matches

EXAMPLES:
- Credit card company ($500M revenue) → Find other credit card/financial companies with $100M-$2B revenue
- SaaS startup (Series A, $5M ARR) → Find other SaaS startups with similar stage/funding
- E-commerce enterprise → Find other large e-commerce companies

AVOID (bad competitors):
- Different industries (e.g., credit card vs insurance)
- Completely different revenue brackets (e.g., $1M startup vs $1B enterprise)
- Different business models (e.g., B2B vs B2C unless flexible needed)

Return 4-6 competitors with this structure:
{
  "competitors": [
    {
      "name": "Competitor Company Name",
      "url": "https://competitor-website.com",
      "revenue": "Estimated revenue range (if known) or 'Unknown'",
      "category": "Product/service category",
      "segment": "Market segment (B2B/B2C, enterprise/SMB)",
      "funding": "Funding stage if known (e.g., 'Series B', 'Public', 'Bootstrapped') or 'Unknown'",
      "reason": "Why they compete: Match on [industry, revenue/funding, segment]",
      "similarity": "High/Medium/Low based on how many criteria match"
    }
  ]
}

Use web search to find real competitors. Prioritize finding 4-6 competitors over perfect matches on all criteria.
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'competitors');
  }

  // Task 3: Extract topics
  async extractTopics(websiteData) {
    const prompt = `
Analyze this website content and extract the main topics and themes that would be relevant for those type of users for whome the product has been made and who would show buying intent for the product/brand.

Website Content:
- Title: ${websiteData.title}
- Headings: ${JSON.stringify(websiteData.headings)}
- Main Content: ${websiteData.paragraphs.slice(0, 10).join(' ')}
- Services: ${websiteData.businessInfo.services.join(', ')}

Extract 8-10 short quality topics

Example: if topic name should be short and crisp
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description of why this topic is relevant",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'topics');
  }

  // Task 4: Identify user personas
  async identifyUserPersonas(websiteData) {
    const prompt = `
Based on this website analysis, identify the key user personas that this business targets.

Website Analysis:
- Company: ${websiteData.businessInfo.companyName}
- Industry: [Analyze from content]
- Services: ${websiteData.businessInfo.services.join(', ')}
- Target Market: [Analyze from content and messaging]
- Content Tone: [Analyze from website content]

Identify 3-4 primary user personas:

{
  "personas": [
    {
      "type": "Persona Type (e.g., Marketing Manager, Small Business Owner)",
      "description": "Detailed description of this persona including their role, challenges, goals, and how they would use this business's services",
      "painPoints": ["pain point 1", "pain point 2"],
      "goals": ["goal 1", "goal 2"],
      "relevance": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'personas');
  }

  // ===== PRODUCT-LEVEL ANALYSIS METHODS =====

  // Product Task 1: Analyze product context
  async analyzeProductContext(websiteData, url, productData) {
    const prompt = `
Analyze this SPECIFIC PRODUCT PAGE and provide comprehensive product context insights.

CRITICAL: Extract and output BOTH the official company/brand name (e.g., 'HDFC Bank') AS companyName, and the specific product name (e.g., 'Platinum Debit Card') AS productName. Do NOT duplicate or substitute—these fields MUST be separate.

Important: If the company/brand name is not visible on the page, infer it from the domain (e.g., 'hdfcbank.com' → 'HDFC Bank').

Return ONLY valid JSON in this structure:
{
  "companyName": "string (official brand/company name)",
  "productName": "string (official product name only, do not include company/brand here)",
  "productCategory": "string",
  "productType": "string",
  "targetAudience": "string",
  "valueProposition": "string",
  "keyFeatures": ["string"],
  "useCases": ["string"],
  "marketPosition": "string"
}

Product Information:
- Product Name: ${productData?.productName || 'Unknown'}
- Product Type: ${productData?.productType || 'General'}
- URL: ${url}
- Page Title: ${websiteData.title}
- Description: ${websiteData.description}
- Main Headings: ${(websiteData.headings?.h1 || []).join(', ')}
- Key Features: ${(productData?.features ? productData.features.slice(0, 5).join('; ') : 'Not specified')}
- Pricing Info: ${(productData?.pricing && productData.pricing.found) ? 'Available' : 'Not found'}
- Use Cases: ${(productData?.useCases ? productData.useCases.slice(0, 3).join('; ') : 'Not specified')}
`;

    const result = await this.callOpenRouter(prompt, 'perplexity/sonar', 'productContext');
    // --- Postprocess result: enforce companyName !== productName ---
    if (result) {
      let company = result.companyName?.trim();
      let product = result.productName?.trim();
      if (!company || !product || company.toLowerCase() === product.toLowerCase()) {
        try {
          const hostname = new URL(url).hostname.replace(/^www\./, '');
          const domainMap = {
            'hdfcbank.com': 'HDFC Bank',
            'icicibank.com': 'ICICI Bank',
            'axisbank.com': 'Axis Bank',
            'yesbank.in': 'YES Bank',
            'sbi.co.in': 'SBI',
            'kotak.com': 'Kotak Bank',
            'bankofbaroda.in': 'Bank of Baroda',
          };
          company = domainMap[hostname] || hostname.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
        } catch { company = 'Unknown Brand'; }
      }
      result.companyName = company;
      result.productName = product;
    }
    return result;
  }

  // Product Task 2: Find product competitors
  async findProductCompetitors(websiteData, url, productData) {
    const prompt = `
Based on this SPECIFIC PRODUCT analysis, identify 4-6 direct product-level competitors.

Product Analysis:
- Product: ${productData?.productName || 'Unknown Product'}
- Product Type: ${productData?.productType || 'General'}
- Features: ${productData?.features.slice(0, 5).join(', ') || 'Not specified'}
- Use Cases: ${productData?.useCases.slice(0, 3).join(', ') || 'Not specified'}
- Pricing: ${productData?.pricing.found ? 'Available' : 'Not specified'}

COMPETITOR SELECTION - PRIORITY ORDER:

**PRIORITY 1 - MUST MATCH:**
1. **Product Category & Type**: Same product category and similar type
   - Example: Credit card product → Find other credit card products
   - Example: SaaS CRM product → Find other SaaS CRM products

**PRIORITY 2 - STRONGLY PREFERRED (match at least 2 of these):**
2. **Company Revenue Scale**: Products from companies with similar revenue size (within 5x range)
   - Startup products → Find products from other startups
   - Mid-market products → Find products from mid-market companies
   - Enterprise products → Find products from large enterprises
   
3. **Parent Company Funding**: Products from companies with similar funding stage
   - Early-stage → Find products from early-stage companies
   - Growth-stage → Find products from growth-stage companies
   - Mature → Find products from mature/public companies
   
4. **Target Segment**: Similar target customer base
   - B2B vs B2C should match
   - Enterprise vs SMB can be flexible if other criteria match
   
5. **Core Features/Use Cases**: Similar functionality and use cases

**PRIORITY 3 - NICE TO HAVE:**
6. Similar pricing model
7. Geographic market overlap

SEARCH STRATEGY:
1. First, search: "[Product Category] competitors to [Product Name]" or "[Product Type] alternatives"
2. If few results, search: "[Product Category] products" and filter by company size/funding
3. If still few results, broaden to: "[Product Type] options" or "[Category] solutions"

FLEXIBILITY RULES:
- If you can't find exact matches on ALL criteria, prioritize products that match:
  ✅ Same product category/type (REQUIRED)
  ✅ Similar company revenue OR funding (at least one)
  ✅ Similar features/use cases OR target segment (at least one)
- It's better to find 4-6 good product competitors with 2-3 matching criteria than 1-2 with perfect matches
- Focus on products that solve similar problems for similar customers

EXAMPLES:
- Credit card product ($500M company) → Find other credit card products from $100M-$2B companies
- SaaS CRM product (Series A startup) → Find other SaaS CRM products from similar stage companies

AVOID:
- Different product categories (e.g., credit card vs savings account)
- Products from vastly different company sizes (e.g., startup product vs enterprise product from $1B company)
- Products with completely different use cases

Return 4-6 product competitors:
{
  "competitors": [
    {
      "name": "Competitor Product Name",
      "url": "https://competitor.com/product-page",
      "revenue": "Parent company revenue range (if known) or 'Unknown'",
      "category": "Product category",
      "segment": "Market segment (B2B/B2C, enterprise/SMB)",
      "funding": "Parent company funding stage if known or 'Unknown'",
      "reason": "Why they compete: Match on [category, company revenue/funding, features/segment]",
      "similarity": "High/Medium/Low"
    }
  ]
}

Use web search to find real product competitors. Prioritize finding 4-6 products over perfect matches on all criteria.
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'productCompetitors');
  }

  // Product Task 3: Extract product topics
  async extractProductTopics(websiteData, productData) {
    const prompt = `
Analyze this SPECIFIC PRODUCT PAGE and extract product-specific topics that would be relevant for those type of users for whome the product has been made and who would show buying intent for the product/brand.

IMPORTANT: Extract topics relevant to THIS SPECIFIC PRODUCT, not general business topics.

Product Content:
- Product: ${productData?.productName || 'Unknown Product'}
- Product Type: ${productData?.productType || 'General'}
- Description: ${productData?.description || websiteData.description}
- Features: ${productData?.features.slice(0, 8).join(', ') || 'Not specified'}
- Use Cases: ${productData?.useCases.slice(0, 5).join(', ') || 'Not specified'}
- Page Title: ${websiteData.title}

Extract 8-10 short quality PRODUCT-SPECIFIC topics

Example: if topic name should be short and crisp
{
  "topics": [
    {
      "name": "Product-specific topic name",
      "description": "How this topic relates to the product",
      "keywords": ["product-related keyword1", "keyword2", "keyword3"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'productTopics');
  }

  // Product Task 4: Identify product personas
  async identifyProductPersonas(websiteData, productData) {
    const prompt = `
Based on this SPECIFIC PRODUCT, identify user personas who would use THIS PRODUCT.

IMPORTANT: Identify personas for THIS SPECIFIC PRODUCT, not general business customers.

Product Analysis:
- Product: ${productData?.productName || 'Unknown Product'}
- Product Type: ${productData?.productType || 'General'}
- Features: ${productData?.features.slice(0, 8).join(', ') || 'Not specified'}
- Use Cases: ${productData?.useCases.slice(0, 5).join(', ') || 'Not specified'}
- Target Audience: [Analyze from content]

Identify 3-4 PRODUCT-SPECIFIC user personas:
{
  "personas": [
    {
      "type": "Persona type specific to this product",
      "description": "How this persona uses THIS specific product",
      "painPoints": ["Problems THIS product solves for them"],
      "goals": ["Goals THIS product helps them achieve"],
      "relevance": "High/Medium/Low"
    }
  ]
}

Focus on:
- Who needs THIS specific product
- What problems THIS product solves
- What situations lead to needing THIS product
- What features matter most to them
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'productPersonas');
  }

  // ===== CATEGORY-LEVEL ANALYSIS METHODS =====

  // Category Task 1: Analyze category context
  async analyzeCategoryContext(websiteData, url, categoryData) {
    const prompt = `
Analyze this CATEGORY PAGE and provide category-level insights.

Category Information:
- Category: ${categoryData?.categoryName || 'Unknown Category'}
- URL: ${url}
- Page Title: ${websiteData.title}
- Description: ${websiteData.description}
- Subcategories: ${categoryData?.subcategories.slice(0, 10).join(', ') || 'Not specified'}

Provide a structured category analysis:
{
  "categoryName": "string",
  "categoryType": "string",
  "targetMarket": "string",
  "productTypes": ["string"],
  "marketTrends": ["string"]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryContext');
  }

  // Category Task 2: Find category competitors
  async findCategoryCompetitors(websiteData, url, categoryData) {
    const prompt = `
Find 4-6 competitors in the SAME PRODUCT CATEGORY with similar business profiles.

Category Analysis:
- Category: ${categoryData?.categoryName || 'Unknown Category'}
- URL: ${url}
- Subcategories: ${categoryData?.subcategories.slice(0, 5).join(', ') || 'Not specified'}
- Target Market: ${categoryData?.targetMarket || 'Not specified'}

COMPETITOR SELECTION - PRIORITY ORDER:

**PRIORITY 1 - MUST MATCH:**
1. **Product Category**: Same product category (and similar subcategories if applicable)
   - Example: Credit cards category → Find other credit card companies
   - Example: SaaS CRM category → Find other SaaS CRM companies

**PRIORITY 2 - STRONGLY PREFERRED (match at least 2 of these):**
2. **Revenue Scale**: Similar revenue size (within 5x range)
   - Startup category players → Find other startups in category
   - Mid-market category players → Find mid-market competitors
   - Enterprise category players → Find large enterprise competitors
   
3. **Funding Stage**: Similar funding/valuation stage
   - Early-stage → Find early-stage category players
   - Growth-stage → Find growth-stage competitors
   - Mature → Find mature/public competitors
   
4. **Market Segment**: Similar target customer base
   - B2B vs B2C should match
   - Enterprise vs SMB can be flexible if other criteria match

**PRIORITY 3 - NICE TO HAVE:**
5. Geographic market overlap
6. Similar business model/monetization

SEARCH STRATEGY:
1. First, search: "[Category] competitors" or "[Category] companies"
2. If few results, search: "[Category] alternatives" and filter by revenue/funding
3. If still few results, broaden to: "[Category] providers" or "[Category] solutions"

FLEXIBILITY RULES:
- If you can't find exact matches on ALL criteria, prioritize companies that match:
  ✅ Same category (REQUIRED)
  ✅ Similar revenue OR funding (at least one)
  ✅ Similar target market (preferred)
- It's better to find 4-6 good category competitors with 2-3 matching criteria than 1-2 with perfect matches
- Focus on companies actively competing in the same category

EXAMPLES:
- Credit cards category → Find other credit card companies with similar scale
- SaaS CRM category → Find other SaaS CRM companies with similar stage/funding

AVOID:
- Different categories (e.g., credit cards vs savings accounts)
- Completely different revenue brackets (e.g., $1M startup vs $1B enterprise in same category)
- Different business models (e.g., B2B vs B2C unless flexible needed)

Return 4-6 category competitors:
{
  "competitors": [
    {
      "name": "Competitor Company Name",
      "url": "https://competitor-website.com",
      "revenue": "Estimated revenue range (if known) or 'Unknown'",
      "category": "Product/service category",
      "segment": "Market segment (B2B/B2C, enterprise/SMB)",
      "funding": "Funding stage if known or 'Unknown'",
      "reason": "Why they compete: Match on [category, revenue/funding, segment]",
      "similarity": "High/Medium/Low"
    }
  ]
}

Use web search to find real competitors in this category. Prioritize finding 4-6 competitors over perfect matches on all criteria.
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryCompetitors');
  }

  // Category Task 3: Extract category topics
  async extractCategoryTopics(websiteData, categoryData) {
    const prompt = `
Extract topics relevant to THIS PRODUCT CATEGORY that would be relevant for those type of users for whome products in this category have been made and who would show buying intent.

Category: ${categoryData?.categoryName || 'Unknown Category'}
Subcategories: ${categoryData?.subcategories.slice(0, 10).join(', ') || 'Not specified'}

Extract 8-10 short quality category-level topics

Example: if topic name should be short and crisp
{
  "topics": [
    {
      "name": "string",
      "description": "string",
      "keywords": ["string"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryTopics');
  }

  // Category Task 4: Identify category personas
  async identifyCategoryPersonas(websiteData, categoryData) {
    const prompt = `
Identify personas interested in THIS PRODUCT CATEGORY.

Category: ${categoryData?.categoryName || 'Unknown Category'}

Identify 3-4 category-level personas:
{
  "personas": [
    {
      "type": "string",
      "description": "string",
      "painPoints": ["string"],
      "goals": ["string"],
      "relevance": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryPersonas');
  }

  // ===== UTILITY METHODS =====

  // Utility function to wait for a specified time
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Call OpenRouter API with error handling and retry logic
  async callOpenRouter(prompt, model = 'perplexity/sonar', analysisType = 'general', retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay
    try {
      const systemPrompt = SYSTEM_PROMPTS[analysisType] || SYSTEM_PROMPTS.brandContext;
      
              const response = await axios.post(`${this.openRouterBaseUrl}/chat/completions`, {
        model: model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\nCRITICAL: You MUST return ONLY valid JSON. No explanations, no markdown, no additional text. Just the JSON object.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
        // Note: Perplexity doesn't support response_format, relies on prompt instructions
      }, {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rankly.ai',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'Rankly'
        },
        timeout: 120000 // Reduced to 2 minutes timeout (was 5 minutes) - most calls complete in 30-60s
      });

      // Check if response structure is valid
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error(`❌ Invalid response structure for ${analysisType}:`, response.data);
        console.warn(`⚠️  Returning default response for ${analysisType}`);
        return this.getDefaultResponse(analysisType);
      }

      let content = response.data.choices[0].message.content;
      
      // Check if content looks like an error message (not JSON)
      if (typeof content === 'string' && (
        content.toLowerCase().includes('too many requests') ||
        content.toLowerCase().includes('rate limit') ||
        content.toLowerCase().includes('error') ||
        content.toLowerCase().includes('unauthorized') ||
        content.toLowerCase().includes('forbidden') ||
        content.startsWith('Too many') ||
        content.startsWith('Rate limit') ||
        content.startsWith('Error:') ||
        content.startsWith('Unauthorized') ||
        content.startsWith('Forbidden')
      )) {
        console.error(`❌ API returned error message instead of JSON for ${analysisType}:`, content);
        console.warn(`⚠️  Returning default response for ${analysisType}`);
        return this.getDefaultResponse(analysisType);
      }
      
      // Remove markdown code blocks if present (Perplexity sometimes wraps JSON)
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        console.log(`✅ Successfully parsed ${analysisType} analysis`);
        console.log(`   Raw data keys: ${Object.keys(parsed).join(', ')}`);
        const normalized = this.validateAndNormalizeResponse(parsed, analysisType);
        console.log(`   Normalized keys: ${Object.keys(normalized).join(', ')}`);
        if (analysisType === 'competitors') console.log(`   Competitors count: ${normalized.competitors?.length || 0}`);
        if (analysisType === 'topics') console.log(`   Topics count: ${normalized.topics?.length || 0}`);
        if (analysisType === 'personas') console.log(`   Personas count: ${normalized.personas?.length || 0}`);
        return normalized;
      } catch (parseError) {
        console.warn(`Failed to parse JSON for ${analysisType}:`, parseError.message);
        console.warn(`   Content preview: ${content.substring(0, 200)}...`);
        
        // Check if the content looks like an error message
        if (content.toLowerCase().includes('too many requests') || 
            content.toLowerCase().includes('rate limit') ||
            content.startsWith('Too many') ||
            content.startsWith('Rate limit')) {
          console.error(`❌ Detected rate limiting error in content for ${analysisType}:`, content.substring(0, 100));
          console.warn(`⚠️  Returning default response for ${analysisType}`);
          return this.getDefaultResponse(analysisType);
        }
        
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            console.log(`✅ Successfully extracted JSON from content`);
            return this.validateAndNormalizeResponse(extracted, analysisType);
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e.message);
          }
        }
        
        // Return default response on parse failure
        console.warn(`⚠️  Returning default response for ${analysisType}`);
        return this.getDefaultResponse(analysisType);
      }
      
    } catch (error) {
      console.error(`❌ OpenRouter API error (${model} - ${analysisType}):`, error.response?.data || error.message);
      console.error('   Full error:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        
        // Handle specific HTTP status codes with retry logic
        if (error.response.status === 429 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`   Rate limit exceeded - retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await this.sleep(delay);
          return this.callOpenRouter(prompt, model, analysisType, retryCount + 1);
        } else if (error.response.status === 429) {
          console.error('   Rate limit exceeded - max retries reached, returning default response');
        } else if (error.response.status === 401) {
          console.error('   Unauthorized - check API key');
        } else if (error.response.status === 403) {
          console.error('   Forbidden - check API permissions');
        }
      }
      console.warn(`⚠️  Returning default response for ${analysisType}`);
      return this.getDefaultResponse(analysisType);
    }
  }

  // Validate and normalize response structure
  validateAndNormalizeResponse(data, analysisType) {
    switch (analysisType) {
      // Company-level
      case 'brandContext':
        return this.normalizeBrandContext(data);
      case 'competitors':
        return this.normalizeCompetitors(data);
      case 'topics':
        return this.normalizeTopics(data);
      case 'personas':
        return this.normalizePersonas(data);
      // Product-level
      case 'productContext':
        return this.normalizeProductContext(data);
      case 'productCompetitors':
        return this.normalizeCompetitors(data); // Same structure
      case 'productTopics':
        return this.normalizeTopics(data); // Same structure
      case 'productPersonas':
        return this.normalizePersonas(data); // Same structure
      // Category-level
      case 'categoryContext':
        return this.normalizeCategoryContext(data);
      case 'categoryCompetitors':
        return this.normalizeCompetitors(data); // Same structure
      case 'categoryTopics':
        return this.normalizeTopics(data); // Same structure
      case 'categoryPersonas':
        return this.normalizePersonas(data); // Same structure
      default:
        return data;
    }
  }

  // Normalize brand context response
  normalizeBrandContext(data) {
    return {
      companyName: data.companyName || data.company_name || 'Unknown',
      industry: data.industry || 'Technology',
      businessModel: data.businessModel || data.business_model || 'B2B',
      targetMarket: data.targetMarket || data.target_market || 'General',
      valueProposition: data.valueProposition || data.value_proposition || 'Not specified',
      keyServices: Array.isArray(data.keyServices) ? data.keyServices : 
                  Array.isArray(data.services) ? data.services : 
                  Array.isArray(data.key_services) ? data.key_services : ['Service'],
      brandTone: data.brandTone || data.brand_tone || 'Professional',
      marketPosition: data.marketPosition || data.market_position || 'Mid-market'
    };
  }

  // Normalize competitors response
  normalizeCompetitors(data) {
    const competitors = data.competitors || data.competitor_list || [];
    return {
      competitors: competitors.map((comp, index) => ({
        name: comp.name || comp.company_name || `Competitor ${index + 1}`,
        url: comp.url || comp.website || `https://competitor${index + 1}.com`,
        reason: comp.reason || comp.description || 'Similar business model',
        similarity: comp.similarity || comp.level || 'Medium'
      }))
    };
  }

  // Normalize topics response
  normalizeTopics(data) {
    const topics = data.topics || data.topic_list || [];
    return {
      topics: topics.map((topic, index) => ({
        name: topic.name || topic.title || `Topic ${index + 1}`,
        description: topic.description || topic.desc || 'Content topic for marketing',
        keywords: Array.isArray(topic.keywords) ? topic.keywords : 
                 Array.isArray(topic.tags) ? topic.tags : 
                 [topic.name || `keyword${index + 1}`],
        priority: topic.priority || topic.importance || 'Medium'
      }))
    };
  }

  // Normalize personas response
  normalizePersonas(data) {
    const personas = data.personas || data.persona_list || [];
    return {
      personas: personas.map((persona, index) => ({
        type: persona.type || persona.role || `Persona ${index + 1}`,
        description: persona.description || persona.desc || 'Target customer persona',
        painPoints: Array.isArray(persona.painPoints) ? persona.painPoints : 
                   Array.isArray(persona.pain_points) ? persona.pain_points : 
                   Array.isArray(persona.challenges) ? persona.challenges : 
                   ['Business challenge'],
        goals: Array.isArray(persona.goals) ? persona.goals : 
               Array.isArray(persona.objectives) ? persona.objectives : 
               ['Business goal'],
        relevance: persona.relevance || persona.importance || 'Medium'
      }))
    };
  }

  // Normalize product context response
  normalizeProductContext(data) {
    let companyName = data.companyName || data.company_name || 'Unknown Brand';
    let productName = data.productName || data.product_name || 'Unknown Product';
    // Ensure productName starts with brand if not already included
    if (
      companyName &&
      productName &&
      !productName.toLowerCase().startsWith(companyName.toLowerCase())
    ) {
      productName = `${companyName} ${productName}`;
    }
    return {
      companyName,
      productName,
      productCategory: data.productCategory || data.product_category || 'General',
      productType: data.productType || data.product_type || 'General',
      targetAudience: data.targetAudience || data.target_audience || 'General',
      valueProposition: data.valueProposition || data.value_proposition || 'Not specified',
      keyFeatures: Array.isArray(data.keyFeatures)
        ? data.keyFeatures
        : Array.isArray(data.key_features)
        ? data.key_features
        : Array.isArray(data.features)
        ? data.features
        : ['Feature'],
      useCases: Array.isArray(data.useCases)
        ? data.useCases
        : Array.isArray(data.use_cases)
        ? data.use_cases
        : ['Use case'],
      marketPosition: data.marketPosition || data.market_position || 'Mid-market',
    };
  }

  // Normalize category context response
  normalizeCategoryContext(data) {
    return {
      categoryName: data.categoryName || data.category_name || 'Unknown Category',
      categoryType: data.categoryType || data.category_type || 'General',
      targetMarket: data.targetMarket || data.target_market || 'General',
      productTypes: Array.isArray(data.productTypes) ? data.productTypes :
                    Array.isArray(data.product_types) ? data.product_types : ['Product'],
      marketTrends: Array.isArray(data.marketTrends) ? data.marketTrends :
                    Array.isArray(data.market_trends) ? data.market_trends : []
    };
  }

  // Get default response structure
  getDefaultResponse(analysisType) {
    switch (analysisType) {
      // Company-level defaults
      case 'brandContext':
        return {
          companyName: 'Unknown Company',
          industry: 'Technology',
          businessModel: 'B2B',
          targetMarket: 'General',
          valueProposition: 'Not specified',
          keyServices: ['Service'],
          brandTone: 'Professional',
          marketPosition: 'Mid-market'
        };
      case 'competitors':
      case 'productCompetitors':
      case 'categoryCompetitors':
        return {
          competitors: [
            {
              name: 'Competitor 1',
              url: 'https://competitor1.com',
              reason: 'Similar business model',
              similarity: 'Medium'
            }
          ]
        };
      case 'topics':
      case 'productTopics':
      case 'categoryTopics':
        return {
          topics: [
            {
              name: 'General Topic',
              description: 'Content topic for marketing',
              keywords: ['keyword1', 'keyword2'],
              priority: 'Medium'
            }
          ]
        };
      case 'personas':
      case 'productPersonas':
      case 'categoryPersonas':
        return {
          personas: [
            {
              type: 'Target Customer',
              description: 'Primary target customer persona',
              painPoints: ['Business challenge'],
              goals: ['Business goal'],
              relevance: 'High'
            }
          ]
        };
      // Product-level defaults
      case 'productContext':
        return {
          companyName: 'Unknown Brand',
          productName: 'Unknown Product',
          productCategory: 'General',
          productType: 'General',
          targetAudience: 'General',
          valueProposition: 'Not specified',
          keyFeatures: ['Feature'],
          useCases: ['Use case'],
          marketPosition: 'Mid-market'
        };
      // Category-level defaults
      case 'categoryContext':
        return {
          categoryName: 'Unknown Category',
          categoryType: 'General',
          targetMarket: 'General',
          productTypes: ['Product'],
          marketTrends: []
        };
      default:
        return {};
    }
  }
}

module.exports = new WebsiteAnalysisService();