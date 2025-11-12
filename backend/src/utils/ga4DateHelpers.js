/**
 * Date range normalization utilities for GA4 API
 * Handles multiple input formats and ensures consistency across all endpoints
 */

/**
 * Normalize date range to GA4 format consistently across all endpoints
 * Handles multiple input formats:
 * - GA4 format: "7daysAgo", "today", "yesterday"
 * - ISO date strings: "2025-10-25"
 * - dateRange string: "7 days" (converts to "7daysAgo"/"today")
 * 
 * Always returns GA4 format with 'today' as endDate for consistency
 */
function normalizeDateRange(startDate, endDate, dateRange) {
  let finalStartDate = startDate || '7daysAgo';
  let finalEndDate = endDate || 'today';
  
  // If dateRange string is provided (e.g., "7 days"), use it to override
  if (dateRange && typeof dateRange === 'string') {
    const days = parseInt(dateRange.split(' ')[0]);
    if (!isNaN(days) && days > 0) {
      finalStartDate = `${days}daysAgo`;
      finalEndDate = 'today'; // Always use 'today' for consistency
    }
  } else {
    // Convert ISO date strings to GA4 format if needed
    // Check if startDate is an ISO date string (YYYY-MM-DD)
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const start = new Date(startDate);
      const today = new Date();
      const daysAgo = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
      if (daysAgo > 0) {
        finalStartDate = `${daysAgo}daysAgo`;
      }
    }
    
    // Check if endDate is an ISO date string
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const end = new Date(endDate);
      const today = new Date();
      // If endDate is today or in the future, use 'today'
      if (end >= today) {
        finalEndDate = 'today';
      } else {
        // Convert to daysAgo format
        const daysAgo = Math.ceil((today - end) / (1000 * 60 * 60 * 24));
        if (daysAgo === 1) {
          finalEndDate = 'yesterday';
        } else if (daysAgo > 1) {
          finalEndDate = `${daysAgo}daysAgo`;
        }
      }
    }
    
    // Normalize 'yesterday' to 'today' for consistency across tabs
    // This ensures all tabs show data up to today (excluding today's incomplete data is handled by GA4)
    if (finalEndDate === 'yesterday') {
      finalEndDate = 'today';
    }
  }
  
  return { startDate: finalStartDate, endDate: finalEndDate };
}

module.exports = {
  normalizeDateRange
};












