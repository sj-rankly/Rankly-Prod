const ApiUsageLog = require('../models/ApiUsageLog');
const { calculateCost, getModelPricing } = require('../config/llmPricing');

/**
 * API Usage Tracking Service
 * Centralized service for logging and monitoring LLM API usage and costs
 */
class ApiUsageTrackingService {
  constructor() {
    this.enabled = true; // Can be disabled via env var if needed
  }

  /**
   * Log an API call
   * @param {Object} params - API call parameters
   * @param {string} params.service - Service name (e.g., 'contentRegeneration', 'promptTesting')
   * @param {string} params.provider - Provider name (openai, anthropic, gemini, perplexity)
   * @param {string} params.model - Model name
   * @param {number} params.tokensInput - Input tokens used
   * @param {number} params.tokensOutput - Output tokens used
   * @param {number} params.tokensTotal - Total tokens used (optional, will be calculated)
   * @param {boolean} params.success - Whether the call was successful
   * @param {string} params.errorMessage - Error message if failed
   * @param {string} params.userId - User ID who initiated the call
   * @param {number} params.responseTime - Response time in milliseconds
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async logApiCall(params) {
    if (!this.enabled) {
      return;
    }

    try {
      const {
        service,
        provider,
        model,
        tokensInput = 0,
        tokensOutput = 0,
        tokensTotal,
        success = true,
        errorMessage,
        userId,
        responseTime,
        metadata,
      } = params;

      // Validate required fields
      if (!service || !provider || !model) {
        console.error('❌ [ApiUsageTracking] Missing required fields:', { service, provider, model });
        return;
      }

      // Calculate total tokens if not provided
      const totalTokens = tokensTotal || (tokensInput + tokensOutput);

      // Calculate cost
      const cost = calculateCost(provider, model, tokensInput, tokensOutput);

      // Create log entry
      const logEntry = {
        timestamp: new Date(),
        userId: userId || null,
        service,
        provider: provider.toLowerCase(),
        model,
        tokensInput,
        tokensOutput,
        tokensTotal: totalTokens,
        cost,
        success,
        errorMessage,
        responseTime,
        metadata,
      };

      // Save to database (fire and forget - don't await to avoid blocking)
      ApiUsageLog.create(logEntry).catch((err) => {
        console.error('❌ [ApiUsageTracking] Failed to log API usage:', err.message);
      });

      // Log to console for immediate visibility
      if (success) {
        console.log(
          `💰 [ApiUsage] ${service} | ${provider}/${model} | ` +
          `${tokensInput}→${tokensOutput} tokens | $${cost.toFixed(4)}`
        );
      } else {
        console.error(
          `💸 [ApiUsage] FAILED | ${service} | ${provider}/${model} | ` +
          `Error: ${errorMessage}`
        );
      }
    } catch (error) {
      // Silently fail - don't let tracking errors break the app
      console.error('❌ [ApiUsageTracking] Error logging API usage:', error.message);
    }
  }

  /**
   * Get usage summary for a date range
   * @param {Object} filters - Filter options
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.service - Filter by service
   * @param {string} filters.provider - Filter by provider
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @returns {Promise<Object>} Usage summary
   */
  async getUsageSummary(filters = {}) {
    try {
      const summary = await ApiUsageLog.getUsageSummary(filters);
      
      if (!summary || summary.length === 0) {
        return {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          avgResponseTime: 0,
          successRate: 0,
        };
      }

      const data = summary[0];
      return {
        ...data,
        successRate: data.totalCalls > 0 ? (data.successfulCalls / data.totalCalls) * 100 : 0,
      };
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting usage summary:', error);
      throw error;
    }
  }

  /**
   * Get usage breakdown by provider and model
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Usage by provider
   */
  async getUsageByProvider(filters = {}) {
    try {
      const usage = await ApiUsageLog.getUsageByProvider(filters);
      
      return usage.map((item) => ({
        provider: item._id.provider,
        model: item._id.model,
        totalCalls: item.totalCalls,
        successfulCalls: item.successfulCalls,
        totalTokens: item.totalTokens,
        totalInputTokens: item.totalInputTokens,
        totalOutputTokens: item.totalOutputTokens,
        totalCost: item.totalCost,
        avgResponseTime: item.avgResponseTime,
        successRate: item.totalCalls > 0 ? (item.successfulCalls / item.totalCalls) * 100 : 0,
      }));
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting usage by provider:', error);
      throw error;
    }
  }

  /**
   * Get usage breakdown by service
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Usage by service
   */
  async getUsageByService(filters = {}) {
    try {
      const usage = await ApiUsageLog.getUsageByService(filters);
      
      return usage.map((item) => ({
        service: item._id,
        totalCalls: item.totalCalls,
        successfulCalls: item.successfulCalls,
        totalTokens: item.totalTokens,
        totalInputTokens: item.totalInputTokens,
        totalOutputTokens: item.totalOutputTokens,
        totalCost: item.totalCost,
        avgResponseTime: item.avgResponseTime,
        successRate: item.totalCalls > 0 ? (item.successfulCalls / item.totalCalls) * 100 : 0,
      }));
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting usage by service:', error);
      throw error;
    }
  }

  /**
   * Get usage over time (time series)
   * @param {Object} filters - Filter options
   * @param {string} filters.granularity - Time granularity (hour, day, month)
   * @returns {Promise<Array>} Usage by date
   */
  async getUsageByDate(filters = {}) {
    try {
      const usage = await ApiUsageLog.getUsageByDate(filters);
      
      return usage.map((item) => ({
        date: item._id,
        totalCalls: item.totalCalls,
        successfulCalls: item.successfulCalls,
        totalTokens: item.totalTokens,
        totalCost: item.totalCost,
        successRate: item.totalCalls > 0 ? (item.successfulCalls / item.totalCalls) * 100 : 0,
      }));
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting usage by date:', error);
      throw error;
    }
  }

  /**
   * Get total cost for a date range
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total cost in USD
   */
  async getTotalCost(filters = {}) {
    try {
      const summary = await this.getUsageSummary(filters);
      return summary.totalCost || 0;
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting total cost:', error);
      throw error;
    }
  }

  /**
   * Get recent failed API calls
   * @param {Object} filters - Filter options
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} Recent failed calls
   */
  async getRecentFailures(filters = {}, limit = 50) {
    try {
      const query = { success: false };
      
      if (filters.userId) query.userId = filters.userId;
      if (filters.service) query.service = filters.service;
      if (filters.provider) query.provider = filters.provider;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
      }

      const failures = await ApiUsageLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return failures;
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting recent failures:', error);
      throw error;
    }
  }

  /**
   * Get top users by cost
   * @param {Object} filters - Filter options
   * @param {number} limit - Maximum number of users to return
   * @returns {Promise<Array>} Top users by cost
   */
  async getTopUsersByCost(filters = {}, limit = 10) {
    try {
      const match = {};
      
      if (filters.service) match.service = filters.service;
      if (filters.provider) match.provider = filters.provider;
      if (filters.startDate || filters.endDate) {
        match.timestamp = {};
        if (filters.startDate) match.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) match.timestamp.$lte = new Date(filters.endDate);
      }

      const topUsers = await ApiUsageLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$userId',
            totalCalls: { $sum: 1 },
            totalCost: { $sum: '$cost' },
            totalTokens: { $sum: '$tokensTotal' },
          },
        },
        { $sort: { totalCost: -1 } },
        { $limit: limit },
      ]);

      return topUsers.map((user) => ({
        userId: user._id,
        totalCalls: user.totalCalls,
        totalCost: user.totalCost,
        totalTokens: user.totalTokens,
      }));
    } catch (error) {
      console.error('❌ [ApiUsageTracking] Error getting top users:', error);
      throw error;
    }
  }

  /**
   * Enable or disable tracking
   * @param {boolean} enabled - Whether to enable tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🔄 [ApiUsageTracking] Tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
const apiUsageTrackingService = new ApiUsageTrackingService();
module.exports = apiUsageTrackingService;

