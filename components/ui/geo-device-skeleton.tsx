import { SkeletonShimmer, ChartSkeleton, TableRowSkeleton } from "@/components/ui/skeleton"
import { UnifiedCard, UnifiedCardContent } from "@/components/ui/unified-card"

export function GeoDeviceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Geographic Performance Skeleton */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-7 w-64" />
                <SkeletonShimmer className="h-4 w-72" />
              </div>
              <div className="flex items-center gap-4">
                {/* Platform icons skeleton */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <SkeletonShimmer className="h-6 w-6 rounded-full" />
                    <SkeletonShimmer className="h-5 w-8" />
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <SkeletonShimmer className="h-4 w-24" />
                  <SkeletonShimmer className="h-7 w-16" />
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonShimmer className="h-4 w-20" />
                  <SkeletonShimmer className="h-7 w-12" />
                </div>
              </div>
            </div>

            {/* Map and Country List */}
            <div className="grid grid-cols-12 gap-6">
              {/* Map area skeleton */}
              <div className="col-span-7">
                <div className="h-[400px] bg-muted/20 rounded-lg flex items-center justify-center border border-border/20">
                  <div className="space-y-3 text-center">
                    <SkeletonShimmer className="h-12 w-12 mx-auto rounded-full" />
                    <SkeletonShimmer className="h-4 w-40" />
                    <SkeletonShimmer className="h-3 w-32" />
                  </div>
                </div>
              </div>

              {/* Country list skeleton */}
              <div className="col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <SkeletonShimmer className="h-5 w-32" />
                  <SkeletonShimmer className="h-8 w-20 rounded-md" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <SkeletonShimmer className="h-6 w-8 rounded" />
                        <SkeletonShimmer className="h-4 w-28" />
                      </div>
                      <div className="flex items-center gap-4">
                        <SkeletonShimmer className="h-4 w-16" />
                        <SkeletonShimmer className="h-4 w-14" />
                        <SkeletonShimmer className="h-4 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Device Performance Skeleton */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-7 w-56" />
                <SkeletonShimmer className="h-4 w-72" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-9 w-44" />
                <div className="flex items-center gap-2">
                  <SkeletonShimmer className="h-4 w-24" />
                  <SkeletonShimmer className="h-7 w-16" />
                </div>
              </div>
            </div>

            {/* Device Category Table */}
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-4 p-4 bg-muted/30 rounded-lg border">
                <SkeletonShimmer className="h-4 w-24" />
                <SkeletonShimmer className="h-4 w-20" />
                <SkeletonShimmer className="h-4 w-16" />
                <SkeletonShimmer className="h-4 w-24" />
                <SkeletonShimmer className="h-4 w-20" />
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-4 w-24" />
              </div>
              
              {/* Table Rows */}
              {[1, 2].map((row) => (
                <TableRowSkeleton key={row} columns={7} className="p-4 border rounded-lg" />
              ))}
            </div>

            {/* OS and Browser Breakdown */}
            <div className="grid grid-cols-2 gap-6">
              {/* OS Breakdown */}
              <div className="space-y-4">
                <SkeletonShimmer className="h-5 w-36" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <SkeletonShimmer className="h-4 w-32" />
                      <div className="flex items-center gap-4">
                        <SkeletonShimmer className="h-4 w-16" />
                        <SkeletonShimmer className="h-4 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Browser Breakdown */}
              <div className="space-y-4">
                <SkeletonShimmer className="h-5 w-40" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <SkeletonShimmer className="h-4 w-32" />
                      <div className="flex items-center gap-4">
                        <SkeletonShimmer className="h-4 w-16" />
                        <SkeletonShimmer className="h-4 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
