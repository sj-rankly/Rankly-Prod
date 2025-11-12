/**
 * Utility functions for prompt generation
 */

/**
 * Utility function to wait for a specified time
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar (0 = identical)
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate word-level similarity (Jaccard similarity on word sets)
 * Returns a value between 0 (completely different) and 1 (identical word sets)
 */
function wordSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2)); // Ignore words <= 2 chars
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

module.exports = {
  sleep,
  levenshteinDistance,
  wordSimilarity
};


