/**
 * Citation Extraction Service
 * Handles extraction of citations from LLM responses across all providers
 */

class CitationExtractionService {
  /**
   * Extract citations from LLM response - Enhanced for unlimited capture across all 4 LLMs
   * @param {object} responseData - Full API response
   * @param {string} llmProvider - LLM provider name (openai, gemini, claude, perplexity)
   * @param {string} responseText - Response text content
   * @returns {Array} - Array of citation objects with proper labeling
   */
  extractCitations(responseData, llmProvider, responseText) {
    const citations = [];
    const seenUrls = new Set(); // Track unique URLs to prevent duplicates
    const seenIds = new Set(); // Track unique citation IDs

    try {
      console.log(`      🔍 [CITATIONS] Starting enhanced extraction for ${llmProvider}`);

      // ===== PROVIDER-SPECIFIC CITATION EXTRACTION =====
      
      // Method 1: Perplexity API citations (structured in API response)
      if (llmProvider === 'perplexity' && responseData.citations) {
        responseData.citations.forEach((cit, idx) => {
          const cleanUrl = this.cleanUrl(cit);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: `Citation ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'perplexity_api',
              confidence: 1.0,
              label: 'perplexity_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
        console.log(`         ✅ Extracted ${responseData.citations.length} citations from Perplexity API`);
      }

      // Method 2: Claude API citations (if available in structured format)
      if (llmProvider === 'claude' && responseData.sources) {
        responseData.sources.forEach((source, idx) => {
          const url = source.url || source;
          const cleanUrl = this.cleanUrl(url);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: source.text || `Claude source ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'claude_api',
              confidence: 0.95,
              label: 'claude_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      }

      // Method 3: OpenAI API citations (if available in structured format)
      if (llmProvider === 'openai' && responseData.citations) {
        responseData.citations.forEach((cit, idx) => {
          const cleanUrl = this.cleanUrl(cit.url || cit);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: cit.text || `OpenAI citation ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'openai_api',
              confidence: 0.95,
              label: 'openai_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      }

      // Method 4: Gemini API citations (if available in structured format)
      if (llmProvider === 'gemini' && responseData.citations) {
        responseData.citations.forEach((cit, idx) => {
          const cleanUrl = this.cleanUrl(cit.url || cit);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: cit.text || `Gemini citation ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'gemini_api',
              confidence: 0.95,
              label: 'gemini_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      }

      // ===== TEXT-BASED CITATION EXTRACTION (Universal for all LLMs) =====

      // Method 5: Enhanced markdown link parsing [text](url) - Multiple patterns
      // ✅ FIX: Improved markdown link extraction to handle URLs with parentheses and special characters
      // Pattern 1: [text](url) - But handle URLs that may contain parentheses in the path
      // We need to match the closing paren, but URLs can have parens in them, so we use a smarter approach
      const markdownPatterns = [
        /\[([^\]]+)\]\((https?:\/\/[^\)]+?)\)/g,  // [text](url) - non-greedy to stop at first )
        /\[([^\]]+)\]\((https?:\/\/[^\)]*\/[^\)]*)\)/g,  // [text](url with path containing special chars)
        /\[([^\]]+)\]\[([^\]]+)\]/g, // [text][ref]
        /\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)/g, // [ref]: url
        /\[([^\]]+)\]:\s*([^\s]+)/g  // [ref]: url (without protocol)
      ];

      markdownPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          const text = match[1]?.trim();
          let url = match[2]?.trim();
          
          if (url) {
            // Add protocol if missing
            if (!url.startsWith('http')) {
              url = 'https://' + url;
            }
            
            const cleanUrl = this.cleanUrl(url);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: text || 'Link',
                type: 'markdown_link',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.9,
                label: 'markdown_link',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          }
        }
      });

      // Method 6: Bare URLs extraction - Enhanced regex patterns
      // ✅ FIX: Improved URL patterns to capture full URLs including paths, not truncating at word boundaries
      const urlPatterns = [
        /https?:\/\/[^\s<>"{}|\\^`\[\]()]+(?:\/[^\s<>"{}|\\^`\[\]()]*)*/g,  // Standard URLs with full paths
        /https?:\/\/[^\s<>"{}|\\^`\[\]()]+/g,  // Fallback: Standard URLs
        /www\.[^\s<>"{}|\\^`\[\]()]+\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]()]*)*/g,  // www URLs with paths
        /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]()]*)*/g  // Domain patterns with paths
      ];

      urlPatterns.forEach(pattern => {
        const urls = responseText.match(pattern) || [];
        urls.forEach(url => {
          const cleanUrl = this.cleanUrl(url);
          if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: null,
              type: 'bare_url',
              position: citations.length + 1,
              provider: llmProvider,
              confidence: 0.8,
              label: 'bare_url',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      });

      // Method 7: Citation markers and references [1][2][3] or [1,2,3]
      const citationMarkerPatterns = [
        /\[([0-9,\s]+)\]/g,  // [1,2,3] or [1 2 3]
        /\[([0-9]+)\]/g,     // [1] [2] [3]
        /\(([0-9,\s]+)\)/g,  // (1,2,3) or (1 2 3)
        /\(([0-9]+)\)/g,     // (1) (2) (3)
        /^\[([0-9]+)\]:\s*(.+)$/gm,  // [1]: url
        /^(\d+)\.\s*(https?:\/\/[^\s]+)/gm  // 1. url
      ];

      citationMarkerPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          // Handle direct URL references
          if (match[2] && match[2].startsWith('http')) {
            const cleanUrl = this.cleanUrl(match[2]);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: `Reference ${match[1]}`,
                type: 'reference',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.9,
                label: 'numbered_reference',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          } else if (match[1] && !match[2]) {
            // Citation markers without URLs
            const citationNumbers = match[1].split(/[,\s]+/).filter(n => n.trim());
            citationNumbers.forEach(num => {
              const citationId = num.trim();
              if (citationId && !seenIds.has(citationId)) {
                citations.push({
                  id: citationId,
                  url: `citation_${citationId}`,
                  text: `Citation ${citationId}`,
                  type: 'citation_marker',
                  position: citations.length + 1,
                  provider: llmProvider,
                  confidence: 0.7,
                  label: 'citation_marker',
                  extractedAt: new Date().toISOString()
                });
                seenIds.add(citationId);
              }
            });
          }
        }
      });

      // Method 8: HTML links <a href="url">text</a>
      const htmlPatterns = [
        /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,  // <a href="url">text</a>
        /<a[^>]+href=([^\s>]+)[^>]*>([^<]*)<\/a>/gi,         // <a href=url>text</a>
        /href=["']([^"']+)["']/gi,                           // href="url"
        /href=([^\s>]+)/gi                                   // href=url
      ];

      htmlPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          const url = match[1] || match[0];
          const text = match[2] || 'Link';
          
          if (url && url.startsWith('http')) {
            const cleanUrl = this.cleanUrl(url);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: text,
                type: 'html_link',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.9,
                label: 'html_link',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          }
        }
      });

      // Method 9: Reference patterns and footnotes
      const referencePatterns = [
        /See\s+(?:also\s+)?(?:https?:\/\/[^\s]+)/gi,  // See also url
        /For\s+more\s+information[^:]*:\s*(https?:\/\/[^\s]+)/gi,  // For more info: url
        /Source:\s*(https?:\/\/[^\s]+)/gi,  // Source: url
        /Reference:\s*(https?:\/\/[^\s]+)/gi,  // Reference: url
        /Visit:\s*(https?:\/\/[^\s]+)/gi,  // Visit: url
        /Learn\s+more[^:]*:\s*(https?:\/\/[^\s]+)/gi,  // Learn more: url
        /Check\s+out[^:]*:\s*(https?:\/\/[^\s]+)/gi  // Check out: url
      ];

      referencePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          const url = match[1] || match[0];
          if (url && url.startsWith('http')) {
            const cleanUrl = this.cleanUrl(url);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: 'Reference',
                type: 'reference',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.8,
                label: 'textual_reference',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          }
        }
      });

      // Clean and validate all citations
      const cleanedCitations = this.cleanAndValidateCitations(citations, llmProvider);

      // Sort by position
      cleanedCitations.sort((a, b) => a.position - b.position);

      console.log(`      📎 [CITATIONS] Extracted ${cleanedCitations.length} unique citations from ${llmProvider}`);
      console.log(`      📊 [CITATIONS] Breakdown: ${this.getCitationBreakdown(cleanedCitations)}`);

      return cleanedCitations;

    } catch (error) {
      console.error(`      ❌ [CITATIONS ERROR] Failed to extract citations:`, error.message);
      console.error(`      Stack:`, error.stack);
      return citations; // Return what we have so far
    }
  }

  /**
   * Clean URL by removing trailing punctuation and normalizing
   */
  cleanUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
      // ✅ FIX: Remove trailing punctuation more aggressively (parentheses, brackets, commas, etc.)
      let cleanUrl = url.trim();
      // Remove trailing punctuation: ), ], ;, ., ,, !, ?, and combinations
      cleanUrl = cleanUrl.replace(/[)\],;.!?]+$/, '');
      // Also remove trailing whitespace
      cleanUrl = cleanUrl.trim();
      
      // Add protocol if missing
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Normalize URL
      const urlObj = new URL(cleanUrl);
      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, try basic cleaning
      return url.replace(/[)\],;.!?]+$/, '').trim();
    }
  }

  /**
   * Validate if URL is properly formatted
   * Uses citationClassificationService for consistent validation
   */
  isValidUrl(url) {
    // Use the citation classification service for consistent validation
    const citationClassificationService = require('./citationClassificationService');
    const validation = citationClassificationService.cleanAndValidateUrl(url);
    return validation.valid;
  }

  /**
   * Clean and validate all extracted citations
   */
  cleanAndValidateCitations(citations, llmProvider) {
    return citations
      .filter(citation => {
        // Remove invalid citations
        if (!citation.url || citation.url === 'undefined' || citation.url === 'null') {
          return false;
        }
        
        // Keep citation markers (they're placeholders for references)
        // But filter them out if they're not valid
        if (citation.url.startsWith('citation_')) {
          return true; // Keep citation markers
        }
        
        // Validate URL format
        return this.isValidUrl(citation.url);
      })
      .map(citation => ({
        ...citation,
        url: citation.url.startsWith('citation_') ? citation.url : this.cleanUrl(citation.url),
        llmProvider: llmProvider,
        extractedAt: citation.extractedAt || new Date().toISOString()
      }));
  }

  /**
   * Get citation breakdown for logging
   */
  getCitationBreakdown(citations) {
    const breakdown = {};
    citations.forEach(citation => {
      const type = citation.type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return Object.entries(breakdown)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
  }
}

module.exports = new CitationExtractionService();

