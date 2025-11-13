const mongoose = require('mongoose');

/**
 * API Usage Log Schema
 * Tracks all LLM API calls for cost monitoring and usage analytics
 */
const apiUsageLogSchema = new mongoose.Schema({
  // Timestamp of the API call
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },

  // User who initiated the call (null for system calls)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  // Service that made the call (e.g., 'contentRegeneration', 'promptTesting', 'insights')
  service: {
    type: String,
    required: true,
    index: true,
  },

  // API provider (openai, anthropic, gemini, perplexity)
  provider: {
    type: String,
    required: true,
    enum: ['openai', 'anthropic', 'gemini', 'perplexity', 'openrouter'],
    index: true,
  },

  // Specific model used (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022')
  model: {
    type: String,
    required: true,
  },

  // Token usage
  tokensInput: {
    type: Number,
    default: 0,
  },

  tokensOutput: {
    type: Number,
    default: 0,
  },

  tokensTotal: {
    type: Number,
    default: 0,
  },

  // Cost in USD (stored as decimal for precision)
  cost: {
    type: Number,
    default: 0,
  },

  // Success status
  success: {
    type: Boolean,
    default: true,
  },

  // Error message if call failed
  errorMessage: {
    type: String,
  },

  // Response time in milliseconds
  responseTime: {
    type: Number,
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Compound indexes for efficient queries
apiUsageLogSchema.index({ userId: 1, timestamp: -1 });
apiUsageLogSchema.index({ service: 1, timestamp: -1 });
apiUsageLogSchema.index({ provider: 1, timestamp: -1 });
apiUsageLogSchema.index({ provider: 1, model: 1, timestamp: -1 });

// TTL index for automatic cleanup after 400 days (13 months retention + buffer)
apiUsageLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 34560000 }); // 400 days in seconds

/**
 * Static method to get usage summary
 */
apiUsageLogSchema.statics.getUsageSummary = async function(filters = {}) {
  const match = {};
  
  if (filters.userId) match.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.service) match.service = filters.service;
  if (filters.provider) match.provider = filters.provider;
  if (filters.startDate || filters.endDate) {
    match.timestamp = {};
    if (filters.startDate) match.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) match.timestamp.$lte = new Date(filters.endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        successfulCalls: { $sum: { $cond: ['$success', 1, 0] } },
        failedCalls: { $sum: { $cond: ['$success', 0, 1] } },
        totalTokens: { $sum: '$tokensTotal' },
        totalInputTokens: { $sum: '$tokensInput' },
        totalOutputTokens: { $sum: '$tokensOutput' },
        totalCost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
  ]);
};

/**
 * Static method to get usage by provider
 */
apiUsageLogSchema.statics.getUsageByProvider = async function(filters = {}) {
  const match = {};
  
  if (filters.userId) match.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.service) match.service = filters.service;
  if (filters.startDate || filters.endDate) {
    match.timestamp = {};
    if (filters.startDate) match.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) match.timestamp.$lte = new Date(filters.endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { provider: '$provider', model: '$model' },
        totalCalls: { $sum: 1 },
        successfulCalls: { $sum: { $cond: ['$success', 1, 0] } },
        totalTokens: { $sum: '$tokensTotal' },
        totalInputTokens: { $sum: '$tokensInput' },
        totalOutputTokens: { $sum: '$tokensOutput' },
        totalCost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);
};

/**
 * Static method to get usage by service
 */
apiUsageLogSchema.statics.getUsageByService = async function(filters = {}) {
  const match = {};
  
  if (filters.userId) match.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.provider) match.provider = filters.provider;
  if (filters.startDate || filters.endDate) {
    match.timestamp = {};
    if (filters.startDate) match.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) match.timestamp.$lte = new Date(filters.endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$service',
        totalCalls: { $sum: 1 },
        successfulCalls: { $sum: { $cond: ['$success', 1, 0] } },
        totalTokens: { $sum: '$tokensTotal' },
        totalInputTokens: { $sum: '$tokensInput' },
        totalOutputTokens: { $sum: '$tokensOutput' },
        totalCost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);
};

/**
 * Static method to get usage over time (time series)
 */
apiUsageLogSchema.statics.getUsageByDate = async function(filters = {}) {
  const match = {};
  
  if (filters.userId) match.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.service) match.service = filters.service;
  if (filters.provider) match.provider = filters.provider;
  if (filters.startDate || filters.endDate) {
    match.timestamp = {};
    if (filters.startDate) match.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) match.timestamp.$lte = new Date(filters.endDate);
  }

  // Group by granularity (day, hour, month)
  const granularity = filters.granularity || 'day';
  let dateGroup;
  
  switch (granularity) {
    case 'hour':
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
      };
      break;
    case 'month':
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
      };
      break;
    case 'day':
    default:
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      };
      break;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: dateGroup,
        totalCalls: { $sum: 1 },
        successfulCalls: { $sum: { $cond: ['$success', 1, 0] } },
        totalTokens: { $sum: '$tokensTotal' },
        totalCost: { $sum: '$cost' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
  ]);
};

const ApiUsageLog = mongoose.model('ApiUsageLog', apiUsageLogSchema);

module.exports = ApiUsageLog;

