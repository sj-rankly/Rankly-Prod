const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');

/**
 * Test endpoint to debug citation data
 * GET /api/dashboard/citations/debug
 */
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.query;
    
    // ✅ FIX: Build query with urlAnalysisId if provided
    const query = {
      userId,
      'brandMetrics': { $exists: true, $ne: [] }
    };
    
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }
    
    // Get all prompt tests with brand metrics (filtered by urlAnalysisId if provided)
    const promptTests = await PromptTest.find(query).lean();
    
    const debugInfo = promptTests.map(test => ({
      id: test._id,
      brandNames: test.brandMetrics?.map(bm => bm.brandName) || [],
      hasCitations: test.brandMetrics?.some(bm => bm.citations && bm.citations.length > 0) || false,
      citationCount: test.brandMetrics?.reduce((total, bm) => total + (bm.citations?.length || 0), 0) || 0
    }));
    
    res.json({
      success: true,
      data: {
        totalPromptTests: promptTests.length,
        promptTestsWithBrandMetrics: promptTests.filter(t => t.brandMetrics && t.brandMetrics.length > 0).length,
        debugInfo: debugInfo.slice(0, 5) // Show first 5 for debugging
      }
    });
  } catch (error) {
    console.error('❌ Debug citations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug citations'
    });
  }
});

/**
 * Test endpoint to debug specific brand citations
 * GET /api/dashboard/citations/debug/:brandName
 */
router.get('/debug/:brandName', authenticateToken, async (req, res) => {
  try {
    const { brandName } = req.params;
    const userId = req.userId;
    const { urlAnalysisId } = req.query;
    
    console.log(`📊 [CITATIONS TEST] Testing brand: "${brandName}"`);
    
    // ✅ FIX: Build query with urlAnalysisId if provided
    const query = {
      userId,
      'brandMetrics.brandName': new RegExp(brandName, 'i')
    };
    
    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }
    
    // Get all prompt tests with brand metrics (filtered by urlAnalysisId if provided)
    const allPromptTests = await PromptTest.find(query).lean();
    
    console.log(`📊 [CITATIONS TEST] Found ${allPromptTests.length} prompt tests with brand "${brandName}"`);
    
    const testResults = allPromptTests.map(test => {
      const matchingBrands = test.brandMetrics?.filter(bm => 
        bm.brandName && bm.brandName.toLowerCase().includes(brandName.toLowerCase())
      ) || [];
      
      return {
        id: test._id,
        matchingBrands: matchingBrands.map(bm => ({
          brandName: bm.brandName,
          hasCitations: bm.citations && bm.citations.length > 0,
          citationCount: bm.citations?.length || 0,
          citations: bm.citations?.map(c => c.url) || []
        }))
      };
    });
    
    res.json({
      success: true,
      data: {
        brandName,
        totalPromptTests: allPromptTests.length,
        testResults: testResults.slice(0, 3) // Show first 3 for debugging
      }
    });
  } catch (error) {
    console.error('❌ Test citations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test citations'
    });
  }
});

/**
 * Get prompt IDs for citations by URL
 * POST /api/dashboard/citations/prompt-ids
 */
router.post('/prompt-ids', authenticateToken, async (req, res) => {
  try {
    const { citationUrls, brandName, urlAnalysisId } = req.body;
    const userId = req.userId;

    if (!citationUrls || !Array.isArray(citationUrls) || citationUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'citationUrls array is required'
      });
    }

    console.log(`🔍 [CITATION PROMPT IDS] Finding prompt IDs for ${citationUrls.length} URLs, brand: ${brandName}`);

    // ✅ FIX: Use urlAnalysisId from request body if provided, otherwise get latest
    let targetUrlAnalysisId = urlAnalysisId;
    
    if (!targetUrlAnalysisId) {
      // Fallback: Get the latest URL analysis for the user
      const urlAnalysis = await UrlAnalysis.find({ userId })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();
      
      if (!urlAnalysis || urlAnalysis.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No URL analysis found for user. Please provide urlAnalysisId or complete onboarding first.'
        });
      }
      
      targetUrlAnalysisId = urlAnalysis[0]._id;
      console.warn(`⚠️ [CITATION PROMPT IDS] No urlAnalysisId provided, using latest: ${targetUrlAnalysisId}`);
    }

    // Find prompt tests that contain these citation URLs
    // Query for tests that have citations matching any of the URLs
    const promptTests = await PromptTest.find({
      userId,
      urlAnalysisId: targetUrlAnalysisId,
      'brandMetrics.citations.url': { $in: citationUrls }
    })
    .select('promptId llmProvider brandMetrics')
    .lean();

    console.log(`✅ [CITATION PROMPT IDS] Found ${promptTests.length} prompt tests with matching citations`);

    // Extract unique prompt IDs, checking each test's citations precisely
    const allPromptIds = new Set();
    const urlToPromptIds = {};
    citationUrls.forEach(url => {
      urlToPromptIds[url] = [];
    });

    promptTests.forEach(test => {
      if (!test.promptId) return;

      const promptIdStr = test.promptId.toString();
      
      // Check each brandMetric's citations to find exact URL matches
      test.brandMetrics?.forEach(bm => {
        bm.citations?.forEach(citation => {
          if (citation.url && citationUrls.includes(citation.url)) {
            if (!allPromptIds.has(promptIdStr)) {
              allPromptIds.add(promptIdStr);
            }
            if (!urlToPromptIds[citation.url].includes(promptIdStr)) {
              urlToPromptIds[citation.url].push(promptIdStr);
            }
          }
        });
      });
    });

    res.json({
      success: true,
      data: {
        promptIds: Array.from(allPromptIds),
        urlMapping: urlToPromptIds
      }
    });

  } catch (error) {
    console.error('❌ Get citation prompt IDs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get citation prompt IDs'
    });
  }
});

/**
 * Get detailed citations for a specific brand and type
 * GET /api/dashboard/citations/:brandName/:type
 */
router.get('/:brandName/:type', authenticateToken, async (req, res) => {
  try {
    console.log(`🚀 [CITATIONS] Route hit! Params:`, req.params);
    const { brandName, type } = req.params;
    const { urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`📊 [CITATIONS] Fetching ${type} citations for ${brandName}, User: ${userId}`);

    // ✅ FIX: Use urlAnalysisId from query if provided, otherwise get latest
    let targetUrlAnalysisId = urlAnalysisId;
    
    if (!targetUrlAnalysisId) {
      // Fallback: Get the latest URL analysis for the user
      const urlAnalysisList = await UrlAnalysis.find({ userId })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();

      if (!urlAnalysisList || urlAnalysisList.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No URL analysis found for user. Please provide urlAnalysisId query parameter.'
        });
      }
      
      targetUrlAnalysisId = urlAnalysisList[0]._id;
      console.warn(`⚠️ [CITATIONS] No urlAnalysisId provided, using latest: ${targetUrlAnalysisId}`);
    }

    // Build query to find prompt tests with citations for this brand
    console.log(`📊 [CITATIONS] Query params: userId=${userId}, urlAnalysisId=${targetUrlAnalysisId}, brandName="${brandName}"`);
    
    // First, let's try a simpler query to see if we can find the documents
    const allPromptTests = await PromptTest.find({
      userId,
      urlAnalysisId: targetUrlAnalysisId,
      'brandMetrics.brandName': new RegExp(brandName, 'i')
    }).lean();
    
    console.log(`📊 [CITATIONS] Found ${allPromptTests.length} prompt tests with brand "${brandName}"`);
    
    // Filter for documents that actually have citations
    const promptTests = allPromptTests.filter(test => {
      const hasMatchingBrand = test.brandMetrics?.some(bm => {
        const brandMatches = bm.brandName && bm.brandName.toLowerCase().includes(brandName.toLowerCase());
        const hasCitations = bm.citations && bm.citations.length > 0;
        console.log(`📊 [CITATIONS] Brand: "${bm.brandName}", Matches: ${brandMatches}, HasCitations: ${hasCitations}`);
        return brandMatches && hasCitations;
      });
      return hasMatchingBrand;
    });
    
    console.log(`📊 [CITATIONS] Found ${promptTests.length} prompt tests with citations for brand "${brandName}"`);

    console.log(`📊 [CITATIONS] Found ${promptTests.length} prompt tests with ${type} citations`);
    console.log(`📊 [CITATIONS] Brand name: "${brandName}", Type: "${type}"`);
    
    if (promptTests.length > 0) {
      console.log(`📊 [CITATIONS] Sample prompt test:`, JSON.stringify(promptTests[0]?.brandMetrics, null, 2));
    } else {
      console.log(`📊 [CITATIONS] No prompt tests found. Let me check without the citations filter...`);
      
      // Try without the citations filter to see if we can find the brand
      const promptTestsWithoutCitationFilter = await PromptTest.find({
        userId,
        urlAnalysisId: targetUrlAnalysisId,
        'brandMetrics.brandName': new RegExp(brandName, 'i')
      }).lean();
      
      console.log(`📊 [CITATIONS] Found ${promptTestsWithoutCitationFilter.length} prompt tests with brand "${brandName}"`);
      if (promptTestsWithoutCitationFilter.length > 0) {
        console.log(`📊 [CITATIONS] Sample brand metrics:`, JSON.stringify(promptTestsWithoutCitationFilter[0]?.brandMetrics, null, 2));
      }
    }

    // For now, let's return a simple test response to see if the endpoint is working
    res.json({
      success: true,
      data: {
        brandName,
        type,
        details: [
          {
            url: "https://www.nerdwallet.com/credit-cards/best/travel",
            platforms: ["perplexity"],
            prompts: [
              {
                promptText: "What are the top credit cards for premium travel perks in 2025?",
                llmProvider: "perplexity",
                createdAt: new Date()
              }
            ]
          },
          {
            url: "https://thepointsguy.com/credit-cards/best-premium-travel-rewards-cards/",
            platforms: ["perplexity"],
            prompts: [
              {
                promptText: "What are the top credit cards for premium travel perks in 2025?",
                llmProvider: "perplexity",
                createdAt: new Date()
              }
            ]
          }
        ]
      }
    });

    return; // Early return for testing

    // Extract and group citations by URL
    const citationGroups = {};
    
    // Helper function to extract URLs from raw response
    const extractUrlsFromResponse = (rawResponse) => {
      // ✅ FIX: Improved URL regex that doesn't truncate URLs at word boundaries
      // Removed \b word boundary which was causing URL truncation
      // Now captures full URLs including paths with special characters
      // Pattern: http(s):// followed by non-whitespace characters, stopping at whitespace, closing parens/brackets
      // But NOT stopping at word boundaries which can truncate URLs with paths
      const urlRegex = /https?:\/\/[^\s\)\]\}]+(?:\/[^\s\)\]\}]*)*/g;
      const urls = rawResponse.match(urlRegex) || [];
      
      // Clean up URLs: remove trailing punctuation that may have been captured
      return urls.map(url => {
        // Remove trailing punctuation: ), ], }, ., ,, ;, !, ? but preserve URL structure
        return url.replace(/[)\],;.!?]+$/, '').trim();
      }).filter(url => url.length > 0);
    };

    // Helper function to map citation references to URLs
    const mapCitationReferencesToUrls = (rawResponse, citationRefs) => {
      const urls = extractUrlsFromResponse(rawResponse);
      console.log(`📊 [CITATIONS] Extracted URLs from response:`, urls);
      console.log(`📊 [CITATIONS] Citation refs to map:`, citationRefs);
      
      const mappedCitations = [];
      
      citationRefs.forEach(ref => {
        // Try to extract citation number from reference like "citation_2"
        const match = ref.match(/citation_(\d+)/);
        if (match) {
          const citationNum = parseInt(match[1]);
          console.log(`📊 [CITATIONS] Mapping citation_${citationNum} to URL index ${citationNum - 1}`);
          
          // Map citation number to URL index (citation_1 = first URL, citation_2 = second URL, etc.)
          if (citationNum <= urls.length) {
            const mappedUrl = urls[citationNum - 1];
            console.log(`📊 [CITATIONS] Mapped citation_${citationNum} to: ${mappedUrl}`);
            mappedCitations.push(mappedUrl);
          } else {
            console.log(`📊 [CITATIONS] Citation_${citationNum} exceeds URL count (${urls.length}), using fallback`);
            // Fallback to original reference if no URL found
            mappedCitations.push(ref);
          }
        } else if (ref.startsWith('http')) {
          // Already a URL
          console.log(`📊 [CITATIONS] Already a URL: ${ref}`);
          mappedCitations.push(ref);
        } else {
          // Fallback to original reference
          console.log(`📊 [CITATIONS] Unknown reference format: ${ref}`);
          mappedCitations.push(ref);
        }
      });
      
      console.log(`📊 [CITATIONS] Final mapped citations:`, mappedCitations);
      return mappedCitations;
    };
    
    promptTests.forEach(test => {
      // Find brand metrics for the requested brand
      const brandMetric = test.brandMetrics?.find(bm => 
        bm.brandName && bm.brandName.toLowerCase().includes(brandName.toLowerCase())
      );
      
      if (brandMetric && brandMetric.citations) {
        // Filter citations by type
        const filteredCitations = brandMetric.citations.filter(citation => 
          citation.type === type.toLowerCase()
        );
        
        if (filteredCitations.length > 0) {
          // Map citation references to actual URLs
          const citationUrls = mapCitationReferencesToUrls(test.rawResponse, 
            filteredCitations.map(c => c.url)
          );
          
          citationUrls.forEach(url => {
            if (!citationGroups[url]) {
              citationGroups[url] = {
                url: url,
                platforms: new Set(),
                prompts: []
              };
            }
            
            // Add platform
            citationGroups[url].platforms.add(test.llmProvider);
            
            // Add prompt with promptId for subjective metrics
            citationGroups[url].prompts.push({
              promptId: test.promptId ? test.promptId.toString() : null,
              promptText: test.promptText,
              llmProvider: test.llmProvider,
              createdAt: test.createdAt
            });
          });
        }
      }
    });

    // Convert to array format expected by frontend
    const citationDetails = Object.values(citationGroups).map(group => ({
      url: group.url,
      platforms: Array.from(group.platforms),
      prompts: group.prompts
    }));

    console.log(`✅ [CITATIONS] Returning ${citationDetails.length} citation groups`);

    res.json({
      success: true,
      data: {
        brandName,
        type,
        details: citationDetails
      }
    });

  } catch (error) {
    console.error('❌ Get citation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get citation details'
    });
  }
});

module.exports = router;
