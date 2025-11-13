# API Usage Tracking System

## Overview

A comprehensive API usage and cost tracking system for monitoring LLM API calls across all services. The system automatically logs all API calls to MongoDB with token usage and cost calculation, providing detailed analytics and reporting capabilities.

## Features

- **Automatic Tracking**: All LLM API calls are automatically tracked across all services
- **Cost Calculation**: Automatic cost calculation based on token usage and model pricing
- **Multiple Providers**: Supports OpenAI, Anthropic Claude, Gemini, and Perplexity
- **Flexible Querying**: Query usage by date range, service, provider, or model
- **Long-term Retention**: 13-month data retention with automatic cleanup
- **Non-blocking**: Asynchronous logging that doesn't slow down API calls
- **Error Tracking**: Tracks both successful and failed API calls

## Architecture

### Components

1. **ApiUsageLog Model** (`backend/src/models/ApiUsageLog.js`)
   - MongoDB schema for storing usage data
   - Built-in aggregation methods for analytics
   - TTL indexes for automatic cleanup

2. **LLM Pricing Config** (`backend/src/config/llmPricing.js`)
   - Pricing information for all supported models
   - Cost calculation utilities
   - Per-model pricing (input/output tokens)

3. **Tracking Service** (`backend/src/services/apiUsageTrackingService.js`)
   - Central service for logging and querying usage
   - Automatic cost calculation
   - Graceful error handling

4. **API Routes** (`backend/src/routes/apiUsage.js`)
   - RESTful endpoints for querying usage data
   - User-specific and system-wide analytics

### Tracked Metrics

For each API call, the following data is logged:

- **Timestamp**: When the call was made
- **User ID**: Who initiated the call (if applicable)
- **Service**: Which service made the call (e.g., 'contentRegeneration', 'promptTesting')
- **Provider**: API provider (openai, anthropic, gemini, perplexity)
- **Model**: Specific model used (e.g., 'gpt-4o', 'claude-3-5-sonnet')
- **Tokens**: Input, output, and total token counts
- **Cost**: Calculated cost in USD
- **Success**: Whether the call succeeded
- **Error Message**: Error details (if failed)
- **Response Time**: API response time in milliseconds

## API Endpoints

All endpoints require authentication via JWT token in the Authorization header.

### 1. Get Usage Summary

```
GET /api/usage/summary
```

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `service` (optional): Filter by service name
- `provider` (optional): Filter by provider

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 150,
    "successfulCalls": 145,
    "failedCalls": 5,
    "totalTokens": 125000,
    "totalInputTokens": 75000,
    "totalOutputTokens": 50000,
    "totalCost": 0.85,
    "avgResponseTime": 1250,
    "successRate": 96.67
  }
}
```

### 2. Get Usage by Service

```
GET /api/usage/by-service
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `provider` (optional): Filter by provider

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "service": "promptTesting",
      "totalCalls": 80,
      "successfulCalls": 78,
      "totalTokens": 65000,
      "totalInputTokens": 40000,
      "totalOutputTokens": 25000,
      "totalCost": 0.45,
      "avgResponseTime": 1100,
      "successRate": 97.5
    },
    {
      "service": "contentRegeneration",
      "totalCalls": 40,
      "successfulCalls": 40,
      "totalTokens": 35000,
      "totalInputTokens": 20000,
      "totalOutputTokens": 15000,
      "totalCost": 0.25,
      "avgResponseTime": 1500,
      "successRate": 100
    }
  ]
}
```

### 3. Get Usage by Provider

```
GET /api/usage/by-provider
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `service` (optional): Filter by service

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "totalCalls": 90,
      "successfulCalls": 88,
      "totalTokens": 75000,
      "totalInputTokens": 45000,
      "totalOutputTokens": 30000,
      "totalCost": 0.35,
      "avgResponseTime": 1000,
      "successRate": 97.78
    },
    {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "totalCalls": 30,
      "successfulCalls": 30,
      "totalTokens": 25000,
      "totalInputTokens": 15000,
      "totalOutputTokens": 10000,
      "totalCost": 0.30,
      "avgResponseTime": 1400,
      "successRate": 100
    }
  ]
}
```

### 4. Get Usage by Date (Time Series)

```
GET /api/usage/by-date
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `service` (optional): Filter by service
- `provider` (optional): Filter by provider
- `granularity` (optional): 'hour', 'day' (default), or 'month'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": {
        "year": 2025,
        "month": 11,
        "day": 13
      },
      "totalCalls": 45,
      "successfulCalls": 43,
      "totalTokens": 35000,
      "totalCost": 0.25,
      "successRate": 95.56
    },
    {
      "date": {
        "year": 2025,
        "month": 11,
        "day": 14
      },
      "totalCalls": 52,
      "successfulCalls": 50,
      "totalTokens": 42000,
      "totalCost": 0.30,
      "successRate": 96.15
    }
  ]
}
```

### 5. Get Total Cost

```
GET /api/usage/total-cost
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `service` (optional): Filter by service
- `provider` (optional): Filter by provider

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCost": 0.85,
    "currency": "USD"
  }
}
```

### 6. Get Recent Failures

```
GET /api/usage/failures
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `service` (optional): Filter by service
- `provider` (optional): Filter by provider
- `limit` (optional): Max records to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "timestamp": "2025-11-13T10:30:00Z",
      "userId": "...",
      "service": "promptTesting",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "success": false,
      "errorMessage": "Rate limit exceeded",
      "tokensInput": 0,
      "tokensOutput": 0,
      "tokensTotal": 0,
      "cost": 0
    }
  ]
}
```

### 7. Get Top Users by Cost

```
GET /api/usage/top-users
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `service` (optional): Filter by service
- `provider` (optional): Filter by provider
- `limit` (optional): Max users to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "...",
      "totalCalls": 150,
      "totalCost": 1.25,
      "totalTokens": 125000
    },
    {
      "userId": "...",
      "totalCalls": 80,
      "totalCost": 0.65,
      "totalTokens": 65000
    }
  ]
}
```

## Integration

The tracking system is automatically integrated into the following services:

1. **Content Regeneration Service** - Tracks Claude and GPT model usage
2. **Prompt Testing Service** - Tracks multi-LLM prompt testing
3. **Subjective Metrics Service** - Tracks GPT-4o-mini evaluation calls
4. **Semantic Drift Service** - Tracks embedding API calls
5. **Website Analysis Service** - Tracks Perplexity and other model usage
6. **Insights Service** - Tracks GPT-4o insight generation

## Pricing Information

Current pricing (as of November 2024):

### OpenAI Models (via OpenRouter)
- **GPT-4o**: $2.50/$10.00 per 1M tokens (input/output)
- **GPT-4o-mini**: $0.15/$0.60 per 1M tokens (input/output)
- **text-embedding-3-small**: $0.02 per 1M tokens

### Anthropic Claude Models (Direct API)
- **Claude 3 Haiku**: $0.25/$1.25 per 1M tokens
- **Claude 3.5 Haiku**: $1.00/$5.00 per 1M tokens
- **Claude 3.5 Sonnet**: $3.00/$15.00 per 1M tokens
- **Claude 3 Opus**: $15.00/$75.00 per 1M tokens

### Gemini Models (via OpenRouter)
- **Gemini 2.0 Flash**: ~$0.10/$0.40 per 1M tokens (estimated)

### Perplexity Models (via OpenRouter)
- **Sonar**: ~$1.00/$1.00 per 1M tokens (estimated)

## Data Retention

- **Retention Period**: 13 months (400 days with buffer)
- **Automatic Cleanup**: TTL indexes automatically delete old records
- **No Manual Cleanup Required**: MongoDB handles cleanup automatically

## Performance Considerations

1. **Non-blocking Logging**: API calls are logged asynchronously without awaiting, ensuring no impact on request latency
2. **Efficient Indexes**: Compound indexes optimize common query patterns
3. **Aggregation Pipeline**: Uses MongoDB aggregation for efficient analytics
4. **Graceful Failures**: Logging errors don't break the application

## Example Usage

### Get Last 30 Days of Usage

```javascript
const axios = require('axios');

const response = await axios.get('http://localhost:5000/api/usage/summary', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  params: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString()
  }
});

console.log('Total cost last 30 days:', response.data.data.totalCost);
```

### Get Usage by Service for Current Month

```javascript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const response = await axios.get('http://localhost:5000/api/usage/by-service', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  params: {
    startDate: startOfMonth.toISOString()
  }
});

console.log('Service breakdown:', response.data.data);
```

### Monitor Recent Failures

```javascript
const response = await axios.get('http://localhost:5000/api/usage/failures', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  params: {
    limit: 20
  }
});

console.log('Recent API failures:', response.data.data);
```

## Monitoring Best Practices

1. **Daily Cost Checks**: Monitor daily costs to identify anomalies
2. **Service Analysis**: Track which services consume the most resources
3. **Provider Comparison**: Compare costs across different providers
4. **Failure Monitoring**: Set up alerts for high failure rates
5. **Trend Analysis**: Use time-series data to identify usage patterns

## Troubleshooting

### No Data Being Logged

1. Check MongoDB connection
2. Verify `apiUsageTrackingService` is imported correctly in services
3. Check console logs for tracking errors

### Incorrect Costs

1. Verify pricing in `backend/src/config/llmPricing.js`
2. Check that token counts are being extracted correctly
3. Ensure provider names match pricing config

### Performance Issues

1. Check MongoDB indexes are created: `db.apiusagelogs.getIndexes()`
2. Verify TTL index is working: Old records should be auto-deleted
3. Consider increasing MongoDB resources if needed

## Future Enhancements

Potential improvements for future versions:

1. **Budget Alerts**: Email/SMS notifications when costs exceed thresholds
2. **Dashboard UI**: Visual dashboard for usage analytics
3. **Cost Projections**: Predict future costs based on usage trends
4. **Rate Limiting**: Automatic throttling when approaching budget limits
5. **Export Reports**: CSV/PDF export of usage reports
6. **Anomaly Detection**: ML-based detection of unusual usage patterns

## Support

For issues or questions about the API usage tracking system:

1. Check the logs in the backend console
2. Verify MongoDB connection and indexes
3. Review the integration code in the relevant service
4. Check API endpoint responses for error messages

## Version

- **Initial Release**: November 13, 2025
- **Version**: 1.0.0
- **Retention Policy**: 13 months

