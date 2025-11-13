/**
 * Main GA4 routes file
 * Imports and mounts all sub-routers
 */

const express = require('express');
const router = express.Router();

// Import sub-routers
const connectionRoutes = require('./ga4/connection');
const dataRoutes = require('./ga4/data');
const platformRoutes = require('./ga4/platforms');
const pagesRoutes = require('./ga4/pages');
const geoDeviceRoutes = require('./ga4/geoDevice');
const conversionsRoutes = require('./ga4/conversions');
const cacheRoutes = require('./ga4/cache');
const testRoutes = require('./ga4/test');
const journeyRoutes = require('./ga4/journey');

// Mount all sub-routers
router.use('/', connectionRoutes);
router.use('/', dataRoutes);
router.use('/', platformRoutes);
router.use('/', pagesRoutes);
router.use('/', geoDeviceRoutes);
router.use('/', conversionsRoutes);
router.use('/', cacheRoutes);
router.use('/', testRoutes);
router.use('/', journeyRoutes);

module.exports = router;
