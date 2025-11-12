'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

function OnboardingContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')
  const step = searchParams.get('step')
  const { isAuthenticated, isLoading } = useAuth()
  const [hasRedirected, setHasRedirected] = useState(false)
  
  useEffect(() => {
    // If there's a token in URL, AuthContext is handling it - just wait
    // Don't redirect here, let AuthContext handle the redirect after checking hasAnalysis
    if (token || isLoading) {
      return
    }
    
    // If there's an error, redirect to signup
    if (error) {
      if (!hasRedirected) {
        setHasRedirected(true)
        window.location.href = '/onboarding/signup'
      }
      return
    }
    
    // If authenticated but no token in URL (means they navigated here directly)
    // Check if they have analysis data before redirecting
    if (isAuthenticated && !token && !hasRedirected && !isLoading) {
      // Check if user has analysis - only redirect if they do
      apiService.hasAnalysis()
        .then((response) => {
          const hasAnalysis = response?.data?.hasAnalysis || false
          if (hasAnalysis && !hasRedirected) {
            setHasRedirected(true)
            window.location.href = '/dashboard'
          } else {
            // User is authenticated but has no analysis - stay on onboarding
            // Don't redirect, let them continue with onboarding
          }
        })
        .catch((error) => {
          console.log('Could not check analysis status, staying on onboarding:', error)
          // On error, assume they should stay on onboarding (safer default)
        })
      return
    }
    
    // If not authenticated and no token, redirect to signup
    if (!isAuthenticated && !token && !hasRedirected && !isLoading) {
      setHasRedirected(true)
      window.location.href = '/onboarding/signup'
    }
  }, [token, error, step, isAuthenticated, isLoading, hasRedirected])
  
  // Show loading while processing
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
