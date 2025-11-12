'use client'

import React from 'react'
import { useSkeletonLoader } from '@/hooks/useSkeletonLoader'
import { SkeletonWrapper } from './skeleton-wrapper'
import { UnifiedCardSkeleton } from './unified-card-skeleton'

interface WithSkeletonLoadingOptions {
  threshold?: number
  debounceDelay?: number
  skeletonType?: 'metric' | 'chart' | 'table' | 'mixed'
  chartType?: 'bar' | 'line' | 'donut'
  tableColumns?: number
  tableRows?: number
}

/**
 * Higher-order component that automatically adds skeleton loading to any component
 */
export function withSkeletonLoading<T extends object>(
  Component: React.ComponentType<T>,
  options: WithSkeletonLoadingOptions = {}
) {
  const {
    threshold = 300,
    debounceDelay = 250,
    skeletonType = 'mixed',
    chartType = 'bar',
    tableColumns = 4,
    tableRows = 5
  } = options

  return function SkeletonWrappedComponent(props: T & { 
    filterContext?: {
      selectedTopics: string[]
      selectedPersonas: string[]
      selectedPlatforms: string[]
      selectedAnalysisId?: string | null
    }
  }) {
    const { filterContext, ...componentProps } = props
    
    // Skeleton loading state
    const [isDataLoading, setIsDataLoading] = React.useState(false)
    const { showSkeleton, isVisible, setLoading } = useSkeletonLoader({
      threshold,
      debounceDelay
    })

    // Simulate data loading only when analysis changes
    React.useEffect(() => {
      // Only simulate loading when analysis ID changes, not on filter changes
      if (filterContext?.selectedAnalysisId) {
        setIsDataLoading(true)
        const timer = setTimeout(() => {
          setIsDataLoading(false)
        }, 300) // Reduced loading time for better UX
        
        return () => clearTimeout(timer)
      }
    }, [filterContext?.selectedAnalysisId]) // Only trigger when analysis changes

    React.useEffect(() => {
      setLoading(isDataLoading)
    }, [isDataLoading, setLoading])

    return (
      <SkeletonWrapper
        show={showSkeleton}
        isVisible={isVisible}
        skeleton={
          <UnifiedCardSkeleton 
            type={skeletonType}
            chartType={chartType}
            tableColumns={tableColumns}
            tableRows={tableRows}
          />
        }
      >
        <Component {...(componentProps as T)} />
      </SkeletonWrapper>
    )
  }
}

/**
 * Hook for adding skeleton loading to components manually
 */
export function useSkeletonLoading(
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  },
  options: WithSkeletonLoadingOptions = {}
) {
  const {
    threshold = 300,
    debounceDelay = 250
  } = options

  const [isDataLoading, setIsDataLoading] = React.useState(false)
  const { showSkeleton, isVisible, setLoading } = useSkeletonLoader({
    threshold,
    debounceDelay
  })

  // Only trigger loading when analysis ID changes, not on filter changes
  React.useEffect(() => {
    if (filterContext?.selectedAnalysisId) {
      setIsDataLoading(true)
      const timer = setTimeout(() => {
        setIsDataLoading(false)
      }, 300) // Reduced loading time for better UX
      
      return () => clearTimeout(timer)
    }
  }, [filterContext?.selectedAnalysisId]) // Only trigger when analysis changes

  React.useEffect(() => {
    setLoading(isDataLoading)
  }, [isDataLoading, setLoading])

  return { showSkeleton, isVisible }
}

/**
 * Hook for skeleton loading that only triggers when data is actually loading
 */
export function useSkeletonLoadingWithData<T>(
  data: T | null | undefined,
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  },
  options: WithSkeletonLoadingOptions = {}
) {
  const {
    threshold = 300,
    debounceDelay = 250
  } = options

  const { showSkeleton, isVisible, setLoading } = useSkeletonLoader({
    threshold,
    debounceDelay
  })

  // Only show skeleton when data is actually loading (null/undefined)
  React.useEffect(() => {
    if (data === null || data === undefined) {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [data, setLoading])

  return { showSkeleton, isVisible }
}
