const express = require('express');
const User = require('../models/User');
const Competitor = require('../models/Competitor');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const UrlAnalysis = require('../models/UrlAnalysis');
const router = express.Router();

/**
 * Extract brand context from URL analysis, handling both brand-level and product-level analysis
 * @param {object} urlAnalysis - URL analysis document
 * @returns {object} - Brand context object
 */
function extractBrandContext(urlAnalysis) {
  if (!urlAnalysis) {
    return {
      companyName: 'Unknown Brand',
      industry: 'General',
      businessModel: 'General',
      targetMarket: 'General',
      valueProposition: 'Not specified',
      keyServices: ['Service'],
      brandTone: 'Professional',
      marketPosition: 'Mid-market'
    };
  }

  // For product-level analysis, extract brand from product context
  if (urlAnalysis.analysisLevel === 'product' && urlAnalysis.productContext) {
    const productContext = urlAnalysis.productContext;
    
    // Extract brand name from URL, brandContext, or product name
    let companyName = 'Unknown Brand';
    
    // Priority 1: Use brandContext.companyName (extracted by Perplexity during onboarding)
    if (urlAnalysis.brandContext?.companyName) {
      companyName = urlAnalysis.brandContext.companyName;
    }
    
    // Priority 3: Use product name as fallback (but this is not ideal)
    if (companyName === 'Unknown Brand' && productContext.productName) {
      companyName = productContext.productName;
    }

    return {
      companyName: companyName,
      industry: productContext.productCategory || 'Product',
      businessModel: 'Product',
      targetMarket: productContext.targetAudience || 'General',
      valueProposition: productContext.valueProposition || 'Not specified',
      keyServices: productContext.keyFeatures || ['Feature'],
      brandTone: 'Professional',
      marketPosition: productContext.marketPosition || 'Mid-market'
    };
  }

  // For category-level analysis
  if (urlAnalysis.analysisLevel === 'category' && urlAnalysis.categoryContext) {
    const categoryContext = urlAnalysis.categoryContext;
    
    return {
      companyName: categoryContext.categoryName || 'Unknown Category',
      industry: 'Category',
      businessModel: 'Category',
      targetMarket: categoryContext.targetMarket || 'General',
      valueProposition: 'Category offerings',
      keyServices: categoryContext.productTypes || ['Product'],
      brandTone: 'Professional',
      marketPosition: 'Mid-market'
    };
  }

  // For company-level analysis or fallback
  if (urlAnalysis.brandContext) {
    return urlAnalysis.brandContext;
  }

  // Final fallback
  return {
    companyName: 'Unknown Brand',
    industry: 'General',
    businessModel: 'General',
    targetMarket: 'General',
    valueProposition: 'Not specified',
    keyServices: ['Service'],
    brandTone: 'Professional',
    marketPosition: 'Mid-market'
  };
}

// Authentication middleware (JWT-based)
const { authenticateToken } = require('../middleware/auth');

// Get onboarding data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId } = req.query;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ FIX: Build query with optional urlAnalysisId filtering for proper data isolation
    const competitorQuery = { userId: req.userId };
    const topicQuery = { userId: req.userId };
    const personaQuery = { userId: req.userId };
    
    if (urlAnalysisId) {
      competitorQuery.urlAnalysisId = urlAnalysisId;
      topicQuery.urlAnalysisId = urlAnalysisId;
      personaQuery.urlAnalysisId = urlAnalysisId;
    }

    // Get user's data (filtered by urlAnalysisId if provided)
    const competitors = await Competitor.find(competitorQuery);
    const topics = await Topic.find(topicQuery);
    const personas = await Persona.find(personaQuery);

    res.json({
      success: true,
      data: {
        onboarding: {
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            company: user.companyName,
            website: user.websiteUrl
          },
          websiteUrl: user.websiteUrl,
          competitors: competitors.filter(c => c.selected && c.url).map(c => c.url),
          topics: topics.filter(t => t.selected && t.name).map(t => t.name),
          personas: personas.filter(p => p.selected && p.description).map(p => p.description),
          regions: [user.preferences.region],
          languages: [user.preferences.language],
          preferences: {
            industry: user.companyName,
            targetAudience: personas.filter(p => p.selected && p.type).map(p => p.type).join(', '),
            goals: ['Improve SEO', 'Increase visibility', 'Content optimization']
          },
          currentStep: user.onboarding.currentStep,
          isCompleted: user.onboarding.isCompleted
        }
      }
    });

  } catch (error) {
    console.error('Get onboarding data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get onboarding data'
    });
  }
});

// Update onboarding data in bulk
router.put('/bulk', authenticateToken, async (req, res) => {
  try {
    const { profile, websiteUrl, competitors, topics, personas, regions, languages, preferences } = req.body;

    // Update user profile
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user data
    if (profile) {
      user.firstName = profile.firstName || user.firstName;
      user.lastName = profile.lastName || user.lastName;
      user.companyName = profile.company || user.companyName;
      user.websiteUrl = profile.website || user.websiteUrl;
    }

    if (websiteUrl) {
      user.websiteUrl = websiteUrl;
    }

    if (regions && regions.length > 0) {
      user.preferences.region = regions[0];
    }

    if (languages && languages.length > 0) {
      user.preferences.language = languages[0];
    }

    user.onboarding.currentStep = 8;
    user.onboarding.isCompleted = true;
    await user.save();

    // Update competitors
    if (competitors && Array.isArray(competitors)) {
      // Clear existing selections
      await Competitor.updateMany({ userId: req.userId }, { selected: false });
      
      // Update selected competitors
      for (const url of competitors) {
        const competitor = await Competitor.findOne({ userId: req.userId, url });
        if (competitor) {
          competitor.selected = true;
          await competitor.save();
        }
      }
    }

    // Update topics
    if (topics && Array.isArray(topics)) {
      // Clear existing selections
      await Topic.updateMany({ userId: req.userId }, { selected: false });
      
      // Update selected topics
      for (const name of topics) {
        const topic = await Topic.findOne({ userId: req.userId, name });
        if (topic) {
          topic.selected = true;
          await topic.save();
        }
      }
    }

    // Update personas
    if (personas && Array.isArray(personas)) {
      // Clear existing selections
      await Persona.updateMany({ userId: req.userId }, { selected: false });
      
      // Update selected personas
      for (const description of personas) {
        const persona = await Persona.findOne({ userId: req.userId, description });
        if (persona) {
          persona.selected = true;
          await persona.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'Onboarding data updated successfully'
    });

  } catch (error) {
    console.error('Update onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update onboarding data'
    });
  }
});

// Analyze website endpoint with AI integration
router.post('/analyze-website', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Website URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid URL (e.g., https://example.com)'
      });
    }

    console.log(`🔍 Starting website analysis for user ${req.userId}: ${url}`);

    // Import URL cleanup service
    const urlCleanupService = require('../services/urlCleanupService');

    // Check if this URL already exists for this user
    const urlExists = await urlCleanupService.urlExists(req.userId, url);
    
    if (urlExists) {
      console.log(`🔄 URL already exists, cleaning up previous analysis data...`);
      
      // Get cleanup stats before cleanup
      const cleanupStats = await urlCleanupService.getCleanupStats(req.userId, url);
      if (cleanupStats.success) {
        console.log(`📊 Cleanup stats:`, cleanupStats.data);
      }
      
      // Perform comprehensive cleanup
      const cleanupResult = await urlCleanupService.cleanupUrlData(req.userId, url);
      
      if (!cleanupResult.success) {
        console.error('❌ Cleanup failed:', cleanupResult.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to cleanup existing URL data',
          error: cleanupResult.error
        });
      }
      
      console.log(`✅ Cleanup completed: ${cleanupResult.results.totalDeleted} items removed`);
    }

    // Update user's website URL
    const user = await User.findById(req.userId);
    if (user) {
      user.websiteUrl = url;
      await user.save();
    }

    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('⚠️ OpenRouter API key not configured');
      return res.status(500).json({
        success: false,
        message: 'AI analysis service not configured. Please set OPENROUTER_API_KEY in environment variables.'
      });
    }
    
    // Import website analysis service
    const websiteAnalysisService = require('../services/websiteAnalysisService');
    
    // Perform comprehensive website analysis
    const analysisResults = await websiteAnalysisService.analyzeWebsite(url);
    
    // Save complete analysis results to UrlAnalysis collection
    const urlAnalysisData = {
      userId: req.userId,
      url: url,
      analysisLevel: analysisResults.analysisLevel || 'company',
      competitors: analysisResults.competitors || [],
      topics: analysisResults.topics || [],
      personas: analysisResults.personas || [],
      analysisDate: new Date(analysisResults.analysisDate),
      status: 'completed'
    };

    // Add context based on analysis level
    if (analysisResults.analysisLevel === 'product' && analysisResults.productContext) {
      urlAnalysisData.productContext = analysisResults.productContext;
      // For product-level, brandContext might not exist, so make it optional
      urlAnalysisData.brandContext = analysisResults.brandContext || {
        companyName: analysisResults.productContext.productName || 'Unknown',
        industry: 'Product',
        businessModel: 'Product',
        targetMarket: analysisResults.productContext.targetAudience || 'General',
        valueProposition: analysisResults.productContext.valueProposition || 'Not specified',
        keyServices: analysisResults.productContext.keyFeatures || [],
        brandTone: 'Professional',
        marketPosition: analysisResults.productContext.marketPosition || 'Mid-market'
      };
    } else if (analysisResults.analysisLevel === 'category' && analysisResults.categoryContext) {
      urlAnalysisData.categoryContext = analysisResults.categoryContext;
      // For category-level, brandContext might not exist, so make it optional
      urlAnalysisData.brandContext = analysisResults.brandContext || {
        companyName: analysisResults.categoryContext.categoryName || 'Unknown',
        industry: 'Category',
        businessModel: 'Category',
        targetMarket: analysisResults.categoryContext.targetMarket || 'General',
        valueProposition: 'Category offerings',
        keyServices: analysisResults.categoryContext.productTypes || [],
        brandTone: 'Professional',
        marketPosition: 'Mid-market'
      };
    } else {
      // Company-level analysis
      urlAnalysisData.brandContext = analysisResults.brandContext;
    }

    const urlAnalysis = new UrlAnalysis(urlAnalysisData);
    
    await urlAnalysis.save();
    
    // Save individual items to respective collections for user selection
    // Note: Cleanup was already handled above by the URL cleanup service
    
    console.log('🔍 [DEBUG] Starting individual document creation...');
    console.log('🔍 [DEBUG] Analysis results:', {
      competitors: analysisResults.competitors?.length || 0,
      topics: analysisResults.topics?.length || 0,
      personas: analysisResults.personas?.length || 0
    });
    
    // Save competitors
    console.log('🔍 [DEBUG] Checking competitors:', analysisResults.competitors?.length || 0);
    if (analysisResults.competitors && analysisResults.competitors.length > 0) {
      console.log('🔍 [DEBUG] Creating competitors with urlAnalysisId:', urlAnalysis._id);
      try {
        const competitorPromises = analysisResults.competitors.map(comp => {
          return new Competitor({
            userId: req.userId,
            name: comp.name,
            url: comp.url,
            reason: comp.reason,
            similarity: comp.similarity,
            source: 'ai',
            selected: false,
            urlAnalysisId: urlAnalysis._id // ✅ FIX: Set urlAnalysisId
          }).save();
        });
        await Promise.all(competitorPromises);
        console.log('✅ [DEBUG] Competitors created successfully');
      } catch (error) {
        console.error('❌ [DEBUG] Error creating competitors:', error);
      }
    } else {
      console.log('⚠️ [DEBUG] No competitors to create');
    }
    
    // Save topics
    if (analysisResults.topics && analysisResults.topics.length > 0) {
      const topicPromises = analysisResults.topics.map(topic => {
        // Defensive: Remove any unwanted branding info from topic object (futureproof)
        const sanitizedTopic = {
          userId: req.userId,
          name: topic.name,
          description: topic.description,
          keywords: topic.keywords || [],
          priority: topic.priority,
          source: 'ai',
          selected: false,
          urlAnalysisId: urlAnalysis._id // ✅ FIX: Set urlAnalysisId
        };
        // Remove any accidental brand/brandContext fields (not present today, but defensive)
        delete sanitizedTopic.brand;
        delete sanitizedTopic.brandContext;
        return new Topic(sanitizedTopic).save();
      });
      await Promise.all(topicPromises);
    }
    
    // Save personas
    if (analysisResults.personas && analysisResults.personas.length > 0) {
      const personaPromises = analysisResults.personas.map(persona => {
        return new Persona({
          userId: req.userId,
          type: persona.type,
          description: persona.description,
          painPoints: persona.painPoints || [],
          goals: persona.goals || [],
          relevance: persona.relevance,
          source: 'ai',
          selected: false,
          urlAnalysisId: urlAnalysis._id // ✅ FIX: Set urlAnalysisId
        }).save();
      });
      await Promise.all(personaPromises);
    }
    
    console.log('✅ Website analysis completed and saved to database successfully');

    res.json({
      success: true,
      message: 'Website analysis completed successfully',
      data: {
        urlAnalysisId: urlAnalysis._id, // Include the URL analysis ID
        analysis: {
          status: 'completed',
          analysisLevel: analysisResults.analysisLevel || 'company',
          brandContext: analysisResults.brandContext,
          productContext: analysisResults.productContext,
          categoryContext: analysisResults.categoryContext,
          competitors: analysisResults.competitors || [],
          topics: analysisResults.topics || [],
          personas: analysisResults.personas || [],
          analysisDate: analysisResults.analysisDate
        }
      }
    });

  } catch (error) {
    console.error('Website analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Website analysis failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Analysis service temporarily unavailable'
    });
  }
});

// Get latest website analysis results
router.get('/latest-analysis', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ FIX: Accept urlAnalysisId parameter, otherwise use latest
    const { urlAnalysisId } = req.query;
    
    let targetAnalysis;
    if (urlAnalysisId) {
      targetAnalysis = await UrlAnalysis.findOne({ 
        _id: urlAnalysisId,
        userId: req.userId 
      }).lean();
    } else {
      // Fallback: Get the latest analysis for this user
      const analysisList = await UrlAnalysis.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();
      targetAnalysis = analysisList[0] || null;
    }

    if (!targetAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No analysis found for this user'
      });
    }

    // ✅ FIX: Filter competitors/topics/personas by urlAnalysisId
    const [competitors, topics, personas] = await Promise.all([
      Competitor.find({ userId: req.userId, urlAnalysisId: targetAnalysis._id }).lean(),
      Topic.find({ userId: req.userId, urlAnalysisId: targetAnalysis._id }).lean(),
      Persona.find({ userId: req.userId, urlAnalysisId: targetAnalysis._id }).lean()
    ]);

    res.json({
      success: true,
      data: {
        analysis: {
          id: targetAnalysis._id,
          url: targetAnalysis.url,
          analysisDate: targetAnalysis.analysisDate,
          brandContext: targetAnalysis.brandContext,
          competitors: targetAnalysis.competitors,
          topics: targetAnalysis.topics,
          personas: targetAnalysis.personas
        },
        availableItems: {
          competitors: competitors,
          topics: topics,
          personas: personas
        }
      }
    });

  } catch (error) {
    console.error('Get latest analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analysis data'
    });
  }
});

// Check if user has done URL analysis before
router.get('/has-analysis', authenticateToken, async (req, res) => {
  try {
    const analysisCount = await UrlAnalysis.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      data: {
        hasAnalysis: analysisCount > 0,
        analysisCount: analysisCount
      }
    });
  } catch (error) {
    console.error('Check analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check analysis status'
    });
  }
});

/**
 * GET /api/onboarding/cached-data
 * Get cached onboarding data (competitors, personas, topics) for a URL
 * DISABLED: This endpoint has been disabled - caching is no longer available
 * Query param: ?url=<encoded-url>
 */
router.get('/cached-data', authenticateToken, async (req, res) => {
  // Caching mechanism disabled - return 403 for all users
  return res.status(403).json({
    success: false,
    message: 'Cached data endpoint is no longer available'
  });
});

// Cleanup URL data endpoint (for manual cleanup if needed)
router.post('/cleanup-url', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required for cleanup'
      });
    }

    console.log(`🧹 Manual cleanup requested for URL: ${url} (User: ${req.userId})`);

    // Import URL cleanup service
    const urlCleanupService = require('../services/urlCleanupService');
    
    // Perform cleanup
    const cleanupResult = await urlCleanupService.cleanupUrlData(req.userId, url);
    
    if (cleanupResult.success) {
      res.json({
        success: true,
        message: cleanupResult.message,
        data: {
          cleanupResults: cleanupResult.results,
          totalDeleted: cleanupResult.results.totalDeleted
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: cleanupResult.message,
        error: cleanupResult.error
      });
    }

  } catch (error) {
    console.error('❌ Manual cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup URL data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Cleanup service temporarily unavailable'
    });
  }
});

// Update selections for competitors, topics, and personas
router.post('/update-selections', authenticateToken, async (req, res) => {
  try {
    const { competitors = [], topics = [], personas = [], urlAnalysisId = null } = req.body;
    const userId = req.userId;

    console.log('📝 Updating selections for user:', userId);
    console.log('Competitor names/URLs:', competitors);
    console.log('Topic names:', topics);
    console.log('Persona types:', personas);
    console.log('URL Analysis ID:', urlAnalysisId);

    // ✅ FIX: Only reset selections for the current analysis, not globally
    const resetQuery = { userId };
    if (urlAnalysisId) {
      resetQuery.urlAnalysisId = urlAnalysisId;
    }
    
    await Competitor.updateMany(resetQuery, { selected: false });
    await Topic.updateMany(resetQuery, { selected: false });
    await Persona.updateMany(resetQuery, { selected: false });

    let competitorsUpdated = 0;
    let topicsUpdated = 0;
    let personasUpdated = 0;

    // Update competitors - match by URL (most reliable identifier)
    for (const compUrl of competitors) {
      // First try to find existing competitor
      let result = await Competitor.updateOne(
        { userId, url: compUrl },
        { selected: true, urlAnalysisId: urlAnalysisId } // ✅ FIX: Set urlAnalysisId
      );
      
      // If no existing competitor found, create a new one (for custom competitors)
      if (result.matchedCount === 0) {
        console.log(`📝 Creating new competitor for URL: ${compUrl}`);
        const newCompetitor = new Competitor({
          userId,
          name: compUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''), // Use domain as name
          url: compUrl,
          reason: 'User added manually',
          similarity: 'Medium', // Fixed: use valid enum value
          source: 'user',
          selected: true,
          urlAnalysisId: urlAnalysisId // ✅ FIX: Set urlAnalysisId
        });
        await newCompetitor.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) competitorsUpdated++;
    }

    // Update topics - match by name
    for (const topicName of topics) {
      // First try to find existing topic
      let result = await Topic.updateOne(
        { userId, name: topicName },
        { selected: true, urlAnalysisId: urlAnalysisId }
      );
      
      // If no existing topic found, create a new one (for custom topics)
      if (result.matchedCount === 0) {
        console.log(`📝 Creating new topic: ${topicName}`);
        const newTopic = new Topic({
          userId,
          name: topicName,
          description: 'User added manually',
          keywords: [],
          priority: 'Medium', // Fixed: use valid enum value
          source: 'user',
          selected: true,
          urlAnalysisId: urlAnalysisId
        });
        await newTopic.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) topicsUpdated++;
    }

    // Update personas - match by type
    for (const personaType of personas) {
      // First try to find existing persona
      let result = await Persona.updateOne(
        { userId, type: personaType },
        { selected: true, urlAnalysisId: urlAnalysisId }
      );
      
      // If no existing persona found, create a new one (for custom personas)
      if (result.matchedCount === 0) {
        console.log(`📝 Creating new persona: ${personaType}`);
        const newPersona = new Persona({
          userId,
          type: personaType,
          description: 'User added manually',
          painPoints: [],
          goals: [],
          relevance: 1,
          source: 'user',
          selected: true,
          urlAnalysisId: urlAnalysisId
        });
        await newPersona.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) personasUpdated++;
    }

    console.log(`✅ Updated ${competitorsUpdated} competitors, ${topicsUpdated} topics, ${personasUpdated} personas`);

    res.json({
      success: true,
      message: 'Selections updated successfully',
      data: {
        competitorsSelected: competitorsUpdated,
        topicsSelected: topicsUpdated,
        personasSelected: personasUpdated
      }
    });

  } catch (error) {
    console.error('❌ Update selections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update selections'
    });
  }
});

// Generate prompts based on user selections
router.post('/generate-prompts', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('🎯 Starting prompt generation for user:', userId);

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get latest analysis data first
    // ✅ FIX: Correct syntax - findOne doesn't support sort, use find().sort().limit(1)
    const analysisList = await UrlAnalysis.find({ userId })
      .sort({ analysisDate: -1 })
      .limit(1)
      .lean();
    const latestAnalysis = analysisList[0] || null;

    if (!latestAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'No website analysis found. Please analyze a website first.'
      });
    }

    // Get selected data for the latest analysis
    const selectedCompetitors = await Competitor.find({ userId, selected: true, urlAnalysisId: latestAnalysis._id });
    const selectedTopics = await Topic.find({ userId, selected: true, urlAnalysisId: latestAnalysis._id });
    const selectedPersonas = await Persona.find({ userId, selected: true, urlAnalysisId: latestAnalysis._id });

    // Prepare data for prompt generation
    // Use default configuration
    const totalPrompts = 20;
    
    const promptData = {
      topics: selectedTopics.map(topic => ({
        _id: topic._id, // Keep MongoDB _id
        name: topic.name,
        description: topic.description,
        keywords: topic.keywords || []
      })),
      personas: selectedPersonas.map(persona => ({
        _id: persona._id, // Keep MongoDB _id
        type: persona.type,
        description: persona.description,
        painPoints: persona.painPoints || [],
        goals: persona.goals || []
      })),
      region: user.preferences.region || 'Global',
      language: user.preferences.language || 'English',
      websiteUrl: user.websiteUrl || '',
      brandContext: extractBrandContext(latestAnalysis),
      // competitors removed - not needed for TOFU queries
      totalPrompts
    };

    console.log('📊 Prompt generation data:', {
      topicsCount: promptData.topics.length,
      personasCount: promptData.personas.length,
      totalPrompts
    });

    console.log('🔍 Available topics:', selectedTopics.map(t => ({ _id: t._id, name: t.name })));
    console.log('🔍 Available personas:', selectedPersonas.map(p => ({ _id: p._id, type: p.type })));

    // Import prompt generation service
    const promptGenerationService = require('../services/promptGenerationService');
    
    // Generate prompts
    const generatedPrompts = await promptGenerationService.generatePrompts(promptData);

    console.log(`✅ Generated ${generatedPrompts.length} prompts successfully`);
    console.log('🔍 Generated prompts sample:', generatedPrompts.slice(0, 2));

    // Save prompts to database (required for testing service)
    const Prompt = require('../models/Prompt');
    const savedPrompts = [];
    
    for (const promptData of generatedPrompts) {
      console.log('🔍 Processing prompt:', {
        topicName: promptData.topicName,
        personaType: promptData.personaType,
        queryType: promptData.queryType
      });

      // Find the topic and persona ObjectIds by name/type (not by the input IDs)
      const topic = selectedTopics.find(t => t.name === promptData.topicName);
      const persona = selectedPersonas.find(p => p.type === promptData.personaType);

      console.log('🔍 Matching results:', {
        topicFound: !!topic,
        personaFound: !!persona,
        topicMatch: topic ? { _id: topic._id, name: topic.name } : null,
        personaMatch: persona ? { _id: persona._id, type: persona.type } : null
      });

      if (!topic || !persona) {
        console.warn('❌ Skipping prompt - topic or persona not found:', {
          promptData: {
            topicName: promptData.topicName,
            personaType: promptData.personaType,
            queryType: promptData.queryType
          },
          availableTopics: selectedTopics.filter(t => t.name).map(t => t.name),
          availablePersonas: selectedPersonas.filter(p => p.type).map(p => p.type)
        });
        continue;
      }

      const prompt = new Prompt({
        userId,
        urlAnalysisId: latestAnalysis._id, // ✅ Link prompt to URL analysis
        topicId: topic._id,
        personaId: persona._id,
        title: `${topic.name} × ${persona.type} - ${promptData.queryType}`,
        text: promptData.promptText,
        queryType: promptData.queryType,
        status: 'active', // Ensure status is active for testing
        metadata: {
          generatedBy: 'ai',
          targetPersonas: [persona.type],
          targetCompetitors: selectedCompetitors.filter(c => c.name).map(c => c.name)
        }
      });

      await prompt.save();
      savedPrompts.push({
        _id: prompt._id,
        topicName: topic.name,
        personaType: persona.type,
        promptText: prompt.text,
        queryType: prompt.queryType
      });
    }

    console.log(`💾 Saved ${savedPrompts.length} prompts to database`);

    // Trigger prompt testing and then metrics calculation after prompt generation
    try {
      console.log('🧪 Starting automatic prompt testing...');
      
      // ✅ FIX: Wait longer for database writes to fully commit before querying
      // This prevents race condition where prompts are saved but not yet queryable
      console.log('⏳ Waiting for database writes to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
      
      // ✅ FIX: Verify prompts are actually in database before testing
      const Prompt = require('../models/Prompt');
      const mongoose = require('mongoose');
      const verifyQuery = {
        userId,
        urlAnalysisId: latestAnalysis._id,
        status: 'active'
      };
      const verifiedPrompts = await Prompt.find(verifyQuery).countDocuments();
      console.log(`🔍 [VERIFY] Found ${verifiedPrompts} prompts in database for analysis ${latestAnalysis._id}`);
      
      if (verifiedPrompts === 0) {
        console.error('❌ [ERROR] No prompts found in database after save. This may indicate a database write issue.');
        throw new Error('No prompts found in database after save');
      }
      
      const promptTestingService = require('../services/promptTestingService');
      const testingService = promptTestingService;
      
      // ✅ FIX: Ensure urlAnalysisId is properly converted to ObjectId
      const urlAnalysisIdForQuery = typeof latestAnalysis._id === 'string' 
        ? new mongoose.Types.ObjectId(latestAnalysis._id)
        : latestAnalysis._id;
      
      // Test all prompts automatically
      const testResults = await testingService.testAllPrompts(userId, {
        batchSize: 5,
        testLimit: 20,
        urlAnalysisId: urlAnalysisIdForQuery
      });
      
      console.log(`✅ Prompt testing completed: ${testResults.totalTests} tests`);
      
      // Now calculate metrics after testing
      console.log('🔄 Starting matrix calculation...');
      
      // Add a small delay to ensure all tests are committed to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const MetricsAggregationService = require('../services/metricsAggregationService');
      const metricsService = MetricsAggregationService;
      
      // Calculate metrics for the current analysis
      const metricsResult = await metricsService.calculateMetrics(userId, {
        urlAnalysisId: latestAnalysis._id
      });
      
      if (metricsResult.success) {
        console.log('✅ Matrix calculation completed successfully');
        console.log('   Overall metrics:', metricsResult.results?.overall ? 'calculated' : 'skipped');
        console.log('   Platform metrics:', metricsResult.results?.platform?.length || 0, 'calculated');
        console.log('   Topic metrics:', metricsResult.results?.topic?.length || 0, 'calculated');
        console.log('   Persona metrics:', metricsResult.results?.persona?.length || 0, 'calculated');
      } else {
        console.log('⚠️  Matrix calculation completed with warnings:', metricsResult.message);
      }
    } catch (error) {
      console.error('❌ Automatic testing/metrics calculation failed:', error.message);
      // Don't fail the entire request if testing/metrics calculation fails
      console.log('   Continuing with prompt generation response...');
    }

    res.json({
      success: true,
      message: 'Prompts generated, tested, and metrics calculated successfully',
      data: {
        prompts: savedPrompts,
        totalPrompts: savedPrompts.length,
        generationDate: new Date().toISOString(),
        metadata: {
          topicsUsed: promptData.topics?.length || 0,
          personasUsed: promptData.personas?.length || 0,
          competitorsUsed: promptData.competitors?.length || 0,
          region: promptData.region,
          language: promptData.language
        }
      }
    });

  } catch (error) {
    console.error('❌ Prompt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prompts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Prompt generation service temporarily unavailable'
    });
  }
});

// Export the extractBrandContext function for testing
module.exports.extractBrandContext = extractBrandContext;

module.exports = router;

