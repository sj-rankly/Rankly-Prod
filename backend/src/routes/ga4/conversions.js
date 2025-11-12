const express = require('express');
const { ga4SessionMiddleware } = require('../../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../../middleware/ga4Connection');

const router = express.Router();

/**
 * GET /api/ga4/conversion-events
 * Fetch conversion events data from GA4 Admin API
 */
router.get('/conversion-events', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;

    console.log('🎯 [conversion-events] Fetching conversion events for property:', propertyId);

    // Fetch conversion events from GA4 Admin API
    const adminApiUrl = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/conversionEvents`;
    
    const response = await fetch(adminApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 [conversion-events] GA4 Admin API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [conversion-events] GA4 Admin API error:', errorText);
      // Don't fail completely, return standard events
    }

    const data = await response.ok ? await response.json() : { conversionEvents: [] };

    console.log('🔍 [conversion-events] Raw GA4 API response:', JSON.stringify(data, null, 2));
    console.log('🔍 [conversion-events] Number of conversion events:', data.conversionEvents?.length || 0);

    // Always include 'conversions' as the default built-in metric
    const allEvents = [
      { name: 'conversions', displayName: 'Conversions', category: 'Standard', isBuiltIn: true }
    ];

    // Add all conversion events from GA4 Admin API
    // These are the actual events marked as conversions in GA4
    if (data.conversionEvents && Array.isArray(data.conversionEvents)) {
      for (const event of data.conversionEvents) {
        // event.eventName is the actual event name (e.g., 'purchase', 'view_item')
        // Use it directly with keyEvents: prefix
        const eventName = event.eventName;
        const displayName = event.displayName || event.eventName;
        
        allEvents.push({
          name: `keyEvents:${eventName}`, // Use the actual event name from GA4
          displayName: displayName,
          category: event.eventName.includes('_') ? 'Standard' : 'Custom',
          isCustom: !event.eventName.includes('_'), // Standard events usually have underscores
          originalEventName: eventName // Store original for reference
        });
      }
    }

    console.log('📋 [conversion-events] Processed events:', allEvents.map(e => ({
      name: e.name,
      displayName: e.displayName,
      originalEventName: e.originalEventName
    })));

    console.log('✅ [conversion-events] Final events:', { 
      totalEvents: allEvents.length,
      builtInEvents: allEvents.filter(e => e.isBuiltIn).length,
      customEvents: allEvents.filter(e => e.isCustom).length
    });

    res.json({
      success: true,
      data: {
        events: allEvents,
        totalEvents: allEvents.length
      }
    });
  } catch (error) {
    console.error('❌ [conversion-events] Error:', error);
    // Return just conversions even on error
    res.json({
      success: true,
      data: {
        events: [
          { name: 'conversions', displayName: 'Conversions', category: 'Standard', isBuiltIn: true }
        ],
        totalEvents: 1
      }
    });
  }
});

module.exports = router;












