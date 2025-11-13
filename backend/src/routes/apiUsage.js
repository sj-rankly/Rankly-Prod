const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const apiUsageTrackingService = require('../services/apiUsageTrackingService');

/**
 * GET /api/usage/summary
 * Get overall usage summary
 * Query params: startDate, endDate, service, provider
 */
router.get('/summary', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('📊 [API] GET /api/usage/summary');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, service, provider } = req.query;

  const filters = {
    userId: req.userId,
  };

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (service) filters.service = service;
  if (provider) filters.provider = provider;

  const summary = await apiUsageTrackingService.getUsageSummary(filters);

  res.json({
    success: true,
    data: summary,
  });
}));

/**
 * GET /api/usage/by-service
 * Get usage breakdown by service
 * Query params: startDate, endDate, provider
 */
router.get('/by-service', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('📊 [API] GET /api/usage/by-service');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, provider } = req.query;

  const filters = {
    userId: req.userId,
  };

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (provider) filters.provider = provider;

  const usage = await apiUsageTrackingService.getUsageByService(filters);

  res.json({
    success: true,
    data: usage,
  });
}));

/**
 * GET /api/usage/by-provider
 * Get usage breakdown by provider and model
 * Query params: startDate, endDate, service
 */
router.get('/by-provider', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('📊 [API] GET /api/usage/by-provider');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, service } = req.query;

  const filters = {
    userId: req.userId,
  };

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (service) filters.service = service;

  const usage = await apiUsageTrackingService.getUsageByProvider(filters);

  res.json({
    success: true,
    data: usage,
  });
}));

/**
 * GET /api/usage/by-date
 * Get usage over time (time series)
 * Query params: startDate, endDate, service, provider, granularity (hour|day|month)
 */
router.get('/by-date', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('📊 [API] GET /api/usage/by-date');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, service, provider, granularity } = req.query;

  const filters = {
    userId: req.userId,
  };

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (service) filters.service = service;
  if (provider) filters.provider = provider;
  if (granularity) filters.granularity = granularity;

  const usage = await apiUsageTrackingService.getUsageByDate(filters);

  res.json({
    success: true,
    data: usage,
  });
}));

/**
 * GET /api/usage/total-cost
 * Get total cost for a date range
 * Query params: startDate, endDate, service, provider
 */
router.get('/total-cost', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('💰 [API] GET /api/usage/total-cost');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, service, provider } = req.query;

  const filters = {
    userId: req.userId,
  };

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (service) filters.service = service;
  if (provider) filters.provider = provider;

  const totalCost = await apiUsageTrackingService.getTotalCost(filters);

  res.json({
    success: true,
    data: {
      totalCost,
      currency: 'USD',
    },
  });
}));

/**
 * GET /api/usage/failures
 * Get recent failed API calls
 * Query params: startDate, endDate, service, provider, limit
 */
router.get('/failures', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('❌ [API] GET /api/usage/failures');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, service, provider, limit } = req.query;

  const filters = {
    userId: req.userId,
  };

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (service) filters.service = service;
  if (provider) filters.provider = provider;

  const failures = await apiUsageTrackingService.getRecentFailures(
    filters,
    limit ? parseInt(limit) : 50
  );

  res.json({
    success: true,
    data: failures,
  });
}));

/**
 * GET /api/usage/top-users
 * Get top users by cost (admin only)
 * Query params: startDate, endDate, service, provider, limit
 */
router.get('/top-users', authenticateToken, asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('👥 [API] GET /api/usage/top-users');
  console.log(`👤 User: ${req.userId}`);
  console.log('='.repeat(70));

  const { startDate, endDate, service, provider, limit } = req.query;

  const filters = {};

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (service) filters.service = service;
  if (provider) filters.provider = provider;

  const topUsers = await apiUsageTrackingService.getTopUsersByCost(
    filters,
    limit ? parseInt(limit) : 10
  );

  res.json({
    success: true,
    data: topUsers,
  });
}));

module.exports = router;

