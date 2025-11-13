/**
 * Citation Classification Service V2 - Enhanced
 * Implements zero-error approach with multiple verification layers
 * 
 * Improvements over V1:
 * - Comprehensive TLD validation using Public Suffix List approach
 * - Enhanced common words filtering (100+ words)
 * - URL shortener detection and flagging
 * - Multi-dimensional confidence scoring
 * - Better internationalization support
 * - Competitor domain cross-checking
 * - Verified domain list support
 * - Context-aware hints
 * - Improved fuzzy matching with stricter thresholds
 */

const brandPatternService = require('./brandPatternService');

/**
 * CONFIDENCE THRESHOLDS
 * Philosophy: Not all citations need to be classified. Better to ignore uncertain
 * citations than to misclassify them. Only classify when confident.
 * 
 * Usage in calling code:
 *   const result = citationService.categorizeCitation(...);
 *   if (result.confidence.overall < CitationClassificationServiceV2.CONFIDENCE_THRESHOLDS.IGNORE_BELOW) {
 *     // Ignore this citation - too uncertain
 *     return null;
 *   }
 */
class CitationClassificationServiceV2 {
  static CONFIDENCE_THRESHOLDS = {
    BRAND: 0.85,    // High confidence required for brand classification
    SOCIAL: 0.90,   // Very high confidence for social (clear patterns)
    EARNED: 0.60,   // Moderate confidence for earned (broader category)
    IGNORE_BELOW: 0.50  // Ignore any citation below this threshold (too noisy)
  };

  constructor() {
    // Comprehensive list of valid TLDs (top 200+ most common)
    // In production, this should be loaded from Public Suffix List
    this.validTLDs = new Set([
      // Generic TLDs
      'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
      'info', 'biz', 'name', 'pro', 'aero', 'asia', 'cat',
      'coop', 'jobs', 'mobi', 'museum', 'tel', 'travel',
      'xxx', 'app', 'dev', 'page', 'how', 'blog', 'cloud',
      'store', 'shop', 'online', 'site', 'tech', 'digital',
      
      // Country TLDs (major markets)
      'us', 'uk', 'ca', 'au', 'de', 'fr', 'it', 'es', 'nl',
      'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', 'pl', 'cz',
      'gr', 'pt', 'ie', 'jp', 'cn', 'kr', 'sg', 'hk', 'tw',
      'in', 'pk', 'bd', 'lk', 'np', 'mm', 'id', 'my', 'th',
      'vn', 'ph', 'br', 'mx', 'ar', 'cl', 'co', 'pe', 've',
      'za', 'ng', 'eg', 'ke', 'ma', 'tz', 'ug', 'gh', 'zm',
      'ru', 'ua', 'by', 'kz', 'uz', 'am', 'ge', 'az', 'kg',
      'il', 'sa', 'ae', 'kw', 'qa', 'om', 'bh', 'jo', 'lb',
      'nz', 'fj', 'pg', 'ws', 'to', 'tv',
      
      // Two-part TLDs (common)
      'co.uk', 'co.in', 'co.za', 'co.kr', 'co.jp', 'co.nz',
      'com.au', 'com.br', 'com.mx', 'com.ar', 'com.tr',
      'org.uk', 'net.au', 'gov.uk', 'ac.uk', 'edu.au',
      
      // New gTLDs (popular ones)
      'io', 'ai', 'co', 'me', 'tv', 'cc', 'ws', 'to',
      'ly', 'gl', 'gg', 'je', 'im', 'sh', 'ac', 'ag'
    ]);
    
    // URL shortener domains
    this.urlShorteners = new Set([
      'bit.ly', 'bitly.com', 'tinyurl.com', 'ow.ly', 'tiny.cc',
      't.co', 'goo.gl', 'buff.ly', 'adf.ly', 'is.gd', 'cli.gs',
      'short.io', 'rebrand.ly', 'cutt.ly', 'short.cm', 'bl.ink',
      's.id', 'clk.sh', 'v.gd', 'tr.im', 'lnkd.in'
    ]);
    
    // Expanded common words list (100+ words)
    this.commonWords = new Set([
      // Articles & prepositions
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
      'was', 'are', 'were', 'be', 'been', 'being',
      
      // Common verbs
      'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'get', 'got', 'find', 'found', 'make', 'made',
      'take', 'give', 'buy', 'sell', 'shop', 'save', 'go',
      
      // Corporate terms
      'company', 'inc', 'incorporated', 'corp', 'corporation',
      'ltd', 'limited', 'llc', 'plc', 'group', 'holdings',
      'enterprises', 'industries', 'international', 'global',
      'worldwide', 'national', 'regional', 'local',
      
      // Financial terms
      'bank', 'banking', 'card', 'credit', 'debit', 'prepaid',
      'loan', 'loans', 'mortgage', 'insurance', 'invest',
      'investment', 'finance', 'financial', 'capital', 'fund',
      'funds', 'money', 'cash', 'payment', 'pay', 'wallet',
      'rewards', 'cashback', 'points', 'miles', 'bonus',
      
      // Tech terms
      'app', 'apps', 'software', 'platform', 'tool', 'tools',
      'tech', 'technology', 'digital', 'online', 'web', 'site',
      'website', 'internet', 'cloud', 'data', 'analytics',
      'system', 'systems', 'solution', 'solutions', 'service',
      'services', 'network', 'mobile', 'desktop',
      
      // Business terms
      'business', 'enterprise', 'small', 'medium', 'large',
      'startup', 'agency', 'firm', 'office', 'store', 'shop',
      'market', 'marketplace', 'trading', 'trade',
      
      // Generic adjectives
      'best', 'top', 'leading', 'premier', 'first', 'trusted',
      'secure', 'safe', 'fast', 'quick', 'easy', 'simple',
      'smart', 'new', 'old', 'big', 'small', 'great', 'good',
      'better', 'best', 'free', 'premium', 'pro', 'plus',
      
      // Numbers & ordinals
      'one', 'two', 'three', 'four', 'five', 'first', 'second',
      'third', 'single', 'double', 'triple', 'multi', 'all',
      
      // Action words
      'click', 'start', 'begin', 'learn', 'discover', 'explore',
      'join', 'sign', 'signup', 'login', 'register', 'download',
      'upload', 'share', 'connect', 'follow', 'subscribe'
    ]);
  }

  /**
   * Validate TLD against known list
   * @param {string} tld - Top-level domain
   * @returns {boolean} - True if valid TLD
   */
  isValidTLD(tld) {
    if (!tld) return false;
    
    // Normalize TLD (lowercase, remove leading dot)
    const normalizedTLD = tld.toLowerCase().replace(/^\./, '');
    
    // Check single TLD (e.g., 'com')
    if (this.validTLDs.has(normalizedTLD)) {
      return true;
    }
    
    // Check two-part TLD (e.g., 'co.uk')
    const parts = normalizedTLD.split('.');
    if (parts.length === 2) {
      const twoPartTLD = `${parts[0]}.${parts[1]}`;
      if (this.validTLDs.has(twoPartTLD)) {
        return true;
      }
    }
    
    // Check if it's a valid single-letter TLD (new gTLDs)
    if (normalizedTLD.length === 2 && /^[a-z]{2}$/.test(normalizedTLD)) {
      return true; // Most 2-letter TLDs are country codes
    }
    
    return false;
  }

  /**
   * Detect if domain is a URL shortener
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if URL shortener
   */
  isUrlShortener(domain) {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    return this.urlShorteners.has(normalizedDomain);
  }

  /**
   * Extract TLD from domain (handles multi-part TLDs like co.uk)
   * @param {string} domain - Domain name
   * @returns {string} - TLD
   */
  extractTLD(domain) {
    const parts = domain.split('.');
    
    // Check for two-part TLD first (e.g., co.uk, com.au)
    if (parts.length >= 2) {
      const twoPartTLD = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      if (this.validTLDs.has(twoPartTLD)) {
        return twoPartTLD;
      }
    }
    
    // Single TLD
    return parts[parts.length - 1];
  }

  /**
   * Clean and validate a URL - ENHANCED VERSION
   * @param {string} url - Raw URL string
   * @returns {object} - Enhanced validation result
   */
  cleanAndValidateUrl(url) {
    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        cleanedUrl: null,
        domain: null,
        flags: ['invalid_input']
      };
    }
    
    // Handle citation markers (e.g., "citation_1", "citation_2")
    if (url.startsWith('citation_')) {
      return {
        valid: false,
        cleanedUrl: null,
        domain: null,
        flags: ['citation_marker']
      };
    }
    
    // Remove trailing punctuation from markdown links: ) ] } etc.
    let cleanUrl = url.replace(/[)\\].,;!?]+$/, '').trim();
    
    // Validate URL format - must start with http:// or https://
    if (!cleanUrl.match(/^https?:\/\//i)) {
      // Try to add https:// if missing
      if (cleanUrl.match(/^[a-z0-9.-]+\.[a-z]{2,}/i)) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        return {
          valid: false,
          cleanedUrl: null,
          domain: null,
          flags: ['invalid_format']
        };
      }
    }
    
    // Flags for special cases
    const flags = [];
    
    // Validate URL using URL constructor
    let domain = '';
    let tld = '';
    
    try {
      const urlObj = new URL(cleanUrl);
      domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      tld = this.extractTLD(domain);
      
      // Flag URL shorteners
      if (this.isUrlShortener(domain)) {
        flags.push('url_shortener');
      }
      
      // Validate TLD
      if (!this.isValidTLD(tld)) {
        flags.push('unknown_tld');
        return {
          valid: false,
          cleanedUrl: cleanUrl,
          domain: domain,
          flags: flags
        };
      }
      
      // Validate IP addresses - reject invalid/non-routable IPs
      const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipMatch = domain.match(ipPattern);
      
      if (ipMatch) {
        flags.push('ip_address');
        const octets = ipMatch.slice(1, 5).map(Number);
        
        // Check for invalid IP ranges
        if (octets[0] === 0 || octets[0] === 127 ||
            (octets[0] === 169 && octets[1] === 254) ||
            (octets[0] >= 224 && octets[0] <= 239) ||
            (octets[0] >= 240) ||
            (octets[0] === 255 && octets[1] === 255 && octets[2] === 255 && octets[3] === 255)) {
          flags.push('invalid_ip_range');
          return {
            valid: false,
            cleanedUrl: cleanUrl,
            domain: domain,
            flags: flags
          };
        }
        
        // Validate octet ranges (0-255)
        if (octets.some(octet => octet < 0 || octet > 255)) {
          flags.push('invalid_ip_octet');
          return {
            valid: false,
            cleanedUrl: cleanUrl,
            domain: domain,
            flags: flags
          };
        }
      }
      
      // Additional validation: check for invalid domains
      if (domain === 'localhost' ||
          domain.includes('..') ||
          domain.startsWith('.') ||
          domain.endsWith('.')) {
        flags.push('invalid_domain_format');
        return {
          valid: false,
          cleanedUrl: cleanUrl,
          domain: domain,
          flags: flags
        };
      }
      
      // Check if domain looks valid (has at least one dot and TLD, or is a valid IP)
      if (!ipMatch) {
        if (!domain.includes('.') || domain.split('.').length < 2) {
          flags.push('missing_tld');
          return {
            valid: false,
            cleanedUrl: cleanUrl,
            domain: domain,
            flags: flags
          };
        }
        
        // Check TLD is valid (at least 2 characters, alphanumeric)
        const parts = domain.split('.');
        const extractedTLD = parts[parts.length - 1];
        if (!extractedTLD || extractedTLD.length < 2 || !/^[a-z0-9-]+$/i.test(extractedTLD)) {
          flags.push('invalid_tld_format');
          return {
            valid: false,
            cleanedUrl: cleanUrl,
            domain: domain,
            flags: flags
          };
        }
      }
      
      return {
        valid: true,
        cleanedUrl: cleanUrl,
        domain: domain,
        tld: tld,
        flags: flags
      };
      
    } catch (e) {
      // Try fallback extraction
      const match = cleanUrl.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/);
      if (match && match[1]) {
        domain = match[1].replace(/^www\./, '').toLowerCase();
        tld = this.extractTLD(domain);
        
        // Validate TLD in fallback
        if (!this.isValidTLD(tld)) {
          flags.push('unknown_tld');
          return {
            valid: false,
            cleanedUrl: cleanUrl,
            domain: domain,
            flags: flags
          };
        }
        
        // Flag URL shorteners in fallback
        if (this.isUrlShortener(domain)) {
          flags.push('url_shortener');
        }
        
        // Validate IP addresses in fallback too
        const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipMatch = domain.match(ipPattern);
        
        if (ipMatch) {
          flags.push('ip_address');
          const octets = ipMatch.slice(1, 5).map(Number);
          
          // Reject invalid IP ranges (same validation as above)
          if (octets[0] === 0 || octets[0] === 127 ||
              (octets[0] === 169 && octets[1] === 254) ||
              (octets[0] >= 224 && octets[0] <= 239) ||
              (octets[0] >= 240) ||
              (octets[0] === 255 && octets[1] === 255 && octets[2] === 255 && octets[3] === 255) ||
              octets.some(octet => octet < 0 || octet > 255)) {
            flags.push('invalid_ip_range');
            return {
              valid: false,
              cleanedUrl: cleanUrl,
              domain: domain,
              flags: flags
            };
          }
        }
        
        if (domain && domain.includes('.')) {
          // Additional validation for domain names
          if (domain === 'localhost' || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
            flags.push('invalid_domain_format');
            return {
              valid: false,
              cleanedUrl: cleanUrl,
              domain: domain,
              flags: flags
            };
          }
          
          return {
            valid: true,
            cleanedUrl: cleanUrl,
            domain: domain,
            tld: tld,
            flags: flags
          };
        }
      }
      
      return {
        valid: false,
        cleanedUrl: null,
        domain: null,
        flags: ['parse_error']
      };
    }
  }

  /**
   * Check if a word is a common word (enhanced list)
   * @param {string} word - Word to check
   * @returns {boolean} - True if common word
   */
  isCommonWord(word) {
    if (!word || word.length < 2) return true;
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.commonWords.has(normalized);
  }

  /**
   * Categorize a citation by type - ENHANCED VERSION
   * @param {string} url - Citation URL
   * @param {string} brandName - Brand to check for
   * @param {Array} allBrands - All brands (including competitors)
   * @param {Array} verifiedDomains - Optional: User-provided verified domains
   * @param {object} context - Optional: Citation context for enhanced classification
   * @returns {object} - Enhanced classification result
   */
  categorizeCitation(url, brandName, allBrands = [], verifiedDomains = [], context = {}) {
    // Clean and validate URL first
    const urlValidation = this.cleanAndValidateUrl(url);
    
    if (!urlValidation.valid || !urlValidation.domain) {
      return {
        type: 'unknown',
        brand: null,
        confidence: {
          overall: 0.0,
          dimensions: {
            domainMatch: 0.0,
            verification: 0.0,
            contextRelevance: 0.0
          }
        },
        flags: urlValidation.flags || ['invalid'],
        metadata: {
          reason: 'Invalid or unparseable URL'
        }
      };
    }
    
    const domain = urlValidation.domain;
    const flags = urlValidation.flags || [];
    
    // Handle URL shorteners - flag as uncertain
    if (flags.includes('url_shortener')) {
      return {
        type: 'unknown',
        brand: null,
        confidence: {
          overall: 0.0,
          dimensions: {
            domainMatch: 0.0,
            verification: 0.0,
            contextRelevance: 0.0
          }
        },
        flags: flags,
        metadata: {
          reason: 'URL shortener - cannot classify without resolution',
          suggestion: 'Resolve shortener to get actual URL'
        }
      };
    }
    
    // 1. Check verified domains first (highest confidence)
    if (verifiedDomains && verifiedDomains.length > 0) {
      const verifiedClassification = this.checkVerifiedDomains(domain, brandName, verifiedDomains);
      if (verifiedClassification) {
        return {
          ...verifiedClassification,
          flags: flags
        };
      }
    }
    
    // 2. Check for Brand citations (official brand-owned sources)
    const brandClassification = this.classifyBrandCitation(domain, allBrands, brandName);
    if (brandClassification.type === 'brand' && brandClassification.brand === brandName) {
      return {
        ...brandClassification,
        flags: flags
      };
    }
    
    // 3. Check for Social citations (community-driven mentions)
    const socialClassification = this.classifySocialCitation(domain);
    if (socialClassification.type === 'social') {
      return {
        ...socialClassification,
        flags: flags
      };
    }
    
    // 4. Everything else is Earned media (third-party editorial references)
    const earnedClassification = this.classifyEarnedCitation(domain, allBrands, context);
    
    return {
      ...earnedClassification,
      flags: flags
    };
  }

  /**
   * Check against user-provided verified domains (highest confidence)
   * @param {string} domain - Domain to check
   * @param {string} brandName - Brand name
   * @param {Array} verifiedDomains - List of verified domains
   * @returns {object|null} - Classification result or null
   */
  checkVerifiedDomains(domain, brandName, verifiedDomains) {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
    for (const verifiedDomain of verifiedDomains) {
      const verifiedNormalized = verifiedDomain.toLowerCase().replace(/^www\./, '');
      
      // Exact match
      if (normalizedDomain === verifiedNormalized) {
        return {
          type: 'brand',
          brand: brandName,
          confidence: {
            overall: 0.99,
            dimensions: {
              domainMatch: 1.0,
              verification: 1.0, // User-verified
              contextRelevance: 0.95
            }
          },
          metadata: {
            method: 'verified_domain_exact_match',
            verified: true
          }
        };
      }
      
      // Subdomain match (e.g., blog.brand.com)
      if (normalizedDomain.endsWith('.' + verifiedNormalized)) {
        return {
          type: 'brand',
          brand: brandName,
          confidence: {
            overall: 0.98,
            dimensions: {
              domainMatch: 1.0,
              verification: 1.0, // User-verified
              contextRelevance: 0.93
            }
          },
          metadata: {
            method: 'verified_domain_subdomain_match',
            verified: true,
            subdomain: normalizedDomain.replace('.' + verifiedNormalized, '')
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Classify brand citations - ENHANCED with better common word filtering
   * CRITICAL: Only classifies as "brand" if domain belongs to targetBrandName
   * Competitors are NEVER classified as "brand" - they're "earned" (third-party)
   */
  classifyBrandCitation(domain, allBrands = [], targetBrandName = null) {
    const DEBUG = process.env.CITATION_DEBUG === 'true';
    
    // CRITICAL: If targetBrandName is provided, ONLY check that specific brand
    // This prevents competitor domains from being classified as "brand"
    const brandsToCheck = targetBrandName
      ? allBrands.filter(b => (b.name || b) === targetBrandName)
      : allBrands;
    
    if (!brandsToCheck || brandsToCheck.length === 0) {
      if (DEBUG) console.log(`[V2 DEBUG] No brands to check for domain: ${domain}`);
      return {
        type: 'unknown',
        brand: null,
        confidence: {
          overall: 0.0,
          dimensions: { domainMatch: 0.0, verification: 0.0, contextRelevance: 0.0 }
        }
      };
    }
    
    // CRITICAL FIX: Explicitly reject competitor domains
    // Check if this domain belongs to any OTHER brand (competitor)
    if (targetBrandName && allBrands && allBrands.length > 0) {
      const competitors = allBrands.filter(b => {
        const name = b.name || b;
        return name !== targetBrandName; // All brands except target
      });
      
      if (DEBUG) {
        console.log(`[V2 DEBUG] Checking domain: ${domain}`);
        console.log(`[V2 DEBUG] Target brand: ${targetBrandName}`);
        console.log(`[V2 DEBUG] Competitors: ${competitors.map(c => c.name || c).join(', ')}`);
      }
      
      // Check if domain matches any competitor
      for (const competitor of competitors) {
        const competitorName = competitor.name || competitor;
        if (!competitorName) continue;
        
        // Generate domain variations for this competitor
        const competitorDomains = brandPatternService.generateDomainVariations(competitorName);
        
        // Check if domain matches competitor
        const domainParts = domain.split('.');
        const domainWithoutTLD = domainParts[0];
        const domainBase = domainParts.slice(0, -1).join('.');
        
        if (DEBUG) {
          console.log(`[V2 DEBUG]   Checking against competitor: ${competitorName}`);
          console.log(`[V2 DEBUG]   Competitor variations: ${competitorDomains.join(', ')}`);
        }
        
        for (const compDomain of competitorDomains) {
          const cleanComp = compDomain.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDomainBase = domainBase.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDomainWithoutTLD = domainWithoutTLD.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Skip if competitor variation is too short (avoid false positives)
          if (cleanComp.length < 4) continue;
          
          // If domain matches competitor, return unknown (will be classified as earned later)
          // Use exact match or starts with (not just contains)
          if ((cleanDomainBase === cleanComp || cleanDomainWithoutTLD === cleanComp) ||
              (cleanComp.length >= 6 && (cleanDomainBase.startsWith(cleanComp) || cleanDomainWithoutTLD.startsWith(cleanComp)))) {
            if (DEBUG) {
              console.log(`[V2 DEBUG]   ❌ REJECTED: Domain ${domain} matches competitor ${competitorName} (variation: ${compDomain})`);
            }
            return {
              type: 'unknown',
              brand: null,
              confidence: {
                overall: 0.0,
                dimensions: { domainMatch: 0.0, verification: 0.0, contextRelevance: 0.0 }
              },
              metadata: {
                reason: 'competitor_domain_rejected',
                competitorMatched: competitorName,
                message: `Domain ${domain} belongs to competitor ${competitorName}, not ${targetBrandName}`
              }
            };
          }
        }
      }
      
      if (DEBUG) console.log(`[V2 DEBUG] Domain ${domain} passed competitor check, now checking against target brand`);
    }
    
    for (const brand of brandsToCheck) {
      const brandName = brand.name || brand;
      if (!brandName) continue;
      
      // Generate possible domain variations
      const possibleDomains = brandPatternService.generateDomainVariations(brandName);
      
      // Extract domain parts
      const domainParts = domain.split('.');
      const domainBase = domainParts.slice(0, -1).join('.');
      const domainWithoutTLD = domainParts[0];
      
      if (DEBUG) {
        console.log(`[V2 DEBUG] Checking against brand: ${brandName}`);
        console.log(`[V2 DEBUG]   Brand variations: ${possibleDomains.join(', ')}`);
        console.log(`[V2 DEBUG]   Domain parts: domainBase="${domainBase}", domainWithoutTLD="${domainWithoutTLD}"`);
      }
      
      // Check exact domain match
      for (const possibleDomain of possibleDomains) {
        const cleanPossible = possibleDomain.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanDomainBase = domainBase.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanDomainWithoutTLD = domainWithoutTLD.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // ENHANCED: Skip if variation is a common word
        if (this.isCommonWord(cleanPossible)) {
          if (DEBUG) console.log(`[V2 DEBUG]   Skipping common word: ${cleanPossible}`);
          continue; // Skip common words like "one", "capital", "chase"
        }
        
        // Exact match
        if (cleanDomainBase === cleanPossible || cleanDomainWithoutTLD === cleanPossible) {
          return {
            type: 'brand',
            brand: brandName,
            confidence: {
              overall: 0.95,
              dimensions: {
                domainMatch: 0.98,
                verification: 0.90,
                contextRelevance: 0.95
              }
            },
            metadata: {
              method: 'exact_domain_match',
              matchedPattern: cleanPossible
            }
          };
        }
        
        // ENHANCEMENT: Check if brand name appears in subdomain parts
        // For blog.chase.com, check if "chase" matches any part
        const domainPartsArray = domain.split('.');
        for (let i = 0; i < domainPartsArray.length - 1; i++) { // Skip TLD
          const part = domainPartsArray[i].toLowerCase().replace(/[^a-z0-9]/g, '');
          if (part === cleanPossible && part.length >= 3) {
            return {
              type: 'brand',
              brand: brandName,
              confidence: {
                overall: 0.93,
                dimensions: {
                  domainMatch: 0.95,
                  verification: 0.88,
                  contextRelevance: 0.93
                }
              },
              metadata: {
                method: 'subdomain_part_match',
                matchedPattern: cleanPossible,
                subdomain: domainPartsArray.slice(0, i).join('.')
              }
            };
          }
        }
        
        // ENHANCED: Stricter matching - require minimum length of 6 (was 5)
        if (cleanPossible.length >= 6) {
          // Domain starts with variation
          const startsWith = cleanDomainBase.startsWith(cleanPossible) || cleanDomainWithoutTLD.startsWith(cleanPossible);
          
          if (startsWith) {
            return {
              type: 'brand',
              brand: brandName,
              confidence: {
                overall: 0.90,
                dimensions: {
                  domainMatch: 0.93,
                  verification: 0.85,
                  contextRelevance: 0.90
                }
              },
              metadata: {
                method: 'domain_starts_with',
                matchedPattern: cleanPossible
              }
            };
          }
          
          // Domain contains variation (require 60% ratio instead of 50%)
          const contains = cleanDomainBase.includes(cleanPossible) || cleanDomainWithoutTLD.includes(cleanPossible);
          if (contains) {
            const containsRatio = cleanPossible.length / Math.max(cleanDomainBase.length, cleanDomainWithoutTLD.length);
            if (containsRatio >= 0.6) { // Stricter: 60% instead of 50%
              return {
                type: 'brand',
                brand: brandName,
                confidence: {
                  overall: 0.75,
                  dimensions: {
                    domainMatch: 0.80,
                    verification: 0.70,
                    contextRelevance: 0.75
                  }
                },
                metadata: {
                  method: 'domain_contains',
                  matchedPattern: cleanPossible,
                  ratio: containsRatio
                }
              };
            }
          }
        }
      }
      
      // Check abbreviations
      const abbreviations = brandPatternService.getBrandAbbreviationsForDomain(brandName);
      for (const [abbrev, fullBrand] of abbreviations.entries()) {
        // ENHANCED: Skip common word abbreviations
        if (this.isCommonWord(abbrev)) {
          continue;
        }
        
        const abbrevDomain = abbrev + '.com';
        if (domain === abbrev || domain === abbrevDomain || domain.startsWith(abbrev + '.')) {
          return {
            type: 'brand',
            brand: brandName,
            confidence: {
              overall: 0.90,
              dimensions: {
                domainMatch: 0.92,
                verification: 0.88,
                contextRelevance: 0.90
              }
            },
            metadata: {
              method: 'abbreviation_match',
              abbreviation: abbrev
            }
          };
        }
      }
    }
    
    return {
      type: 'unknown',
      brand: null,
      confidence: {
        overall: 0.0,
        dimensions: { domainMatch: 0.0, verification: 0.0, contextRelevance: 0.0 }
      }
    };
  }

  /**
   * Get comprehensive social media domains (inherited from V1)
   */
  getSocialMediaDomains() {
    return [
      // Major social networks
      'facebook.com', 'fb.com', 'm.facebook.com',
      'twitter.com', 'x.com', 't.co', 'twitter.co.uk',
      'instagram.com', 'ig.com', 'instagram.co.uk',
      'linkedin.com', 'linkedin.co.uk',
      'youtube.com', 'youtu.be', 'youtube.co.uk',
      'tiktok.com', 'tiktok.co.uk',
      'snapchat.com', 'snapchat.co.uk',
      'pinterest.com', 'pinterest.co.uk',
      'reddit.com', 'reddit.co.uk',
      
      // NEW: Emerging platforms (2024)
      'threads.net', // Meta's Twitter competitor
      'bsky.app', 'bsky.social', // Bluesky
      'truth.social', // Truth Social
      'gettr.com', // Gettr
      'parler.com', // Parler
      'rumble.com', // Rumble (video)
      
      // Messaging platforms
      'whatsapp.com', 'wa.me',
      'telegram.org', 'telegram.me', 't.me',
      'discord.com', 'discord.gg',
      'signal.org',
      'viber.com',
      'line.me',
      'wechat.com',
      
      // Video platforms
      'twitch.tv', 'twitch.com',
      'vimeo.com', 'vimeo.co.uk',
      'dailymotion.com', 'dailymotion.co.uk',
      
      // Content sharing platforms
      'medium.com', 'medium.co.uk',
      'tumblr.com', 'tumblr.co.uk',
      'flickr.com', 'flickr.co.uk',
      'imgur.com',
      
      // Q&A and discussion platforms
      'quora.com', 'quora.co.uk',
      'stackoverflow.com', 'stackexchange.com',
      
      // Professional networks
      'mastodon.social', 'mastodon.online',
      
      // Other platforms
      'clubhouse.com',
      'meetup.com',
      'nextdoor.com',
      'foursquare.com',
      'mewe.com',
      'minds.com',
      
      // Blogging platforms
      'blogspot.com', 'blogger.com',
      'wordpress.com', 'wordpress.co.uk',
      'substack.com',
    ];
  }

  /**
   * Classify social citations (inherited from V1)
   */
  classifySocialCitation(domain) {
    const socialDomains = this.getSocialMediaDomains();
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
    for (const socialDomain of socialDomains) {
      const normalizedSocial = socialDomain.toLowerCase().replace(/^www\./, '');
      
      // Exact match
      if (normalizedDomain === normalizedSocial) {
        return {
          type: 'social',
          brand: null,
          confidence: {
            overall: 0.98,
            dimensions: {
              domainMatch: 1.0,
              verification: 0.95,
              contextRelevance: 0.98
            }
          },
          metadata: {
            method: 'social_exact_match',
            platform: socialDomain
          }
        };
      }
      
      // Subdomain match
      if (normalizedDomain.endsWith('.' + normalizedSocial)) {
        return {
          type: 'social',
          brand: null,
          confidence: {
            overall: 0.95,
            dimensions: {
              domainMatch: 0.98,
              verification: 0.92,
              contextRelevance: 0.95
            }
          },
          metadata: {
            method: 'social_subdomain_match',
            platform: socialDomain
          }
        };
      }
    }
    
    return {
      type: 'unknown',
      brand: null,
      confidence: {
        overall: 0.0,
        dimensions: { domainMatch: 0.0, verification: 0.0, contextRelevance: 0.0 }
      }
    };
  }

  /**
   * Classify earned citations - ENHANCED with context
   */
  classifyEarnedCitation(domain, allBrands = [], context = {}) {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    const domainParts = normalizedDomain.split('.');
    const baseDomain = domainParts.length >= 2
      ? domainParts.slice(-2).join('.')
      : normalizedDomain;
    
    // Pattern-based classification
    const newsPatterns = [
      /^(news|media|press|journal|times|post|tribune|herald|gazette|chronicle|observer|review|standard|guardian|independent|telegraph|express|mirror|sun|star)/i,
      /\.(news|media|press|journal)$/i
    ];
    
    for (const pattern of newsPatterns) {
      if (pattern.test(normalizedDomain) || pattern.test(baseDomain)) {
        return {
          type: 'earned',
          brand: null,
          confidence: {
            overall: 0.88,
            dimensions: {
              domainMatch: 0.90,
              verification: 0.85,
              contextRelevance: context.relevance || 0.85
            }
          },
          metadata: {
            method: 'earned_news_pattern',
            category: 'news_media'
          }
        };
      }
    }
    
    // Review/comparison sites
    const reviewPatterns = [
      /^(review|reviews|compare|comparison|ratings|rating|rankings|ranking|best|top|vs|versus)/i,
      /(review|reviews|compare|comparison|ratings|rating)\./i
    ];
    
    for (const pattern of reviewPatterns) {
      if (pattern.test(normalizedDomain) || pattern.test(baseDomain)) {
        return {
          type: 'earned',
          brand: null,
          confidence: {
            overall: 0.85,
            dimensions: {
              domainMatch: 0.88,
              verification: 0.80,
              contextRelevance: context.relevance || 0.85
            }
          },
          metadata: {
            method: 'earned_review_pattern',
            category: 'review_comparison'
          }
        };
      }
    }
    
    // Industry publications
    const industryPatterns = [
      /^(industry|business|tech|finance|marketing|sales|hr|legal|health|education)/i,
      /(magazine|journal|publication|insights|analysis|research)/i,
      /\.(org|edu|gov)$/i
    ];
    
    for (const pattern of industryPatterns) {
      if (pattern.test(normalizedDomain) || pattern.test(baseDomain)) {
        return {
          type: 'earned',
          brand: null,
          confidence: {
            overall: 0.82,
            dimensions: {
              domainMatch: 0.85,
              verification: 0.78,
              contextRelevance: context.relevance || 0.82
            }
          },
          metadata: {
            method: 'earned_industry_pattern',
            category: 'industry_publication'
          }
        };
      }
    }
    
    // Default: third-party editorial (unknown/uncertain)
    // IMPORTANT: Lower confidence for truly unknown sites
    // These should be filterable if using confidence thresholds
    return {
      type: 'earned',
      brand: null,
      confidence: {
        overall: 0.55, // Lower from 0.75 - just above IGNORE_BELOW threshold
        dimensions: {
          domainMatch: 0.50,
          verification: 0.50,
          contextRelevance: context.relevance || 0.65
        }
      },
      metadata: {
        method: 'earned_default',
        category: 'third_party_unknown',
        note: 'Low confidence - consider filtering'
      }
    };
  }

  /**
   * Check if a classification result should be ignored due to low confidence
   * Philosophy: Better to ignore noisy/uncertain citations than risk misclassification
   * 
   * @param {object} classificationResult - Result from categorizeCitation
   * @returns {boolean} - True if citation should be ignored (too uncertain)
   */
  shouldIgnoreCitation(classificationResult) {
    if (!classificationResult || !classificationResult.confidence) {
      return true; // No confidence data = ignore
    }

    const { type, confidence } = classificationResult;
    const overallConfidence = confidence.overall || 0;

    // Check against global threshold first
    if (overallConfidence < CitationClassificationServiceV2.CONFIDENCE_THRESHOLDS.IGNORE_BELOW) {
      return true; // Below minimum threshold = ignore
    }

    // Check type-specific thresholds
    if (type === 'brand' && overallConfidence < CitationClassificationServiceV2.CONFIDENCE_THRESHOLDS.BRAND) {
      return true; // Brand classification requires high confidence
    }

    if (type === 'social' && overallConfidence < CitationClassificationServiceV2.CONFIDENCE_THRESHOLDS.SOCIAL) {
      return true; // Social classification requires very high confidence
    }

    if (type === 'earned' && overallConfidence < CitationClassificationServiceV2.CONFIDENCE_THRESHOLDS.EARNED) {
      return true; // Earned classification requires moderate confidence
    }

    // Always ignore 'unknown' type
    if (type === 'unknown') {
      return true;
    }

    return false; // High enough confidence = keep it
  }

  /**
   * Convenience method: Classify and filter out uncertain citations
   * @returns {object|null} - Classification result or null if should be ignored
   */
  classifyWithFiltering(url, brandName, allBrands = [], verifiedDomains = [], context = {}) {
    const result = this.categorizeCitation(url, brandName, allBrands, verifiedDomains, context);
    
    if (this.shouldIgnoreCitation(result)) {
      return null; // Ignore this citation
    }

    return result; // Keep this citation
  }
}

module.exports = new CitationClassificationServiceV2();

