'use client'

import { UnifiedCard, UnifiedCardContent } from './unified-card'
import { SkeletonShimmer, ChartSkeleton, TableRowSkeleton } from './skeleton'
import { cn } from '@/lib/utils'

interface UnifiedCardSkeletonProps {
  /** Type of content to skeleton */
  type?: 'metric' | 'chart' | 'table' | 'mixed'
  /** Number of table columns (for table type) */
  tableColumns?: number
  /** Number of table rows (for table type) */
  tableRows?: number
  /** Chart type (for chart type) */
  chartType?: 'bar' | 'line' | 'donut'
  /** Whether to show header */
  showHeader?: boolean
  /** Whether to show footer */
  showFooter?: boolean
  /** Additional className */
  className?: string
}

/**
 * Skeleton component that matches UnifiedCard structure
 */
export function UnifiedCardSkeleton({
  type = 'mixed',
  tableColumns = 4,
  tableRows = 5,
  chartType = 'bar',
  showHeader = true,
  showFooter = false,
  className
}: UnifiedCardSkeletonProps) {
  return (
    <UnifiedCard className={className}>
      <UnifiedCardContent className="p-6">
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <SkeletonShimmer className="h-6 w-32" />
              <SkeletonShimmer className="h-4 w-24" />
            </div>
            <div className="flex items-center space-x-2">
              <SkeletonShimmer className="h-8 w-8 rounded" />
              <SkeletonShimmer className="h-8 w-20 rounded" />
            </div>
          </div>
        )}

        {/* Content based on type */}
        {type === 'metric' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonShimmer className="h-4 w-24" />
              <SkeletonShimmer className="h-4 w-4 rounded-full" />
            </div>
            <div className="space-y-2">
              <SkeletonShimmer className="h-8 w-16" />
              <SkeletonShimmer className="h-3 w-20" />
            </div>
          </div>
        )}

        {type === 'chart' && (
          <ChartSkeleton type={chartType} />
        )}

        {type === 'table' && (
          <div className="space-y-3">
            {/* Table header */}
            <div className="flex items-center space-x-4 pb-2 border-b border-border/50">
              {Array.from({ length: tableColumns }).map((_, i) => (
                <SkeletonShimmer 
                  key={i} 
                  className={cn(
                    "h-4",
                    i === 0 ? "w-8" : i === tableColumns - 1 ? "w-16" : "w-20"
                  )} 
                />
              ))}
            </div>
            {/* Table rows */}
            {Array.from({ length: tableRows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={tableColumns} />
            ))}
          </div>
        )}

        {type === 'mixed' && (
          <div className="space-y-6">
            {/* Chart area */}
            <ChartSkeleton type={chartType} />
            
            {/* Table section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-4 pb-2 border-b border-border/50">
                {Array.from({ length: tableColumns }).map((_, i) => (
                  <SkeletonShimmer 
                    key={i} 
                    className={cn(
                      "h-4",
                      i === 0 ? "w-8" : i === tableColumns - 1 ? "w-16" : "w-20"
                    )} 
                  />
                ))}
              </div>
              {Array.from({ length: Math.min(tableRows, 3) }).map((_, i) => (
                <TableRowSkeleton key={i} columns={tableColumns} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {showFooter && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
            <SkeletonShimmer className="h-4 w-32" />
            <SkeletonShimmer className="h-8 w-24 rounded" />
          </div>
        )}
      </UnifiedCardContent>
    </UnifiedCard>
  )
}

