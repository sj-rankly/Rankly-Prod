/**
 * Summary calculation for prompt testing results
 */

/**
 * Calculate summary statistics
 */
function calculateSummary(results) {
  // Filter out null/undefined results
  const validResults = results.filter(r => r !== null && r !== undefined);
  const completed = validResults.filter(r => r.status === 'completed');
  
  console.log(`   📊 [CALC] Valid results: ${validResults.length}, Completed: ${completed.length}`);
  
  if (completed.length === 0) {
    console.log(`   ⚠️  [CALC] No completed tests to summarize`);
    return {
      averageVisibilityScore: 0,
      averageOverallScore: 0,
      brandMentionRate: 0,
      bestPerformingLLM: 'none',
      worstPerformingLLM: 'none',
      llmPerformance: {}
    };
  }
  
  const avgVisibility = completed.reduce((sum, r) => sum + r.scorecard.visibilityScore, 0) / completed.length;
  const avgOverall = completed.reduce((sum, r) => sum + r.scorecard.overallScore, 0) / completed.length;
  const mentionRate = (completed.filter(r => r.scorecard.brandMentioned).length / completed.length) * 100;
  
  // Calculate average score per LLM
  const llmScores = {};
  completed.forEach(r => {
    if (!llmScores[r.llmProvider]) {
      llmScores[r.llmProvider] = [];
    }
    llmScores[r.llmProvider].push(r.scorecard.overallScore);
  });
  
  const llmAverages = {};
  for (const [llm, scores] of Object.entries(llmScores)) {
    llmAverages[llm] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  const sortedLLMs = Object.entries(llmAverages).sort((a, b) => b[1] - a[1]);
  
  return {
    averageVisibilityScore: Math.round(avgVisibility),
    averageOverallScore: Math.round(avgOverall),
    brandMentionRate: Math.round(mentionRate),
    bestPerformingLLM: sortedLLMs[0]?.[0] || 'none',
    worstPerformingLLM: sortedLLMs[sortedLLMs.length - 1]?.[0] || 'none',
    llmPerformance: llmAverages
  };
}

module.exports = {
  calculateSummary
};


