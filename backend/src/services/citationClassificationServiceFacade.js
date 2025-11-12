/**
 * Citation Classification Service Facade
 * Provides a unified interface with feature flag support for V1/V2 switching
 * Allows gradual migration and easy rollback
 */

const citationClassificationServiceV1 = require('./citationClassificationService');
const citationClassificationServiceV2 = require('./citationClassificationServiceV2');

class CitationClassificationServiceFacade {
  constructor() {
    // Feature flags from environment variables
    this.useV2 = process.env.USE_V2_CITATION_CLASSIFICATION === 'true';
    this.compareMode = process.env.CITATION_COMPARE_MODE === 'true';
    
    // Log which version is active
    if (this.compareMode) {
      console.log('🔍 [CITATION] Running in COMPARISON MODE - both V1 and V2 will execute');
    } else if (this.useV2) {
      console.log('✅ [CITATION] Using V2 Classification Service');
    } else {
      console.log('📌 [CITATION] Using V1 Classification Service (legacy)');
    }
  }

  /**
   * Clean and validate URL - delegates to active version
   */
  cleanAndValidateUrl(url) {
    const activeService = this.useV2 ? citationClassificationServiceV2 : citationClassificationServiceV1;
    return activeService.cleanAndValidateUrl(url);
  }

  /**
   * Categorize citation with feature flag support
   * @param {string} url - Citation URL
   * @param {string} brandName - Brand to check for
   * @param {Array} allBrands - All brands (including competitors)
   * @param {Array} verifiedDomains - Optional: User-provided verified domains (V2 only)
   * @param {object} context - Optional: Citation context (V2 only)
   * @returns {object} - Classification result
   */
  categorizeCitation(url, brandName, allBrands = [], verifiedDomains = [], context = {}) {
    if (this.compareMode) {
      // Run both versions and compare
      return this._compareVersions(url, brandName, allBrands, verifiedDomains, context);
    }
    
    if (this.useV2) {
      // Use V2 with enhanced parameters
      return citationClassificationServiceV2.categorizeCitation(
        url,
        brandName,
        allBrands,
        verifiedDomains,
        context
      );
    } else {
      // Use V1 (legacy) - ignore V2-only parameters
      const result = citationClassificationServiceV1.categorizeCitation(url, brandName, allBrands);
      
      // Normalize V1 response to match V2 format for consistency
      return this._normalizeV1Response(result);
    }
  }

  /**
   * Compare V1 and V2 results and log differences
   * @private
   */
  _compareVersions(url, brandName, allBrands, verifiedDomains, context) {
    // Run V1
    const v1Result = citationClassificationServiceV1.categorizeCitation(url, brandName, allBrands);
    const v1Normalized = this._normalizeV1Response(v1Result);
    
    // Run V2
    const v2Result = citationClassificationServiceV2.categorizeCitation(
      url,
      brandName,
      allBrands,
      verifiedDomains,
      context
    );
    
    // Compare results
    if (v1Normalized.type !== v2Result.type) {
      console.log('🔍 [CLASSIFICATION DIFF]', {
        url: url.substring(0, 100), // Truncate long URLs
        brandName,
        v1: {
          type: v1Normalized.type,
          brand: v1Normalized.brand,
          confidence: typeof v1Normalized.confidence === 'number' 
            ? v1Normalized.confidence.toFixed(2)
            : v1Normalized.confidence?.overall?.toFixed(2)
        },
        v2: {
          type: v2Result.type,
          brand: v2Result.brand,
          confidence: v2Result.confidence?.overall?.toFixed(2),
          flags: v2Result.flags,
          method: v2Result.metadata?.method
        }
      });
    }
    
    // Return V2 result when in comparison mode (using new logic)
    return v2Result;
  }

  /**
   * Normalize V1 response to match V2 format
   * @private
   */
  _normalizeV1Response(v1Result) {
    // V1 returns: { type, brand, confidence, label }
    // V2 returns: { type, brand, confidence: { overall, dimensions }, flags, metadata }
    
    // If already normalized (or V2 format), return as-is
    if (v1Result.confidence && typeof v1Result.confidence === 'object' && v1Result.confidence.overall !== undefined) {
      return v1Result;
    }
    
    // Normalize V1 to V2 format
    return {
      type: v1Result.type || 'unknown',
      brand: v1Result.brand || null,
      confidence: {
        overall: v1Result.confidence || 0.0,
        dimensions: {
          domainMatch: v1Result.confidence || 0.0,
          verification: v1Result.confidence || 0.0,
          contextRelevance: v1Result.confidence || 0.0
        }
      },
      flags: [],
      metadata: {
        method: v1Result.label || 'v1_classification',
        version: 'v1'
      }
    };
  }

  /**
   * Get service version info
   */
  getVersionInfo() {
    return {
      activeVersion: this.useV2 ? 'v2' : 'v1',
      compareMode: this.compareMode,
      features: {
        verifiedDomains: this.useV2,
        multiDimensionalConfidence: this.useV2,
        enhancedValidation: this.useV2,
        urlShortenerDetection: this.useV2
      }
    };
  }
}

// Export singleton instance
module.exports = new CitationClassificationServiceFacade();

