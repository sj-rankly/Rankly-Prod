'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import Link from 'next/link'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function ResultsPage() {
  const router = useRouter()
  const { data } = useOnboarding()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isOpening, setIsOpening] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [metricsData, setMetricsData] = useState<any>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [showBookDemo, setShowBookDemo] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(false)
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 ResultsPage - Onboarding data:', data)
    console.log('🔍 ResultsPage - Generated prompts:', data.generatedPrompts)
    console.log('🔍 ResultsPage - Total prompts:', data.totalPrompts)
    console.log('🔍 ResultsPage - Analysis results:', data.analysisResults)
  }, [data])
  
  // Redirect to signin if not authenticated or if analysis not completed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/onboarding/signin')
      return
    }
    
    // Redirect to website analysis if analysis not completed
    if (!isLoading && isAuthenticated && !data.analysisCompleted) {
      console.log('⚠️ Analysis not completed, redirecting to website page')
      router.push('/onboarding/website')
      return
    }
  }, [isAuthenticated, isLoading, router, data.analysisCompleted])
  
  // ✅ FIX: Use ref to track if we've already fetched to prevent infinite loops
  const hasFetchedMetrics = useRef(false)
  
  // Fetch real metrics data
  useEffect(() => {
    // ✅ FIX: Prevent multiple fetches
    if (hasFetchedMetrics.current && data.urlAnalysisId) {
      return
    }
    
    const fetchMetrics = async () => {
      // Wait for urlAnalysisId to be available
      if (!data.urlAnalysisId) {
        console.log('⏳ Waiting for urlAnalysisId before fetching metrics...')
        // ✅ FIX: Only try once to fetch latest analysis if urlAnalysisId is not available
        if (!hasFetchedMetrics.current) {
          hasFetchedMetrics.current = true
          try {
            console.log('📊 Trying to fetch latest analysis from backend...')
            const latestAnalysis = await apiService.getLatestAnalysis()
            if (latestAnalysis.success && latestAnalysis.data?.urlAnalysisId) {
              console.log('✅ Found latest analysis:', latestAnalysis.data.urlAnalysisId)
              // Update context with the latest analysis ID
              // Note: This won't update the context immediately, but we can use it for fetching
              const response = await apiService.getDashboardAll({ 
                urlAnalysisId: latestAnalysis.data.urlAnalysisId 
              })
              if (response.success) {
                setMetricsData(response.data)
                setDataLoading(false)
                return
              }
            }
          } catch (err) {
            console.log('⚠️ Could not fetch latest analysis:', err)
          }
        }
        setDataLoading(false)
        return
      }
      
      // ✅ FIX: Mark as fetched when we have urlAnalysisId
      if (data.urlAnalysisId && !hasFetchedMetrics.current) {
        hasFetchedMetrics.current = true
      }

      try {
        console.log('📊 Fetching dashboard metrics from /api/dashboard/all...')
        console.log('🔍 Using urlAnalysisId:', data.urlAnalysisId)
        const response = await apiService.getDashboardAll({ urlAnalysisId: data.urlAnalysisId })
        
        if (response.success) {
          console.log('✅ Metrics fetched successfully:', response.data)
          console.log('🔍 Overall data:', response.data.overall)
          console.log('🔍 Overall brandMetrics:', response.data.overall?.brandMetrics)
          console.log('🔍 Competitors data:', response.data.competitors)
          console.log('🔍 Metrics data:', response.data.metrics)
          console.log('🔍 Visibility Score:', response.data.metrics?.visibilityScore)
          console.log('🔍 Depth of Mention:', response.data.metrics?.depthOfMention)
          console.log('🔍 Average Position:', response.data.metrics?.averagePosition)
          console.log('🔍 Citation Share from brandMetrics:', response.data.overall?.brandMetrics?.[0]?.citationShare)
          console.log('🔍 Share of Voice from brandMetrics:', response.data.overall?.brandMetrics?.[0]?.shareOfVoice)
          setMetricsData(response.data)
        } else {
          console.error('❌ Failed to fetch metrics:', response.message)
          setMetricsError(response.message || 'Failed to load metrics')
        }
      } catch (error: any) {
        console.error('❌ Error fetching metrics:', error)
        // Provide more specific error message
        const errorMessage = error?.message || 'Failed to load metrics'
        if (errorMessage.includes('URL analysis not found')) {
          // ✅ FIX: Only try fallback once to prevent infinite loops
          if (!hasFetchedMetrics.current) {
            hasFetchedMetrics.current = true
            // Try to fetch latest analysis as fallback
            console.log('🔄 Analysis not found, trying to fetch latest analysis...')
            try {
              const latestAnalysis = await apiService.getLatestAnalysis()
              if (latestAnalysis.success && latestAnalysis.data?.urlAnalysisId) {
                console.log('✅ Found latest analysis, retrying with:', latestAnalysis.data.urlAnalysisId)
                const retryResponse = await apiService.getDashboardAll({ 
                  urlAnalysisId: latestAnalysis.data.urlAnalysisId 
                })
                if (retryResponse.success) {
                  setMetricsData(retryResponse.data)
                  return
                }
              }
            } catch (fallbackError) {
              console.error('❌ Fallback also failed:', fallbackError)
            }
          }
          setMetricsError('Analysis not found. Please complete the analysis first.')
        } else {
          setMetricsError(errorMessage)
        }
      } finally {
        setDataLoading(false)
      }
    }

    // Fetch metrics when urlAnalysisId is available
        fetchMetrics()
      }, [data.urlAnalysisId]) // ✅ FIX: Removed data.generatedPrompts to prevent re-fetching

  const handleOpenDashboard = async () => {
    setIsOpening(true)
    setCheckingAccess(true)
    
    try {
      // Check user access first
      const userResponse = await apiService.getCurrentUser()
      const userData = userResponse.data?.user || userResponse.data
      const hasAccess = userData?.access === true
      
      // Check if email is in allowed list (fallback check)
      const allowedEmails = ['sj@tryrankly.com', 'satyajeetdas225@gmail.com']
      const userEmail = userData?.email?.toLowerCase() || user?.email?.toLowerCase()
      const isAllowedEmail = userEmail && allowedEmails.includes(userEmail)
      
      const finalAccess = hasAccess || isAllowedEmail
      
      if (!finalAccess) {
        // User doesn't have access - show book a demo section
        console.log('⚠️ [ResultsPage] User does not have dashboard access')
        setShowBookDemo(true)
        setIsOpening(false)
        setCheckingAccess(false)
        return
      }
      
      // ✅ Pass urlAnalysisId as URL parameter so dashboard can use it immediately
      const urlAnalysisId = data.urlAnalysisId
      const dashboardUrl = urlAnalysisId 
        ? `/dashboard?analysisId=${encodeURIComponent(urlAnalysisId)}`
        : '/dashboard'
      
      console.log('🔗 [ResultsPage] Navigating to dashboard with urlAnalysisId:', urlAnalysisId)
      
      // Navigate to dashboard with urlAnalysisId parameter
      setTimeout(() => {
        router.push(dashboardUrl)
      }, 1000)
    } catch (err) {
      console.error('Failed to check access or open dashboard:', err)
      // On error, assume no access and show book demo
      setShowBookDemo(true)
    } finally {
      setIsOpening(false)
      setCheckingAccess(false)
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </main>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <main className="relative flex h-screen w-full items-center justify-center bg-background text-foreground overflow-hidden">
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggleButton />
      </div>
      
      {/* Rankly Logo - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-logo text-foreground">
            Rankly
          </span>
        </Link>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl relative z-10 px-4 py-4"
      >
        <Card className="overflow-hidden p-0 shadow-lg">
          <CardContent className="grid p-0 md:grid-cols-2 h-[600px]">
            {/* Left Section - View Dashboard (Light Background) */}
            <div className="bg-background  p-6 sm:p-8 flex flex-col justify-center relative">
              {/* Navigation Arrows positioned over the left card */}
              <NavigationArrows 
                previousPath="/onboarding/llm-platforms"
                showNext={false}
              />
              {showBookDemo ? (
                <div className="space-y-6 w-full">
                  <div className="text-left">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                      Request Dashboard Access
                    </h1>
                    <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                      Schedule a demo to get full access to your dashboard and insights
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => window.open('https://cal.com/sj-rankly/30min', '_blank')}
                    className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  >
                    Book a Demo
                  </Button>
                  <p className="text-center text-xs font-normal text-muted-foreground">
                    Contact us to get full dashboard access
                  </p>
                </div>
              ) : (
                <div className="space-y-6 w-full">
                  <div className="text-left">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                      View dashboard for detailed insights
                    </h1>
                    <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                      Open your results with live metrics and opportunities
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleOpenDashboard}
                    disabled={isOpening || dataLoading || checkingAccess}
                    className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkingAccess
                      ? 'Checking access…'
                      : isOpening
                        ? 'Opening…'
                        : dataLoading
                          ? 'Preparing results…'
                          : 'Open Dashboard'}
                  </Button>
                  <p className="text-center text-xs font-normal text-muted-foreground">
                    You can always access this from the dashboard later
                  </p>
                </div>
              )}
            </div>

            {/* Right Section - Results Summary (Dark Background) */}
            <div className="bg-muted p-6 sm:p-8 flex flex-col justify-center">
              {dataLoading ? (
                <div className="space-y-4 w-full">
                  {/* Skeleton for Visibility Score */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                  
                  {/* Skeleton for Citation Share */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ) : metricsError ? (
                <div className="bg-background/50 rounded-lg p-4 w-full">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Unable to load metrics</p>
                    <p className="text-xs mt-1">{metricsError}</p>
                  </div>
                </div>
              ) : (
              <div className="space-y-4 w-full">
                  
                  {/* Visibility Score Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Visibility Score</h3>
                      <span className="text-base font-semibold text-foreground">
                        {metricsData?.metrics?.visibilityScore?.value 
                          ? `${Math.round(metricsData.metrics.visibilityScore.value)}%`
                          : '0%'}
                      </span>
                    </div>
                    <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                      Percentage of prompts where your brand is mentioned
                    </p>
                  </div>

                  {/* Citation Share Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Citation Share</h3>
                      <span className="text-base font-semibold text-foreground">
                        {(() => {
                          // ✅ FIX: Use the correct path from metrics.citationShare.value (same structure as visibilityScore)
                          // Fallback to other paths only if the primary path is not available
                          const citationShare = 
                            metricsData?.metrics?.citationShare?.value ||
                            metricsData?.overall?.brandMetrics?.find((b: any) => b.isOwner)?.citationShare ||
                            metricsData?.overall?.brandMetrics?.[0]?.citationShare ||
                            metricsData?.competitors?.find((c: any) => c.isOwner)?.citationShare ||
                            metricsData?.overall?.summary?.userBrand?.citationShare;
                          return citationShare !== undefined ? `${Math.round(citationShare)}%` : '0%';
                        })()}
                      </span>
                    </div>
                    <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                      Your brand's share of total citations across all brands
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}