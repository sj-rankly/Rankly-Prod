import apiService from './api'
import { 
  transformAggregatedMetricsToDashboardData,
  transformInsightsToFrontend,
  transformBrandMetricsToMetric,
  transformTopicsToTopicRankings,
  transformBrandMetricsToCompetitors,
  transformFilters,
  filterAndAggregateMetrics
} from './dataTransform'
import { DashboardData } from '@/types/dashboard'

interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
  urlAnalysisId?: string
  platforms?: string[]
  topics?: string[]
  personas?: string[]
  selectedAnalysisId?: string | null
}

interface DashboardServiceResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

class DashboardService {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 0 // ✅ CACHING DISABLED - Always fetch fresh data

  /**
   * Clear all cached data
   */
  clearCache(): void {
    console.log('🧹 [DashboardService] Clearing all cached data')
    this.cache.clear()
  }

  /**
   * Clear cache for specific analysis (all filter variations)
   */
  clearCacheForAnalysis(analysisId: string): void {
    const pattern = `dashboard-${analysisId}`
    console.log('🧹 [DashboardService] Clearing cache for analysis:', analysisId)
    this.clearCacheByPattern(pattern)
  }


  /**
   * Trigger insights generation for all tabs in background
   */
  private async triggerInsightsGeneration(analysisId?: string): Promise<void> {
    try {
      console.log('🧠 [DashboardService] Triggering insights generation for all tabs...')
      
      // Define all tab types that need insights
      const tabTypes = ['visibility', 'prompts', 'sentiment', 'citations']
      
      // Generate insights for each tab in parallel (non-blocking)
      const insightsPromises = tabTypes.map(async (tabType) => {
        try {
          console.log(`🧠 [DashboardService] Generating insights for ${tabType} tab...`)
          await apiService.generateInsightsForTab(tabType, analysisId)
          console.log(`✅ [DashboardService] ${tabType} insights generated successfully`)
        } catch (error) {
          console.error(`❌ [DashboardService] Failed to generate ${tabType} insights:`, error)
          // Don't throw - we want other tabs to continue processing
        }
      })
      
      // Wait for all insights to complete (but don't block dashboard loading)
      Promise.allSettled(insightsPromises).then(() => {
        console.log('✅ [DashboardService] All insights generation completed')
      })
      
    } catch (error) {
      console.error('❌ [DashboardService] Error triggering insights generation:', error)
      // Don't throw - insights generation failure shouldn't break dashboard
    }
  }

  /**
   * Get cached data or fetch fresh data
   */
  private async getCachedData<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>
  ): Promise<DashboardServiceResponse<T>> {
    const cached = this.cache.get(cacheKey)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log('💾 [DashboardService] Using cached data for key:', cacheKey)
      return { data: cached.data, error: null, loading: false }
    }

    console.log('🔄 [DashboardService] Fetching fresh data for key:', cacheKey)

    try {
      const data = await fetchFunction()
      this.cache.set(cacheKey, { data, timestamp: now })
      return { data, error: null, loading: false }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }
    }
  }

  /**
   * Get complete dashboard data with all metrics
   */
  async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<DashboardData>> {
    // Create cache key based on analysis ID AND filter selections for real-time filtering
    // Use a more specific cache key to ensure different filter combinations are cached separately
    const analysisId = filters.selectedAnalysisId || filters.urlAnalysisId
    const filterKey = JSON.stringify({
      topics: (filters.topics || []).sort(),
      personas: (filters.personas || []).sort(),
      platforms: (filters.platforms || []).sort()
    })
    const cacheKey = `dashboard-${analysisId || 'default'}-${Buffer.from(filterKey).toString('base64').slice(0, 16)}`
    console.log('🔑 [DashboardService] Cache key:', cacheKey)
    console.log('🔑 [DashboardService] Analysis ID:', analysisId)
    console.log('🔑 [DashboardService] Filter selections:', { topics: filters.topics, personas: filters.personas, platforms: filters.platforms })
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching dashboard data with filters:', filters)
      
      // Check if we have a token
      const token = localStorage.getItem('authToken')
      console.log('🔑 [DashboardService] Auth token present:', !!token)
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.')
      }

      // ✅ Use new /api/dashboard/all endpoint (includes AI insights)
      // Convert null to undefined so backend can fall back to latest analysis
      const urlAnalysisId = filters.selectedAnalysisId || filters.urlAnalysisId || undefined
      console.log('🔄 [DashboardService] Calling /api/dashboard/all with filters:', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        urlAnalysisId: urlAnalysisId
      })
      console.log('🔍 [DashboardService] Full filters object:', filters)
      
      console.log('🔍 [DashboardService] DEBUG - Starting dashboard data fetch')
      console.log('🔍 [DashboardService] DEBUG - urlAnalysisId:', urlAnalysisId)
      console.log('🔍 [DashboardService] DEBUG - filters.selectedAnalysisId:', filters.selectedAnalysisId)
      console.log('🔍 [DashboardService] DEBUG - filters.urlAnalysisId:', filters.urlAnalysisId)
      console.log('🔍 [DashboardService] DEBUG - Full filters object:', JSON.stringify(filters, null, 2))
      
      let dashboardResponse;
      let errorMessage = '';
      
      try {
        console.log('🔍 [DashboardService] DEBUG - Calling getDashboardAll with:', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          urlAnalysisId: urlAnalysisId,
          topics: filters.topics?.length || 0,
          personas: filters.personas?.length || 0,
          platforms: filters.platforms?.length || 0
        })
        
        dashboardResponse = await apiService.getDashboardAll({
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          urlAnalysisId: urlAnalysisId,
          topics: filters.topics,
          personas: filters.personas,
          platforms: filters.platforms
        })
        
        console.log('🔍 [DashboardService] DEBUG - getDashboardAll response:', {
          success: dashboardResponse.success,
          hasData: !!dashboardResponse.data,
          message: (dashboardResponse as any).message
        })
      } catch (e) {
        console.error('❌ [DashboardService] DEBUG - Exception caught:', {
          error: e,
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
          name: e instanceof Error ? e.name : undefined
        })
        errorMessage = e instanceof Error ? e.message : String(e)
        dashboardResponse = { 
          success: false, 
          data: null,
          message: errorMessage
        }
        console.log('🔍 [DashboardService] DEBUG - Set dashboardResponse to:', dashboardResponse)
      }
      
      console.log('📊 [DashboardService] Dashboard response:', {
        success: dashboardResponse.success,
        hasData: !!dashboardResponse.data,
        hasOverall: !!dashboardResponse.data?.overall,
        hasPlatformMetrics: (dashboardResponse.data?.platformMetrics?.length || 0) > 0,
        topicRankings: dashboardResponse.data?.metrics?.topicRankings?.length || 0,
        personaRankings: dashboardResponse.data?.metrics?.personaRankings?.length || 0
      })

      // ✅ FIX: Check if data is actually empty (not just if response failed)
      // The backend might return success:true with empty data when metrics don't exist
      let hasEmptyData = dashboardResponse.success && dashboardResponse.data && (
        !dashboardResponse.data.overall && 
        (!dashboardResponse.data.platformMetrics || dashboardResponse.data.platformMetrics.length === 0) &&
        (!dashboardResponse.data.topics || dashboardResponse.data.topics.length === 0) &&
        (!dashboardResponse.data.personas || dashboardResponse.data.personas.length === 0)
      )

      // If dashboard/all fails OR returns empty data, check if it's because metrics don't exist yet
      if (!dashboardResponse.success || !dashboardResponse.data || hasEmptyData) {
        const responseErrorMessage = errorMessage || (dashboardResponse as any).message || ''
        const isMetricsNotFound = 
          hasEmptyData ||
          responseErrorMessage.includes('No metrics') || 
          responseErrorMessage.includes('not found') || 
          responseErrorMessage.includes('Please run calculations') ||
          responseErrorMessage.includes('run calculations first') ||
          responseErrorMessage.includes('Please complete the onboarding flow')
        
        // If metrics don't exist, try to calculate them automatically
        if (isMetricsNotFound && urlAnalysisId) {
          console.log('🔄 [DashboardService] DEBUG - Metrics not found, triggering automatic calculation')
          console.log('🔍 [DashboardService] DEBUG - urlAnalysisId for calculation:', urlAnalysisId)
          console.log('🔍 [DashboardService] DEBUG - urlAnalysisId type:', typeof urlAnalysisId)
          console.log('🔍 [DashboardService] DEBUG - urlAnalysisId length:', urlAnalysisId?.length)
          
          try {
            // Trigger metrics calculation
            console.log('🔍 [DashboardService] DEBUG - Calling calculateMetrics with urlAnalysisId:', urlAnalysisId)
            const calculateResponse = await apiService.calculateMetrics(urlAnalysisId)
            
            console.log('🔍 [DashboardService] DEBUG - calculateMetrics response:', {
              success: calculateResponse.success,
              message: (calculateResponse as any).message,
              data: (calculateResponse as any).data
            })
            
            if (calculateResponse.success) {
              console.log('✅ [DashboardService] Metrics calculation completed, retrying dashboard fetch...')
              console.log('🔍 [DashboardService] DEBUG - Waiting 2 seconds before retry...')
              // Wait a bit longer for metrics to be stored
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              // Retry the dashboard/all call
              console.log('🔍 [DashboardService] DEBUG - Retrying getDashboardAll with urlAnalysisId:', urlAnalysisId)
              try {
                const retryResponse = await apiService.getDashboardAll({
                  dateFrom: filters.dateFrom,
                  dateTo: filters.dateTo,
                  urlAnalysisId: urlAnalysisId,
                  topics: filters.topics,
                  personas: filters.personas,
                  platforms: filters.platforms
                })
                
                console.log('🔍 [DashboardService] DEBUG - Retry response:', {
                  success: retryResponse.success,
                  hasData: !!retryResponse.data,
                  message: (retryResponse as any).message
                })
                
                if (retryResponse.success && retryResponse.data) {
                  console.log('✅ [DashboardService] Dashboard data fetched successfully after metrics calculation')
                  // Use the retry response data
                  dashboardResponse = retryResponse
                  // ✅ FIX: Update hasEmptyData to false since we now have data
                  // This prevents fallback logic from running when we have valid data
                  hasEmptyData = false
                } else {
                  console.warn('⚠️ [DashboardService] DEBUG - Retry response had no data:', {
                    success: retryResponse.success,
                    message: (retryResponse as any).message
                  })
                }
              } catch (retryError) {
                console.error('❌ [DashboardService] DEBUG - Retry exception:', {
                  error: retryError,
                  message: retryError instanceof Error ? retryError.message : String(retryError),
                  stack: retryError instanceof Error ? retryError.stack : undefined
                })
                // Continue with fallback logic
              }
            } else {
              const calcMessage = (calculateResponse as any).message || ''
              console.warn('⚠️ [DashboardService] Metrics calculation returned success:false', {
                message: calcMessage,
                response: calculateResponse
              })
              
              // If calculation failed because no tests exist, provide helpful error
              if (calcMessage.includes('No tests') || calcMessage.includes('No completed tests')) {
                console.log('ℹ️ [DashboardService] No prompt tests found - user needs to complete prompt testing first')
                // Don't throw error here, let it fall through to show appropriate message
              }
            }
          } catch (calcError) {
            const calcErrorMessage = calcError instanceof Error ? calcError.message : String(calcError)
            console.error('❌ [DashboardService] DEBUG - Calculate metrics exception:', {
              error: calcError,
              message: calcErrorMessage,
              stack: calcError instanceof Error ? calcError.stack : undefined
            })
            
            // If calculation failed because no tests exist, provide helpful error
            if (calcErrorMessage.includes('No tests') || calcErrorMessage.includes('No completed tests')) {
              console.log('ℹ️ [DashboardService] No prompt tests found - user needs to complete prompt testing first')
              // Don't throw error here, let it fall through to show appropriate message
            }
            // Continue with fallback logic below
          }
        } else {
          console.log('🔍 [DashboardService] DEBUG - Not triggering calculation:', {
            isMetricsNotFound,
            hasUrlAnalysisId: !!urlAnalysisId,
            errorMessage: responseErrorMessage
          })
        }
        
        // If still no data, fallback to individual endpoints
        // ✅ FIX: Only fallback if we still don't have data after calculation attempts
        // Check if data is actually empty (recalculate in case retry succeeded)
        const stillHasEmptyData = dashboardResponse.success && dashboardResponse.data && (
          !dashboardResponse.data.overall && 
          (!dashboardResponse.data.platformMetrics || dashboardResponse.data.platformMetrics.length === 0) &&
          (!dashboardResponse.data.topics || dashboardResponse.data.topics.length === 0) &&
          (!dashboardResponse.data.personas || dashboardResponse.data.personas.length === 0)
        )
        
        if (!dashboardResponse.success || !dashboardResponse.data || stillHasEmptyData) {
          console.log('⚠️ [DashboardService] dashboard/all failed or returned empty data, falling back to individual endpoints')
          
          // Convert null to undefined for fallback API calls as well
          const fallbackUrlAnalysisId = filters.selectedAnalysisId || filters.urlAnalysisId || undefined
          const [
            overallMetrics,
            platformMetrics,
            topicMetrics,
            personaMetrics,
            competitors,
            topics,
            personas
          ] = await Promise.all([
            apiService.getAggregatedMetrics({ ...filters, scope: 'overall', urlAnalysisId: fallbackUrlAnalysisId }).catch(e => ({ success: false, data: null })),
            apiService.getAggregatedMetrics({ ...filters, scope: 'platform', urlAnalysisId: fallbackUrlAnalysisId }).catch(e => ({ success: false, data: [] })),
            apiService.getAggregatedMetrics({ ...filters, scope: 'topic', urlAnalysisId: fallbackUrlAnalysisId }).catch(e => ({ success: false, data: [] })),
            apiService.getAggregatedMetrics({ ...filters, scope: 'persona', urlAnalysisId: fallbackUrlAnalysisId }).catch(e => ({ success: false, data: [] })),
            apiService.getCompetitors(fallbackUrlAnalysisId).catch(e => ({ success: false, data: [] })),
            apiService.getTopics(fallbackUrlAnalysisId).catch(e => ({ success: false, data: [] })),
            apiService.getPersonas(fallbackUrlAnalysisId).catch(e => ({ success: false, data: [] }))
          ])
        
          // Process fallback data (existing code continues below)
          return this.processFallbackData(overallMetrics, platformMetrics, topicMetrics, personaMetrics, competitors, topics, personas, filters)
        }
      }

      // ✅ Process dashboard/all response (includes aiInsights)
      console.log('✅ [DashboardService] Using dashboard/all response with AI insights')
      let dashData = dashboardResponse.data
      console.log('🔍 [DashboardService] DEBUG - dashData exists:', !!dashData)
      console.log('🔍 [DashboardService] DEBUG - dashData type:', typeof dashData)
      console.log('🔍 [DashboardService] DEBUG - dashData keys:', dashData ? Object.keys(dashData) : 'null')
      console.log('🔍 [DashboardService] DEBUG - dashData.overall:', dashData?.overall ? 'exists' : 'null')
      console.log('🔍 [DashboardService] DEBUG - dashData.platformMetrics length:', dashData?.platformMetrics?.length || 0)
      
      // Fetch competitors, topics, personas separately (still needed for filtering)
      // Use let so they can be reassigned in retry logic below
      let [competitors, topics, personas] = await Promise.all([
        apiService.getCompetitors(urlAnalysisId).catch(e => ({ success: false, data: [] })),
        apiService.getTopics(urlAnalysisId).catch(e => ({ success: false, data: [] })),
        apiService.getPersonas(urlAnalysisId).catch(e => ({ success: false, data: [] }))
      ])

      // Extract data from response - use let so they can be reassigned in retry logic
      let overallMetrics = { success: true, data: dashData?.overall || null }
      // ✅ Fix: Use raw platform metrics for citation analysis
      let platformMetrics = { success: true, data: dashData?.platformMetrics || [] }
      let topicMetrics = { success: true, data: dashData?.topics || [] }
      let personaMetrics = { success: true, data: dashData?.personas || [] }
      const aiInsights = dashData.aiInsights || null  // ✅ NEW: AI insights from backend
      
      // ✅ NEW: Extract formatted rankings from backend
      const formattedTopicRankings = dashData.metrics?.topicRankings || []
      const formattedPersonaRankings = dashData.metrics?.personaRankings || []
      
      console.log('📊 [DashboardService] Backend topic rankings:', formattedTopicRankings.length, 'items')
      console.log('📊 [DashboardService] Backend persona rankings:', formattedPersonaRankings.length, 'items')
      console.log('📊 [DashboardService] Backend topics data:', dashData.topics?.length || 0, 'items')
      console.log('📊 [DashboardService] Backend personas data:', dashData.personas?.length || 0, 'items')

      // Debug API responses
      console.log('📊 [DashboardService] API Responses:')
      console.log('  Overall Metrics:', overallMetrics.success ? '✅' : '❌', overallMetrics.data ? 'Has data' : 'No data')
      console.log('  Platform Metrics:', platformMetrics.success ? '✅' : '❌', platformMetrics.data?.length || 0, 'items')
      console.log('  Topic Metrics:', topicMetrics.success ? '✅' : '❌', topicMetrics.data?.length || 0, 'items')
      console.log('  Persona Metrics:', personaMetrics.success ? '✅' : '❌', personaMetrics.data?.length || 0, 'items')
      console.log('  Competitors:', competitors.success ? '✅' : '❌', competitors.data?.length || 0, 'items')
      console.log('  Topics:', topics.success ? '✅' : '❌', topics.data?.length || 0, 'items')
      console.log('  Personas:', personas.success ? '✅' : '❌', personas.data?.length || 0, 'items')

      // Check if we have any data
      console.log('🔍 [DashboardService] DEBUG - Checking data availability:', {
        hasOverallMetrics: !!overallMetrics.data,
        hasCompetitors: competitors.data?.length > 0,
        competitorsCount: competitors.data?.length || 0,
        overallMetricsKeys: overallMetrics.data ? Object.keys(overallMetrics.data) : [],
        competitorsData: competitors.data ? competitors.data.slice(0, 2) : [],
        overallMetricsSuccess: overallMetrics.success,
        competitorsSuccess: competitors.success
      })
      
      if (!overallMetrics.data && !competitors.data?.length) {
        console.log('⚠️ [DashboardService] DEBUG - No data available, checking if we need to calculate metrics first')
        console.log('🔍 [DashboardService] DEBUG - Overall metrics response:', {
          success: overallMetrics.success,
          data: overallMetrics.data,
          error: (overallMetrics as any).error || (overallMetrics as any).message
        })
        console.log('🔍 [DashboardService] DEBUG - Competitors response:', {
          success: competitors.success,
          data: competitors.data,
          count: competitors.data?.length || 0
        })
        
        // Before throwing error, check if we need to calculate metrics
        if (urlAnalysisId) {
          console.log('🔍 [DashboardService] DEBUG - urlAnalysisId exists, checking for prompt tests via API...')
          try {
            // Check if there are any prompt tests via API
            const testsResponse = await apiService.getAllTests({ urlAnalysisId })
            const testCount = testsResponse.data?.length || 0
            console.log('🔍 [DashboardService] DEBUG - Prompt tests count from API:', testCount)
            
            if (testCount > 0) {
              console.log('🔄 [DashboardService] Prompt tests exist but metrics not calculated yet, attempting calculation...')
              // Try to calculate metrics one more time
              const calcResponse = await apiService.calculateMetrics(urlAnalysisId)
              console.log('🔍 [DashboardService] DEBUG - Calculate metrics response:', {
                success: calcResponse.success,
                message: (calcResponse as any).message,
                data: (calcResponse as any).data
              })
              
              if (calcResponse.success) {
                console.log('✅ [DashboardService] Metrics calculation triggered, waiting 3 seconds and retrying...')
                await new Promise(resolve => setTimeout(resolve, 3000))
                
                // Retry fetching dashboard data via getDashboardAll
                console.log('🔍 [DashboardService] DEBUG - Retrying getDashboardAll after calculation...')
                try {
                  const retryResult = await apiService.getDashboardAll({
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    urlAnalysisId: urlAnalysisId,
                    topics: filters.topics,
                    personas: filters.personas,
                    platforms: filters.platforms
                  })
                  
                  console.log('🔍 [DashboardService] DEBUG - Retry getDashboardAll response:', {
                    success: retryResult.success,
                    hasData: !!retryResult.data,
                    message: (retryResult as any).message
                  })
                  
                  if (retryResult.success && retryResult.data) {
                    console.log('✅ [DashboardService] Successfully fetched data after calculation, updating variables...')
                    // Update dashboardResponse to use retry data
                    dashboardResponse.success = true
                    dashboardResponse.data = retryResult.data
                    // Update dashData with retry result
                    dashData = retryResult.data
                    console.log('🔍 [DashboardService] DEBUG - Updated dashData keys:', dashData ? Object.keys(dashData) : 'null')
                    
                    // Re-extract data from retryResult
                    overallMetrics = { success: true, data: dashData.overall || null }
                    platformMetrics = { success: true, data: dashData.platformMetrics || [] }
                    topicMetrics = { success: true, data: dashData.topics || [] }
                    personaMetrics = { success: true, data: dashData.personas || [] }
                    
                    console.log('🔍 [DashboardService] DEBUG - Updated metrics:', {
                      hasOverallMetrics: !!overallMetrics.data,
                      overallMetricsKeys: overallMetrics.data ? Object.keys(overallMetrics.data) : [],
                      platformMetricsLength: platformMetrics.data?.length || 0
                    })
                    
                    // Re-fetch competitors, topics, personas
                    const [newCompetitors, newTopics, newPersonas] = await Promise.all([
                      apiService.getCompetitors(urlAnalysisId).catch(e => ({ success: false, data: [] })),
                      apiService.getTopics(urlAnalysisId).catch(e => ({ success: false, data: [] })),
                      apiService.getPersonas(urlAnalysisId).catch(e => ({ success: false, data: [] }))
                    ])
                    competitors = newCompetitors
                    topics = newTopics
                    personas = newPersonas
                    
                    console.log('🔍 [DashboardService] DEBUG - After reprocessing:', {
                      hasOverallMetrics: !!overallMetrics.data,
                      hasCompetitors: competitors.data?.length > 0,
                      competitorsCount: competitors.data?.length || 0,
                      dashDataKeys: dashData ? Object.keys(dashData) : [],
                      competitorsSuccess: competitors.success,
                      topicsSuccess: topics.success,
                      personasSuccess: personas.success
                    })
                    
                    // After successful retry, we have data so we should skip the error throw
                    // The updated variables will be checked again below, but now they should have data
                  }
                } catch (retryError) {
                  console.error('❌ [DashboardService] DEBUG - Error retrying getDashboardAll:', retryError)
                }
              }
            } else {
              console.log('🔍 [DashboardService] DEBUG - No prompt tests found, user needs to complete onboarding')
            }
          } catch (checkError) {
            console.error('❌ [DashboardService] DEBUG - Error checking for prompt tests:', {
              error: checkError,
              message: checkError instanceof Error ? checkError.message : String(checkError)
            })
          }
        }
        
        // Final check after potential calculation
        if (!overallMetrics.data && !competitors.data?.length) {
          console.log('⚠️ [DashboardService] DEBUG - No data available after all attempts')
          console.log('🔍 [DashboardService] DEBUG - Final state:', {
            overallMetrics: overallMetrics,
            competitors: competitors,
            urlAnalysisId: urlAnalysisId
          })
          
          // ✅ FIX: Provide more helpful error message based on what's missing
          // Check if prompt tests exist to give better guidance
          let errorMessage = 'No data available. Please complete the onboarding flow first.'
          if (urlAnalysisId) {
            try {
              const testsResponse = await apiService.getAllTests({ urlAnalysisId })
              const testCount = testsResponse.data?.length || 0
              if (testCount === 0) {
                errorMessage = 'No prompt tests found. Please complete prompt testing in the onboarding flow first.'
              } else {
                errorMessage = 'Metrics not calculated yet. Please wait a moment and refresh, or contact support if the issue persists.'
              }
            } catch (err) {
              // If we can't check tests, use default message
              console.log('Could not check prompt tests status:', err)
            }
          }
          
          throw new Error(errorMessage)
        }
      }

      // Check if we have the required data structure
      if (overallMetrics.data && !overallMetrics.data.brandMetrics) {
        console.log('⚠️ [DashboardService] Overall metrics missing brandMetrics')
        throw new Error('Metrics data is incomplete. Please run the complete onboarding flow again.')
      }

      // ✅ REMOVED: Frontend filtering logic - now handled by backend API
      // The backend /api/dashboard/all endpoint now accepts filter parameters and
      // returns pre-filtered data, so no frontend filtering is needed
      console.log('✅ [DashboardService] Using backend-filtered data from API')

      // Transform to frontend format using backend-filtered data
      const dashboardData = transformAggregatedMetricsToDashboardData(
        overallMetrics.data,  // ✅ Backend already returns filtered data
        platformMetrics.data || [],
        topicMetrics.data || [],
        personaMetrics.data || [],
        competitors.data || [],
        topics.data || [],
        personas.data || []
      )
      
      // ✅ Override with backend-formatted rankings if available
      if (formattedTopicRankings.length > 0) {
        (dashboardData.metrics as any).topicRankings = formattedTopicRankings
      }
      if (formattedPersonaRankings.length > 0) {
        (dashboardData.metrics as any).personaRankings = formattedPersonaRankings
      }

      // ✅ Add AI insights to dashboard data
      if (aiInsights) {
        dashboardData.aiInsights = aiInsights
        console.log('✅ [DashboardService] AI insights included:', 
          aiInsights.whatsWorking?.length || 0, 'working,',
          aiInsights.needsAttention?.length || 0, 'attention')
      } else {
        console.log('⚠️ [DashboardService] No AI insights available')
      }
      
      // 🧠 Always trigger insights generation for all tabs in background
      // This ensures each tab has fresh, tab-specific insights
      this.triggerInsightsGeneration(urlAnalysisId)

      // Add filter options to dashboard data
      const filterOptions = transformFilters({
        metrics: {
          platformMetrics: platformMetrics.data,
          topicMetrics: topicMetrics.data,
          personaMetrics: personaMetrics.data
        }
      })
      
      dashboardData.filters = filterOptions

      console.log('✅ [DashboardService] Dashboard data transformed successfully')
      return dashboardData
    })
  }

  /**
   * Process fallback data when dashboard/all endpoint fails
   */
  private processFallbackData(
    overallMetrics: any,
    platformMetrics: any,
    topicMetrics: any,
    personaMetrics: any,
    competitors: any,
    topics: any,
    personas: any,
    filters: DashboardFilters = {}
  ) {
    // Check if we have any data
    if (!overallMetrics.data && !competitors.data?.length) {
      console.log('⚠️ [DashboardService] No data available yet')
      throw new Error('No data available. Please complete the onboarding flow first.')
    }

    // Check if we have the required data structure
    if (overallMetrics.data && !overallMetrics.data.brandMetrics) {
      console.log('⚠️ [DashboardService] Overall metrics missing brandMetrics')
      throw new Error('Metrics data is incomplete. Please run the complete onboarding flow again.')
    }

    // ✅ REMOVED: Frontend filtering logic - fallback should also use backend filtering
    // Note: Fallback mode means the /api/dashboard/all endpoint failed, so we're using
    // individual endpoints. In this case, we'll use the raw data without filtering
    // since the individual endpoints don't support filtering yet.
    console.log('⚠️ [DashboardService] [Fallback] Using raw data (filtering not available in fallback mode)')

    // Transform to frontend format
    const dashboardData = transformAggregatedMetricsToDashboardData(
      overallMetrics.data,  // ✅ Use raw data in fallback mode
      platformMetrics.data || [],
      topicMetrics.data || [],
      personaMetrics.data || [],
      competitors.data || [],
      topics.data || [],
      personas.data || []
    )
    
    // ✅ Note: Fallback doesn't have backend-formatted rankings, so we use transformed data

    // Add filter options to dashboard data
    const filterOptions = transformFilters({
      metrics: {
        platformMetrics: platformMetrics.data,
        topicMetrics: topicMetrics.data,
        personaMetrics: personaMetrics.data
      }
    })
    
    dashboardData.filters = filterOptions

    console.log('✅ [DashboardService] Fallback dashboard data transformed successfully')
    return dashboardData
  }

  /**
   * Get visibility metrics specifically
   */
  async getVisibilityMetrics(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `visibility-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching visibility metrics')

      const [overallMetrics, topicMetrics] = await Promise.all([
        apiService.getAggregatedMetrics({ ...filters, scope: 'overall' }),
        apiService.getAggregatedMetrics({ ...filters, scope: 'topic' })
      ])

      const brandMetrics = overallMetrics.data.brandMetrics || []
      const topics = await apiService.getTopics(filters.urlAnalysisId)

      return {
        visibilityScore: transformBrandMetricsToMetric(brandMetrics, 'visibility'),
        shareOfVoice: transformBrandMetricsToMetric(brandMetrics, 'shareOfVoice'),
        averagePosition: transformBrandMetricsToMetric(brandMetrics, 'averagePosition'),
        depthOfMention: transformBrandMetricsToMetric(brandMetrics, 'depthOfMention'),
        topicRankings: transformTopicsToTopicRankings(topics.data, topicMetrics.data),
        competitors: transformBrandMetricsToCompetitors(brandMetrics)
      }
    })
  }

  /**
   * Get sentiment metrics
   */
  async getSentimentMetrics(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `sentiment-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching sentiment metrics')

      const overallMetrics = await apiService.getAggregatedMetrics({ ...filters, scope: 'overall' })
      const brandMetrics = overallMetrics.data.brandMetrics || []

      return {
        sentimentScore: transformBrandMetricsToMetric(brandMetrics, 'sentiment'),
        sentimentBreakdown: brandMetrics.map(brand => ({
          brandName: brand.brandName,
          sentimentScore: brand.sentimentScore,
          sentimentShare: brand.sentimentShare,
          sentimentBreakdown: brand.sentimentBreakdown
        }))
      }
    })
  }

  /**
   * Get citation metrics
   */
  async getCitationMetrics(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `citations-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching citation metrics')

      const overallMetrics = await apiService.getAggregatedMetrics({ ...filters, scope: 'overall' })
      const brandMetrics = overallMetrics.data.brandMetrics || []

      return {
        citationShare: transformBrandMetricsToMetric(brandMetrics, 'citationShare'),
        citationTypes: brandMetrics.map(brand => ({
          brandName: brand.brandName,
          brandCitations: brand.brandCitationsTotal,
          earnedCitations: brand.earnedCitationsTotal,
          socialCitations: brand.socialCitationsTotal,
          totalCitations: brand.totalCitations
        }))
      }
    })
  }

  /**
   * Get prompts data
   */
  async getPromptsData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `prompts-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching prompts data')

      const [prompts, allTests] = await Promise.all([
        apiService.getPrompts(filters),
        apiService.getAllTests(filters)
      ])

      return {
        prompts: prompts.data,
        tests: allTests.data,
        summary: {
          totalPrompts: prompts.data.length,
          totalTests: allTests.data.length,
          completedTests: allTests.data.filter((test: any) => test.status === 'completed').length
        }
      }
    })
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(urlAnalysisId?: string): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `insights-${urlAnalysisId || 'latest'}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching performance insights')

      try {
        const insights = await apiService.getLatestInsights(urlAnalysisId)
        return transformInsightsToFrontend(insights.data)
      } catch (error) {
        // If no insights found, try to generate them
        if (error instanceof Error && error.message.includes('No insights found')) {
          console.log('🔄 [DashboardService] No insights found, generating new ones...')
          const generatedInsights = await apiService.generateInsights(urlAnalysisId)
          return transformInsightsToFrontend(generatedInsights.data)
        }
        throw error
      }
    })
  }

  /**
   * Get filters data (platforms, topics, personas)
   */
  async getFiltersData(urlAnalysisId?: string): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `filters-${urlAnalysisId || 'all'}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching filters data')

      const [competitors, topics, personas] = await Promise.all([
        apiService.getCompetitors(urlAnalysisId),
        apiService.getTopics(urlAnalysisId),
        apiService.getPersonas(urlAnalysisId)
      ])

      return {
        platforms: [
          { id: 'openai', name: 'OpenAI', enabled: true },
          { id: 'gemini', name: 'Gemini', enabled: true },
          { id: 'claude', name: 'Claude', enabled: true },
          { id: 'perplexity', name: 'Perplexity', enabled: true }
        ],
        topics: topics.data.map((topic: any) => ({
          id: topic._id,
          name: topic.name,
          enabled: topic.selected
        })),
        personas: personas.data.map((persona: any) => ({
          id: persona._id,
          name: persona.type,
          enabled: persona.selected
        })),
        competitors: competitors.data.map((competitor: any) => ({
          id: competitor._id,
          name: competitor.name,
          enabled: competitor.selected
        }))
      }
    })
  }

  /**
   * Update filter selections
   */
  async updateFilterSelections(
    type: 'topics' | 'personas' | 'competitors',
    selections: string[]
  ): Promise<DashboardServiceResponse<any>> {
    try {
      console.log(`🔄 [DashboardService] Updating ${type} selections:`, selections)

      const updatePromises = selections.map(async (id) => {
        switch (type) {
          case 'topics':
            return apiService.updateTopic(id, { selected: true })
          case 'personas':
            return apiService.updatePersona(id, { selected: true })
          case 'competitors':
            return apiService.updateCompetitor(id, { selected: true })
        }
      })

      await Promise.all(updatePromises)
      
      // Clear relevant cache entries
      this.clearCacheByPattern(`${type}-`)
      
      return { data: { success: true }, error: null, loading: false }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to update selections',
        loading: false
      }
    }
  }

  /**
   * Generate new insights
   */
  async generateNewInsights(urlAnalysisId?: string): Promise<DashboardServiceResponse<any>> {
    try {
      console.log('🔄 [DashboardService] Generating new insights...')

      const insights = await apiService.generateInsights(urlAnalysisId)
      const transformedInsights = transformInsightsToFrontend(insights.data)
      
      // Clear insights cache
      this.clearCacheByPattern('insights-')
      
      return { data: transformedInsights, error: null, loading: false }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to generate insights',
        loading: false
      }
    }
  }

  /**
   * Clear cache by pattern
   */
  private clearCacheByPattern(pattern: string) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern))
    keysToDelete.forEach(key => this.cache.delete(key))
  }


  /**
   * Get prompts dashboard data with caching
   */
  async getPromptsDashboardData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const analysisId = filters.selectedAnalysisId || filters.urlAnalysisId
    const cacheKey = `prompts-${analysisId || 'default'}`
    
    console.log('📊 [DashboardService] Getting prompts dashboard data for analysis:', analysisId)
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('✅ [DashboardService] Using cached prompts data')
      return {
        data: cached.data,
        error: null,
        loading: false
      }
    }

    try {
      console.log('🔄 [DashboardService] Fetching fresh prompts data from API')
      const response = await apiService.getPromptsDashboard(analysisId || undefined)
      
      if (response.success && response.data) {
        // Cache the data
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        })
        
        console.log('✅ [DashboardService] Prompts data cached successfully')
        return {
          data: response.data,
          error: null,
          loading: false
        }
      } else {
        throw new Error('Failed to fetch prompts dashboard data')
      }
    } catch (error) {
      console.error('❌ [DashboardService] Error fetching prompts data:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch prompts data',
        loading: false
      }
    }
  }

  /**
   * Clear cache for prompts data
   */
  clearPromptsCacheForAnalysis(analysisId: string): void {
    const cacheKey = `prompts-${analysisId}`
    console.log('🧹 [DashboardService] Clearing prompts cache for analysis:', analysisId)
    this.cache.delete(cacheKey)
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    }
  }
}

export default new DashboardService()
