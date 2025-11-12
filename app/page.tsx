'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [checkingAnalysis, setCheckingAnalysis] = useState(false)

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!isLoading) {
        if (!isAuthenticated) {
          // Not logged in - redirect to onboarding (which has login form)
          router.push('/onboarding')
        } else {
          // User is authenticated, check if they have done URL analysis
          setCheckingAnalysis(true)
          try {
            const response = await apiService.hasAnalysis()
            const hasAnalysis = response?.data?.hasAnalysis || false

            if (hasAnalysis) {
              // User has done analysis before - go to dashboard
              router.push('/dashboard')
            } else {
              // User has never done analysis - go to onboarding
              router.push('/onboarding')
            }
          } catch (error) {
            console.error('Error checking analysis status:', error)
            // On error, fall back to old behavior
            if (user?.onboarding?.isCompleted) {
              router.push('/dashboard')
            } else {
              router.push('/onboarding')
            }
          } finally {
            setCheckingAnalysis(false)
          }
        }
      }
    }

    checkAndRedirect()
  }, [isAuthenticated, isLoading, user, router])

  // Show loading while checking auth status
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div
          className="animate-spin rounded-full border-4 border-transparent mx-auto mb-4"
          style={{
            width: '48px',
            height: '48px',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'hsl(var(--primary))',
            borderWidth: '4px'
          }}
        />
        <h2 className="text-lg font-semibold text-foreground">
          {checkingAnalysis ? 'Checking your account...' : 'Loading...'}
        </h2>
      </div>
    </div>
  )
}
