'use client'

import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { SkeletonShimmer, TableRowSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Minus } from 'lucide-react'
import { ModernTrendUp, ModernTrendDown } from '@/components/ui/modern-arrows'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'

interface UnifiedPlatformsPerformanceSectionProps {
  realLLMData?: any
  isLoading?: boolean
}

// Function to get the domain for each LLM platform for favicon fetching
function getLLMDomain(platform: string): string {
  switch (platform) {
    case 'ChatGPT':
      return 'chatgpt.com'
    case 'Claude':
      return 'claude.ai'
    case 'Gemini':
      return 'gemini.google.com'
    case 'Other LLM':
      return 'openai.com' // Fallback to OpenAI for other LLMs
    default:
      return 'openai.com'
  }
}

function UnifiedPlatformsPerformanceSection({ realLLMData, isLoading = false }: UnifiedPlatformsPerformanceSectionProps) {
  // Use real data only - no mock fallbacks
  console.log('🔍 UnifiedPlatformsPerformanceSection received realLLMData:', realLLMData)
  const platforms = realLLMData?.data?.platforms || []
  const summary = realLLMData?.data?.summary || {}
  
  console.log('🔍 UnifiedPlatformsPerformanceSection processed data:', {
    platforms,
    summary,
    hasData: platforms.length > 0
  })

  // Show loading skeleton if loading
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <SkeletonShimmer className="h-7 w-56" />
                  <SkeletonShimmer className="h-4 w-72" />
                </div>
              </div>
              
              {/* Table */}
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
      </div>
    )
  }

  // Show message if no data available
  if (platforms.length === 0) {
    return (
      <div className="w-full space-y-4">
        {/* Header Section - Outside the box */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Platforms Performance</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Detailed performance metrics for each LLM platform including sessions, SQS, LVS, and conversion rates</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Content Box */}
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No platform performance data available. Please connect your Google Analytics account and sync data.</p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ModernTrendUp className="w-3 h-3" />
      case 'down':
        return <ModernTrendDown className="w-3 h-3" />
      default:
        return <Minus className="w-3 h-3" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'border-green-500 text-green-500 bg-green-500/10'
      case 'down':
        return 'border-red-500 text-red-500 bg-red-500/10'
      default:
        return 'border-gray-500 text-gray-500 bg-gray-500/10'
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Platforms Performance</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Detailed performance metrics for each LLM platform including sessions, SQS, LVS, and conversion rates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-1">Platform</div>
              <div className="col-span-1 text-center">Sessions</div>
              <div className="col-span-1 text-center">Share</div>
              <div className="col-span-1 text-center">SQS</div>
              <div className="col-span-1 text-center">LVS</div>
              <div className="col-span-1 text-center">Conversion</div>
            </div>

            {/* Platform Rows */}
            {platforms.map((platform: any, index: number) => (
              <div key={`${platform.platform}-${index}`} className="grid grid-cols-6 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Platform Column */}
                <div className="col-span-1 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <img
                      src={getDynamicFaviconUrl(getLLMDomain(platform.platform || 'Unknown'), 16)}
                      alt={`${platform.platform || 'Unknown'} favicon`}
                      className="w-5 h-5 rounded-sm"
                      data-favicon-identifier={platform.platform || 'Unknown'}
                      data-favicon-size="16"
                      onError={(e) => {
                        handleFaviconError(e as any)
                        // Also apply custom fallback for visual consistency
                        const target = e.target as HTMLImageElement
                        if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com')) {
                          target.style.display = 'none'
                          const fallback = document.createElement('span')
                          fallback.className = 'text-white text-xs font-bold'
                          fallback.textContent = (platform.platform || '?').charAt(0)
                          target.parentNode?.insertBefore(fallback, target)
                        }
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{platform.platform || 'Unknown'}</span>
                </div>

                {/* Sessions Column */}
                <div className="col-span-1 flex justify-center">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {(platform.sessions || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(platform.totalUsers || platform.users || 0).toLocaleString()} users
                    </div>
                  </div>
                </div>

                {/* Share Column */}
                <div className="col-span-1 flex justify-center">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {(platform.percentage || 0).toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of total LLM
                    </div>
                  </div>
                </div>

                {/* SQS Column */}
                <div className="col-span-1 flex justify-center">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {(platform.sqs || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      quality score
                    </div>
                  </div>
                </div>

                {/* LVS Column */}
                <div className="col-span-1 flex justify-center">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {(platform.lvs || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      value score
                    </div>
                  </div>
                </div>

                {/* Conversion Column */}
                <div className="col-span-1 flex justify-center">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {((platform.conversionRate || 0) * 100).toFixed(2)}%
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`caption h-4 px-1 flex items-center gap-1 ${getTrendColor(platform.trend || 'stable')}`}
                      >
                        {getTrendIcon(platform.trend || 'stable')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          {summary.totalSessions > 0 && (
            <div className="mt-6 pt-6 border-t border-border/60">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {(summary.totalSessions || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <span>Total LLM Sessions</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs space-y-2">
                            <p className="text-sm font-semibold">Total LLM Sessions</p>
                            <p className="text-sm">Total number of <strong>unique</strong> sessions from LLM providers</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Calculated by aggregating sessions grouped by <strong>(sessionSource, sessionMedium, pageReferrer)</strong>. Each unique session is counted once, regardless of how many pages it visits.
                            </p>
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs font-semibold mb-1">Calculation:</p>
                              <p className="text-xs text-muted-foreground">
                                Sessions are grouped by source/medium/referrer combination, then summed. This ensures each unique user session is counted only once.
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {summary.totalPlatforms}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active Platforms
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {summary.topPlatform || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Top Platform
                  </div>
                </div>
              </div>
            </div>
          )}
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedPlatformsPerformanceSection }