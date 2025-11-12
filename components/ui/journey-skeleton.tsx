import { SkeletonShimmer } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function JourneySkeleton() {
  return (
    <div className="space-y-4">
      {/* User Journey Flow Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-7 w-56" />
                <SkeletonShimmer className="h-4 w-96" />
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center space-y-1">
                  <SkeletonShimmer className="h-8 w-16 mx-auto" />
                  <SkeletonShimmer className="h-3 w-24 mx-auto" />
                </div>
                <div className="text-center space-y-1">
                  <SkeletonShimmer className="h-8 w-20 mx-auto" />
                  <SkeletonShimmer className="h-3 w-32 mx-auto" />
                </div>
                <div className="text-center space-y-1">
                  <SkeletonShimmer className="h-8 w-16 mx-auto" />
                  <SkeletonShimmer className="h-3 w-24 mx-auto" />
                </div>
              </div>
            </div>
            
            {/* Journey Flow Diagram (Sankey Chart) */}
            <div className="relative h-[600px] bg-muted/20 rounded-lg border border-border/20 overflow-hidden">
              {/* Sankey-like skeleton with nodes and connections */}
              <div className="absolute inset-4 flex items-center">
                {/* Left side - Platforms */}
                <div className="flex flex-col gap-4 w-32">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <SkeletonShimmer className="h-6 w-6 rounded-full" />
                      <SkeletonShimmer className="h-10 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
                
                {/* Middle - Flow connections */}
                <div className="flex-1 h-full flex items-center justify-center">
                  <div className="space-y-8 w-full">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="relative">
                        <SkeletonShimmer className="h-3 w-full rounded-full" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                          <SkeletonShimmer className="h-2 w-2 rounded-full" />
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                          <SkeletonShimmer className="h-2 w-2 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Right side - Pages */}
                <div className="flex flex-col gap-4 w-48">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <SkeletonShimmer className="h-12 w-32 rounded-md" />
                      <SkeletonShimmer className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Loading indicator in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin">
                    <SkeletonShimmer className="h-8 w-8 rounded-full" />
                  </div>
                  <SkeletonShimmer className="h-3 w-32 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
