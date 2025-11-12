'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { SkeletonShimmer, ChartSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Info, Settings, ChevronDown, BarChart, PieChart as PieChartIcon } from 'lucide-react'
import { ModernTrendUp, ModernTrendDown, TrendArrowUp } from '@/components/ui/modern-arrows'
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts'
import { PlatformTrendChart } from '@/components/charts/PlatformTrendChart'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'

// Function to get the domain for each LLM platform for favicon fetching
// Uses Google favicon service which automatically resolves domains for new platforms
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase().trim()
  
  // Comprehensive LLM platform mappings
  // ChatGPT/OpenAI
  if (platformLower === 'chatgpt' || platformLower.includes('openai') || platformLower.includes('gpt')) {
    return 'chatgpt.com'
  }
  // Claude/Anthropic
  if (platformLower === 'claude' || platformLower.includes('anthropic')) {
    return 'claude.ai'
  }
  // Gemini/Bard
  if (platformLower === 'gemini' || platformLower === 'bard' || platformLower.includes('bard')) {
    return 'gemini.google.com'
  }
  // Perplexity
  if (platformLower === 'perplexity') {
    return 'perplexity.ai'
  }
  // Poe
  if (platformLower === 'poe') {
    return 'poe.com'
  }
  // Microsoft Copilot
  if (platformLower === 'copilot' || platformLower.includes('microsoft copilot') || platformLower.includes('bing chat')) {
    return 'copilot.microsoft.com'
  }
  // Grok (X/Twitter)
  if (platformLower === 'grok' || platformLower.includes('grok')) {
    return 'x.com'
  }
  // Character.ai
  if (platformLower === 'character' || platformLower.includes('character.ai') || platformLower === 'characterai') {
    return 'character.ai'
  }
  // You.com
  if (platformLower === 'you' || platformLower === 'you.com' || platformLower.includes('youcom')) {
    return 'you.com'
  }
  // HuggingChat
  if (platformLower === 'huggingchat' || platformLower.includes('hugging face') || platformLower === 'huggingface') {
    return 'huggingface.co'
  }
  // Pi (Inflection)
  if (platformLower === 'pi' || platformLower.includes('inflection') || platformLower === 'heypi') {
    return 'heypi.com'
  }
  // Llama/Meta AI
  if (platformLower === 'llama' || platformLower.includes('meta ai') || platformLower === 'metaai') {
    return 'meta.ai'
  }
  // Mistral
  if (platformLower === 'mistral') {
    return 'mistral.ai'
  }
  // Cohere
  if (platformLower === 'cohere') {
    return 'cohere.com'
  }
  // Google/Direct
  if (platformLower === 'google' || platformLower === 'direct') {
    return 'google.com'
  }
  
  // For unknown platforms, construct domain from platform name
  // Google favicon service will automatically resolve the correct favicon
  // Format: platformname.com (remove spaces, special chars, lowercase)
  const cleanPlatform = platformLower
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
  
  // Try common domain extensions for LLM platforms
  if (cleanPlatform) {
    return `${cleanPlatform}.com` // Google favicon service will handle resolution
  }
  
  // Final fallback
  return 'google.com'
}

interface UnifiedPlatformSplitSectionProps {
  realLLMData?: any
  dateRange?: string
  isLoading?: boolean
}

function UnifiedPlatformSplitSection({ realLLMData, dateRange = '30 days', isLoading = false }: UnifiedPlatformSplitSectionProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [chartType, setChartType] = useState<'trend' | 'donut' | 'bar'>('trend')
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)

  // Use real data only - no mock fallbacks
  console.log('🔍 UnifiedPlatformSplitSection received realLLMData:', realLLMData)
  const platformSplitData = realLLMData?.data?.platformSplit || []
  const rankings = realLLMData?.data?.rankings || []
  const totalSessions = realLLMData?.data?.totalSessions || 0
  
  // Validation: Verify data consistency
  const calculatedTotalSessions = rankings.reduce((sum: number, r: any) => sum + (r.sessions || 0), 0)
  const sessionsDifference = Math.abs(calculatedTotalSessions - totalSessions)
  const totalPercentage = platformSplitData.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
  const percentageDifference = Math.abs(totalPercentage - 100)
  
  console.log('🔍 UnifiedPlatformSplitSection processed data:', {
    platformSplitData,
    rankings,
    totalSessions,
    calculatedTotalSessions,
    sessionsDifference,
    totalPercentage: totalPercentage.toFixed(2),
    percentageDifference: percentageDifference.toFixed(2),
    hasData: platformSplitData.length > 0,
    validation: {
      sessionsMatch: sessionsDifference <= 1,
      percentagesMatch: percentageDifference <= 0.1
    }
  })
  
  // Log warning if data inconsistency detected
  if (sessionsDifference > 1) {
    console.warn('⚠️ [PlatformSplit] Sessions mismatch:', {
      reportedTotal: totalSessions,
      calculatedTotal: calculatedTotalSessions,
      difference: sessionsDifference
    })
  }
  
  if (percentageDifference > 0.1) {
    console.warn('⚠️ [PlatformSplit] Percentages don\'t sum to 100%:', {
      totalPercentage: totalPercentage.toFixed(2),
      difference: percentageDifference.toFixed(2)
    })
  }

  // Show loading skeleton if loading
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-6">
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
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Show message if no data available
  if (platformSplitData.length === 0) {
    return (
      <div className="w-full space-y-4">
        {/* Main Content Box */}
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            {/* Header Section - Inside the card */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Traffic Split</h2>
                <p className="text-sm text-muted-foreground">Percentage share of traffic from each traffic source</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No platform data available. Please connect your Google Analytics account and sync data.</p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Use total sessions from backend directly
  const allSourcesTotalSessions = totalSessions;
  const allSourcesTotalAbsoluteChange = realLLMData?.data?.summary?.totalAbsoluteChange || 0;
  const allSourcesTotalPercentageChange = realLLMData?.data?.summary?.totalPercentageChange || 0;
  const allSourcesTotalTrend = allSourcesTotalAbsoluteChange > 0 ? 'up' : 
                               allSourcesTotalAbsoluteChange < 0 ? 'down' : 'neutral';
  
  // Get top platform data for display
  const topPlatform = platformSplitData[0];
  const topPlatformShare = topPlatform?.value || 0;

  return (
    <div className="w-full space-y-4">
      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the card */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Traffic Split</h2>
              <p className="text-sm text-muted-foreground">Percentage share of traffic from each traffic source</p>
            </div>
          </div>
          {/* Container with full-height divider */}
          <div className="relative">
            {/* Full-height vertical divider touching top and bottom */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
            
            <div className="grid grid-cols-2 gap-8">
              
              {/* Left Section: Donut Chart */}
              <div className="space-y-6 relative">
                {/* Chart Config Dropdown - Top Right of Left Split Section */}
                <div className="absolute top-0 right-0 z-50 pointer-events-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="body-text bg-background border-border shadow-md hover:bg-muted"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Chart Config
                        <ChevronDown className="ml-2 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-full">
                      <DropdownMenuItem onClick={() => setChartType('trend')}>
                        <TrendArrowUp className="mr-2 h-4 w-4" />
                        Trend Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setChartType('donut')}>
                        <PieChartIcon className="mr-2 h-4 w-4" />
                        Donut Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setChartType('bar')}>
                        <BarChart className="mr-2 h-4 w-4" />
                        Bar Chart
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Title and Total Traffic Metrics Display */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    {/* Total Sessions Value */}
                    <div className="flex items-center gap-2">
                      <div className="metric text-xl font-semibold text-foreground">
                        {allSourcesTotalSessions.toLocaleString()}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs space-y-2">
                              <p className="text-sm font-semibold">Total Sessions</p>
                              <p className="text-sm">Total number of sessions across all traffic sources</p>
                              <p className="text-xs text-muted-foreground mt-1">A session is a period of user activity on your site</p>
                              {allSourcesTotalAbsoluteChange !== 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground">
                                    Change from previous period: {allSourcesTotalAbsoluteChange > 0 ? '+' : ''}{allSourcesTotalAbsoluteChange.toLocaleString()} sessions
                                  </p>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Absolute Change */}
                    {allSourcesTotalAbsoluteChange !== 0 && (
                      <span className={`text-sm font-normal text-muted-foreground`}>
                        ({allSourcesTotalAbsoluteChange > 0 ? '+' : ''}{allSourcesTotalAbsoluteChange.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Contained Chart */}
                <div className="relative h-80 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-6">
                  {chartType === 'trend' && (
                    <PlatformTrendChart dateRange={dateRange} />
                  )}

                  {chartType === 'bar' && (
                    <>
                      {/* Y-axis labels on the left */}
                      <div className="absolute left-2 top-4 bottom-3 flex flex-col justify-between caption text-muted-foreground">
                        <span>{Math.max(...platformSplitData.map((p: any) => p.value)).toFixed(2)}%</span>
                        <span>{(Math.max(...platformSplitData.map((p: any) => p.value)) * 0.75).toFixed(2)}%</span>
                        <span>{(Math.max(...platformSplitData.map((p: any) => p.value)) * 0.5).toFixed(2)}%</span>
                        <span>{(Math.max(...platformSplitData.map((p: any) => p.value)) * 0.25).toFixed(2)}%</span>
                        <span>0%</span>
                      </div>
                      
                      {/* Chart bars area */}
                      <div className="ml-10 h-full flex items-end justify-between relative">
                        {platformSplitData.map((platform: any, index: number) => (
                          <div 
                            key={platform.name} 
                            className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setHoveredBar({
                                name: platform.name,
                                score: `${platform.value.toFixed(2)}%`,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10
                              })
                            }}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            {/* Value label above bar */}
                            <div className="text-xs font-medium text-foreground">
                              {platform.value.toFixed(2)}%
                            </div>
                            
                            {/* Vertical Bar */}
                            <div 
                              className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                              style={{
                                height: `${(platform.value / Math.max(...platformSplitData.map((p: any) => p.value))) * 180}px`,
                                minHeight: '4px',
                                backgroundColor: platform.color
                              }}
                            />
                            
                            {/* Platform favicon below bar */}
                            <div className="w-16 h-6 flex items-center justify-center">
                              <img
                                src={getDynamicFaviconUrl(getLLMDomain(platform.name), 16)}
                                alt={`${platform.name} favicon`}
                                className="w-4 h-4 rounded-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const fallback = document.createElement('div')
                                  fallback.className = 'w-3 h-3 rounded-full'
                                  fallback.style.backgroundColor = platform.color
                                  target.parentNode?.insertBefore(fallback, target)
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {chartType === 'donut' && (
                    <div className="h-full flex flex-col items-center justify-center relative">
                      {/* Color Legend for Donut Chart */}
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4">
                        {platformSplitData.map((entry: any, index: number) => (
                          <div key={entry.name} className="flex items-center gap-1">
                            <img
                              src={getDynamicFaviconUrl(getLLMDomain(entry.name), 16)}
                              alt={`${entry.name} favicon`}
                              className="w-3 h-3 rounded-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const fallback = document.createElement('div')
                                fallback.className = 'w-2.5 h-2.5 rounded-full'
                                fallback.style.backgroundColor = entry.color
                                target.parentNode?.insertBefore(fallback, target)
                              }}
                            />
                            <span className="text-xs text-foreground">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="w-48 h-48">
                        <PieChart width={192} height={192}>
                          <Pie
                            data={platformSplitData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={80}
                            strokeWidth={2}
                            cursor="pointer"
                            onMouseEnter={(data, index) => {
                              console.log('🍩 Donut hover:', { data, index })
                              setActiveIndex(index)
                            }}
                            onMouseLeave={() => {
                              console.log('🍩 Donut leave')
                              setActiveIndex(-1)
                            }}
                            onClick={(data, index) => {
                              console.log('🍩 Donut click:', { data, index })
                              setActiveIndex(index)
                            }}
                          >
                            {platformSplitData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke={activeIndex === index ? '#fff' : 'none'}
                                strokeWidth={activeIndex === index ? 3 : 0}
                                style={{
                                  filter: activeIndex === index ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              />
                            ))}
                            <Label
                              content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      className="fill-foreground"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground text-lg font-bold"
                                      >
                                        {activeIndex >= 0 && platformSplitData[activeIndex] 
                                          ? Math.round(platformSplitData[activeIndex].value)
                                          : Math.round(topPlatformShare)}%
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 16}
                                        className="fill-muted-foreground text-xs"
                                      >
                                        {activeIndex >= 0 && platformSplitData[activeIndex] 
                                          ? platformSplitData[activeIndex].name
                                          : topPlatform?.name || 'N/A'}
                                      </tspan>
                                    </text>
                                  )
                                }
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </div>
                    </div>
                  )}

                  {/* Hover Card */}
                  {hoveredBar && chartType === 'bar' && (
                    <div 
                      className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none min-w-[200px]"
                      style={{
                        left: `${hoveredBar.x}px`,
                        top: `${hoveredBar.y}px`,
                        transform: 'translateX(-50%) translateY(-100%)'
                      }}
                    >
                      {/* Platform info */}
                      <div className="space-y-1">
                        <div className="text-white font-semibold text-sm">{hoveredBar.name}</div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-300">Share:</span>
                          <span className="text-gray-300 font-medium">{hoveredBar.score}</span>
                        </div>
                      </div>

                      {/* Pointer */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section: Horizontal Bar Chart */}
              <div className="space-y-4 pl-8 relative">
                <div className="space-y-1">
                  <h3 className="text-foreground text-sm font-medium">Source Rankings</h3>
                  <div className="text-sm text-muted-foreground">Top {rankings.length} Sources</div>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="space-y-2 pb-4 relative">
                  <Table className="w-full min-w-[400px]">
                    <TableHeader>
                      <TableRow className="border-border/60">
                        <TableHead className="caption text-muted-foreground py-2 pl-0 pr-3">
                          <div className="flex items-center gap-2">
                            Platform
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">Traffic source with session count and absolute change from previous period</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableHead>
                        <TableHead className="text-right caption text-muted-foreground py-2 px-3 w-24">
                          <div className="flex items-center justify-end gap-2">
                            Share
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="max-w-xs space-y-2">
                                    <p className="text-sm font-semibold">Share</p>
                                    <p className="text-sm">Percentage share of total traffic from this source</p>
                                    <p className="text-xs text-muted-foreground mt-1">Calculated as: (Platform Sessions / Total Sessions) × 100%</p>
                                    <div className="mt-2 pt-2 border-t border-border/50">
                                      <p className="text-xs font-semibold mb-1">Change Indicator:</p>
                                      <p className="text-xs text-muted-foreground">Shows percentage point change (share % - previous share %)</p>
                                      <p className="text-xs text-muted-foreground mt-1">Example: If share increased from 20% to 22%, change = +2.00%</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings.map((ranking: any, index: number) => {
                        const maxSessions = Math.max(...rankings.map((r: any) => r.sessions || 0))
                        const barWidth = maxSessions > 0 ? ((ranking.sessions || 0) / maxSessions) * 100 : 0
                        // Use real trend data from backend
                        const trend = ranking.trend || 'neutral'
                        const absoluteChange = ranking.absoluteChange || 0
                        const shareChange = ranking.shareChange || 0 // Share percentage change
                        
                        // Debug logging for first few rankings
                        if (index < 3) {
                          console.log('🔍 [PlatformSplit] Ranking data:', {
                            name: ranking.name,
                            sessions: ranking.sessions,
                            percentage: ranking.percentage,
                            shareChange,
                            absoluteChange,
                            trend,
                            rankingObject: ranking
                          })
                        }
                        
                        return (
                          <TableRow 
                            key={`${ranking.name}-${index}`} 
                            className="border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="py-2 pl-0 pr-3">
                              <div className="space-y-1">
                                {/* Platform name without favicon */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium" style={{ color: platformSplitData[index]?.color || '#6B7280' }}>
                                      {ranking.name}
                                    </span>
                                    {ranking.name === 'Other' && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="w-3 h-3 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-sm">Other traffic sources including email, affiliate, display ads, and other miscellaneous channels not categorized above</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Horizontal bar with absolute numbers and trend */}
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted/30 rounded-full h-1.5 relative overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ 
                                          width: `${barWidth}%`,
                                          backgroundColor: platformSplitData[index]?.color || '#6B7280'
                                        }}
                                      />
                                    </div>
                                    <div className="text-sm font-semibold text-foreground min-w-[50px] text-right">
                                      {(ranking.sessions || 0).toLocaleString()}
                                      <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                                        ({absoluteChange > 0 ? '+' : ''}{absoluteChange.toLocaleString()})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-2 px-3 w-24">
                              <div className="flex items-center justify-end gap-2">
                                {/* Percentage Share */}
                                <span className="text-xs text-muted-foreground font-normal">
                                  {parseFloat(ranking.percentage.replace('%', '')) > 0 
                                    ? parseFloat(ranking.percentage.replace('%', '')).toFixed(2) + '%'
                                    : '0.00%'}
                                </span>
                                {/* Percentage Change with Trend Arrow */}
                                {Math.abs(shareChange) >= 0.01 && (
                                  <div className="flex items-center gap-1">
                                    {trend === 'up' ? (
                                      <ModernTrendUp className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <ModernTrendDown className="w-3 h-3 text-red-500" />
                                    )}
                                    <span className={`text-xs font-medium ${
                                      trend === 'up' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                      {Math.abs(shareChange).toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedPlatformSplitSection }