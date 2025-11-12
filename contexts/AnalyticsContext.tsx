'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import apiService from '@/services/api'

// Types
export interface AnalyticsData {
  summary: any | null
  visibility: any | null
  prompts: any | null
  sentiment: any | null
  citations: any | null
  competitors: any | null
  userBrandName: string | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface AnalyticsContextType {
  data: AnalyticsData
  refreshData: () => Promise<void>
  setDateRange: (from: string, to: string) => void
  setUrlAnalysisId: (id: string) => void
  dateFrom: string
  dateTo: string
  urlAnalysisId: string | null
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [urlAnalysisId, setUrlAnalysisId] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    visibility: null,
    prompts: null,
    sentiment: null,
    citations: null,
    competitors: null,
    userBrandName: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const fetchAllAnalytics = async () => {
    // Don't fetch if no token
    if (!apiService.token) {
      setData(prev => ({ ...prev, isLoading: false, error: null }))
      return
    }

    // Don't fetch if no URL analysis is selected
    if (!urlAnalysisId) {
      setData(prev => ({ ...prev, isLoading: false, error: null }))
      return
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('📊 Fetching analytics data for URL:', urlAnalysisId)

      // First, fetch URL analysis data to get user's brand name
      let userBrandName = null
      try {
        const urlAnalysisRes = await apiService.getUrlAnalysis(urlAnalysisId)
        if (urlAnalysisRes.success && urlAnalysisRes.data?.brandContext?.companyName) {
          userBrandName = urlAnalysisRes.data.brandContext.companyName
          console.log('🏢 User brand identified:', userBrandName)
        }
      } catch (error) {
        console.log('⚠️ Failed to fetch URL analysis data:', error)
      }

      // Fetch URL-specific metrics
      try {
        const urlMetricsRes = await apiService.getUrlMetrics(urlAnalysisId)

        if (urlMetricsRes.success && urlMetricsRes.data) {
          const metricsData = urlMetricsRes.data

          // Check if we have any data at all
          const hasData = metricsData.overall || 
                         (metricsData.platforms && metricsData.platforms.length > 0) ||
                         (metricsData.topics && metricsData.topics.length > 0) ||
                         (metricsData.personas && metricsData.personas.length > 0)

          if (hasData) {
            setData({
              summary: {
                hasData: true,
                totalTests: metricsData.overall?.summary?.totalPrompts || 0,
                lastUpdated: metricsData.lastUpdated || new Date()
              },
              visibility: {
                ...metricsData.overall,
                brandMetrics: metricsData.overall?.brandMetrics || [],
                topics: metricsData.topics || [],
                personas: metricsData.personas || [],
                platforms: metricsData.platforms || []
              },
              prompts: null, // Will be fetched separately if needed
              sentiment: null, // Will be calculated from metrics
              citations: null, // Will be calculated from metrics
              competitors: metricsData.overall?.brandMetrics || null,
              userBrandName: userBrandName,
              isLoading: false,
              error: null,
              lastUpdated: new Date()
            })

            console.log('✅ URL-specific analytics data fetched successfully')
            return
          } else {
            console.log('⚠️ URL metrics endpoint returned no data')
          }
        }
      } catch (urlError) {
        console.log('⚠️ URL metrics endpoint failed, falling back...')
      }

      // Try visibility endpoint with urlAnalysisId parameter
      try {
        const visibilityRes = await apiService.getAnalyticsVisibility(undefined, undefined, urlAnalysisId)
        
        if (visibilityRes.success && visibilityRes.data) {
          const visibilityData = visibilityRes.data
          
          setData({
            summary: {
              hasData: true,
              totalTests: visibilityData.overall?.totalPrompts || 0,
              lastUpdated: visibilityData.lastUpdated || new Date()
            },
            visibility: visibilityData,
            prompts: null,
            sentiment: null,
            citations: null,
            competitors: visibilityData.overall?.brandMetrics || null,
            userBrandName: userBrandName,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          })

          console.log('✅ Visibility analytics data fetched successfully')
          return
        }
      } catch (visibilityError) {
        console.log('⚠️ Visibility endpoint failed, falling back...')
      }

      // Try to fetch dashboard data
      try {
        const dashboardRes = await apiService.getDashboardAll({
          dateFrom,
          dateTo
        })

        if (dashboardRes.success && dashboardRes.data) {
          const dashboardData = dashboardRes.data
          
          setData({
            summary: {
              hasData: true,
              totalTests: dashboardData.summary?.totalTests || 0,
              lastUpdated: dashboardData.summary?.lastUpdated || new Date()
            },
            visibility: dashboardData.metrics?.visibility || null,
            prompts: await apiService.getAnalyticsPrompts(dateFrom, dateTo).then(r => r.data).catch(() => null),
            sentiment: dashboardData.metrics?.sentiment || null,
            citations: dashboardData.metrics?.citations || null,
            competitors: null, // Will be calculated from visibility data
            userBrandName: userBrandName,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          })

          console.log('✅ Dashboard analytics data fetched successfully')
          return
        }
      } catch (dashboardError) {
        console.log('⚠️ Dashboard endpoint not available, falling back to individual endpoints')
      }

      // Fallback to individual endpoints
      const [
        summaryRes,
        visibilityRes,
        promptsRes,
        sentimentRes,
        citationsRes,
        competitorsRes
      ] = await Promise.allSettled([
        apiService.getAnalyticsSummary(dateFrom, dateTo),
        apiService.getAnalyticsVisibility(dateFrom, dateTo),
        apiService.getAnalyticsPrompts(dateFrom, dateTo),
        apiService.getAnalyticsSentiment(dateFrom, dateTo),
        apiService.getAnalyticsCitations(dateFrom, dateTo),
        apiService.getAnalyticsCompetitors(dateFrom, dateTo)
      ])

      // Check if all requests failed with "no data" errors (expected for new users)
      const allFailed = [summaryRes, visibilityRes, promptsRes, sentimentRes, citationsRes, competitorsRes]
        .every(res => res.status === 'rejected')

      if (allFailed) {
        // No data exists yet - this is expected for new users
        console.log('ℹ️ No analytics data available yet (expected for new users)')
        setData({
          summary: null,
          visibility: null,
          prompts: null,
          sentiment: null,
          citations: null,
          competitors: null,
          userBrandName: userBrandName,
          isLoading: false,
          error: null, // Don't show error for missing data
          lastUpdated: null
        })
        return
      }

      // Some data exists - show what we have
      setData({
        summary: summaryRes.status === 'fulfilled' ? summaryRes.value.data : null,
        visibility: visibilityRes.status === 'fulfilled' ? visibilityRes.value.data : null,
        prompts: promptsRes.status === 'fulfilled' ? promptsRes.value.data : null,
        sentiment: sentimentRes.status === 'fulfilled' ? sentimentRes.value.data : null,
        citations: citationsRes.status === 'fulfilled' ? citationsRes.value.data : null,
        competitors: competitorsRes.status === 'fulfilled' ? competitorsRes.value.data : null,
        userBrandName: userBrandName,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })

      console.log('✅ Analytics data fetched successfully')
    } catch (error: any) {
      console.error('❌ Failed to fetch analytics:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: null // Don't show errors to user for missing data
      }))
    }
  }

  useEffect(() => {
    if (apiService.token && urlAnalysisId) {
      fetchAllAnalytics()
    } else {
      // No token or URL - set loading to false
      setData(prev => ({ ...prev, isLoading: false }))
    }
  }, [dateFrom, dateTo, urlAnalysisId])

  const setDateRange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const refreshData = async () => {
    await fetchAllAnalytics()
  }

  return (
    <AnalyticsContext.Provider value={{
      data,
      refreshData,
      setDateRange,
      setUrlAnalysisId,
      dateFrom,
      dateTo,
      urlAnalysisId
    }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
