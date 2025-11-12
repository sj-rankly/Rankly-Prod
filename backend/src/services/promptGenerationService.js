const axios = require('axios');
// Removed hyperparameters config dependency

// Import modular components
const { buildSystemPrompt: buildSystemPromptModule, buildUserPrompt: buildUserPromptModule } = require('./promptGeneration/prompts');
const { parsePromptsFromResponse: parsePromptsFromResponseModule } = require('./promptGeneration/parsing');
const { normalizePromptText: normalizePromptTextModule, simpleHash: simpleHashModule, isNearDuplicate: isNearDuplicateModule } = require('./promptGeneration/deduplication');
const { sleep: sleepModule } = require('./promptGeneration/utils');

/**
 * Prompt Generation Service
 * Generates natural, persona-specific prompts for LLM testing
 * Uses OpenRouter API with GPT-4o
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Use centralized configuration
// NOTE: All prompts are now 100% Commercial TOFU with buying intent only

/**
 * Generate prompts for all topic-persona combinations
 * @param {Object} params - Generation parameters
 * @param {Array} params.topics - Selected topics with details
 * @param {Array} params.personas - Selected personas with details
 * @param {String} params.region - Target region
 * @param {String} params.language - Target language
 * @param {String} params.websiteUrl - User's website URL
 * @param {String} params.brandContext - Website brand context
 * @param {Array} params.competitors - Competitor information
 * @param {Number} params.totalPrompts - Total number of prompts to generate
 * @param {Object} params.options - Optional configuration overrides
 * @param {Object} params.options.queryTypeDistribution - Override query type distribution
 * @param {Number} params.options.brandedPercentage - Override branded percentage
 * @returns {Promise<Array>} Array of generated prompts
 */
async function generatePrompts({
  topics = [],
  personas = [],
  region = 'Global',
  language = 'English',
  websiteUrl = '',
  brandContext = '',
  competitors = [],
  totalPrompts = 20, // FIXED: This is TOTAL prompts across all combinations, not per combination
  options = null // Optional override
}) {
  // FIXED: Calculate prompts per combination based on total prompts
  // Formula: totalPrompts = topics × personas × promptsPerCombination
  // So: promptsPerCombination = totalPrompts / (topics × personas)
  const totalCombinations = topics.length * personas.length;
  const promptsPerCombination = totalCombinations > 0 
    ? Math.floor(totalPrompts / totalCombinations) 
    : 0;
  const remainder = totalCombinations > 0 ? totalPrompts % totalCombinations : 0;
  
  // Ensure minimum 1 prompt per combination if we have combinations
  if (totalCombinations > 0 && promptsPerCombination < 1) {
    throw new Error(`Too many combinations (${totalCombinations}) for ${totalPrompts} total prompts. Need at least ${totalCombinations} prompts.`);
  }
  
  try {
    console.log('🎯 Starting prompt generation...');
    console.log(`Topics: ${topics.length}, Personas: ${personas.length}`);
    console.log(`📊 Total prompts target: ${totalPrompts}`);
    console.log(`📊 Total combinations: ${totalCombinations}`);
    console.log(`📊 Prompts per combination: ${promptsPerCombination} (${remainder} combinations will get ${promptsPerCombination + 1} to reach exactly ${totalPrompts} total)`);

    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    if (topics.length === 0 || personas.length === 0) {
      throw new Error('Topics and personas are required for prompt generation');
    }

    const allPrompts = [];

    // Generate prompts for each topic-persona combination
    // Ensure equal number of prompts per combination
    // Over-generate by 30% (1.3x) to account for duplicates - reduced from 2.0x for better cost efficiency
    // If a combination is short after deduplication, we'll retry with additional prompts
    const overGenerationFactor = options?.overGenerationFactor ?? 1.3; // Reduced from 2.0 for better efficiency
    const promptsToGenerate = Math.ceil(promptsPerCombination * overGenerationFactor);
    
    // PHASE 1 OPTIMIZATION: Parallelize combination generation
    // Build all combinations first
    const combinations = [];
    for (const topic of topics) {
      for (const persona of personas) {
        combinations.push({ topic, persona });
      }
    }
    
    // totalCombinations is already declared above (line 46), verify it matches
    if (combinations.length !== totalCombinations) {
      console.warn(`⚠️  Mismatch: calculated ${totalCombinations} combinations but found ${combinations.length}`);
    }
    const parallelBatchSize = options?.parallelBatchSize ?? 5; // Process 5 combinations concurrently
    console.log(`🚀 [OPTIMIZED] Processing ${totalCombinations} combinations in parallel batches of ${parallelBatchSize}`);
    
    // Process combinations in parallel batches
    const batches = [];
    for (let i = 0; i < combinations.length; i += parallelBatchSize) {
      batches.push(combinations.slice(i, i + parallelBatchSize));
    }
    
    const combinationResults = [];
    let combinationCount = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 [BATCH ${batchIndex + 1}/${batches.length}] Processing ${batch.length} combinations in parallel...`);
      
      // Process batch in parallel using Promise.allSettled to handle partial failures
      const batchStartTime = Date.now();
      const batchResults = await Promise.allSettled(
        batch.map(({ topic, persona }) => {
          combinationCount++;
          const comboIndex = combinationCount;
          console.log(`   [${comboIndex}/${totalCombinations}] Queued: ${topic.name} × ${persona.type}`);
          
          return generatePromptsForCombination({
            topic,
            persona,
            region,
            language,
            websiteUrl,
            brandContext,
            competitors,
            totalPrompts: promptsToGenerate, // Over-generate to account for duplicates
            options
          }).then(prompts => {
            // Calculate target for this combination (will be set in deduplication phase)
            const comboKey = `${topic._id}_${persona._id}`;
            const expectedTarget = Math.floor(totalPrompts / totalCombinations) + 
              (Array.from({length: totalCombinations}, (_, i) => i).indexOf(combinationCount - 1) < (totalPrompts % totalCombinations) ? 1 : 0);
            
            console.log(`   ✅ [${comboIndex}/${totalCombinations}] Generated ${prompts.length} prompts for ${topic.name} × ${persona.type} (target: ~${promptsPerCombination})`);
            
            return { topic, persona, prompts, comboIndex };
          });
        })
      );
      
      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
      const batchSuccess = batchResults.filter(r => r.status === 'fulfilled').length;
      const batchFailed = batchResults.filter(r => r.status === 'rejected').length;
      
      console.log(`   ✅ [BATCH ${batchIndex + 1}] Complete in ${batchDuration}s - Success: ${batchSuccess}, Failed: ${batchFailed}`);
      
      // Collect successful results and handle failures
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          combinationResults.push(result.value);
          allPrompts.push(...result.value.prompts);
        } else {
          const { topic, persona } = batch[index];
          console.error(`   ❌ [BATCH ${batchIndex + 1}] Failed for ${topic.name} × ${persona.type}:`, result.reason?.message || result.reason);
          // Store failure info for potential retry
          combinationResults.push({
            topic,
            persona,
            prompts: [],
            comboIndex: combinationCount - batch.length + index + 1,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }
    
    // FIX #1: Parallelize retry logic for failed combinations (50-70% faster)
    const failedCombinations = combinationResults.filter(r => r.error && (!r.prompts || r.prompts.length === 0));
    if (failedCombinations.length > 0) {
      console.log(`\n🔄 Retrying ${failedCombinations.length} failed combinations in parallel...`);
      const retryStartTime = Date.now();
      
      // Process all retries in parallel instead of sequentially
      const retryResults = await Promise.allSettled(
        failedCombinations.map(({ topic, persona, comboIndex, error }) => {
          console.log(`   🔄 Queued retry [${comboIndex}/${totalCombinations}]: ${topic.name} × ${persona.type}`);
          console.log(`      Previous error: ${error}`);
          
          // Generate more on retry to account for potential duplicates
          const retryCount = Math.ceil(promptsToGenerate * 1.5);
          
          return generatePromptsForCombination({
            topic,
            persona,
            region,
            language,
            websiteUrl,
            brandContext,
            competitors,
            totalPrompts: retryCount,
            options
          }).then(prompts => {
            if (prompts && prompts.length > 0) {
              console.log(`   ✅ Retry successful [${comboIndex}/${totalCombinations}]: Generated ${prompts.length} prompts for ${topic.name} × ${persona.type}`);
              return { success: true, prompts, topic, persona, comboIndex };
            } else {
              console.error(`   ❌ Retry returned no prompts for ${topic.name} × ${persona.type}`);
              return { success: false, prompts: [], topic, persona, comboIndex, error: 'No prompts returned' };
            }
          }).catch(error => {
            console.error(`   ❌ Retry failed for ${topic.name} × ${persona.type}: ${error.message}`);
            return { success: false, prompts: [], topic, persona, comboIndex, error: error.message };
          });
        })
      );
      
      const retryDuration = ((Date.now() - retryStartTime) / 1000).toFixed(2);
      console.log(`   ⏱️  All retries completed in ${retryDuration}s (parallel processing)`);
      
      // Process retry results
      let retrySuccessCount = 0;
      let retryFailureCount = 0;
      
      retryResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const retryData = result.value;
          if (retryData.success && retryData.prompts && retryData.prompts.length > 0) {
            allPrompts.push(...retryData.prompts);
            retrySuccessCount++;
          } else {
            retryFailureCount++;
          }
        } else {
          const { topic, persona } = failedCombinations[index];
          console.error(`   ❌ Retry promise rejected for ${topic.name} × ${persona.type}:`, result.reason);
          retryFailureCount++;
        }
      });
      
      console.log(`   📊 Retry summary: ${retrySuccessCount} succeeded, ${retryFailureCount} failed`);
      
      // Check if any combinations are still failed after retry
      const combinationKeysAfterRetry = new Set();
      for (const promptData of allPrompts) {
        const key = `${promptData.topicId}_${promptData.personaId}`;
        combinationKeysAfterRetry.add(key);
      }
      
      // Check which combinations from the original set don't have any prompts
      const stillFailed = failedCombinations.filter(({ topic, persona }) => {
        const key = `${topic._id}_${persona._id}`;
        return !combinationKeysAfterRetry.has(key);
      }).length;
      
      if (stillFailed > 0) {
        console.warn(`   ⚠️  ${stillFailed} combination(s) still failed after retry. Proceeding with available prompts.`);
      } else {
        console.log(`   ✅ All failed combinations successfully recovered after retry.`);
      }
    }
    
    // Check for combinations that need additional prompts (after deduplication)
    // This will be handled in the deduplication phase where we check targetCounts
    
    console.log(`\n📊 Generation Summary:`);
    console.log(`   Total combinations processed: ${combinationCount}`);
    console.log(`   Target total prompts: ${totalPrompts}`);
    console.log(`   Base prompts per combination: ${promptsPerCombination}`);
    console.log(`   Combinations with +1 prompt: ${remainder} (to reach exactly ${totalPrompts} total)`);
    console.log(`   Total prompts before deduplication: ${allPrompts.length}`);

    // Group prompts by topic-persona combination
    const promptsByCombination = {};
    for (const promptData of allPrompts) {
      const key = `${promptData.topicId}_${promptData.personaId}`;
      if (!promptsByCombination[key]) {
        promptsByCombination[key] = [];
      }
      promptsByCombination[key].push(promptData);
    }
    
    // Log distribution per combination
    console.log(`\n📋 Prompts per combination (before deduplication):`);
    Object.entries(promptsByCombination).forEach(([key, prompts]) => {
      const topic = topics.find(t => t._id === prompts[0].topicId);
      const persona = personas.find(p => p._id === prompts[0].personaId);
      console.log(`   ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}: ${prompts.length} prompts`);
    });

    // PHASE 1 OPTIMIZATION: Single-pass hash-based deduplication (O(n) instead of O(n²))
    // This replaces the previous 3-pass approach with a single efficient pass
    console.log(`\n🔍 [OPTIMIZED] Starting single-pass hash-based deduplication...`);
    const dedupStartTime = Date.now();
    
    const finalPromptsByCombination = new Map(); // Use Map for O(1) operations
    const globalSeenTexts = new Map(); // Track seen texts: hash -> normalized text (for near-duplicate checking)
    const combinationCounts = new Map(); // Track counts per combination
    
    // Initialize combination buckets
    for (const promptData of allPrompts) {
      const key = `${promptData.topicId}_${promptData.personaId}`;
      if (!finalPromptsByCombination.has(key)) {
        finalPromptsByCombination.set(key, []);
        combinationCounts.set(key, 0);
      }
    }
    
    // Process combinations in deterministic order (sorted)
    const combinationKeys = Array.from(finalPromptsByCombination.keys()).sort();
    
    // Calculate target count for each combination (handle remainder distribution)
    const targetCountsByCombination = new Map();
    let remainderDistributed = 0;
    for (const key of combinationKeys) {
      // First 'remainder' combinations get one extra prompt
      const targetCount = remainderDistributed < remainder 
        ? promptsPerCombination + 1 
        : promptsPerCombination;
      targetCountsByCombination.set(key, targetCount);
      if (remainderDistributed < remainder) remainderDistributed++;
    }
    
    // Single pass: collect unique prompts per combination
    for (const promptData of allPrompts) {
      const key = `${promptData.topicId}_${promptData.personaId}`;
      const currentCount = combinationCounts.get(key);
      const targetCount = targetCountsByCombination.get(key) || promptsPerCombination;
      
      // Skip if combination already has enough prompts
      if (currentCount >= targetCount) {
        continue;
      }
      
      const normText = normalizePromptText(promptData.promptText);
      const textHash = simpleHash(normText); // Fast hash for O(1) duplicate detection
      
      // Check if this is a duplicate or near-duplicate globally
      let isDuplicate = false;
      
      // First check exact hash match (exact duplicate)
      if (globalSeenTexts.has(textHash)) {
        const seenText = globalSeenTexts.get(textHash);
        if (seenText === normText) {
          isDuplicate = true;
        }
      }
      
      // If not exact match, check for near-duplicates (only check a sample to avoid O(n²))
      if (!isDuplicate && globalSeenTexts.size > 0) {
        // For efficiency, only check against recent texts (last 50) for near-duplicate detection
        const recentTexts = Array.from(globalSeenTexts.values()).slice(-50);
        for (const seenText of recentTexts) {
          if (isNearDuplicate(seenText, normText)) {
            isDuplicate = true;
            break;
          }
        }
      }
      
      // If not a duplicate, add it
      if (!isDuplicate) {
        globalSeenTexts.set(textHash, normText);
        finalPromptsByCombination.get(key).push(promptData);
        combinationCounts.set(key, currentCount + 1);
      }
    }
    
    // If any combination is short, try to fill from remaining prompts
    for (const key of combinationKeys) {
      let currentCount = combinationCounts.get(key);
      const targetCount = targetCountsByCombination.get(key) || promptsPerCombination;
      
      if (currentCount < targetCount) {
        // Find remaining prompts for this combination that haven't been used
        const remainingPrompts = promptsByCombination[key] || [];
        const usedHashes = new Set(finalPromptsByCombination.get(key).map(p => simpleHash(normalizePromptText(p.promptText))));
        
        for (const prompt of remainingPrompts) {
          if (currentCount >= targetCount) break;
          
          const normText = normalizePromptText(prompt.promptText);
          const textHash = simpleHash(normText);
          
          // Only add if not already in this combination and not a global duplicate
          if (!usedHashes.has(textHash) && !globalSeenTexts.has(textHash)) {
            finalPromptsByCombination.get(key).push(prompt);
            combinationCounts.set(key, currentCount + 1);
            currentCount++;
            usedHashes.add(textHash);
            globalSeenTexts.set(textHash, normText);
          }
        }
      }
    }
    
    const dedupDuration = ((Date.now() - dedupStartTime) / 1000).toFixed(3);
    console.log(`   ✅ Deduplication complete in ${dedupDuration}s (single-pass optimized)`);
    
    // Flatten to final array
    const finalValidatedPrompts = [];
    for (const key of combinationKeys) {
      const prompts = finalPromptsByCombination.get(key);
      const count = combinationCounts.get(key);
      const targetCount = targetCountsByCombination.get(key) || promptsPerCombination;
      finalValidatedPrompts.push(...prompts);
      
      const topic = topics.find(t => t._id === prompts[0]?.topicId);
      const persona = personas.find(p => p._id === prompts[0]?.personaId);
      const status = count === targetCount ? '✅' : count < targetCount ? '⚠️' : '✅';
      if (count !== targetCount) {
        console.warn(`   ${status} ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}: ${count}/${targetCount} prompts`);
      }
    }
    
    // Log summary
    const duplicatesRemoved = allPrompts.length - finalValidatedPrompts.length;
    if (duplicatesRemoved > 0) {
      console.log(`   📊 Removed ${duplicatesRemoved} duplicates (${((duplicatesRemoved / allPrompts.length) * 100).toFixed(1)}%)`);
    }
    
    // Log final distribution
    console.log(`\n📋 Prompts per combination (after final validation):`);
    let allEqual = true;
    let totalCheck = 0;
    for (const key of combinationKeys) {
      const prompts = finalPromptsByCombination.get(key) || [];
      const count = prompts.length;
      const targetCount = targetCountsByCombination.get(key) || promptsPerCombination;
      totalCheck += count;
      
      const topic = topics.find(t => t._id === prompts[0]?.topicId);
      const persona = personas.find(p => p._id === prompts[0]?.personaId);
      const status = count === targetCount ? '✅' : count < targetCount ? '⚠️' : '✅';
      if (count !== targetCount) allEqual = false;
      console.log(`   ${status} ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}: ${count} prompts (target: ${targetCount})`);
    }
    
    if (allEqual && totalCheck === totalPrompts) {
      console.log(`\n✅ All combinations have correct counts and total is exactly ${totalPrompts} prompts!`);
    } else {
      console.warn(`\n⚠️  Total: ${totalCheck} prompts (target: ${totalPrompts}) - some combinations may need adjustment`);
    }
    
    // Log diversity statistics
    const finalPromptCount = finalValidatedPrompts.length;
    const uniqueTextCount = new Set(finalValidatedPrompts.map(p => normalizePromptText(p.promptText))).size;
    const diversityRatio = (uniqueTextCount / finalPromptCount * 100).toFixed(1);
    console.log(`\n📊 Diversity Statistics:`);
    console.log(`   Total prompts: ${finalPromptCount}`);
    console.log(`   Unique texts: ${uniqueTextCount}`);
    console.log(`   Diversity ratio: ${diversityRatio}%`);
    
    if (diversityRatio < 95) {
      console.warn(`   ⚠️  Diversity ratio is below 95% - some prompts may be too similar`);
    } else {
      console.log(`   ✅ Excellent diversity - prompts are well-distributed`);
    }
    
    // Final validation: Ensure we have exactly totalPrompts
    const actualTotal = finalValidatedPrompts.length;
    if (actualTotal !== totalPrompts) {
      if (actualTotal < totalPrompts) {
        const missing = totalPrompts - actualTotal;
        console.warn(`\n⚠️  Prompt count mismatch: Expected ${totalPrompts}, got ${actualTotal} (missing ${missing})`);
        
        // IMPROVEMENT: Generate additional prompts for short combinations
        console.log(`\n🔄 Generating additional prompts to fill ${missing} missing prompts...`);
        
        // Find combinations that are short
        const shortCombinations = [];
        for (const key of combinationKeys) {
          const prompts = finalPromptsByCombination.get(key) || [];
          const targetCount = targetCountsByCombination.get(key) || promptsPerCombination;
          if (prompts.length < targetCount) {
            // Extract topic and persona IDs from key (format: "topicId_personaId")
            const [topicIdStr, personaIdStr] = key.split('_');
            const topic = topics.find(t => t._id?.toString() === topicIdStr || t._id === topicIdStr);
            const persona = personas.find(p => p._id?.toString() === personaIdStr || p._id === personaIdStr);
            
            if (topic && persona) {
              shortCombinations.push({
                key,
                topic,
                persona,
                currentCount: prompts.length,
                targetCount,
                needed: targetCount - prompts.length
              });
            }
          }
        }
        
        // FIX #2: Parallelize additional prompt generation (60-80% faster)
        if (shortCombinations.length > 0) {
          console.log(`\n🚀 Generating additional prompts for ${shortCombinations.length} combinations in parallel...`);
          const fillStartTime = Date.now();
          
          // Distribute missing prompts across short combinations
          let remainingMissing = missing;
          const fillTasks = [];
          for (const { topic, persona, needed, key } of shortCombinations) {
            if (remainingMissing <= 0) break;
            const additionalNeeded = Math.min(needed, remainingMissing);
            remainingMissing -= additionalNeeded;
            const additionalToGenerate = Math.ceil(additionalNeeded * 1.5); // Generate 50% more than needed
            
            fillTasks.push({
              topic,
              persona,
              key,
              needed: additionalNeeded,
              toGenerate: additionalToGenerate
            });
          }
          
          // Process all generation tasks in parallel
          const fillResults = await Promise.allSettled(
            fillTasks.map(({ topic, persona, key, toGenerate, needed }) => {
              console.log(`   🔄 Queued: ${toGenerate} additional prompts for ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'} (need ${needed})`);
              
              return generatePromptsForCombination({
                topic,
                persona,
                region,
                language,
                websiteUrl,
                brandContext,
                competitors,
                totalPrompts: toGenerate,
                options
              }).then(additionalPrompts => ({
                success: true,
                prompts: additionalPrompts,
                key,
                topic,
                persona,
                needed
              })).catch(error => {
                console.error(`   ❌ Failed to generate additional prompts for ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}: ${error.message}`);
                return {
                  success: false,
                  prompts: [],
                  key,
                  topic,
                  persona,
                  needed,
                  error: error.message
                };
              });
            })
          );
          
          const fillDuration = ((Date.now() - fillStartTime) / 1000).toFixed(2);
          console.log(`   ⏱️  All additional prompts generated in ${fillDuration}s (parallel processing)`);
          
          // Process results sequentially to maintain exact count (deduplication requires sequential processing)
          let totalAdded = 0;
          let remainingToFill = missing;
          
          fillResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
              const { prompts, key, needed } = result.value;
              const { topic, persona } = fillTasks[index];
              
              // Add to the combination if not duplicates
              const existingPrompts = finalPromptsByCombination.get(key) || [];
              const existingHashes = new Set(existingPrompts.map(p => simpleHash(normalizePromptText(p.promptText))));
              
              let addedCount = 0;
              for (const prompt of prompts) {
                if (addedCount >= needed) break;
                if (remainingToFill <= 0) break;
                
                const normText = normalizePromptText(prompt.promptText);
                const textHash = simpleHash(normText);
                
                // Check if not a duplicate globally or locally
                if (!existingHashes.has(textHash) && !globalSeenTexts.has(textHash)) {
                  existingPrompts.push(prompt);
                  existingHashes.add(textHash);
                  globalSeenTexts.set(textHash, normText);
                  addedCount++;
                  remainingToFill--;
                }
              }
              
              finalPromptsByCombination.set(key, existingPrompts);
              combinationCounts.set(key, existingPrompts.length);
              totalAdded += addedCount;
              
              console.log(`   ✅ Added ${addedCount} additional prompts for ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'} (${remainingToFill} still needed)`);
            } else {
              const { topic, persona } = fillTasks[index];
              console.error(`   ❌ Failed to process additional prompts for ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}`);
            }
          });
          
          console.log(`   📊 Fill summary: ${totalAdded} prompts added, ${remainingToFill} still needed`);
        }
        
        // Rebuild final array after additional generation
        finalValidatedPrompts.length = 0; // Clear array
        for (const key of combinationKeys) {
          const prompts = finalPromptsByCombination.get(key) || [];
          const targetCount = targetCountsByCombination.get(key) || promptsPerCombination;
          // Only take up to target count
          finalValidatedPrompts.push(...prompts.slice(0, targetCount));
        }
        
        // Final check after retry
        const finalTotal = finalValidatedPrompts.length;
        if (finalTotal < totalPrompts) {
          console.warn(`   ⚠️  Still missing ${totalPrompts - finalTotal} prompts after retry attempts`);
        } else if (finalTotal > totalPrompts) {
          // Trim to exact count (keep first totalPrompts)
          finalValidatedPrompts.splice(totalPrompts);
          console.log(`   ✅ Trimmed to exact count: ${totalPrompts} prompts`);
        } else {
          console.log(`   ✅ Successfully filled to exact count: ${totalPrompts} prompts`);
        }
      } else {
        console.warn(`\n⚠️  Extra ${actualTotal - totalPrompts} prompts - trimming to target`);
        // Trim to exact count (keep first totalPrompts)
        finalValidatedPrompts.splice(totalPrompts);
        console.log(`   ✅ Trimmed to exact count: ${totalPrompts} prompts`);
      }
    } else {
      console.log(`\n✅ Exact prompt count achieved: ${actualTotal} prompts (target: ${totalPrompts})`);
    }
    
    console.log(`\n✅ Generated ${finalValidatedPrompts.length} unique, diverse prompts successfully`);
    return finalValidatedPrompts;

  } catch (error) {
    console.error('❌ Prompt generation failed:', error.message);
    throw error;
  }
}

/**
 * Utility function to wait for a specified time
 */
async function sleep(ms) {
  return sleepModule(ms);
}

/**
 * Generate prompts for a specific topic-persona combination
 * @param {Number} promptsPerQueryType - Number of prompts per query type
 */
async function generatePromptsForCombination({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors,
  totalPrompts = 20,
  options = null
}, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds base delay
  
  try {
    const systemPrompt = buildSystemPrompt(totalPrompts, options);
    const userPrompt = buildUserPrompt({
      topic,
      persona,
      region,
      language,
      websiteUrl,
      brandContext,
      competitors,
      totalPrompts,
      options
    });

    console.log(`🔍 Prompt generation context for ${topic.name} × ${persona.type}:`);
    console.log(`   Brand: ${brandContext?.companyName || 'Unknown'}`);
    console.log(`   Topic Description: ${topic.description ? topic.description.substring(0, 100) + '...' : 'None provided'}`);
    console.log(`   Persona Description: ${persona.description ? persona.description.substring(0, 100) + '...' : 'None provided'}`);
    console.log(`   Brand Context Fields: ${brandContext && typeof brandContext === 'object' ? Object.keys(brandContext).join(', ') : 'None'}`);
    console.log(`   URL: ${websiteUrl}`);
    console.log(`   Total prompts: ${totalPrompts}`);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-4o-mini', // Low-cost model for prompt generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7, // Balanced creativity
        top_p: 0.9, // Nucleus sampling
        max_tokens: 3000, // Reduced to control costs
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || websiteUrl || 'https://rankly.ai',
          'X-Title': 'Rankly Prompt Generator'
        },
        timeout: 60000 // 1 minute timeout (with retry logic, this is safe and faster failure detection)
      }
    );

    // Check if response structure is valid
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.error(`❌ Invalid response structure for prompt generation:`, response.data);
      throw new Error('Invalid response from AI service');
    }

    const content = response.data.choices[0].message.content;
    
    // Check if content looks like an error message (not JSON)
    if (typeof content === 'string' && (
      content.toLowerCase().includes('too many requests') ||
      content.toLowerCase().includes('rate limit') ||
      content.toLowerCase().includes('error') ||
      content.toLowerCase().includes('unauthorized') ||
      content.toLowerCase().includes('forbidden') ||
      content.startsWith('Too many') ||
      content.startsWith('Rate limit') ||
      content.startsWith('Error:') ||
      content.startsWith('Unauthorized') ||
      content.startsWith('Forbidden')
    )) {
      console.error(`❌ API returned error message instead of JSON for prompt generation:`, content);
      throw new Error(`AI service returned error: ${content}`);
    }
    
    const prompts = parsePromptsFromResponse(content, topic, persona, totalPrompts);

    return prompts;

  } catch (error) {
    console.error(`Error generating prompts for ${topic.name} × ${persona.type}:`, error.message);
    
    // IMPROVEMENT: Handle retryable errors (not just 429)
    const isRetryableError = (err) => {
      // Rate limiting
      if (err.response?.status === 429) return true;
      // Server errors (5xx)
      if (err.response?.status >= 500 && err.response?.status < 600) return true;
      // Network errors
      if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;
      // Timeout errors
      if (err.message?.includes('timeout') || err.code === 'ECONNABORTED') return true;
      return false;
    };
    
    // Retry on retryable errors
    if (isRetryableError(error) && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      const errorType = error.response?.status === 429 ? 'Rate limit' : 
                       error.response?.status >= 500 ? 'Server error' :
                       'Network error';
      console.warn(`   ${errorType} encountered - retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
      await sleep(delay);
      return generatePromptsForCombination({
        topic,
        persona,
        region,
        language,
        websiteUrl,
        brandContext,
        competitors,
        totalPrompts,
        options
      }, retryCount + 1);
    }
    
    // For non-retryable errors or max retries exceeded, throw error
    throw new Error(`Failed to generate prompts: ${error.message}`);
  }
}

/**
 * Build system prompt for AI
 * @param {number} totalPrompts - Total prompts to generate
 * @param {Object} options - Optional configuration overrides
 */
function buildSystemPrompt(totalPrompts = 20, options = null) {
  return buildSystemPromptModule(totalPrompts, options);
}

/**
 * Legacy buildSystemPrompt - kept for reference
 * @deprecated Use the modular version from promptGeneration/prompts
 */
function buildSystemPromptLegacy(totalPrompts = 20, options = null) {
  // Use override options if provided, otherwise use defaults
  const brandedPercentage = options?.brandedPercentage ?? 15; // 15% branded (reduced from 20% for better TOFU balance)
  
  const brandedCount = Math.max(1, Math.round(totalPrompts * brandedPercentage));
  const nonBrandedCount = totalPrompts - brandedCount;

  return `You are an expert at creating natural, human-like TOFU (Top of Funnel) search queries for Answer Engine Optimization (AEO) analysis.

Your task is to generate EXACTLY ${totalPrompts} diverse, realistic fanned out TOFU prompts that test brand visibility in LLM responses (ChatGPT, Claude, Gemini, Perplexity) for users researching this product/service.

CRITICAL: Each prompt MUST be unique with different angles, focus areas, and wording. NO duplicates or near-duplicates allowed.

🚨 CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE STRICTLY:

1. ALL PROMPTS MUST BE COMMERCIAL ONLY WITH BUYING INTENT:
   - EVERY single prompt must have commercial intent and buying intent
   - Every prompt should indicate users are researching to buy/evaluate/solve a problem with intent to take action
   - ZERO informational queries (no "What is", "How does", "Why" educational content)
   - ZERO navigational queries (no "Where to find", "Best resources")
   - ZERO transactional queries (no "Sign up", "Try", "Apply")
   - ONLY commercial evaluation queries that show buying/research intent

2. TOFU FOCUS - TOP OF FUNNEL ONLY:
   - ALL prompts must target awareness/discovery stage users
   - Users researching solutions, evaluating options, comparing alternatives
   - Early research phase - NOT purchase-ready, NOT educational only
   - Buying intent: users want to solve a problem, find the best solution, evaluate options before buying

3. BRANDED RATIO: 
   - ${nonBrandedCount} prompts (${Math.round((1 - brandedPercentage) * 100)}%) MUST be NON-BRANDED (generic category/problem queries with buying intent)
   - ${brandedCount} prompt (${Math.round(brandedPercentage * 100)}%) can be BRANDED (mentioning specific brand name)

4. NO COMPETITOR MENTIONS:
   - NEVER mention competitor brand names in any prompt
   - Use generic terms like "alternatives", "options", "solutions", "providers" instead
   - Generic comparisons only (e.g., "best personal loan options" NOT "Brand A vs Brand B")

5. FAN OUT - SHORT & DIVERSIFIED ANGLES (CRITICAL FOR DIVERSITY):
   - Vary starting words: Use diverse openings - "Best", "Top", "Compare", "Which", "Should", "Is", "Options for", "Looking for", "Recommend", "Consider", "What are", "Help me find", "I need", "Searching for"
   - Vary research angles: "best for [use case]", "top options", "compare", "which [category]", "should I [action]", "options for [scenario]", "alternatives to", "recommendations for", "guide to choosing"
   - Vary buying contexts: different pain points, scenarios, use cases, user segments, urgency levels, budgets, timeframes
   - Each prompt must be UNIQUE with completely different focus/depth/angle/wording - NO repetition of similar structures
   - Each prompt must be SHORT: 5-12 words maximum
   - CRITICAL: Avoid repetitive patterns - if you use "Is X worth it for Y" once, NEVER use similar structure again
   - CRITICAL: Vary keyword usage - don't repeat the same key phrases across multiple prompts
   - CRITICAL: Use different question types - mix declarative ("Best X for Y"), interrogative ("Which X is best"), and imperative ("Compare X options") forms
   - Examples of DIVERSE prompts: "Best credit cards for travel rewards", "Which loan options suit debt consolidation", "Compare investment platforms for beginners", "Should I get a rewards card for online shopping", "Help me find credit cards with no fees", "What are top cashback card options"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (NON-BRANDED) - DIVERSE SHORT PROMPTS:
- Best credit cards for travel rewards
- Top loan options for debt consolidation
- Compare investment platforms for beginners
- Which credit cards offer the best cashback
- Options for debt consolidation loans
- Looking for credit cards with no annual fee
- Recommend credit cards for online shopping
- Credit cards suitable for students
- Best rewards programs for everyday spending
- Which credit card rewards travel purchases most


EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (BRANDED) - SHORT PROMPTS:
- Should I consider [Brand] for travel rewards
- Is [Brand] good for students
- [Brand] cashback benefits review
- Compare [Brand] with other options
- Is [Brand] worth it for online shopping

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG):
- "What is [category]?" (informational, no buying intent)
- "How does [category] work?" (educational, no buying intent)
- "Where to find [category]?" (navigational, no buying intent)
- "Sign up for [category]" (transactional, NOT TOFU)
- "Apply for [category]" (transactional, NOT TOFU)
- "Buy [category]" (transactional, NOT TOFU)
- "Purchase [category]" (transactional, NOT TOFU)
- "Try [category]" (transactional, NOT TOFU)
- "Order [category]" (transactional, NOT TOFU)
- "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
- "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)

🚫 STRICTLY PROHIBITED TRANSACTIONAL PATTERNS:
- Any phrase containing: "sign up", "apply", "buy", "purchase", "order", "try now", "get started"
- These indicate purchase intent, not research/evaluation intent (TOFU stage)

✅ ONLY GENERATE SHORT COMMERCIAL QUERIES WITH BUYING INTENT (5-12 words):
- Users researching to solve a specific problem
- Users evaluating options before deciding
- Users comparing different solutions
- Users looking for recommendations for their situation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISTRIBUTION RULES:
- ALL ${totalPrompts} prompts MUST be COMMERCIAL with BUYING INTENT
- ALL ${totalPrompts} prompts MUST be TOFU (awareness/discovery stage)
- ALL ${totalPrompts} prompts MUST be SHORT: 5-12 words maximum
- Write from the persona's perspective (their role, challenges, context)
- Make prompts conversational and natural (like real human queries)
- Each prompt must be UNIQUE - absolutely NO duplicates or near-duplicates
- CRITICAL DIVERSITY: Every prompt must use different words, structure, and angle - avoid any repetition
- Fan out across different buying scenarios, use cases, pain points, question types, and phrasings
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- DO NOT mention any competitor brand names
- MAXIMUM DIVERSITY REQUIRED: If you find yourself using similar wording, STOP and think of a completely different way to phrase it

OUTPUT FORMAT:
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]`;
}

/**
 * Build user prompt with context
 * @param {Object} params - Prompt building parameters
 * @param {Object} params.options - Optional configuration overrides
 */
function buildUserPrompt(params) {
  return buildUserPromptModule(params);
}

/**
 * Legacy buildUserPrompt - kept for reference
 * @deprecated Use the modular version from promptGeneration/prompts
 */
function buildUserPromptLegacy({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors, // Will ignore this
  totalPrompts = 80,
  options = null
}) {
  // Use override options if provided, otherwise use defaults
  const brandedPercentage = options?.brandedPercentage ?? 15; // 15% branded (aligned with system prompt)
  
  const brandedCount = Math.max(1, Math.round(totalPrompts * brandedPercentage));
  const nonBrandedCount = totalPrompts - brandedCount;
  
  // ALL prompts are now Commercial TOFU type with buying intent

  // Extract brand name
  let brandName = 'the brand';
  if (brandContext && typeof brandContext === 'object' && brandContext.companyName) {
    brandName = brandContext.companyName;
  } else if (brandContext && typeof brandContext === 'string') {
    try {
      const parsed = JSON.parse(brandContext);
      if (parsed.companyName) brandName = parsed.companyName;
    } catch (e) {}
  }

  // Build comprehensive brand info for better prompt generation
  let brandInfo = '';
  if (brandContext) {
    if (typeof brandContext === 'object') {
      const parts = [];
      if (brandContext.companyName) parts.push(`Company: ${brandContext.companyName}`);
      if (brandContext.industry) parts.push(`Industry: ${brandContext.industry}`);
      if (brandContext.businessModel) parts.push(`Business Model: ${brandContext.businessModel}`);
      if (brandContext.valueProposition) parts.push(`Value Proposition: ${brandContext.valueProposition}`);
      if (brandContext.keyServices && Array.isArray(brandContext.keyServices)) {
        parts.push(`Key Services: ${brandContext.keyServices.join(', ')}`);
      }
      if (brandContext.targetMarket) parts.push(`Target Market: ${brandContext.targetMarket}`);
      if (brandContext.brandTone) parts.push(`Brand Tone: ${brandContext.brandTone}`);
      if (parts.length > 0) brandInfo = `\n\nBRAND ANALYSIS DATA:\n${parts.join('\n')}`;
    }
  }

  return `Generate EXACTLY ${totalPrompts} COMMERCIAL TOFU prompts for brand visibility testing:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND: ${brandName}${websiteUrl ? ` (${websiteUrl})` : ''}${brandInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC/CATEGORY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC: ${topic.name}
${topic.description ? `Description: ${topic.description}` : 'Description: Not provided'}
${topic.keywords && topic.keywords.length > 0 ? `Keywords: ${topic.keywords.join(', ')}` : 'Keywords: Not provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PERSONA INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONA: ${persona.type}
${persona.description ? `Description: ${persona.description}` : 'Description: Not provided'}
${persona.painPoints && persona.painPoints.length > 0 ? `Pain Points: ${persona.painPoints.join(', ')}` : 'Pain Points: Not provided'}
${persona.goals && persona.goals.length > 0 ? `Goals: ${persona.goals.join(', ')}` : 'Goals: Not provided'}

TARGET: ${region}, ${language}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 MANDATORY REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. ALL ${totalPrompts} PROMPTS MUST BE COMMERCIAL ONLY WITH BUYING INTENT:
   ✓ EVERY prompt must show commercial intent and buying intent
   ✓ Users researching to solve specific problems with intent to take action
   ✓ Users evaluating options before making a decision
   ✗ ZERO informational queries (no "What is", "How does", "Why", "Guide to")
   ✗ ZERO navigational queries (no "Where to find", "Best resources")
   ✗ ZERO transactional queries (no "Sign up", "Try", "Apply")
   ✓ ONLY commercial evaluation queries that show buying/research intent

2. ALL ${totalPrompts} PROMPTS MUST BE TOFU (Top of Funnel):
   ✓ Awareness/discovery stage users - early research phase
   ✓ Users researching solutions, evaluating options, comparing alternatives
   ✗ NOT purchase-ready (too far down funnel)
   ✗ NOT educational only (no learning focus)
   ✓ Buying intent: users want to solve a problem, find best solutions, evaluate options

3. BRANDED RATIO:
   - ${nonBrandedCount} prompts (${Math.round((1 - brandedPercentage) * 100)}%) MUST be NON-BRANDED
     → Generic category/problem queries with commercial buying intent
   - ${brandedCount} prompt (${Math.round(brandedPercentage * 100)}%) can mention ${brandName}
     → User evaluating/considering the specific brand

4. NO COMPETITOR MENTIONS:
   ✗ NEVER mention competitor brand names
   ✓ Use generic terms: "alternatives", "options", "solutions", "providers", "companies"
   ✓ Generic comparisons only (e.g., "best ${topic.name} options" NOT "Brand A vs Brand B")

5. FAN OUT - SHORT & DIVERSIFIED ANGLES (CRITICAL FOR DIVERSITY):
   - Vary starting words: Use diverse openings - "Best", "Top", "Compare", "Which", "Should", "Is", "Options for", "Looking for", "Recommend", "Consider", "What are", "Help me find", "I need", "Searching for"
   - Vary research angles: "best for [use case]", "top options", "compare", "recommendations", "reviews", "alternatives to", "guide to choosing", "help selecting"
   - Vary buying contexts: different pain points, scenarios, use cases, budgets, urgency, timeframes, user types
   - Each prompt MUST be unique with completely different focus/depth/angle/wording - NO similar patterns
   - Each prompt MUST be SHORT: 5-12 words maximum
   - Cover different stages: initial research → comparison → selection criteria
   - CRITICAL: Use different question types - mix declarative, interrogative, and imperative forms
   - CRITICAL: Vary keyword usage - don't repeat the same phrases across prompts
   - CRITICAL: Avoid repetitive structures - if you use one pattern, use completely different patterns for others

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT - SHORT PROMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NON-BRANDED (${nonBrandedCount} prompts) - SHORT:
✓ "Best ${topic.name} options for ${persona.type}s"
✓ "Top ${topic.name} for travel rewards"
✓ "Compare investment platforms for beginners"
✓ "Loan options for debt consolidation"
✓ "Credit cards with best cashback"
✓ "Travel insurance for frequent flyers"

BRANDED (${brandedCount} prompt only) - SHORT:
✓ "Should I consider ${brandName} for ${topic.name}"
✓ "${brandName} cashback comparison"
✓ "Is ${brandName} good for students"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ "What is ${topic.name}?" (informational, no buying intent)
✗ "How does ${topic.name} work?" (educational, no buying intent)
✗ "Guide to ${topic.name}" (tutorial, no buying intent)
✗ "Where to find ${topic.name}?" (navigational, no buying intent)
✗ "Sign up for ${topic.name}" (transactional, not TOFU)
✗ "Try ${topic.name}" (transactional, not TOFU)
✗ "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
✗ "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRIBUTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ALL ${totalPrompts} prompts: COMMERCIAL + TOFU + BUYING INTENT
- ALL ${totalPrompts} prompts: SHORT (5-12 words maximum)
- Write from ${persona.type}'s perspective: ${persona.description ? `consider their description ("${persona.description.substring(0, 80)}${persona.description.length > 80 ? '...' : ''}")` : 'their role and needs'}
  ${persona.painPoints && persona.painPoints.length > 0 ? `- Incorporate their pain points: ${persona.painPoints.slice(0, 3).join(', ')}${persona.painPoints.length > 3 ? '...' : ''}` : ''}
  ${persona.goals && persona.goals.length > 0 ? `- Align with their goals: ${persona.goals.slice(0, 3).join(', ')}${persona.goals.length > 3 ? '...' : ''}` : ''}
- Focus on the topic: ${topic.name} ${topic.description ? `(${topic.description.substring(0, 80)}${topic.description.length > 80 ? '...' : ''})` : ''}
  ${topic.keywords && topic.keywords.length > 0 ? `- Use relevant keywords: ${topic.keywords.slice(0, 5).join(', ')}` : ''}
- Incorporate the brand's value proposition and services when relevant
  ${brandContext && typeof brandContext === 'object' && brandContext.companyName ? `- Brand focus: ${brandContext.companyName}${brandContext.valueProposition ? ` - ${brandContext.valueProposition.substring(0, 80)}${brandContext.valueProposition.length > 80 ? '...' : ''}` : ''}` : ''}
  ${brandContext && typeof brandContext === 'object' && brandContext.keyServices && brandContext.keyServices.length > 0 ? `- Brand services: ${brandContext.keyServices.slice(0, 3).join(', ')}${brandContext.keyServices.length > 3 ? '...' : ''}` : ''}
- Make prompts natural, conversational (like real user queries)
- CRITICAL DIVERSITY RULES:
  ✓ Each prompt: ABSOLUTELY UNIQUE - no duplicates, no near-duplicates, no similar structures
  ✓ Vary angles, wording, question types, and keywords across ALL prompts
  ✓ Fan out: different use cases, scenarios, buying contexts, phrasings
  ✓ Avoid repetitive patterns - if one prompt uses "Best X for Y", use completely different structure for others
  ✓ Maximum diversity: Every prompt should feel like a different user's search query
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- NO competitor brand mentions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]`;
}

/**
 * Parse prompts from AI response
 */
function parsePromptsFromResponse(content, topic, persona, totalPrompts = 20) {
  return parsePromptsFromResponseModule(content, topic, persona, totalPrompts);
}

/**
 * Legacy parsePromptsFromResponse - kept for reference
 * @deprecated Use the modular version from promptGeneration/parsing
 */
function parsePromptsFromResponseLegacy(content, topic, persona, totalPrompts = 20) {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const promptTexts = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(promptTexts)) {
      throw new Error(`Expected array of prompts, got ${typeof promptTexts}`);
    }

    // IMPROVEMENT: Better validation of prompt count from AI
    // Allow for some flexibility in prompt count (within 10% tolerance)
    const minExpected = Math.floor(totalPrompts * 0.9);
    const maxExpected = Math.ceil(totalPrompts * 1.1);
    
    if (promptTexts.length < minExpected) {
      console.warn(`⚠️  Expected ${totalPrompts} prompts, got only ${promptTexts.length} (${((promptTexts.length / totalPrompts) * 100).toFixed(1)}%). This may cause short combinations.`);
      // If we got significantly fewer (less than 80%), this is a problem
      if (promptTexts.length < totalPrompts * 0.8) {
        throw new Error(`AI returned only ${promptTexts.length} prompts (expected ${totalPrompts}). Response may be incomplete or malformed.`);
      }
    } else if (promptTexts.length > maxExpected) {
      console.warn(`⚠️  Expected ${totalPrompts} prompts, got ${promptTexts.length} (${((promptTexts.length / totalPrompts) * 100).toFixed(1)}%). Trimming to expected count.`);
      // Trim to expected count
      promptTexts = promptTexts.slice(0, totalPrompts);
    }
    
    // Validate that we have at least some prompts
    if (promptTexts.length === 0) {
      throw new Error('AI returned no prompts. Response may be empty or malformed.');
    }

    // ALL prompts are now Commercial type - assign all as Commercial
    const actualPromptCount = promptTexts.length;
    
    // Since all prompts are commercial TOFU, assign all as 'Commercial' type
    const queryTypes = [];
    for (let i = 0; i < actualPromptCount; i++) {
      queryTypes.push('Commercial');
    }

    // Create prompt objects
    const prompts = promptTexts.map((text, index) => ({
      topicId: topic._id,
      topicName: topic.name,
      personaId: persona._id,
      personaType: persona.type,
      promptText: text.trim(),
      promptIndex: index + 1,
      queryType: queryTypes[index]
    }));

    // Calculate distribution counts for logging
    const distribution = {
      Commercial: actualPromptCount,
      Informational: 0,
      Transactional: 0,
      Navigational: 0
    };

    console.log('🔍 Generated prompts for topic-persona combination:', {
      topicId: topic._id,
      topicName: topic.name,
      personaId: persona._id,
      personaType: persona.type,
      promptCount: prompts.length,
      expectedCount: totalPrompts,
      distribution
    });

    return prompts;

  } catch (error) {
    console.error('Error parsing prompts:', error.message);
    console.error('Response content:', content);
    throw new Error('Failed to parse AI response into prompts');
  }
}

// Utility to normalize prompt text (case, punctuation, whitespace)
function normalizePromptText(text) {
  return normalizePromptTextModule(text);
}

/**
 * PHASE 1 OPTIMIZATION: Fast hash function for prompt deduplication
 * Returns a simple integer hash for O(1) duplicate detection
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
function simpleHash(str) {
  return simpleHashModule(str);
}

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar (0 = identical)
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate word-level similarity (Jaccard similarity on word sets)
 * Returns a value between 0 (completely different) and 1 (identical word sets)
 */
function wordSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2)); // Ignore words <= 2 chars
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

/**
 * Enhanced near-duplicate detection with multiple similarity metrics
 * Uses Levenshtein distance, word overlap, and substring matching
 */
function isNearDuplicate(a, b) {
  return isNearDuplicateModule(a, b);
}

/**
 * Legacy isNearDuplicate - kept for reference
 * @deprecated Use the modular version from promptGeneration/deduplication
 */
function isNearDuplicateLegacy(a, b) {
  if (!a || !b) return false;
  
  const normA = normalizePromptText(a);
  const normB = normalizePromptText(b);
  
  // Exact match after normalization
  if (normA === normB) return true;
  
  // Short strings: stricter matching
  if (normA.length < 15 || normB.length < 15) {
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - (distance / maxLen);
    // For short strings, require >85% similarity
    if (similarity > 0.85) return true;
  }
  
  // Substring containment check (major overlap)
  if (normA.length > 20 && normB.length > 20) {
    const shorter = normA.length < normB.length ? normA : normB;
    const longer = normA.length >= normB.length ? normA : normB;
    // If shorter string is mostly contained in longer string
    if (longer.includes(shorter)) {
      // Check if overlap is significant (>= 70% of shorter string)
      const overlapRatio = shorter.length / longer.length;
      if (overlapRatio >= 0.7) return true;
    }
  }
  
  // Word-level similarity check
  const wordSim = wordSimilarity(normA, normB);
  // If >75% of words overlap, consider it a near-duplicate
  if (wordSim > 0.75) return true;
  
  // Levenshtein distance check for longer strings
  if (normA.length >= 20 && normB.length >= 20) {
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - (distance / maxLen);
    // For longer strings, >80% similarity indicates near-duplicate
    if (similarity > 0.80) return true;
  }
  
  return false;
}

/**
 * Check if a prompt has good diversity compared to existing prompts
 * Returns true if prompt is diverse enough, false if too similar
 */
function hasGoodDiversity(promptText, existingPrompts, minDiversity = 0.3) {
  const normPrompt = normalizePromptText(promptText);
  
  for (const existing of existingPrompts) {
    const normExisting = normalizePromptText(existing);
    
    // Calculate word diversity
    const wordSim = wordSimilarity(normPrompt, normExisting);
    if (wordSim > (1 - minDiversity)) {
      return false; // Too similar
    }
    
    // Check structure similarity (same starting words pattern)
    const promptWords = normPrompt.split(/\s+/).slice(0, 3); // First 3 words
    const existingWords = normExisting.split(/\s+/).slice(0, 3);
    const matchingStart = promptWords.filter(w => existingWords.includes(w)).length;
    // If 2+ of first 3 words match, might be too similar structurally
    if (matchingStart >= 2 && promptWords.length >= 2) {
      // But allow if overall word similarity is still low
      if (wordSim > 0.6) return false;
    }
  }
  
  return true;
}

module.exports = {
  generatePrompts,
  normalizePromptText,
  buildSystemPrompt,
  buildUserPrompt,
  parsePromptsFromResponse,
  simpleHash,
  isNearDuplicate,
  sleep
};