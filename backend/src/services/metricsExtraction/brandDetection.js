/**
 * Brand detection and matching logic
 */
const { levenshteinDistance, calculateSimilarity } = require('./utils');

/**
 * Remove common words (articles, prepositions) from brand name
 * Generic algorithm that works for any brand
 */
function removeCommonWords(text) {
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
function extractFirstSyllables(word, maxSyllables = 3) {
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
 * Get brand abbreviations (GENERIC - no hardcoding)
 * Works for ANY brand: financial, tech, retail, SaaS, etc.
 * Returns a map of abbreviation -> full brand name
 */
function getBrandAbbreviations(brandName) {
  const abbreviations = new Map();
  if (!brandName || typeof brandName !== 'string') return abbreviations;
  
  // Step 1: Remove common words and get significant words
  const significantWords = removeCommonWords(brandName);
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
    
    // First two words acronym
    if (significantWords.length >= 2) {
      const twoWordAcronym = significantWords.slice(0, 2).map(w => w[0]).join('').toLowerCase();
      if (twoWordAcronym.length >= 2 && twoWordAcronym !== fullAcronym) {
        abbreviations.set(twoWordAcronym, brandName);
      }
    }
  }
  
  // Step 3: Generate syllable-based abbreviations (for longer words)
  significantWords.forEach(word => {
    if (word.length > 6) {
      const syllables = extractFirstSyllables(word, 2);
      syllables.forEach(syllable => {
        if (syllable.length >= 2 && syllable.length <= 6) {
          abbreviations.set(syllable, brandName);
        }
      });
    }
  });
  
  // Step 4: Generate word-based abbreviations
  // First word only
  if (significantWords.length > 1 && significantWords[0].length >= 3) {
    abbreviations.set(significantWords[0], brandName);
  }
  
  // First two words combined
  if (significantWords.length >= 2) {
    const firstTwo = significantWords.slice(0, 2).join('');
    if (firstTwo.length >= 3) {
      abbreviations.set(firstTwo, brandName);
    }
  }
  
  // Step 5: Generate first word + last word initial
  if (significantWords.length >= 2) {
    const firstLast = (significantWords[0] + significantWords[significantWords.length - 1][0]).toLowerCase();
    if (firstLast.length >= 3) {
      abbreviations.set(firstLast, brandName);
    }
  }
  
  // Step 6: Generate first letter + partial word combinations
  if (significantWords.length >= 2) {
    const firstLetter = significantWords[0][0];
    significantWords.slice(1).forEach(word => {
      if (word.length >= 4) {
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
 * Generate common variations of a brand name for fuzzy matching
 */
function generateBrandVariations(brandName) {
  const variations = [];
  
  // Replace common words that might vary
  const replacements = [
    { from: /\bfor\b/gi, to: 'of' },
    { from: /\bof\b/gi, to: 'for' },
    { from: /\byour\b/gi, to: 'a' },
    { from: /\ba\b/gi, to: 'your' },
    { from: /\bthe\b/gi, to: '' }, // Remove "the"
    { from: /\bdesign\b/gi, to: 'design' }, // Keep as is
    { from: /\bsystem\b/gi, to: 'system' }, // Keep as is
  ];

  // Apply each replacement
  replacements.forEach(replacement => {
    const variation = brandName.replace(replacement.from, replacement.to);
    if (variation !== brandName && variation.trim().length > 0) {
      variations.push(variation.trim());
    }
  });

  // Also try without common articles and prepositions
  const withoutArticles = brandName.replace(/\b(the|a|an|for|of|your)\b/gi, '').trim();
  if (withoutArticles !== brandName && withoutArticles.length > 0) {
    variations.push(withoutArticles);
  }

  return variations;
}

/**
 * Check if a sentence contains a brand mention with confidence scoring
 * Returns: { detected: boolean, confidence: number (0-1), method: string }
 * Uses case-insensitive word boundary matching with fuzzy matching, abbreviations, and partial matching
 */
function containsBrand(sentence, brandName, options = {}) {
  if (!sentence || !brandName) {
    return { detected: false, confidence: 0 };
  }

  // Strategy 1: Exact match with word boundaries (confidence: 1.0)
  const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactRegex = new RegExp(`\\b${escapedBrand}\\b`, 'i');
  
  if (exactRegex.test(sentence)) {
    return { detected: true, confidence: 1.0, method: 'exact' };
  }

  // Strategy 2: Abbreviation matching (confidence: 0.9)
  const abbreviations = getBrandAbbreviations(brandName);
  for (const [abbrev, fullBrand] of abbreviations.entries()) {
    const abbrevRegex = new RegExp(`\\b${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (abbrevRegex.test(sentence)) {
      return { detected: true, confidence: 0.9, method: 'abbreviation' };
    }
  }

  // Strategy 3: Partial word match (if brand name contains multiple words)
  const brandWords = brandName.split(/\s+/).filter(w => w.length > 2);
  if (brandWords.length >= 2) {
    const allWordsMatch = brandWords.every(word => {
      const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordRegex.test(sentence);
    });
    
    if (allWordsMatch) {
      const sentenceWords = sentence.split(/\s+/);
      const wordIndices = brandWords.map(word => {
        return sentenceWords.findIndex(w => 
          w.toLowerCase().replace(/[^\w]/g, '') === word.toLowerCase().replace(/[^\w]/g, '')
        );
      }).filter(idx => idx !== -1).sort((a, b) => a - b);
      
      if (wordIndices.length === brandWords.length) {
        const maxDistance = Math.max(...wordIndices) - Math.min(...wordIndices);
        if (maxDistance <= 10) {
          return { detected: true, confidence: 0.85, method: 'partial' };
        } else {
          return { detected: true, confidence: 0.7, method: 'partial-distant' };
        }
      }
    }
  }

  // Strategy 4: Fuzzy matching with Levenshtein distance (OPTIMIZED)
  // Only check if brand name is short enough (performance optimization)
  // Skip fuzzy matching for very long brand names/sentences to avoid performance overhead
  if (brandName.length <= 30 && sentence.length <= 200) {
    const sentenceWords = sentence.split(/\s+/);
    // Limit fuzzy matching to first 5 words to avoid performance overhead
    const maxWords = Math.min(sentenceWords.length, 5);
    for (let i = 0; i < maxWords; i++) {
      // Check single word
      const word = sentenceWords[i].replace(/[^\w]/g, '');
      if (word.length >= 3 && word.length <= brandName.length + 5) {
        const similarity = calculateSimilarity(word, brandName);
        if (similarity >= 0.7) {
          return { detected: true, confidence: similarity * 0.9, method: 'fuzzy' };
        }
      }

      // Check two-word phrases (only first 3 phrases to limit computation)
      if (i < maxWords - 1 && i < 3) {
        const phrase = (sentenceWords[i] + ' ' + sentenceWords[i + 1]).replace(/[^\w\s]/g, '');
        if (phrase.length >= 4) {
          const similarity = calculateSimilarity(phrase, brandName);
          if (similarity >= 0.7) {
            return { detected: true, confidence: similarity * 0.9, method: 'fuzzy-phrase' };
          }
        }
      }
    }
  }

  // Strategy 5: Variation matching
  if (brandName.length > 10) {
    const variations = generateBrandVariations(brandName);
    
    for (const variation of variations) {
      const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variationRegex = new RegExp(`\\b${escapedVariation}\\b`, 'i');
      
      if (variationRegex.test(sentence)) {
        return { detected: true, confidence: 0.8, method: 'variation' };
      }
    }
  }

  return { detected: false, confidence: 0 };
}

module.exports = {
  containsBrand,
  getBrandAbbreviations,
  generateBrandVariations,
  removeCommonWords,
  extractFirstSyllables
};


