'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSkeletonLoader } from '@/hooks/useSkeletonLoader'

interface SkeletonWrapperProps {
  /** Whether to show the skeleton */
  show: boolean
  /** Whether the skeleton is currently visible (for fade transitions) */
  isVisible: boolean
  /** The skeleton component to show */
  skeleton: ReactNode
  /** The actual content to show when not loading */
  children: ReactNode
  /** Additional className for the wrapper */
  className?: string
  /** Animation duration in ms (default: 200) */
  duration?: number
}

/**
 * Wrapper component that handles smooth transitions between skeleton and content
 */
export function SkeletonWrapper({
  show,
  isVisible,
  skeleton,
  children,
  className,
  duration = 200
}: SkeletonWrapperProps) {
  if (!show) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn("relative", className)}>
      {/* Skeleton layer */}
      <div
        className={cn(
          "absolute inset-0 z-10 transition-opacity duration-200 ease-in-out pointer-events-none",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDuration: `${duration}ms` }}
      >
        {skeleton}
      </div>
      
      {/* Content layer */}
      <div
        className={cn(
          "transition-opacity duration-200 ease-in-out",
          isVisible ? "opacity-0" : "opacity-100"
        )}
        style={{ transitionDuration: `${duration}ms` }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Higher-order component for wrapping components with skeleton loading
 */
export function withSkeleton<T extends object>(
  Component: React.ComponentType<T>,
  skeletonComponent: ReactNode,
  options: {
    threshold?: number
    debounceDelay?: number
    showOnMount?: boolean
  } = {}
) {
  return function SkeletonWrappedComponent(props: T & { 
    isLoading?: boolean 
    data?: any 
  }) {
    const { isLoading, data, ...componentProps } = props
    
    // Use skeleton hook
    const { showSkeleton, isVisible, setLoading } = useSkeletonLoader(options)
    
    // Handle loading state
    React.useEffect(() => {
      if (isLoading !== undefined) {
        setLoading(isLoading)
      } else if (data !== undefined) {
        setLoading(data === null || data === undefined)
      }
    }, [isLoading, data, setLoading])

    return (
      <SkeletonWrapper
        show={showSkeleton}
        isVisible={isVisible}
        skeleton={skeletonComponent}
      >
        <Component {...(componentProps as T)} />
      </SkeletonWrapper>
    )
  }
}
