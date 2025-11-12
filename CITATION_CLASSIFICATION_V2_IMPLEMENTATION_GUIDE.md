# Citation Classification V2 - Implementation Guide

## Overview

This document provides a step-by-step guide for implementing the enhanced Citation Classification Service V2 with near-zero error rates.

---

## What's New in V2

### 1. **Enhanced URL Validation**
- ✅ Comprehensive TLD validation (200+ TLDs)
- ✅ URL shortener detection (20+ services)
- ✅ Better IP address validation
- ✅ Support for two-part TLDs (co.uk, com.au)
- ✅ Improved error handling with detailed flags

### 2. **Stricter Brand Classification**
- ✅ Expanded common words list (100+ words)
- ✅ Stricter matching thresholds (60% ratio vs 50%)
- ✅ Minimum length requirement (6 chars vs 5)
- ✅ Better abbreviation filtering
- ✅ User-verified domain support

### 3. **Multi-Dimensional Confidence Scoring**
```javascript
{
  overall: 0.95,
  dimensions: {
    domainMatch: 0.98,
    verification: 0.92,
    contextRelevance: 0.95
  }
}
```

### 4. **Comprehensive Edge Case Handling**
- ✅ URL shorteners flagged (not classified)
- ✅ Invalid TLDs rejected
- ✅ Malformed URLs caught
- ✅ International domains supported

### 5. **Better Social Media Coverage**
- ✅ Added 2024 platforms (Threads, Bluesky, Truth Social)
- ✅ 70+ social platforms covered

---

## Implementation Steps

### Step 1: Review the Analysis Document

**Read:** `CITATION_CLASSIFICATION_ANALYSIS.md`

This document contains:
- Current system analysis
- Identified loopholes (10 critical issues)
- Database findings
- Improvement recommendations

**Key Findings:**
- Current accuracy: ~93-94%
- Target accuracy: >99%
- Main issues: Common word false positives, missing TLD validation, URL shorteners

---

### Step 2: Test the New Service

**File:** `backend/src/services/__tests__/citationClassificationV2.test.js`

**Run tests:**
```bash
cd backend
npm test -- citationClassificationV2.test.js
```

**Expected Results:**
- All tests should pass
- Edge cases should be handled correctly
- Confidence scores should be calibrated

---

### Step 3: Gradual Migration Strategy

#### Option A: Parallel Running (Recommended for Production)

Run both V1 and V2 side-by-side, compare results, and gradually switch over.

**Implementation:**

1. **Modify `promptTestingService.js`:**

```javascript
const citationClassificationV1 = require('./citationClassificationService');
const citationClassificationV2 = require('./citationClassificationServiceV2');

// Feature flag (environment variable)
const USE_V2_CLASSIFICATION = process.env.USE_V2_CITATION_CLASSIFICATION === 'true';
const COMPARE_MODE = process.env.CITATION_COMPARE_MODE === 'true';

function classifyCitation(url, brandName, allBrands, verifiedDomains = []) {
  if (COMPARE_MODE) {
    // Run both and log differences
    const v1Result = citationClassificationV1.categorizeCitation(url, brandName, allBrands);
    const v2Result = citationClassificationV2.categorizeCitation(url, brandName, allBrands, verifiedDomains);
    
    if (v1Result.type !== v2Result.type) {
      console.log('🔍 [CLASSIFICATION DIFF]', {
        url,
        v1: v1Result.type,
        v2: v2Result.type,
        v1Confidence: v1Result.confidence,
        v2Confidence: v2Result.confidence
      });
    }
    
    // Return V2 result but log differences
    return v2Result;
  }
  
  // Use based on feature flag
  if (USE_V2_CLASSIFICATION) {
    return citationClassificationV2.categorizeCitation(url, brandName, allBrands, verifiedDomains);
  } else {
    return citationClassificationV1.categorizeCitation(url, brandName, allBrands);
  }
}
```

2. **Set environment variables:**

```bash
# .env.production
USE_V2_CITATION_CLASSIFICATION=true
CITATION_COMPARE_MODE=false  # Set to true for comparison mode
```

3. **Deploy with comparison mode first:**
   - Set `CITATION_COMPARE_MODE=true`
   - Monitor logs for differences
   - Review and validate differences
   - After 1-2 weeks, set `CITATION_COMPARE_MODE=false`

#### Option B: Direct Replacement (For Testing/Staging)

Simply replace the import in all files using citation classification.

**Files to update:**
- `backend/src/services/promptTestingService.js`
- `backend/src/services/scoringService.js`
- `backend/src/services/metricsAggregationService.js`
- Any other services using citation classification

**Replace:**
```javascript
// OLD
const citationClassificationService = require('./citationClassificationService');

// NEW
const citationClassificationService = require('./citationClassificationServiceV2');
```

---

### Step 4: Add Verified Domains During Onboarding

**Modify:** `backend/src/services/onboardingService.js` (or wherever onboarding is handled)

**Add verified domain collection:**

```javascript
async function collectBrandInformation(userId) {
  // ... existing onboarding steps ...
  
  // NEW: Collect verified domains
  const verifiedDomains = [];
  
  // Ask user for official domains
  const primaryDomain = await promptUser("What is your primary website domain? (e.g., example.com)");
  if (primaryDomain) {
    verifiedDomains.push(primaryDomain);
  }
  
  // Ask for additional domains
  const additionalDomains = await promptUser(
    "Do you have any additional domains? (e.g., blog.example.com, help.example.com) [comma-separated]"
  );
  if (additionalDomains) {
    verifiedDomains.push(...additionalDomains.split(',').map(d => d.trim()));
  }
  
  // Verify domains (DNS lookup, SSL check)
  const validatedDomains = await validateDomains(verifiedDomains);
  
  // Store in database
  await UrlAnalysis.updateOne(
    { _id: urlAnalysisId },
    { $set: { verifiedDomains: validatedDomains } }
  );
  
  return { verifiedDomains: validatedDomains };
}

async function validateDomains(domains) {
  const dns = require('dns').promises;
  const validated = [];
  
  for (const domain of domains) {
    try {
      // Simple DNS lookup to verify domain exists
      await dns.resolve(domain);
      validated.push(domain);
      console.log(`✅ Domain verified: ${domain}`);
    } catch (error) {
      console.warn(`⚠️ Could not verify domain: ${domain}`, error.message);
      // Still add it but flag it
      validated.push({ domain, verified: false });
    }
  }
  
  return validated;
}
```

**Update Database Schema:**

```javascript
// backend/src/models/UrlAnalysis.js

const urlAnalysisSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // NEW FIELD
  verifiedDomains: [{
    type: String,
    default: []
  }],
  
  verifiedDomainsMetadata: [{
    domain: String,
    verified: { type: Boolean, default: true },
    verifiedAt: { type: Date, default: Date.now },
    verificationMethod: String // 'dns', 'ssl', 'user-provided', etc.
  }]
});
```

**Migration for existing users:**

```javascript
// backend/scripts/addVerifiedDomainsToExistingUsers.js

const mongoose = require('mongoose');
const UrlAnalysis = require('../src/models/UrlAnalysis');

async function addVerifiedDomains() {
  const analyses = await UrlAnalysis.find({});
  
  for (const analysis of analyses) {
    // Try to extract domain from websiteUrl
    const verifiedDomains = [];
    
    if (analysis.websiteUrl) {
      try {
        const url = new URL(analysis.websiteUrl);
        const domain = url.hostname.replace(/^www\./, '');
        verifiedDomains.push(domain);
      } catch (e) {
        console.error(`Could not parse URL: ${analysis.websiteUrl}`);
      }
    }
    
    // Update
    await UrlAnalysis.updateOne(
      { _id: analysis._id },
      { $set: { verifiedDomains } }
    );
    
    console.log(`Updated ${analysis._id} with verified domains:`, verifiedDomains);
  }
}

// Run migration
addVerifiedDomains().then(() => {
  console.log('Migration complete');
  process.exit(0);
});
```

---

### Step 5: Update Classification Calls

**Modify all citation classification calls to include verifiedDomains:**

```javascript
// BEFORE
const classification = citationClassificationService.categorizeCitation(
  url,
  brandName,
  allBrands
);

// AFTER
const verifiedDomains = urlAnalysis.verifiedDomains || [];
const classification = citationClassificationService.categorizeCitation(
  url,
  brandName,
  allBrands,
  verifiedDomains
);
```

**Example in `promptTestingService.js`:**

```javascript
async extractBrandMetrics(responseText, citations, brandName, competitors = [], urlAnalysisId) {
  // Fetch verified domains for this analysis
  const urlAnalysis = await UrlAnalysis.findById(urlAnalysisId);
  const verifiedDomains = urlAnalysis?.verifiedDomains || [];
  
  // ... existing code ...
  
  citations.forEach(cit => {
    const urlValidation = citationClassificationService.cleanAndValidateUrl(cit.url);
    if (!urlValidation.valid) return;
    
    const classification = citationClassificationService.categorizeCitation(
      urlValidation.cleanedUrl,
      brandName,
      allBrandsForClassification,
      verifiedDomains // NEW PARAMETER
    );
    
    // ... rest of the code ...
  });
}
```

---

### Step 6: Monitoring & Logging

**Add monitoring for classification quality:**

```javascript
// backend/src/services/citationMonitoringService.js

class CitationMonitoringService {
  constructor() {
    this.classificationStats = {
      total: 0,
      byType: { brand: 0, earned: 0, social: 0, unknown: 0 },
      lowConfidence: [],
      flagged: []
    };
  }
  
  recordClassification(url, classification) {
    this.classificationStats.total++;
    this.classificationStats.byType[classification.type]++;
    
    // Log low confidence classifications
    if (classification.confidence.overall < 0.8) {
      this.classificationStats.lowConfidence.push({
        url,
        type: classification.type,
        confidence: classification.confidence.overall,
        timestamp: new Date()
      });
    }
    
    // Log flagged URLs
    if (classification.flags && classification.flags.length > 0) {
      this.classificationStats.flagged.push({
        url,
        flags: classification.flags,
        timestamp: new Date()
      });
    }
  }
  
  getStats() {
    return {
      ...this.classificationStats,
      distribution: {
        brand: (this.classificationStats.byType.brand / this.classificationStats.total * 100).toFixed(2) + '%',
        earned: (this.classificationStats.byType.earned / this.classificationStats.total * 100).toFixed(2) + '%',
        social: (this.classificationStats.byType.social / this.classificationStats.total * 100).toFixed(2) + '%',
        unknown: (this.classificationStats.byType.unknown / this.classificationStats.total * 100).toFixed(2) + '%'
      }
    };
  }
  
  async saveDailyReport() {
    const report = this.getStats();
    // Save to database or send to monitoring service
    console.log('📊 Daily Citation Classification Report:', JSON.stringify(report, null, 2));
    
    // Alert if too many unknown or low confidence
    if (this.classificationStats.byType.unknown / this.classificationStats.total > 0.05) {
      console.warn('⚠️ High unknown classification rate:', 
        (this.classificationStats.byType.unknown / this.classificationStats.total * 100).toFixed(2) + '%');
    }
  }
}

module.exports = new CitationMonitoringService();
```

**Integrate into classification calls:**

```javascript
const monitoringService = require('./citationMonitoringService');

const classification = citationClassificationService.categorizeCitation(url, brandName, allBrands, verifiedDomains);
monitoringService.recordClassification(url, classification);
```

---

### Step 7: User Feedback Loop

**Add ability for users to correct misclassifications:**

**Frontend Component:**

```typescript
// components/citations/CitationCorrection.tsx

interface CitationCorrectionProps {
  citation: Citation;
  onCorrection: (citationId: string, correctType: 'brand' | 'earned' | 'social') => void;
}

export function CitationCorrection({ citation, onCorrection }: CitationCorrectionProps) {
  const [showCorrection, setShowCorrection] = useState(false);
  
  return (
    <div className="citation-item">
      <span>{citation.url}</span>
      <span className="badge">{citation.type}</span>
      
      {citation.confidence < 0.85 && (
        <button onClick={() => setShowCorrection(!showCorrection)}>
          Not correct?
        </button>
      )}
      
      {showCorrection && (
        <div className="correction-options">
          <p>This citation should be:</p>
          <button onClick={() => onCorrection(citation.id, 'brand')}>Brand</button>
          <button onClick={() => onCorrection(citation.id, 'earned')}>Earned</button>
          <button onClick={() => onCorrection(citation.id, 'social')}>Social</button>
        </div>
      )}
    </div>
  );
}
```

**Backend API:**

```javascript
// backend/src/routes/citations.js

router.post('/api/citations/:citationId/correct', authenticate, async (req, res) => {
  const { citationId } = req.params;
  const { correctType, reason } = req.body;
  
  // Store correction
  const correction = await CitationCorrection.create({
    citationId,
    userId: req.user._id,
    originalType: citation.type,
    correctType,
    reason,
    url: citation.url,
    createdAt: new Date()
  });
  
  // Update citation
  await PromptTest.updateOne(
    { 'brandMetrics.citations._id': citationId },
    { 
      $set: { 
        'brandMetrics.citations.$.type': correctType,
        'brandMetrics.citations.$.manuallyVerified': true
      }
    }
  );
  
  // Trigger retraining (if using ML)
  // await mlRetrainingService.addTrainingExample(citation.url, correctType);
  
  res.json({ success: true, correction });
});
```

---

### Step 8: Testing & Validation

**Run comprehensive tests:**

```bash
# Unit tests
cd backend
npm test

# Integration tests
npm run test:integration

# Manual testing with real data
node scripts/testCitationClassificationV2.js
```

**Create test script:**

```javascript
// backend/scripts/testCitationClassificationV2.js

const mongoose = require('mongoose');
const citationClassificationV2 = require('../src/services/citationClassificationServiceV2');
const PromptTest = require('../src/models/PromptTest');

async function testRealData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Get sample citations from database
  const promptTests = await PromptTest.find({}).limit(100);
  
  let correct = 0;
  let total = 0;
  const errors = [];
  
  for (const test of promptTests) {
    for (const brandMetric of test.brandMetrics) {
      for (const citation of brandMetric.citations) {
        total++;
        
        // Re-classify
        const newClassification = citationClassificationV2.categorizeCitation(
          citation.url,
          brandMetric.brandName,
          test.allBrands || []
        );
        
        // Compare with existing classification
        if (newClassification.type === citation.type) {
          correct++;
        } else {
          errors.push({
            url: citation.url,
            old: citation.type,
            new: newClassification.type,
            confidence: newClassification.confidence.overall
          });
        }
      }
    }
  }
  
  console.log(`\n📊 Classification Accuracy Test Results:`);
  console.log(`Total citations tested: ${total}`);
  console.log(`Matching classifications: ${correct} (${(correct/total*100).toFixed(2)}%)`);
  console.log(`Differences: ${errors.length} (${(errors.length/total*100).toFixed(2)}%)`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️ Classification Differences (first 10):`);
    errors.slice(0, 10).forEach(err => {
      console.log(`  ${err.url}`);
      console.log(`    Old: ${err.old} → New: ${err.new} (confidence: ${err.confidence.toFixed(2)})`);
    });
  }
  
  await mongoose.disconnect();
}

testRealData();
```

---

## Rollback Plan

If issues arise after deployment, follow this rollback procedure:

### 1. Immediate Rollback (Environment Variable)

```bash
# Set in .env or environment
USE_V2_CITATION_CLASSIFICATION=false
```

**Restart service:**
```bash
pm2 restart all
```

### 2. Code Rollback (If Needed)

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Deploy
./deploy.sh
```

### 3. Monitor After Rollback

```bash
# Check logs
pm2 logs

# Verify classification working
curl https://your-api.com/api/analytics/test
```

---

## Performance Considerations

### V2 Performance Impact

**Expected changes:**
- URL validation: +2-5ms per URL (more comprehensive checks)
- TLD validation: +1ms per URL (lookup in Set)
- Brand classification: Similar to V1 (same algorithm, stricter filters)
- Overall impact: +5-10ms per citation (negligible for most use cases)

**Optimization tips:**
1. Cache TLD validation results
2. Pre-compute brand domain variations during onboarding
3. Use Redis for verified domain lookups
4. Batch classification for multiple citations

**Example caching:**

```javascript
// Simple in-memory cache
const domainCache = new Map();

function getCachedClassification(url, brandName) {
  const cacheKey = `${url}:${brandName}`;
  
  if (domainCache.has(cacheKey)) {
    const cached = domainCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      return cached.result;
    }
  }
  
  return null;
}

function setCachedClassification(url, brandName, result) {
  const cacheKey = `${url}:${brandName}`;
  domainCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
}
```

---

## Success Metrics

Track these metrics to measure V2 success:

### 1. Accuracy Metrics
- **Target:** >99% correct classifications
- **Measure:** Manual review of 100 random citations weekly
- **Baseline:** Current ~93-94%

### 2. Confidence Metrics
- **Target:** Confidence scores within ±2% of actual accuracy
- **Measure:** Compare confidence vs manual verification
- **Track:** Calibration curve

### 3. Unknown Rate
- **Target:** <1% unknown classifications
- **Measure:** Count of unknown type / total citations
- **Current:** ~0.5% (URL shorteners, malformed URLs)

### 4. User Corrections
- **Target:** <5 corrections per 1000 citations
- **Measure:** User feedback submissions
- **Action:** Review patterns in corrections monthly

### 5. Performance
- **Target:** <50ms average classification time
- **Measure:** Average time from API logs
- **Acceptable:** Up to 100ms for complex patterns

---

## Maintenance Schedule

### Weekly
- ✅ Review low-confidence classifications
- ✅ Check flagged URLs
- ✅ Monitor unknown classification rate

### Monthly
- ✅ Update social media platform list
- ✅ Review user corrections
- ✅ Validate confidence calibration
- ✅ Update common words list if needed

### Quarterly
- ✅ Comprehensive accuracy audit (500+ citations)
- ✅ Update TLD list from Public Suffix List
- ✅ Review and retrain ML models (if implemented)
- ✅ Performance optimization review

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] WHOIS integration for ownership verification
- [ ] SSL certificate validation
- [ ] DNS TXT record verification
- [ ] URL shortener resolution via API

### Phase 3 (Advanced)
- [ ] Machine learning integration
- [ ] Context-aware classification using NLP
- [ ] Sentiment analysis integration
- [ ] Historical pattern learning

### Phase 4 (Enterprise)
- [ ] Trademark database integration
- [ ] Brand registry checks
- [ ] Real-time domain verification
- [ ] Automated testing framework

---

## Support & Troubleshooting

### Common Issues

**Issue 1: High unknown classification rate**
- **Cause:** Many URL shorteners or malformed URLs
- **Solution:** Implement URL shortener resolution (Phase 2)

**Issue 2: False positives for common words**
- **Cause:** Brand name contains common word
- **Solution:** Add brand to verified domains list

**Issue 3: Competitor domains misclassified**
- **Cause:** Competitor not in allBrands list
- **Solution:** Ensure allBrands includes all competitors

**Issue 4: International domains not recognized**
- **Cause:** TLD not in validTLDs list
- **Solution:** Add TLD to list or update from Public Suffix List

### Debug Mode

Enable debug logging:

```javascript
// .env
CITATION_DEBUG=true

// In code
if (process.env.CITATION_DEBUG === 'true') {
  console.log('[CITATION DEBUG]', {
    url,
    validation: urlValidation,
    classification: classification,
    confidence: classification.confidence
  });
}
```

---

## Conclusion

Citation Classification V2 provides:
- ✅ **Near-zero error rates** (<1% misclassification target)
- ✅ **Comprehensive validation** (TLD, URL shorteners, IP addresses)
- ✅ **Multi-dimensional confidence** (calibrated scoring)
- ✅ **Better edge case handling** (international domains, malformed URLs)
- ✅ **User verification support** (verified domains, feedback loop)

**Recommended Timeline:**
- Week 1: Deploy with comparison mode, monitor differences
- Week 2: Review logs, fix any issues, continue monitoring
- Week 3: Switch to V2-only, disable comparison mode
- Week 4: Validate accuracy, collect user feedback
- Month 2+: Continuous improvement, Phase 2 enhancements

**Ready to deploy!** 🚀

---

**Document Version:** 1.0  
**Date:** November 12, 2025  
**Status:** READY FOR IMPLEMENTATION

