# API Usage Tracking Implementation Summary

## ✅ Implementation Complete

The API usage and cost tracking system has been successfully implemented across the entire codebase.

## 📦 What Was Created

### 1. Database Model
- **File**: `backend/src/models/ApiUsageLog.js`
- MongoDB schema with efficient indexes
- Built-in aggregation methods
- Automatic cleanup after 13 months (TTL index)

### 2. Pricing Configuration
- **File**: `backend/src/config/llmPricing.js`
- Comprehensive pricing for all LLM providers
- Automatic cost calculation utilities
- Support for OpenAI, Anthropic Claude, Gemini, Perplexity

### 3. Central Tracking Service
- **File**: `backend/src/services/apiUsageTrackingService.js`
- Automatic logging of all API calls
- Cost calculation based on token usage
- Query methods for analytics
- Non-blocking async logging

### 4. API Routes
- **File**: `backend/src/routes/apiUsage.js`
- 7 RESTful endpoints for usage analytics
- User-specific and system-wide reporting
- Flexible date range filtering

### 5. Documentation
- **File**: `API_USAGE_TRACKING.md`
- Complete API documentation
- Usage examples
- Best practices and troubleshooting

## 🔧 Services Integrated

The tracking system is now automatically logging API usage in:

1. ✅ **Content Regeneration Service** (`contentRegenerationService.js`)
   - Tracks Claude and OpenAI model usage
   - Both successful and failed calls

2. ✅ **Prompt Testing Service** (`promptTesting/llm.js`)
   - Tracks multi-LLM prompt testing
   - Includes retry tracking

3. ✅ **Subjective Metrics Service** (`subjectiveMetricsService.js`)
   - Tracks GPT-4o-mini evaluation calls
   - Cost-aware quality assessments

4. ✅ **Semantic Drift Service** (`semanticDriftService.js`)
   - Tracks embedding API calls
   - text-embedding-3-small usage

5. ✅ **Website Analysis Service** (`websiteAnalysisService.js`)
   - Tracks Perplexity and other model usage
   - Onboarding flow analytics

6. ✅ **Insights Service** (`insightsService.js`)
   - Tracks GPT-4o insight generation
   - Performance analytics

## 📊 Available API Endpoints

All endpoints are available at `/api/usage/*` and require authentication:

1. `GET /api/usage/summary` - Overall usage statistics
2. `GET /api/usage/by-service` - Breakdown by service
3. `GET /api/usage/by-provider` - Breakdown by provider/model
4. `GET /api/usage/by-date` - Time-series data
5. `GET /api/usage/total-cost` - Total cost calculation
6. `GET /api/usage/failures` - Recent failed API calls
7. `GET /api/usage/top-users` - Top users by cost

## 🚀 How to Use

### 1. Start the Backend
The tracking system will automatically start logging API usage when the backend starts:

```bash
cd backend
npm start
```

### 2. Make API Calls
As users interact with the system (running prompt tests, generating insights, etc.), API usage will be automatically tracked.

### 3. Query Usage Data

**Example: Get last 7 days of usage**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/usage/summary?startDate=2025-11-06T00:00:00Z&endDate=2025-11-13T23:59:59Z"
```

**Example: Get usage by service**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/usage/by-service"
```

**Example: Get total cost**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/usage/total-cost"
```

## 💰 Cost Tracking Features

### Automatic Calculation
- Costs are automatically calculated based on:
  - Input tokens × input token price
  - Output tokens × output token price
  - Provider-specific pricing

### Supported Pricing
- **OpenAI**: GPT-4o, GPT-4o-mini, embeddings
- **Anthropic**: Claude 3.x and 4.x models (all variants)
- **Gemini**: Gemini 2.0 Flash
- **Perplexity**: Sonar models

### Cost Breakdown
- By service (which part of the app costs most)
- By provider (which LLM provider costs most)
- By model (which specific model costs most)
- By date (daily/monthly trends)
- By user (user-specific costs)

## 📈 What Gets Logged

For every API call, the system logs:
- ⏰ Timestamp
- 👤 User ID (if applicable)
- 🔧 Service name
- 🤖 Provider and model
- 🎯 Token counts (input, output, total)
- 💵 Cost in USD
- ✅ Success/failure status
- ❌ Error message (if failed)
- ⚡ Response time

## 🔍 Monitoring Examples

### Daily Cost Check
```javascript
// Get today's cost
const today = new Date();
today.setHours(0, 0, 0, 0);

const response = await fetch('/api/usage/total-cost?startDate=' + today.toISOString(), {
  headers: { 'Authorization': 'Bearer ' + token }
});

const { totalCost } = await response.json();
console.log('Today's cost: $' + totalCost.toFixed(2));
```

### Service Breakdown
```javascript
// Which service is using the most?
const response = await fetch('/api/usage/by-service', {
  headers: { 'Authorization': 'Bearer ' + token }
});

const { data } = await response.json();
data.sort((a, b) => b.totalCost - a.totalCost);

console.log('Most expensive service:', data[0].service, '$' + data[0].totalCost);
```

### Provider Comparison
```javascript
// Which provider is cheapest for our use case?
const response = await fetch('/api/usage/by-provider', {
  headers: { 'Authorization': 'Bearer ' + token }
});

const { data } = await response.json();

data.forEach(item => {
  const costPerToken = item.totalCost / item.totalTokens;
  console.log(`${item.provider}/${item.model}: $${costPerToken.toFixed(6)} per token`);
});
```

## 🎯 Key Benefits

1. **💰 Cost Awareness**: Know exactly how much each API call costs
2. **📊 Usage Analytics**: Understand usage patterns across services
3. **🔍 Failure Tracking**: Identify and debug API issues quickly
4. **📈 Trend Analysis**: Track usage and cost trends over time
5. **👥 User Analytics**: Identify power users and optimize for them
6. **🎯 Optimization**: Data-driven decisions for model selection
7. **📅 Long-term Planning**: 13-month retention for strategic planning

## ⚠️ Important Notes

### Data Retention
- Data is automatically retained for **13 months**
- Automatic cleanup via MongoDB TTL indexes
- No manual cleanup required

### Performance
- **Non-blocking**: Logging doesn't slow down API calls
- **Efficient**: Uses MongoDB aggregation pipelines
- **Scalable**: Optimized indexes for fast queries

### Error Handling
- Failed API calls are also tracked
- Logging errors don't break the application
- Graceful degradation if tracking fails

## 🔐 Security

- All endpoints require authentication
- Users can only see their own usage data
- Admin endpoints (like `top-users`) available for system monitoring
- No sensitive API keys are logged

## 📝 Next Steps

### Immediate Actions
1. ✅ System is ready to use - no action needed
2. 📊 Monitor the `/api/usage/summary` endpoint
3. 💰 Set up daily cost checks
4. 🔔 Consider setting up alerts for high costs

### Future Enhancements (Optional)
1. Create a dashboard UI for visualizing usage
2. Set up automated email reports (weekly/monthly)
3. Implement budget alerts and notifications
4. Add export functionality (CSV/PDF reports)
5. Create cost projections based on trends

## 🐛 Troubleshooting

### If No Data Appears
1. Check MongoDB connection is working
2. Verify backend is running without errors
3. Check console logs for tracking errors
4. Make some API calls to generate data

### If Costs Seem Wrong
1. Verify pricing in `backend/src/config/llmPricing.js`
2. Check that token counts are being extracted
3. Compare with provider's actual pricing

### If Queries Are Slow
1. Check MongoDB indexes: `db.apiusagelogs.getIndexes()`
2. Verify TTL index is working (old data is being deleted)
3. Consider date range filters to reduce query scope

## 📚 Full Documentation

See `API_USAGE_TRACKING.md` for:
- Complete API endpoint documentation
- Request/response examples
- Pricing tables
- Best practices
- Advanced usage patterns

## ✨ Summary

The API usage tracking system is now **fully operational** and will automatically track all LLM API usage across your application. You can immediately start querying usage data via the `/api/usage/*` endpoints to monitor costs and optimize your API usage.

**Total Implementation**: 11 todos completed
- 3 core components created
- 6 services integrated
- 1 API router with 7 endpoints
- Comprehensive documentation

The system is production-ready and requires no additional configuration! 🎉

