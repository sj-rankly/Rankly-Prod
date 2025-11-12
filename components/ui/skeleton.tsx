import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/30 dark:bg-muted/20",
        className
      )}
      {...props}
    />
  )
}

// Base shimmer effect for skeleton elements
function SkeletonShimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/40 dark:bg-muted/30",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:via-white/40 before:to-transparent",
        "dark:before:via-white/20 dark:before:via-white/25",
        className
      )}
      {...props}
    />
  )
}

// Skeleton for metric cards
function MetricCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 space-y-4", className)} {...props}>
      <div className="flex items-center justify-between">
        <SkeletonShimmer className="h-4 w-24" />
        <SkeletonShimmer className="h-4 w-4 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonShimmer className="h-8 w-16" />
        <SkeletonShimmer className="h-3 w-20" />
      </div>
    </div>
  )
}

// Skeleton for table rows
function TableRowSkeleton({ 
  columns = 4, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { columns?: number }) {
  return (
    <div className={cn("flex items-center space-x-4 py-3", className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonShimmer 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-8" : i === columns - 1 ? "w-16" : "w-20"
          )} 
        />
      ))}
    </div>
  )
}

// Skeleton for chart containers
function ChartSkeleton({ 
  type = "bar", 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { type?: "bar" | "line" | "donut" | "trend" }) {
  if (type === "donut") {
    return (
      <div className={cn("flex items-center justify-center h-64", className)} {...props}>
        <div className="relative">
          <SkeletonShimmer className="h-32 w-32 rounded-full" />
          <SkeletonShimmer className="absolute inset-4 h-24 w-24 rounded-full bg-background" />
        </div>
      </div>
    )
  }

  if (type === "trend" || type === "line") {
    return (
      <div className={cn("space-y-4", className)} {...props}>
        {/* Line chart skeleton with axis */}
        <div className="relative h-full space-y-3">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonShimmer key={i} className="h-3 w-6" />
            ))}
          </div>
          {/* Chart area with lines */}
          <div className="ml-10 h-full space-y-4">
            {[0, 1, 2].map((line) => (
              <div key={line} className="relative h-8">
                <SkeletonShimmer className="h-1 w-full rounded-full" />
                <div className="absolute top-0 left-0 w-full flex justify-between">
                  {[0, 1, 2, 3, 4, 5, 6].map((point) => (
                    <SkeletonShimmer key={point} className="h-2 w-2 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* X-axis labels */}
          <div className="ml-10 flex justify-between mt-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonShimmer key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex justify-center space-x-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <SkeletonShimmer className="h-3 w-3 rounded-full" />
              <SkeletonShimmer className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Bar chart skeleton
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Chart area with bars */}
      <div className="relative h-full">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonShimmer key={i} className="h-3 w-6" />
          ))}
        </div>
        {/* Bars */}
        <div className="ml-10 h-full flex items-end justify-between gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const heights = [60, 45, 80, 35, 70, 50, 55, 40]
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <SkeletonShimmer 
                  className="w-full rounded-t transition-all"
                  style={{ height: `${heights[i % heights.length]}%` }}
                />
                <SkeletonShimmer className="h-3 w-full max-w-[80%]" />
              </div>
            )
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="flex justify-center space-x-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-2">
            <SkeletonShimmer className="h-3 w-3 rounded-full" />
            <SkeletonShimmer className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton for sidebar elements
function SidebarSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4 p-4", className)} {...props}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <SkeletonShimmer className="h-5 w-5 rounded" />
          <SkeletonShimmer className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for modal content
function ModalSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-6 p-6", className)} {...props}>
      {/* Header */}
      <div className="space-y-2">
        <SkeletonShimmer className="h-6 w-48" />
        <SkeletonShimmer className="h-4 w-32" />
      </div>
      
      {/* Content sections */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <SkeletonShimmer className="h-4 w-20" />
          <SkeletonShimmer className="h-20 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-20 w-full" />
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonShimmer className="h-4 w-16" />
            <SkeletonShimmer className="h-8 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonShimmer, 
  MetricCardSkeleton, 
  TableRowSkeleton, 
  ChartSkeleton, 
  SidebarSkeleton, 
  ModalSkeleton 
}
