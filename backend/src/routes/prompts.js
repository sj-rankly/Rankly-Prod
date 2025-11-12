const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');
const Prompt = require('../models/Prompt');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
const UrlAnalysis = require('../models/UrlAnalysis');
const { generatePrompts, normalizePromptText } = require('../services/promptGenerationService');
const promptTestingService = require('../services/promptTestingService');
const PromptTest = require('../models/PromptTest');
const router = express.Router();

// JWT Authentication middleware
const { authenticateToken } = require('../middleware/auth');

// Get all prompts for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { topicId, status = 'active', urlAnalysisId } = req.query;
    
    let query = { userId: req.userId };
    if (topicId) query.topicId = topicId;
    if (status) query.status = status;
    if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId; // ✅ Filter by URL analysis if provided

    const prompts = await Prompt.find(query).populate('topicId', 'name');
    
    res.json({
      success: true,
      data: prompts
    });

  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prompts'
    });
  }
});

// Create new prompt
router.post('/', authenticateToken, [
  body('topicId').isMongoId(),
  body('personaId').isMongoId(),
  body('queryType').isIn(['Informational', 'Navigational', 'Commercial', 'Transactional']),
  body('title').trim().notEmpty(),
  body('text').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { topicId, personaId, queryType, title, text, metadata = {} } = req.body;

    // Verify topic belongs to user
    const topic = await Topic.findOne({ _id: topicId, userId: req.userId });
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Verify persona belongs to user
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona not found'
      });
    }

    console.log(`✅ [CREATE PROMPT] topicId: ${topicId}, personaId: ${personaId}, queryType: ${queryType}`);

    // Get urlAnalysisId from topic (both topic and persona should have the same urlAnalysisId)
    const urlAnalysisId = topic.urlAnalysisId || persona.urlAnalysisId || null;

    const prompt = new Prompt({
      userId: req.userId,
      urlAnalysisId: urlAnalysisId, // ✅ Link prompt to URL analysis if available
      topicId,
      personaId,
      queryType,
      title,
      text,
      metadata
    });

    await prompt.save();

    // Update topic prompt count
    topic.promptCount += 1;
    await topic.save();

    res.status(201).json({
      success: true,
      message: 'Prompt created successfully',
      data: prompt
    });

  } catch (error) {
    console.error('Create prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prompt'
    });
  }
});

// Update prompt
router.put('/:id', authenticateToken, [
  body('title').optional().trim().notEmpty(),
  body('text').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const prompt = await Prompt.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      message: 'Prompt updated successfully',
      data: prompt
    });

  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prompt'
    });
  }
});

// Delete prompt
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await Prompt.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Update topic prompt count
    const topic = await Topic.findById(prompt.topicId);
    if (topic) {
      topic.promptCount = Math.max(0, topic.promptCount - 1);
      await topic.save();
    }

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });

  } catch (error) {
    console.error('Delete prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prompt'
    });
  }
});

// Generate prompts using AI (placeholder)
// Generate prompts for all selected topics and personas
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.body; // ✅ Accept urlAnalysisId from request
    
    console.log('🎯 Starting prompt generation for user:', userId);
    console.log('🔗 URL Analysis ID:', urlAnalysisId || 'using latest');

    // ✅ FIX: Use provided urlAnalysisId or fall back to latest (correct syntax)
    let latestAnalysis;
    if (urlAnalysisId) {
      latestAnalysis = await UrlAnalysis.findOne({ _id: urlAnalysisId, userId }).lean();
    } else {
      const analysisList = await UrlAnalysis.find({ userId })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();
      latestAnalysis = analysisList[0] || null;
    }

    if (!latestAnalysis) {
      return res.status(404).json({
        success: false,
        message: urlAnalysisId
          ? 'URL analysis not found for the provided ID'
          : 'No website analysis found. Please analyze your website first.'
      });
    }

    // ✅ FIX: Filter by urlAnalysisId to ensure data isolation
    // Get selected topics (with selected: true) for this specific analysis
    const selectedTopics = await Topic.find({ 
      userId, 
      selected: true,
      urlAnalysisId: latestAnalysis._id // ✅ Filter by analysis
    });

    // Get selected personas (with selected: true) for this specific analysis
    const selectedPersonas = await Persona.find({ 
      userId, 
      selected: true,
      urlAnalysisId: latestAnalysis._id // ✅ Filter by analysis
    });

    // Get competitors for context (filtered by analysis)
    const competitors = await Competitor.find({ 
      userId, 
      selected: true,
      urlAnalysisId: latestAnalysis._id // ✅ Filter by analysis
    });

    if (selectedTopics.length === 0 || selectedPersonas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 1 topic and 1 persona to generate prompts'
      });
    }

    console.log(`📊 Selected: ${selectedTopics.length} topics, ${selectedPersonas.length} personas, ${competitors.length} competitors`);
    console.log(`📊 Brand context: ${latestAnalysis.brandContext.companyName || 'Unknown'}`);

    // Prepare data for prompt generation
    const topics = selectedTopics.map(t => ({
      _id: t._id.toString(),
      name: t.name,
      description: t.description || '',
      keywords: t.keywords || []
    }));

    const personas = selectedPersonas.map(p => ({
      _id: p._id.toString(),
      type: p.type,
      description: p.description || '',
      painPoints: p.painPoints || [],
      goals: p.goals || []
    }));

    const competitorData = competitors.map(c => ({
      name: c.name,
      url: c.url
    }));

    // Generate prompts using AI service
    // Use centralized configuration
    // Removed hyperparameters config dependency
    // Calculate equal prompts per combination to reach ~80 total
    const totalCombinations = selectedTopics.length * selectedPersonas.length;
    // Target ~80 total prompts, so calculate prompts per combination
    // Ensure minimum 5 prompts per combination for quality
    const targetTotal = 80;
    const promptsPerCombination = Math.max(5, Math.floor(targetTotal / totalCombinations));
    // Adjust to ensure we get close to target total
    const actualTotal = promptsPerCombination * totalCombinations;
    
    console.log(`📊 Generating ${promptsPerCombination} prompts per combination`);
    console.log(`   Total combinations: ${totalCombinations} (${selectedTopics.length} topics × ${selectedPersonas.length} personas)`);
    console.log(`   Expected total: ~${actualTotal} prompts (${promptsPerCombination} × ${totalCombinations})`);
    
    const generatedPrompts = await generatePrompts({
      topics,
      personas,
      region: 'Global',
      language: 'English',
      websiteUrl: latestAnalysis.url,
      brandContext: latestAnalysis.brandContext || '',
      // competitors removed - not needed for TOFU queries
      totalPrompts: promptsPerCombination, // This will be used for EACH combination
      options: {
        promptsPerCombination: true // Flag to indicate we want equal per combination
      }
    });

    console.log(`✨ Generated ${generatedPrompts.length} prompts`);

    // Save prompts to database with tracking per combination
    const savedPrompts = [];
    const combinationCounts = {}; // Track how many prompts saved per combination
    const combinationKeys = {}; // Map combination keys to topic/persona objects
    
    // Initialize combination tracking
    for (const topic of selectedTopics) {
      for (const persona of selectedPersonas) {
        const key = `${topic._id}_${persona._id}`;
        combinationCounts[key] = 0;
        combinationKeys[key] = { topic, persona };
      }
    }
    
    // First pass: Save prompts and track per combination
    const skippedPrompts = []; // Track skipped prompts for potential retry
    for (const promptData of generatedPrompts) {
      // TOFU/Commercial strictness: Only allow 'Commercial' queryType
      if (promptData.queryType !== 'Commercial') {
        console.log(`⏩ Skipping non-commercial prompt (queryType: ${promptData.queryType}):`, promptData.promptText);
        continue;
      }
      // Core deduplication (case-insensitive, normalized)
      const topic = selectedTopics.find(t => t._id.toString() === promptData.topicId);
      const persona = selectedPersonas.find(p => p._id.toString() === promptData.personaId);
      if (!topic || !persona) continue;
      
      const combinationKey = `${topic._id}_${persona._id}`;
      
      // Skip if this combination already has enough prompts
      if (combinationCounts[combinationKey] >= promptsPerCombination) {
        skippedPrompts.push(promptData);
        continue;
      }
      
      // ✅ FIX: Check for duplicate prompts within the same analysis
      const normalized = normalizePromptText(promptData.promptText);
      const exists = await Prompt.findOne({
        userId,
        urlAnalysisId: latestAnalysis._id, // ✅ Check duplicates within same analysis
        topicId: topic._id,
        personaId: persona._id,
        queryType: promptData.queryType,
        text: { $regex: new RegExp('^' + normalized + '$', 'i') }
      });
      if (exists) {
        console.log(`⏩ Skipping duplicate prompt for ${topic.name} × ${persona.type}:`, promptData.promptText.substring(0, 50));
        skippedPrompts.push(promptData);
        continue;
      }
      // Save commercial prompt
      const prompt = new Prompt({
        userId,
        urlAnalysisId: latestAnalysis._id, // ✅ Link prompt to the URL analysis
        topicId: topic._id,
        personaId: persona._id,
        title: `${topic.name} × ${persona.type} - ${promptData.queryType}`,
        text: promptData.promptText,
        queryType: promptData.queryType,
        status: 'active', // ✅ Ensure status is active for testing
        metadata: {
          generatedBy: 'ai',
          targetPersonas: [persona.type],
          targetCompetitors: competitorData.map(c => c.name)
        }
      });
      await prompt.save();
      combinationCounts[combinationKey]++;
      savedPrompts.push({
        id: prompt._id,
        topicName: topic.name,
        personaType: persona.type,
        promptText: prompt.text,
        promptIndex: promptData.promptIndex
      });
    }
    
    // Check which combinations are short and log
    console.log(`\n📊 Prompts saved per combination:`);
    const shortCombinations = [];
    for (const [key, count] of Object.entries(combinationCounts)) {
      const { topic, persona } = combinationKeys[key];
      const status = count === promptsPerCombination ? '✅' : '⚠️';
      console.log(`   ${status} ${topic.name} × ${persona.type}: ${count}/${promptsPerCombination} prompts`);
      if (count < promptsPerCombination) {
        shortCombinations.push({ key, topic, persona, needed: promptsPerCombination - count });
      }
    }
    
    // Log short combinations - these may need additional generation in future
    // Note: With 80% over-generation and proper deduplication, this should be rare
    if (shortCombinations.length > 0) {
      console.warn(`\n⚠️  ${shortCombinations.length} combination(s) are short after database deduplication:`);
      for (const combo of shortCombinations) {
        console.warn(`   - ${combo.topic.name} × ${combo.persona.type}: ${combinationCounts[combo.key]}/${promptsPerCombination} prompts (needs ${combo.needed} more)`);
      }
      console.log(`   💡 This may be due to many database duplicates. Consider generating additional prompts for these combinations.`);
    }

    // Update topic prompt counts based on ACTUAL database count, not just savedPrompts
    // This ensures accuracy even if some prompts were skipped
    for (const topic of selectedTopics) {
      const actualCount = await Prompt.countDocuments({ 
        userId, 
        topicId: topic._id,
        status: 'active' // Only count active prompts (excludes archived)
      });
      topic.promptCount = actualCount;
      await topic.save();
      console.log(`   📊 Updated ${topic.name} prompt count to ${actualCount} (from database)`);
    }

    console.log(`💾 Saved ${savedPrompts.length} prompts to database`);

    res.json({
      success: true,
      message: `Successfully generated ${savedPrompts.length} prompts`,
      data: {
        totalPrompts: savedPrompts.length,
        prompts: savedPrompts,
        combinations: {
          topics: topics.length,
          personas: personas.length,
          promptsPerCombination: 5
        }
      }
    });

  } catch (error) {
    console.error('❌ Generate prompts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate prompts'
    });
  }
});

// Test all prompts with LLMs
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.body; // Optional URL analysis ID
    
    console.log('\n' + '='.repeat(70));
    console.log('🧪 [API ENDPOINT] POST /api/prompts/test');
    console.log(`👤 User ID: ${userId}`);
    if (urlAnalysisId) {
      console.log(`🔗 URL Analysis ID: ${urlAnalysisId}`);
    }
    console.log(`⏰ Request time: ${new Date().toISOString()}`);
    console.log('='.repeat(70) + '\n');
    
    // Check if user has any prompts
    console.log('🔍 [VALIDATION] Checking for existing prompts...');
    const promptCount = await Prompt.countDocuments({ 
      userId, 
      status: 'active' 
    });
    
    console.log(`✅ [VALIDATION] Found ${promptCount} active prompts`);
    
    if (promptCount === 0) {
      console.error('❌ [VALIDATION] No prompts found - aborting test');
      return res.status(400).json({
        success: false,
        message: 'No prompts found to test. Please generate prompts first.'
      });
    }
    
    // Use centralized configuration
    // Removed hyperparameters config dependency
    const maxPromptsToTest = 5; // Reduced from 20 to 5 for faster testing/debugging
    
    console.log(`📊 [START] Testing prompts across 4 LLMs (limit: ${maxPromptsToTest})...`);
    const testStartTime = Date.now();
    
    // Start testing (this will take time)
    const results = await promptTestingService.testAllPrompts(userId, {
      batchSize: 5, // Process 5 prompts at a time
      testLimit: maxPromptsToTest,  // Use centralized configuration
      urlAnalysisId: urlAnalysisId  // Pass URL analysis ID if provided
    });
    
    const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ [API RESPONSE] Testing complete');
    console.log(`⏱️  Total duration: ${testDuration}s`);
    console.log(`📊 Results: ${results.completedTests}/${results.totalTests} successful`);
    console.log('='.repeat(70) + '\n');
    
    res.json({
      success: true,
      message: `Testing completed: ${results.totalTests} total tests`,
      data: results
    });
    
  } catch (error) {
    console.error('\n' + '❌'.repeat(35));
    console.error('❌ [API ERROR] Prompt testing failed');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('❌'.repeat(35) + '\n');
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test prompts'
    });
  }
});

// Get test results for a specific prompt
router.get('/:promptId/tests', authenticateToken, async (req, res) => {
  try {
    const { promptId } = req.params;
    const userId = req.userId;
    
    // Verify prompt belongs to user
    const prompt = await Prompt.findOne({ _id: promptId, userId });
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }
    
    // ✅ FIX: Filter by urlAnalysisId if provided to ensure data isolation
    const { urlAnalysisId } = req.query;
    const testQuery = { promptId, userId };
    if (urlAnalysisId) {
      testQuery.urlAnalysisId = urlAnalysisId;
      console.log(`🔍 [PROMPTS/TESTS] Filtering by urlAnalysisId: ${urlAnalysisId}`);
    } else {
      console.warn('⚠️ [PROMPTS/TESTS] No urlAnalysisId provided, may mix data from multiple analyses');
    }
    
    // Get all test results for this prompt (filtered by urlAnalysisId)
    const tests = await PromptTest.find(testQuery)
      .sort({ testedAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: {
        prompt: {
          id: prompt._id,
          text: prompt.text,
          queryType: prompt.queryType
        },
        tests,
        summary: {
          totalTests: tests.length,
          averageScore: tests.reduce((sum, t) => sum + t.scorecard.overallScore, 0) / tests.length || 0,
          brandMentionRate: (tests.filter(t => t.scorecard.brandMentioned).length / tests.length * 100) || 0
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get test results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test results'
    });
  }
});

// Search prompt tests by prompt text and LLM provider
router.post('/tests/search', authenticateToken, async (req, res) => {
  try {
    const { promptText, llmProvider, urlAnalysisId } = req.body;
    const userId = req.userId;
    
    if (!promptText || !llmProvider) {
      return res.status(400).json({
        success: false,
        message: 'promptText and llmProvider are required'
      });
    }
    
    console.log(`🔍 [PROMPT TEST SEARCH] Searching for prompt: "${promptText.substring(0, 50)}..." with provider: ${llmProvider}`);
    
    // ✅ FIX: Filter by urlAnalysisId if provided
    const searchQuery = {
      userId,
      promptText: { $regex: promptText, $options: 'i' }, // Case-insensitive search
      llmProvider: llmProvider.toLowerCase(),
      status: 'completed'
    };
    
    if (urlAnalysisId) {
      searchQuery.urlAnalysisId = urlAnalysisId;
      console.log(`🔍 [PROMPT TEST SEARCH] Filtering by urlAnalysisId: ${urlAnalysisId}`);
    } else {
      console.warn('⚠️ [PROMPT TEST SEARCH] No urlAnalysisId provided, searching across all analyses');
    }
    
    // Search for prompt tests that match the prompt text and LLM provider
    const promptTests = await PromptTest.find(searchQuery)
    .populate('promptId', 'text queryType')
    .sort({ testedAt: -1 })
    .limit(5) // Limit to 5 results
    .lean();
    
    console.log(`✅ [PROMPT TEST SEARCH] Found ${promptTests.length} matching tests`);
    
    res.json({
      success: true,
      data: promptTests
    });
    
  } catch (error) {
    console.error('❌ Prompt test search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search prompt tests'
    });
  }
});

// Get all test results for user (for dashboard analytics)
router.get('/tests/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 100, llmProvider, status = 'completed', urlAnalysisId } = req.query;
    
    // ✅ FIX: Filter by urlAnalysisId if provided
    let query = { userId, status };
    if (llmProvider) {
      query.llmProvider = llmProvider;
    }
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
      console.log(`🔍 [PROMPTS/TESTS/ALL] Filtering by urlAnalysisId: ${urlAnalysisId}`);
    } else {
      console.warn('⚠️ [PROMPTS/TESTS/ALL] No urlAnalysisId provided, returning all tests (may mix data from multiple analyses)');
    }
    
    const tests = await PromptTest.find(query)
      .sort({ testedAt: -1 })
      .limit(parseInt(limit))
      .populate('promptId', 'text queryType')
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .lean();
    
    // Calculate aggregate statistics
    const stats = {
      totalTests: tests.length,
      averageVisibilityScore: 0,
      averageOverallScore: 0,
      brandMentionRate: 0,
      llmPerformance: {}
    };
    
    if (tests.length > 0) {
      stats.averageVisibilityScore = Math.round(
        tests.reduce((sum, t) => sum + t.scorecard.visibilityScore, 0) / tests.length
      );
      stats.averageOverallScore = Math.round(
        tests.reduce((sum, t) => sum + t.scorecard.overallScore, 0) / tests.length
      );
      stats.brandMentionRate = Math.round(
        (tests.filter(t => t.scorecard.brandMentioned).length / tests.length) * 100
      );
      
      // Calculate per-LLM performance
      const llmGroups = {};
      tests.forEach(t => {
        if (!llmGroups[t.llmProvider]) {
          llmGroups[t.llmProvider] = [];
        }
        llmGroups[t.llmProvider].push(t.scorecard.overallScore);
      });
      
      for (const [llm, scores] of Object.entries(llmGroups)) {
        stats.llmPerformance[llm] = {
          averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          testCount: scores.length
        };
      }
    }

    res.json({
      success: true,
      data: {
        tests,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Get all tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test results'
    });
  }
});

// Get prompts tab data with topics/personas and individual prompts
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.query; // Get analysis ID from query parameter
    
    console.log('📊 [PROMPTS DASHBOARD] Fetching prompts tab data for user:', userId);
    console.log('📊 [PROMPTS DASHBOARD] Requested analysis ID:', urlAnalysisId);
    
    // Get the specific analysis or fallback to latest
    let analysis;
    if (urlAnalysisId) {
      analysis = await UrlAnalysis.findOne({ userId, _id: urlAnalysisId });
      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found'
        });
      }
    } else {
      // ✅ FIX: Fallback to latest analysis if no ID provided (correct syntax)
      const analysisList = await UrlAnalysis.find({ userId })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();
      analysis = analysisList[0] || null;
    }
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'No analysis found'
      });
    }
    
    const brandName = analysis?.brandContext?.companyName || 'Unknown Brand';
    const brandUrl = analysis?.url || null; // Get brand URL from UrlAnalysis
    // Use EXACT same normalization as metricsAggregationService.js line 358 for consistency
    const brandId = brandName.toLowerCase().replace(/\s+/g, '-');
    
    console.log(`✅ [PROMPTS DASHBOARD] Brand name: ${brandName}, brandId: ${brandId}`);
    console.log(`🔍 [PROMPTS DASHBOARD] Brand URL: ${brandUrl}`);
    console.log(`🔍 [PROMPTS DASHBOARD] Looking for brandId in metrics: ${brandId}`);
    
    // Helper function to batch fetch competitor URLs
    async function getCompetitorUrlsMap(userId, urlAnalysisId, competitorNames) {
      if (!competitorNames || competitorNames.length === 0) {
        return new Map();
      }
      
      try {
        const query = {
          userId: userId,
          name: { $in: competitorNames }
        };
        
        if (urlAnalysisId) {
          query.urlAnalysisId = urlAnalysisId;
        }
        
        const competitors = await Competitor.find(query).select('name url').lean();
        const urlMap = new Map();
        competitors.forEach(comp => {
          if (comp.url) {
            urlMap.set(comp.name, comp.url);
          }
        });
        return urlMap;
      } catch (error) {
        console.error('⚠️ [getCompetitorUrlsMap] Error fetching competitor URLs:', error);
        return new Map();
      }
    }
    
    // Helper functions for mathematical calculations with edge case handling
    const calculateResponseLevelMetrics = (test) => {
      // Calculate visibility score for this response (brand mentioned = 100%, not mentioned = 0%)
      const visibilityScore = test.scorecard?.brandMentioned ? 100 : 0;
      
      // Calculate depth of mention from brandMetrics data
      let depthOfMention = 0;
      if (test.brandMetrics && test.brandMetrics.length > 0 && test.responseMetadata) {
        const brandMetric = test.brandMetrics.find(bm => bm.brandName === brandName);
        if (brandMetric && brandMetric.totalWordCount && test.responseMetadata.totalWords) {
          // Edge case: prevent division by zero
          depthOfMention = test.responseMetadata.totalWords > 0 
            ? (brandMetric.totalWordCount / test.responseMetadata.totalWords) * 100 
            : 0;
        }
      }
      
      // Calculate average position (brand position from scorecard)
      const avgPosition = test.scorecard?.brandPosition || 0;
      
      // Calculate citation share for this response
      let citationShare = 0;
      if (test.scorecard?.totalCitations && test.scorecard?.totalCitations > 0) {
        citationShare = (test.scorecard.brandCitations / test.scorecard.totalCitations) * 100;
      }
      
      return {
        visibilityScore,
        depthOfMention,
        avgPosition,
        citationShare,
        totalCitations: test.scorecard?.totalCitations || 0,
        brandCitations: test.scorecard?.brandCitations || 0
      };
    };
    
    const calculateAverage = (values) => {
      // Edge case: empty array
      if (!values || values.length === 0) return 0;
      
      // Filter out invalid values (null, undefined, NaN)
      const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
      
      // Edge case: no valid values
      if (validValues.length === 0) return 0;
      
      const sum = validValues.reduce((acc, val) => acc + val, 0);
      return Math.round((sum / validValues.length) * 100) / 100; // Round to 2 decimal places
    };
    
    const calculateBrandMentionRate = (responseMetrics) => {
      // Edge case: empty array
      if (!responseMetrics || responseMetrics.length === 0) return 0;
      
      const mentionedCount = responseMetrics.filter(rm => rm.visibilityScore > 0).length;
      return Math.round((mentionedCount / responseMetrics.length) * 100);
    };

    const calculatePromptRanks = (prompts) => {
      if (!prompts || prompts.length === 0) return prompts;
      
      // Sort prompts by different metrics to calculate ranks
      const sortedByVisibility = [...prompts].sort((a, b) => b.metrics.visibilityScore - a.metrics.visibilityScore);
      const sortedByDepth = [...prompts].sort((a, b) => b.metrics.depthOfMention - a.metrics.depthOfMention);
      const sortedByPosition = [...prompts].sort((a, b) => a.metrics.avgPosition - b.metrics.avgPosition);
      const sortedByCitation = [...prompts].sort((a, b) => b.metrics.citationShare - a.metrics.citationShare);
      
      // Add ranks to each prompt
      return prompts.map(prompt => {
        const visibilityRank = sortedByVisibility.findIndex(p => p.id === prompt.id) + 1;
        const depthRank = sortedByDepth.findIndex(p => p.id === prompt.id) + 1;
        const positionRank = sortedByPosition.findIndex(p => p.id === prompt.id) + 1;
        const citationRank = sortedByCitation.findIndex(p => p.id === prompt.id) + 1;
        
        return {
          ...prompt,
          metrics: {
            ...prompt.metrics,
            visibilityRank,
            depthRank,
            avgPositionRank: positionRank,
            citationShareRank: citationRank
          }
        };
      });
    };
    
    // Get only SELECTED topics and personas for the specified analysis
    const topics = await Topic.find({ userId, urlAnalysisId: analysis._id, selected: true }).lean();
    const personas = await Persona.find({ userId, urlAnalysisId: analysis._id, selected: true }).lean();
    
    // Get aggregated metrics for topics and personas for the specified analysis
    const AggregatedMetrics = require('../models/AggregatedMetrics');
    const topicMetrics = await AggregatedMetrics.find({ 
      userId, 
      scope: 'topic',
      urlAnalysisId: analysis._id
    }).lean();
    
    const personaMetrics = await AggregatedMetrics.find({ 
      userId, 
      scope: 'persona',
      urlAnalysisId: analysis._id
    }).lean();
    
    // Get individual prompt test results for metrics for the specified analysis
    const promptTests = await PromptTest.find({ 
      userId, 
      status: 'completed',
      urlAnalysisId: analysis._id
    })
    .populate('promptId', 'text queryType topicId personaId')
    .populate('topicId', 'name')
    .populate('personaId', 'type')
    .lean();
    
    // Process topics data using existing calculated metrics from aggregatedmetrics
    const processedTopics = await Promise.all(topics.map(async (topic) => {
      // Find the aggregated metrics for this topic (scope: 'topic')
      const topicAggregatedMetrics = topicMetrics.find(m => m.scopeValue === topic.name);
      
      // Debug: Log available brandIds if metrics found
      if (topicAggregatedMetrics && topicAggregatedMetrics.brandMetrics) {
        const availableBrandIds = topicAggregatedMetrics.brandMetrics.map(bm => bm.brandId);
        console.log(`🔍 [PROMPTS DASHBOARD] Topic "${topic.name}": Looking for brandId "${brandId}", available:`, availableBrandIds);
      }
      
      // Try exact match first, then fallback to brandName match if brandId doesn't match
      let brandMetrics = topicAggregatedMetrics?.brandMetrics?.find(bm => bm.brandId === brandId);
      if (!brandMetrics && topicAggregatedMetrics?.brandMetrics) {
        // Fallback: try matching by brandName (case-insensitive)
        brandMetrics = topicAggregatedMetrics.brandMetrics.find(bm => 
          bm.brandName && bm.brandName.toLowerCase().trim() === brandName.toLowerCase().trim()
        );
        if (brandMetrics) {
          console.log(`✅ [PROMPTS DASHBOARD] Found brandMetrics for topic "${topic.name}" using brandName fallback`);
        }
      }
      
      if (!brandMetrics && topicAggregatedMetrics) {
        console.log(`⚠️ [PROMPTS DASHBOARD] No brandMetrics found for topic "${topic.name}" with brandId "${brandId}" or brandName "${brandName}"`);
        console.log(`   Available brandNames:`, topicAggregatedMetrics.brandMetrics.map(bm => bm.brandName));
      }
      
      // Get all prompt tests for this topic to group by prompt
      const topicPromptTests = promptTests.filter(test => 
        test.topicId && test.topicId.name === topic.name
      );
      
      // Extract all unique competitors mentioned across all tests for this topic
      const allCompetitorNames = new Set();
      topicPromptTests.forEach(test => {
        if (Array.isArray(test.brandMetrics)) {
          test.brandMetrics.forEach(bm => {
            // Competitors are brands that are mentioned but not the owner
            if (bm.mentioned && bm.isOwner === false) {
              allCompetitorNames.add(bm.brandName);
            }
          });
        }
      });
      
      // Batch fetch competitor URLs for this topic
      const competitorUrlMap = await getCompetitorUrlsMap(userId, analysis._id.toString(), Array.from(allCompetitorNames));
      
      // Group by prompt ID to aggregate response-level metrics across LLMs
      const promptGroups = {};
      topicPromptTests.forEach(test => {
        const promptId = test.promptId?._id?.toString();
        if (!promptId) return;
        
        if (!promptGroups[promptId]) {
          promptGroups[promptId] = {
            prompt: test.promptId,
            tests: [],
            responseMetrics: []
          };
        }
        
        promptGroups[promptId].tests.push(test);
        
        // Calculate response-level metrics for this LLM test
        const responseMetrics = calculateResponseLevelMetrics(test);
        promptGroups[promptId].responseMetrics.push(responseMetrics);
      });
      
      // Calculate aggregated metrics for each unique prompt
      const aggregatedPrompts = Object.values(promptGroups).map(group => {
        const responseMetrics = group.responseMetrics;
        
        // Extract unique brands mentioned in this specific prompt across all tests (brands + competitors)
        const promptBrandNames = new Set();
        group.tests.forEach(test => {
          if (Array.isArray(test.brandMetrics)) {
            test.brandMetrics.forEach(bm => {
              // Include ALL mentioned brands (both user's brand and competitors)
              if (bm.mentioned) {
                promptBrandNames.add(bm.brandName);
              }
            });
          }
        });
        
        // Build mentionedBrands array with URLs (includes both brands and competitors)
        // Add brand URL if the brand name matches the user's brand
        const mentionedBrands = Array.from(promptBrandNames).map(name => ({
          name: name,
          url: name.toLowerCase() === brandName.toLowerCase() ? brandUrl : competitorUrlMap.get(name) || null,
          isOwner: name.toLowerCase() === brandName.toLowerCase()
        }));
        
        // Calculate averages across all LLM responses for this prompt
        const avgVisibilityScore = calculateAverage(responseMetrics.map(rm => rm.visibilityScore));
        const avgDepthOfMention = calculateAverage(responseMetrics.map(rm => rm.depthOfMention));
        const avgPosition = calculateAverage(responseMetrics.map(rm => rm.avgPosition));
        const avgCitationShare = calculateAverage(responseMetrics.map(rm => rm.citationShare));
        const brandMentionRate = calculateBrandMentionRate(responseMetrics);
        
        return {
          id: group.prompt._id,
          text: group.prompt.text || 'N/A',
          queryType: group.prompt.queryType || 'N/A',
          totalTests: responseMetrics.length,
          mentionedBrands: mentionedBrands,
          // Keep mentionedCompetitors for backward compatibility
          mentionedCompetitors: mentionedBrands.filter(b => !b.isOwner),
          metrics: {
            visibilityScore: avgVisibilityScore,
            depthOfMention: avgDepthOfMention,
            avgPosition: avgPosition,
            brandMentioned: brandMentionRate > 0,
            brandMentionRate: brandMentionRate,
            citationShare: avgCitationShare,
            totalCitations: responseMetrics.reduce((sum, rm) => sum + rm.totalCitations, 0),
            brandCitations: responseMetrics.reduce((sum, rm) => sum + rm.brandCitations, 0)
          }
        };
      });
      
      // Calculate ranks for individual prompts within this topic
      const rankedPrompts = calculatePromptRanks(aggregatedPrompts);
      
      return {
        id: topic._id,
        name: topic.name,
        type: 'topic',
        totalPrompts: rankedPrompts.length,
        metrics: {
          visibilityScore: brandMetrics?.visibilityScore || 0,
          visibilityRank: brandMetrics?.visibilityRank || 0,
          depthOfMention: brandMetrics?.depthOfMention || 0,
          depthRank: brandMetrics?.depthRank || 0,
          avgPosition: brandMetrics?.avgPosition || 0,
          avgPositionRank: brandMetrics?.avgPositionRank || 0,
          citationShare: brandMetrics?.citationShare || 0,
          citationShareRank: brandMetrics?.citationShareRank || 0
        },
        prompts: rankedPrompts
      };
    }));
    
    // Process personas data using existing calculated metrics from aggregatedmetrics
    const processedPersonas = await Promise.all(personas.map(async (persona) => {
      // Find the aggregated metrics for this persona (scope: 'persona')
      const personaAggregatedMetrics = personaMetrics.find(m => m.scopeValue === persona.type);
      
      // Debug: Log available brandIds if metrics found
      if (personaAggregatedMetrics && personaAggregatedMetrics.brandMetrics) {
        const availableBrandIds = personaAggregatedMetrics.brandMetrics.map(bm => bm.brandId);
        console.log(`🔍 [PROMPTS DASHBOARD] Persona "${persona.type}": Looking for brandId "${brandId}", available:`, availableBrandIds);
      }
      
      // Try exact match first, then fallback to brandName match if brandId doesn't match
      let brandMetrics = personaAggregatedMetrics?.brandMetrics?.find(bm => bm.brandId === brandId);
      if (!brandMetrics && personaAggregatedMetrics?.brandMetrics) {
        // Fallback: try matching by brandName (case-insensitive)
        brandMetrics = personaAggregatedMetrics.brandMetrics.find(bm => 
          bm.brandName && bm.brandName.toLowerCase().trim() === brandName.toLowerCase().trim()
        );
        if (brandMetrics) {
          console.log(`✅ [PROMPTS DASHBOARD] Found brandMetrics for persona "${persona.type}" using brandName fallback`);
        }
      }
      
      if (!brandMetrics && personaAggregatedMetrics) {
        console.log(`⚠️ [PROMPTS DASHBOARD] No brandMetrics found for persona "${persona.type}" with brandId "${brandId}" or brandName "${brandName}"`);
        console.log(`   Available brandNames:`, personaAggregatedMetrics.brandMetrics.map(bm => bm.brandName));
      }
      
      // Get all prompt tests for this persona to group by prompt
      const personaPromptTests = promptTests.filter(test => 
        test.personaId && test.personaId.type === persona.type
      );
      
      // Extract all unique competitors mentioned across all tests for this persona
      const allCompetitorNames = new Set();
      personaPromptTests.forEach(test => {
        if (Array.isArray(test.brandMetrics)) {
          test.brandMetrics.forEach(bm => {
            // Competitors are brands that are mentioned but not the owner
            if (bm.mentioned && bm.isOwner === false) {
              allCompetitorNames.add(bm.brandName);
            }
          });
        }
      });
      
      // Batch fetch competitor URLs for this persona
      const competitorUrlMap = await getCompetitorUrlsMap(userId, analysis._id.toString(), Array.from(allCompetitorNames));
      
      // Group by prompt ID to aggregate response-level metrics across LLMs
      const promptGroups = {};
      personaPromptTests.forEach(test => {
        const promptId = test.promptId?._id?.toString();
        if (!promptId) return;
        
        if (!promptGroups[promptId]) {
          promptGroups[promptId] = {
            prompt: test.promptId,
            tests: [],
            responseMetrics: []
          };
        }
        
        promptGroups[promptId].tests.push(test);
        
        // Calculate response-level metrics for this LLM test
        const responseMetrics = calculateResponseLevelMetrics(test);
        promptGroups[promptId].responseMetrics.push(responseMetrics);
      });
      
      // Calculate aggregated metrics for each unique prompt
      const aggregatedPrompts = Object.values(promptGroups).map(group => {
        const responseMetrics = group.responseMetrics;
        
        // Extract unique brands mentioned in this specific prompt across all tests (brands + competitors)
        const promptBrandNames = new Set();
        group.tests.forEach(test => {
          if (Array.isArray(test.brandMetrics)) {
            test.brandMetrics.forEach(bm => {
              // Include ALL mentioned brands (both user's brand and competitors)
              if (bm.mentioned) {
                promptBrandNames.add(bm.brandName);
              }
            });
          }
        });
        
        // Build mentionedBrands array with URLs (includes both brands and competitors)
        // Add brand URL if the brand name matches the user's brand
        const mentionedBrands = Array.from(promptBrandNames).map(name => ({
          name: name,
          url: name.toLowerCase() === brandName.toLowerCase() ? brandUrl : competitorUrlMap.get(name) || null,
          isOwner: name.toLowerCase() === brandName.toLowerCase()
        }));
        
        // Calculate averages across all LLM responses for this prompt
        const avgVisibilityScore = calculateAverage(responseMetrics.map(rm => rm.visibilityScore));
        const avgDepthOfMention = calculateAverage(responseMetrics.map(rm => rm.depthOfMention));
        const avgPosition = calculateAverage(responseMetrics.map(rm => rm.avgPosition));
        const avgCitationShare = calculateAverage(responseMetrics.map(rm => rm.citationShare));
        const brandMentionRate = calculateBrandMentionRate(responseMetrics);
        
        return {
          id: group.prompt._id,
          text: group.prompt.text || 'N/A',
          queryType: group.prompt.queryType || 'N/A',
          totalTests: responseMetrics.length,
          mentionedBrands: mentionedBrands,
          // Keep mentionedCompetitors for backward compatibility
          mentionedCompetitors: mentionedBrands.filter(b => !b.isOwner),
          metrics: {
            visibilityScore: avgVisibilityScore,
            depthOfMention: avgDepthOfMention,
            avgPosition: avgPosition,
            brandMentioned: brandMentionRate > 0,
            brandMentionRate: brandMentionRate,
            citationShare: avgCitationShare,
            totalCitations: responseMetrics.reduce((sum, rm) => sum + rm.totalCitations, 0),
            brandCitations: responseMetrics.reduce((sum, rm) => sum + rm.brandCitations, 0)
          }
        };
      });
      
      // Calculate ranks for individual prompts within this persona
      const rankedPrompts = calculatePromptRanks(aggregatedPrompts);
      
      return {
        id: persona._id,
        name: persona.type,
        type: 'persona',
        totalPrompts: rankedPrompts.length,
        metrics: {
          visibilityScore: brandMetrics?.visibilityScore || 0,
          visibilityRank: brandMetrics?.visibilityRank || 0,
          depthOfMention: brandMetrics?.depthOfMention || 0,
          depthRank: brandMetrics?.depthRank || 0,
          avgPosition: brandMetrics?.avgPosition || 0,
          avgPositionRank: brandMetrics?.avgPositionRank || 0,
          citationShare: brandMetrics?.citationShare || 0,
          citationShareRank: brandMetrics?.citationShareRank || 0
        },
        prompts: rankedPrompts
      };
    }));
    
    // Combine and sort all items
    const allItems = [...processedTopics, ...processedPersonas]
      .filter(item => item.totalPrompts > 0) // Only show items with prompts
      .sort((a, b) => b.metrics.visibilityScore - a.metrics.visibilityScore);
    
    // FIXED: Count unique prompts to avoid double-counting (prompts appear in both topics and personas)
    // Since prompts belong to topic×persona combinations, they appear in both topic and persona views
    // We need to count unique prompts across all items, not sum the counts
    const uniquePromptIds = new Set();
    allItems.forEach(item => {
      item.prompts.forEach(prompt => {
        uniquePromptIds.add(prompt.id.toString());
      });
    });
    const totalPrompts = uniquePromptIds.size; // Count unique prompts
    
    console.log(`✅ [PROMPTS DASHBOARD] Found ${allItems.length} items with ${totalPrompts} unique prompts`);
    console.log(`📊 [PROMPTS DASHBOARD] Breakdown: ${processedTopics.filter(t => t.totalPrompts > 0).length} topics, ${processedPersonas.filter(p => p.totalPrompts > 0).length} personas`);
    
    res.json({
      success: true,
      data: {
        items: allItems,
        summary: {
          totalPrompts,
          totalTopics: processedTopics.filter(t => t.totalPrompts > 0).length,
          totalPersonas: processedPersonas.filter(p => p.totalPrompts > 0).length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [PROMPTS DASHBOARD] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prompts dashboard data'
    });
  }
});

// Get detailed prompt analysis with LLM responses
router.get('/details/:promptId', authenticateToken, async (req, res) => {
  try {
    const { promptId } = req.params;
    const userId = req.userId;

    console.log(`📊 [PROMPT DETAILS] Fetching prompt details for ${promptId}`);

    // Find the prompt with populated topic
    const prompt = await Prompt.findById(promptId).populate('topicId');
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // ✅ FIX: Get the brand name from the latest URL analysis for this user (correct syntax)
    const analysisList = await UrlAnalysis.find({ userId })
      .sort({ analysisDate: -1 })
      .limit(1)
      .lean();
    const latestAnalysis = analysisList[0] || null;
    
    const brandName = latestAnalysis?.brandContext?.companyName || 'Unknown Brand';
    const brandUrl = latestAnalysis?.url || null; // ✅ FIX: Get user's brand URL from UrlAnalysis
    const brandId = brandName.toLowerCase().replace(/[^a-z0-9®]/g, '-').replace(/-+/g, '-').replace(/-$/, '');

    console.log(`✅ [PROMPT DETAILS] Brand name: ${brandName}, brandId: ${brandId}`);
    console.log(`🔍 [PROMPT DETAILS] Brand URL: ${brandUrl}`);

    // ✅ FIX: Get competitor URLs map (like in /dashboard endpoint)
    const Competitor = require('../models/Competitor');
    const urlAnalysisId = latestAnalysis?._id;
    
    // ✅ FIX: Filter by urlAnalysisId if available to ensure data isolation
    const allBrandNames = new Set();
    const promptTestQuery = { 
      userId, 
      promptId 
    };
    
    // Use urlAnalysisId from latestAnalysis if available
    if (urlAnalysisId) {
      promptTestQuery.urlAnalysisId = urlAnalysisId;
      console.log(`🔍 [PROMPTS/BRAND-NAMES] Filtering by urlAnalysisId: ${urlAnalysisId}`);
    } else {
      console.warn('⚠️ [PROMPTS/BRAND-NAMES] No urlAnalysisId available, may mix data from multiple analyses');
    }
    
    const promptTests = await PromptTest.find(promptTestQuery)
    .populate('topicId')
    .populate('personaId')
    .lean();
    
    promptTests.forEach(test => {
      if (Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          if (bm.mentioned && bm.brandName) {
            allBrandNames.add(bm.brandName);
          }
        });
      }
    });
    
    // Fetch competitor URLs
    const competitorUrlMap = new Map();
    if (urlAnalysisId && allBrandNames.size > 0) {
      const query = {
        userId: userId,
        selected: true,
        name: { $in: Array.from(allBrandNames) }
      };
      query.urlAnalysisId = urlAnalysisId;
      
      const competitors = await Competitor.find(query).select('name url').lean();
      competitors.forEach(comp => {
        if (comp.url) {
          competitorUrlMap.set(comp.name, comp.url);
        }
      });
    }
    
    // Add user's brand URL to map
    if (brandName && brandUrl) {
      competitorUrlMap.set(brandName, brandUrl);
    }

    console.log(`✅ [PROMPT DETAILS] Found ${promptTests.length} tests for prompt: ${prompt.text}`);
    console.log(`✅ [PROMPT DETAILS] URL map size: ${competitorUrlMap.size}`);

    // Group responses by platform
    const platformResponses = {};
    const platformNames = {
      'openai': 'OpenAI',
      'claude': 'Claude', 
      'perplexity': 'Perplexity',
      'gemini': 'Gemini'
    };
    
    promptTests.forEach(test => {
      const platformName = platformNames[test.llmProvider] || test.llmProvider;

      // ✅ FIX: Extract mentioned brands/competitors with URLs (like /dashboard endpoint)
      let mentionedBrands = [];
      let mentionedCompetitors = [];
      if (Array.isArray(test.brandMetrics)) {
        // Build brand objects with URLs (like /dashboard endpoint)
        const brandObjects = test.brandMetrics
          .filter(bm => bm.mentioned && bm.isOwner !== false)
          .map(bm => ({
            name: bm.brandName,
            url: bm.brandName.toLowerCase() === brandName.toLowerCase() ? brandUrl : competitorUrlMap.get(bm.brandName) || null,
            isOwner: bm.brandName.toLowerCase() === brandName.toLowerCase()
          }));
        mentionedBrands = brandObjects;
        
        // Build competitor objects with URLs
        const competitorObjects = test.brandMetrics
          .filter(bm => bm.mentioned && bm.isOwner === false)
          .map(bm => ({
            name: bm.brandName,
            url: competitorUrlMap.get(bm.brandName) || null,
            isOwner: false
          }));
        mentionedCompetitors = competitorObjects;
      }

      if (!platformResponses[platformName]) {
        platformResponses[platformName] = {
          platform: platformName,
          response: test.rawResponse || 'No response available',
          mentionedEntities: {
            brands: mentionedBrands,
            competitors: mentionedCompetitors
          },
          metrics: test.scorecard || {}
        };
      }
    });

    // Calculate aggregated metrics for this prompt
    const aggregatedMetrics = {
      visibilityScore: 0,
      depthOfMention: 0,
      avgPosition: 0,
      brandMentioned: false,
      brandMentionRate: 0,
      citationShare: 0,
      totalCitations: 0,
      brandCitations: 0
    };

    // Aggregate metrics from all tests
    if (promptTests.length > 0) {
      const totalTests = promptTests.length;
      let brandMentionCount = 0;
      let totalCitations = 0;
      let brandCitations = 0;

      promptTests.forEach(test => {
        if (test.scorecard) {
          aggregatedMetrics.visibilityScore += (test.scorecard.brandMentioned ? 100 : 0);
          aggregatedMetrics.depthOfMention += (test.scorecard.depthOfMention || 0);
          aggregatedMetrics.avgPosition += (test.scorecard.averagePosition || 0);
          
          if (test.scorecard.brandMentioned) {
            brandMentionCount++;
          }
          
          totalCitations += (test.scorecard.totalCitations || 0);
          brandCitations += (test.scorecard.brandCitations || 0);
        }
      });

      // Calculate averages
      aggregatedMetrics.visibilityScore = Math.round(aggregatedMetrics.visibilityScore / totalTests);
      aggregatedMetrics.depthOfMention = Math.round(aggregatedMetrics.depthOfMention / totalTests);
      aggregatedMetrics.avgPosition = Math.round(aggregatedMetrics.avgPosition / totalTests);
      aggregatedMetrics.brandMentionRate = Math.round((brandMentionCount / totalTests) * 100);
      aggregatedMetrics.totalCitations = totalCitations;
      aggregatedMetrics.brandCitations = brandCitations;
      aggregatedMetrics.citationShare = totalCitations > 0 ? Math.round((brandCitations / totalCitations) * 100) : 0;
      aggregatedMetrics.brandMentioned = brandMentionCount > 0;
    }

    const response = {
      success: true,
      data: {
        prompt: {
          id: prompt._id,
          text: prompt.text,
          queryType: prompt.queryType || 'General',
          createdAt: prompt.createdAt
        },
        topic: promptTests[0]?.topicId?.name || 'Unknown',
        persona: promptTests[0]?.personaId?.type || 'Unknown',
        brandName: brandName,
        platformResponses,
        aggregatedMetrics,
        totalTests: promptTests.length
      }
    };

    console.log(`✅ [PROMPT DETAILS] Returning prompt details with ${Object.keys(platformResponses).length} platforms`);

    res.json(response);

  } catch (error) {
    console.error('❌ [PROMPT DETAILS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prompt details',
      error: error.message
    });
  }
});

module.exports = router;

