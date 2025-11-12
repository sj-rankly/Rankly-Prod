/**
 * Brand Pattern Service
 * Handles brand pattern generation, domain variations, and abbreviation generation
 */

class BrandPatternService {
  /**
   * Remove common words (articles, prepositions) from brand name
   * Generic algorithm that works for any brand
   */
  removeCommonWords(text) {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'company', 'inc', 'incorporated', 'corp', 'corporation', 'ltd', 'limited', 'llc',
      'group', 'holdings', 'enterprises', 'industries', 'international', 'global'
    ]);
    
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => {
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      return cleanWord.length > 2 && !commonWords.has(cleanWord);
    });
  }

  /**
   * Extract first syllables from a word (simple heuristic)
   * For "American" → "am", "ame", "amer"
   */
  extractFirstSyllables(word, maxSyllables = 3) {
    const syllables = [];
    const vowels = /[aeiouy]/gi;
    let vowelCount = 0;
    let currentSyllable = '';
    
    for (let i = 0; i < word.length && vowelCount < maxSyllables; i++) {
      currentSyllable += word[i];
      if (vowels.test(word[i])) {
        vowelCount++;
        if (currentSyllable.length >= 2) {
          syllables.push(currentSyllable);
        }
      }
    }
    
    return syllables.filter(s => s.length >= 2);
  }

  /**
   * Generate abbreviations for ANY brand name (generic algorithm)
   * No hardcoded brand names - works for financial, tech, retail, SaaS, etc.
   * Returns a map of abbreviation -> full brand name
   */
  getBrandAbbreviationsForDomain(brandName) {
    const abbreviations = new Map();
    if (!brandName || typeof brandName !== 'string') return abbreviations;
    
    // Step 1: Remove common words and get significant words
    const significantWords = this.removeCommonWords(brandName);
    if (significantWords.length === 0) {
      // If all words were common, use original (but clean it)
      significantWords.push(...brandName.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    }
    
    // Step 2: Generate acronyms from first letters
    if (significantWords.length > 1) {
      // Full acronym: "American Express" → "ae"
      const fullAcronym = significantWords.map(w => w[0]).join('').toLowerCase();
      if (fullAcronym.length >= 2) {
        abbreviations.set(fullAcronym, brandName);
      }
      
      // First two words acronym: "American Express Company" → "ae"
      if (significantWords.length >= 2) {
        const twoWordAcronym = significantWords.slice(0, 2).map(w => w[0]).join('').toLowerCase();
        if (twoWordAcronym.length >= 2 && twoWordAcronym !== fullAcronym) {
          abbreviations.set(twoWordAcronym, brandName);
        }
      }
    }
    
    // Step 3: Generate syllable-based abbreviations (for longer names)
    significantWords.forEach(word => {
      if (word.length > 6) {
        const syllables = this.extractFirstSyllables(word, 2);
        syllables.forEach(syllable => {
          if (syllable.length >= 2 && syllable.length <= 6) {
            abbreviations.set(syllable, brandName);
          }
        });
      }
    });
    
    // Step 4: Generate word-based abbreviations
    // First word only: "American Express" → "american"
    if (significantWords.length > 1 && significantWords[0].length >= 3) {
      abbreviations.set(significantWords[0], brandName);
    }
    
    // First two words: "American Express" → "americanexpress", "americanexp"
    if (significantWords.length >= 2) {
      const firstTwo = significantWords.slice(0, 2).join('');
      if (firstTwo.length >= 3) {
        abbreviations.set(firstTwo, brandName);
        // Also add truncated version if long
        if (firstTwo.length > 8) {
          abbreviations.set(firstTwo.substring(0, 8), brandName);
        }
      }
    }
    
    // Step 5: Generate first letter + partial word combinations
    // "American Express" → "aexpress", "amxpress"
    if (significantWords.length >= 2) {
      const firstLetter = significantWords[0][0];
      significantWords.slice(1).forEach(word => {
        if (word.length >= 4) {
          // First letter + first 3-5 chars of second word
          for (let len = 3; len <= Math.min(5, word.length); len++) {
            const combo = firstLetter + word.substring(0, len);
            if (combo.length >= 3) {
              abbreviations.set(combo, brandName);
            }
          }
        }
      });
    }

    return abbreviations;
  }

  /**
   * Generate possible domain variations for ANY brand name (GENERIC)
   * Works for financial, tech, retail, SaaS, etc. - no hardcoding
   * Used for dynamic brand citation detection
   */
  generateDomainVariations(brandName) {
    const variations = new Set();
    if (!brandName || typeof brandName !== 'string') return [];
    
    // Step 1: Remove common words for better domain matching
    const significantWords = this.removeCommonWords(brandName);
    const cleanBrandName = significantWords.length > 0 
      ? significantWords.join(' ') 
      : brandName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    const words = cleanBrandName.split(/\s+/).filter(w => w.length > 0);
    
    // Step 2: Generate base variations (no TLD yet)
    const baseVariations = new Set();
    
    // Full brand name variations
    baseVariations.add(cleanBrandName);                                    // "american express"
    baseVariations.add(cleanBrandName.replace(/\s+/g, ''));                // "americanexpress"
    baseVariations.add(cleanBrandName.replace(/\s+/g, '-'));               // "american-express"
    baseVariations.add(cleanBrandName.replace(/\s+/g, '.'));               // "american.express"
    baseVariations.add(cleanBrandName.replace(/\s+/g, '_'));                // "american_express"
    
    // First word only
    if (words.length > 1 && words[0].length >= 3) {
      baseVariations.add(words[0]);                                         // "american"
    }
    
    // First two words combined
    if (words.length >= 2) {
      const firstTwo = words.slice(0, 2);
      baseVariations.add(firstTwo.join(''));                                // "americanexpress"
      baseVariations.add(firstTwo.join('-'));                               // "american-express"
      baseVariations.add(firstTwo.join('.'));                               // "american.express"
    }
    
    // Step 3: Add abbreviations (generic algorithm)
    const abbreviations = this.getBrandAbbreviationsForDomain(brandName);
    for (const abbrev of abbreviations.keys()) {
      if (abbrev.length >= 2 && abbrev.length <= 15) {
        baseVariations.add(abbrev);                                         // "amex", "ae", etc.
      }
    }
    
    // Step 4: Add common TLDs to each base variation
    // Note: We return base variations only (without TLD) to match against domain hostnames
    // The TLD matching is done separately in classifyBrandCitation
    return Array.from(baseVariations);
  }

  /**
   * Generate intelligent brand matching patterns for any brand name
   * @param {string} brandName - The brand name from database
   * @returns {Array} - Array of patterns to match in LLM responses
   */
  generateBrandPatterns(brandName) {
    const patterns = new Set([brandName]); // Always include exact brand name
    
    // Add case variations
    patterns.add(brandName.toLowerCase());
    patterns.add(brandName.toUpperCase());
    patterns.add(brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase()); // Title case
    
    // Remove special characters and normalize
    const cleanBrandName = brandName.replace(/[®™℠©]/g, '').trim();
    patterns.add(cleanBrandName);
    patterns.add(cleanBrandName.toLowerCase());
    patterns.add(cleanBrandName.toUpperCase());
    patterns.add(cleanBrandName.charAt(0).toUpperCase() + cleanBrandName.slice(1).toLowerCase());
    
    // Split brand name into words for intelligent matching
    const words = cleanBrandName.split(/\s+/).filter(w => w.length > 1);
    
    if (words.length === 0) return Array.from(patterns);
    
    // Add individual significant words (excluding common product words)
    const commonProductWords = new Set(['card', 'credit', 'debit', 'prepaid', 'rewards', 'cashback', 'travel', 'business', 'personal', 'premium', 'elite', 'gold', 'silver', 'platinum', 'diamond', 'black', 'blue', 'red', 'green', 'white']);
    
    words.forEach(word => {
      if (!commonProductWords.has(word.toLowerCase())) {
        patterns.add(word);
        patterns.add(word.toLowerCase());
        patterns.add(word.toUpperCase());
        patterns.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      }
    });
    
    // Add meaningful word combinations (avoid over-generating)
    if (words.length > 1) {
      // Add first two words (common for "Brand Name" patterns)
      if (words.length >= 2) {
        const twoWords = `${words[0]} ${words[1]}`;
        patterns.add(twoWords);
        patterns.add(twoWords.toLowerCase());
        patterns.add(twoWords.toUpperCase());
        patterns.add(twoWords.charAt(0).toUpperCase() + twoWords.slice(1).toLowerCase());
      }
    }
    
    // Add generic abbreviations (GENERIC - no hardcoding)
    // Use the generic abbreviation generation algorithm
    const abbreviations = this.getBrandAbbreviationsForDomain(brandName);
    
    // Add all generated abbreviations to patterns
    for (const abbrev of abbreviations.keys()) {
      if (abbrev.length >= 2 && abbrev.length <= 15) {
        patterns.add(abbrev);
        patterns.add(abbrev.toLowerCase());
        patterns.add(abbrev.toUpperCase());
      }
    }
    
    // Add parent brand patterns for product-specific names
    const productIndicators = ['card', 'credit', 'debit', 'rewards', 'cashback', 'travel', 'business'];
    const hasProductIndicator = productIndicators.some(indicator => 
      cleanBrandName.toLowerCase().includes(indicator)
    );
    
    if (hasProductIndicator) {
      // Extract parent brand name (everything before the first product indicator)
      const productWords = cleanBrandName.toLowerCase().split(/\s+/);
      const productIndex = productWords.findIndex(word => 
        productIndicators.includes(word)
      );
      
      if (productIndex > 0) {
        const parentBrand = productWords.slice(0, productIndex).join(' ');
        if (parentBrand.length > 0) {
          patterns.add(parentBrand);
          
          // Add key parent brand + product combinations (not all combinations)
          const keyProducts = ['card', 'credit'];
          keyProducts.forEach(indicator => {
            patterns.add(`${parentBrand} ${indicator}`);
          });
        }
      }
    }
    
    // Convert Set to Array, remove duplicates, and filter out empty patterns
    return Array.from(patterns)
      .filter(pattern => pattern && pattern.trim().length > 0)
      .sort((a, b) => b.length - a.length); // Sort by length (longest first) for better matching
  }
}

module.exports = new BrandPatternService();


