'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { SkeletonShimmer } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Info, Settings, ChevronDown, BarChart, PieChart as PieChartIcon, Expand } from 'lucide-react'
import { ModernTrendUp, ModernTrendDown, TrendArrowUp } from '@/components/ui/modern-arrows'
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, CartesianGrid } from 'recharts'
import { LLMPlatformTrendChart } from '@/components/charts/LLMPlatformTrendChart'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'

interface UnifiedPlatformsSplitSectionProps {
  realLLMData?: any
  dateRange?: string
  isLoading?: boolean
}

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

function UnifiedPlatformsSplitSection({ realLLMData, dateRange = '30 days', isLoading = false }: UnifiedPlatformsSplitSectionProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [chartType, setChartType] = useState<'trend' | 'donut' | 'bar'>('bar')
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Use real LLM platform data
  console.log('🔍 UnifiedPlatformsSplitSection received realLLMData:', realLLMData)
  const llmPlatformsData = realLLMData?.data?.platforms || []
  const totalLLMSessions = llmPlatformsData.reduce((sum: number, platform: any) => sum + (platform.sessions || 0), 0)
  
  // Transform LLM data into platform split format - use backend-provided percentage
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#6b7280', '#f59e0b', '#ef4444']
  const platformSplitData = llmPlatformsData.map((platform: any, index: number) => ({
    id: index,
    name: platform.name || platform.platform, // Use name if available, fallback to platform
    value: platform.percentage || 0, // Use backend-provided percentage
    sessions: platform.sessions,
    color: colors[index % colors.length],
  }))

  // Create rankings from LLM platforms - include comparison data from backend
  const rankings = llmPlatformsData
    .map((platform: any, index: number) => ({
      rank: index + 1,
      name: platform.name || platform.platform, // Use name if available, fallback to platform
      sessions: platform.sessions,
      percentage: platform.percentage ? `${platform.percentage.toFixed(2)}%` : '0.00%', // Use backend-provided percentage, rounded to 2 decimals
      // Include comparison data from backend
      absoluteChange: platform.absoluteChange || 0,
      change: platform.change || 0, // Session percentage change
      shareChange: platform.shareChange || 0, // Share percentage point change (if available)
      trend: platform.trend || 'neutral'
    }))
    .sort((a: any, b: any) => b.sessions - a.sessions)
  
  console.log('🔍 UnifiedPlatformsSplitSection processed data:', {
    platformSplitData,
    rankings,
    totalLLMSessions,
    hasData: platformSplitData.length > 0,
    llmPlatformsData: llmPlatformsData,
    firstPlatform: llmPlatformsData[0],
    rankingsPercentages: rankings.map(r => ({ 
      name: r.name, 
      percentage: r.percentage, 
      sessions: r.sessions,
      absoluteChange: r.absoluteChange,
      shareChange: r.shareChange,
      change: r.change,
      trend: r.trend
    })),
    sampleRanking: rankings[0],
    rawPlatformData: llmPlatformsData.slice(0, 3)
  })

  // Show loading skeleton if loading
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
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
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Platforms Split</h2>
                <p className="text-sm text-muted-foreground">Percentage share of traffic from each LLM platform</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No LLM platform data available. Please connect your Google Analytics account and sync data.</p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Calculate total traffic from all LLM platforms
  const totalSessions = rankings.reduce((sum: number, ranking: any) => sum + (parseInt(ranking.sessions) || 0), 0);
  // Note: Change/trend data not available yet, will be added in future update
  const totalChange = 0;
  const totalTrend = null;
  
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
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Platforms Split</h2>
              <p className="text-sm text-muted-foreground">Percentage share of traffic from each LLM platform</p>
            </div>
          </div>
          {/* Container with full-height divider */}
          <div className="relative">
            {/* Full-height vertical divider touching top and bottom */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
            
            <div className="grid grid-cols-2 gap-8">
              
              {/* Left Section: Chart */}
              <div className="space-y-4 relative">
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

                {/* Title and Score Display */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <div className="metric text-xl font-semibold text-foreground">
                      {totalSessions.toLocaleString()}
                      {totalTrend && (
                        <span className={`text-sm font-normal ml-1 ${
                          totalTrend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          ({totalTrend === 'up' ? '+' : '-'}{Math.abs(totalChange).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contained Chart */}
                <div className="relative h-80 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-6 overflow-visible">
                  {/* Expand Button */}
                  <div className="absolute top-2 right-2 z-10">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm border-border/50 hover:bg-background shadow-sm"
                        >
                          <Expand className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>LLM Platform Trends - {dateRange}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          {/* Expanded Chart Content */}
                          <div className="h-96 w-full">
                            {/* Custom Legend for Trend Chart */}
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
                              {platformSplitData.map((entry: any, index: number) => (
                                <div key={entry.name} className="flex items-center gap-1">
                                  <img
                                    src={getDynamicFaviconUrl(getLLMDomain(entry.name), 32)}
                                    alt={`${entry.name} favicon`}
                                    className="w-4 h-4 rounded-sm"
                                    data-favicon-identifier={entry.name}
                                    data-favicon-size="32"
                                    onError={(e) => {
                                      handleFaviconError(e as any)
                                      // Also apply custom fallback for visual consistency
                                      const target = e.target as HTMLImageElement
                                      if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com')) {
                                        target.style.display = 'none'
                                        const fallback = document.createElement('div')
                                        fallback.className = 'w-4 h-4 rounded-full'
                                        fallback.style.backgroundColor = entry.color
                                        target.parentNode?.insertBefore(fallback, target)
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-foreground">{entry.name}</span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Expanded Trend Chart */}
                            <div className="h-80 w-full">
                              {(() => {
                                // Generate trend data based on current platform data
                                const generateTrendData = () => {
                                  const days = 7
                                  const trendData = []
                                  
                                  for (let i = 0; i < days; i++) {
                                    const date = new Date()
                                    date.setDate(date.getDate() - (days - 1 - i))
                                    const dateStr = date.toISOString().split('T')[0]
                                    
                                    const dayData: any = { date: dateStr }
                                    platformSplitData.forEach((platform: any) => {
                                      // Use actual sessions data (will be replaced with real trend API data)
                                      const baseSessions = platform.sessions || 0
                                      dayData[platform.name] = Math.round(baseSessions / 7) // Divide by days for average
                                    })
                                    trendData.push(dayData)
                                  }
                                  return trendData
                                }
                                
                                const trendData = generateTrendData()
                                
                                // Create chart config for shadcn/ui
                                const chartConfig = platformSplitData.reduce((config: any, platform: any, index: number) => {
                                  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#6b7280', '#f59e0b', '#ef4444']
                                  config[platform.name] = {
                                    label: platform.name,
                                    color: colors[index % colors.length]
                                  }
                                  return config
                                }, {})
                                
                                return (
                                  <ChartContainer config={chartConfig}>
                                    <LineChart
                                      accessibilityLayer
                                      data={trendData}
                                      margin={{
                                        left: 20,
                                        right: 20,
                                        top: 12,
                                        bottom: 30,
                                      }}
                                    >
                                      <CartesianGrid vertical={false} />
                                      <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      />
                                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                      {platformSplitData.map((platform: any, index: number) => {
                                        const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#6b7280', '#f59e0b', '#ef4444']
                                        return (
                                          <Line
                                            key={platform.name}
                                            dataKey={platform.name}
                                            type="monotone"
                                            stroke={colors[index % colors.length]}
                                            strokeWidth={2}
                                            dot={false}
                                          />
                                        )
                                      })}
                                    </LineChart>
                                  </ChartContainer>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {chartType === 'trend' && (
                    <div className="h-full w-full">
                      {/* Custom Legend for Trend Chart */}
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
                        {platformSplitData.map((entry: any, index: number) => (
                          <div key={entry.name} className="flex items-center gap-1">
                            <img
                              src={getDynamicFaviconUrl(getLLMDomain(entry.name), 32)}
                              alt={`${entry.name} favicon`}
                              className="w-4 h-4 rounded-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const fallback = document.createElement('div')
                                fallback.className = 'w-4 h-4 rounded-full'
                                fallback.style.backgroundColor = entry.color
                                target.parentNode?.insertBefore(fallback, target)
                              }}
                            />
                            <span className="text-xs text-foreground">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Modern Trend Chart using shadcn/ui components */}
                      <div className="h-64 w-full overflow-visible">
                        {(() => {
                          // Generate trend data based on current platform data
                          const generateTrendData = () => {
                            const days = 7
                            const trendData = []
                            
                            for (let i = 0; i < days; i++) {
                              const date = new Date()
                              date.setDate(date.getDate() - (days - 1 - i))
                              const dateStr = date.toISOString().split('T')[0]
                              
                              const dayData: any = { date: dateStr }
                              platformSplitData.forEach((platform: any) => {
                                // Use actual sessions data (will be replaced with real trend API data)
                                const baseSessions = platform.sessions || 0
                                dayData[platform.name] = Math.round(baseSessions / 7) // Divide by days for average
                              })
                              trendData.push(dayData)
                            }
                            return trendData
                          }
                          
                          const trendData = generateTrendData()
                          
                          // Create chart config for shadcn/ui
                          const chartConfig = platformSplitData.reduce((config: any, platform: any, index: number) => {
                            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#6b7280', '#f59e0b', '#ef4444']
                            config[platform.name] = {
                              label: platform.name,
                              color: colors[index % colors.length]
                            }
                            return config
                          }, {})
                          
                          return (
                            <ChartContainer config={chartConfig}>
                              <LineChart
                                accessibilityLayer
                                data={trendData}
                                margin={{
                                  left: 20,
                                  right: 20,
                                  top: 12,
                                  bottom: 30,
                                }}
                              >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                  dataKey="date"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                {platformSplitData.map((platform: any, index: number) => {
                                  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#6b7280', '#f59e0b', '#ef4444']
                                  return (
                                    <Line
                                      key={platform.name}
                                      dataKey={platform.name}
                                      type="monotone"
                                      stroke={colors[index % colors.length]}
                                      strokeWidth={2}
                                      dot={false}
                                    />
                                  )
                                })}
                              </LineChart>
                            </ChartContainer>
                          )
                        })()}
                      </div>
                    </div>
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
                            
                            {/* Favicon only below bar */}
                            <div className="w-16 h-8 flex items-center justify-center">
                              <img
                                src={getDynamicFaviconUrl(getLLMDomain(platform.name), 64)}
                                alt={`${platform.name} favicon`}
                                className="w-6 h-6 rounded-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const fallback = document.createElement('div')
                                  fallback.className = 'w-6 h-6 rounded-full'
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
                              {/* Favicon Legend for Donut Chart */}
                              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4">
                                {platformSplitData.map((entry: any, index: number) => (
                                  <div key={entry.name} className="flex items-center gap-1">
                                    <img
                                      src={getDynamicFaviconUrl(getLLMDomain(entry.name), 32)}
                                      alt={`${entry.name} favicon`}
                                      className="w-4 h-4 rounded-sm"
                                      onError={(e) => {
                                        // Fallback to colored dot if favicon fails to load
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
                            onMouseEnter={(data, index) => {
                              console.log('🍩 LLM Donut hover:', { data, index })
                              setActiveIndex(index)
                            }}
                            onMouseLeave={() => {
                              console.log('🍩 LLM Donut leave')
                              setActiveIndex(-1)
                            }}
                            onClick={(data, index) => {
                              console.log('🍩 LLM Donut click:', { data, index })
                              setActiveIndex(index)
                            }}
                            cursor="pointer"
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
                  <h3 className="text-foreground text-sm font-medium">Platform Rankings</h3>
                  <div className="text-sm text-muted-foreground">Top {rankings.length} LLM Platforms</div>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="space-y-2 pb-4 relative">
                  <Table className="w-full min-w-[400px]">
                    <TableHeader>
                      <TableRow className="border-border/60">
                        <TableHead className="caption text-muted-foreground py-2 pl-0 pr-3">
                          Platform
                        </TableHead>
                        <TableHead className="text-right caption text-muted-foreground py-2 px-3 w-24">
                          Share
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings.map((ranking: any, index: number) => {
                        const maxSessions = Math.max(...rankings.map((r: any) => r.sessions || 0))
                        const barWidth = maxSessions > 0 ? ((ranking.sessions || 0) / maxSessions) * 100 : 0
                        // Use real trend data from backend
                        const trend = ranking.trend || 'neutral'
                        const absoluteChange = ranking.absoluteChange || 0 // Keep sign for proper display
                        // For LLM platforms, use shareChange if available and not null/undefined, otherwise use session percentage change
                        const percentageChange = (ranking.shareChange !== undefined && ranking.shareChange !== null) 
                          ? ranking.shareChange 
                          : (ranking.change !== undefined && ranking.change !== null ? ranking.change : 0)
                        
                        // Debug logging for first few rankings
                        if (index < 3) {
                          console.log('🔍 [UnifiedPlatformsSplitSection] Ranking display:', {
                            name: ranking.name,
                            sessions: ranking.sessions,
                            absoluteChange,
                            shareChange: ranking.shareChange,
                            change: ranking.change,
                            percentageChange,
                            trend,
                            rawRanking: ranking
                          })
                        }
                        
                        return (
                          <TableRow 
                            key={ranking.rank} 
                            className="border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="py-2 pl-0 pr-3">
                              <div className="space-y-1">
                                        {/* Platform name with favicon - matching bar chart style */}
                                        <div className="flex items-center gap-2">
                                          <img
                                    src={getDynamicFaviconUrl(getLLMDomain(ranking.name), 64)}
                                            alt={`${ranking.name} favicon`}
                                    className="w-6 h-6 rounded-sm"
                                            data-favicon-identifier={ranking.name}
                                            data-favicon-size="64"
                                            onError={(e) => {
                                              handleFaviconError(e as any)
                                              // Also apply custom fallback for visual consistency
                                              const target = e.target as HTMLImageElement
                                              if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com')) {
                                                target.style.display = 'none'
                                                const fallback = document.createElement('div')
                                                fallback.className = 'w-2.5 h-2.5 rounded-full'
                                                fallback.style.backgroundColor = platformSplitData[index]?.color || '#6B7280'
                                                target.parentNode?.insertBefore(fallback, target)
                                              }
                                            }}
                                          />
                                          <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium" style={{ color: platformSplitData[index]?.color || '#6B7280' }}>
                                              {ranking.name}
                                            </span>
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
                                {/* Percentage Change with Trend Arrow - always show */}
                                {Math.abs(percentageChange) >= 0.01 ? (
                                  <div className="flex items-center gap-1">
                                    {trend === 'up' ? (
                                      <ModernTrendUp className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <ModernTrendDown className="w-3 h-3 text-red-500" />
                                    )}
                                    <span className={`text-xs font-medium ${
                                      trend === 'up' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                      {Math.abs(percentageChange).toFixed(2)}%
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <ModernTrendDown className="w-3 h-3 text-red-500" />
                                    <span className="text-xs font-medium text-red-500">
                                      0.00%
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

export { UnifiedPlatformsSplitSection }
