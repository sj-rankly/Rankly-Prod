/**
 * Metric conversion utilities for GA4 API
 * Handles conversion of event names to valid GA4 metric names
 */

/**
 * Helper function to convert conversion event name to valid GA4 metric name
 * GA4 only accepts:
 * - 'conversions' (built-in metric)
 * - 'keyEvents:eventName' (for custom conversion events)
 * 
 * Note: GA4 uses singular forms for events (e.g., 'purchase' not 'purchases')
 */
function getConversionEventMetric(conversionEvent) {
  // 'conversions' is the only valid built-in metric
  if (conversionEvent === 'conversions') {
    return 'conversions';
  }
  
  // If already prefixed with keyEvents:, use as-is
  if (conversionEvent.startsWith('keyEvents:')) {
    return conversionEvent;
  }
  
  // Map plural event names to singular (GA4 uses singular)
  const singularMap = {
    'purchases': 'purchase',
    'addToCarts': 'add_to_cart',
    'beginCheckouts': 'begin_checkout',
    'viewItems': 'view_item',
    'searches': 'search',
    'logins': 'login',
    'signUps': 'sign_up',
    'generateLeads': 'generate_lead'
  };
  
  // Convert to singular if needed
  const eventName = singularMap[conversionEvent] || conversionEvent;
  
  // For all other events (standard or custom), prefix with keyEvents:
  return `keyEvents:${eventName}`;
}

module.exports = {
  getConversionEventMetric
};












