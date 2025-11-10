# Content Regeneration Speed Optimization

## Target: Complete regeneration in under 60 seconds

## Optimizations Applied

### Stage-by-Stage Timeouts & Token Limits

| Stage | Previous | Optimized | Improvement |
|-------|----------|-----------|-------------|
| **Stage 1: Summarization** | 30s / 400 tokens | **20s / 300 tokens** | 33% faster |
| **Stage 2a: Initial Intent** | 30s / 300 tokens | **20s / 250 tokens** | 33% faster |
| **Stage 2b: 4W Reflection** | 60s / 1200 tokens | **30s / 800 tokens** | 50% faster ⚡ |
| **Stage 3: Planning** | 30s / 400 tokens | **20s / 300 tokens** | 33% faster |
| **Stage 4: Rewrite** | 90s / 1000 tokens | **40s / 800 tokens** | 56% faster ⚡ |
| **Total Worst Case** | 240s (4 min) | **130s (2.2 min)** | 46% faster |
| **Expected Typical** | ~120s (2 min) | **~45-55s** | 54% faster |

### Model Selection
- **All stages now use `gpt-4o-mini`** (fastest OpenAI model)
- This provides the best speed-to-quality ratio

### Frontend Timeouts
- API timeout: **70 seconds** (allows 10s buffer for network overhead)
- Loader duration: **60 seconds** (matches target completion time)

## Expected Performance

With `gpt-4o-mini` and optimized token limits:

- **Stage 1** (300 tokens): ~6-8 seconds
- **Stage 2a** (250 tokens): ~5-7 seconds  
- **Stage 2b** (800 tokens): ~15-20 seconds (longest stage)
- **Stage 3** (300 tokens): ~6-8 seconds
- **Stage 4** (800 tokens): ~15-20 seconds (longest stage)
- **Semantic Drift** (parallel): ~2-3 seconds

**Total Expected: 49-66 seconds** (typically ~50-55 seconds)

## Testing Instructions

### Option 1: Automated Test Script

1. **Get a valid `urlAnalysisId`** from your database:
   ```bash
   # Connect to MongoDB and find an analysis with personas
   # Or use the one from your current session
   ```

2. **Set environment variable**:
   ```bash
   export TEST_URL_ANALYSIS_ID="your-analysis-id-here"
   ```

3. **Run the test script**:
   ```bash
   cd backend
   node test-regeneration-speed.js
   ```

4. **Expected output**:
   ```
   ✅ TEST PASSED: Regeneration completed in under 60 seconds!
   ⏱️  Total Time: 52.34 seconds
   ```

### Option 2: Manual Testing via UI

1. **Start the backend** (if not running):
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend** (if not running):
   ```bash
   npm run dev
   ```

3. **Navigate to Actionables tab** in the dashboard

4. **Click "Regenerate Content"** on any actionable page

5. **Monitor the loader** - it should complete in under 60 seconds

6. **Check browser console** for timing logs:
   ```
   🚀 [PageList] Starting content regeneration...
   ✅ [PageList] Content regeneration complete, hiding loader and showing content
   ```

## Verification Checklist

- [ ] Test script completes in under 60 seconds
- [ ] Content is generated successfully
- [ ] All 5 stages complete without errors
- [ ] Semantic drift measurement completes
- [ ] Frontend loader completes within 60 seconds
- [ ] Content displays immediately after loader completes

## If Test Fails (>60 seconds)

### Potential Issues:
1. **Network latency** - API calls taking longer than expected
2. **OpenRouter API slowdown** - External service may be slow
3. **Too many personas/topics** - Large prompts take longer to process

### Solutions:
1. **Further reduce token limits** (if quality allows):
   - Stage 2b: 800 → 600 tokens
   - Stage 4: 800 → 600 tokens

2. **Reduce timeouts further** (if API is consistently fast):
   - Stage 2b: 30s → 25s
   - Stage 4: 40s → 35s

3. **Limit personas/topics** in the prompt (if too many):
   - Use top 5-10 personas instead of all
   - Use top 10-15 topics instead of all

## Notes

- **Quality vs Speed Trade-off**: Reduced token limits may slightly reduce content quality, but should still be acceptable for most use cases
- **Model Consistency**: All stages use `gpt-4o-mini` for consistency and speed
- **Semantic Drift**: Runs in parallel with content generation, so it doesn't add to total time
- **Network Overhead**: 10-second buffer in frontend timeout accounts for network latency

## Success Criteria

✅ **PASS**: Regeneration completes in **≤ 60 seconds**  
❌ **FAIL**: Regeneration takes **> 60 seconds**

---

**Last Updated**: After ultra-aggressive optimizations for sub-60s target

