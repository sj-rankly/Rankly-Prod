import { SkeletonShimmer, TableRowSkeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function PagesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page Performance Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-7 w-56" />
                <SkeletonShimmer className="h-4 w-96" />
              </div>
            </div>

            {/* Conversion Event Selector and Summary Metrics */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-9 w-44" />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <SkeletonShimmer className="h-4 w-28" />
                  <SkeletonShimmer className="h-6 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonShimmer className="h-4 w-36" />
                  <SkeletonShimmer className="h-6 w-20" />
                </div>
              </div>
            </div>
            
            {/* Table Skeleton */}
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg border">
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-4 w-24" />
                <SkeletonShimmer className="h-4 w-20" />
                <SkeletonShimmer className="h-4 w-28" />
                <SkeletonShimmer className="h-4 w-20" />
                <SkeletonShimmer className="h-4 w-24" />
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  {/* Page column (2 cols worth) */}
                  <div className="col-span-2 space-y-2">
                    <SkeletonShimmer className="h-4 w-full" />
                    <SkeletonShimmer className="h-3 w-3/4" />
                  </div>
                  {/* LLM Sessions */}
                  <div className="flex items-center justify-center">
                    <SkeletonShimmer className="h-4 w-16" />
                  </div>
                  {/* Platform */}
                  <div className="flex items-center justify-center gap-2">
                    <SkeletonShimmer className="h-5 w-5 rounded-full" />
                    <SkeletonShimmer className="h-4 w-12" />
                  </div>
                  {/* SQS */}
                  <div className="flex items-center justify-center">
                    <SkeletonShimmer className="h-4 w-20" />
                  </div>
                  {/* Conversion Rate */}
                  <div className="flex items-center justify-center">
                    <SkeletonShimmer className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
