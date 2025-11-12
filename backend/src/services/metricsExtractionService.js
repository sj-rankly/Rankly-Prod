/**
 * Deterministic Metrics Extraction Service
 *
 * This file is now a backward-compatible wrapper around the modularized service.
 * The actual implementation has been moved to metricsExtraction/ directory.
 * 
 * @deprecated Import from './metricsExtraction' directly for better tree-shaking
 */

// Re-export from modular structure for backward compatibility
module.exports = require('./metricsExtraction');
