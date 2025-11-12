/**
 * Smart sampling logic for prompt testing
 */

/**
 * Smart sampling: Select a balanced subset of prompts
 * Ensures even distribution across topic×persona combinations
 * @param {Array} prompts - All available prompts
 * @param {number} limit - Maximum number of prompts to select
 * @returns {Array} - Sampled prompts
 */
function samplePrompts(prompts, limit) {
  if (prompts.length <= limit) {
    console.log(`   ℹ️  All ${prompts.length} prompts will be tested (under limit of ${limit})`);
    return prompts;
  }

  // Group prompts by topic×persona combination for balanced sampling
  const promptsByCombination = {};
  prompts.forEach(prompt => {
    const topicId = prompt.topicId?._id || prompt.topicId;
    const personaId = prompt.personaId?._id || prompt.personaId;
    const combinationKey = `${topicId}_${personaId}`;
    
    if (!promptsByCombination[combinationKey]) {
      promptsByCombination[combinationKey] = [];
    }
    promptsByCombination[combinationKey].push(prompt);
  });

  const combinations = Object.keys(promptsByCombination).sort(); // Sort for deterministic order
  const promptsPerCombination = Math.floor(limit / combinations.length);
  const remainder = limit % combinations.length;

  console.log(`   📊 Sampling strategy:`);
  console.log(`      - Total prompts: ${prompts.length}`);
  console.log(`      - Limit: ${limit}`);
  console.log(`      - Topic×Persona combinations: ${combinations.length}`);
  console.log(`      - Per combination: ${promptsPerCombination} (+ ${remainder} for first ${remainder} combinations)`);

  const sampledPrompts = [];

  // Sample evenly from each topic×persona combination
  combinations.forEach((combinationKey, index) => {
    const comboPrompts = promptsByCombination[combinationKey];
    // Add 1 extra to first few combinations to handle remainder
    const sampleCount = index < remainder ? promptsPerCombination + 1 : promptsPerCombination;
    
    // Randomly sample from this combination
    const shuffled = comboPrompts.sort(() => Math.random() - 0.5);
    const sampled = shuffled.slice(0, Math.min(sampleCount, comboPrompts.length));
    
    const topicName = sampled[0]?.topicId?.name || 'Unknown';
    const personaName = sampled[0]?.personaId?.type || 'Unknown';
    console.log(`      - ${topicName} × ${personaName}: ${sampled.length}/${comboPrompts.length} prompts`);
    sampledPrompts.push(...sampled);
  });

  console.log(`   ✅ Final sample: ${sampledPrompts.length} prompts selected`);
  return sampledPrompts;
}

module.exports = {
  samplePrompts
};


