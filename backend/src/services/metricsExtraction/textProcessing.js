/**
 * Text processing utilities for metrics extraction
 */

/**
 * Split text into sentences using simple rules
 * Handles periods, question marks, exclamation points
 */
function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') return [];

  // Simple sentence splitting - split on ., !, ?
  // This is a simplified version; for production consider using NLP libraries
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Count words in text
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Validate and normalize brand names for consistent matching
 */
function normalizeBrandName(brandName) {
  if (!brandName) return '';
  return brandName.trim();
}

module.exports = {
  splitIntoSentences,
  countWords,
  normalizeBrandName
};


