import { Skeleton, SkeletonShimmer, ChartSkeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function PlatformSkeleton() {
  return (
    <div className="space-y-6">
      {/* Traffic Split Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <SkeletonShimmer className="h-7 w-48" />
                <SkeletonShimmer className="h-4 w-72" />
              </div>
              <div className="flex items-center gap-4">
                <SkeletonShimmer className="h-9 w-32" />
                <SkeletonShimmer className="h-9 w-9 rounded-md" />
              </div>
            </div>
            
            {/* Total Sessions */}
            <div className="flex items-center gap-3">
              <SkeletonShimmer className="h-9 w-32" />
              <SkeletonShimmer className="h-4 w-24" />
            </div>
            
            {/* Chart Area with better visualization */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-7">
                <ChartSkeleton type="bar" className="h-80" />
              </div>
              <div className="col-span-5 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <SkeletonShimmer className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <SkeletonShimmer className="h-4 w-24" />
                      <SkeletonShimmer className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chart Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <SkeletonShimmer key={i} className="h-8 w-8 rounded-full" />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <SkeletonShimmer className="h-9 w-36" />
                <SkeletonShimmer className="h-9 w-9 rounded-md" />
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Platform Rankings Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-6 w-48" />
                <SkeletonShimmer className="h-4 w-64" />
              </div>
            </div>
            
            {/* Rankings List */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <SkeletonShimmer className="h-5 w-5 rounded-full" />
                    <SkeletonShimmer className="h-5 w-28" />
                  </div>
                  <div className="flex items-center gap-6">
                    <SkeletonShimmer className="h-5 w-20" />
                    <SkeletonShimmer className="h-5 w-16" />
                    <SkeletonShimmer className="h-5 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Traffic Performance Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-7 w-56" />
                <SkeletonShimmer className="h-4 w-96" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonShimmer className="h-9 w-44" />
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 p-4 border rounded-lg">
                  <SkeletonShimmer className="h-4 w-32" />
                  <SkeletonShimmer className="h-8 w-24" />
                </div>
              ))}
            </div>
            
            {/* Performance Table */}
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-9 gap-4 p-4 bg-muted/30 rounded-lg border">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <SkeletonShimmer key={i} className="h-4 w-full" />
                ))}
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <TableRowSkeleton key={row} columns={9} className="p-4 border rounded-lg" />
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Platforms Split Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-7 w-56" />
                <SkeletonShimmer className="h-4 w-72" />
              </div>
            </div>
            
            {/* Platform Bars */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SkeletonShimmer className="h-6 w-6 rounded-full" />
                      <SkeletonShimmer className="h-5 w-32" />
                    </div>
                    <div className="flex items-center gap-4">
                      <SkeletonShimmer className="h-5 w-16" />
                      <SkeletonShimmer className="h-5 w-12" />
                    </div>
                  </div>
                  <SkeletonShimmer className="h-8 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

