'use client'

import { SkeletonShimmer } from '@/components/ui/skeleton'

/**
 * Skeleton component for the sidebar navigation
 */
export function SidebarSkeleton() {
  return (
    <aside className="w-64 bg-background border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6">
        <SkeletonShimmer className="h-8 w-32" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-2 rounded-lg">
              <SkeletonShimmer className="h-4 w-4 rounded" />
              <SkeletonShimmer className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/60 space-y-4">
        <div className="flex items-center space-x-3 p-2 rounded-lg">
          <SkeletonShimmer className="h-4 w-4 rounded" />
          <SkeletonShimmer className="h-4 w-20" />
        </div>
        
        {/* Theme Toggle */}
        <div className="flex items-center justify-center">
          <SkeletonShimmer className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </aside>
  )
}
