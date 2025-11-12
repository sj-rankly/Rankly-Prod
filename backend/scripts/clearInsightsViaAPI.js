#!/usr/bin/env node

/**
 * Script to clear all insights via API
 * Runs from backend directory where dependencies are available
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'rankly_dev_jwt_secret_key_2024';
const DEV_USER_ID = process.env.DEV_USER_ID || '69027b7270fb65c760d81897';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '1h'
  });
}

async function clearAllInsights() {
  console.log('🔑 Generating authentication token...\n');
  
  const token = generateToken(DEV_USER_ID);
  console.log(`✅ Token generated for user: ${DEV_USER_ID}\n`);

  console.log('🧹 Clearing ALL performance insights cache via API...\n');
  console.log(`🌐 API Base URL: ${API_BASE_URL}\n`);

  try {
    // Try to clear all at once using the /clear/all endpoint
    console.log('🗑️ Attempting to clear all insights at once...');
    
    const response = await axios.delete(`${API_BASE_URL}/insights/clear/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ Successfully cleared ${response.data.deletedCount} insights across all tabs`);
      console.log(`📊 Message: ${response.data.message}\n`);
      return { success: true, deletedCount: response.data.deletedCount };
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication failed. Please check JWT_SECRET matches backend.');
      process.exit(1);
    }
    
    if (error.response?.status === 404) {
      console.log('ℹ️ /clear/all endpoint not found, clearing tab by tab...\n');
    } else {
      console.log(`⚠️ Error with /clear/all endpoint: ${error.message}`);
      console.log('🔄 Falling back to tab-by-tab clearing...\n');
    }

    // Fallback: clear tab by tab
    const TAB_TYPES = ['visibility', 'prompts', 'sentiment', 'citations'];
    let totalDeleted = 0;
    const results = [];

    for (const tabType of TAB_TYPES) {
      try {
        console.log(`🗑️ Clearing cache for ${tabType} tab...`);
        
        const response = await axios.delete(`${API_BASE_URL}/insights/${tabType}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          const deletedCount = response.data.deletedCount || 0;
          totalDeleted += deletedCount;
          console.log(`✅ ${tabType} cache cleared: ${deletedCount} insights deleted`);
          results.push({ tabType, success: true, deletedCount });
        }
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`ℹ️ ${tabType} cache was already empty`);
          results.push({ tabType, success: true, deletedCount: 0 });
        } else {
          console.log(`❌ Error clearing ${tabType}: ${error.response?.data?.message || error.message}`);
          results.push({ tabType, success: false, error: error.message });
        }
      }
    }

    console.log('\n📊 CLEAR SUMMARY:');
    console.log('================================');
    console.log(`✅ Total insights deleted: ${totalDeleted}`);
    results.forEach(r => {
      if (r.success) {
        console.log(`   ✅ ${r.tabType}: ${r.deletedCount || 0} deleted`);
      } else {
        console.log(`   ❌ ${r.tabType}: Failed`);
      }
    });

    return { success: true, deletedCount: totalDeleted, results };
  }
}

async function main() {
  try {
    const result = await clearAllInsights();
    
    console.log('\n✨ Done!');
    console.log(`📊 Deleted ${result.deletedCount || 0} insights`);
    console.log('🔄 Next time you visit any tab, fresh insights will be generated.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { clearAllInsights };








