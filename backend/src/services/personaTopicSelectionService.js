const Persona = require('../models/Persona');
const Topic = require('../models/Topic');

/**
 * PersonaTopicSelectionService
 * 
 * A reusable service for intelligently selecting the most relevant personas and topics
 * for content optimization tasks. This ensures LLM prompts are focused and effective
 * while maintaining comprehensive coverage.
 * 
 * Selection Strategy:
 * 1. Prioritize user-selected items (explicit choices)
 * 2. Fill remaining slots with high-relevance/priority items
 * 3. Ensure diversity and comprehensive coverage
 * 4. Keep totals manageable for LLM context windows
 */
class PersonaTopicSelectionService {
  constructor() {
    // ✅ Configurable limits based on research and best practices
    this.DEFAULT_MAX_PERSONAS = 5; // Ideal: 3-5 for focused multi-role reflection
    this.DEFAULT_MAX_TOPICS = 8;   // Ideal: 5-8 for comprehensive coverage
    
    // Relevance/Priority ordering for sorting
    this.relevanceOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
    this.priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
  }

  /**
   * Select the most relevant personas for a given URL analysis
   * 
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.urlAnalysisId - URL Analysis ID
   * @param {number} [params.maxPersonas] - Maximum personas to select (default: 5)
   * @returns {Promise<Array>} Selected personas with metadata
   */
  async selectPersonas({ userId, urlAnalysisId, maxPersonas = this.DEFAULT_MAX_PERSONAS }) {
    if (!userId || !urlAnalysisId) {
      throw new Error('userId and urlAnalysisId are required for persona selection');
    }

    // ✅ Edge case: Ensure maxPersonas is valid
    const safeMaxPersonas = Math.max(1, Math.min(maxPersonas, 10)); // Min 1, Max 10

    console.log(`🔍 [PersonaSelection] Selecting up to ${safeMaxPersonas} personas for analysis ${urlAnalysisId}`);

    // Step 1: Fetch user-selected personas (highest priority)
    const selectedPersonas = await Persona.find({
      userId,
      urlAnalysisId,
      selected: true,
    }).lean();

    console.log(`📌 [PersonaSelection] Found ${selectedPersonas.length} user-selected personas`);

    // Step 2: Calculate how many additional personas we need
    const remainingSlots = Math.max(0, safeMaxPersonas - selectedPersonas.length);

    // Step 3: Fetch additional high-relevance personas to fill slots
    let additionalPersonas = [];
    if (remainingSlots > 0) {
      additionalPersonas = await Persona.find({
        userId,
        urlAnalysisId,
        selected: false,
      })
        .sort({ 
          createdAt: -1  // Most recent first (assumes newer = more refined)
        })
        .limit(remainingSlots * 2) // Fetch more, then filter by relevance
        .lean();

      // Sort by relevance order
      additionalPersonas.sort((a, b) => {
        const aRelevance = this.relevanceOrder[a.relevance] || 99;
        const bRelevance = this.relevanceOrder[b.relevance] || 99;
        return aRelevance - bRelevance;
      });

      // Take only what we need
      additionalPersonas = additionalPersonas.slice(0, remainingSlots);

      console.log(`➕ [PersonaSelection] Selected ${additionalPersonas.length} additional personas (High: ${additionalPersonas.filter(p => p.relevance === 'High').length}, Medium: ${additionalPersonas.filter(p => p.relevance === 'Medium').length}, Low: ${additionalPersonas.filter(p => p.relevance === 'Low').length})`);
    }

    // Step 4: Combine and ensure selected personas come first
    const allPersonas = [...selectedPersonas, ...additionalPersonas]
      .sort((a, b) => {
        // Selected personas always come first
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        // Then sort by relevance
        const aRelevance = this.relevanceOrder[a.relevance] || 99;
        const bRelevance = this.relevanceOrder[b.relevance] || 99;
        return aRelevance - bRelevance;
      })
      .slice(0, safeMaxPersonas); // Final safety limit

    // Step 5: Transform to clean format
    const personas = allPersonas.map(p => ({
      type: p.type,
      description: p.description,
      painPoints: p.painPoints || [],
      goals: p.goals || [],
      relevance: p.relevance || 'Medium',
      selected: p.selected || false,
      _id: p._id, // Include for tracking
    }));

    console.log(`✅ [PersonaSelection] Final selection: ${personas.length} personas`);
    console.log(`📊 [PersonaSelection] Breakdown: ${personas.map(p => `${p.type} (${p.relevance}${p.selected ? ', selected' : ''})`).join(', ')}`);

    return personas;
  }

  /**
   * Select the most relevant topics for a given URL analysis
   * 
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.urlAnalysisId - URL Analysis ID
   * @param {number} [params.maxTopics] - Maximum topics to select (default: 8)
   * @returns {Promise<Array>} Selected topics with metadata
   */
  async selectTopics({ userId, urlAnalysisId, maxTopics = this.DEFAULT_MAX_TOPICS }) {
    if (!userId || !urlAnalysisId) {
      throw new Error('userId and urlAnalysisId are required for topic selection');
    }

    // ✅ Edge case: Ensure maxTopics is valid
    const safeMaxTopics = Math.max(1, Math.min(maxTopics, 15)); // Min 1, Max 15

    console.log(`🔍 [TopicSelection] Selecting up to ${safeMaxTopics} topics for analysis ${urlAnalysisId}`);

    // Step 1: Fetch user-selected topics (highest priority)
    const selectedTopics = await Topic.find({
      userId,
      urlAnalysisId,
      selected: true,
    }).lean();

    console.log(`📌 [TopicSelection] Found ${selectedTopics.length} user-selected topics`);

    // Step 2: Calculate how many additional topics we need
    const remainingSlots = Math.max(0, safeMaxTopics - selectedTopics.length);

    // Step 3: Fetch additional high-priority topics to fill slots
    let additionalTopics = [];
    if (remainingSlots > 0) {
      additionalTopics = await Topic.find({
        userId,
        urlAnalysisId,
        selected: false,
      })
        .sort({ 
          promptCount: -1, // Topics with more prompts = more tested/refined
          createdAt: -1 
        })
        .limit(remainingSlots * 2) // Fetch more, then filter by priority
        .lean();

      // Sort by priority order
      additionalTopics.sort((a, b) => {
        const aPriority = this.priorityOrder[a.priority] || 99;
        const bPriority = this.priorityOrder[b.priority] || 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        // If same priority, prefer topics with more prompts
        return (b.promptCount || 0) - (a.promptCount || 0);
      });

      // Take only what we need
      additionalTopics = additionalTopics.slice(0, remainingSlots);

      console.log(`➕ [TopicSelection] Selected ${additionalTopics.length} additional topics (High: ${additionalTopics.filter(t => t.priority === 'High').length}, Medium: ${additionalTopics.filter(t => t.priority === 'Medium').length}, Low: ${additionalTopics.filter(t => t.priority === 'Low').length})`);
    }

    // Step 4: Combine and ensure selected topics come first
    const allTopics = [...selectedTopics, ...additionalTopics]
      .sort((a, b) => {
        // Selected topics always come first
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        // Then sort by priority
        const aPriority = this.priorityOrder[a.priority] || 99;
        const bPriority = this.priorityOrder[b.priority] || 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        // If same priority, prefer topics with more prompts
        return (b.promptCount || 0) - (a.promptCount || 0);
      })
      .slice(0, safeMaxTopics); // Final safety limit

    // Step 5: Transform to clean format
    const topics = allTopics.map(t => ({
      name: t.name,
      description: t.description || '',
      keywords: t.keywords || [],
      priority: t.priority || 'Medium',
      selected: t.selected || false,
      promptCount: t.promptCount || 0,
      _id: t._id, // Include for tracking
    }));

    console.log(`✅ [TopicSelection] Final selection: ${topics.length} topics`);
    console.log(`📊 [TopicSelection] Breakdown: ${topics.map(t => `${t.name} (${t.priority}${t.selected ? ', selected' : ''}${t.promptCount > 0 ? `, ${t.promptCount} prompts` : ''})`).join(', ')}`);

    return topics;
  }

  /**
   * Select both personas and topics in one call (convenience method)
   * 
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.urlAnalysisId - URL Analysis ID
   * @param {number} [params.maxPersonas] - Maximum personas to select
   * @param {number} [params.maxTopics] - Maximum topics to select
   * @returns {Promise<Object>} Object with personas and topics arrays
   */
  async selectPersonasAndTopics({ userId, urlAnalysisId, maxPersonas, maxTopics }) {
    console.log(`🎯 [Selection] Starting smart selection for analysis ${urlAnalysisId}`);
    
    const [personas, topics] = await Promise.all([
      this.selectPersonas({ userId, urlAnalysisId, maxPersonas }),
      this.selectTopics({ userId, urlAnalysisId, maxTopics }),
    ]);

    console.log(`✅ [Selection] Complete: ${personas.length} personas, ${topics.length} topics selected`);

    return {
      personas,
      topics,
      metadata: {
        personasCount: personas.length,
        topicsCount: topics.length,
        selectedPersonasCount: personas.filter(p => p.selected).length,
        selectedTopicsCount: topics.filter(t => t.selected).length,
      }
    };
  }

  /**
   * Get statistics about available personas and topics for an analysis
   * (useful for debugging and monitoring)
   * 
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.urlAnalysisId - URL Analysis ID
   * @returns {Promise<Object>} Statistics object
   */
  async getSelectionStats({ userId, urlAnalysisId }) {
    const [
      totalPersonas,
      selectedPersonas,
      totalTopics,
      selectedTopics,
      highRelevancePersonas,
      highPriorityTopics
    ] = await Promise.all([
      Persona.countDocuments({ userId, urlAnalysisId }),
      Persona.countDocuments({ userId, urlAnalysisId, selected: true }),
      Topic.countDocuments({ userId, urlAnalysisId }),
      Topic.countDocuments({ userId, urlAnalysisId, selected: true }),
      Persona.countDocuments({ userId, urlAnalysisId, relevance: 'High' }),
      Topic.countDocuments({ userId, urlAnalysisId, priority: 'High' }),
    ]);

    return {
      personas: {
        total: totalPersonas,
        selected: selectedPersonas,
        highRelevance: highRelevancePersonas,
      },
      topics: {
        total: totalTopics,
        selected: selectedTopics,
        highPriority: highPriorityTopics,
      },
      willUse: {
        personas: Math.min(totalPersonas, this.DEFAULT_MAX_PERSONAS),
        topics: Math.min(totalTopics, this.DEFAULT_MAX_TOPICS),
      }
    };
  }
}

module.exports = new PersonaTopicSelectionService();

