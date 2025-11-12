'use client'

import { SkeletonShimmer } from '@/components/ui/skeleton'

/**
 * Skeleton component for the top navigation
 */
export function TopNavSkeleton() {
  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      {/* Left side - Tabs */}
      <div className="flex items-center space-x-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonShimmer key={i} className="h-8 w-20 rounded" />
        ))}
      </div>

      {/* Right side - Filters */}
      <div className="flex items-center space-x-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <SkeletonShimmer className="h-4 w-4" />
            <SkeletonShimmer className="h-8 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
