/**
 * Citation extraction and categorization functions
 */

/**
 * Clean domain from URL
 */
function cleanDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").trim().toLowerCase();
  } catch {
    return url;
  }
}

/**
 * Extract all citations in response, categorizing as brand, competitor, social, or earned.
 * brandUrlsMap: {brandName: [domains]}
 * competitorUrlsMap: {brandName: [domains]}
 * socialDomains: array of domains (lowercase, strip www)
 *
 * Returns array of {url, type, brand (where relevant), text}
 */
function extractCategorizedCitations(response, { brandUrlsMap, competitorUrlsMap, socialDomains }) {
  if (!response) return [];
  const hyperlinkRegex = /\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
  let match;
  const result = [];

  while ((match = hyperlinkRegex.exec(response)) !== null) {
    const text = match[1];
    const url = match[2];
    const domain = cleanDomain(url);
    let type = 'earned';
    let brand = null;
    for (const [bname, domains] of Object.entries(brandUrlsMap)) {
      if (domains.some(d => d === domain)) {
        type = 'brand';
        brand = bname;
        break;
      }
    }
    if (type === 'earned') {
      for (const [cname, domains] of Object.entries(competitorUrlsMap)) {
        if (domains.some(d => d === domain)) {
          type = 'competitor';
          brand = cname;
          break;
        }
      }
    }
    if (type === 'earned' && socialDomains.includes(domain)) {
      type = 'social';
    }
    result.push({ url, type, brand, text });
  }
  return result;
}

/**
 * Filter citations to include only brand, competitor, social, or earned types
 * Return {type, url, brand, text} for each, excluding unknown/untyped citations
 */
function filterRelevantCitations(citations) {
  const allowed = new Set(['brand', 'competitor', 'social', 'earned']);
  return (citations || [])
    .filter(cit => cit && allowed.has(cit.type))
    .map(cit => ({
      type: cit.type,
      url: cit.url,
      text: cit.text || '',
      brand: cit.brand || null,
    }));
}

/**
 * Extract hyperlinks that mention a specific brand
 * @param {object} brandData - Brand data object
 * @param {string} response - LLM response text
 * @returns {number} - Number of hyperlinks mentioning the brand
 */
function extractBrandHyperlinks(brandData, response) {
  if (!response || !brandData) return 0;
  
  const brandName = brandData.brandName;
  const hyperlinkRegex = /\[([^\]]*)\]\(https?:\/\/[^\)]+\)/g;
  let brandHyperlinkCount = 0;
  let match;
  
  // Find all hyperlinks in the response
  while ((match = hyperlinkRegex.exec(response)) !== null) {
    const linkText = match[1].toLowerCase();
    const fullMatch = match[0];
    
    // Check if the link text or surrounding context mentions the brand
    if (linkText.includes(brandName.toLowerCase()) || 
        fullMatch.toLowerCase().includes(brandName.toLowerCase())) {
      brandHyperlinkCount++;
    }
  }
  
  console.log(`   🔗 [HYPERLINKS] Found ${brandHyperlinkCount} hyperlinks for brand: ${brandName}`);
  return brandHyperlinkCount;
}

/**
 * Extract total number of hyperlinks across all brands
 * @param {array} allBrandMetrics - All brand metrics
 * @param {string} responseText - Full response text
 * @returns {number} - Total number of hyperlinks
 */
function extractTotalHyperlinks(allBrandMetrics, responseText) {
  if (!responseText) return 0;
  
  const hyperlinkRegex = /\[([^\]]*)\]\(https?:\/\/[^\)]+\)/g;
  const matches = responseText.match(hyperlinkRegex);
  const totalHyperlinks = matches ? matches.length : 0;
  
  console.log(`   🔗 [HYPERLINKS] Found ${totalHyperlinks} total hyperlinks in response`);
  return totalHyperlinks;
}

module.exports = {
  extractCategorizedCitations,
  filterRelevantCitations,
  extractBrandHyperlinks,
  extractTotalHyperlinks,
  cleanDomain
};


