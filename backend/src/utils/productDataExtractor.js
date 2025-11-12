/**
 * Product Data Extractor
 * Extracts product-specific information from scraped website data
 */

class ProductDataExtractor {
  /**
   * Extract product name from website data
   * @param {object} websiteData - Scraped website data
   * @param {object} urlContext - URL context from UrlAnalysisHelper
   * @returns {string} - Extracted product name
   */
  static extractProductName(websiteData, urlContext) {
    // Extract brand name via multiple strategies
    let brand = '';
    // Try direct extraction from businessInfo
    if (websiteData.businessInfo?.companyName) {
      brand = websiteData.businessInfo.companyName.trim();
    } else if (urlContext?.brandName || urlContext?.companyName) {
      brand = (urlContext.brandName || urlContext.companyName).trim();
    }
    // If brand still missing, extract from domain (preferably from the original input URL)
    if (!brand) {
      let urlForDomain = urlContext?.url || urlContext?.originalUrl || urlContext?.baseUrl;
      if (!urlForDomain && typeof window !== 'undefined') urlForDomain = window.location.href;
      let hostname = '';
      try {
        if (urlForDomain) {
          hostname = new URL(urlForDomain).hostname.replace(/^www\./, '');
        }
      } catch { }
      const domainMap = {
        'hdfcbank.com': 'HDFC Bank',
        'icicibank.com': 'ICICI Bank',
        'axisbank.com': 'Axis Bank',
        'yesbank.in': 'YES Bank',
        'sbi.co.in': 'SBI',
        'kotak.com': 'Kotak Bank',
        'bankofbaroda.in': 'Bank of Baroda',
      }
      if (domainMap[hostname]) {
        brand = domainMap[hostname];
      } else if (hostname) {
        brand = hostname.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      } else {
        console.log('[PRODUCT EXTRACT] WARNING: Could not determine hostname for brand fallback!');
      }
    }
    let product = '';
    // Priority 1: H1 heading (most likely product name)
    if (websiteData.headings?.h1?.length > 0) {
      const h1 = websiteData.headings.h1[0];
      if (h1 && h1.length < 100) {
        product = h1.trim();
      }
    }
    // Priority 2: Page title
    if (!product && websiteData.title && websiteData.title.length < 150) {
      product = websiteData.title.replace(/\s*[-|–]\s*.+$/, '').trim();
    }
    // Priority 3: URL-based name
    if (!product && urlContext?.productContext?.productName) {
      product = urlContext.productContext.productName;
    }
    if (!product) product = 'Unknown Product';
    // Remove accidental double-up: if product starts with brand, don't prepend
    if (brand && !product.toLowerCase().startsWith(brand.toLowerCase())) {
      const fullName = `${brand} ${product}`;
      console.log(`[PRODUCT EXTRACT] Brand (after all fallback): "${brand}" | Product extracted: "${product}"`);
      console.log(`[PRODUCT EXTRACT] Final full product name: "${fullName}"`);
      return fullName;
    }
    console.log(`[PRODUCT EXTRACT] Brand (after all fallback): "${brand}" | Product extracted: "${product}"`);
    console.log(`[PRODUCT EXTRACT] Final product name (brand already present or missing): "${product}"`);
    return product;
  }

  /**
   * Extract product features from website data
   * @param {object} websiteData - Scraped website data
   * @returns {array} - Extracted features
   */
  static extractProductFeatures(websiteData) {
    const features = [];

    // Look for common feature indicators
    const featureKeywords = [
      'feature', 'benefit', 'advantage', 'includes', 'offers',
      'key features', 'highlights', 'what you get', 'why choose'
    ];

    // Extract from headings
    if (websiteData.headings) {
      const allHeadings = [
        ...(websiteData.headings.h2 || []),
        ...(websiteData.headings.h3 || [])
      ];

      allHeadings.forEach(heading => {
        const lowerHeading = heading.toLowerCase();
        if (featureKeywords.some(keyword => lowerHeading.includes(keyword))) {
          features.push(heading);
        }
      });
    }

    // Extract from list items (common pattern for features)
    // This would require more sophisticated parsing in the scraping phase

    // Extract from paragraphs that mention features
    if (websiteData.paragraphs && websiteData.paragraphs.length > 0) {
      websiteData.paragraphs.slice(0, 10).forEach(para => {
        const lowerPara = para.toLowerCase();
        if (featureKeywords.some(keyword => lowerPara.includes(keyword))) {
          // Extract key points (simplified - could be more sophisticated)
          const sentences = para.split(/[.!?]/).filter(s => s.trim().length > 10);
          features.push(...sentences.slice(0, 2)); // Take first 2 sentences
        }
      });
    }

    // Deduplicate and limit
    return [...new Set(features)].slice(0, 10);
  }

  /**
   * Extract pricing information from website data
   * @param {object} websiteData - Scraped website data
   * @returns {object} - Extracted pricing info
   */
  static extractPricing(websiteData) {
    const pricing = {
      found: false,
      currency: '',
      amount: '',
      period: '',
      details: []
    };

    // Common pricing patterns
    const pricingPatterns = {
      currency: /[$€£₹¥]/g,
      amount: /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
      period: /\b(?:per|\/)\s*(?:month|year|day|week|annually|monthly)\b/gi
    };

    // Search in paragraphs
    if (websiteData.paragraphs && websiteData.paragraphs.length > 0) {
      websiteData.paragraphs.slice(0, 15).forEach(para => {
        const lowerPara = para.toLowerCase();
        
        // Look for pricing keywords
        if (lowerPara.includes('price') || 
            lowerPara.includes('cost') || 
            lowerPara.includes('rate') ||
            lowerPara.includes('fee') ||
            lowerPara.includes('interest') ||
            pricingPatterns.currency.test(para)) {
          
          pricing.found = true;
          pricing.details.push(para);

          // Extract currency
          const currencyMatch = para.match(pricingPatterns.currency);
          if (currencyMatch) {
            pricing.currency = currencyMatch[0];
          }

          // Extract amount
          const amountMatch = para.match(pricingPatterns.amount);
          if (amountMatch) {
            pricing.amount = amountMatch[0];
          }

          // Extract period
          const periodMatch = para.match(pricingPatterns.period);
          if (periodMatch) {
            pricing.period = periodMatch[0];
          }
        }
      });
    }

    // Search in headings
    if (websiteData.headings) {
      const allHeadings = [
        ...(websiteData.headings.h1 || []),
        ...(websiteData.headings.h2 || []),
        ...(websiteData.headings.h3 || [])
      ];

      allHeadings.forEach(heading => {
        const lowerHeading = heading.toLowerCase();
        if (lowerHeading.includes('price') || 
            lowerHeading.includes('pricing') ||
            lowerHeading.includes('cost') ||
            pricingPatterns.currency.test(heading)) {
          pricing.found = true;
          pricing.details.push(heading);
        }
      });
    }

    // Limit details
    pricing.details = [...new Set(pricing.details)].slice(0, 5);

    return pricing;
  }

  /**
   * Extract use cases from website data
   * @param {object} websiteData - Scraped website data
   * @returns {array} - Extracted use cases
   */
  static extractUseCases(websiteData) {
    const useCases = [];

    // Look for use case indicators
    const useCaseKeywords = [
      'use case', 'ideal for', 'perfect for', 'best for',
      'who should', 'suitable for', 'designed for',
      'great for', 'recommended for', 'for people who'
    ];

    // Extract from headings
    if (websiteData.headings) {
      const allHeadings = [
        ...(websiteData.headings.h2 || []),
        ...(websiteData.headings.h3 || [])
      ];

      allHeadings.forEach(heading => {
        const lowerHeading = heading.toLowerCase();
        if (useCaseKeywords.some(keyword => lowerHeading.includes(keyword))) {
          useCases.push(heading);
        }
      });
    }

    // Extract from paragraphs
    if (websiteData.paragraphs && websiteData.paragraphs.length > 0) {
      websiteData.paragraphs.slice(0, 10).forEach(para => {
        const lowerPara = para.toLowerCase();
        if (useCaseKeywords.some(keyword => lowerPara.includes(keyword))) {
          useCases.push(para);
        }
      });
    }

    // Deduplicate and limit
    return [...new Set(useCases)].slice(0, 8);
  }

  /**
   * Extract product description
   * @param {object} websiteData - Scraped website data
   * @returns {string} - Product description
   */
  static extractProductDescription(websiteData) {
    // Priority 1: Meta description
    if (websiteData.description && websiteData.description.length > 20) {
      return websiteData.description;
    }

    // Priority 2: First substantial paragraph
    if (websiteData.paragraphs && websiteData.paragraphs.length > 0) {
      const firstPara = websiteData.paragraphs.find(p => p.length > 50);
      if (firstPara) {
        return firstPara.slice(0, 500); // Limit length
      }
    }

    // Priority 3: Tagline
    if (websiteData.businessInfo?.tagline) {
      return websiteData.businessInfo.tagline;
    }

    return '';
  }

  /**
   * Extract complete product data
   * @param {object} websiteData - Scraped website data
   * @param {object} urlContext - URL context from UrlAnalysisHelper
   * @returns {object} - Complete product data
   */
  static extractProductData(websiteData, urlContext) {
    console.log('📦 [PRODUCT EXTRACTOR] Extracting product-specific data...');

    const productData = {
      productName: this.extractProductName(websiteData, urlContext),
      productType: urlContext?.productContext?.productType || 'general',
      description: this.extractProductDescription(websiteData),
      features: this.extractProductFeatures(websiteData),
      pricing: this.extractPricing(websiteData),
      useCases: this.extractUseCases(websiteData),
      urlContext: urlContext?.productContext || {}
    };

    console.log('✅ [PRODUCT EXTRACTOR] Extracted product data:');
    console.log(`   📝 Product Name: ${productData.productName}`);
    console.log(`   🏷️  Product Type: ${productData.productType}`);
    console.log(`   ⭐ Features: ${productData.features.length} found`);
    console.log(`   💰 Pricing: ${productData.pricing.found ? 'Found' : 'Not found'}`);
    console.log(`   🎯 Use Cases: ${productData.useCases.length} found`);

    return productData;
  }

  /**
   * Extract category data for category-level pages
   * @param {object} websiteData - Scraped website data
   * @param {object} urlContext - URL context from UrlAnalysisHelper
   * @returns {object} - Category data
   */
  static extractCategoryData(websiteData, urlContext) {
    console.log('📂 [CATEGORY EXTRACTOR] Extracting category-level data...');

    const categoryData = {
      categoryName: urlContext?.categoryContext?.categoryName || this.extractProductName(websiteData, urlContext),
      description: this.extractProductDescription(websiteData),
      subcategories: [],
      urlContext: urlContext?.categoryContext || {}
    };

    // Extract subcategories from navigation or headings
    if (websiteData.headings?.h2) {
      categoryData.subcategories = websiteData.headings.h2.slice(0, 10);
    }

    console.log('✅ [CATEGORY EXTRACTOR] Extracted category data:');
    console.log(`   📂 Category Name: ${categoryData.categoryName}`);
    console.log(`   📑 Subcategories: ${categoryData.subcategories.length} found`);

    return categoryData;
  }
}

module.exports = ProductDataExtractor;

