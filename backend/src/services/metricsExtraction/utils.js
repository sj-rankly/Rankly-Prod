/**
 * Utility functions for string similarity and text processing
 */

/**
 * Calculate Levenshtein distance between two strings (optimized with early exit)
 * Used for fuzzy string matching
 * Performance: Early exit if strings are too different (>30% length difference)
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  
  // Early exit: if length difference is too large, skip expensive calculation
  const maxLen = Math.max(m, n);
  const minLen = Math.min(m, n);
  if (maxLen === 0) return 0;
  if (minLen / maxLen < 0.5) return maxLen; // More than 50% difference, likely not similar
  
  // Limit computation for very long strings (performance optimization)
  const MAX_COMPARE_LENGTH = 50;
  if (m > MAX_COMPARE_LENGTH || n > MAX_COMPARE_LENGTH) {
    // Use simple length-based similarity for very long strings
    return Math.abs(m - n) + (m > n ? m : n) * 0.3;
  }

  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1)
 * Based on Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

module.exports = {
  levenshteinDistance,
  calculateSimilarity
};


