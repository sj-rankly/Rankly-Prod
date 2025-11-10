# Page Content Scraping Flow - Complete Explanation

## Overview

When a user clicks "Load Page Content" in the Actionables tab, the system scrapes the page content using a **two-tier approach**: 
1. **Primary Method**: Puppeteer (headless Chrome) for JavaScript-rendered pages
2. **Fallback Method**: Cheerio (server-side HTML parsing) if Puppeteer fails

The scraped content is then converted to Markdown format for display and content regeneration.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: User clicks "Load Page Content"                       │
│ File: components/tabs/pages/PageList.tsx                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ apiService.loadActionablePageContent()                           │
│ File: services/api.ts:378-384                                    │
│                                                                  │
│ Payload includes:                                                │
│ - url: Original page URL                                         │
│ - normalizedUrl: Normalized/canonical URL                       │
│ - mapping: URL mapping rules (if exists)                        │
│ - mappingTargetUrl: Mapped target URL                           │
│ - sourceUrls: Array of citation source URLs                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: POST /api/actionables/page-content                      │
│ File: backend/src/routes/actionables.js:287-384                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: URL Candidate Collection                                │
│                                                                  │
│ The system collects multiple URL candidates in priority order:   │
│ 1. mapping.targetUrl (highest priority - if URL mapping exists) │
│ 2. mappingTargetUrl                                             │
│ 3. normalizedUrl                                                │
│ 4. url (original URL)                                           │
│ 5. sourceUrls[] (all citation source URLs)                      │
│                                                                  │
│ Each URL is sanitized and deduplicated before attempting scrape.│
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Sequential Scraping Attempts                            │
│                                                                  │
│ For each candidate URL (in priority order):                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Try: websiteAnalysisService.scrapeWebsite(candidate.url)│   │
│   │                                                          │   │
│   │ If SUCCESS: Break loop, use this result                 │   │
│   │ If FAIL: Log error, try next candidate                 │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ If ALL candidates fail: Return error with last error message    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Primary Scraping Method (Puppeteer)                     │
│ File: backend/src/services/websiteAnalysisService.js:90-309     │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3.1: Launch Headless Chrome Browser                        │ │
│ │                                                             │ │
│ │ browser = await puppeteer.launch({                         │ │
│ │   headless: true,                                           │ │
│ │   args: ['--no-sandbox', '--disable-setuid-sandbox', ...] │ │
│ │ })                                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3.2: Create New Page & Configure                            │ │
│ │                                                             │ │
│ │ - Set User-Agent: Mozilla/5.0 (Windows NT 10.0...)        │ │
│ │ - Set Viewport: 1920x1080                                  │ │
│ │ - Navigate to URL with 'domcontentloaded' wait condition   │ │
│ │ - Wait 500ms for dynamic content to load                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3.3: Extract Content (page.evaluate() - runs in browser)     │ │
│ │                                                             │ │
│ │ The extraction logic runs INSIDE the browser context:       │ │
│ │                                                             │ │
│ │ A. Find Content Root:                                       │ │
│ │    - Try: <article> element                                 │ │
│ │    - Else: <main> element                                   │ │
│ │    - Else: [role="main"] element                            │ │
│ │    - Fallback: <body> element                               │ │
│ │                                                             │ │
│ │ B. Identify Blocked Ancestors (to skip):                   │ │
│ │    - header, nav, footer, aside                             │ │
│ │    - [role="navigation"]                                    │ │
│ │    - .navbar, .nav, .top-nav, .sidebar                     │ │
│ │    - .site-header, .site-footer                              │ │
│ │    - .breadcrumb, .breadcrumbs                              │ │
│ │    - Any element with "footer", "nav", "menu" in class/id  │ │
│ │                                                             │ │
│ │ C. Extract Content Blocks:                                  │ │
│ │    Selectors: h1, h2, h3, h4, h5, h6, p, li, blockquote   │ │
│ │                                                             │ │
│ │    For each element:                                        │ │
│ │    1. Check if element is inside blocked ancestor          │ │
│ │    2. Extract text content (trimmed)                         │ │
│ │    3. Validate text is "meaningful":                        │ │
│ │       - Headings: ≥2 words, ≥8 chars                       │ │
│ │       - Paragraphs/Lists: ≥4 words OR ≥30 chars OR has    │ │
│ │         punctuation                                         │ │
│ │    4. Determine list type (ordered/unordered) for <li>     │ │
│ │    5. Return as content block:                             │ │
│ │       { type: 'h2', text: '...', listType: null }         │ │
│ │                                                             │ │
│ │ D. Extract Metadata:                                        │ │
│ │    - Title: document.title                                 │ │
│ │    - Description: <meta name="description">                 │ │
│ │    - Keywords: <meta name="keywords">                      │ │
│ │    - Headings: All h1, h2, h3 elements                      │ │
│ │    - Contact Info: mailto:, tel:, <address>                │ │
│ │    - Social Links: Facebook, Twitter, LinkedIn, Instagram   │ │
│ │    - Business Info: Company name, tagline, services        │ │
│ │                                                             │ │
│ │ E. Return Structured Data:                                   │ │
│ │    {                                                         │ │
│ │      title, url, description, keywords,                     │ │
│ │      headings: { h1: [...], h2: [...], h3: [...] },        │ │
│ │      contentBlocks: [{ type, text, listType }, ...],       │ │
│ │      paragraphs: [...],                                      │ │
│ │      navigation: [...],                                     │ │
│ │      contactInfo: { emails, phones, addresses },           │ │
│ │      socialLinks: [...],                                     │ │
│ │      businessInfo: { companyName, tagline, services }      │ │
│ │    }                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3.4: Close Browser & Return Data                            │ │
│ │                                                             │ │
│ │ await browser.close()                                       │ │
│ │ return websiteData                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    ┌─────────┐
                    │ SUCCESS?│
                    └────┬────┘
                         │
            ┌────────────┴────────────┐
            │                         │
           YES                        NO
            │                         │
            ▼                         ▼
┌───────────────────────┐  ┌──────────────────────────────────────┐
│ Return websiteData    │  │ STEP 4: Fallback Method (Cheerio)     │
└───────────────────────┘  │ File: websiteAnalysisService.js:314-471│
                          │                                        │
                          │ If Puppeteer fails (timeout, error):   │
                          │                                        │
                          │ ┌────────────────────────────────────┐ │
                          │ │ 4.1: HTTP GET Request               │ │
                          │ │                                     │ │
                          │ │ response = await axios.get(url, {   │ │
                          │ │   headers: { User-Agent: '...' },  │ │
                          │ │   timeout: 15000                    │ │
                          │ │ })                                  │ │
                          │ └────────────────────────────────────┘ │
                          │                                        │
                          │ ┌────────────────────────────────────┐ │
                          │ │ 4.2: Parse HTML with Cheerio         │ │
                          │ │                                     │ │
                          │ │ $ = cheerio.load(response.data)    │ │
                          │ │                                     │ │
                          │ │ Same extraction logic as Puppeteer │ │
                          │ │ but using Cheerio selectors:        │ │
                          │ │ - $('article'), $('main'), etc.    │ │
                          │ │ - $('h1, h2, h3, p, li').each(...) │ │
                          │ │ - Same filtering and validation     │ │
                          │ └────────────────────────────────────┘ │
                          │                                        │
                          │ ┌────────────────────────────────────┐ │
                          │ │ 4.3: Return Fallback Data           │ │
                          │ │                                     │ │
                          │ │ Same structure as Puppeteer result  │ │
                          │ └────────────────────────────────────┘ │
                          └────────────────┬───────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Convert to Markdown                                     │
│ File: backend/src/routes/actionables.js:43-142                  │
│                                                                  │
│ formatScrapedContentToMarkdown(scrapeResult, resolvedUrl)       │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 5.1: Build Markdown Structure                                │ │
│ │                                                             │ │
│ │ # {title}                                                    │ │
│ │ _Source: [url](url)_                                         │ │
│ │                                                             │ │
│ │ ## Heading 2                                                 │ │
│ │ ### Heading 3                                                │ │
│ │                                                             │ │
│ │ Paragraph text...                                            │ │
│ │                                                             │ │
│ │ 1. Ordered list item                                         │ │
│ │ 2. Another item                                              │ │
│ │                                                             │ │
│ │ - Unordered list item                                        │ │
│ │ - Another item                                               │ │
│ │                                                             │ │
│ │ > Blockquote text                                            │ │
│ │                                                             │ │
│ │ ---                                                          │ │
│ │ _Scraped at: {timestamp}_                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 5.2: Handle List Continuity                                  │ │
│ │                                                             │ │
│ │ The function maintains list state:                          │ │
│ │ - Buffers consecutive list items                            │ │
│ │ - Flushes list when non-list element appears               │ │
│ │ - Preserves ordered vs unordered list types                │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Return Response to Frontend                             │
│                                                                  │
│ {                                                                │
│   success: true,                                                │
│   data: {                                                        │
│     markdown: "...",          // Full markdown content          │
│     resolvedUrl: "...",       // URL that actually worked       │
│     requestedUrl: "...",      // Original requested URL        │
│     attemptedUrls: [...],     // All URLs tried                 │
│     metadata: {                                                 │
│       title, description, keywords, headings,                    │
│       contentBlocks, paragraphCount,                            │
│       contactInfo, businessInfo, socialLinks                    │
│     },                                                          │
│     scrapedAt: "2025-01-10T...",                               │
│     warnings: [...]            // Failed attempts (if any)      │
│   }                                                             │
│ }                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: Display Content                                        │
│ File: components/tabs/pages/PageList.tsx:1256-1286               │
│                                                                  │
│ - Store markdown in state: setOldContent(data.markdown)        │
│ - Display in textarea or formatted markdown viewer              │
│ - Cache result for faster subsequent loads                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components Explained

### 1. **URL Candidate Priority System**

The system tries multiple URLs in order of priority:

```javascript
// Priority order (highest to lowest):
1. mapping.targetUrl      // If URL mapping exists (e.g., GA4 URL → actual URL)
2. mappingTargetUrl       // Direct mapping target
3. normalizedUrl          // Normalized/canonical URL
4. url                    // Original URL from actionables
5. sourceUrls[]          // All citation source URLs (from LLM responses)
```

**Why multiple candidates?**
- GA4 URLs might be different from actual page URLs
- URL mappings can redirect to correct pages
- Citation URLs from LLMs might be more accurate
- Fallback ensures we get content even if primary URL fails

### 2. **Puppeteer (Primary Method)**

**What is Puppeteer?**
- Headless Chrome browser automation
- Executes JavaScript (unlike simple HTTP requests)
- Renders pages exactly as a real browser would
- Can handle SPAs, dynamic content, lazy loading

**Configuration:**
```javascript
{
  headless: true,                    // No visible browser window
  args: [
    '--no-sandbox',                  // Required for some servers
    '--disable-setuid-sandbox',      // Security flags
    '--disable-dev-shm-usage',       // Memory optimization
    '--disable-gpu'                   // GPU not needed
  ]
}
```

**Wait Strategy:**
- `waitUntil: 'domcontentloaded'` - Waits for DOM to be ready (faster than `networkidle`)
- `timeout: 30000` - 30 seconds max wait
- Additional 500ms wait for dynamic content

**Why Puppeteer?**
- Handles JavaScript-rendered content (React, Vue, Angular)
- Gets content after client-side rendering
- More accurate content extraction
- Can interact with page if needed

### 3. **Cheerio (Fallback Method)**

**What is Cheerio?**
- Server-side HTML parser (like jQuery for Node.js)
- Fast and lightweight
- No browser needed
- Works on static HTML only

**When is it used?**
- If Puppeteer fails (timeout, error, missing dependencies)
- For static HTML pages (no JavaScript needed)
- Faster alternative when possible

**Limitations:**
- Cannot execute JavaScript
- Cannot handle client-side rendered content
- May miss dynamic content

### 4. **Content Extraction Logic**

**Content Root Selection:**
```javascript
// Priority order:
1. <article>           // Semantic HTML5 article element
2. <main>              // Main content area
3. [role="main"]      // ARIA main role
4. <body>             // Fallback to entire body
```

**Blocked Ancestors (Skipped):**
- Navigation elements: `header`, `nav`, `footer`, `aside`
- Common classes: `.navbar`, `.sidebar`, `.breadcrumb`
- Pattern matching: `[class*="footer"]`, `[id*="nav"]`

**Content Selectors:**
```javascript
'h1, h2, h3, h4, h5, h6,  // Headings
 p,                       // Paragraphs
 li,                      // List items
 blockquote'              // Blockquotes
```

**Text Validation:**
- **Headings**: Must have ≥2 words AND ≥8 characters
- **Paragraphs/Lists**: Must have ≥4 words OR ≥30 characters OR contain punctuation
- Filters out empty, meaningless, or navigation-only text

### 5. **Markdown Conversion**

**Block Type Mapping:**
```javascript
'h1' → '# Heading'
'h2' → '## Heading'
'h3' → '### Heading'
'p'  → 'Paragraph text'
'li' → '- Item' or '1. Item' (depending on listType)
'blockquote' → '> Quote text'
```

**List Handling:**
- Buffers consecutive list items
- Flushes when non-list element appears
- Preserves ordered (`1. 2. 3.`) vs unordered (`- - -`) types
- Handles list type changes (ordered → unordered)

---

## Example Flow

### Scenario: User clicks "Load Page Content" for a page

**Input:**
```javascript
{
  url: "https://www.fibr.ai/ab-testing/ab-testing-tools",
  normalizedUrl: "https://www.fibr.ai/ab-testing/ab-testing-tools",
  mapping: null,
  sourceUrls: [
    "https://www.fibr.ai/ab-testing/ab-testing-tools",
    "https://fibr.ai/ab-testing/ab-testing-tools"
  ]
}
```

**Step 1: URL Candidates**
```javascript
candidates = [
  { url: "https://www.fibr.ai/ab-testing/ab-testing-tools", label: "normalizedUrl" },
  { url: "https://www.fibr.ai/ab-testing/ab-testing-tools", label: "url" },
  { url: "https://www.fibr.ai/ab-testing/ab-testing-tools", label: "sourceUrl" },
  { url: "https://fibr.ai/ab-testing/ab-testing-tools", label: "sourceUrl" }
]
// Deduplicated to 2 unique URLs
```

**Step 2: Scraping Attempt**
```javascript
// Try first candidate
scrapeResult = await websiteAnalysisService.scrapeWebsite(
  "https://www.fibr.ai/ab-testing/ab-testing-tools"
)
// ✅ SUCCESS - breaks loop
```

**Step 3: Puppeteer Extraction**
```javascript
// Browser extracts:
{
  title: "7 Best AB Testing Tools in 2025 (Reviewed)",
  description: "Comprehensive review of top AB testing tools...",
  headings: {
    h1: ["7 Best AB Testing Tools in 2025 (Reviewed)"],
    h2: ["What is AB Testing?", "Top Tools", "Conclusion"],
    h3: ["Tool 1: Optimizely", "Tool 2: VWO", ...]
  },
  contentBlocks: [
    { type: "h1", text: "7 Best AB Testing Tools in 2025 (Reviewed)" },
    { type: "p", text: "AB testing is a crucial part of..." },
    { type: "h2", text: "What is AB Testing?" },
    { type: "p", text: "AB testing allows you to..." },
    { type: "li", text: "Optimizely - Enterprise-grade platform", listType: "unordered" },
    ...
  ],
  paragraphs: ["AB testing is...", "Optimizely provides...", ...]
}
```

**Step 4: Markdown Conversion**
```markdown
# 7 Best AB Testing Tools in 2025 (Reviewed)
_Source: [https://www.fibr.ai/ab-testing/ab-testing-tools](https://www.fibr.ai/ab-testing/ab-testing-tools)_

AB testing is a crucial part of...

## What is AB Testing?

AB testing allows you to...

- Optimizely - Enterprise-grade platform
- VWO - Visual editor for non-technical users
...

---
_Scraped at: 2025-01-10T12:34:56.789Z_
```

**Step 5: Response**
```javascript
{
  success: true,
  data: {
    markdown: "# 7 Best AB Testing Tools...",
    resolvedUrl: "https://www.fibr.ai/ab-testing/ab-testing-tools",
    metadata: { title: "...", headings: {...}, ... }
  }
}
```

---

## Error Handling

### If Puppeteer Fails:
1. Log error with URL and source label
2. Add to `scrapeErrors` array
3. Try next candidate URL
4. If all candidates fail, throw `AppError` with last error

### If All URLs Fail:
```javascript
throw new AppError(
  'Failed to load content. Last attempt (https://...) responded with: timeout',
  502,
  'SCRAPE_FAILED'
)
```

### Fallback Behavior:
- If Puppeteer fails, automatically tries Cheerio
- If Cheerio also fails, moves to next candidate URL
- Only fails if ALL candidates AND both methods fail

---

## Performance Considerations

**Puppeteer:**
- **Pros**: Handles JavaScript, accurate content
- **Cons**: Slower (~2-5 seconds), requires Chrome/Chromium
- **Timeout**: 30 seconds navigation + 500ms wait

**Cheerio:**
- **Pros**: Fast (~100-500ms), lightweight
- **Cons**: No JavaScript execution
- **Timeout**: 15 seconds HTTP request

**Optimization:**
- Tries fastest method first (Puppeteer for accuracy)
- Falls back to Cheerio if Puppeteer fails
- Caches results in frontend to avoid re-scraping

---

## Files Involved

1. **Frontend:**
   - `components/tabs/pages/PageList.tsx` - UI and API call
   - `services/api.ts` - API service wrapper

2. **Backend:**
   - `backend/src/routes/actionables.js` - Route handler and markdown conversion
   - `backend/src/services/websiteAnalysisService.js` - Puppeteer/Cheerio scraping

3. **Dependencies:**
   - `puppeteer` - Headless Chrome automation
   - `cheerio` - Server-side HTML parsing
   - `axios` - HTTP requests for fallback

---

## Summary

The scraping system uses a **robust, multi-tier approach**:

1. **Multiple URL candidates** - Tries different URL variations
2. **Puppeteer first** - Handles JavaScript-rendered content accurately
3. **Cheerio fallback** - Fast alternative for static pages
4. **Smart content extraction** - Filters navigation, validates meaningful text
5. **Markdown conversion** - Preserves structure (headings, lists, paragraphs)
6. **Error resilience** - Tries all candidates before failing

This ensures maximum success rate in extracting page content for content regeneration.

