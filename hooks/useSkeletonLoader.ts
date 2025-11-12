import { useState, useEffect, useRef, useCallback } from 'react'

interface UseSkeletonLoaderOptions {
  /** Minimum delay before showing skeleton (default: 300ms) */
  threshold?: number
  /** Debounce delay to avoid flash (default: 250ms) */
  debounceDelay?: number
  /** Whether to show skeleton immediately on mount */
  showOnMount?: boolean
}

interface UseSkeletonLoaderReturn {
  /** Whether to show the skeleton */
  showSkeleton: boolean
  /** Whether the skeleton is currently visible */
  isVisible: boolean
  /** Function to manually trigger loading state */
  setLoading: (loading: boolean) => void
  /** Function to manually show skeleton */
  show: () => void
  /** Function to manually hide skeleton */
  hide: () => void
}

/**
 * Hook for managing skeleton loader visibility with latency-based auto-trigger
 */
export function useSkeletonLoader(options: UseSkeletonLoaderOptions = {}): UseSkeletonLoaderReturn {
  const {
    threshold = 300,
    debounceDelay = 250,
    showOnMount = false
  } = options

  const [showSkeleton, setShowSkeleton] = useState(showOnMount)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(showOnMount)
  
  const thresholdTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const fadeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (thresholdTimeoutRef.current) {
        clearTimeout(thresholdTimeoutRef.current)
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
      }
    }
  }, [])

  // Handle loading state changes
  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading)

    // Clear existing timeouts
    if (thresholdTimeoutRef.current) {
      clearTimeout(thresholdTimeoutRef.current)
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (loading) {
      // Start threshold timer
      thresholdTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(true)
        // Fade in after a brief delay
        setTimeout(() => setIsVisible(true), 50)
      }, threshold)
    } else {
      // Data loaded - start fade out
      setIsVisible(false)
      
      // Debounce to avoid flash if loading state changes quickly
      debounceTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(false)
      }, debounceDelay)
    }
  }, [threshold, debounceDelay])

  // Manual controls
  const setLoading = useCallback((loading: boolean) => {
    handleLoadingChange(loading)
  }, [handleLoadingChange])

  const show = useCallback(() => {
    setShowSkeleton(true)
    setIsVisible(true)
    setIsLoading(true)
  }, [])

  const hide = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      setShowSkeleton(false)
      setIsLoading(false)
    }, 200) // Match fade out duration
  }, [])

  return {
    showSkeleton,
    isVisible,
    setLoading,
    show,
    hide
  }
}

/**
 * Hook for managing skeleton loader with data dependency
 */
export function useSkeletonWithData<T>(
  data: T | null | undefined,
  options: UseSkeletonLoaderOptions = {}
) {
  const skeleton = useSkeletonLoader(options)
  
  useEffect(() => {
    if (data === null || data === undefined) {
      skeleton.setLoading(true)
    } else {
      skeleton.setLoading(false)
    }
  }, [data, skeleton])

  return skeleton
}

/**
 * Hook for managing skeleton loader with async operations
 */
export function useSkeletonWithAsync<T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: UseSkeletonLoaderOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const skeleton = useSkeletonLoader(options)

  useEffect(() => {
    let cancelled = false
    
    const fetchData = async () => {
      try {
        skeleton.setLoading(true)
        setError(null)
        const result = await asyncFn()
        
        if (!cancelled) {
          setData(result)
          skeleton.setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
          skeleton.setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, deps)

  return {
    data,
    error,
    ...skeleton
  }
}
