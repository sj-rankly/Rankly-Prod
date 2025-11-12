'use client'

import { useState, useEffect } from 'react'
import { WebsiteUrlStep } from '@/components/WebsiteUrlStep'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function WebsitePage() {
  const router = useRouter()
  const { updateData } = useOnboarding()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [savedUrl, setSavedUrl] = useState('')
  const [analysisSuccess, setAnalysisSuccess] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/onboarding/signin')
    }
  }, [isAuthenticated, isLoading, router])

  // Load saved URL on mount
  useEffect(() => {
    const websiteData = localStorage.getItem('websiteData')
    if (websiteData) {
      const data = JSON.parse(websiteData)
      setSavedUrl(data.url || '')
    }
  }, [])

  const handleContinue = async (url: string) => {
    setIsAnalyzing(true)
    console.log('Analyzing website:', url)
    
    // Save URL to localStorage
    localStorage.setItem('websiteData', JSON.stringify({ url }))
    
    try {
      // First, check if this URL has already been analyzed by the user
      try {
        console.log('🔍 Checking if URL already analyzed...')
        const existingAnalysis = await apiService.findUrlAnalysisByUrl(url)
        
        if (existingAnalysis?.success && existingAnalysis?.data?.id) {
          const analysisId = existingAnalysis.data.id
          console.log('✅ URL already analyzed, found analysis ID:', analysisId)
          
          // ✅ FIX: Check if metrics exist before redirecting to dashboard
          // If metrics don't exist, check if prompt tests exist (which can be used to calculate metrics)
          try {
            console.log('🔍 Checking if metrics exist for this analysis...')
            const metricsResponse = await apiService.getUrlMetrics(analysisId)
            
            // Check if we have actual metrics data
            const hasMetrics = metricsResponse?.success && metricsResponse?.data && (
              metricsResponse.data.overall || 
              (metricsResponse.data.platforms && metricsResponse.data.platforms.length > 0) ||
              (metricsResponse.data.topics && metricsResponse.data.topics.length > 0) ||
              (metricsResponse.data.personas && metricsResponse.data.personas.length > 0)
            )
            
            if (hasMetrics) {
              console.log('✅ Metrics exist, redirecting to dashboard...')
              setIsAnalyzing(false)
              router.push(`/dashboard?analysisId=${analysisId}`)
              return
            } else {
              console.log('⚠️ Metrics not found, checking for prompt tests...')
              
              // Check if prompt tests exist (which can be used to calculate metrics)
              try {
                const testsResponse = await apiService.getAllTests({ urlAnalysisId: analysisId })
                const hasTests = testsResponse?.success && testsResponse?.data && testsResponse.data.length > 0
                
                if (hasTests) {
                  console.log('✅ Prompt tests exist, redirecting to dashboard (metrics will be calculated automatically)...')
                  setIsAnalyzing(false)
                  router.push(`/dashboard?analysisId=${analysisId}`)
                  return
                } else {
                  console.log('ℹ️ No prompt tests found, continuing with onboarding flow...')
                  // Continue with onboarding - user needs to complete prompt testing
                }
              } catch (testError) {
                console.warn('⚠️ Error checking prompt tests, continuing with onboarding:', testError)
                // Continue with onboarding on error
              }
            }
          } catch (metricsError: any) {
            // If metrics check fails, check for prompt tests as fallback
            const errorMessage = metricsError?.message || ''
            if (errorMessage.includes('not found') || errorMessage.includes('404')) {
              console.log('ℹ️ Metrics not found, checking for prompt tests...')
              
              try {
                const testsResponse = await apiService.getAllTests({ urlAnalysisId: analysisId })
                const hasTests = testsResponse?.success && testsResponse?.data && testsResponse.data.length > 0
                
                if (hasTests) {
                  console.log('✅ Prompt tests exist, redirecting to dashboard (metrics will be calculated automatically)...')
                  setIsAnalyzing(false)
                  router.push(`/dashboard?analysisId=${analysisId}`)
                  return
                } else {
                  console.log('ℹ️ No prompt tests found, continuing with onboarding flow...')
                  // Continue with onboarding
                }
              } catch (testError) {
                console.warn('⚠️ Error checking prompt tests, continuing with onboarding:', testError)
                // Continue with onboarding on error
              }
            } else {
              console.warn('⚠️ Error checking metrics, continuing with onboarding:', metricsError)
              // Continue with onboarding on error
            }
          }
        }
      } catch (error: any) {
        // If URL not found, that's fine - we'll proceed with new analysis
        // The API service throws an Error for 404, so we check the message
        const errorMessage = error?.message || ''
        if (errorMessage.includes('not found') || 
            errorMessage.includes('404') || 
            errorMessage.includes('URL analysis not found')) {
          console.log('ℹ️ URL not found in existing analyses, proceeding with new analysis')
        } else {
          // Other errors - log but continue with new analysis
          console.warn('⚠️ Error checking existing analysis, proceeding with new analysis:', error)
        }
      }

      // Clear previous data before starting new analysis
      updateData({
        websiteUrl: url,
        competitors: [],
        topics: [],
        personas: [],
        selectedCompetitors: new Set(),
        selectedTopics: new Set(),
        selectedPersonas: new Set(),
        analysisResults: null
      })

      // Call the backend API to analyze the website
      const response = await apiService.analyzeWebsite(url)

      if (response.success) {
        console.log('✅ Website analysis completed:', response.data)
        console.log('🔍 Analysis data structure:', JSON.stringify(response.data.analysis, null, 2))

        // Update local data with the analysis results and completion flag
        console.log('🏁 Setting analysisCompleted flag and storing analysis results')
        updateData({
          websiteUrl: url,
          // Store URL analysis ID for linking data
          urlAnalysisId: response.data.urlAnalysisId,
          // Store analysis results for use in later steps
          analysisResults: response.data.analysis,
          // Set flag to indicate analysis is complete
          analysisCompleted: true
        })
        
        console.log('✅ Analysis completion flag and results set successfully')
        setAnalysisSuccess(true)
        
      } else {
        console.error('❌ Website analysis failed:', response.message)
        setIsAnalyzing(false)
        setAnalysisSuccess(false)
        setAnalysisError(response.message || 'Analysis failed')
        return
      }
    } catch (error: any) {
      console.error('❌ Website analysis failed:', error)
      setIsAnalyzing(false)
      setAnalysisSuccess(false)
      setAnalysisError(error.message || 'Analysis failed')
      return
    }

    // Only enable button after API call completes successfully
    // No artificial delay - button becomes available when data is ready
    if (analysisSuccess) {
      setIsAnalyzing(false)
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
    <WebsiteUrlStep 
      onContinue={handleContinue}
      isLoading={isAnalyzing}
      initialUrl={savedUrl}
      previousPath="/onboarding/signin"
      nextPath="/onboarding/competitors"
      analysisSuccess={analysisSuccess}
      analysisError={analysisError}
    />
  )
}