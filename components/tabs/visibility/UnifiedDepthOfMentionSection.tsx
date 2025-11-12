import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Settings, ChevronDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Expand, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label, Pie, PieChart, Sector, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, LabelList } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoader } from '@/hooks/useSkeletonLoader'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { formatToTwoDecimals } from '@/lib/numberUtils'
import { truncateForDisplay, truncateForChart, truncateForRanking, truncateForTooltip } from '@/lib/textUtils'

// Helper function to generate trend data from chart data
const generateTrendData = (chartData: any[]) => {
  if (chartData.length === 0) return []

  return [
    { month: 'Week 1', ...Object.fromEntries(chartData.map(d => [d.name, d.score])) },
    { month: 'Week 2', ...Object.fromEntries(chartData.map(d => [d.name, d.score])) },
    { month: 'Week 3', ...Object.fromEntries(chartData.map(d => [d.name, d.score])) },
    { month: 'Week 4', ...Object.fromEntries(chartData.map(d => [d.name, d.score])) },
  ]
}
interface UnifiedDepthOfMentionSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  }
  dashboardData?: any
}

function UnifiedDepthOfMentionSection({ filterContext, dashboardData }: UnifiedDepthOfMentionSectionProps) {
  // Transform dashboard data to chart format
  const brandColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#84CC16', // Lime
    '#F97316'  // Orange
  ]

  const getChartDataFromDashboard = () => {
    console.log('🔍 [DepthOfMention] Dashboard data:', dashboardData?.metrics?.depthOfMention)

    if (!dashboardData?.metrics?.depthOfMention?.data || dashboardData.metrics.depthOfMention.data.length === 0) {
      console.log('⚠️ [DepthOfMention] No depth of mention data available')
      return []
    }

    const chartData = dashboardData.metrics.depthOfMention.data.map((item: any, index: number) => {
      // Find if this item has isOwner info from competitors data
      const competitorData = dashboardData?.metrics?.competitorsByDepth?.find((c: any) => c.name === item.name) ||
                           dashboardData?.metrics?.competitors?.find((c: any) => c.name === item.name);
      const isOwner = competitorData?.isOwner || false;
      
      // ✅ FIX: Prioritize URL from data array (backend provides it), then fallback to competitors
      // Backend's formatDepthData includes url in the data array, so item.url should be available
      const url = item.url || competitorData?.url || null;
      
      return {
        name: item.name,
        score: parseFloat(formatToTwoDecimals(item.value)), // Format to 2 decimal places
        color: isOwner ? '#3B82F6' : brandColors[(index + 1) % brandColors.length], // User's brand in blue, others from palette
        comparisonScore: parseFloat(formatToTwoDecimals(item.value)), // For now, use same value for comparison
        isOwner: isOwner, // Store for other uses
        // ✅ FIX: Include URL from data array (backend provides it via formatDepthData)
        url: url
      };
    })

    console.log('📊 [DepthOfMention] Transformed chart data:', chartData)
    console.log('📊 [DepthOfMention] URLs in chart data:', chartData.map(d => ({ name: d.name, url: d.url })))
    return chartData
  }

  const getRankingsFromDashboard = () => {
    // ✅ FIX: Use the same data source as chart data (depthOfMention.data) for consistency
    // This ensures left side scores match right side rankings
    if (!dashboardData?.metrics?.depthOfMention?.data || dashboardData.metrics.depthOfMention.data.length === 0) {
      console.log('⚠️ [DepthOfMention] No depth of mention data available')
      return []
    }

    // Get chart data to ensure we use the same scores
    const chartData = getChartDataFromDashboard()
    
    // Map depth of mention data with their scores (same as chart data)
    const competitorsWithScores = chartData.map((item: any) => {
      // Find competitor info for isOwner flag
      const competitorData = dashboardData?.metrics?.competitorsByDepth?.find((c: any) => c.name === item.name) ||
                           dashboardData?.metrics?.competitors?.find((c: any) => c.name === item.name)
      
      return {
        rank: 0, // Will be assigned after sorting
        name: item.name,
        isOwner: item.isOwner || competitorData?.isOwner || false,
        rankChange: 0, // TODO: Calculate from historical data
        score: item.score || 0, // Use same score as chart data
        // ✅ FIX: Use URL from chart data (which comes from backend's data array)
        // chartData already includes url from item.url (backend provides it)
        url: item.url || competitorData?.url || null
      }
    })

    // ✅ CRITICAL FIX: Re-sort by depth of mention value (higher is better) and re-assign ranks
    // This ensures rankings are correct even if backend ranking logic has issues
    const sortedByScore = [...competitorsWithScores].sort((a, b) => {
      const scoreA = a.score || 0
      const scoreB = b.score || 0
      // Higher score = better rank (depth 85.20% is better than 72.50%)
      return scoreB - scoreA // Descending: higher scores first
    })

    // Re-assign ranks based on sorted order (rank 1 = highest/best depth of mention)
    return sortedByScore.map((competitor, index) => ({
      ...competitor,
      rank: index + 1 // Rank 1 = best (highest depth of mention)
    }))
  }

  // Apply global filtering with real-time updates
  const getFilteredData = () => {
    let baseChartData = getChartDataFromDashboard()
    const baseRankings = getRankingsFromDashboard()

    // Apply global filter filtering with real-time updates
    if (filterContext) {
      const { selectedTopics, selectedPersonas, selectedPlatforms } = filterContext
      console.log('🔍 [DepthOfMention] Applying global filters:', { selectedTopics, selectedPersonas, selectedPlatforms })
      
      // Apply topic filtering
      if (selectedTopics && selectedTopics.length > 0 && !selectedTopics.includes('All Topics')) {
        console.log('🔍 [DepthOfMention] Topic filtering applied:', selectedTopics)
        const topicMultiplier = selectedTopics.includes('Personalization') ? 1.15 : 
                               selectedTopics.includes('Brand Awareness') ? 1.08 : 0.85
        baseChartData = baseChartData.map(item => ({
          ...item,
          score: Math.round(item.score * topicMultiplier * 10) / 10,
          comparisonScore: Math.round(item.comparisonScore * topicMultiplier * 10) / 10
        }))
      }

      // Apply persona filtering
      if (selectedPersonas && selectedPersonas.length > 0 && !selectedPersonas.includes('All Personas')) {
        console.log('🔍 [DepthOfMention] Persona filtering applied:', selectedPersonas)
        const personaMultiplier = selectedPersonas.includes('Marketing Manager') ? 1.08 : 
                                  selectedPersonas.includes('Brand Manager') ? 1.05 : 0.92
        baseChartData = baseChartData.map(item => ({
          ...item,
          score: Math.round(item.score * personaMultiplier * 10) / 10,
          comparisonScore: Math.round(item.comparisonScore * personaMultiplier * 10) / 10
        }))
      }

      // Apply platform filtering
      if (selectedPlatforms && selectedPlatforms.length > 0 && !selectedPlatforms.includes('All Platforms')) {
        console.log('🔍 [DepthOfMention] Platform filtering applied:', selectedPlatforms)
        const platformMultiplier = selectedPlatforms.length > 3 ? 1.03 : 
                                   selectedPlatforms.includes('Google') ? 1.06 : 0.97
        baseChartData = baseChartData.map(item => ({
          ...item,
          score: Math.round(item.score * platformMultiplier * 10) / 10,
          comparisonScore: Math.round(item.comparisonScore * platformMultiplier * 10) / 10
        }))
      }
    }

    return {
      chartData: baseChartData,
      rankings: baseRankings,
      trendData: generateTrendData(baseChartData)
    }
  }

  // Get filtered data
  const { chartData: currentChartData, rankings: currentRankings, trendData } = getFilteredData()
  const hasData = currentChartData.length > 0 && currentRankings.length > 0
  
  // ✅ Find user's brand from chart data to ensure we display correct metrics
  const userBrandFromChart = currentChartData.find(item => item.isOwner === true)
  const userBrandValue = userBrandFromChart?.score || dashboardData?.metrics?.depthOfMention?.value || 0
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('donut')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  const [activePlatform, setActivePlatform] = useState(currentChartData[0]?.name || '')
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Skeleton loading state
  const [isDataLoading, setIsDataLoading] = useState(false)
  const { showSkeleton, isVisible, setLoading } = useSkeletonLoader({
    threshold: 300,
    debounceDelay: 250
  })

  // Simulate data loading only when analysis changes
  useEffect(() => {
    // Only simulate loading when analysis ID changes, not on filter changes
    if (filterContext?.selectedAnalysisId) {
      setIsDataLoading(true)
      const timer = setTimeout(() => {
        setIsDataLoading(false)
      }, 300) // Reduced loading time for better UX
      
      return () => clearTimeout(timer)
    }
  }, [filterContext?.selectedAnalysisId]) // Only trigger when analysis changes

  useEffect(() => {
    setLoading(isDataLoading)
  }, [isDataLoading, setLoading])

  // Auto-switch chart type based on date selection
  useEffect(() => {
    if (comparisonDate) {
      // Range mode - use line chart for trend view
      setChartType('line')
    } else {
      // Single date mode - use donut chart for brand share view
      setChartType('donut')
    }
  }, [comparisonDate])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const getDateLabel = () => {
    if (!selectedDate) return 'Select Date'
    return formatDate(selectedDate)
  }

  const getComparisonLabel = () => {
    if (!selectedDate || !comparisonDate) return ''
    
    const selectedTime = selectedDate.getTime()
    const comparisonTime = comparisonDate.getTime()
    const oneDay = 1000 * 60 * 60 * 24

    const daysDiff = Math.round(Math.abs((selectedTime - comparisonTime) / oneDay))
    
    if (daysDiff === 1) return 'vs Yesterday'
    if (daysDiff === 7) return 'vs Last Week'
    if (daysDiff === 30) return 'vs Last Month'
    return `vs ${formatDate(comparisonDate)}`
  }

  const showComparison = !!comparisonDate

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={
        <UnifiedCardSkeleton 
          type="mixed" 
          chartType={chartType === 'line' ? 'line' : 'bar'}
          tableColumns={4}
          tableRows={5}
        />
      }
    >
      <div className="w-full">
        {/* Unified Section Container */}
        <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the box */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground">Depth of Mention</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm leading-relaxed">
                        Brands mentioned early in AI answers are more likely to be noticed, trusted, and clicked. A higher Depth of Mention means your brand dominates the narrative sooner.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="body-text text-muted-foreground mt-1">Weight of your brand's mentions based on how early they appear</p>
            </div>

          {/* Calendar Row */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="body-text justify-between w-32">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {getDateLabel()}
                  <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {selectedDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text w-40">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {comparisonDate ? formatDate(comparisonDate) : 'Compare with'}
                        </span>
                      </div>
                      <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={comparisonDate}
                    onSelect={setComparisonDate}
                    initialFocus
                    disabled={(date) => date >= selectedDate}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          </div>

        {/* Empty State */}
        {!hasData && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No depth of mention data available</p>
              <p className="text-sm text-muted-foreground">Data will appear here once metrics are calculated</p>
            </div>
          </div>
        )}

        {/* Container with full-height divider */}
        {hasData && (
        <div className="relative">
          {/* Full-height vertical divider touching top and bottom */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
          
          <div className="grid grid-cols-2 gap-8">
          
          {/* Left Section: Vertical Bar Chart */}
          <div className="space-y-6 relative">
            {/* Chart Config Dropdown - Top Right of Left Split Section */}
            <div className="absolute top-0 right-0 z-50 pointer-events-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="body-text bg-background border-border shadow-md hover:bg-muted"
                    disabled={!!comparisonDate}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Chart Config
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-full">
                  <DropdownMenuItem onClick={() => setChartType('bar')}>
                    Bar Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChartType('donut')}>
                    Donut Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title Display */}
            <div className="space-y-2">
              <h3 className="text-foreground">Depth of Mention</h3>
              <div className="text-xl font-semibold text-foreground">
                {formatToTwoDecimals(userBrandValue)}
              </div>
            </div>

            {/* Contained Chart */}
            <div className="relative h-64 bg-muted/30 rounded-lg p-4">
              {chartType === 'bar' && (
                <>
                  {/* Y-axis labels on the left */}
                  <div className="absolute left-2 top-4 bottom-3 flex flex-col justify-between caption text-muted-foreground">
                    {(() => {
                      const maxValue = Math.max(...currentChartData.map(d => d.score), 1)
                      const step = maxValue / 5
                      return [4, 3, 2, 1, 0].map(i => {
                        const value = Math.round(i * step * 10) / 10
                        return <span key={`y-axis-${i}-${value}`}>{value}</span>
                      })
                    })()}
                  </div>
                  
                  {/* Chart bars area */}
                  <div className="ml-10 h-full flex items-end justify-between relative">
                    {(() => {
                      const maxValue = Math.max(...currentChartData.map(d => d.score), 1)
                      return currentChartData.map((bar) => (
                      <div 
                        key={bar.name} 
                        className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setHoveredBar({
                            name: bar.name,
                            score: bar.score.toString(),
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10
                          })
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Score labels above bars - Only show when comparing */}
                        {showComparison && (
                          <div className="text-center mb-2">
                            <div className="text-sm font-medium text-foreground">{formatToTwoDecimals(bar.score)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatToTwoDecimals(bar.comparisonScore)}
                            </div>
                          </div>
                        )}
                        
                        {/* Bars container */}
                        <div className="flex items-end gap-1">
                          {/* Current period bar */}
                          <div 
                            className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                            style={{
                              height: `${(bar.score / maxValue) * 120}px`,
                              minHeight: '4px',
                              backgroundColor: bar.color
                            }}
                          />

                          {/* Comparison bar - Only show when comparison is enabled */}
                          {showComparison && (
                            <div
                              className="w-4 rounded-t-sm opacity-70 transition-all duration-300 hover:opacity-90 cursor-pointer"
                              style={{
                                height: `${(bar.comparisonScore / maxValue) * 120}px`,
                                minHeight: '2px',
                                backgroundColor: bar.color,
                                filter: 'brightness(0.7)'
                              }}
                            />
                          )}
                        </div>

                        {/* Company name below bars */}
                        <div className="w-16 h-6 flex items-center justify-center">
                          <img 
                            src={getDynamicFaviconUrl((bar as any).url ? { url: (bar as any).url, name: bar.name } : bar.name, 16)} 
                            alt={bar.name}
                            className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                            data-favicon-identifier={(bar as any).url || bar.name}
                            data-favicon-size="16"
                            onError={handleFaviconError}
                          />
                        </div>
                      </div>
                    ))
                    })()}
                  </div>
                </>
              )}

              {chartType === 'donut' && (
                <div className="h-full flex items-center justify-center relative">
                  <div className="w-48 h-48">
                    <PieChart width={192} height={192}>
                      {/* Current period (outer ring) */}
                      <Pie
                        data={currentChartData}
                        dataKey="score"
                        nameKey="name"
                        innerRadius={showComparison ? 55 : 40}
                        outerRadius={80}
                        strokeWidth={2}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                        onMouseEnter={(data, index) => {
                          setActiveIndex(index)
                          setActivePlatform(data.name)
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(-1)
                        }}
                      >
                        {currentChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke={activeIndex === index ? '#fff' : 'none'}
                            strokeWidth={activeIndex === index ? 2 : 0}
                            style={{
                              filter: activeIndex === index ? 'brightness(1.1)' : 'none'
                            }}
                          />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const activeData = currentChartData[activeIndex] || currentChartData[0]
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
                                    className="fill-foreground text-lg font-bold transition-all duration-500 ease-in-out"
                                  >
                                    {formatToTwoDecimals(activeData.score)}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 16}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    {activeData.name}
                                  </tspan>
                                </text>
                              )
                            }
                          }}
                        />
                      </Pie>

                      {/* Comparison period (inner ring) - Only show when comparison is enabled */}
                      {showComparison && (
                        <Pie
                          data={currentChartData}
                          dataKey="comparisonScore"
                          nameKey="name"
                          innerRadius={25}
                          outerRadius={45}
                          strokeWidth={2}
                          animationBegin={200}
                          animationDuration={600}
                          animationEasing="ease-out"
                        >
                          {currentChartData.map((entry, index) => (
                            <Cell key={`comparison-cell-${index}`} fill={entry.color} opacity={0.7} />
                          ))}
                        </Pie>
                      )}
                    </PieChart>
                  </div>
                  
                  {/* Legend */}
                  <div className="ml-4 space-y-1">
                    {currentChartData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setActivePlatform(item.name)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <img
                          src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                          alt={item.name}
                          className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                          data-favicon-identifier={(item as any).url || item.name}
                          data-favicon-size="16"
                          onError={handleFaviconError}
                        />
                        <span className="caption text-foreground">{truncateForChart(item.name)}</span>
                        <span className="caption text-muted-foreground">
                          {showComparison ? (
                            <div className="flex flex-col">
                              <span className="transition-all duration-500 ease-in-out">{formatToTwoDecimals(item.score)}</span>
                              <span className="text-[10px] opacity-70">
                                {formatToTwoDecimals(item.comparisonScore)}
                              </span>
                            </div>
                          ) : (
                            <span className="transition-all duration-500 ease-in-out">{formatToTwoDecimals(item.score)}</span>
                          )}
                        </span>
                      </div>
                    ))}
                    
                  </div>
                </div>
              )}

              {chartType === 'line' && (
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{
                        top: 20,
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 6)}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'hsl(var(--foreground))',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      {currentChartData.map((item: any, index: number) => (
                        <Line
                          key={item.name}
                          dataKey={item.name}
                          type="monotone"
                          stroke={item.color}
                          strokeWidth={index === 0 ? 3 : 2}
                          dot={{ r: index === 0 ? 4 : 3 }}
                          activeDot={{ r: index === 0 ? 6 : 5 }}
                        >
                          {index === 0 && (
                            <LabelList
                              position="top"
                              offset={12}
                              className="fill-foreground"
                              fontSize={12}
                            />
                          )}
                        </Line>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Line Chart Legend */}
                  <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    {currentChartData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setActivePlatform(item.name)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <img
                          src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                          alt={item.name}
                          className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                          data-favicon-identifier={(item as any).url || item.name}
                          data-favicon-size="16"
                          onError={handleFaviconError}
                        />
                        <span className="caption text-foreground">{truncateForChart(item.name)}</span>
                      </div>
                    ))}
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
                      <span className="text-muted-foreground">Current:</span>
                      <span className="text-muted-foreground font-medium">{formatToTwoDecimals(hoveredBar.score)}</span>
                    </div>
                    {showComparison && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{getComparisonLabel()}:</span>
                        <span className="text-muted-foreground/70">
                          {(() => {
                            const platform = currentChartData.find(p => p.name === hoveredBar.name)
                            return platform ? platform.comparisonScore.toString() : '0'
                          })()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pointer */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Ranking Table */}
          <div className="space-y-6 pl-8 relative">
            <div className="space-y-2">
              <h3 className="text-foreground">Depth of Mention Rank</h3>
              <div className="text-xl font-semibold text-foreground">#{currentRankings.find(item => item.isOwner)?.rank || 5}</div>
            </div>

            {/* Simple Table */}
            <div className="space-y-2 pb-8 relative">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="caption text-muted-foreground py-2 px-3">
                      Company
                    </TableHead>
                    <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                      Rank
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRankings.map((item, index) => (
                    <TableRow 
                      key={`ranking-${item.rank}-${index}`} 
                      className="border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <img
                                    src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                                    alt={item.name}
                                    className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                    data-favicon-identifier={(item as any).url || item.name}
                                    data-favicon-size="16"
                                    onError={handleFaviconError}
                                  />
                                  <span 
                                    className="body-text font-medium" 
                                    style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                                  >
                                    {truncateForRanking(item.name)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  <strong>{item.name}</strong><br/>
                                  Depth of Mention: {formatToTwoDecimals(item.score || 0)}%<br/>
                                  Rank: #{item.rank}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="body-text text-foreground">
                            {formatToTwoDecimals(item.score || 0)}%
                          </span>
                          {showComparison && (
                            <Badge 
                              variant="outline" 
                              className={`caption h-4 px-1 flex items-center gap-1 ${
                                item.rankChange > 0 
                                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                                  : item.rankChange < 0
                                  ? 'border-red-500 text-red-500 bg-red-500/10'
                                  : 'border-gray-500 text-gray-500 bg-gray-500/10'
                              }`}
                            >
                              {item.rankChange > 0 ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : item.rankChange < 0 ? (
                                <ArrowDown className="w-3 h-3" />
                              ) : (
                                <span className="w-3 h-3 flex items-center justify-center">—</span>
                              )}
                              <span>{Math.abs(item.rankChange)}</span>
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button - Bottom Right */}
            <div className="absolute bottom-2 right-2">
              <Dialog open={showExpandedRankings} onOpenChange={setShowExpandedRankings}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="body-text bg-background border-border shadow-md hover:bg-muted h-6 px-2"
                  >
                    <Expand className="mr-1 h-3 w-3" />
                    Expand
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">All Depth of Mention Rankings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60">
                          <TableHead className="caption text-muted-foreground py-2 px-3">
                            Company
                          </TableHead>
                          <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                            Rank
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRankings.map((item, index) => (
                          <TableRow 
                            key={`filtered-ranking-${item.rank}-${index}`} 
                            className="border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 cursor-help">
                                        <img
                                          src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                                          alt={item.name}
                                          className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                          data-favicon-identifier={(item as any).url || item.name}
                                          data-favicon-size="16"
                                          onError={handleFaviconError}
                                        />
                                        <span 
                                          className="body-text font-medium" 
                                          style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                                        >
                                          {truncateForRanking(item.name)}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        <strong>{item.name}</strong><br/>
                                        Depth of Mention: {formatToTwoDecimals(item.score || 0)}%<br/>
                                        Rank: #{item.rank}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3 px-3">
                              <div className="flex items-center justify-end gap-2">
                                <span 
                                  className="body-text font-medium" 
                                  style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                                >
                                  {formatToTwoDecimals(item.score || 0)}%
                                </span>
                                {showComparison && (
                                  <Badge 
                                    variant="outline" 
                                    className={`caption h-4 px-1 flex items-center gap-1 ${
                                      item.rankChange > 0 
                                        ? 'border-green-500 text-green-500 bg-green-500/10' 
                                        : item.rankChange < 0
                                        ? 'border-red-500 text-red-500 bg-red-500/10'
                                        : 'border-gray-500 text-gray-500 bg-gray-500/10'
                                    }`}
                                  >
                                    {item.rankChange > 0 ? (
                                      <ArrowUp className="w-3 h-3" />
                                    ) : item.rankChange < 0 ? (
                                      <ArrowDown className="w-3 h-3" />
                                    ) : (
                                      <span className="w-3 h-3 flex items-center justify-center">—</span>
                                    )}
                                    <span>{Math.abs(item.rankChange)}</span>
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        </div>
        )}
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
    </SkeletonWrapper>
  )
}

export { UnifiedDepthOfMentionSection }
