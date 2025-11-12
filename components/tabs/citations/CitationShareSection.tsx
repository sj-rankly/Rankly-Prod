'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings, ChevronDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Expand, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label, Pie, PieChart, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, LabelList } from 'recharts'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoadingWithData } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { truncateForChart, truncateForRanking } from '@/lib/textUtils'
import { formatToTwoDecimals } from '@/lib/numberUtils'

// ✅ No more default fallback data - use real data from API

import { frontendConfig } from '@/lib/config'

// Use centralized brand color palette
const brandColors = frontendConfig.charts.brandColors

// Transform dashboard data to citation share format
const getChartDataFromDashboard = (dashboardData: any) => {
  if (!dashboardData?.metrics?.competitorsByCitation || dashboardData.metrics.competitorsByCitation.length === 0) {
    console.log('⚠️ [CitationShareSection] No citation data available')
    return []
  }

  console.log('✅ [CitationShareSection] Using real citation data:', dashboardData.metrics.competitorsByCitation)

  const chartData = dashboardData.metrics.competitorsByCitation.map((competitor: any, index: number) => {
    // ✅ Citation Share data only - removed Citation Types fields (brand, social, earned)
    // Citation Share = (This brand's citations / Total citations of all brands) × 100
    // Citation Types breakdown is handled in CitationTypesSection, not here
    return {
      name: competitor.name,
      score: competitor.score || 0, // Overall citation share from backend
      color: brandColors[index % brandColors.length], // Always use our diverse color palette
      comparisonScore: competitor.score || 0, // For now, use same value for comparison
      isOwner: competitor.isOwner || false // ✅ Store isOwner flag for filtering
    }
  })
  
  return chartData
}


interface CitationShareSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  }
  dashboardData?: any
}

function CitationShareSection({ filterContext, dashboardData }: CitationShareSectionProps) {
  // Get current data from dashboard or use defaults
  const currentChartData = getChartDataFromDashboard(dashboardData)
  
  // Apply filtering based on filter context
  const getFilteredData = () => {
    if (!filterContext) return { chartData: currentChartData, trendData: [] }
    
    const filteredChartData = [...currentChartData]
    let filteredTrendData: any[] = [] // No trend data for now

  // ✅ REMOVED: Hardcoded filtering logic - now using backend-filtered data from DashboardService
  // The filtering is properly handled by the DashboardService using filterAndAggregateMetrics()
  // which aggregates the actual backend data based on selected topics/personas
  console.log('🔍 [CitationShare] Using backend-filtered data from DashboardService')
  console.log('🔍 [CitationShare] Filter context:', { 
    selectedTopics: filterContext?.selectedTopics, 
    selectedPersonas: filterContext?.selectedPersonas, 
    selectedPlatforms: filterContext?.selectedPlatforms 
  })

    // Update trend data with filtered scores (using safe division)
    filteredTrendData = filteredTrendData.map(item => {
      const safeDivide = (index: number) => {
        const filtered = filteredChartData[index]?.score || 0
        const original = currentChartData[index]?.score || 1
        return original > 0 ? filtered / original : 1
      }
      
      return {
        ...item,
        'JPMorgan Chase': Math.round((item['JPMorgan Chase'] || 0) * safeDivide(0) * 10) / 10,
        'Bank of America': Math.round((item['Bank of America'] || 0) * safeDivide(1) * 10) / 10,
        'Wells Fargo': Math.round((item['Wells Fargo'] || 0) * safeDivide(2) * 10) / 10,
        'Citibank': Math.round((item['Citibank'] || 0) * safeDivide(3) * 10) / 10,
        'US Bank': Math.round((item['US Bank'] || 0) * safeDivide(4) * 10) / 10
      }
    })

    return { chartData: filteredChartData, trendData: filteredTrendData }
  }

  const { chartData, trendData: filteredTrendData } = getFilteredData()
  
  // ✅ Find user's brand from chart data to ensure we display correct metrics
  // Pattern matches Visibility tab: try chartData first, then fallback to formatted metric value
  const userBrandFromChart = chartData.find(item => item.isOwner === true)

  // All hooks must be called before any conditional returns
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('donut')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  // ✅ Default to user's brand instead of first item
  const [activePlatform, setActivePlatform] = useState(userBrandFromChart?.name || chartData[0]?.name || '')
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => {
    // ✅ Set initial active index to user's brand
    const userBrandIndex = chartData.findIndex(item => item.isOwner === true)
    return userBrandIndex >= 0 ? userBrandIndex : 0
  })

  // Skeleton loading - only show when data is actually loading
  const { showSkeleton, isVisible } = useSkeletonLoadingWithData(chartData, filterContext)

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

  // Recalculate filtered data only when analysis changes
  useEffect(() => {
    const { chartData: newFilteredChartData } = getFilteredData()
    if (newFilteredChartData[0]?.name !== activePlatform) {
      setActivePlatform(newFilteredChartData[0]?.name || 'JPMorgan Chase')
    }
  }, [filterContext?.selectedAnalysisId]) // Only trigger when analysis changes, not on filter changes

  // Handle empty data state - must be after all hooks
  if (currentChartData.length === 0) {
    return (
      <UnifiedCard className="h-full">
        <UnifiedCardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">No Citation Data Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Citation data will appear here once prompt tests are completed and citations are analyzed.
            </p>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    )
  }

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

  // ✅ Get aggregate citation share value for user's brand
  const getUserBrandValue = () => {
    if (!userBrandFromChart) return dashboardData?.metrics?.citationShare?.value || 0
    return userBrandFromChart.score || 0
  }
  
  const userBrandValue = getUserBrandValue()

  // Get rankings for aggregate citation share (no type filtering)
  const getCitationShareRankings = () => {
    const sortedData = [...chartData].sort((a, b) => (b.score || 0) - (a.score || 0))
    return sortedData.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      score: item.score || 0,
      citationShare: item.score || 0,
      total: (item.score || 0).toString(),
      rankChange: Math.floor(Math.random() * 3) - 1,
      isOwner: item.isOwner
    }))
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
                <h2 className="text-foreground">Citation Share</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm leading-relaxed">
                        Citation Share measures your brand's share of all brand citations in AI responses. Higher citation share indicates stronger brand presence and authority in your category.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="body-text text-muted-foreground mt-1">How often your brand is cited in AI-generated answers</p>
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

        {/* Container with full-height divider */}
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
                    disabled={!!comparisonDate}
                    className="body-text bg-background border-border shadow-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Title and Score Display */}
            <div className="space-y-2">
              <h3 className="text-foreground">Citation Share</h3>
              <div className="flex items-baseline gap-3">
                <div className="metric text-xl font-semibold text-foreground">{userBrandValue}%</div>
                {showComparison && (
                  <Badge variant="outline" className="caption h-5 px-2 border-green-500 text-green-500 bg-green-500/10">
                    +2.3%
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Contained Chart */}
            <div className="relative h-64 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
              {chartType === 'bar' && (
                <>
                  {/* Y-axis labels on the left */}
                  <div className="absolute left-2 top-4 bottom-3 flex flex-col justify-between caption text-muted-foreground">
                    {(() => {
                      // Calculate max value from aggregate citation share
                      const maxValue = Math.max(...chartData.map(d => d.score || 0), 1)
                      const step = maxValue / 5
                      return [4, 3, 2, 1, 0].map(i => (
                        <span key={`y-axis-${i}-${Math.round(i * step * 10) / 10}`}>{Math.round(i * step * 10) / 10}%</span>
                      ))
                    })()}
                  </div>
                  
                  {/* Chart bars area */}
                  <div className="ml-10 h-full flex items-end justify-between relative">
                    {chartData.map((bar) => (
                      <div 
                        key={bar.name} 
                        className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setHoveredBar({
                            name: bar.name,
                            score: `${(bar.score || 0).toFixed(2)}%`,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10
                          })
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Score labels above bars - Only show when comparing */}
                        {showComparison && (
                          <div className="text-center mb-2">
                            <div className="text-sm font-medium text-foreground">{(bar.score || 0).toFixed(2)}%</div>
                            <div className="text-xs text-muted-foreground">
                              {(bar.comparisonScore || 0).toFixed(2)}%
                            </div>
                          </div>
                        )}
                        
                        {/* Bars container */}
                        <div className="flex items-end gap-1">
                          {/* Current period bar */}
                          <div 
                            className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                            style={{
                              height: `${(() => {
                                const maxValue = Math.max(...chartData.map(d => d.score || 0), 1)
                                return ((bar.score || 0) / maxValue) * 120
                              })()}px`,
                              minHeight: '4px',
                              backgroundColor: bar.color
                            }}
                          />

                          {/* Comparison bar - Only show when comparison is enabled */}
                          {showComparison && (
                            <div
                              className="w-4 rounded-t-sm opacity-70 transition-all duration-300 hover:opacity-90 cursor-pointer"
                              style={{
                                height: `${(() => {
                                  const maxValue = Math.max(...chartData.map(d => d.score || 0), 1)
                                  return ((bar.comparisonScore || 0) / maxValue) * 120
                                })()}px`,
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
                    ))}

                  </div>
                </>
              )}

              {chartType === 'donut' && (
                <div className="h-full flex items-center justify-center relative">
                  <div className="w-48 h-48">
                    <PieChart width={192} height={192}>
                      {/* Current period (outer ring) */}
                      <Pie
                        data={chartData}
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
                        {chartData.map((entry, index) => (
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
                              // ✅ Default to user's brand if no active index, not just first item
                              const userBrandData = chartData.find(item => item.isOwner === true)
                              const activeData = chartData[activeIndex] || userBrandData || chartData[0]
                              const displayValue = activeData.score || 0
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
                                    {displayValue.toFixed(2)}%
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
                          data={chartData}
                          dataKey="comparisonScore"
                          nameKey="name"
                          innerRadius={25}
                          outerRadius={45}
                          strokeWidth={2}
                          animationBegin={200}
                          animationDuration={600}
                          animationEasing="ease-out"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`comparison-cell-${index}`} fill={entry.color} opacity={0.7} />
                          ))}
                        </Pie>
                      )}
                    </PieChart>
            </div>
            
                  {/* Legend */}
                  <div className="ml-4 space-y-1">
                    {chartData.map((item, index) => (
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
                              <span className="transition-all duration-500 ease-in-out">
                                {(item.score || 0).toFixed(2)}%
                              </span>
                              <span className="text-[10px] opacity-70">
                                {item.comparisonScore?.toFixed(2) || '0.00'}%
                              </span>
                            </div>
                          ) : (
                            <span className="transition-all duration-500 ease-in-out">
                              {(item.score || 0).toFixed(2)}%
                            </span>
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
                      data={filteredTrendData}
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
                        domain={[20, 65]}
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
                      <Line
                        dataKey="US Bank"
                        type="monotone"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      >
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Line>
                      <Line
                        dataKey="JPMorgan Chase"
                        type="monotone"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        dataKey="Bank of America"
                        type="monotone"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        dataKey="Wells Fargo"
                        type="monotone"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        dataKey="Citibank"
                        type="monotone"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Line Chart Legend */}
                  <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    {chartData.map((item, index) => (
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
                      <span className="text-gray-300">Current:</span>
                      <span className="text-gray-300 font-medium">{hoveredBar.score}</span>
                    </div>
                    {showComparison && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300">{getComparisonLabel()}:</span>
                        <span className="text-gray-400">
                          {(() => {
                            const platform = chartData.find(p => p.name === hoveredBar.name)
                            return platform ? `${platform.comparisonScore}%` : '0%'
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
              <div className="space-y-4 relative">
                {/* Top Row - Rank display */}
                <div className="flex justify-between items-center">
                  {/* Left side - Rank text */}
                  <div className="space-y-2 pl-8">
                    <h3 className="text-foreground">Citation Share Rank</h3>
                    <div className="text-xl font-semibold text-foreground">#{getCitationShareRankings().find(item => item.isOwner)?.rank || 1}</div>
                  </div>
                </div>

                {/* Simple Table */}
                <div className="space-y-2 pb-8 relative pl-8">
                  <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-border/60">
                        <TableHead className="caption text-muted-foreground py-2 px-3 w-auto">
                          Company
                    </TableHead>
                        <TableHead className="text-right caption text-muted-foreground py-2 px-3 w-16">
                      Citation Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {getCitationShareRankings().map((item, index) => (
                        <TableRow 
                          key={`citation-ranking-${item.rank}-${index}`} 
                          className="border-border/60 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="py-3 px-3 w-auto">
                            <div className="flex items-center gap-3">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <img
                                        src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                                        alt={item.name}
                                        className="w-4 h-4 rounded-sm"
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
                                      Citation Share: {formatToTwoDecimals(item.score || item.citationShare || 0)}%<br/>
                                      Rank: #{item.rank}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3 px-3 w-16">
                            <div className="flex items-center justify-end gap-2">
                              <span className="body-text text-foreground">
                                {formatToTwoDecimals(item.score || item.citationShare || 0)}%
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
                        <DialogTitle className="text-foreground">All Citation Share Rankings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/60">
                              <TableHead className="caption text-muted-foreground py-2 px-3">
                                Company
                              </TableHead>
                              <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                                Citation Share
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getCitationShareRankings().map((item, index) => (
                    <TableRow 
                                key={`all-citation-ranking-${item.rank}-${index}`} 
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
                                    className="w-4 h-4 rounded-sm"
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
                                  Citation Share: {formatToTwoDecimals(item.score || item.citationShare || 0)}%<br/>
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
                                      {formatToTwoDecimals(item.score || item.citationShare || 0)}%
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
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
    </SkeletonWrapper>
  )
}

export { CitationShareSection }
