/**
 * URL Analysis Helper Utility
 * Detects the type of URL (product/category/company) and extracts context
 */

class UrlAnalysisHelper {
  /**
   * Detect the analysis level based on URL patterns
   * @param {string} url - The URL to analyze
   * @returns {string} - 'product', 'category', or 'company'
   */
  static detectAnalysisLevel(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const hostname = urlObj.hostname.toLowerCase();

      // Product page patterns - very specific pages about a single product/service
      const productPatterns = [
        /\/product\//,
        /\/products\/[^\/]+$/,
        /\/item\//,
        /\/service\/[^\/]+$/,
        /\/loan\/[^\/]+$/,
        /\/loans\/[^\/]+$/,
        /\/credit-card\/[^\/]+$/,
        /\/mortgage\/[^\/]+$/,
        /\/insurance\/[^\/]+$/,
        /\/plan\/[^\/]+$/,
        /\/pricing\/[^\/]+$/,
        /\/buy\//,
        /\/shop\/[^\/]+$/,
        /-loan$/,
        /-card$/,
        /-insurance$/,
        /personal-loan/,
        /home-loan/,
        /car-loan/,
        /business-loan/,
        /credit-card/,
        /savings-account/,
        /current-account/,
        /fixed-deposit/,
        /mutual-fund/
      ];

      // Category page patterns - listing multiple products/services
      const categoryPatterns = [
        /\/category\//,
        /\/categories\//,
        /\/services\/?$/,
        /\/products\/?$/,
        /\/solutions\/?$/,
        /\/loans\/?$/,
        /\/cards\/?$/,
        /\/insurance\/?$/,
        /\/deposits\/?$/,
        /\/investments\/?$/,
        /\/collection\//,
        /\/browse\//
      ];

      // Homepage/Company patterns
      const homepagePatterns = [
        /^\/?$/,
        /^\/home\/?$/,
        /^\/about\/?$/,
        /^\/about-us\/?$/,
        /^\/company\/?$/,
        /^\/index/
      ];

      // Check patterns in order of specificity
      if (productPatterns.some(pattern => pattern.test(pathname))) {
        console.log(`🎯 [URL ANALYSIS] Detected PRODUCT level: ${url}`);
        return 'product';
      }

      if (categoryPatterns.some(pattern => pattern.test(pathname))) {
        console.log(`📂 [URL ANALYSIS] Detected CATEGORY level: ${url}`);
        return 'category';
      }

      if (homepagePatterns.some(pattern => pattern.test(pathname))) {
        console.log(`🏢 [URL ANALYSIS] Detected COMPANY level (homepage): ${url}`);
        return 'company';
      }

      // If URL has 3+ path segments, likely a specific page/product
      const pathSegments = pathname.split('/').filter(seg => seg.length > 0);
      if (pathSegments.length >= 3) {
        console.log(`🎯 [URL ANALYSIS] Detected PRODUCT level (deep path): ${url}`);
        return 'product';
      }

      // If URL has 1-2 path segments, likely category or general page
      if (pathSegments.length >= 1 && pathSegments.length <= 2) {
        console.log(`📂 [URL ANALYSIS] Detected CATEGORY level (shallow path): ${url}`);
        return 'category';
      }

      // Default to company level
      console.log(`🏢 [URL ANALYSIS] Detected COMPANY level (default): ${url}`);
      return 'company';

    } catch (error) {
      console.error('❌ Error detecting URL analysis level:', error);
      return 'company'; // Safe fallback
    }
  }

  /**
   * Extract product-specific context from URL
   * @param {string} url - The URL to analyze
   * @returns {object} - Product context information
   */
  static extractProductContext(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const pathSegments = pathname.split('/').filter(seg => seg.length > 0);

      // Extract product name from URL
      const productSlug = pathSegments[pathSegments.length - 1] || '';
      const productName = this.slugToTitle(productSlug);

      // Detect product type from URL keywords
      const productType = this.detectProductType(pathname);

      return {
        productSlug,
        productName,
        productType,
        pathSegments,
        fullPath: pathname
      };

    } catch (error) {
      console.error('❌ Error extracting product context:', error);
      return {
        productSlug: '',
        productName: '',
        productType: 'general',
        pathSegments: [],
        fullPath: ''
      };
    }
  }

  /**
   * Convert URL slug to readable title
   * @param {string} slug - URL slug
   * @returns {string} - Readable title
   */
  static slugToTitle(slug) {
    return slug
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();
  }

  /**
   * Detect product type from URL patterns
   * @param {string} pathname - URL pathname
   * @returns {string} - Product type
   */
  static detectProductType(pathname) {
    const typePatterns = {
      'personal-loan': /personal[-_]?loan/,
      'home-loan': /home[-_]?loan|mortgage/,
      'car-loan': /car[-_]?loan|auto[-_]?loan|vehicle[-_]?loan/,
      'business-loan': /business[-_]?loan|commercial[-_]?loan/,
      'education-loan': /education[-_]?loan|student[-_]?loan/,
      'credit-card': /credit[-_]?card/,
      'debit-card': /debit[-_]?card/,
      'savings-account': /savings[-_]?account/,
      'current-account': /current[-_]?account|checking[-_]?account/,
      'fixed-deposit': /fixed[-_]?deposit|fd|term[-_]?deposit/,
      'recurring-deposit': /recurring[-_]?deposit|rd/,
      'mutual-fund': /mutual[-_]?fund|mf/,
      'insurance': /insurance|policy/,
      'investment': /investment|invest/,
      'general': /.*/
    };

    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(pathname)) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Extract category context from URL
   * @param {string} url - The URL to analyze
   * @returns {object} - Category context information
   */
  static extractCategoryContext(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const pathSegments = pathname.split('/').filter(seg => seg.length > 0);

      // Extract category name from URL
      const categorySlug = pathSegments[pathSegments.length - 1] || pathSegments[0] || '';
      const categoryName = this.slugToTitle(categorySlug);

      return {
        categorySlug,
        categoryName,
        pathSegments,
        fullPath: pathname
      };

    } catch (error) {
      console.error('❌ Error extracting category context:', error);
      return {
        categorySlug: '',
        categoryName: '',
        pathSegments: [],
        fullPath: ''
      };
    }
  }

  /**
   * Get analysis context based on URL level
   * @param {string} url - The URL to analyze
   * @returns {object} - Complete analysis context
   */
  static getAnalysisContext(url) {
    const level = this.detectAnalysisLevel(url);
    
    let context = {
      url,
      analysisLevel: level
    };

    if (level === 'product') {
      context.productContext = this.extractProductContext(url);
    } else if (level === 'category') {
      context.categoryContext = this.extractCategoryContext(url);
    }

    return context;
  }
}

module.exports = UrlAnalysisHelper;

