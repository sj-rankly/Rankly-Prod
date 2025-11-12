'use client'

import { useState, useEffect } from 'react'
import { WebsiteUrlStep } from '@/components/WebsiteUrlStep'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function FreshAnalysisPage() {
  const router = useRouter()
  const { updateData } = useOnboarding()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [savedUrl, setSavedUrl] = useState('')
  const [analysisSuccess, setAnalysisSuccess] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Only redirect to signin if not authenticated
  // DO NOT redirect authenticated users back to dashboard - let them stay here
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('⚠️ [Fresh Analysis] User not authenticated, redirecting to signin')
      router.push('/onboarding/signin')
    } else if (!isLoading && isAuthenticated) {
      console.log('✅ [Fresh Analysis] User authenticated, allowing fresh analysis')
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
    console.log('🔄 [Fresh Analysis] Analyzing website (FORCE NEW):', url)
    
    // Save URL to localStorage
    localStorage.setItem('websiteData', JSON.stringify({ url }))
    
    try {
      // Clear previous data before starting new analysis
      updateData({
        websiteUrl: url,
        competitors: [],
        topics: [],
        personas: [],
        selectedCompetitors: new Set(),
        selectedTopics: new Set(),
        selectedPersonas: new Set(),
        analysisResults: null,
        urlAnalysisId: undefined,
        analysisCompleted: false
      })

      // ✅ FORCE NEW ANALYSIS - Don't check for existing analysis
      console.log('✨ [Fresh Analysis] Starting fresh analysis for:', url)
      const response = await apiService.analyzeWebsite(url)

      if (response.success) {
        console.log('✅ [Fresh Analysis] Website analysis completed:', response.data)
        console.log('🔍 [Fresh Analysis] Analysis data structure:', JSON.stringify(response.data.analysis, null, 2))

        // Update local data with the analysis results and completion flag
        console.log('🏁 [Fresh Analysis] Setting analysisCompleted flag and storing analysis results')
        updateData({
          websiteUrl: url,
          // Store URL analysis ID for linking data
          urlAnalysisId: response.data.urlAnalysisId,
          // Store analysis results for use in later steps
          analysisResults: response.data.analysis,
          // Set flag to indicate analysis is complete
          analysisCompleted: true
        })
        
        console.log('✅ [Fresh Analysis] Analysis completion flag and results set successfully')
        setAnalysisSuccess(true)
        
      } else {
        console.error('❌ [Fresh Analysis] Website analysis failed:', response.message)
        setIsAnalyzing(false)
        setAnalysisSuccess(false)
        setAnalysisError(response.message || 'Analysis failed')
        return
      }
    } catch (error: any) {
      console.error('❌ [Fresh Analysis] Website analysis failed:', error)
      setIsAnalyzing(false)
      setAnalysisSuccess(false)
      setAnalysisError(error.message || 'Analysis failed')
      return
    }

    // Only enable button after API call completes successfully
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

