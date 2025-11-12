/**
 * Utility functions to transform GA4 API responses
 * Based on traffic-analytics implementation
 */

// LLM platform detection patterns
const LLM_PATTERNS = {
  'ChatGPT': /(chatgpt|openai\.com|chat\.openai)/i,
  'Claude': /(claude|anthropic)/i,
  'Gemini': /(gemini|bard|google\s*ai)/i,
  'Perplexity': /perplexity/i,
  'Copilot': /copilot/i,
  'Grok': /(grok|xai)/i,
  'Poe': /poe/i,
  'Character.ai': /character\.ai/i
};

// List of valid LLM platform names (for filtering)
const LLM_PLATFORMS = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Copilot', 'Grok', 'Poe', 'Character.ai'];

/**
 * Check if a platform is an LLM platform
 */
function isLLMPlatform(platform) {
  return platform && LLM_PLATFORMS.includes(platform);
}

/**
 * Detect platform from source and medium OR pageReferrer
 */
function detectPlatform(source, medium, referrer = null) {
  const sourceLower = source ? source.toLowerCase() : '';
  const mediumLower = medium ? medium.toLowerCase() : '';
  const referrerLower = referrer ? referrer.toLowerCase() : '';
  
  // Priority 1: Check referrer for LLM platforms (most accurate)
  if (referrer) {
    for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
      if (pattern.test(referrer)) {
        return platform;
      }
    }
  }
  
  // Priority 2: Check source for LLM platforms
  if (source) {
    for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
      if (pattern.test(source)) {
        return platform;
      }
    }
  }
  
  // Standard platform detection
  if (mediumLower === 'organic') return 'organic';
  if (mediumLower === 'cpc' || mediumLower === 'paid') return 'paid';
  if (mediumLower === 'referral') return 'referral';
  if (mediumLower === 'email') return 'email';
  if (mediumLower === 'social') return 'social';
  if (sourceLower === '(direct)') return 'direct';
  
  return 'other';
}

/**
 * Detect LLM platform from referrer value
 */
function detectLLMFromReferrer(referrer) {
  if (!referrer) {
    return null;
  }

  for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
    if (pattern.test(referrer)) {
      return platform;
    }
  }

  return null;
}

/**
 * Aggregate LLM metrics using referrer-only GA4 response
 */
function aggregateLLMReferrerData(ga4Response, conversionMetricName = 'conversions') {
  if (!ga4Response) {
    return {
      platformMap: new Map(),
      totalSessions: 0
    };
  }

  const rows = ga4Response.rows || [];
  const metricHeaders = ga4Response.metricHeaders || [];
  let conversionMetricIndex = 2;

  if (metricHeaders.length > 0) {
    const headerIndex = metricHeaders.findIndex(header => header.name === conversionMetricName);
    if (headerIndex !== -1) {
      conversionMetricIndex = headerIndex;
    }
  }

  const platformMap = new Map();

  for (const row of rows) {
    const referrer = row.dimensionValues?.[0]?.value || '';
    const platform = detectLLMFromReferrer(referrer);

    if (!platform) {
      continue;
    }

    const metrics = row.metricValues || [];
    const rowSessions = parseFloat(metrics[0]?.value || '0');
    if (rowSessions === 0) {
      continue;
    }

    const rowEngagementRate = parseFloat(metrics[1]?.value || '0');
    const rowConversions = parseFloat(metrics[conversionMetricIndex]?.value || '0');
    const rowBounceRate = parseFloat(metrics[3]?.value || '0');
    const rowAvgSessionDuration = parseFloat(metrics[4]?.value || '0');
    const rowPagesPerSession = parseFloat(metrics[5]?.value || '0');
    const rowNewUsers = parseFloat(metrics[6]?.value || '0');
    const rowTotalUsers = parseFloat(metrics[7]?.value || '0');

    const current = platformMap.get(platform) || {
      sessions: 0,
      engagementRate: 0,
      conversions: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      pagesPerSession: 0,
      newUsers: 0,
      totalUsers: 0,
      count: 0
    };

    current.sessions += rowSessions;
    current.engagementRate += rowEngagementRate * rowSessions;
    current.conversions += rowConversions;
    current.bounceRate += rowBounceRate * rowSessions;
    current.avgSessionDuration += rowAvgSessionDuration * rowSessions;
    current.pagesPerSession += rowPagesPerSession * rowSessions;
    current.newUsers += rowNewUsers;
    current.totalUsers += rowTotalUsers;
    current.count += 1;

    platformMap.set(platform, current);
  }

  const totalSessions = Array.from(platformMap.values()).reduce((sum, data) => sum + data.sessions, 0);

  return {
    platformMap,
    totalSessions
  };
}
/**
 * Calculate comparison date range for period-over-period analysis
 */
function calculateComparisonDates(startDate, endDate) {
  // Handle GA4 relative dates
  let endDateProcessed = endDate;
  if (endDate === 'today') {
    endDateProcessed = new Date().toISOString().split('T')[0];
  }
  if (endDate === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    endDateProcessed = yesterday.toISOString().split('T')[0];
  }
  
  // Parse dates
  let start, end;
  if (startDate.includes('daysAgo')) {
    const days = parseInt(startDate);
    start = new Date();
    start.setDate(start.getDate() - days);
  } else if (startDate.match(/^\d{8}$/)) {
    // Handle YYYYMMDD format
    start = new Date(startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  } else {
    // Assume YYYY-MM-DD format
    start = new Date(startDate);
  }
  
  if (endDateProcessed.includes('daysAgo')) {
    const days = parseInt(endDateProcessed);
    end = new Date();
    end.setDate(end.getDate() - days);
  } else if (endDateProcessed.match(/^\d{8}$/)) {
    // Handle YYYYMMDD format
    end = new Date(endDateProcessed.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  } else {
    // Assume YYYY-MM-DD format
    end = new Date(endDateProcessed);
  }
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid dates in calculateComparisonDates:', { startDate, endDate, start, end });
    return {
      comparisonStartDate: '7daysAgo',
      comparisonEndDate: 'today'
    };
  }
  
  // Calculate period length
  const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Calculate comparison period (same length, immediately before)
  const comparisonEnd = new Date(start);
  comparisonEnd.setDate(comparisonEnd.getDate() - 1);
  
  const comparisonStart = new Date(comparisonEnd);
  comparisonStart.setDate(comparisonStart.getDate() - periodDays);
  
  // Format dates as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    comparisonStartDate: formatDate(comparisonStart),
    comparisonEndDate: formatDate(comparisonEnd)
  };
}

/**
 * Transform platform split data (similar to traffic-analytics)
 */
function transformToPlatformSplit(ga4Response, comparisonResponse = null, options = {}) {
  const {
    llmReferrerData = null,
    llmComparisonData = null,
    conversionMetric = 'conversions'
  } = options;

  const rows = ga4Response.rows || [];
  const comparisonRows = comparisonResponse?.rows || [];
  
  // Determine conversion metric index from response headers
  // The conversion metric is always at index 2 (third metric: sessions, engagementRate, conversions, ...)
  let conversionMetricIndex = 2; // Default to index 2 based on reportConfig structure
  
  // Verify by checking metric headers if available
  const metricHeaders = ga4Response.metricHeaders || [];
  if (metricHeaders.length > 0) {
    const headerIndex = metricHeaders.findIndex(header => header.name === conversionMetric);
    if (headerIndex !== -1) {
      conversionMetricIndex = headerIndex;
    }
    const conversionMetricName = metricHeaders[conversionMetricIndex]?.name || conversionMetric;
    console.log('🔍 [transformToPlatformSplit] Conversion metric verification:', {
      conversionMetricIndex,
      conversionMetricName,
      expectedIndex: 2,
      metricHeaders: metricHeaders.map((h, idx) => ({ index: idx, name: h.name }))
    });
  }
  
  console.log('🔍 [transformToPlatformSplit] Starting transformation:', {
    currentRows: rows.length,
    comparisonRows: comparisonRows.length,
    hasComparisonData: comparisonResponse !== null && comparisonRows.length > 0
  });
  
  // Build comparison map
  const comparisonMap = new Map();
  const comparisonLLMData = {
    sessions: 0,
    engagementRate: 0,
    conversions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    pagesPerSession: 0,
    newUsers: 0,
    totalUsers: 0
  };
  
  for (const row of comparisonRows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || ''; // May be empty if referrer data fetched separately
    const metrics = row.metricValues || [];
    
    // Use same LLM detection logic as current period
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    
    const platform = detectedLLM || detectPlatform(source, medium, referrer);
    const sessions = parseFloat(metrics[0]?.value || '0');
    
    // If it's an LLM platform, also aggregate for 'LLMs'
    if (detectedLLM) {
      comparisonLLMData.sessions += sessions;
      const rowEngagementRate = parseFloat(metrics[1]?.value || '0');
      const rowConversions = parseFloat(metrics[conversionMetricIndex]?.value || '0'); // Use dynamic index
      const rowBounceRate = parseFloat(metrics[3]?.value || '0');
      const rowAvgSessionDuration = parseFloat(metrics[4]?.value || '0');
      const rowPagesPerSession = parseFloat(metrics[5]?.value || '0');
      const rowNewUsers = parseFloat(metrics[6]?.value || '0');
      const rowTotalUsers = parseFloat(metrics[7]?.value || '0');
      
      comparisonLLMData.engagementRate += rowEngagementRate * sessions;
      comparisonLLMData.conversions += rowConversions;
      comparisonLLMData.bounceRate += rowBounceRate * sessions;
      comparisonLLMData.avgSessionDuration += rowAvgSessionDuration * sessions;
      comparisonLLMData.pagesPerSession += rowPagesPerSession * sessions;
      comparisonLLMData.newUsers += rowNewUsers;
      comparisonLLMData.totalUsers += rowTotalUsers;
    }
    
    const current = comparisonMap.get(platform) || { sessions: 0 };
    current.sessions += sessions;
    comparisonMap.set(platform, current);
  }
  
  // Add aggregated LLM comparison data to comparison map
  if (comparisonLLMData.sessions > 0) {
    comparisonMap.set('LLMs', comparisonLLMData);
    console.log('🔍 [transformToPlatformSplit] Added aggregated LLM comparison data:', {
      llmComparisonSessions: comparisonLLMData.sessions,
      comparisonMapKeys: Array.from(comparisonMap.keys())
    });
  }
  
  // Aggregate metrics by platform for current period
  const platformMap = new Map();
  let llmRowsDetected = 0;
  let llmRowsByPattern = {};
  
  for (const row of rows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || ''; // Added referrer dimension
    const metrics = row.metricValues || [];
    
    // Check for LLM patterns in all dimensions before standard detection
    let detectedLLM = null;
    const sourceLower = source ? source.toLowerCase() : '';
    const referrerLower = referrer ? referrer.toLowerCase() : '';
    
    // Check referrer first (most accurate)
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          llmRowsDetected++;
          llmRowsByPattern[platform] = (llmRowsByPattern[platform] || 0) + 1;
          break;
        }
      }
    }
    
    // Check source if no LLM found in referrer
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          llmRowsDetected++;
          llmRowsByPattern[platform] = (llmRowsByPattern[platform] || 0) + 1;
          break;
        }
      }
    }
    
    // Use detected LLM or fall back to standard platform detection
    const platform = detectedLLM || detectPlatform(source, medium, referrer);
    
    const current = platformMap.get(platform) || {
      sessions: 0,
      engagementRate: 0, // Will store weighted sum: engagementRate * sessions
      conversions: 0,
      bounceRate: 0, // Will store weighted sum: bounceRate * sessions
      avgSessionDuration: 0, // Will store total duration in seconds
      pagesPerSession: 0, // Will store total page views
      newUsers: 0,
      totalUsers: 0,
      count: 0
    };
    
    // Parse metrics - GA4 returns engagementRate and bounceRate as decimals (0-1)
    // Metric order: [0] sessions, [1] engagementRate, [2] conversions (or keyEvents:...), [3] bounceRate, [4] avgSessionDuration, [5] pagesPerSession, [6] newUsers, [7] totalUsers
    const rowSessions = parseFloat(metrics[0]?.value || '0');
    const rowEngagementRate = parseFloat(metrics[1]?.value || '0'); // Decimal 0-1
    const rowConversions = parseFloat(metrics[conversionMetricIndex]?.value || '0'); // Use dynamic index
    const rowBounceRate = parseFloat(metrics[3]?.value || '0'); // Decimal 0-1
    const rowAvgSessionDuration = parseFloat(metrics[4]?.value || '0'); // Seconds
    const rowPagesPerSession = parseFloat(metrics[5]?.value || '0'); // Number
    const rowNewUsers = parseFloat(metrics[6]?.value || '0');
    const rowTotalUsers = parseFloat(metrics[7]?.value || '0');
    
    // Accumulate values for weighted averages
    current.sessions += rowSessions;
    current.engagementRate += rowEngagementRate * rowSessions; // Weighted sum
    current.conversions += rowConversions;
    current.bounceRate += rowBounceRate * rowSessions; // Weighted sum
    current.avgSessionDuration += rowAvgSessionDuration * rowSessions; // Total duration
    current.pagesPerSession += rowPagesPerSession * rowSessions; // Total page views
    current.newUsers += rowNewUsers;
    current.totalUsers += rowTotalUsers;
    current.count += 1;
    
    platformMap.set(platform, current);
  }
  
  console.log('🔍 LLM Detection Stats:', {
    totalRows: rows.length,
    llmRowsDetected: llmRowsDetected,
    llmRowsByPattern: llmRowsByPattern,
    platformsInMap: Array.from(platformMap.keys()).filter(p => Object.keys(LLM_PATTERNS).includes(p))
  });
  
  // Calculate totals
  const totalSessions = Array.from(platformMap.values()).reduce((sum, val) => sum + val.sessions, 0);
  const comparisonTotalSessions = Array.from(comparisonMap.values()).reduce((sum, p) => sum + p.sessions, 0);
  
  console.log('🔍 [transformToPlatformSplit] Totals calculated:', {
    totalSessions,
    comparisonTotalSessions,
    comparisonMapSize: comparisonMap.size,
    comparisonPlatforms: Array.from(comparisonMap.entries()).map(([name, data]) => ({
      name,
      sessions: data.sessions
    }))
  });
  
  // Aggregate LLM platforms - but keep the data to calculate totals correctly
  const llmData = {
    sessions: 0,
    engagementRate: 0,
    conversions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    pagesPerSession: 0,
    newUsers: 0,
    totalUsers: 0,
    count: 0
  };
  
  const llmPlatforms = Object.keys(LLM_PATTERNS);
  const llmPlatformData = [];
  
  const llmReferrerAggregate = aggregateLLMReferrerData(llmReferrerData, conversionMetric);
  const llmReferrerComparisonAggregate = aggregateLLMReferrerData(llmComparisonData, conversionMetric);

  // Override comparison map with referrer-based LLM sessions if available
  if (llmReferrerComparisonAggregate.platformMap.size > 0) {
    const comparisonLLMData = {
      sessions: 0,
      engagementRate: 0,
      conversions: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      pagesPerSession: 0,
      newUsers: 0,
      totalUsers: 0,
      count: 0
    };

    for (const platform of llmPlatforms) {
      const comparisonRefData = llmReferrerComparisonAggregate.platformMap.get(platform);
      if (comparisonRefData) {
        comparisonMap.set(platform, comparisonRefData);
        comparisonLLMData.sessions += comparisonRefData.sessions;
        comparisonLLMData.engagementRate += comparisonRefData.engagementRate;
        comparisonLLMData.conversions += comparisonRefData.conversions;
        comparisonLLMData.bounceRate += comparisonRefData.bounceRate;
        comparisonLLMData.avgSessionDuration += comparisonRefData.avgSessionDuration;
        comparisonLLMData.pagesPerSession += comparisonRefData.pagesPerSession;
        comparisonLLMData.newUsers += comparisonRefData.newUsers;
        comparisonLLMData.totalUsers += comparisonRefData.totalUsers;
        comparisonLLMData.count += comparisonRefData.count;
      }
    }
    if (comparisonLLMData.sessions > 0) {
      comparisonMap.set('LLMs', comparisonLLMData);
    }
  }

  for (const platform of llmPlatforms) {
    const referrerData = llmReferrerAggregate.platformMap.get(platform);
    const data = referrerData || platformMap.get(platform);

    if (!data) {
      continue;
    }

    llmData.sessions += data.sessions;
    llmData.engagementRate += data.engagementRate;
    llmData.conversions += data.conversions;
    llmData.bounceRate += data.bounceRate;
    llmData.avgSessionDuration += data.avgSessionDuration;
    llmData.pagesPerSession += data.pagesPerSession;
    llmData.newUsers += data.newUsers;
    llmData.totalUsers += data.totalUsers;
    llmData.count += data.count;
    
    // Store individual LLM platform data
    llmPlatformData.push({ platform, data });
    
    platformMap.delete(platform);
  }
  
  // Add aggregated LLM data - calculate weighted averages
  if (llmData.sessions > 0) {
    llmData.engagementRate = Math.round((llmData.engagementRate / llmData.sessions) * 10000) / 10000; // Weighted average, rounded to 4 decimals for precision
    llmData.bounceRate = Math.round((llmData.bounceRate / llmData.sessions) * 10000) / 10000; // Weighted average, rounded to 4 decimals for precision
    llmData.avgSessionDuration = Math.round((llmData.avgSessionDuration / llmData.sessions) * 100) / 100; // Weighted average, rounded to 2 decimals
    llmData.pagesPerSession = Math.round((llmData.pagesPerSession / llmData.sessions) * 100) / 100; // Weighted average, rounded to 2 decimals
    platformMap.set('LLMs', llmData);
  }
  
  // Store LLM platform breakdown for validation
  const llmBreakdown = llmPlatformData.map(({ platform, data }) => ({
    platform,
    sessions: data.sessions
  }));
  
  // If referrer aggregation exists but individual breakdown is empty, populate from referrer map
  if (llmBreakdown.length === 0 && llmReferrerAggregate.platformMap.size > 0) {
    llmReferrerAggregate.platformMap.forEach((data, platform) => {
      llmBreakdown.push({
        platform,
        sessions: data.sessions
      });
    });
  }
  
  // Calculate averages and format final platform data
  const finalPlatformData = [];
  
  // Process each platform - calculate weighted averages
  for (const [platform, data] of platformMap.entries()) {
    // Calculate weighted averages (divide by total sessions, not count)
    const avgEngagementRate = data.sessions > 0 ? Math.round((data.engagementRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgBounceRate = data.sessions > 0 ? Math.round((data.bounceRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgSessionDuration = data.sessions > 0 ? Math.round((data.avgSessionDuration / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const avgPagesPerSession = data.sessions > 0 ? Math.round((data.pagesPerSession / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const returningUsers = data.totalUsers - data.newUsers;
    const conversionRate = data.sessions > 0 ? Math.round((data.conversions / data.sessions) * 10000) / 100 : 0; // Rounded to 2 decimals
    
    // Calculate change from comparison period
    const comparisonData = comparisonMap.get(platform);
    const previousSessions = comparisonData?.sessions || 0;
    const absoluteChange = data.sessions - previousSessions;
    
    // Debug logging for LLMs platform and first few platforms
    if (platform === 'LLMs' || finalPlatformData.length < 3) {
      console.log('🔍 [transformToPlatformSplit] Platform comparison:', {
        platform,
        currentSessions: data.sessions,
        previousSessions,
        absoluteChange,
        hasComparisonData: !!comparisonData,
        comparisonDataExists: comparisonMap.has(platform)
      });
    }
    
    // Calculate session percentage change
    const sessionChange = previousSessions > 0 
      ? ((data.sessions - previousSessions) / previousSessions) * 100 
      : 0;
    
    // Calculate share percentage change (current share - previous share)
    const currentShare = totalSessions > 0 ? (data.sessions / totalSessions * 100) : 0;
    const previousShare = comparisonTotalSessions > 0 
      ? (previousSessions / comparisonTotalSessions * 100) 
      : 0;
    const shareChange = currentShare - previousShare; // Difference in percentage points
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    finalPlatformData.push({
      name: platformName,
      sessions: data.sessions,
      percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions * 100) * 100) / 100 : 0, // Rounded to 2 decimals
      engagementRate: Math.round((avgEngagementRate * 100) * 100) / 100, // Rounded to 2 decimals
      conversions: data.conversions,
      bounceRate: Math.round((avgBounceRate * 100) * 100) / 100, // Rounded to 2 decimals
      avgSessionDuration: avgSessionDuration, // Already rounded to 2 decimals
      pagesPerSession: avgPagesPerSession, // Already rounded to 2 decimals
      newUsers: data.newUsers,
      returningUsers: returningUsers,
      goalCompletions: data.conversions,
      revenue: 0,
      conversionRate: conversionRate, // Already rounded to 2 decimals
      // Comparison data
      shareChange: Math.round(shareChange * 100) / 100, // Share percentage change (rounded to 2 decimals)
      sessionChange: Math.round(sessionChange * 100) / 100, // Session percentage change (for reference)
      absoluteChange: absoluteChange,
      trend: shareChange > 0 ? 'up' : shareChange < 0 ? 'down' : 'neutral' // Trend based on share change
    });
  }
  
  // Sort by sessions (descending)
  finalPlatformData.sort((a, b) => b.sessions - a.sessions);
  
  // Create platform split (for pie/donut chart) with colors
  const platformColors = {
    'organic': '#10B981',
    'direct': '#EF4444',
    'referral': '#F59E0B',
    'llms': '#06B6D4',
    'other': '#6B7280',
    'social': '#F97316',
    'email': '#14B8A6',
    'paid': '#8B5CF6'
  };
  
  const platformSplit = finalPlatformData.map(item => ({
    name: item.name,
    value: item.percentage,
    color: platformColors[item.name.toLowerCase()] || '#6B7280'
  }));
  
  // Create rankings (for table) with comparison
  const rankings = finalPlatformData.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    sessions: item.sessions,
    percentage: `${item.percentage.toFixed(2)}%`,
    shareChange: item.shareChange, // Share percentage change
    absoluteChange: item.absoluteChange,
    trend: item.trend
  }));
  
  // Top platform info
  const topPlatform = finalPlatformData[0]?.name || 'N/A';
  const topPlatformShare = finalPlatformData[0]?.percentage || 0;
  
  // Validate that all platform sessions add up to total sessions
  const finalTotalSessions = finalPlatformData.reduce((sum, p) => sum + p.sessions, 0);
  const sessionsDifference = Math.abs(finalTotalSessions - totalSessions);
  if (sessionsDifference > 1) {
    console.error('⚠️ [transformToPlatformSplit] Sessions mismatch:', {
      calculatedTotal: finalTotalSessions,
      reportedTotal: totalSessions,
      difference: sessionsDifference,
      platforms: finalPlatformData.map(p => ({ name: p.name, sessions: p.sessions }))
    });
  }
  
  // Validate that all percentages add up to 100%
  const totalPercentage = finalPlatformData.reduce((sum, p) => sum + p.percentage, 0);
  const percentageDifference = Math.abs(totalPercentage - 100);
  if (percentageDifference > 0.1) {
    console.error('⚠️ [transformToPlatformSplit] Percentages don\'t add up to 100%:', {
      totalPercentage: totalPercentage.toFixed(2),
      difference: percentageDifference.toFixed(2),
      platforms: finalPlatformData.map(p => ({ name: p.name, percentage: p.percentage }))
    });
  }
  
  // Debug: Log LLM breakdown with detailed validation
  const llmPlatformsSessions = finalPlatformData.find(p => p.name === 'LLMs')?.sessions || 0;
  
  console.log('🔍 LLM Platform Breakdown:', {
    totalLLMSessions: llmData.sessions,
    llmBreakdown: llmBreakdown,
    totalSessions: totalSessions,
    finalTotalSessions: finalTotalSessions,
    llmPlatformsSessions: llmPlatformsSessions,
    sessionsValidation: sessionsDifference <= 1, // Allow small floating point differences
    percentageValidation: percentageDifference <= 0.1, // Allow small rounding differences
    individualLLMTotal: llmBreakdown.reduce((sum, p) => sum + p.sessions, 0),
    platformsInMap: Array.from(platformMap.keys()),
    finalPlatformNames: finalPlatformData.map(p => p.name),
    platformSessions: finalPlatformData.map(p => ({ name: p.name, sessions: p.sessions, percentage: p.percentage.toFixed(2) + '%' }))
  });
  
  // Final validation: Ensure totalSessions matches sum of all platforms
  // If there's a mismatch, use the calculated total from platforms
  const validatedTotalSessions = Math.abs(finalTotalSessions - totalSessions) <= 1 
    ? totalSessions 
    : finalTotalSessions;
  
  // Calculate total change metrics using validated total
  const totalAbsoluteChange = validatedTotalSessions - comparisonTotalSessions;
  const totalPercentageChange = comparisonTotalSessions > 0 
    ? ((validatedTotalSessions - comparisonTotalSessions) / comparisonTotalSessions) * 100 
    : 0;
  
  // Recalculate percentages if we had to adjust total
  if (Math.abs(finalTotalSessions - totalSessions) > 1) {
    console.warn('⚠️ [transformToPlatformSplit] Adjusting percentages to match calculated total');
    finalPlatformData.forEach(platform => {
      platform.percentage = validatedTotalSessions > 0 
        ? Math.round((platform.sessions / validatedTotalSessions * 100) * 100) / 100 
        : 0;
    });
    
    // Update platformSplit with corrected percentages
    finalPlatformData.forEach((platform, index) => {
      const splitItem = platformSplit.find(p => p.name === platform.name);
      if (splitItem) {
        splitItem.value = platform.percentage;
      }
    });
    
    // Update rankings with corrected percentages
    finalPlatformData.forEach((platform, index) => {
      const ranking = rankings.find(r => r.name === platform.name);
      if (ranking) {
        ranking.percentage = `${platform.percentage.toFixed(2)}%`;
      }
    });
    
    // Final validation after recalculation
    const recalculatedPercentageTotal = finalPlatformData.reduce((sum, p) => sum + p.percentage, 0);
    const recalculatedDifference = Math.abs(recalculatedPercentageTotal - 100);
    if (recalculatedDifference > 0.1) {
      console.warn('⚠️ [transformToPlatformSplit] Percentages still don\'t add up after recalculation:', {
        total: recalculatedPercentageTotal.toFixed(2),
        difference: recalculatedDifference.toFixed(2)
      });
    }
  }
  
  return {
    platformSplit,
    rankings,
    totalSessions: validatedTotalSessions,
    summary: {
      totalSessions: validatedTotalSessions,
      topPlatform,
      topPlatformShare: finalPlatformData[0]?.percentage || 0,
      totalAbsoluteChange: totalAbsoluteChange,
      totalPercentageChange: Math.round(totalPercentageChange * 100) / 100,
      totalChange: totalPercentageChange, // Keep for backwards compatibility
      llmBreakdown, // Add LLM breakdown for debugging
      validation: {
        sessionsMatch: sessionsDifference <= 1,
        percentagesMatch: percentageDifference <= 0.1,
        calculatedTotal: finalTotalSessions,
        reportedTotal: totalSessions
      }
    },
    // Include the detailed performance data for Traffic Performance section
    performanceData: finalPlatformData
  };
}

/**
 * Transform LLM platforms data (similar to traffic-analytics)
 */
function transformToLLMPlatforms(ga4Response, comparisonResponse = null, options = {}) {
  const { conversionMetric = 'conversions' } = options;
  const rows = ga4Response.rows || [];
  const comparisonRows = comparisonResponse?.rows || [];
  
  // Determine conversion metric index from response headers
  // The conversion metric is always at index 2 (third metric: sessions, engagementRate, conversions, ...)
  let conversionMetricIndex = 2; // Default index based on reportConfig structure
  
  // Verify by checking metric headers if available
  const metricHeaders = ga4Response.metricHeaders || [];
  if (metricHeaders.length > 0) {
    const headerIndex = metricHeaders.findIndex(header => header.name === conversionMetric);
    if (headerIndex !== -1) {
      conversionMetricIndex = headerIndex;
    }
    const conversionMetricName = metricHeaders[conversionMetricIndex]?.name || conversionMetric;
    console.log('🔍 [transformToLLMPlatforms] Conversion metric verification:', {
      conversionMetricIndex,
      conversionMetricName,
      expectedIndex: 2,
      metricHeaders: metricHeaders.map((h, idx) => ({ index: idx, name: h.name }))
    });
  }
  
  console.log('🔍 [transformToLLMPlatforms] Starting transformation:', {
    currentRows: rows.length,
    comparisonRows: comparisonRows.length,
    hasComparisonData: comparisonResponse !== null && comparisonRows.length > 0,
    conversionMetricIndex
  });
  
  // Build comparison map - use same detection logic as platform-split
  const comparisonMap = new Map();
  let comparisonLLMCount = 0;
  for (const row of comparisonRows) {
    const dimensionValues = row.dimensionValues || [];
    let source = '';
    let medium = '';
    let referrer = '';

    if (dimensionValues.length >= 3) {
      source = dimensionValues[0]?.value || '';
      medium = dimensionValues[1]?.value || '';
      referrer = dimensionValues[2]?.value || '';
    } else if (dimensionValues.length === 2) {
      source = dimensionValues[0]?.value || '';
      referrer = dimensionValues[1]?.value || '';
    } else if (dimensionValues.length === 1) {
      referrer = dimensionValues[0]?.value || '';
    }
    
    // Use same LLM detection logic as platform-split
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    
    // Only process LLM platforms, skip others
    if (!detectedLLM) continue;
    
    comparisonLLMCount++;
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
    const current = comparisonMap.get(detectedLLM) || { sessions: 0 };
    current.sessions += sessions;
    comparisonMap.set(detectedLLM, current);
  }
  
  console.log('🔍 [transformToLLMPlatforms] Comparison map built:', {
    comparisonMapSize: comparisonMap.size,
    comparisonLLMRows: comparisonLLMCount,
    comparisonPlatforms: Array.from(comparisonMap.entries()).map(([name, data]) => ({
      name,
      sessions: data.sessions
    }))
  });
  
  const platformMap = new Map();
  let currentLLMCount = 0;
  
  for (const row of rows) {
    const dimensionValues = row.dimensionValues || [];
    let source = '';
    let medium = '';
    let referrer = '';

    if (dimensionValues.length >= 3) {
      source = dimensionValues[0]?.value || '';
      medium = dimensionValues[1]?.value || '';
      referrer = dimensionValues[2]?.value || '';
    } else if (dimensionValues.length === 2) {
      source = dimensionValues[0]?.value || '';
      referrer = dimensionValues[1]?.value || '';
    } else if (dimensionValues.length === 1) {
      referrer = dimensionValues[0]?.value || '';
    }
    const metrics = row.metricValues || [];
    
    // Use same LLM detection logic as platform-split
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    
    // Only process LLM platforms, skip others
    if (!detectedLLM) continue;
    
    currentLLMCount++;
    const platform = detectedLLM;
    
    const current = platformMap.get(platform) || {
      sessions: 0,
      engagementRate: 0, // Will store weighted sum: engagementRate * sessions
      conversions: 0,
      bounceRate: 0, // Will store weighted sum: bounceRate * sessions
      avgSessionDuration: 0, // Will store total duration in seconds
      pagesPerSession: 0, // Will store total page views
      newUsers: 0,
      totalUsers: 0,
      count: 0
    };
    
    // Parse metrics - GA4 returns engagementRate and bounceRate as decimals (0-1)
    // Metric order: [0] sessions, [1] engagementRate, [2] conversions (or keyEvents:...), [3] bounceRate, [4] avgSessionDuration, [5] pagesPerSession, [6] newUsers, [7] totalUsers
    const rowSessions = parseFloat(metrics[0]?.value || '0');
    const rowEngagementRate = parseFloat(metrics[1]?.value || '0'); // Decimal 0-1
    const rowConversions = parseFloat(metrics[conversionMetricIndex]?.value || '0'); // Use dynamic index
    const rowBounceRate = parseFloat(metrics[3]?.value || '0'); // Decimal 0-1
    const rowAvgSessionDuration = parseFloat(metrics[4]?.value || '0'); // Seconds
    const rowPagesPerSession = parseFloat(metrics[5]?.value || '0'); // Number
    const rowNewUsers = parseFloat(metrics[6]?.value || '0');
    const rowTotalUsers = parseFloat(metrics[7]?.value || '0');
    
    // Debug: Log conversion data for first few LLM rows
    if (currentLLMCount < 3 && rowSessions > 0) {
      const conversionMetricName = metricHeaders[conversionMetricIndex]?.name || `metrics[${conversionMetricIndex}]`;
      console.log('🔍 [transformToLLMPlatforms] LLM row conversion data:', {
        platform: detectedLLM,
        source,
        referrer: referrer?.substring(0, 50),
        sessions: rowSessions,
        conversions: rowConversions,
        conversionMetricName: conversionMetricName,
        conversionMetricIndex: conversionMetricIndex,
        conversionRate: rowSessions > 0 ? (rowConversions / rowSessions * 100).toFixed(2) + '%' : '0%',
        metricValues: metrics.map((m, i) => ({ 
          index: i, 
          value: m?.value, 
          name: metricHeaders[i]?.name || ['sessions', 'engagementRate', 'conversions', 'bounceRate', 'averageSessionDuration', 'screenPageViewsPerSession', 'newUsers', 'totalUsers'][i] 
        }))
      });
    }
    
    // Accumulate values for weighted averages
    current.sessions += rowSessions;
    current.engagementRate += rowEngagementRate * rowSessions; // Weighted sum
    current.conversions += rowConversions;
    current.bounceRate += rowBounceRate * rowSessions; // Weighted sum
    current.avgSessionDuration += rowAvgSessionDuration * rowSessions; // Total duration
    current.pagesPerSession += rowPagesPerSession * rowSessions; // Total page views
    current.newUsers += rowNewUsers;
    current.totalUsers += rowTotalUsers;
    current.count += 1;
    
    platformMap.set(platform, current);
  }
  
  // Calculate weighted averages and format platforms
  const platformDataArray = [];
  
  for (const [platform, data] of platformMap.entries()) {
    // Calculate weighted averages (divide by total sessions, not count) - rounded to 2 decimals
    const avgEngagementRate = data.sessions > 0 ? Math.round((data.engagementRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgBounceRate = data.sessions > 0 ? Math.round((data.bounceRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgSessionDuration = data.sessions > 0 ? Math.round((data.avgSessionDuration / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const avgPagesPerSession = data.sessions > 0 ? Math.round((data.pagesPerSession / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const returningUsers = data.totalUsers - data.newUsers;
    const conversionRate = data.sessions > 0 ? Math.round((data.conversions / data.sessions) * 10000) / 100 : 0; // Rounded to 2 decimals
    
    // Calculate change from comparison period
    const comparisonData = comparisonMap.get(platform);
    const previousSessions = comparisonData?.sessions || 0;
    const sessionChange = previousSessions > 0 
      ? ((data.sessions - previousSessions) / previousSessions) * 100 
      : 0;
    const absoluteChange = data.sessions - previousSessions;
    
    // Calculate share change (percentage point change in share of total LLM traffic)
    // Calculate current and previous totals first (we'll calculate these after the loop)
    // For now, we'll calculate share change in a second pass after we have totals
    
    // Debug logging for first few platforms
    if (platformDataArray.length < 3) {
      console.log('🔍 [transformToLLMPlatforms] Platform comparison:', {
        platform,
        currentSessions: data.sessions,
        previousSessions,
        absoluteChange,
        sessionChange,
        hasComparisonData: !!comparisonData,
        comparisonMapKeys: Array.from(comparisonMap.keys())
      });
    }
    
    platformDataArray.push({
      name: platform,
      sessions: data.sessions,
      engagementRate: Math.round((avgEngagementRate * 100) * 100) / 100, // Rounded to 2 decimals
      conversions: data.conversions,
      bounceRate: Math.round((avgBounceRate * 100) * 100) / 100, // Rounded to 2 decimals
      avgSessionDuration: avgSessionDuration, // Already rounded to 2 decimals
      pagesPerSession: avgPagesPerSession, // Already rounded to 2 decimals
      newUsers: data.newUsers,
      returningUsers: returningUsers,
      conversionRate: conversionRate, // Already rounded to 2 decimals
      // Comparison data - store both for share change calculation
      change: Math.round(sessionChange * 100) / 100, // Session percentage change (rounded to 2 decimals)
      absoluteChange: absoluteChange,
      previousSessions: previousSessions, // Store for share change calculation
      trend: sessionChange > 0 ? 'up' : sessionChange < 0 ? 'down' : 'neutral'
    });
  }
  
  // Sort by sessions
  platformDataArray.sort((a, b) => b.sessions - a.sessions);
  
  // Calculate totals and percentages
  const totalLLMSessions = platformDataArray.reduce((sum, p) => sum + p.sessions, 0);
  const totalComparisonLLMSessions = Array.from(comparisonMap.values()).reduce((sum, p) => sum + p.sessions, 0);
  
  console.log('🔍 [transformToLLMPlatforms] Totals calculated:', {
    currentLLMRows: currentLLMCount,
    totalLLMSessions,
    totalComparisonLLMSessions,
    comparisonMapSize: comparisonMap.size,
    platformsCount: platformDataArray.length
  });
  
  // Now calculate share changes and percentages for each platform
  platformDataArray.forEach((platform, index) => {
    // Calculate current and previous shares of total LLM traffic
    const currentShare = totalLLMSessions > 0 ? (platform.sessions / totalLLMSessions * 100) : 0;
    const previousShare = totalComparisonLLMSessions > 0 && platform.previousSessions
      ? (platform.previousSessions / totalComparisonLLMSessions * 100)
      : 0;
    const shareChange = currentShare - previousShare; // Percentage point change
    
    // Debug logging for first few platforms
    if (index < 3) {
      console.log('🔍 [transformToLLMPlatforms] Share change calculation:', {
        platform: platform.name,
        currentSessions: platform.sessions,
        previousSessions: platform.previousSessions,
        totalLLMSessions,
        totalComparisonLLMSessions,
        currentShare: currentShare.toFixed(2),
        previousShare: previousShare.toFixed(2),
        shareChange: shareChange.toFixed(2)
      });
    }
    
    // Update platform with share change and percentage
    platform.shareChange = Math.round(shareChange * 100) / 100; // Rounded to 2 decimals
    platform.percentage = Math.round(currentShare * 100) / 100; // Percentage share
    platform.trend = shareChange > 0 ? 'up' : shareChange < 0 ? 'down' : 'neutral'; // Update trend based on share change
    
    // Clean up temporary field
    delete platform.previousSessions;
  });
  const totalLLMConversions = platformDataArray.reduce((sum, p) => sum + p.conversions, 0);
  // Calculate weighted average engagement rate (weighted by sessions) - rounded to 2 decimals
  const totalEngagementRateWeighted = platformDataArray.reduce((sum, p) => sum + (p.engagementRate * p.sessions / 100), 0); // engagementRate is percentage, divide by 100 to get decimal
  const avgEngagementRate = totalLLMSessions > 0 ? Math.round(((totalEngagementRateWeighted / totalLLMSessions) * 100) * 100) / 100 : 0; // Rounded to 2 decimals
  
  // Log conversion summary for debugging
  console.log('🔍 [transformToLLMPlatforms] Conversion summary:', {
    totalLLMSessions,
    totalLLMConversions,
    overallConversionRate: totalLLMSessions > 0 ? (totalLLMConversions / totalLLMSessions * 100).toFixed(2) + '%' : '0%',
    platformsWithConversions: platformDataArray.filter(p => p.conversions > 0).map(p => ({
      name: p.name,
      sessions: p.sessions,
      conversions: p.conversions,
      conversionRate: (p.conversions / p.sessions * 100).toFixed(2) + '%'
    })),
    allPlatforms: platformDataArray.map(p => ({
      name: p.name,
      sessions: p.sessions,
      conversions: p.conversions,
      conversionRate: p.sessions > 0 ? (p.conversions / p.sessions * 100).toFixed(2) + '%' : '0%'
    }))
  });
  
  // Percentages and share changes already calculated above, use platformDataArray directly
  const platformsWithPercentage = platformDataArray;
  
  // Debug: Log LLM platforms total with detailed detection stats
  let llmRowsDetected = 0;
  let llmRowsByPattern = {};
  for (const row of rows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || '';
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (detectedLLM) {
      llmRowsDetected++;
      llmRowsByPattern[detectedLLM] = (llmRowsByPattern[detectedLLM] || 0) + 1;
    }
  }
  
  console.log('🔍 LLM Platforms Total (Updated Detection):', {
    totalRows: rows.length,
    llmRowsDetected: llmRowsDetected,
    llmRowsByPattern: llmRowsByPattern,
    totalLLMSessions,
    platformBreakdown: platformsWithPercentage.map(p => ({ name: p.name, sessions: p.sessions })),
    validation: platformsWithPercentage.reduce((sum, p) => sum + p.sessions, 0) === totalLLMSessions
  });
  
  return {
    platforms: platformsWithPercentage,
    performanceData: platformsWithPercentage,
    summary: {
      totalLLMSessions,
      totalLLMConversions,
      avgEngagementRate
    }
  };
}

/**
 * Transform basic metrics data
 */
function transformMetricsData(rawData) {
  const row = rawData.rows?.[0]?.metricValues;
  if (!row) {
    return {
      totalSessions: '0',
      totalUsers: '0',
      totalPageViews: '0',
      avgSessionDuration: '0'
    };
  }

  return {
    totalSessions: row[0]?.value || '0',
    totalUsers: row[1]?.value || '0',
    totalPageViews: row[2]?.value || '0',
    avgSessionDuration: row[3]?.value || '0'
  };
}

/**
 * Transform platform data (legacy, kept for compatibility)
 */
function transformPlatformData(rawData) {
  // Use the new transformation functions
  if (rawData.dimensionValues && rawData.dimensionValues.length > 1) {
    // Looks like platform split data
    return transformToPlatformSplit(rawData);
  } else {
    // Looks like LLM platforms data
    return transformToLLMPlatforms(rawData);
  }
}

/**
 * Transform geographic data (matching traffic-analytics format)
 * If filterLLMs is true, only includes rows that match LLM platform patterns
 * This matches the logic used in transformToLLMPlatforms for consistency
 */
function transformGeoData(rawData, filterLLMs = false) {
  const rows = rawData.rows || [];
  
  console.log('🌍 [transformGeoData] Processing geo data:', {
    totalRows: rows.length,
    filterLLMs,
    sampleRows: rows.slice(0, 3).map(r => ({
      country: r.dimensionValues?.[0]?.value,
      source: r.dimensionValues?.[1]?.value || '(not in response)',
      medium: r.dimensionValues?.[2]?.value || '(not in response)',
      referrer: r.dimensionValues?.[3]?.value?.substring(0, 50) || '(not in response)',
      sessions: r.metricValues?.[0]?.value
    }))
  });

  let totalSessions = 0;
  let totalConversions = 0;
  let llmRowsCount = 0;
  let skippedRowsCount = 0;

  // Filter LLM traffic if flag is set (same logic as transformToLLMPlatforms)
  const filteredRows = filterLLMs 
    ? rows.filter(row => {
        const source = row.dimensionValues?.[1]?.value || '';
        const medium = row.dimensionValues?.[2]?.value || '';
        const referrer = row.dimensionValues?.[3]?.value || '';
        
        // Use same LLM detection logic as transformToLLMPlatforms
        let detectedLLM = null;
        if (referrer) {
          for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
            if (pattern.test(referrer)) {
              detectedLLM = platform;
              break;
            }
          }
        }
        if (!detectedLLM && source) {
          for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
            if (pattern.test(source)) {
              detectedLLM = platform;
              break;
            }
          }
        }
        
        const isLLM = detectedLLM !== null;
        if (isLLM) {
          llmRowsCount++;
        } else {
          skippedRowsCount++;
        }
        return isLLM;
      })
    : rows;

  if (filterLLMs) {
    console.log('🌍 [transformGeoData] LLM filtering applied:', {
      totalRows: rows.length,
      llmRowsFiltered: llmRowsCount,
      skippedRows: skippedRowsCount,
      remainingRows: filteredRows.length
    });
  }

  // Calculate totals from filtered rows (before aggregation) - ensures accuracy
  let rowCountForTotal = 0;
  filteredRows.forEach(row => {
    const metrics = row.metricValues || [];
    const sessions = parseFloat(metrics[0]?.value || '0');
    const conversions = parseFloat(metrics[1]?.value || '0');
    totalSessions += sessions;
    totalConversions += conversions;
    if (sessions > 0) rowCountForTotal++;
  });
  
  console.log('🌍 [transformGeoData] Total calculation from filtered rows:', {
    filteredRowCount: filteredRows.length,
    rowsWithSessions: rowCountForTotal,
    totalSessions,
    totalConversions
  });
  
  // Store initial totals for final calculation
  const initialTotalSessions = totalSessions;
  const initialTotalConversions = totalConversions;

  // Aggregate by country
  const countryMap = new Map();

  filteredRows.forEach(row => {
    const country = row.dimensionValues?.[0]?.value || 'Unknown';
    const metrics = row.metricValues || [];
    
    const sessions = parseFloat(metrics[0]?.value || '0');
    const conversions = parseFloat(metrics[1]?.value || '0');
    const bounceRate = parseFloat(metrics[2]?.value || '0'); // Decimal 0-1
    const avgSessionDuration = parseFloat(metrics[3]?.value || '0'); // Seconds
    const engagementRate = parseFloat(metrics[4]?.value || '0'); // Decimal 0-1
    const newUsers = parseFloat(metrics[5]?.value || '0');
    const totalUsers = parseFloat(metrics[6]?.value || '0');
    
    const current = countryMap.get(country) || {
      sessions: 0,
      conversions: 0,
      totalBounceRate: 0, // Weighted sum
      totalAvgSessionDuration: 0, // Weighted sum
      totalEngagementRate: 0, // Weighted sum
      totalNewUsers: 0,
      totalUsers: 0,
      sessionWeight: 0 // For weighted averages
    };
    
    // Aggregate with weighted averages for rate metrics
    countryMap.set(country, {
      sessions: current.sessions + sessions,
      conversions: current.conversions + conversions,
      totalBounceRate: current.totalBounceRate + (bounceRate * sessions), // Weight by sessions
      totalAvgSessionDuration: current.totalAvgSessionDuration + (avgSessionDuration * sessions), // Weight by sessions
      totalEngagementRate: current.totalEngagementRate + (engagementRate * sessions), // Weight by sessions
      totalNewUsers: current.totalNewUsers + newUsers,
      totalUsers: current.totalUsers + totalUsers,
      sessionWeight: current.sessionWeight + sessions
    });
  });

  // Use the totals calculated from filtered rows directly (more accurate)
  // totalSessions and totalConversions already have the correct values from the calculation above
  
  // Convert map to array and calculate weighted averages
  const countries = Array.from(countryMap.entries()).map(([country, data]) => {
    const avgBounceRate = data.sessionWeight > 0 ? (data.totalBounceRate / data.sessionWeight) * 100 : 0;
    const avgSessionDuration = data.sessionWeight > 0 ? data.totalAvgSessionDuration / data.sessionWeight : 0;
    const avgEngagementRate = data.sessionWeight > 0 ? (data.totalEngagementRate / data.sessionWeight) * 100 : 0;
    
    return {
      country,
      sessions: Math.round(data.sessions),
      percentage: 0, // Will be calculated after
      conversions: Math.round(data.conversions),
      conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0,
      bounceRate: Math.round(avgBounceRate * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration),
      engagementRate: Math.round(avgEngagementRate * 10) / 10,
      newUsers: Math.round(data.totalNewUsers),
      totalUsers: Math.round(data.totalUsers)
    };
  });

  // Sort by sessions descending
  countries.sort((a, b) => b.sessions - a.sessions);

  // Calculate percentages using initial totals (most accurate)
  countries.forEach(country => {
    country.percentage = initialTotalSessions > 0 ? (country.sessions / initialTotalSessions) * 100 : 0;
  });

  console.log('🌍 [transformGeoData] Final data:', {
    totalCountries: countries.length,
    totalSessions: initialTotalSessions,
    totalConversions: initialTotalConversions,
    filterLLMs,
    topCountries: countries.slice(0, 3).map(c => ({ country: c.country, sessions: c.sessions }))
  });

  return {
    countries,
    totalSessions: Math.round(initialTotalSessions),
    totalConversions: Math.round(initialTotalConversions)
  };
}

/**
 * Transform device data (matching traffic-analytics format)
 * @param {Object} rawData - Raw GA4 API response
 * @param {boolean} filterLLMs - Whether to filter LLM traffic only (default: false)
 */
function transformDeviceData(rawData, filterLLMs = false) {
  const rows = rawData.rows || [];
  
  console.log('📱 [transformDeviceData] Processing device data:', {
    totalRows: rows.length,
    filterLLMs,
    sampleRows: rows.slice(0, 3).map(r => ({
      device: r.dimensionValues?.[0]?.value,
      os: r.dimensionValues?.[1]?.value,
      browser: r.dimensionValues?.[2]?.value,
      source: r.dimensionValues?.[3]?.value || '(not in response)',
      medium: r.dimensionValues?.[4]?.value || '(not in response)',
      referrer: r.dimensionValues?.[5]?.value?.substring(0, 50) || '(not in response)',
      sessions: r.metricValues?.[0]?.value
    }))
  });

  let totalSessions = 0;
  let totalConversions = 0;
  let llmRowsCount = 0;
  let skippedRowsCount = 0;

  // Filter LLM traffic if flag is set (same logic as transformGeoData and transformToLLMPlatforms)
  const filteredRows = filterLLMs 
    ? rows.filter(row => {
        const source = row.dimensionValues?.[3]?.value || '';
        const medium = row.dimensionValues?.[4]?.value || '';
        const referrer = row.dimensionValues?.[5]?.value || '';
        
        // Use same LLM detection logic as transformToLLMPlatforms
        let detectedLLM = null;
        if (referrer) {
          for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
            if (pattern.test(referrer)) {
              detectedLLM = platform;
              break;
            }
          }
        }
        if (!detectedLLM && source) {
          for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
            if (pattern.test(source)) {
              detectedLLM = platform;
              break;
            }
          }
        }
        
        const isLLM = detectedLLM !== null;
        if (isLLM) {
          llmRowsCount++;
        } else {
          skippedRowsCount++;
        }
        return isLLM;
      })
    : rows;

  if (filterLLMs) {
    console.log('📱 [transformDeviceData] LLM filtering applied:', {
      totalRows: rows.length,
      llmRowsFiltered: llmRowsCount,
      skippedRows: skippedRowsCount,
      remainingRows: filteredRows.length
    });
  }

  // Calculate totals from filtered rows (before aggregation) - matches geo approach
  let rowCountForTotal = 0;
  filteredRows.forEach(row => {
    const metrics = row.metricValues || [];
    const sessions = parseFloat(metrics[0]?.value || '0');
    const conversions = parseFloat(metrics[1]?.value || '0');
    totalSessions += sessions;
    totalConversions += conversions;
    if (sessions > 0) rowCountForTotal++;
  });
  
  console.log('📱 [transformDeviceData] Total calculation from filtered rows:', {
    filteredRowCount: filteredRows.length,
    rowsWithSessions: rowCountForTotal,
    totalSessions,
    totalConversions
  });
  
  // Store initial totals for final calculation
  const initialTotalSessions = totalSessions;
  const initialTotalConversions = totalConversions;

  const deviceMap = new Map();
  const osMap = new Map();
  const browserMap = new Map();

  for (const row of filteredRows) {
    const device = row.dimensionValues?.[0]?.value || 'Unknown';
    const os = row.dimensionValues?.[1]?.value || 'Unknown';
    const browser = row.dimensionValues?.[2]?.value || 'Unknown';
    const metrics = row.metricValues || [];
    
    const sessions = parseFloat(metrics[0]?.value || '0');
    const conversions = parseFloat(metrics[1]?.value || '0');
    const bounceRate = parseFloat(metrics[2]?.value || '0'); // Decimal 0-1
    const avgSessionDuration = parseFloat(metrics[3]?.value || '0'); // Seconds
    const engagementRate = parseFloat(metrics[4]?.value || '0'); // Decimal 0-1
    
    // Note: totalSessions already calculated from filteredRows above, don't increment here

    // Aggregate by device (using weighted averages for rate metrics)
    const deviceData = deviceMap.get(device) || {
      sessions: 0,
      conversions: 0,
      totalBounceRate: 0, // Weighted sum
      totalAvgSessionDuration: 0, // Weighted sum
      totalEngagementRate: 0, // Weighted sum
      sessionWeight: 0 // For weighted averages
    };
    deviceData.sessions += sessions;
    deviceData.conversions += conversions;
    deviceData.totalBounceRate += (bounceRate * sessions); // Weight by sessions
    deviceData.totalAvgSessionDuration += (avgSessionDuration * sessions); // Weight by sessions
    deviceData.totalEngagementRate += (engagementRate * sessions); // Weight by sessions
    deviceData.sessionWeight += sessions;
    deviceMap.set(device, deviceData);

    // Aggregate by OS
    osMap.set(os, (osMap.get(os) || 0) + sessions);

    // Aggregate by Browser
    browserMap.set(browser, (browserMap.get(browser) || 0) + sessions);
  }

  // Use the totals calculated from filtered rows directly (matches geo approach)
  // totalSessions already has the correct value from filteredRows calculation above
  
  // Transform device data with weighted averages
  const deviceBreakdown = Array.from(deviceMap.entries()).map(([device, data]) => {
    const avgBounceRate = data.sessionWeight > 0 ? (data.totalBounceRate / data.sessionWeight) * 100 : 0;
    const avgSessionDuration = data.sessionWeight > 0 ? data.totalAvgSessionDuration / data.sessionWeight : 0;
    const avgEngagementRate = data.sessionWeight > 0 ? (data.totalEngagementRate / data.sessionWeight) * 100 : 0;
    
    return {
      device,
      sessions: Math.round(data.sessions),
      percentage: initialTotalSessions > 0 ? (data.sessions / initialTotalSessions) * 100 : 0,
      conversions: Math.round(data.conversions),
      conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0,
      bounceRate: Math.round(avgBounceRate * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration),
      engagementRate: Math.round(avgEngagementRate * 10) / 10
    };
  }).sort((a, b) => b.sessions - a.sessions);

  // Transform OS data
  const osBreakdown = Array.from(osMap.entries()).map(([os, sessions]) => ({
    os,
    sessions: Math.round(sessions),
    percentage: initialTotalSessions > 0 ? (sessions / initialTotalSessions) * 100 : 0
  })).sort((a, b) => b.sessions - a.sessions);

  // Transform browser data
  const browserBreakdown = Array.from(browserMap.entries()).map(([browser, sessions]) => ({
    browser,
    sessions: Math.round(sessions),
    percentage: initialTotalSessions > 0 ? (sessions / initialTotalSessions) * 100 : 0
  })).sort((a, b) => b.sessions - a.sessions);

  // Validation: Ensure sessions sum correctly
  const sumDeviceSessions = deviceBreakdown.reduce((sum, d) => sum + d.sessions, 0);
  const sumOSSessions = osBreakdown.reduce((sum, o) => sum + o.sessions, 0);
  const sumBrowserSessions = browserBreakdown.reduce((sum, b) => sum + b.sessions, 0);
  const sumDevicePercentages = deviceBreakdown.reduce((sum, d) => sum + d.percentage, 0);
  const sumOSPercentages = osBreakdown.reduce((sum, o) => sum + o.percentage, 0);
  const sumBrowserPercentages = browserBreakdown.reduce((sum, b) => sum + b.percentage, 0);
  
  // Calculate expected totals from aggregated data (should match initialTotalSessions)
  const expectedTotalFromDevices = sumDeviceSessions;
  const expectedTotalFromOS = sumOSSessions;
  const expectedTotalFromBrowsers = sumBrowserSessions;
  
  // Validate and auto-correct if needed (allowing for small rounding differences)
  const sessionsDifference = Math.abs(initialTotalSessions - expectedTotalFromDevices);
  const percentageDifference = Math.abs(sumDevicePercentages - 100);
  
  // Recalculate percentages if there's a discrepancy (due to rounding)
  if (percentageDifference > 0.1 && initialTotalSessions > 0) {
    console.warn('⚠️ [transformDeviceData] Percentage sum mismatch detected:', {
      sumDevicePercentages: sumDevicePercentages.toFixed(2),
      difference: percentageDifference.toFixed(2),
      recalculating: true
    });
    
    deviceBreakdown.forEach(device => {
      device.percentage = (device.sessions / initialTotalSessions) * 100;
    });
    
    osBreakdown.forEach(os => {
      os.percentage = (os.sessions / initialTotalSessions) * 100;
    });
    
    browserBreakdown.forEach(browser => {
      browser.percentage = (browser.sessions / initialTotalSessions) * 100;
    });
  }
  
  // Validate conversion rates are calculated correctly
  deviceBreakdown.forEach(device => {
    const expectedConversionRate = device.sessions > 0 ? (device.conversions / device.sessions) * 100 : 0;
    const actualConversionRate = device.conversionRate;
    const conversionRateDiff = Math.abs(expectedConversionRate - actualConversionRate);
    
    if (conversionRateDiff > 0.01) {
      console.warn('⚠️ [transformDeviceData] Conversion rate mismatch for device:', {
        device: device.device,
        expected: expectedConversionRate.toFixed(2),
        actual: actualConversionRate.toFixed(2),
        difference: conversionRateDiff.toFixed(2),
        recalculating: true
      });
      device.conversionRate = Math.round(expectedConversionRate * 10) / 10;
    }
  });

  console.log('📱 [transformDeviceData] Final data with validation:', {
    deviceBreakdown: deviceBreakdown.slice(0, 3).map(d => ({ 
      device: d.device, 
      sessions: d.sessions,
      percentage: d.percentage.toFixed(2),
      conversionRate: d.conversionRate.toFixed(2),
      bounceRate: d.bounceRate.toFixed(2),
      engagementRate: d.engagementRate.toFixed(2)
    })),
    osBreakdown: osBreakdown.slice(0, 3).map(o => ({ os: o.os, sessions: o.sessions })),
    browserBreakdown: browserBreakdown.slice(0, 3).map(b => ({ browser: b.browser, sessions: b.sessions })),
    totalSessions: initialTotalSessions, // Use the accurate total from filteredRows
    initialTotalSessions,
    sumDeviceSessions,
    sumOSSessions,
    sumBrowserSessions,
    sessionsDifference,
    sumDevicePercentages: sumDevicePercentages.toFixed(2),
    sumOSPercentages: sumOSPercentages.toFixed(2),
    sumBrowserPercentages: sumBrowserPercentages.toFixed(2),
    validation: {
      sessionsMatch: sessionsDifference <= 1, // Allow 1 session difference for rounding
      devicePercentagesMatch: Math.abs(sumDevicePercentages - 100) <= 0.1,
      osPercentagesMatch: Math.abs(sumOSPercentages - 100) <= 0.1,
      browserPercentagesMatch: Math.abs(sumBrowserPercentages - 100) <= 0.1,
      totalSessionsFromInitial: initialTotalSessions,
      totalSessionsFromDevices: expectedTotalFromDevices,
      totalSessionsFromOS: expectedTotalFromOS,
      totalSessionsFromBrowsers: expectedTotalFromBrowsers
    },
    filterLLMs
  });

  // Use the validated total sessions (from initial calculation, which is most accurate)
  const validatedTotalSessions = Math.round(initialTotalSessions);

  return {
    deviceBreakdown,
    osBreakdown,
    browserBreakdown,
    totalSessions: validatedTotalSessions
  };
}

/**
 * Transform pages data
 */
/**
 * Transform GA4 pages data to frontend format (matching traffic-analytics implementation)
 * @param {Object} ga4Response - GA4 API response
 * @param {string} defaultUri - Property's default URI (e.g., "https://fibr.ai")
 */
function transformPagesData(ga4Response, defaultUri = null) {
  const rows = ga4Response.rows || [];
  
  console.log('📄 [transformPagesData] Processing pages data:', {
    totalRows: rows.length,
    defaultUri,
    sampleRows: rows.slice(0, 3).map(row => ({
      pagePath: row.dimensionValues?.[0]?.value,
      pageTitle: row.dimensionValues?.[1]?.value,
      sessions: row.metricValues?.[0]?.value,
      conversions: row.metricValues?.[2]?.value,
      allMetrics: row.metricValues?.map((m, i) => ({ index: i, value: m.value }))
    }))
  });

  // Group by page path to aggregate data
  const pageMap = new Map();
  
  // Track unique LLM sessions by (sessionSource, sessionMedium, pageReferrer) combination
  // This prevents double-counting sessions that visit multiple pages
  // Key: `${sessionSource}|${sessionMedium}|${pageReferrer}`, Value: { platform, sessions }
  const uniqueSessionCombinations = new Map();
  
  // Track unique LLM sessions by platform (for matching Platform Tab total)
  // Key: platform name, Value: total unique sessions for that platform
  const uniqueLLMSessionsByPlatform = new Map();
  
  for (const row of rows) {
    const pagePath = row.dimensionValues?.[0]?.value || '';
    const pageTitle = row.dimensionValues?.[1]?.value || '';
    const sessionSource = row.dimensionValues?.[2]?.value || '';
    const sessionMedium = row.dimensionValues?.[3]?.value || '';
    const pageReferrer = row.dimensionValues?.[4]?.value || ''; // Added pageReferrer dimension
    const metrics = row.metricValues || [];

    const sessions = parseFloat(metrics[0]?.value || '0');
    const engagementRate = parseFloat(metrics[1]?.value || '0');
    const conversions = parseFloat(metrics[2]?.value || '0'); // This is the conversion metric (dynamic based on selectedConversionEvent)
    const bounceRate = parseFloat(metrics[3]?.value || '0');
    const sessionDuration = parseFloat(metrics[4]?.value || '0');
    const pagesPerSession = parseFloat(metrics[5]?.value || '0');
    const newUsers = parseFloat(metrics[6]?.value || '0');
    const totalUsers = parseFloat(metrics[7]?.value || '0');

    // Debug: Log conversion values for first few rows
    if (rows.indexOf(row) < 3) {
      console.log('🔍 [transformPagesData] Row conversion data:', {
        pagePath,
        sessions,
        conversions,
        conversionMetricIndex: 2,
        conversionValue: metrics[2]?.value,
        sessionSource,
        sessionMedium,
        pageReferrer
      });
    }

    // Detect LLM platform from sessionSource + sessionMedium + pageReferrer (matching Platform Tab logic)
    const platform = detectPlatform(sessionSource, sessionMedium, pageReferrer);

    // Debug: Log platform detection for tracking
    if (rows.indexOf(row) < 5) {
      console.log('🔍 [transformPagesData] Platform detection:', {
        pagePath,
        sessionSource,
        sessionMedium,
        pageReferrer,
        detectedPlatform: platform,
        isLLM: isLLMPlatform(platform),
        sessions
      });
    }

    const current = pageMap.get(pagePath) || {
      title: pageTitle,
      url: defaultUri ? `${defaultUri}${pagePath}` : pagePath, // Construct full URL if defaultUri is available
      sessions: 0,
      totalEngagementRate: 0,
      totalConversions: 0,
      totalBounceRate: 0,
      totalSessionDuration: 0,
      totalPagesPerSession: 0,
      totalNewUsers: 0,
      totalUsers: 0,
      sessionCount: 0,
      sources: new Set(),
      platformSessions: new Map()
    };

    // Only count sessions that are actually LLM platforms (matching Platform Tab behavior)
    // This ensures consistency - Pages Tab should only show LLM sessions
    if (!isLLMPlatform(platform)) {
      // Skip non-LLM sessions - they passed the API filter but aren't detected as LLM
      if (rows.indexOf(row) < 5) {
        console.log('⏭️ [transformPagesData] Skipping non-LLM session:', {
          pagePath,
          platform,
          sessions,
          reason: 'Platform not in LLM_PLATFORMS list'
        });
      }
      continue; // Continue to next row without adding to pageMap
    }

    // Track sessions by unique (sessionSource, sessionMedium, pageReferrer) combination
    // This matches how Platform Tab aggregates - sum sessions per unique combination
    // Note: Since Pages Tab groups by pagePath, the same session combination can appear
    // in multiple rows for different pages. We sum all sessions for each combination,
    // matching how Platform Tab sums when grouping only by (source, medium, referrer).
    const sessionKey = `${sessionSource}|${sessionMedium}|${pageReferrer}`;
    const existing = uniqueSessionCombinations.get(sessionKey);
    
    if (!existing) {
      // First time seeing this session combination - store it
      uniqueSessionCombinations.set(sessionKey, { platform, sessions });
      const currentPlatformTotal = uniqueLLMSessionsByPlatform.get(platform) || 0;
      uniqueLLMSessionsByPlatform.set(platform, currentPlatformTotal + sessions);
    } else {
      // This combination exists in another page row - sum the sessions
      // This matches Platform Tab's aggregation: sum all sessions for each unique combination
      const totalSessions = existing.sessions + sessions;
      uniqueSessionCombinations.set(sessionKey, { platform, sessions: totalSessions });
      const currentPlatformTotal = uniqueLLMSessionsByPlatform.get(platform) || 0;
      uniqueLLMSessionsByPlatform.set(platform, currentPlatformTotal + sessions);
    }

    // Clone sources Set to avoid mutation issues
    const newSources = new Set(current.sources);
    const newPlatformSessions = new Map(current.platformSessions);
    
    // Add platform to sources and track platform sessions (only LLM platforms reach here)
      newSources.add(platform);
      const currentPlatformSessions = newPlatformSessions.get(platform) || 0;
      newPlatformSessions.set(platform, currentPlatformSessions + sessions);

    pageMap.set(pagePath, {
      title: pageTitle || current.title,
      url: defaultUri ? `${defaultUri}${pagePath}` : pagePath, // Construct full URL if defaultUri is available
      sessions: current.sessions + sessions, // Only LLM sessions are added
      totalEngagementRate: current.totalEngagementRate + (engagementRate * sessions),
      totalConversions: current.totalConversions + conversions,
      totalBounceRate: current.totalBounceRate + (bounceRate * sessions),
      totalSessionDuration: current.totalSessionDuration + (sessionDuration * sessions),
      totalPagesPerSession: current.totalPagesPerSession + (pagesPerSession * sessions),
      totalNewUsers: current.totalNewUsers + newUsers,
      totalUsers: current.totalUsers + totalUsers,
      sessionCount: current.sessionCount + sessions, // Only LLM sessions are counted
      sources: newSources,
      platformSessions: newPlatformSessions
    });
  }

    // Convert to array with computed metrics
    const pages = Array.from(pageMap.entries()).map(([url, data]) => {
      // Calculate weighted averages: divide weighted sums by total sessions
      // GA4 returns engagementRate and bounceRate as decimals (0-1), so multiply by 100 for percentage
      // sessionCount should equal sessions (both track LLM sessions only)
      const avgEngagementRate = data.sessions > 0 ? (data.totalEngagementRate / data.sessions) * 100 : 0;
      const avgBounceRate = data.sessions > 0 ? (data.totalBounceRate / data.sessions) * 100 : 0;
      const avgSessionDuration = data.sessions > 0 ? (data.totalSessionDuration / data.sessions) : 0;
      const avgPagesPerSession = data.sessions > 0 ? (data.totalPagesPerSession / data.sessions) : 0;

      // Compute Session Quality Score (SQS) - Matching Platform Tab formula
      // Engagement Rate (40%) + Conversion Rate (30%) + Pages per Session (20%) + Session Duration (10%)
      const conversionRate = data.sessions > 0 ? (data.totalConversions / data.sessions) * 100 : 0;

      // Pages component: Cap at 5 pages, then scale to contribute up to 20% (max 20 points)
      // If 5 pages = 20 points, then 1 page = 4 points
      const pagesComponent = Math.min(avgPagesPerSession, 5) * 4; // Max 20 points
      
      // Duration component: Convert seconds to minutes, cap at 5 minutes, scale to contribute up to 10% (max 10 points)
      // If 5 minutes = 10 points, then 1 minute = 2 points
      const durationMinutes = avgSessionDuration / 60;
      const durationComponent = Math.min(durationMinutes, 5) * 2; // Max 10 points
      
      // Engagement component: 40% weight (max 40 points)
      const engagementComponent = avgEngagementRate * 0.4;
      
      // Conversion component: 30% weight (max 30 points)
      const conversionComponent = conversionRate * 0.3;
      
      // Total SQS (capped at 100)
      const sqs = Math.min(100, Math.max(0, 
        engagementComponent +
        conversionComponent +
        pagesComponent +
        durationComponent
      ));

      // Determine content group
      const contentGroup = getContentGroup(url, data.title);
      
      // Determine page type
      const pageType = getPageType(url, data.title);
      
      // Determine LLM journey position
      const llmJourney = getLLMJourney(data.sessions, avgEngagementRate);
      
      // Get all providers and format for display
      const allProviders = Array.from(data.sources);
      const providerName = allProviders.length > 1
        ? allProviders.map(p => p === 'other-llm' ? 'Other LLM' : p.charAt(0).toUpperCase() + p.slice(1)).join(', ')
        : (allProviders[0]
            ? (allProviders[0] === 'other-llm' ? 'Other LLM' : allProviders[0].charAt(0).toUpperCase() + allProviders[0].slice(1))
            : 'Unknown');

      const platformSessionsObj = Object.fromEntries(data.platformSessions);
      
      // Validate that platformSessions sum equals page sessions
      const platformSessionsSum = Object.values(platformSessionsObj).reduce((sum, val) => sum + (val || 0), 0);
      if (Math.abs(platformSessionsSum - data.sessions) > 0.01) {
        console.warn('⚠️ [transformPagesData] Platform sessions mismatch for page:', {
          page: data.title,
          url: url,
          pageSessions: data.sessions,
          platformSessionsSum: platformSessionsSum,
          difference: Math.abs(platformSessionsSum - data.sessions),
          platformBreakdown: platformSessionsObj
        });
      }

      // Ensure URL is properly constructed
      let finalUrl = data.url;
      if (defaultUri && !finalUrl.startsWith('http')) {
        // If we have defaultUri but URL doesn't start with http, construct full URL
        // Handle both cases: path starting with / and path without /
        if (finalUrl.startsWith('/')) {
          finalUrl = `${defaultUri}${finalUrl}`;
        } else {
          finalUrl = `${defaultUri}/${finalUrl}`;
        }
        console.log('🔗 [transformPagesData] Constructed URL:', { original: data.url, final: finalUrl, defaultUri });
      } else if (!defaultUri) {
        console.warn('⚠️ [transformPagesData] No defaultUri available, URL will be path only:', finalUrl);
      }

      return {
        title: data.title || 'Untitled Page',
        url: finalUrl, // Use the properly constructed URL
        sessions: data.sessions,
        sqs: Math.round(sqs * 100) / 100,
        contentGroup,
        conversionRate: data.sessions > 0 ? Math.round((data.totalConversions / data.sessions) * 100 * 100) / 100 : 0,
        bounce: Math.round(avgBounceRate * 100) / 100, // Keep as percentage (0-100)
        pageType,
        timeOnPage: Math.round(avgSessionDuration),
        llmJourney,
        provider: providerName,
        platformSessions: platformSessionsObj,
        // Debug fields
        _totalConversions: data.totalConversions, // Keep for debugging
        _conversionRateRaw: data.sessions > 0 ? (data.totalConversions / data.sessions) * 100 : 0
      };
    }).sort((a, b) => b.sessions - a.sessions);

  // Debug: Log conversion rates summary
  const pagesWithConversions = pages.filter(p => p._totalConversions > 0);
  const totalPageSessions = pages.reduce((sum, page) => sum + page.sessions, 0);
  
  // Calculate total unique LLM sessions by platform (matching Platform Tab calculation)
  // This sums sessions per platform across all pages, matching how Platform Tab counts
  const totalUniqueLLMSessions = Array.from(uniqueLLMSessionsByPlatform.values()).reduce((sum, sessions) => sum + sessions, 0);
  
  // Calculate total sessions from platformSessions to verify consistency
  const totalPlatformSessions = pages.reduce((sum, page) => {
    const platformTotal = Object.values(page.platformSessions || {}).reduce((pSum, pSessions) => pSum + (pSessions || 0), 0);
    return sum + platformTotal;
  }, 0);
  
  // Verify that each page's platformSessions sum equals page.sessions
  const platformSessionMismatches = pages.filter(page => {
    const platformSum = Object.values(page.platformSessions || {}).reduce((sum, val) => sum + (val || 0), 0);
    return Math.abs(platformSum - page.sessions) > 0.01; // Allow small floating point differences
  });
  
  // Verify weighted averages are calculated correctly
  const totalWeightedEngagementRate = pages.reduce((sum, page) => {
    const pageEngagementRate = page.bounce ? (100 - page.bounce) : 0; // Bounce rate is inverse of engagement
    return sum + (pageEngagementRate * page.sessions);
  }, 0);
  
  const totalWeightedBounceRate = pages.reduce((sum, page) => sum + (page.bounce * page.sessions), 0);
  const totalWeightedConversionRate = pages.reduce((sum, page) => sum + (page.conversionRate * page.sessions), 0);
  const totalWeightedTimeOnPage = pages.reduce((sum, page) => sum + (page.timeOnPage * page.sessions), 0);
  
  // Calculate overall weighted averages (should match individual page calculations)
  const overallWeightedEngagementRate = totalPageSessions > 0 ? (totalWeightedEngagementRate / totalPageSessions) : 0;
  const overallWeightedBounceRate = totalPageSessions > 0 ? (totalWeightedBounceRate / totalPageSessions) : 0;
  const overallWeightedConversionRate = totalPageSessions > 0 ? (totalWeightedConversionRate / totalPageSessions) : 0;
  const overallWeightedTimeOnPage = totalPageSessions > 0 ? (totalWeightedTimeOnPage / totalPageSessions) : 0;
  
  console.log('🔍 [transformPagesData] Conversion summary:', {
    totalPages: pages.length,
    pagesWithConversions: pagesWithConversions.length,
    totalPageSessions: totalPageSessions, // Sum of page-level sessions (may double-count)
    totalUniqueLLMSessions: totalUniqueLLMSessions, // Unique LLM sessions by platform (matches Platform Tab)
    totalPlatformSessions: totalPlatformSessions, // Should match totalPageSessions
    platformSessionMismatches: platformSessionMismatches.length,
    platformSessionMismatchDetails: platformSessionMismatches.slice(0, 3).map(p => ({
      page: p.title.substring(0, 40),
      pageSessions: p.sessions,
      platformSum: Object.values(p.platformSessions || {}).reduce((sum, val) => sum + (val || 0), 0),
      difference: Math.abs(p.sessions - Object.values(p.platformSessions || {}).reduce((sum, val) => sum + (val || 0), 0))
    })),
    platformBreakdown: Array.from(uniqueLLMSessionsByPlatform.entries()).map(([platform, sessions]) => ({
      platform,
      sessions
    })),
    totalConversions: pages.reduce((sum, p) => sum + p._totalConversions, 0),
    defaultUri,
    weightedAverages: {
      engagementRate: overallWeightedEngagementRate.toFixed(2),
      bounceRate: overallWeightedBounceRate.toFixed(2),
      conversionRate: overallWeightedConversionRate.toFixed(2),
      timeOnPage: overallWeightedTimeOnPage.toFixed(2)
    },
    pageBreakdown: pages.slice(0, 5).map(p => ({
      page: p.title.substring(0, 40),
      sessions: p.sessions,
      platformSessions: Object.keys(p.platformSessions || {}).length,
      platformTotal: Object.values(p.platformSessions || {}).reduce((sum, val) => sum + (val || 0), 0),
      conversionRate: p.conversionRate.toFixed(2),
      bounceRate: p.bounce.toFixed(2),
      sqs: p.sqs.toFixed(2),
      timeOnPage: p.timeOnPage
    })),
    sampleUrls: pages.slice(0, 5).map(p => ({
      page: p.title,
      url: p.url,
      hasHttp: p.url.startsWith('http')
    })),
    sampleConversionRates: pages.slice(0, 5).map(p => ({
      page: p.title,
      sessions: p.sessions,
      conversions: p._totalConversions,
      conversionRate: p.conversionRate
    }))
  });

  // Calculate weighted average SQS (matching Platform Tab calculation)
  // Use totalUniqueLLMSessions for consistency with Platform Tab
  const totalSessionsForAvg = totalUniqueLLMSessions; // Use unique sessions for weighted average
  const weightedSQS = pages.reduce((sum, page) => sum + (page.sqs * page.sessions), 0);
  const avgSQS = totalSessionsForAvg > 0 ? (weightedSQS / totalSessionsForAvg) : 0;

  return {
    pages,
    summary: {
      totalSessions: totalUniqueLLMSessions, // Return unique LLM sessions to match Platform Tab
      totalPages: pages.length,
      avgSQS
    }
  };
}

/**
 * Helper function to determine content group based on URL and title
 */
function getContentGroup(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (urlLower.includes('/pricing') || titleLower.includes('pricing')) {
    return 'Pricing';
  }
  if (urlLower.includes('/tools/') || titleLower.includes('tool') || titleLower.includes('generator')) {
    return 'Free Tools';
  }
  if (urlLower.includes('/ab-testing') || titleLower.includes('a/b testing') || titleLower.includes('ab testing')) {
    return 'A/B Testing';
  }
  if (urlLower.includes('/conversion-rate-optimization') || urlLower.includes('/cro') || 
      titleLower.includes('conversion rate') || titleLower.includes('cro')) {
    return 'CRO Education';
  }
  if (urlLower.includes('/landing-page') || titleLower.includes('landing page')) {
    return 'Landing Pages';
  }
  if (urlLower.includes('/geo') || titleLower.includes('generative engine') || titleLower.includes('llm seo')) {
    return 'GEO/LLM SEO';
  }
  if (urlLower.includes('/docs') || urlLower.includes('/help') || urlLower.includes('/guide') ||
      titleLower.includes('documentation') || titleLower.includes('guide')) {
    return 'Docs';
  }
  if (urlLower.includes('/product') || urlLower.includes('/pilot') || 
      titleLower.includes('product') || titleLower.includes('pilot')) {
    return 'Product';
  }
  if (urlLower.includes('/case-stud') || urlLower.includes('/whitepaper') || 
      urlLower.includes('/resource') || titleLower.includes('case study') || 
      titleLower.includes('whitepaper')) {
    return 'Resources';
  }
  if (urlLower.includes('/blog') || urlLower.includes('/article') || 
      titleLower.includes('blog') || titleLower.includes('article')) {
    return 'Blog';
  }
  if (urlLower === '/' || urlLower.includes('/home')) {
    return 'Homepage';
  }
  
  return 'Other';
}

/**
 * Helper function to determine page type
 */
function getPageType(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (urlLower === '/' || urlLower.includes('/home')) {
    return 'Home';
  }
  if (urlLower.includes('/landing/') || titleLower.includes('landing')) {
    return 'Landing';
  }
  if (urlLower.includes('/blog/') || titleLower.includes('blog')) {
    return 'Content';
  }
  if (urlLower.includes('/product/') || titleLower.includes('product')) {
    return 'Product';
  }
  if (urlLower.includes('/support/') || titleLower.includes('support')) {
    return 'Support';
  }
  
  return 'Content';
}

/**
 * Helper function to determine LLM journey position
 */
function getLLMJourney(sessions, engagementRate) {
  if (sessions > 50 && engagementRate > 60) {
    return 'Entry';
  }
  if (sessions < 10 && engagementRate < 30) {
    return 'Exit';
  }
  return 'Middle';
}

/**
 * Transform trend data for charts
 */
function transformTrendData(rawData) {
  const rows = rawData.rows || [];
  
  // Group by date and platform
  const dateMap = new Map();
  
  for (const row of rows) {
    const date = row.dimensionValues?.[0]?.value || '';
    const source = row.dimensionValues?.[1]?.value || '';
    const medium = row.dimensionValues?.[2]?.value || '';
    const sessions = parseInt(row.metricValues?.[0]?.value || '0');
    
    // Detect platform
    const platform = detectPlatform(source, medium);
    
    if (!dateMap.has(date)) {
      dateMap.set(date, new Map());
    }
    
    const platformMap = dateMap.get(date);
    const current = platformMap.get(platform) || 0;
    platformMap.set(platform, current + sessions);
  }
  
  // Define all expected platforms
  const allPlatforms = ['organic', 'direct', 'referral', 'LLMs', 'other', 'social', 'email', 'paid'];
  
  // Convert to array format with LLM aggregation
  const result = Array.from(dateMap.entries())
    .map(([date, platformMap]) => {
      const dataPoint = { date: formatDate(date) };
      
      // Aggregate LLM platforms
      const llmPlatforms = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity'];
      let llmSessions = 0;
      
      llmPlatforms.forEach(llmPlatform => {
        const sessions = platformMap.get(llmPlatform) || 0;
        llmSessions += sessions;
        platformMap.delete(llmPlatform);
      });
      
      // Add aggregated LLMs
      dataPoint['LLMs'] = llmSessions;
      
      // Add all platforms
      allPlatforms.forEach(platform => {
        if (platform === 'LLMs') return;
        dataPoint[platform] = platformMap.get(platform) || 0;
      });
      
      return dataPoint;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

/**
 * Format date for chart display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  // GA4 returns dates in YYYYMMDD format
  if (dateString.length === 8) {
    return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
  }
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Generate LLM filter regex string for GA4 API
 * Used consistently across all endpoints for filtering LLM traffic
 * @returns {string} Regex pattern for LLM detection
 */
function getLLMFilterRegex() {
  // This regex pattern matches the LLM platforms we want to track
  // It's designed to catch all variations of LLM platform names
  // Note: The regex uses simple strings that will match patterns like:
  // - chatgpt.com, chat.openai, openai.com
  // - claude.ai, anthropic.com
  // - gemini.google.com, bard.google.com
  // - perplexity.ai
  // - copilot.microsoft.com
  // - x.ai (for Grok)
  // - poe.com
  // - character.ai
  return '(chatgpt|claude|gemini|perplexity|copilot|bard|openai|anthropic|xai|grok|poe|character\\.ai)';
}

module.exports = {
  transformMetricsData,
  transformPlatformData,
  transformToPlatformSplit,
  transformToLLMPlatforms,
  transformTrendData,
  transformGeoData,
  transformDeviceData,
  transformPagesData,
  calculateComparisonDates,
  getLLMFilterRegex,
  LLM_PATTERNS,
  LLM_PLATFORMS
};
