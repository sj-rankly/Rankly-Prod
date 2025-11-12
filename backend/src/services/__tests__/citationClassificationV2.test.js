/**
 * Unit Tests for Citation Classification Service V2
 * Tests zero-error classification approach with comprehensive edge cases
 */

const citationClassificationServiceV2 = require('../citationClassificationServiceV2');

describe('CitationClassificationServiceV2', () => {
  
  describe('URL Validation', () => {
    
    test('should validate correct URLs', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('https://www.example.com');
      expect(result.valid).toBe(true);
      expect(result.domain).toBe('example.com');
      expect(result.tld).toBe('com');
    });
    
    test('should handle URLs without protocol', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('example.com');
      expect(result.valid).toBe(true);
      expect(result.domain).toBe('example.com');
    });
    
    test('should reject invalid TLDs', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('https://example.invalidtld');
      expect(result.valid).toBe(false);
      expect(result.flags).toContain('unknown_tld');
    });
    
    test('should detect URL shorteners', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('https://bit.ly/3x7k9mP');
      expect(result.valid).toBe(true);
      expect(result.flags).toContain('url_shortener');
    });
    
    test('should reject invalid IP addresses', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('https://127.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.flags).toContain('invalid_ip_range');
    });
    
    test('should handle two-part TLDs correctly', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('https://example.co.uk');
      expect(result.valid).toBe(true);
      expect(result.tld).toBe('co.uk');
    });
    
    test('should reject citation markers', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('citation_1');
      expect(result.valid).toBe(false);
      expect(result.flags).toContain('citation_marker');
    });
    
    test('should clean trailing punctuation', () => {
      const result = citationClassificationServiceV2.cleanAndValidateUrl('https://example.com).');
      expect(result.valid).toBe(true);
      expect(result.cleanedUrl).toBe('https://example.com');
    });
  });
  
  describe('Brand Classification', () => {
    
    const mockBrands = [
      { name: 'American Express' },
      { name: 'Chase' },
      { name: 'Capital One' },
      { name: 'Apollo.io' },
      { name: 'ZoomInfo' }
    ];
    
    test('should classify brand domain correctly', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://americanexpress.com',
        'American Express',
        mockBrands
      );
      expect(result.type).toBe('brand');
      expect(result.brand).toBe('American Express');
      expect(result.confidence.overall).toBeGreaterThan(0.9);
    });
    
    test('should classify brand subdomain correctly', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://blog.apollo.io/article',
        'Apollo.io',
        mockBrands
      );
      expect(result.type).toBe('brand');
      expect(result.brand).toBe('Apollo.io');
    });
    
    test('should NOT misclassify competitor domains', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://chase.com',
        'American Express', // Analyzing American Express, not Chase
        mockBrands
      );
      // Should be earned, not brand (Chase is competitor)
      expect(result.type).not.toBe('brand');
      expect(result.brand).not.toBe('American Express');
    });
    
    test('should NOT misclassify common word domains', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://goosechase.com', // "chase" is in domain but not the brand
        'Chase',
        mockBrands
      );
      expect(result.type).not.toBe('brand');
      expect(result.brand).not.toBe('Chase');
    });
    
    test('should handle brand abbreviations', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://amex.com',
        'American Express',
        mockBrands
      );
      expect(result.type).toBe('brand');
      expect(result.brand).toBe('American Express');
    });
    
    test('should use verified domains with highest confidence', () => {
      const verifiedDomains = ['americanexpress.com', 'amex.com'];
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://americanexpress.com',
        'American Express',
        mockBrands,
        verifiedDomains
      );
      expect(result.type).toBe('brand');
      expect(result.confidence.overall).toBeGreaterThan(0.98);
      expect(result.metadata.verified).toBe(true);
    });
  });
  
  describe('Social Classification', () => {
    
    test('should classify major social platforms', () => {
      const platforms = [
        'https://facebook.com/page',
        'https://twitter.com/user',
        'https://linkedin.com/in/user',
        'https://youtube.com/watch?v=123',
        'https://instagram.com/user'
      ];
      
      platforms.forEach(url => {
        const result = citationClassificationServiceV2.categorizeCitation(url, 'Test Brand', []);
        expect(result.type).toBe('social');
        expect(result.confidence.overall).toBeGreaterThan(0.9);
      });
    });
    
    test('should classify new platforms (2024)', () => {
      const newPlatforms = [
        'https://threads.net/user',
        'https://bsky.app/profile/user',
        'https://truth.social/user'
      ];
      
      newPlatforms.forEach(url => {
        const result = citationClassificationServiceV2.categorizeCitation(url, 'Test Brand', []);
        expect(result.type).toBe('social');
      });
    });
    
    test('should handle social platform subdomains', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://m.facebook.com/page',
        'Test Brand',
        []
      );
      expect(result.type).toBe('social');
    });
  });
  
  describe('Earned Classification', () => {
    
    test('should classify news sites as earned', () => {
      const newsSites = [
        'https://techcrunch.com/article',
        'https://nytimes.com/article',
        'https://theguardian.com/news'
      ];
      
      newsSites.forEach(url => {
        const result = citationClassificationServiceV2.categorizeCitation(url, 'Test Brand', []);
        expect(result.type).toBe('earned');
        expect(result.metadata.category).toMatch(/news|editorial/i);
      });
    });
    
    test('should classify review sites as earned', () => {
      const reviewSites = [
        'https://reviews.com/product',
        'https://comparecards.com/best',
        'https://bestcompare.io/tools'
      ];
      
      reviewSites.forEach(url => {
        const result = citationClassificationServiceV2.categorizeCitation(url, 'Test Brand', []);
        expect(result.type).toBe('earned');
      });
    });
    
    test('should classify industry publications as earned', () => {
      const industrySites = [
        'https://businessinsider.com/article',
        'https://marketingjournal.org/study',
        'https://tech.edu/research'
      ];
      
      industrySites.forEach(url => {
        const result = citationClassificationServiceV2.categorizeCitation(url, 'Test Brand', []);
        expect(result.type).toBe('earned');
      });
    });
  });
  
  describe('Edge Cases', () => {
    
    test('should handle URL shorteners appropriately', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://bit.ly/3x7k9mP',
        'Test Brand',
        []
      );
      expect(result.type).toBe('unknown');
      expect(result.flags).toContain('url_shortener');
      expect(result.metadata.suggestion).toContain('Resolve shortener');
    });
    
    test('should reject malformed URLs', () => {
      const malformedUrls = [
        'https://-iq.com/',
        'https://2b.com/',
        'not-a-url',
        'ftp://invalid.com' // Different protocol
      ];
      
      malformedUrls.forEach(url => {
        const result = citationClassificationServiceV2.categorizeCitation(url, 'Test Brand', []);
        expect(result.type).toBe('unknown');
      });
    });
    
    test('should handle international domains', () => {
      const internationalUrls = [
        'https://example.co.uk',
        'https://example.co.in',
        'https://example.com.au'
      ];
      
      internationalUrls.forEach(url => {
        const result = citationClassificationServiceV2.cleanAndValidateUrl(url);
        expect(result.valid).toBe(true);
      });
    });
    
    test('should provide multi-dimensional confidence scores', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://americanexpress.com',
        'American Express',
        [{ name: 'American Express' }]
      );
      
      expect(result.confidence).toHaveProperty('overall');
      expect(result.confidence).toHaveProperty('dimensions');
      expect(result.confidence.dimensions).toHaveProperty('domainMatch');
      expect(result.confidence.dimensions).toHaveProperty('verification');
      expect(result.confidence.dimensions).toHaveProperty('contextRelevance');
    });
  });
  
  describe('Common Word Filtering', () => {
    
    test('should identify common words correctly', () => {
      const commonWords = ['one', 'bank', 'card', 'credit', 'the', 'get', 'shop'];
      commonWords.forEach(word => {
        expect(citationClassificationServiceV2.isCommonWord(word)).toBe(true);
      });
    });
    
    test('should not flag brand-specific terms as common', () => {
      const brandWords = ['apollo', 'zoominfo', 'salesforce', 'hubspot'];
      brandWords.forEach(word => {
        expect(citationClassificationServiceV2.isCommonWord(word)).toBe(false);
      });
    });
  });
  
  describe('Confidence Calibration', () => {
    
    test('verified domains should have highest confidence', () => {
      const verifiedResult = citationClassificationServiceV2.categorizeCitation(
        'https://apollo.io',
        'Apollo.io',
        [{ name: 'Apollo.io' }],
        ['apollo.io']
      );
      expect(verifiedResult.confidence.overall).toBeGreaterThanOrEqual(0.98);
    });
    
    test('pattern-matched brands should have high but lower confidence', () => {
      const patternResult = citationClassificationServiceV2.categorizeCitation(
        'https://apollo.io',
        'Apollo.io',
        [{ name: 'Apollo.io' }]
        // No verified domains
      );
      expect(patternResult.confidence.overall).toBeGreaterThanOrEqual(0.90);
      expect(patternResult.confidence.overall).toBeLessThan(0.98);
    });
    
    test('earned media should have moderate confidence', () => {
      const earnedResult = citationClassificationServiceV2.categorizeCitation(
        'https://randomthirdparty.com',
        'Test Brand',
        []
      );
      expect(earnedResult.type).toBe('earned');
      expect(earnedResult.confidence.overall).toBeGreaterThanOrEqual(0.70);
      expect(earnedResult.confidence.overall).toBeLessThanOrEqual(0.90);
    });
  });
  
  describe('Real-world Examples from Database', () => {
    
    test('should classify apollo.io correctly for Apollo.io brand', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://apollo.io/',
        'Apollo.io',
        [{ name: 'Apollo.io' }, { name: 'ZoomInfo' }, { name: 'Clay' }]
      );
      expect(result.type).toBe('brand');
      expect(result.brand).toBe('Apollo.io');
    });
    
    test('should classify pipeline.zoominfo.com correctly for ZoomInfo brand', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://pipeline.zoominfo.com/sales/lead-enrichment-tools',
        'ZoomInfo',
        [{ name: 'ZoomInfo' }, { name: 'Apollo.io' }, { name: 'Clay' }]
      );
      expect(result.type).toBe('brand');
      expect(result.brand).toBe('ZoomInfo');
    });
    
    test('should classify third-party blog as earned', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://www.cognism.com/blog/lead-enrichment-tools',
        'Clay',
        [{ name: 'Clay' }, { name: 'Cognism' }]
      );
      expect(result.type).toBe('earned');
    });
    
    test('should classify YouTube as social', () => {
      const result = citationClassificationServiceV2.categorizeCitation(
        'https://www.youtube.com/watch?v=HDdlD3IDmkM',
        'Clay',
        [{ name: 'Clay' }]
      );
      expect(result.type).toBe('social');
    });
  });
});

