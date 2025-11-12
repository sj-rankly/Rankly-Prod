'use client'

import { useState, useEffect } from 'react'
import apiService from '@/services/api'

export interface OnboardingStatus {
  isCompleted: boolean
  hasPrompts: boolean
  hasMetrics: boolean
  isLoading: boolean
  error: string | null
}

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus>({
    isCompleted: false,
    hasPrompts: false,
    hasMetrics: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check if user has completed onboarding
        const onboardingResponse = await apiService.getOnboardingData()
        const onboarding = onboardingResponse.data.onboarding

        const isCompleted = onboarding?.isCompleted === true

        // Check if user has prompts
        let hasPrompts = false
        if (isCompleted) {
          try {
            const promptsResponse = await apiService.getPrompts()
            hasPrompts = promptsResponse.success && promptsResponse.data?.prompts?.length > 0
          } catch (err) {
            console.log('No prompts found yet')
          }
        }

        // Check if user has metrics (analytics data)
        let hasMetrics = false
        if (hasPrompts) {
          try {
            const metricsResponse = await apiService.getAnalyticsSummary()
            hasMetrics = metricsResponse.success && metricsResponse.data != null
          } catch (err) {
            console.log('No metrics found yet')
          }
        }

        setStatus({
          isCompleted,
          hasPrompts,
          hasMetrics,
          isLoading: false,
          error: null
        })

      } catch (error: any) {
        console.error('Error checking onboarding status:', error)
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to check status'
        }))
      }
    }

    if (apiService.token) {
      checkStatus()
    } else {
      setStatus(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  return status
}
