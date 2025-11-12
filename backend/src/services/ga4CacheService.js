const GA4DataSnapshot = require('../models/GA4DataSnapshot');

async function getCachedData(userId, propertyId, dataType, startDate, endDate) {
  const cached = await GA4DataSnapshot.findOne({
    userId,
    propertyId,
    dataType,
    startDate,
    endDate,
    expiresAt: { $gt: new Date() }
  });
  
  return cached ? cached.data : null;
}

async function setCachedData(userId, propertyId, dataType, startDate, endDate, data, ttlMinutes = 30) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  
  await GA4DataSnapshot.findOneAndUpdate(
    { userId, propertyId, dataType, startDate, endDate },
    { data, fetchedAt: new Date(), expiresAt },
    { upsert: true }
  );
}

async function getHistoricalData(userId, propertyId, dataType, targetDate) {
  // Find the closest historical snapshot to targetDate
  return await GA4DataSnapshot.findOne({
    userId,
    propertyId,
    dataType,
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  }).sort({ fetchedAt: -1 });
}

module.exports = { getCachedData, setCachedData, getHistoricalData };

