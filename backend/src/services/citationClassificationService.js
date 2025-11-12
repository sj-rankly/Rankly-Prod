/**
 * Citation Classification Service
 * Handles classification of citations into brand, earned, and social categories
 */

const brandPatternService = require('./brandPatternService');

class CitationClassificationService {
  /**
   * Clean and validate a URL
   * Removes trailing punctuation and validates URL format
   * @param {string} url - Raw URL string
   * @returns {object} - { valid: boolean, cleanedUrl: string, domain: string }
   */
  cleanAndValidateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, cleanedUrl: null, domain: null };
    }
    
    // Handle citation markers (e.g., "citation_1", "citation_2")
    if (url.startsWith('citation_')) {
      return { valid: false, cleanedUrl: null, domain: null };
    }
    
    // Remove trailing punctuation from markdown links: ) ] } etc.
    let cleanUrl = url.replace(/[)\\].,;!?]+$/, '').trim();
    
    // Validate URL format - must start with http:// or https://
    if (!cleanUrl.match(/^https?:\/\//i)) {
      // Try to add https:// if missing
      if (cleanUrl.match(/^[a-z0-9.-]+\.[a-z]{2,}/i)) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        // Invalid URL format
        return { valid: false, cleanedUrl: null, domain: null };
      }
    }
    
    // Validate URL using URL constructor
    let domain = '';
    try {
      const urlObj = new URL(cleanUrl);
      domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      
      // Validate IP addresses - reject invalid/non-routable IPs
      const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipMatch = domain.match(ipPattern);
      
      if (ipMatch) {
        const octets = ipMatch.slice(1, 5).map(Number);
        
        // Check for invalid IP ranges
        // 0.0.0.0/8 - "This network" (non-routable)
        // 127.0.0.0/8 - Loopback addresses
        // 169.254.0.0/16 - Link-local addresses
        // 224.0.0.0/4 - Multicast addresses
        // 240.0.0.0/4 - Reserved for future use
        // 255.255.255.255 - Broadcast address
        
        if (octets[0] === 0 || // 0.0.0.0/8 - invalid
            octets[0] === 127 || // 127.0.0.0/8 - loopback
            (octets[0] === 169 && octets[1] === 254) || // 169.254.0.0/16 - link-local
            (octets[0] >= 224 && octets[0] <= 239) || // 224.0.0.0/4 - multicast
            (octets[0] >= 240) || // 240.0.0.0/4 - reserved
            (octets[0] === 255 && octets[1] === 255 && octets[2] === 255 && octets[3] === 255)) { // broadcast
          return { valid: false, cleanedUrl: null, domain: null };
        }
        
        // Validate octet ranges (0-255)
        if (octets.some(octet => octet < 0 || octet > 255)) {
          return { valid: false, cleanedUrl: null, domain: null };
        }
      }
      
      // Additional validation: check for invalid domains
      if (domain === 'localhost' || 
          domain.includes('..') || 
          domain.startsWith('.') || 
          domain.endsWith('.')) {
        return { valid: false, cleanedUrl: null, domain: null };
      }
      
      // Check if domain looks valid (has at least one dot and TLD, or is a valid IP)
      // For domain names, must have at least one dot and TLD
      // For IP addresses, we already validated above
      if (!ipMatch) {
        if (!domain.includes('.') || domain.split('.').length < 2) {
          return { valid: false, cleanedUrl: null, domain: null };
        }
        
        // Check TLD is valid (at least 2 characters, alphanumeric)
        const parts = domain.split('.');
        const tld = parts[parts.length - 1];
        if (!tld || tld.length < 2 || !/^[a-z0-9-]+$/i.test(tld)) {
          return { valid: false, cleanedUrl: null, domain: null };
        }
      }
      
      return { valid: true, cleanedUrl: cleanUrl, domain: domain };
    } catch (e) {
      // Try fallback extraction
      const match = cleanUrl.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/);
      if (match && match[1]) {
        domain = match[1].replace(/^www\./, '').toLowerCase();
        
        // Validate IP addresses in fallback too
        const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipMatch = domain.match(ipPattern);
        
        if (ipMatch) {
          const octets = ipMatch.slice(1, 5).map(Number);
          // Reject invalid IP ranges (same validation as above)
          if (octets[0] === 0 || 
              octets[0] === 127 || 
              (octets[0] === 169 && octets[1] === 254) || 
              (octets[0] >= 224 && octets[0] <= 239) || 
              (octets[0] >= 240) ||
              (octets[0] === 255 && octets[1] === 255 && octets[2] === 255 && octets[3] === 255) ||
              octets.some(octet => octet < 0 || octet > 255)) {
            return { valid: false, cleanedUrl: null, domain: null };
          }
        }
        
        if (domain && domain.includes('.')) {
          // Additional validation for domain names
          if (domain === 'localhost' || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
            return { valid: false, cleanedUrl: null, domain: null };
          }
          return { valid: true, cleanedUrl: cleanUrl, domain: domain };
        }
      }
      
      return { valid: false, cleanedUrl: null, domain: null };
    }
  }

  /**
   * Categorize a citation by type
   * @param {string} url - Citation URL
   * @param {string} brandName - Brand to check for
   * @param {Array} allBrands - All brands (including competitors)
   * @returns {object} - Classification result with type, brand, confidence
   */
  categorizeCitation(url, brandName, allBrands = []) {
    // Clean and validate URL first
    const urlValidation = this.cleanAndValidateUrl(url);
    
    if (!urlValidation.valid || !urlValidation.domain) {
      return { type: 'unknown', brand: null, confidence: 0.0 };
    }
    
    const domain = urlValidation.domain;
    
    // 1. Check for Brand citations (official brand-owned sources)
    // Only check the specific brand to avoid marking competitor domains as brand
    const brandClassification = this.classifyBrandCitation(domain, allBrands, brandName);
    if (brandClassification.type === 'brand' && brandClassification.brand === brandName) {
      return brandClassification;
    }
    
    // 2. Check for Social citations (community-driven mentions)
    const socialClassification = this.classifySocialCitation(domain);
    if (socialClassification.type === 'social') {
      return socialClassification;
    }
    
    // 3. Everything else is Earned media (third-party editorial references)
    const earnedClassification = this.classifyEarnedCitation(domain, allBrands);
    
    // Ensure confidence is always set (default to 0.8 for earned citations)
    if (earnedClassification.confidence === undefined || earnedClassification.confidence === null) {
      earnedClassification.confidence = 0.8;
    }
    
    // Validate citation type
    const validTypes = ['brand', 'earned', 'social', 'unknown'];
    if (!validTypes.includes(earnedClassification.type)) {
      console.warn(`⚠️ [CITATION] Invalid citation type: ${earnedClassification.type}, defaulting to 'earned'`);
      earnedClassification.type = 'earned';
    }
    
    return earnedClassification;
  }

  /**
   * Classify if a domain belongs to a brand (official brand-owned sources)
   * Enhanced to work dynamically with any brand from the database
   * Now includes abbreviation detection and better domain matching
   */
  classifyBrandCitation(domain, allBrands = [], targetBrandName = null) {
    // If targetBrandName is provided, only check that specific brand
    // This prevents competitor domains from being marked as brand
    const brandsToCheck = targetBrandName 
      ? allBrands.filter(b => (b.name || b) === targetBrandName)
      : allBrands;
    
    // First, check against user's brands and competitors dynamically
    if (brandsToCheck && brandsToCheck.length > 0) {
      for (const brand of brandsToCheck) {
        const brandName = brand.name || brand;
        if (!brandName) continue;
        
        // Strategy 1: Generate possible domain variations for this brand (generic algorithm)
        const possibleDomains = brandPatternService.generateDomainVariations(brandName);
        
        // Extract domain base (without TLD) for matching
        const domainParts = domain.split('.');
        const domainBase = domainParts.slice(0, -1).join('.'); // Everything except last part (TLD)
        const domainWithoutTLD = domainParts[0]; // First part only
        
        // Check exact domain match (with or without TLD)
        // Match against base variations (without TLD)
        for (const possibleDomain of possibleDomains) {
          const cleanPossible = possibleDomain.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDomainBase = domainBase.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDomainWithoutTLD = domainWithoutTLD.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Exact match with domain base
          if (cleanDomainBase === cleanPossible || cleanDomainWithoutTLD === cleanPossible) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.95,
              label: 'brand_owned_domain'
            };
          }
          
          // ✅ FIX: Stricter domain matching to prevent false positives
          // Match domain contains variation (e.g., "americanexpress" in "americanexpress.com")
          // But require minimum length and avoid common word matches
          if (cleanPossible.length >= 5) { // Increased from 3 to 5 for better accuracy
            const commonWords = ['bank', 'card', 'credit', 'financial', 'money', 'capital', 'express', 'one'];
            const isCommonWord = commonWords.includes(cleanPossible.toLowerCase());
            
            // Check if domain starts with the variation (preferred) or contains it significantly
            const startsWith = cleanDomainBase.startsWith(cleanPossible) || cleanDomainWithoutTLD.startsWith(cleanPossible);
            const contains = cleanDomainBase.includes(cleanPossible) || cleanDomainWithoutTLD.includes(cleanPossible);
            
            if (startsWith && !isCommonWord) {
              // Domain starts with brand variation - high confidence
              return { 
                type: 'brand', 
                brand: brandName, 
                confidence: 0.9,
                label: 'brand_domain_starts_with'
              };
            } else if (contains && !isCommonWord) {
              // Domain contains brand variation - require significant portion
              const containsRatio = cleanPossible.length / Math.max(cleanDomainBase.length, cleanDomainWithoutTLD.length);
              if (containsRatio >= 0.5) {
                // Variation is at least 50% of domain - medium confidence
                return { 
                  type: 'brand', 
                  brand: brandName, 
                  confidence: 0.75,
                  label: 'brand_domain_contains'
                };
              }
            }
          }
        }
        
        // Strategy 2: Check subdomain patterns (e.g., blog.example.com, www.example.com)
        // Extract root domain (second-to-last part + TLD)
        const rootDomain = domainParts.length >= 2 
          ? domainParts.slice(-2).join('.') 
          : domain;
        
        for (const possibleDomain of possibleDomains) {
          const cleanPossible = possibleDomain.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanRoot = rootDomain.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // ✅ FIX: Stricter subdomain matching
          // Check if root domain matches variation (require minimum length and avoid common words)
          if (cleanPossible.length >= 5) {
            const commonWords = ['bank', 'card', 'credit', 'financial', 'money', 'capital', 'express', 'one'];
            const isCommonWord = commonWords.includes(cleanPossible.toLowerCase());
            
            if (!isCommonWord && (cleanRoot === cleanPossible || cleanRoot.startsWith(cleanPossible))) {
              return { 
                type: 'brand', 
                brand: brandName, 
                confidence: 0.85,
                label: 'brand_subdomain'
              };
            }
          }
          
          // Check if domain ends with variation (subdomain pattern)
          if (domain.endsWith('.' + possibleDomain) || domain.endsWith('.' + cleanPossible + '.com')) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.85,
              label: 'brand_subdomain'
            };
          }
        }
        
        // Strategy 3: Check abbreviation-based domains (e.g., amex.com → American Express)
        const abbreviations = brandPatternService.getBrandAbbreviationsForDomain(brandName);
        for (const [abbrev, fullBrand] of abbreviations.entries()) {
          // Check if domain matches abbreviation (e.g., amex.com)
          const abbrevDomain = abbrev + '.com';
          const abbrevDomainWithWWW = 'www.' + abbrev + '.com';
          if (domain === abbrevDomain || domain === abbrevDomainWithWWW || 
              domain.endsWith('.' + abbrevDomain) || domain.endsWith('.' + abbrevDomainWithWWW)) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.9,
              label: 'brand_abbreviation_domain'
            };
          }
          // Also check if abbreviation appears in domain
          if (domain.includes(abbrev) && domain.length < abbrev.length + 10) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.8,
              label: 'brand_abbreviation_pattern'
            };
          }
        }
        
        // Strategy 4: Check for brand name patterns in domain (fuzzy matching)
        // ✅ FIX: Only match on domain base (first part before TLD), not full domain
        // This prevents false positives where domain contains brand name as substring
        // e.g., "crunchbase.com" should NOT match "ycombinator" even if URL path mentions it
        const domainBaseForPatterns = domain.split('.')[0]; // Get just the domain name without TLD
        const brandPatterns = brandPatternService.generateBrandPatterns(brandName);
        for (const pattern of brandPatterns) {
          const normalizedPattern = pattern.toLowerCase().replace(/\s+/g, '');
          // Only match if domain base starts with or equals the pattern (stricter matching)
          // Avoid substring matching that could cause false positives
          if (domainBaseForPatterns === normalizedPattern || domainBaseForPatterns.startsWith(normalizedPattern)) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.75,
              label: 'brand_pattern_match'
            };
          }
        }
      }
    }
    
    // Step 5: Generic fuzzy matching for edge cases (if no exact match found)
    // Use Levenshtein distance for similar domain names
    // Only check target brand if specified to avoid false positives
    if (brandsToCheck && brandsToCheck.length > 0) {
      // Note: metricsExtractionService exports an instance, not a class
      const extractionService = require('./metricsExtractionService');
      const domainBase = domain.split('.')[0]; // Get domain without TLD
      
      for (const brand of brandsToCheck) {
        const brandName = brand.name || brand;
        if (!brandName) continue;
        
        // Generate domain variations for this brand
        const brandVariations = brandPatternService.generateDomainVariations(brandName);
        
        // Check fuzzy similarity with domain base
        for (const variation of brandVariations) {
          const cleanVariation = variation.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDomainBase = domainBase.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          if (cleanVariation.length >= 3 && cleanDomainBase.length >= 3) {
            const similarity = extractionService.calculateSimilarity(cleanVariation, cleanDomainBase);
            if (similarity >= 0.7) {
              return { 
                type: 'brand', 
                brand: brandName, 
                confidence: similarity * 0.85, // Scale confidence by similarity
                label: 'brand_fuzzy_match'
              };
            }
          }
        }
      }
    }
    
    // Fallback: Legacy hardcoded domains (DEPRECATED - only for backward compatibility)
    // CRITICAL FIX: Only use legacy matching if the domain actually matches the target brand
    // This prevents false positives (e.g., matching americanexpress.com when analyzing HDFC Bank)
    const legacyBrandDomains = [
      'americanexpress.com', 'amex.com', 'americanexpress.co.uk', 'amex.co.uk',
      'chase.com', 'chasebank.com', 'chase.co.uk',
      'capitalone.com', 'capitalone.co.uk',
      'citi.com', 'citibank.com', 'citibank.co.uk',
      'wellsfargo.com', 'wellsfargoadvisors.com',
      'bankofamerica.com', 'bofa.com',
      'discover.com', 'discovercard.com'
    ];
    
    // Only use legacy matching if targetBrandName is provided AND the domain matches that brand
    if (targetBrandName) {
      // Extract brand from domain using legacy mapping
      const extractedBrand = this.extractBrandFromLegacyDomain(domain);
      
      // Normalize both brand names for comparison
      const normalizeBrand = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTarget = normalizeBrand(targetBrandName);
      const normalizedExtracted = normalizeBrand(extractedBrand);
      
      // Check if legacy domain matches AND the extracted brand matches target brand
      if (legacyBrandDomains.includes(domain) || 
          legacyBrandDomains.some(bd => domain.endsWith('.' + bd))) {
        
        // Only return brand match if extracted brand matches target brand
        // Use fuzzy matching to handle variations (e.g., "American Express" vs "AmericanExpress")
        const metricsExtractionService = require('./metricsExtractionService');
        const similarity = metricsExtractionService.calculateSimilarity(normalizedTarget, normalizedExtracted);
        
        if (similarity >= 0.7) {
          console.warn(`⚠️ [LEGACY] Using hardcoded domain match for ${domain} (matched to ${targetBrandName}) - consider updating to generic matching`);
          return { 
            type: 'brand', 
            brand: targetBrandName, 
            confidence: 0.9,
            label: 'brand_owned_domain_legacy'
          };
        } else {
          // Domain is in legacy list but doesn't match target brand - return unknown
          // This prevents false positives (e.g., americanexpress.com when analyzing HDFC Bank)
          return { type: 'unknown', brand: null, confidence: 0 };
        }
      }
    }
    
    return { type: 'unknown', brand: null, confidence: 0 };
  }

  /**
   * Get comprehensive list of social media platform domains
   * Based on PESO model: Shared Media = Social Media Platforms
   * This is the only hardcoded list as requested by user
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
      
      // Professional and business networks
      'threads.net',
      'mastodon.social', 'mastodon.online',
      
      // Other social platforms
      'clubhouse.com',
      'meetup.com',
      'nextdoor.com',
      'foursquare.com',
      'mewe.com',
      'truthsocial.com',
      'minds.com',
      
      // Blogging platforms (user-generated content)
      'blogspot.com', 'blogger.com',
      'wordpress.com', 'wordpress.co.uk',
      'substack.com',
      
      // Note: Medium, Quora, and blogging platforms are included as they are
      // primarily social/content-sharing platforms, not editorial news sites
    ];
  }

  /**
   * Classify if a domain is social media (Shared Media - PESO model)
   * Social media = platforms where users share content, not editorial content
   */
  classifySocialCitation(domain) {
    const socialDomains = this.getSocialMediaDomains();
    
    // Normalize domain for comparison (remove www, convert to lowercase)
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
    // Check exact match
    for (const socialDomain of socialDomains) {
      const normalizedSocial = socialDomain.toLowerCase().replace(/^www\./, '');
      
      // Exact match
      if (normalizedDomain === normalizedSocial) {
        return { 
          type: 'social', 
          brand: null, 
          confidence: 0.95,
          label: 'social_media_platform'
        };
      }
      
      // Subdomain match (e.g., m.facebook.com, uk.linkedin.com)
      if (normalizedDomain.endsWith('.' + normalizedSocial)) {
        return { 
          type: 'social', 
          brand: null, 
          confidence: 0.9,
          label: 'social_media_platform'
        };
      }
      
      // REMOVED: Partial string matching was causing false positives
      // (e.g., "chase.com" was matching because it contains "chase" from some pattern)
      // Only exact matches and subdomain matches are allowed for social media
    }
    
    return { type: 'unknown', brand: null, confidence: 0 };
  }

  /**
   * Classify if a domain is earned media (Earned Media - PESO model)
   * Earned media = Third-party editorial references, news, reviews, independent coverage
   * Generic approach: Everything that's not brand-owned or social media is earned
   * 
   * We use pattern matching to identify common earned media characteristics:
   * - News/media outlets (generic patterns)
   * - Review/comparison sites (generic patterns)
   * - Industry publications (generic patterns)
   * - Independent blogs and editorial content
   */
  classifyEarnedCitation(domain) {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    const domainParts = normalizedDomain.split('.');
    const baseDomain = domainParts.length >= 2 
      ? domainParts.slice(-2).join('.') 
      : normalizedDomain;
    
    // Pattern-based classification for common earned media types
    // This is generic and works for any industry/domain
    
    // 1. News/Media outlets - common patterns
    const newsPatterns = [
      /^(news|media|press|journal|times|post|tribune|herald|gazette|chronicle|observer|review|standard|guardian|independent|telegraph|express|mirror|sun|star)/i,
      /\.(news|media|press|journal)$/i
    ];
    
    for (const pattern of newsPatterns) {
      if (pattern.test(normalizedDomain) || pattern.test(baseDomain)) {
        return { 
          type: 'earned', 
          brand: null, 
          confidence: 0.85,
          label: 'news_media_outlet'
        };
      }
    }
    
    // 2. Review/Comparison sites - common patterns
    const reviewPatterns = [
      /^(review|reviews|compare|comparison|ratings|rating|rankings|ranking|best|top|vs|versus)/i,
      /(review|reviews|compare|comparison|ratings|rating|rankings|ranking|best|top)\./i,
      /\.(reviews?|ratings?|compare|comparison)$/i
    ];
    
    for (const pattern of reviewPatterns) {
      if (pattern.test(normalizedDomain) || pattern.test(baseDomain)) {
        return { 
          type: 'earned', 
          brand: null, 
          confidence: 0.8,
          label: 'review_comparison_site'
        };
      }
    }
    
    // 3. Industry/Professional publications - common patterns
    const industryPatterns = [
      /^(industry|business|tech|finance|marketing|sales|hr|legal|health|education)/i,
      /(magazine|journal|publication|insights|analysis|research|report|study|whitepaper)/i,
      /\.(org|edu|gov)$/i  // Non-profit, educational, government (typically editorial)
    ];
    
    for (const pattern of industryPatterns) {
      if (pattern.test(normalizedDomain) || pattern.test(baseDomain)) {
        return { 
          type: 'earned', 
          brand: null, 
          confidence: 0.75,
          label: 'industry_publication'
        };
      }
    }
    
    // Note: Blog patterns are not checked here because:
    // - Some brands have blogs on their own domains (should be brand, not earned)
    // - This is handled by checking brand first in categorizeCitation()
    // - Third-party blogs are already covered by the default "earned" classification
    
    // 5. Default: Everything else is earned media
    // By definition, earned media = any third-party mention that's not:
    // - Brand-owned (checked first)
    // - Social media (checked second)
    // - Everything else = earned media (third-party editorial reference)
    
    return { 
      type: 'earned', 
      brand: null, 
      confidence: 0.7,  // Default confidence for generic earned media
      label: 'third_party_editorial'
    };
  }

  /**
   * Extract brand name from domain using generic logic
   * This is a fallback method - primary brand detection should come from Perplexity during onboarding
   */
  extractBrandFromDomain(domain) {
    if (!domain) return 'Unknown Brand';
    
    // Generic domain-to-brand conversion
    const domainPart = domain.split('.')[0];
    if (!domainPart) return 'Unknown Brand';
    
    // Convert domain to readable format
    return domainPart
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract brand name from legacy hardcoded domain
   * Maps known legacy domains to their brand names
   */
  extractBrandFromLegacyDomain(domain) {
    const legacyDomainMap = {
      'americanexpress.com': 'American Express',
      'amex.com': 'American Express',
      'americanexpress.co.uk': 'American Express',
      'amex.co.uk': 'American Express',
      'chase.com': 'Chase',
      'chasebank.com': 'Chase',
      'chase.co.uk': 'Chase',
      'capitalone.com': 'Capital One',
      'capitalone.co.uk': 'Capital One',
      'citi.com': 'Citibank',
      'citibank.com': 'Citibank',
      'citibank.co.uk': 'Citibank',
      'wellsfargo.com': 'Wells Fargo',
      'wellsfargoadvisors.com': 'Wells Fargo',
      'bankofamerica.com': 'Bank of America',
      'bofa.com': 'Bank of America',
      'discover.com': 'Discover',
      'discovercard.com': 'Discover'
    };
    
    // Normalize domain (remove www, convert to lowercase)
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
    // Check exact match
    if (legacyDomainMap[normalizedDomain]) {
      return legacyDomainMap[normalizedDomain];
    }
    
    // Check subdomain match (e.g., www.americanexpress.com, creditcards.chase.com)
    for (const [legacyDomain, brandName] of Object.entries(legacyDomainMap)) {
      if (normalizedDomain.endsWith('.' + legacyDomain) || normalizedDomain === legacyDomain) {
        return brandName;
      }
    }
    
    // Fallback to generic extraction
    return this.extractBrandFromDomain(domain);
  }
}

module.exports = new CitationClassificationService();

