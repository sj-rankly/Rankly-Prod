/**
 * Parse prompts from AI response
 */
function parsePromptsFromResponse(content, topic, persona, totalPrompts = 20) {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    let promptTexts = JSON.parse(jsonMatch[0]);

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

module.exports = {
  parsePromptsFromResponse
};


