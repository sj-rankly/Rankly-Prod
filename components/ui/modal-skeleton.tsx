'use client'

import { SkeletonShimmer } from './skeleton'

interface ModalSkeletonProps {
  /** Type of modal content */
  type?: 'subjective-impression' | 'prompt-builder' | 'general'
  /** Additional className */
  className?: string
}

/**
 * Skeleton component for modal/sheet content
 */
export function ModalSkeleton({ type = 'general', className }: ModalSkeletonProps) {
  if (type === 'subjective-impression') {
    return (
      <div className={`space-y-6 p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonShimmer className="h-6 w-48" />
            <SkeletonShimmer className="h-4 w-32" />
          </div>
          <SkeletonShimmer className="h-8 w-24 rounded" />
        </div>

        {/* Two-column content */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <SkeletonShimmer className="h-4 w-16" />
            <SkeletonShimmer className="h-20 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            <SkeletonShimmer className="h-4 w-20" />
            <SkeletonShimmer className="h-20 w-full rounded-lg" />
          </div>
        </div>

        {/* Platform info */}
        <div className="flex items-center space-x-2">
          <SkeletonShimmer className="h-4 w-24" />
          <div className="flex space-x-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonShimmer key={i} className="h-4 w-4 rounded-sm" />
            ))}
          </div>
        </div>

        {/* LLM Answers section */}
        <div className="space-y-3">
          <SkeletonShimmer className="h-5 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-3 relative">
                <SkeletonShimmer className="absolute -top-2 -left-2 h-6 w-6 rounded-full" />
                <SkeletonShimmer className="h-4 w-20 mb-2" />
                <SkeletonShimmer className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Metrics section */}
        <div className="space-y-3">
          <SkeletonShimmer className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonShimmer className="h-4 w-16" />
                <SkeletonShimmer className="h-8 w-12" />
                <SkeletonShimmer className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'prompt-builder') {
    return (
      <div className={`space-y-6 p-6 ${className}`}>
        {/* Header */}
        <div className="space-y-2">
          <SkeletonShimmer className="h-6 w-48" />
          <SkeletonShimmer className="h-4 w-32" />
        </div>

        {/* Form sections */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonShimmer className="h-4 w-24" />
              <SkeletonShimmer className="h-10 w-full rounded" />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <SkeletonShimmer className="h-10 w-20 rounded" />
          <SkeletonShimmer className="h-10 w-24 rounded" />
        </div>
      </div>
    )
  }

  // General modal skeleton
  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <SkeletonShimmer className="h-6 w-48" />
        <SkeletonShimmer className="h-4 w-32" />
      </div>

      {/* Content */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonShimmer key={i} className="h-4 w-full" />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <SkeletonShimmer className="h-10 w-20 rounded" />
        <SkeletonShimmer className="h-10 w-24 rounded" />
      </div>
    </div>
  )
}
