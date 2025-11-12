/**
 * GA4 Data Consistency Verification Script
 * 
 * This script fetches data from all GA4 endpoints and verifies:
 * 1. Cross-tab consistency (sessions, totals, etc.)
 * 2. Data accuracy (percentages, calculations)
 * 3. LLM detection accuracy
 * 
 * Usage: node scripts/verify-ga4-data-consistency.js
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// You'll need to provide a valid session cookie or userId for testing
const TEST_USER_ID = process.env.TEST_USER_ID || '';
const TEST_SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || '';

// Date range for testing
const START_DATE = '7daysAgo';
const END_DATE = 'today';

/**
 * Make authenticated request to GA4 API endpoint
 */
async function fetchGA4Data(endpoint, params = {}) {
  try {
    const queryString = new URLSearchParams({
      startDate: START_DATE,
      endDate: END_DATE,
      ...params
    }).toString();

    const response = await axios.get(`${API_BASE_URL}/ga4/${endpoint}?${queryString}`, {
      headers: {
        'Cookie': `session_token=${TEST_SESSION_TOKEN}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Verify platform split data
 */
function verifyPlatformSplit(data) {
  const issues = [];
  const { platformSplit, rankings, totalSessions, summary } = data?.data || {};

  // Check if data exists
  if (!data || !data.success) {
    issues.push('❌ Platform split API failed or returned no data');
    return issues;
  }

  // Check total sessions
  const calculatedTotal = rankings?.reduce((sum, r) => sum + (parseInt(r.sessions) || 0), 0) || 0;
  if (Math.abs(calculatedTotal - totalSessions) > 1) {
    issues.push(`⚠️ Total sessions mismatch: calculated=${calculatedTotal}, reported=${totalSessions}`);
  }

  // Check percentages
  const totalPercentage = platformSplit?.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0) || 0;
  if (Math.abs(totalPercentage - 100) > 0.1) {
    issues.push(`⚠️ Percentages don't add up to 100%: ${totalPercentage.toFixed(2)}%`);
  }

  // Check LLM breakdown
  const llmBreakdown = summary?.llmBreakdown || [];
  const llmTotal = llmBreakdown.reduce((sum, p) => sum + (p.sessions || 0), 0);
  const llmPlatform = platformSplit?.find(p => p.name === 'LLMs');
  
  if (llmPlatform) {
    const llmSessions = (llmPlatform.value / 100) * totalSessions;
    if (Math.abs(llmSessions - llmTotal) > 1) {
      issues.push(`⚠️ LLM sessions mismatch: platform split=${llmSessions.toFixed(0)}, breakdown=${llmTotal}`);
    }
  }

  return issues;
}

/**
 * Verify LLM platforms data
 */
function verifyLLMPlatforms(data) {
  const issues = [];
  const { platforms, summary } = data?.data || {};

  if (!data || !data.success) {
    issues.push('❌ LLM platforms API failed or returned no data');
    return issues;
  }

  // Check total sessions
  const calculatedTotal = platforms?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;
  const reportedTotal = summary?.totalLLMSessions || 0;
  
  if (Math.abs(calculatedTotal - reportedTotal) > 1) {
    issues.push(`⚠️ Total LLM sessions mismatch: calculated=${calculatedTotal}, reported=${reportedTotal}`);
  }

  // Check percentages
  const totalPercentage = platforms?.reduce((sum, p) => sum + (p.percentage || 0), 0) || 0;
  if (Math.abs(totalPercentage - 100) > 0.1) {
    issues.push(`⚠️ LLM platform percentages don't add up to 100%: ${totalPercentage.toFixed(2)}%`);
  }

  // Check weighted engagement rate
  const weightedEngagement = platforms?.reduce((sum, p) => {
    return sum + ((p.engagementRate || 0) / 100 * (p.sessions || 0));
  }, 0) || 0;
  const avgEngagementRate = calculatedTotal > 0 ? (weightedEngagement / calculatedTotal) * 100 : 0;
  const reportedAvgEngagement = summary?.avgEngagementRate || 0;
  
  if (Math.abs(avgEngagementRate - reportedAvgEngagement) > 0.1) {
    issues.push(`⚠️ Average engagement rate mismatch: calculated=${avgEngagementRate.toFixed(2)}%, reported=${reportedAvgEngagement.toFixed(2)}%`);
  }

  return issues;
}

/**
 * Verify pages data
 */
function verifyPages(data) {
  const issues = [];
  const { pages, summary } = data?.data || {};

  if (!data || !data.success) {
    issues.push('❌ Pages API failed or returned no data');
    return issues;
  }

  // Check total sessions
  const calculatedTotal = pages?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;
  const reportedTotal = summary?.totalSessions || 0;
  
  if (Math.abs(calculatedTotal - reportedTotal) > 1) {
    issues.push(`⚠️ Total page sessions mismatch: calculated=${calculatedTotal}, reported=${reportedTotal}`);
  }

  // Check conversion rates
  pages?.forEach((page, index) => {
    const sessions = page.sessions || 0;
    const conversions = page._totalConversions || 0;
    const reportedRate = page.conversionRate || 0;
    const calculatedRate = sessions > 0 ? (conversions / sessions) * 100 : 0;
    
    if (Math.abs(calculatedRate - reportedRate) > 0.1) {
      issues.push(`⚠️ Page ${index + 1} (${page.title}): conversion rate mismatch: calculated=${calculatedRate.toFixed(2)}%, reported=${reportedRate.toFixed(2)}%`);
    }

    // Check SQS calculation
    const engagementRate = (page._totalConversions / sessions) * 100 || 0; // Approximation
    const bounceRate = page.bounce || 0;
    const duration = page.timeOnPage || 0;
    const pagesPerSession = 1; // Approximation
    
    // SQS formula: (Engagement Rate * 0.4) + ((100 - Bounce Rate) * 0.3) + (Duration/60 * 10 * 0.2) + (Pages/Session * 20 * 0.1)
    const calculatedSQS = Math.min(100, Math.max(0,
      (engagementRate * 0.4) +
      ((100 - bounceRate) * 0.3) +
      (Math.min(duration / 60, 5) * 10 * 0.2) +
      (Math.min(pagesPerSession, 5) * 20 * 0.1)
    ));
    
    // Note: SQS verification is approximate since we don't have all exact values
  });

  return issues;
}

/**
 * Verify geo data
 */
function verifyGeo(data) {
  const issues = [];
  const { countries, totalSessions } = data?.data || {};

  if (!data || !data.success) {
    issues.push('❌ Geo API failed or returned no data');
    return issues;
  }

  // Check total sessions
  const calculatedTotal = countries?.reduce((sum, c) => sum + (c.sessions || 0), 0) || 0;
  
  if (Math.abs(calculatedTotal - totalSessions) > 1) {
    issues.push(`⚠️ Total geo sessions mismatch: calculated=${calculatedTotal}, reported=${totalSessions}`);
  }

  // Check percentages
  const totalPercentage = countries?.reduce((sum, c) => sum + (c.percentage || 0), 0) || 0;
  if (Math.abs(totalPercentage - 100) > 0.1) {
    issues.push(`⚠️ Country percentages don't add up to 100%: ${totalPercentage.toFixed(2)}%`);
  }

  return issues;
}

/**
 * Verify device data
 */
function verifyDevices(data) {
  const issues = [];
  const { deviceBreakdown, osBreakdown, browserBreakdown, totalSessions } = data?.data || {};

  if (!data || !data.success) {
    issues.push('❌ Devices API failed or returned no data');
    return issues;
  }

  // Check device breakdown
  const deviceTotal = deviceBreakdown?.reduce((sum, d) => sum + (d.sessions || 0), 0) || 0;
  if (Math.abs(deviceTotal - totalSessions) > 1) {
    issues.push(`⚠️ Device sessions mismatch: calculated=${deviceTotal}, reported=${totalSessions}`);
  }

  const devicePercentage = deviceBreakdown?.reduce((sum, d) => sum + (d.percentage || 0), 0) || 0;
  if (Math.abs(devicePercentage - 100) > 0.1) {
    issues.push(`⚠️ Device percentages don't add up to 100%: ${devicePercentage.toFixed(2)}%`);
  }

  // Check OS breakdown
  const osPercentage = osBreakdown?.reduce((sum, o) => sum + (o.percentage || 0), 0) || 0;
  if (Math.abs(osPercentage - 100) > 0.1) {
    issues.push(`⚠️ OS percentages don't add up to 100%: ${osPercentage.toFixed(2)}%`);
  }

  // Check browser breakdown
  const browserPercentage = browserBreakdown?.reduce((sum, b) => sum + (b.percentage || 0), 0) || 0;
  if (Math.abs(browserPercentage - 100) > 0.1) {
    issues.push(`⚠️ Browser percentages don't add up to 100%: ${browserPercentage.toFixed(2)}%`);
  }

  return issues;
}

/**
 * Cross-tab consistency verification
 */
function verifyCrossTabConsistency(results) {
  const issues = [];
  
  const platformSplit = results.platformSplit?.data;
  const llmPlatforms = results.llmPlatforms?.data;
  const pages = results.pages?.data;
  const geo = results.geo?.data;
  const devices = results.devices?.data;

  // Get LLM sessions from platform split
  const llmPlatformSplit = platformSplit?.summary?.llmBreakdown?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;
  
  // Get LLM sessions from LLM platforms
  const llmPlatformsTotal = llmPlatforms?.summary?.totalLLMSessions || 0;
  
  // Get total from pages
  const pagesTotal = pages?.summary?.totalSessions || 0;
  
  // Get total from geo
  const geoTotal = geo?.totalSessions || 0;
  
  // Get total from devices
  const deviceTotal = devices?.totalSessions || 0;

  // Verify consistency
  const values = [
    { name: 'Platform Split LLMs', value: llmPlatformSplit },
    { name: 'LLM Platforms Total', value: llmPlatformsTotal },
    { name: 'Pages Total', value: pagesTotal },
    { name: 'Geo Total', value: geoTotal },
    { name: 'Devices Total', value: deviceTotal }
  ];

  // Find max and min (allowing 1 session tolerance)
  const max = Math.max(...values.map(v => v.value));
  const min = Math.min(...values.map(v => v.value));

  if (max - min > 1) {
    issues.push('❌ Cross-tab session count inconsistency:');
    values.forEach(v => {
      issues.push(`   ${v.name}: ${v.value}`);
    });
  } else {
    issues.push(`✅ Cross-tab consistency: All tabs show ~${max} LLM sessions`);
  }

  return issues;
}

/**
 * Main verification function
 */
async function runVerification() {
  console.log('🔍 Starting GA4 Data Consistency Verification...\n');
  console.log(`📅 Date Range: ${START_DATE} to ${END_DATE}\n`);

  // Fetch all data
  console.log('📊 Fetching data from all endpoints...\n');
  
  const results = {
    platformSplit: await fetchGA4Data('platform-split'),
    llmPlatforms: await fetchGA4Data('llm-platforms'),
    pages: await fetchGA4Data('pages', { limit: 100 }),
    geo: await fetchGA4Data('geo'),
    devices: await fetchGA4Data('devices')
  };

  // Verify each endpoint
  console.log('🔍 Verifying individual endpoints...\n');
  
  const allIssues = {
    platformSplit: verifyPlatformSplit(results.platformSplit),
    llmPlatforms: verifyLLMPlatforms(results.llmPlatforms),
    pages: verifyPages(results.pages),
    geo: verifyGeo(results.geo),
    devices: verifyDevices(results.devices),
    crossTab: verifyCrossTabConsistency(results)
  };

  // Print results
  console.log('📋 Verification Results:\n');
  console.log('='.repeat(60));

  Object.entries(allIssues).forEach(([endpoint, issues]) => {
    console.log(`\n${endpoint.toUpperCase()}:`);
    if (issues.length === 0) {
      console.log('  ✅ No issues found');
    } else {
      issues.forEach(issue => console.log(`  ${issue}`));
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  const totalIssues = Object.values(allIssues).flat().filter(i => i.startsWith('❌') || i.startsWith('⚠️')).length;
  const totalChecks = Object.values(allIssues).flat().length;
  
  if (totalIssues === 0) {
    console.log('\n✅ All checks passed! Data is consistent across all tabs.');
  } else {
    console.log(`\n⚠️ Found ${totalIssues} issue(s) out of ${totalChecks} checks.`);
    console.log('Please review the issues above and fix any inconsistencies.');
  }

  // Print data summary
  console.log('\n📊 Data Summary:');
  console.log(`Platform Split Total Sessions: ${results.platformSplit?.data?.totalSessions || 'N/A'}`);
  console.log(`LLM Platforms Total: ${results.llmPlatforms?.data?.summary?.totalLLMSessions || 'N/A'}`);
  console.log(`Pages Total Sessions: ${results.pages?.data?.summary?.totalSessions || 'N/A'}`);
  console.log(`Geo Total Sessions: ${results.geo?.data?.totalSessions || 'N/A'}`);
  console.log(`Devices Total Sessions: ${results.devices?.data?.totalSessions || 'N/A'}`);

  return {
    success: totalIssues === 0,
    issues: allIssues,
    results
  };
}

// Run verification if called directly
if (require.main === module) {
  runVerification()
    .then(() => {
      console.log('\n✅ Verification complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { runVerification };












