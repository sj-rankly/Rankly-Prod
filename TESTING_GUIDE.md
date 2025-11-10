# Testing Guide - Content Regeneration with New Features

## 🧪 **How to Test**

### **Option 1: Using the Frontend UI (Recommended)**

1. **Start the frontend** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Actionables tab**:
   - Go to `http://localhost:3000`
   - Click on "Actionables" in the sidebar
   - Make sure you're connected to GA4

3. **Select a page to test**:
   - Find a page from the actionable pages list
   - Click on it to open the details

4. **Load and regenerate**:
   - Click "Load Old Content" to fetch the original content
   - Once loaded, click "Regenerate Content"
   - Wait for regeneration to complete (may take 2-5 minutes)

5. **Check the results**:
   - Look for the new content in the "New Content" section
   - Check the console logs for:
     - Semantic drift measurement
     - Before/after evaluation
     - G-Eval 2.0 (if enabled)

---

### **Option 2: Using the Test Script**

1. **Get a page URL and URL Analysis ID**:
   - From the Actionables tab, select a page
   - Copy the page URL
   - Get the `urlAnalysisId` from the browser's network tab or database

2. **Run the test script**:
   ```bash
   node test-regeneration.js "https://example.com/page" "507f1f77bcf86cd799439011" "your-user-id"
   ```

3. **Check the output**:
   - The script will show:
     - Semantic drift similarity score
     - Before/after evaluation metrics
     - Improvement report
   - Full results are saved to a JSON file

---

## 📊 **What to Look For**

### **1. Semantic Drift Measurement**

**Expected Output:**
```json
{
  "semanticDrift": {
    "similarity": 0.8234,        // Should be 0-1
    "driftDetected": false,      // true if similarity < 0.7
    "severity": "low",           // none | low | high | critical
    "recommendation": "Acceptable: Content preserves semantic core"
  }
}
```

**What to Check:**
- ✅ Similarity should be > 0.7 (no drift)
- ⚠️ If similarity < 0.7, drift is detected
- ⚠️ If similarity < 0.5, critical drift

---

### **2. Before/After Evaluation**

**Expected Output:**
```json
{
  "evaluation": {
    "before": {
      "pawc": { "depthOfMention": 2.5, "sampleSize": 10 },
      "subjectiveMetrics": { "averageScore": 2.8 },
      "contentQuality": { "overallScore": 6.5 }
    },
    "after": {
      "pawc": { "depthOfMention": 2.5, "sampleSize": 10 },
      "subjectiveMetrics": { "averageScore": 2.8 },
      "contentQuality": { "overallScore": 7.8 }  // Should improve
    },
    "improvement": {
      "overallImprovement": 15.2,
      "summary": {
        "improved": true,
        "keyImprovements": ["contentQuality"]
      }
    }
  }
}
```

**What to Check:**
- ✅ Content Quality should improve (immediate)
- ⚠️ PAWC and Subjective Metrics will be same until new tests (expected)
- ✅ Overall improvement percentage should be calculated

---

### **3. G-Eval 2.0**

**Expected Output:**
- G-Eval 2.0 is enabled by default
- Check backend logs for:
  - "Generating rubrics for all dimensions..."
  - "Evaluating all dimensions using generated rubrics..."
  - Scores should be 0-5 (not 1-5)

**To Disable G-Eval 2.0:**
- Set `USE_GEVAL2=false` in `backend/.env`
- Restart backend

---

## 🔍 **Debugging**

### **Check Backend Logs**

The backend will log:
- `📊 [SemanticDrift] Measuring semantic drift...`
- `📊 [EvaluationPipeline] Evaluating original content (BEFORE)...`
- `📊 [EvaluationPipeline] Evaluating regenerated content (AFTER)...`
- `📊 [G-Eval 2.0] Starting evaluation...`

### **Common Issues**

1. **"No citation data available"**:
   - This is normal if the page hasn't been cited in PromptTests yet
   - PAWC and Subjective Metrics will be null
   - Content Quality will still be calculated

2. **"Semantic drift measurement failed"**:
   - Check if `OPENROUTER_API_KEY` is set
   - Check backend logs for API errors

3. **"G-Eval 2.0 disabled"**:
   - Check `USE_GEVAL2` in `backend/.env`
   - Should be `true` or not set (defaults to true)

---

## 📝 **Example Test Output**

```
🧪 Testing Content Regeneration with New Features
======================================================================
Page URL: https://example.com/pricing
URL Analysis ID: 507f1f77bcf86cd799439011
======================================================================

📄 Step 1: Loading page content...
✅ Content loaded: 5234 characters
   Title: Pricing Plans
   Description: Choose the right plan for your needs...

🔄 Step 2: Regenerating content with new features...
   This will test:
   - Before/After Evaluation Pipeline
   - Semantic Drift Measurement
   - G-Eval 2.0 (if enabled)

✅ Step 3: Regeneration complete!

======================================================================
📊 REGENERATION RESULTS
======================================================================

📝 Content:
   Original length: 5234 chars
   Regenerated length: 6123 chars
   Model: openai/gpt-4o

📊 Semantic Drift:
   Similarity: 0.8234
   Drift detected: NO ✅
   Severity: low
   Recommendation: Acceptable: Content preserves semantic core with minor variations

📈 Before/After Evaluation:
   BEFORE:
     PAWC: 2.5%
     Subjective Metrics Avg: 2.8/5
     Content Quality: 6.5/10
   AFTER:
     PAWC: 2.5%
     Subjective Metrics Avg: 2.8/5
     Content Quality: 7.8/10
   IMPROVEMENT:
     Overall Improvement: 15.2%
     Improved: YES ✅
     Key Improvements: contentQuality
     Key Degradations: None

💰 Token Usage:
   Total: 45230 tokens
   Per Stage:
     - Summarization: 1200
     - Initial Intent: 800
     - Refined Intent: 1500
     - Plan: 900
     - Rewrite: 2500

======================================================================
✅ Test Complete!
======================================================================
```

---

## 🚀 **Next Steps**

After testing:
1. Review the semantic drift score (should be > 0.7)
2. Check content quality improvement (should increase)
3. Verify G-Eval 2.0 is working (check logs for rubric generation)
4. Compare original vs regenerated content quality

Ready to test! 🎉

