#!/usr/bin/env node

/**
 * Script to analyze generated prompts for quality metrics
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function analyzePrompts() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📊 Analyzing Generated Prompts');
    console.log('='.repeat(70) + '\n');

    const response = await axios.get(`${API_BASE}/api/prompts`);
    const prompts = response.data.data || [];

    console.log(`Total Prompts: ${prompts.length}\n`);

    // Group by topic-persona
    const byTopicPersona = {};
    const byTopic = {};
    const byPersona = {};
    const promptTexts = [];

    prompts.forEach(prompt => {
      const topicName = prompt.topicId?.name || 'Unknown';
      const personaType = prompt.personaId?.type || 'Unknown';
      const key = `${topicName} × ${personaType}`;

      if (!byTopicPersona[key]) byTopicPersona[key] = [];
      if (!byTopic[topicName]) byTopic[topicName] = [];
      if (!byPersona[personaType]) byPersona[personaType] = [];

      byTopicPersona[key].push(prompt);
      byTopic[topicName].push(prompt);
      byPersona[personaType].push(prompt);
      promptTexts.push(prompt.text.toLowerCase());
    });

    // Analyze word count distribution
    const wordCounts = prompts.map(p => p.text.split(' ').length);
    const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    const minWords = Math.min(...wordCounts);
    const maxWords = Math.max(...wordCounts);

    // Analyze patterns
    const brandedCount = prompts.filter(p => 
      p.text.toLowerCase().includes('american express') || 
      p.text.toLowerCase().includes('smartearn')
    ).length;

    const questionCount = prompts.filter(p => p.text.includes('?')).length;
    const statementCount = prompts.length - questionCount;

    // Analyze buying intent keywords
    const buyingIntentKeywords = [
      'best', 'should', 'worth', 'compare', 'recommend', 'top', 'options',
      'choose', 'select', 'which', 'good for', 'ideal for', 'suitable'
    ];
    const buyingIntentCount = prompts.filter(p => 
      buyingIntentKeywords.some(keyword => p.text.toLowerCase().includes(keyword))
    ).length;

    // Analyze TOFU indicators (awareness/research stage)
    const tofuKeywords = [
      'best', 'top', 'compare', 'should', 'worth', 'options', 'which',
      'recommend', 'good', 'ideal', 'suitable', 'review'
    ];
    const tofuCount = prompts.filter(p => 
      tofuKeywords.some(keyword => p.text.toLowerCase().includes(keyword))
    ).length;

    // Analyze diversity (unique starts)
    const uniqueStarts = new Set(prompts.map(p => {
      const firstWord = p.text.split(' ')[0].toLowerCase();
      return firstWord;
    }));

    // Check for informational patterns (bad)
    const informationalPatterns = ['what is', 'how does', 'why', 'guide to', 'explain'];
    const hasInformational = prompts.filter(p => 
      informationalPatterns.some(pattern => p.text.toLowerCase().startsWith(pattern))
    ).length;

    // Check for transactional patterns (bad for TOFU)
    const transactionalPatterns = ['sign up', 'apply', 'buy', 'purchase', 'order'];
    const hasTransactional = prompts.filter(p => 
      transactionalPatterns.some(pattern => p.text.toLowerCase().includes(pattern))
    ).length;

    // Display analysis
    console.log('📏 WORD COUNT ANALYSIS:');
    console.log(`   Average: ${avgWords.toFixed(1)} words`);
    console.log(`   Range: ${minWords} - ${maxWords} words`);
    console.log(`   Prompts within 5-12 words: ${wordCounts.filter(w => w >= 5 && w <= 12).length}/${prompts.length}`);
    console.log();

    console.log('🎯 COMMERCIAL INTENT ANALYSIS:');
    console.log(`   Buying intent keywords found: ${buyingIntentCount}/${prompts.length} (${Math.round(buyingIntentCount/prompts.length*100)}%)`);
    console.log(`   Question format: ${questionCount} (${Math.round(questionCount/prompts.length*100)}%)`);
    console.log(`   Statement format: ${statementCount} (${Math.round(statementCount/prompts.length*100)}%)`);
    console.log();

    console.log('🔍 TOFU QUALITY ANALYSIS:');
    console.log(`   TOFU indicators: ${tofuCount}/${prompts.length} (${Math.round(tofuCount/prompts.length*100)}%)`);
    console.log(`   Informational queries (BAD): ${hasInformational}`);
    console.log(`   Transactional queries (BAD): ${hasTransactional}`);
    console.log();

    console.log('🏷️  BRAND MENTION ANALYSIS:');
    console.log(`   Branded prompts: ${brandedCount}/${prompts.length} (${Math.round(brandedCount/prompts.length*100)}%)`);
    console.log(`   Non-branded prompts: ${prompts.length - brandedCount}/${prompts.length} (${Math.round((prompts.length-brandedCount)/prompts.length*100)}%)`);
    console.log();

    console.log('🔄 DIVERSITY ANALYSIS:');
    console.log(`   Unique starting words: ${uniqueStarts.size}`);
    console.log(`   Most common starts: ${Array.from(uniqueStarts).slice(0, 10).join(', ')}`);
    console.log(`   Distribution across topics: ${Object.keys(byTopic).length} topics`);
    console.log(`   Distribution across personas: ${Object.keys(byPersona).length} personas`);
    console.log();

    // Show distribution
    console.log('📊 DISTRIBUTION BY TOPIC:');
    Object.entries(byTopic)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([topic, prompts]) => {
        console.log(`   ${topic}: ${prompts.length} prompts`);
      });
    console.log();

    // Identify duplicate/similar prompts
    const duplicates = [];
    for (let i = 0; i < promptTexts.length; i++) {
      for (let j = i + 1; j < promptTexts.length; j++) {
        const similarity = calculateSimilarity(promptTexts[i], promptTexts[j]);
        if (similarity > 0.8) {
          duplicates.push({ i, j, similarity, text1: prompts[i].text, text2: prompts[j].text });
        }
      }
    }

    if (duplicates.length > 0) {
      console.log('⚠️  POTENTIAL DUPLICATES (similarity > 80%):');
      duplicates.slice(0, 5).forEach((dup, idx) => {
        console.log(`   ${idx + 1}. "${dup.text1}"`);
        console.log(`      "${dup.text2}" (${Math.round(dup.similarity * 100)}% similar)`);
      });
      if (duplicates.length > 5) {
        console.log(`   ... and ${duplicates.length - 5} more potential duplicates`);
      }
      console.log();
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    const recommendations = [];
    
    if (avgWords > 12) {
      recommendations.push('⚠️  Average word count is above 12. Consider making prompts shorter (5-12 words ideal).');
    }
    if (hasInformational > 0) {
      recommendations.push(`⚠️  Found ${hasInformational} informational queries. Remove "What is", "How does", "Why" patterns.`);
    }
    if (hasTransactional > 0) {
      recommendations.push(`⚠️  Found ${hasTransactional} transactional queries. Remove "Sign up", "Apply", "Buy" patterns.`);
    }
    if (duplicates.length > prompts.length * 0.1) {
      recommendations.push(`⚠️  High number of duplicates (${duplicates.length}). Improve diversity in generation.`);
    }
    if (uniqueStarts.size < 5) {
      recommendations.push('⚠️  Low starting word diversity. Vary prompt openings more (Best, Should, Is, Compare, Top, etc.).');
    }
    if (brandedCount / prompts.length < 0.1 || brandedCount / prompts.length > 0.3) {
      const currentPercent = Math.round(brandedCount / prompts.length * 100);
      recommendations.push(`⚠️  Branded percentage is ${currentPercent}%. Target 10-20% for optimal TOFU balance.`);
    }
    if (buyingIntentCount / prompts.length < 0.8) {
      recommendations.push(`⚠️  Only ${Math.round(buyingIntentCount/prompts.length*100)}% have clear buying intent. Increase commercial keywords.`);
    }

    if (recommendations.length === 0) {
      console.log('   ✅ Overall quality looks good!');
    } else {
      recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    console.log();

    // Sample prompts for review
    console.log('📝 SAMPLE PROMPTS FOR REVIEW:\n');
    console.log('Non-Branded (TOFU):');
    prompts.filter(p => !p.text.toLowerCase().includes('american express') && !p.text.toLowerCase().includes('smartearn'))
      .slice(0, 10)
      .forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p.text.split(' ').length} words] ${p.text}`);
      });
    console.log('\nBranded (Consideration):');
    prompts.filter(p => p.text.toLowerCase().includes('american express') || p.text.toLowerCase().includes('smartearn'))
      .slice(0, 10)
      .forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p.text.split(' ').length} words] ${p.text}`);
      });
    console.log();

  } catch (error) {
    console.error('❌ Error analyzing prompts:', error.response?.data || error.message);
  }
}

function calculateSimilarity(str1, str2) {
  // Simple word overlap similarity
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

analyzePrompts().catch(console.error);

