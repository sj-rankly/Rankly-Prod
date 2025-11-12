/**
 * Brand name utility functions for generating short, readable brand names
 * 
 * This is a modular, reusable utility that can be used across:
 * - Insights generation (all tabs: visibility, prompts, sentiment, citations)
 * - Analytics and reporting
 * - Dashboard displays
 * - Any other module that needs shortened brand names
 * 
 * Features:
 * - Intelligent abbreviation (removes product suffixes, extracts company names)
 * - Optional custom mappings for specific brands
 * - Works generically for any brand name
 * - Configurable max length and behavior
 * 
 * Usage:
 *   const { getShortBrandName } = require('./utils/brandNameUtils');
 *   const shortName = getShortBrandName('American Express SmartEarn™ Credit Card');
 *   // Returns: 'Amex'
 */

/**
 * Common product suffixes to remove when generating short brand names
 */
const PRODUCT_SUFFIXES = [
  'Credit Card',
  'Corporate Card',
  'Business Card',
  'Card',
  'Credit',
  'Account',
  'Platform',
  'Service',
  'Solution',
  'System',
  'App',
  'Application',
  'Software',
  'Product',
  'Tool'
];

/**
 * Common company name abbreviations (optional override mapping)
 * Can be extended for specific brand preferences
 */
const BRAND_ABBREVIATIONS = {
  'American Express': 'Amex',
  'Amex': 'Amex',
  'Capital One': 'Capital One', // Keep full name if it's already short
  'Chase': 'Chase',
  'JPMorgan Chase': 'Chase',
  'JP Morgan': 'Chase',
  'Bank of America': 'BofA',
  'Wells Fargo': 'Wells Fargo', // Keep full name
  'Citibank': 'Citi',
  'Citi': 'Citi'
};

/**
 * Extract the main company/brand name from a full product name
 * @param {string} brandName - Full brand or product name
 * @returns {string} Main company/brand name
 */
function extractCompanyName(brandName) {
  if (!brandName || typeof brandName !== 'string') {
    return brandName || '';
  }

  let cleaned = brandName.trim();

  // Remove product suffixes (case-insensitive)
  for (const suffix of PRODUCT_SUFFIXES) {
    const regex = new RegExp(`\\s+${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(™|®|©)?$`, 'i');
    cleaned = cleaned.replace(regex, '').trim();
  }

  // Remove special characters at the end (™, ®, ©)
  cleaned = cleaned.replace(/[™®©]+$/g, '').trim();

  return cleaned;
}

/**
 * Generate a short, readable brand name for use in insights and reports
 * Intelligently shortens brand names while maintaining readability
 * 
 * @param {string} brandName - Full brand or product name
 * @param {Object} options - Optional configuration
 * @param {Object} options.customMappings - Custom brand name mappings (overrides defaults)
 * @param {number} options.maxLength - Maximum length for generated short name (default: 20)
 * @param {boolean} options.keepFullIfShort - Keep full name if already short (default: true)
 * @returns {string} Short, readable brand name
 * 
 * @example
 * getShortBrandName('American Express SmartEarn™ Credit Card') // Returns: 'Amex'
 * getShortBrandName('Capital One Spark Cash Plus') // Returns: 'Capital One'
 * getShortBrandName('itilite Corporate Card') // Returns: 'itilite'
 * getShortBrandName('Some Long Company Name Product') // Returns: 'Some Long Company'
 */
function getShortBrandName(brandName, options = {}) {
  if (!brandName || typeof brandName !== 'string') {
    return brandName || '';
  }

  const {
    customMappings = {},
    maxLength = 20,
    keepFullIfShort = true
  } = options;

  // Merge custom mappings with default abbreviations
  const mappings = { ...BRAND_ABBREVIATIONS, ...customMappings };

  // Check for exact match in mappings first
  if (mappings[brandName]) {
    return mappings[brandName];
  }

  // Extract company name (remove product suffixes)
  const companyName = extractCompanyName(brandName);

  // Check if extracted company name has a mapping
  if (mappings[companyName]) {
    return mappings[companyName];
  }

  // Check for partial matches in mappings (for cases like "American Express SmartEarn")
  for (const [key, value] of Object.entries(mappings)) {
    if (brandName.includes(key) || companyName.includes(key)) {
      return value;
    }
  }

  // If already short enough, return as-is
  if (keepFullIfShort && companyName.length <= maxLength) {
    return companyName;
  }

  // For longer names, use intelligent truncation
  const words = companyName.split(/\s+/);
  
  // If single word, truncate to maxLength
  if (words.length === 1) {
    return words[0].length > maxLength 
      ? words[0].substring(0, maxLength)
      : words[0];
  }

  // For multi-word names, prioritize first words
  // Try to fit as many complete words as possible within maxLength
  let result = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = result + ' ' + words[i];
    if (candidate.length <= maxLength) {
      result = candidate;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Batch process multiple brand names
 * @param {string[]} brandNames - Array of brand names
 * @param {Object} options - Same options as getShortBrandName
 * @returns {Object} Map of original brand names to short names
 */
function getShortBrandNames(brandNames, options = {}) {
  const result = {};
  
  if (!Array.isArray(brandNames)) {
    return result;
  }

  brandNames.forEach(brandName => {
    result[brandName] = getShortBrandName(brandName, options);
  });

  return result;
}

module.exports = {
  getShortBrandName,
  getShortBrandNames,
  extractCompanyName,
  BRAND_ABBREVIATIONS, // Export for potential customization
  PRODUCT_SUFFIXES // Export for potential customization
};

