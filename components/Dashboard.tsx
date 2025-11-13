'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from './layout/Sidebar'
import { TopNav } from './layout/TopNav'
import { 
  VisibilityTab, 
  PromptsTab, 
  SentimentTab, 
  CitationsTab
} from './tabs'
import { useFilters } from '@/contexts/FilterContext'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useSkeletonLoader } from '@/hooks/useSkeletonLoader'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { SidebarSkeleton } from '@/components/layout/SidebarSkeleton'
import { TopNavSkeleton } from '@/components/layout/TopNavSkeleton'
import { AnalysisSelector } from '@/components/analysis/AnalysisSelector'
import dashboardService from '@/services/dashboardService'
import apiService from '@/services/api'
import { DashboardData } from '@/types/dashboard'

interface DashboardProps {
  initialTab?: string
  urlAnalysisId?: string // ✅ Accept urlAnalysisId from URL params
}

export function Dashboard({ initialTab, urlAnalysisId: urlParamAnalysisId }: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { data: onboardingData, updateData } = useOnboarding()
  const [activeTab, setActiveTab] = useState(initialTab || 'visibility')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isPromptBuilderFullScreen, setIsPromptBuilderFullScreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const { selectedTopics, selectedPersonas, selectedPlatforms, selectedAnalysisId, setSelectedAnalysisId, setSelectedTopics, setSelectedPersonas, setSelectedPlatforms } = useFilters()
  
  // Track if we're fetching the latest analysis
  const [isFetchingLatestAnalysis, setIsFetchingLatestAnalysis] = useState(false)
  
  // Ref to the main content area for scroll control
  const mainContentRef = useRef<HTMLElement>(null)

  // ✅ Get URL parameter from both prop (server-side) and searchParams (client-side fallback)
  // This ensures we always get the correct ID even if prop isn't passed
  const urlAnalysisIdFromUrl = urlParamAnalysisId || searchParams?.get('analysisId') || null

  // ✅ CLEAR INTERNAL CACHES ON MOUNT (but keep selectedAnalysisId)
  useEffect(() => {
    console.log('🧹 [Dashboard] Clearing internal caches on mount...')
    
    // Clear dashboardService internal cache
    dashboardService.clearCache()
    console.log('✅ [Dashboard] dashboardService cache cleared')
    
    // Note: We do NOT clear selectedAnalysisId here anymore
    // The AnalysisSelector will manage this properly
  }, []) // Run ONLY once on mount

  // ✅ IMMEDIATE initialization: Set URL parameter FIRST, before any other effects run
  // This ensures URL param takes absolute priority over any stale context data
  useEffect(() => {
    // Get URL parameter value directly (may not be available yet in urlAnalysisIdFromUrl on first render)
    const urlIdFromProp = urlParamAnalysisId
    const urlIdFromSearch = searchParams?.get('analysisId')
    const urlId = urlIdFromProp || urlIdFromSearch || null
    
    if (urlId) {
      console.log('🚨 [Dashboard] IMMEDIATE: Setting selectedAnalysisId from URL parameter:', urlId, {
        fromProp: urlIdFromProp,
        fromSearchParams: urlIdFromSearch,
        currentSelectedId: selectedAnalysisId
      })
      setSelectedAnalysisId(urlId)
      // ✅ Also update OnboardingContext to keep it in sync for future refreshes
      if (onboardingData?.urlAnalysisId !== urlId) {
        console.log('🔄 [Dashboard] Updating OnboardingContext with URL parameter:', urlId)
        updateData({ urlAnalysisId: urlId })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run ONLY on mount - this ensures URL param is set before any other initialization

  // ✅ Watch for URL parameter changes and override selectedAnalysisId if it changes
  useEffect(() => {
    if (urlAnalysisIdFromUrl && selectedAnalysisId !== urlAnalysisIdFromUrl) {
      console.log('🔄 [Dashboard] URL parameter changed, updating selectedAnalysisId:', {
        oldId: selectedAnalysisId,
        newId: urlAnalysisIdFromUrl
      })
      setSelectedAnalysisId(urlAnalysisIdFromUrl)
      // ✅ Also update OnboardingContext to keep it in sync
      if (onboardingData?.urlAnalysisId !== urlAnalysisIdFromUrl) {
        updateData({ urlAnalysisId: urlAnalysisIdFromUrl })
      }
    }
  }, [urlAnalysisIdFromUrl, selectedAnalysisId, setSelectedAnalysisId, onboardingData?.urlAnalysisId, updateData])

  // ✅ SAFEGUARD: If selectedAnalysisId becomes null while we have a URL parameter, restore it immediately
  // This prevents any other code from accidentally clearing the ID when URL param is present
  useEffect(() => {
    if (urlAnalysisIdFromUrl && !selectedAnalysisId) {
      console.log('🚨 [Dashboard] SAFEGUARD: selectedAnalysisId became null but URL parameter exists, restoring:', urlAnalysisIdFromUrl)
      setSelectedAnalysisId(urlAnalysisIdFromUrl)
    }
  }, [urlAnalysisIdFromUrl, selectedAnalysisId, setSelectedAnalysisId])

  // ✅ Log received URL parameter for debugging
  useEffect(() => {
    console.log('🔍 [Dashboard] Component state:', {
      urlParamAnalysisId_prop: urlParamAnalysisId,
      urlAnalysisIdFromUrl_searchParams: searchParams?.get('analysisId'),
      finalUrlAnalysisId: urlAnalysisIdFromUrl,
      selectedAnalysisId_fromFilter: selectedAnalysisId,
      onboardingContextId: onboardingData?.urlAnalysisId
    })
  }, [urlParamAnalysisId, urlAnalysisIdFromUrl, selectedAnalysisId, onboardingData?.urlAnalysisId, searchParams])

  // ✅ Secondary initialization: Use OnboardingContext if no URL param was available
  useEffect(() => {
    // Only initialize from context if:
    // 1. No URL parameter was found
    // 2. selectedAnalysisId is not already set (from URL param or previous context)
    if (!urlAnalysisIdFromUrl && !selectedAnalysisId && onboardingData?.urlAnalysisId) {
      console.log('🔄 [Dashboard] Initializing selectedAnalysisId from OnboardingContext (no URL param):', onboardingData.urlAnalysisId)
      setSelectedAnalysisId(onboardingData.urlAnalysisId)
    }
  }, [urlAnalysisIdFromUrl, onboardingData?.urlAnalysisId, selectedAnalysisId, setSelectedAnalysisId])

  // ✅ FIX: Use ref to track if we've already fetched to prevent infinite loops
  const hasFetchedLatestAnalysis = useRef(false)
  
  // Fetch latest analysis ID if not available from URL param or context
  // Only fetch from API if URL param, context, and selectedAnalysisId don't have it
  useEffect(() => {
    const fetchLatestAnalysis = async () => {
      // Don't fetch if we already have an ID or are waiting for auth
      if (selectedAnalysisId || authLoading || !isAuthenticated || isFetchingLatestAnalysis) {
        return
      }
      
      // ✅ FIX: Prevent multiple fetches - only fetch once
      if (hasFetchedLatestAnalysis.current) {
        console.log('⏭️ [Dashboard] Already fetched latest analysis, skipping...')
        return
      }
      
      // Priority 1: Check URL parameter (from navigation from results page)
      if (urlAnalysisIdFromUrl) {
        console.log('🔄 [Dashboard] Found urlAnalysisId in URL parameter, using it:', urlAnalysisIdFromUrl)
        setSelectedAnalysisId(urlAnalysisIdFromUrl)
        return
      }
      
      // Priority 2: Check OnboardingContext (for refresh/return visits)
      if (onboardingData?.urlAnalysisId) {
        console.log('🔄 [Dashboard] Found urlAnalysisId in context, using it:', onboardingData.urlAnalysisId)
        setSelectedAnalysisId(onboardingData.urlAnalysisId)
        return
      }
      
      // Only fetch from API if context doesn't have the ID (and we haven't fetched yet)
      console.log('🔍 [Dashboard] No selectedAnalysisId in context, fetching latest analysis from API...')
      hasFetchedLatestAnalysis.current = true // Mark as fetched
      setIsFetchingLatestAnalysis(true)
      try {
        console.log('🔍 [Dashboard] DEBUG - Calling getLatestAnalysis()')
        const response = await apiService.getLatestAnalysis()
        
        console.log('🔍 [Dashboard] DEBUG - getLatestAnalysis response:', {
          success: response.success,
          hasData: !!response.data,
          urlAnalysisId: response.data?.urlAnalysisId,
          fullResponse: response
        })
        
        if (response.success && response.data?.urlAnalysisId) {
          console.log('✅ [Dashboard] Found latest analysis:', response.data.urlAnalysisId)
          console.log('🔍 [Dashboard] DEBUG - Setting selectedAnalysisId to:', response.data.urlAnalysisId)
          setSelectedAnalysisId(response.data.urlAnalysisId)
          // Clear any previous errors since we found the analysis
          setError(null)
        } else {
          console.warn('⚠️ [Dashboard] DEBUG - No analysis found in API response:', {
            success: response.success,
            hasData: !!response.data,
            urlAnalysisId: response.data?.urlAnalysisId,
            responseKeys: response.data ? Object.keys(response.data) : []
          })
          // Don't set error immediately - wait for context to load
          // Only set error if context also doesn't have it (checked below)
          const hasContextId = !!onboardingData?.urlAnalysisId
          if (!hasContextId) {
            console.warn('⚠️ [Dashboard] No analysis found in API and context has no urlAnalysisId')
            setError('No analysis found. Please complete the onboarding flow first.')
          }
        }
      } catch (error) {
        console.error('❌ [Dashboard] DEBUG - Exception fetching latest analysis:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        })
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch latest analysis'
        // Check if context has the ID before setting error
        const hasContextId = !!onboardingData?.urlAnalysisId
        if (!hasContextId) {
          // Only set error if it's not a "no analysis" type error (which is expected for new users)
          if (!errorMessage.includes('No analysis') && !errorMessage.includes('not found')) {
            setError(errorMessage)
          } else {
            setError('No analysis found. Please complete the onboarding flow first.')
          }
        } else {
          // Context has the ID, use it instead
          console.log('🔄 [Dashboard] API failed but context has urlAnalysisId, using it:', onboardingData.urlAnalysisId)
          setSelectedAnalysisId(onboardingData.urlAnalysisId)
        }
      } finally {
        setIsFetchingLatestAnalysis(false)
      }
    }
    
    fetchLatestAnalysis()
    // ✅ FIX: Removed selectedAnalysisId and onboardingData?.urlAnalysisId from dependencies
    // to prevent infinite loops. Only re-run when auth state changes or URL param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, urlAnalysisIdFromUrl])
  
  // ✅ FIX: Reset fetch flag when URL param or context changes (so we can re-fetch if needed)
  useEffect(() => {
    if (urlAnalysisIdFromUrl || onboardingData?.urlAnalysisId) {
      hasFetchedLatestAnalysis.current = false
    }
  }, [urlAnalysisIdFromUrl, onboardingData?.urlAnalysisId])
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🚫 [Dashboard] User not authenticated, redirecting to signin')
      router.push('/onboarding/signin')
    }
  }, [isAuthenticated, authLoading, router])

  // Check user access to dashboard
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading || !isAuthenticated) {
        return
      }

      if (accessChecked) {
        return
      }

      try {
        setAccessChecked(true)
        const userResponse = await apiService.getCurrentUser()
        const userData = userResponse.data?.user || userResponse.data
        const hasAccessField = userData?.access === true
        
        // Check if email is in allowed list (fallback check)
        const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com', 'rahil.m@media.net']
        const userEmail = userData?.email?.toLowerCase() || user?.email?.toLowerCase()
        const isAllowedEmail = userEmail && allowedEmails.includes(userEmail)
        
        const finalAccess = hasAccessField || isAllowedEmail
        
        if (!finalAccess) {
          console.warn('⚠️ [Dashboard] User does not have dashboard access, redirecting to results page')
          setHasAccess(false)
          // Redirect to results page or show access denied message
          router.push('/onboarding/results')
          return
        }
        
        setHasAccess(true)
        console.log('✅ [Dashboard] User has dashboard access')
      } catch (error) {
        console.error('❌ [Dashboard] Error checking access:', error)
        // On error, assume no access
        setHasAccess(false)
        router.push('/onboarding/results')
      }
    }

    checkAccess()
  }, [authLoading, isAuthenticated, accessChecked, router, user])
  
  // Global skeleton loading state
  const [isGlobalLoading, setIsGlobalLoading] = useState(false)
  const { showSkeleton: showGlobalSkeleton, isVisible: isGlobalVisible, setLoading: setGlobalLoading } = useSkeletonLoader({
    threshold: 300,
    debounceDelay: 250
  })

  // Track previous analysis ID to detect changes
  const [previousAnalysisId, setPreviousAnalysisId] = useState<string | null>(null)
  
  // ✅ Scroll to top when tab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeTab])
  
  // Don't render dashboard if access hasn't been checked or user doesn't have access
  // ✅ MOVED: This check must happen AFTER all hooks are declared to avoid hook order issues
  const shouldShowAccessCheck = !authLoading && isAuthenticated && (!accessChecked || !hasAccess)
  
  // Load dashboard data when analysis OR filters change
  useEffect(() => {
    const loadDashboardData = async () => {
      // Don't load if we're still waiting for auth or analysis ID
      if (authLoading || !isAuthenticated) {
        console.log('⏳ [Dashboard] Waiting for auth to complete before loading data')
        return
      }
      
      // Wait for latest analysis fetch to complete before loading data
      if (isFetchingLatestAnalysis) {
        console.log('⏳ [Dashboard] Waiting for latest analysis fetch to complete')
        return
      }
      
      // ✅ VALIDATION: URL parameter always takes precedence
      // If URL parameter exists, it must be used - prevent loading with mismatched IDs
      if (urlAnalysisIdFromUrl) {
        // URL parameter exists - ensure selectedAnalysisId matches it
        if (selectedAnalysisId && selectedAnalysisId !== urlAnalysisIdFromUrl) {
          console.warn('⚠️ [Dashboard] VALIDATION: selectedAnalysisId mismatch with URL parameter, correcting:', {
            selectedAnalysisId_fromState: selectedAnalysisId,
            urlAnalysisIdFromUrl: urlAnalysisIdFromUrl
          })
          // Update selectedAnalysisId to match URL parameter
          setSelectedAnalysisId(urlAnalysisIdFromUrl)
          // Don't proceed with load yet - let the state update trigger a new load
          return
        }
        // If selectedAnalysisId is null but URL param exists, set it now
        if (!selectedAnalysisId) {
          console.log('🔄 [Dashboard] Setting selectedAnalysisId from URL parameter:', urlAnalysisIdFromUrl)
          setSelectedAnalysisId(urlAnalysisIdFromUrl)
          // Don't proceed with load yet - let the state update trigger a new load
          return
        }
      }
      
      // Wait for analysis ID to be set before loading data
      // ✅ Use URL parameter directly if selectedAnalysisId is not set yet (handles race conditions)
      const analysisIdToUse = urlAnalysisIdFromUrl || selectedAnalysisId
      if (!analysisIdToUse) {
        console.log('⏳ [Dashboard] Waiting for selectedAnalysisId or URL parameter before loading data')
        return
      }
      
      try {
        setIsLoading(true)
        setGlobalLoading(true) // Trigger skeleton immediately
        setError(null)
        
        // ✅ PRIORITIZE URL PARAMETER: Always use URL parameter if it exists, fall back to selectedAnalysisId
        // This ensures we never load with a stale/invalid ID when URL parameter is present
        const finalAnalysisId = urlAnalysisIdFromUrl || selectedAnalysisId || analysisIdToUse
        
        // ✅ PRE-LOAD VALIDATION: Final check to ensure we're using the correct ID
        if (urlAnalysisIdFromUrl && finalAnalysisId !== urlAnalysisIdFromUrl) {
          console.error('🚨 [Dashboard] VALIDATION ERROR: finalAnalysisId does not match URL parameter!', {
            finalAnalysisId: finalAnalysisId,
            urlAnalysisIdFromUrl: urlAnalysisIdFromUrl,
            selectedAnalysisId: selectedAnalysisId
          })
          // Correct the ID and return to let state update trigger reload
          setSelectedAnalysisId(urlAnalysisIdFromUrl)
          return
        }
        
        console.log('🔄 [Dashboard] Loading dashboard data...')
        console.log('🔄 [Dashboard] Current filters:', {
          analysisId: finalAnalysisId,
          selectedAnalysisId_fromState: selectedAnalysisId,
          urlAnalysisIdFromUrl: urlAnalysisIdFromUrl,
          topics: selectedTopics,
          personas: selectedPersonas,
          platforms: selectedPlatforms
        })
        
        // Clear cache only when analysis actually changes
        if (finalAnalysisId !== previousAnalysisId) {
          console.log('🔄 [Dashboard] Analysis changed, clearing cache for new analysis:', finalAnalysisId)
          dashboardService.clearCacheForAnalysis(finalAnalysisId || 'default')
          dashboardService.clearPromptsCacheForAnalysis(finalAnalysisId || 'default')
          setPreviousAnalysisId(finalAnalysisId)
        } else {
          // Clear cache for current analysis to force fresh fetch with filters
          console.log('🔄 [Dashboard] Filters changed, clearing cache for fresh data with filters')
          dashboardService.clearCacheForAnalysis(finalAnalysisId || 'default')
        }
        
        const filters = {
          platforms: selectedPlatforms,
          topics: selectedTopics,
          personas: selectedPersonas,
          selectedAnalysisId: finalAnalysisId
        }
        
        console.log('🔍 [Dashboard] DEBUG - About to call getDashboardData with filters:', {
          selectedAnalysisId: filters.selectedAnalysisId,
          urlAnalysisId: (filters as any).urlAnalysisId,
          topicsCount: filters.topics?.length || 0,
          personasCount: filters.personas?.length || 0,
          platformsCount: filters.platforms?.length || 0
        })
        
        const response = await dashboardService.getDashboardData(filters)
        
        console.log('🔍 [Dashboard] DEBUG - getDashboardData response:', {
          hasError: !!response.error,
          hasData: !!response.data,
          error: response.error,
          dataKeys: response.data ? Object.keys(response.data) : []
        })
        
        if (response.error) {
          setError(response.error)
          console.error('❌ [Dashboard] Error loading data:', response.error)
          console.error('🔍 [Dashboard] DEBUG - Error details:', {
            errorType: typeof response.error,
            errorLength: response.error?.length,
            errorString: String(response.error)
          })
        } else if (response.data) {
          setDashboardData(response.data)
          console.log('✅ [Dashboard] Data loaded successfully with filters:', response.data)
        } else {
          console.warn('⚠️ [Dashboard] DEBUG - No error but also no data in response')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
        setError(errorMessage)
        console.error('❌ [Dashboard] Unexpected error:', err)
      } finally {
        setIsLoading(false)
        setGlobalLoading(false) // Hide skeleton when done
      }
    }

    loadDashboardData()
  }, [selectedAnalysisId, selectedTopics, selectedPersonas, selectedPlatforms, setGlobalLoading, previousAnalysisId, authLoading, isAuthenticated, isFetchingLatestAnalysis, urlAnalysisIdFromUrl, setSelectedAnalysisId]) // Reload when analysis OR filters change - INCLUDES urlAnalysisIdFromUrl to prevent stale ID usage

  // Remove redundant global loading effect since we now handle it directly in loadDashboardData

  // ✅ EARLY RETURN: Now that all hooks are called, we can safely return early for access checks
  if (shouldShowAccessCheck) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <div className="text-foreground">Checking access...</div>
        </div>
      </div>
    )
  }

  const handleTogglePromptBuilderFullScreen = (isFullScreen: boolean) => {
    setIsPromptBuilderFullScreen(isFullScreen)
  }

  const handlePlatformChange = (platformId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedPlatforms(prev => [...prev, platformId])
    } else {
      setSelectedPlatforms(prev => prev.filter(id => id !== platformId))
    }
  }

  const handleTopicChange = (topicId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedTopics(prev => [...prev, topicId])
    } else {
      setSelectedTopics(prev => prev.filter(id => id !== topicId))
    }
  }

  const handlePersonaChange = (personaId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedPersonas(prev => [...prev, personaId])
    } else {
      setSelectedPersonas(prev => prev.filter(id => id !== personaId))
    }
  }

  const handleDateRangeChange = (from: Date, to: Date) => {
    // Handle date range change
    console.log('Date range changed:', { from, to })
  }

  // Show loading while checking authentication or fetching latest analysis
  if (authLoading || isFetchingLatestAnalysis) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <SidebarSkeleton />
          <div className="flex-1">
            <TopNavSkeleton />
            <div className="p-6">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <div className="text-muted-foreground">
                  {authLoading ? 'Checking authentication...' : 'Loading latest analysis...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Show loading while fetching dashboard data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <SidebarSkeleton />
          <div className="flex-1">
            <TopNavSkeleton />
            <div className="p-6">
              <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={`skeleton-${i}`} className="h-32 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
                <div className="h-64 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Retry handler that resets error and triggers re-fetch
  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    // ✅ Don't reset selectedAnalysisId if we have a URL parameter - it should always be preserved
    // Instead, if we have URL param, ensure it's set and let the data loading effect handle the rest
    if (urlAnalysisIdFromUrl) {
      console.log('🔄 [Dashboard] Retry clicked - preserving URL parameter:', urlAnalysisIdFromUrl)
      // Ensure URL parameter is still set (it should be, but just in case)
      if (selectedAnalysisId !== urlAnalysisIdFromUrl) {
        setSelectedAnalysisId(urlAnalysisIdFromUrl)
      }
      // The data loading effect will automatically re-fetch when isLoading changes
    } else {
      // Only reset if no URL parameter (for manual navigation/refresh scenarios)
      console.log('🔄 [Dashboard] Retry clicked - no URL parameter, resetting selectedAnalysisId to trigger re-fetch')
      setSelectedAnalysisId(null)
    }
  }

  const handleGoogleLogin = () => {
    console.log('🧹 [Dashboard] Clearing all localStorage data before Google login...')
    
    // Clear all relevant localStorage items to start fresh
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('selectedAnalysisId')
      localStorage.removeItem('onboarding-data')
      localStorage.removeItem('websiteData')
      console.log('✅ [Dashboard] All localStorage data cleared')
    }
    
    // Redirect to Google OAuth which will fetch the latest analysis
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    console.log('🔄 [Dashboard] Redirecting to Google OAuth to get fresh data...')
    window.location.href = `${apiUrl}/auth/google?returnUrl=${encodeURIComponent('/dashboard')}`
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <SidebarSkeleton />
          <div className="flex-1">
            <TopNavSkeleton />
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-red-500 text-lg font-semibold mb-2">
                  Failed to load dashboard data
                </div>
                <div className="text-muted-foreground mb-4">{error}</div>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={handleGoogleLogin} 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show no data state
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <Sidebar />
          <div className="flex-1">
            <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="p-6">
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="text-muted-foreground text-lg font-semibold mb-2">
                    {error || 'No dashboard data available'}
                  </div>
                  <div className="text-muted-foreground/70 mb-4">
                    Please complete the onboarding process to see your analytics
                  </div>
                  <a 
                    href="/onboarding" 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Start Onboarding
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    const filterContext = {
      selectedTopics,
      selectedPersonas,
      selectedPlatforms,
      selectedAnalysisId
    }

    switch (activeTab) {
      case 'visibility':
        return <VisibilityTab filterContext={filterContext} dashboardData={dashboardData} />
      
      case 'prompts':
        return <PromptsTab onToggleFullScreen={handleTogglePromptBuilderFullScreen} filterContext={filterContext} dashboardData={dashboardData} />
      
      case 'sentiment':
        return <SentimentTab filterContext={filterContext} dashboardData={dashboardData} />
      
      case 'citations':
        return <CitationsTab filterContext={filterContext} dashboardData={dashboardData} />
      
      default:
        return <VisibilityTab filterContext={filterContext} dashboardData={dashboardData} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - hidden when Prompt Builder is full screen */}
      {!isPromptBuilderFullScreen && (
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation - hidden when Prompt Builder is full screen */}
        {!isPromptBuilderFullScreen && (
          <TopNav activeTab={activeTab} onTabChange={setActiveTab} dashboardData={dashboardData} />
        )}

        {/* Analysis Selector - hidden when Prompt Builder is full screen */}
        {!isPromptBuilderFullScreen && (
          <div className="border-b border-border bg-background px-6 py-3">
            <AnalysisSelector 
              selectedAnalysisId={selectedAnalysisId}
              onAnalysisChange={setSelectedAnalysisId}
            />
          </div>
        )}

        {/* Content Area */}
        <main ref={mainContentRef} className={`flex-1 overflow-auto ${isPromptBuilderFullScreen ? 'bg-background' : 'bg-muted/30'}`}>
          <div className={isPromptBuilderFullScreen ? '' : 'px-2 py-4'}>
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

