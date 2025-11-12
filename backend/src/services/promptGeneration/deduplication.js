/**
 * Deduplication logic for prompt generation
 */
const { levenshteinDistance, wordSimilarity } = require('./utils');

/**
 * Utility to normalize prompt text (case, punctuation, whitespace)
 */
function normalizePromptText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast hash function for prompt deduplication
 * Returns a simple integer hash for O(1) duplicate detection
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash); // Return positive hash
}

/**
 * Enhanced near-duplicate detection with multiple similarity metrics
 * Uses Levenshtein distance, word overlap, and substring matching
 */
function isNearDuplicate(a, b) {
  if (!a || !b) return false;
  
  const normA = normalizePromptText(a);
  const normB = normalizePromptText(b);
  
  // Exact match after normalization
  if (normA === normB) return true;
  
  // Short strings: stricter matching
  if (normA.length < 15 || normB.length < 15) {
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - (distance / maxLen);
    // For short strings, require >85% similarity
    if (similarity > 0.85) return true;
  }
  
  // Substring containment check (major overlap)
  if (normA.length > 20 && normB.length > 20) {
    const shorter = normA.length < normB.length ? normA : normB;
    const longer = normA.length >= normB.length ? normA : normB;
    // If shorter string is mostly contained in longer string
    if (longer.includes(shorter)) {
      // Check if overlap is significant (>= 70% of shorter string)
      const overlapRatio = shorter.length / longer.length;
      if (overlapRatio >= 0.7) return true;
    }
  }
  
  // Word-level similarity check
  const wordSim = wordSimilarity(normA, normB);
  // If >75% of words overlap, consider it a near-duplicate
  if (wordSim > 0.75) return true;
  
  // Levenshtein distance check for longer strings
  if (normA.length >= 20 && normB.length >= 20) {
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - (distance / maxLen);
    // For longer strings, >80% similarity indicates near-duplicate
    if (similarity > 0.80) return true;
  }
  
  return false;
}

/**
 * Check if a prompt has good diversity compared to existing prompts
 * Returns true if prompt is diverse enough, false if too similar
 */
function hasGoodDiversity(promptText, existingPrompts, minDiversity = 0.3) {
  const normPrompt = normalizePromptText(promptText);
  
  for (const existing of existingPrompts) {
    const normExisting = normalizePromptText(existing);
    
    // Calculate word diversity
    const wordSim = wordSimilarity(normPrompt, normExisting);
    if (wordSim > (1 - minDiversity)) {
      return false; // Too similar
    }
    
    // Check structure similarity (same starting words pattern)
    const promptWords = normPrompt.split(/\s+/).slice(0, 3); // First 3 words
    const existingWords = normExisting.split(/\s+/).slice(0, 3);
    const matchingStart = promptWords.filter(w => existingWords.includes(w)).length;
    // If 2+ of first 3 words match, might be too similar structurally
    if (matchingStart >= 2 && promptWords.length >= 2) {
      // But allow if overall word similarity is still low
      if (wordSim > 0.6) return false;
    }
  }
  
  return true;
}

module.exports = {
  normalizePromptText,
  simpleHash,
  isNearDuplicate,
  hasGoodDiversity
};


