/**
 * Prompt Deduplication Utility
 * 
 * Prevents duplicate prompts by using hash-based checking.
 * Checks against both database and in-memory session cache.
 */

const crypto = require('crypto');
const Prompt = require('../models/Prompt');

class PromptDeduplicator {
  constructor(userId = null) {
    this.userId = userId;
    this.sessionHashes = new Set(); // In-memory cache for current session
    this.maxRetries = 3;
  }

  /**
   * Normalize prompt text for hashing
   * Removes extra whitespace and converts to lowercase
   * @param {string} promptText - Prompt text to normalize
   * @returns {string} Normalized prompt text
   */
  normalizePrompt(promptText) {
    return promptText
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s]/g, ''); // Remove punctuation for comparison
  }

  /**
   * Generate hash for a prompt
   * @param {string} promptText - Prompt text
   * @returns {string} SHA256 hash
   */
  generateHash(promptText) {
    const normalized = this.normalizePrompt(promptText);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Check if prompt is a duplicate
   * @param {string} promptText - Prompt text to check
   * @param {boolean} checkDatabase - Whether to check database (default: true)
   * @returns {Promise<boolean>} True if duplicate, false otherwise
   */
  async isDuplicate(promptText, checkDatabase = true) {
    const hash = this.generateHash(promptText);

    // Check session cache first (fastest)
    if (this.sessionHashes.has(hash)) {
      return true;
    }

    // Check database if requested
    if (checkDatabase && this.userId) {
      try {
        // Check against existing prompts in database
        // We check by generating hash of normalized text
        const existingPrompts = await Prompt.find({
          userId: this.userId,
          status: 'active'
        }).select('text').lean();

        for (const existingPrompt of existingPrompts) {
          const existingHash = this.generateHash(existingPrompt.text);
          if (existingHash === hash) {
            return true;
          }
        }
      } catch (error) {
        console.warn('⚠️  Error checking database for duplicates:', error.message);
        // Continue with session-only checking if DB check fails
      }
    }

    return false;
  }

  /**
   * Add prompt to session cache
   * @param {string} promptText - Prompt text to add
   */
  addToSession(promptText) {
    const hash = this.generateHash(promptText);
    this.sessionHashes.add(hash);
  }

  /**
   * Filter out duplicates from an array of prompts
   * @param {Array<string>} prompts - Array of prompt texts
   * @param {boolean} checkDatabase - Whether to check database
   * @returns {Promise<Array<string>>} Filtered array of unique prompts
   */
  async filterDuplicates(prompts, checkDatabase = true) {
    const uniquePrompts = [];
    const duplicateIndices = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const isDup = await this.isDuplicate(prompt, checkDatabase);
      
      if (!isDup) {
        uniquePrompts.push(prompt);
        this.addToSession(prompt);
      } else {
        duplicateIndices.push(i);
      }
    }

    if (duplicateIndices.length > 0) {
      console.warn(`⚠️  Found ${duplicateIndices.length} duplicate prompts at indices: ${duplicateIndices.join(', ')}`);
    }

    return uniquePrompts;
  }

  /**
   * Validate and regenerate prompts if duplicates found
   * @param {Array<string>} prompts - Array of prompt texts
   * @param {Function} regenerateFn - Function to regenerate prompts if needed
   * @param {object} context - Context for regeneration
   * @returns {Promise<Array<string>>} Array of unique prompts
   */
  async validateAndRegenerate(prompts, regenerateFn = null, context = {}) {
    let uniquePrompts = await this.filterDuplicates(prompts, true);
    let attempts = 0;

    // If we lost prompts due to duplicates and have a regenerate function, try to regenerate
    while (uniquePrompts.length < prompts.length && attempts < this.maxRetries && regenerateFn) {
      const needed = prompts.length - uniquePrompts.length;
      console.log(`🔄 Regenerating ${needed} prompts to replace duplicates (attempt ${attempts + 1}/${this.maxRetries})...`);
      
      try {
        const regenerated = await regenerateFn(context, needed);
        const newUnique = await this.filterDuplicates(regenerated, true);
        uniquePrompts = [...uniquePrompts, ...newUnique].slice(0, prompts.length); // Keep only needed amount
        
        if (uniquePrompts.length >= prompts.length) {
          break;
        }
      } catch (error) {
        console.error('❌ Error during regeneration:', error.message);
        attempts++;
        if (attempts >= this.maxRetries) {
          console.warn(`⚠️  Max retries reached. Returning ${uniquePrompts.length}/${prompts.length} unique prompts.`);
          break;
        }
      }
      
      attempts++;
    }

    return uniquePrompts.slice(0, prompts.length);
  }

  /**
   * Clear session cache
   */
  clearSession() {
    this.sessionHashes.clear();
  }

  /**
   * Get statistics about duplicates found
   * @param {Array<string>} prompts - Array of prompts to analyze
   * @returns {object} Statistics object
   */
  async getDuplicateStats(prompts) {
    const duplicates = [];
    const seenHashes = new Set();

    for (const prompt of prompts) {
      const hash = this.generateHash(prompt);
      if (seenHashes.has(hash)) {
        duplicates.push(prompt);
      } else {
        seenHashes.add(hash);
      }
    }

    return {
      total: prompts.length,
      unique: prompts.length - duplicates.length,
      duplicates: duplicates.length,
      duplicateRate: ((duplicates.length / prompts.length) * 100).toFixed(2) + '%'
    };
  }
}

module.exports = PromptDeduplicator;

