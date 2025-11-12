'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Settings, ChevronDown, ArrowUp, ArrowDown, Expand, Calendar as CalendarIcon, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Label, LineChart, Line, Tooltip as RechartsTooltip } from 'recharts'
import { format } from 'date-fns'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoadingWithData } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { truncateForDisplay, truncateForChart, truncateForRanking, truncateForTooltip } from '@/lib/textUtils'

// Default fallback data for Sentiment Analysis (only used when no real data is available)
const defaultSentimentData = [
  { 
    name: 'No Data', 
    positive: 0, 
    negative: 0, 
    neutral: 100,
    total: 100,
    color: '#6B7280',
    isOwner: false
  }
]

interface UnifiedSentimentSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  }
  dashboardData?: any
}

// Transform dashboard data to sentiment format with filtering
const getSentimentDataFromDashboard = (dashboardData: any, filterContext?: any) => {
  console.log('🔍 [Sentiment] Dashboard data:', dashboardData?.metrics?.competitors)
  console.log('🔍 [Sentiment] Filter context:', filterContext)
  console.log('🔍 [Sentiment] First competitor sentiment data:', dashboardData?.metrics?.competitors?.[0])
  
  if (!dashboardData?.metrics?.competitors) {
    console.log('⚠️ [Sentiment] No competitor data, using defaults')
    return defaultSentimentData
  }

  const filteredCompetitors = dashboardData.metrics.competitors

  // Apply global filter filtering with real-time updates
  if (filterContext) {
    const { selectedTopics, selectedPersonas, selectedPlatforms } = filterContext
    console.log('🔍 [Sentiment] Applying global filters:', { selectedTopics, selectedPersonas, selectedPlatforms })
    
    // Note: For now, we show real data without artificial multipliers
    // TODO: Implement proper backend filtering based on selected topics/personas/platforms
    // This would require additional API endpoints that filter data at the database level
  }

  const sentimentData = filteredCompetitors.map((competitor: any, index: number) => {
    // Get sentiment breakdown from the competitor data
    const sentimentBreakdown = competitor.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 }
    
    console.log(`🔍 [Sentiment] ${competitor.name} sentiment breakdown:`, sentimentBreakdown)
    
    // Calculate percentages from sentiment breakdown
    const totalSentiment = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative + sentimentBreakdown.mixed
    const positive = totalSentiment > 0 ? (sentimentBreakdown.positive / totalSentiment) * 100 : 0
    const neutral = totalSentiment > 0 ? (sentimentBreakdown.neutral / totalSentiment) * 100 : 0
    const negative = totalSentiment > 0 ? (sentimentBreakdown.negative / totalSentiment) * 100 : 0
    
    console.log(`📊 [Sentiment] ${competitor.name} calculated percentages:`, { positive, neutral, negative, totalSentiment })
    
    return {
      name: competitor.name,
      positive: Math.round(positive * 10) / 10,
      negative: Math.round(negative * 10) / 10,
      neutral: Math.round(neutral * 10) / 10,
      total: 100,
      color: competitor.color || CHART_COLORS[index % CHART_COLORS.length],
      isOwner: competitor.isOwner || false // Use isOwner from backend data
    }
  })
  
  console.log('📊 [Sentiment] Transformed sentiment data:', sentimentData)
  return sentimentData
}

// Generate rankings based on selected sentiment
const getRankingsForSentiment = (sentiment: string, sentimentData: any[]) => {
  const sentimentKey = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'negative' : 'neutral'
  const sortedData = [...sentimentData].sort((a, b) => b[sentimentKey] - a[sentimentKey])
  return sortedData.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    total: item[sentimentKey].toString(),
    rankChange: 0, // TODO: Calculate actual rank change
    isOwner: item.isOwner
  }))
}

const getAllRankingsForSentiment = (sentiment: string, sentimentData: any[]) => {
  // Use actual data sorted by the selected sentiment
  return getRankingsForSentiment(sentiment, sentimentData)
}

// Rankings will be generated dynamically from dashboard data

// Trend data will be generated from historical metrics when available
const getTrendDataFromDashboard = (dashboardData: any) => {
  // For now, return empty array as we don't have historical data yet
  // This would be populated from historical aggregatedmetrics snapshots
  return []
}

const CHART_COLORS = ['#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#84CC16', '#F97316']

interface UnifiedSentimentSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  }
  dashboardData?: any
}

export function UnifiedSentimentSection({ filterContext, dashboardData }: UnifiedSentimentSectionProps) {
  const [chartType, setChartType] = useState<'bar' | 'donut' | 'line'>('bar')
  const [selectedRankingSentiment, setSelectedRankingSentiment] = useState<'positive' | 'negative' | 'neutral'>('positive')
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // Get current data from dashboard or use defaults
  const currentSentimentData = getSentimentDataFromDashboard(dashboardData, filterContext)

  // Skeleton loading - only show when data is actually loading
  const { showSkeleton, isVisible } = useSkeletonLoadingWithData(currentSentimentData, filterContext)

  // Auto-switch chart type based on comparison date
  useEffect(() => {
    if (comparisonDate) {
      setChartType('line')
    } else {
      setChartType('bar')
    }
  }, [comparisonDate])

  // Sync right section with left section when in donut chart mode
  useEffect(() => {
    if (chartType === 'donut') {
      setSelectedRankingSentiment('positive')
    }
  }, [chartType])

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'Positive'
      case 'negative': return 'Negative'
      case 'neutral': return 'Neutral'
      default: return 'Positive'
    }
  }

  const getDonutData = () => {
    // Get sentiment-specific color schemes
    const getSentimentColors = (sentiment: string) => {
      switch (sentiment) {
        case 'positive':
          return ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'] // Green shades (dark to light)
        case 'negative':
          return ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'] // Red shades (dark to light)
        case 'neutral':
          return ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'] // Blue shades (dark to light)
        default:
          return ['#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#10B981']
      }
    }

    // Sort data by value (highest first) to assign appropriate color intensities
    const sortedData = [...currentSentimentData].sort((a, b) => b.positive - a.positive)
    const colors = getSentimentColors('positive')
    
    return currentSentimentData.map((item) => {
      const sortedIndex = sortedData.findIndex(sortedItem => sortedItem.name === item.name)
      return {
        name: item.name,
        value: item.positive,
        fill: colors[sortedIndex] || colors[colors.length - 1]
      }
    })
  }

  const showComparison = !!comparisonDate

  const getDateLabel = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return format(date, 'MMM d, yyyy')
  }

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={
        <UnifiedCardSkeleton 
          type="mixed" 
          chartType={chartType === 'line' ? 'line' : chartType === 'donut' ? 'donut' : 'bar'}
          tableColumns={4}
          tableRows={5}
        />
      }
    >
      <div className="w-full">
        <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the box */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground">Sentiment Analysis</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm leading-relaxed">
                        Sentiment Analysis measures how positively or negatively AI responses reference your brand. Positive sentiment indicates favorable mentions while negative sentiment may signal areas for reputation improvement.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="body-text text-muted-foreground mt-1">How positively AI responses reference your brand across different sentiment categories</p>
            </div>

            {/* Calendar Row - Date and Comparison Selectors */}
            <div className="flex items-center gap-3">
              {/* Primary Date Selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {getDateLabel(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Comparison Date Selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {comparisonDate ? getDateLabel(comparisonDate) : 'Compare with'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={comparisonDate}
                    onSelect={(date) => setComparisonDate(date)}
                    initialFocus
                  />
                  {comparisonDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setComparisonDate(undefined)}
                        className="w-full"
                      >
                        Clear Comparison
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Main content with split sections */}
          <div className="relative">
            {/* Vertical Divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2 hidden lg:block"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Split - Chart */}
            <div className="space-y-4 relative">
              {/* Top Row - Chart Config */}
              <div className="flex justify-end items-center gap-3">
                {/* Chart Config Dropdown - Top right of left split */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="body-text"
                      disabled={!!comparisonDate}
                    >
                      <Settings className="mr-2 h-4 w-4" /> Chart Config <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-full">
                    <DropdownMenuItem onClick={() => setChartType('bar')}>Bar Chart</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChartType('donut')}>Donut Chart</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

                {/* Chart */}
                <div className="relative h-48 bg-muted/30 rounded-lg p-3">
                  {chartType === 'line' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTrendDataFromDashboard(dashboardData)}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          domain={[50, 80]}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip />
                        {currentSentimentData.map((bank, index) => (
                          <Line
                            key={bank.name}
                            type="monotone"
                            dataKey={bank.name}
                            stroke={bank.color}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : chartType === 'bar' ? (
                    <div className="h-full flex items-end justify-between relative">
                      {currentSentimentData.map((brand, index) => (
                        <div
                          key={brand.name}
                          className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                          onMouseEnter={() => setHoveredBar(index)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {/* Tooltip - Show on hover */}
                          {hoveredBar === index && (
                            <div className="absolute bottom-full mb-2 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg z-10 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="text-white font-semibold text-sm">{brand.name}</div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Positive:</span>
                                  <span className="text-muted-foreground font-medium">{brand.positive.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Negative:</span>
                                  <span className="text-muted-foreground font-medium">{brand.negative.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Neutral:</span>
                                  <span className="text-muted-foreground font-medium">{brand.neutral.toFixed(1)}%</span>
                                </div>
                              </div>
                              {/* Arrow pointing down */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                            </div>
                          )}
                          
                          {/* Stacked bar */}
                          <div 
                            className="flex flex-col items-center cursor-pointer transition-opacity"
                            style={{ opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.5 }}
                          >
                            {/* Neutral (Gray - Top) */}
                            {/* Negative (Red - Top) */}
                            <div
                              className="w-4 rounded-t-sm transition-all"
                              style={{
                                height: `${(brand.negative / 100) * 120}px`,
                                minHeight: '2px',
                                backgroundColor: '#EF4444',
                                filter: hoveredBar === index ? 'brightness(1.2)' : 'none'
                              }}
                            />
                            {/* Neutral (Blue - Middle) */}
                            <div
                              className="w-4 transition-all"
                              style={{
                                height: `${(brand.neutral / 100) * 120}px`,
                                minHeight: '2px',
                                backgroundColor: '#3B82F6',
                                filter: hoveredBar === index ? 'brightness(1.2)' : 'none'
                              }}
                            />
                            {/* Positive (Green - Bottom) */}
                            <div
                              className="w-4 rounded-b-sm transition-all"
                              style={{
                                height: `${(brand.positive / 100) * 120}px`,
                                minHeight: '4px',
                                backgroundColor: '#10B981',
                                filter: hoveredBar === index ? 'brightness(1.2)' : 'none'
                              }}
                            />
                          </div>
                          
                          {/* X-axis labels */}
                          <div className="w-16 h-6 flex items-center justify-center mt-2">
                            <img
                              src={getDynamicFaviconUrl((brand as any).url ? { url: (brand as any).url, name: brand.name } : brand.name, 16)}
                              alt={brand.name}
                              className="w-4 h-4 rounded-sm"
                              data-favicon-identifier={(brand as any).url || brand.name}
                              data-favicon-size="16"
                              onError={handleFaviconError}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getDonutData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                          animationEasing="ease-out"
                          onMouseEnter={(data, index) => {
                            setActiveIndex(index)
                          }}
                          onMouseLeave={() => {
                            setActiveIndex(-1)
                          }}
                        >
                          {getDonutData().map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.fill}
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
                                const activeData = getDonutData()[activeIndex] || getDonutData()[0]
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
                                      {activeData.value}
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
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  
                  {/* Donut Chart Legend */}
                  {chartType === 'donut' && (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {currentSentimentData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <img
                            src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                            alt={item.name}
                            className="w-4 h-4 rounded-sm"
                            data-favicon-identifier={(item as any).url || item.name}
                            data-favicon-size="16"
                            onError={handleFaviconError}
                          />
                          <span className="text-sm text-foreground">{truncateForChart(item.name)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Line Chart Legend */}
                  {chartType === 'line' && (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {currentSentimentData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <img
                            src={getDynamicFaviconUrl((item as any).url ? { url: (item as any).url, name: item.name } : item.name, 16)}
                            alt={item.name}
                            className="w-4 h-4 rounded-sm"
                            data-favicon-identifier={(item as any).url || item.name}
                            data-favicon-size="16"
                            onError={handleFaviconError}
                          />
                          <span className="text-sm text-foreground">{truncateForChart(item.name)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

            </div>

            {/* Right Split - Rankings */}
            <div className="space-y-4 relative">
                {/* Top Row - Group buttons aligned with left-side buttons */}
                <div className="flex justify-between items-center">
                  {/* Left side - Rank text */}
                  <div className="space-y-2 pl-8">
                    <h3 className="text-foreground">Sentiment Rankings</h3>
                    <div className="text-xl font-semibold text-foreground">#{getRankingsForSentiment(selectedRankingSentiment, currentSentimentData).find(item => item.isOwner)?.rank || 4}</div>
                  </div>

                  {/* Right side - Group buttons aligned with left-side buttons */}
                  <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 -mt-2">
                    {(['positive', 'negative', 'neutral'] as const).map((sentiment, index) => (
                      <Button
                        key={sentiment}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Independent selection for all chart types
                          setSelectedRankingSentiment(sentiment)
                        }}
                        className={`
                          body-text rounded-none border-0 text-xs font-medium px-3 py-1
                          ${index === 0 ? 'rounded-l-lg' : ''}
                          ${index === 2 ? 'rounded-r-lg' : ''}
                          ${index > 0 ? 'border-l border-gray-300' : ''}
                          ${selectedRankingSentiment === sentiment 
                            ? 'bg-black text-white hover:bg-black' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {getSentimentLabel(sentiment)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Rankings Table */}
                <div className="space-y-2 pb-8 relative pl-8">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-border/60">
                        <TableHead className="caption text-muted-foreground py-2 px-3 w-auto">Company</TableHead>
                        <TableHead className="text-right caption text-muted-foreground py-2 px-3 w-16">
                          {chartType === 'donut' ? `${getSentimentLabel(selectedRankingSentiment)} Score` : 'Total'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getRankingsForSentiment(selectedRankingSentiment, currentSentimentData).map((item, index) => (
                        <TableRow key={`sentiment-ranking-${item.rank}-${index}`} className="border-border/60 hover:bg-muted/30 transition-colors">
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
                                        style={{ color: item.isOwner ? '#2563EB' : 'inherit' }}
                                      >
                                        {truncateForRanking(item.name)}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      <strong>{item.name}</strong><br/>
                                      {getSentimentLabel(selectedRankingSentiment)}: {item.total || 0}<br/>
                                      Rank: #{item.rank}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3 px-3 w-16">
                            <div className="flex items-center justify-end gap-2">
                              <span 
                                className="body-text font-medium"
                                style={{ color: item.isOwner ? '#2563EB' : 'inherit' }}
                              >
                                {item.total}
                              </span>
                              {showComparison && item.rankChange !== 0 && (
                                <Badge
                                  variant="outline"
                                  className={`caption h-4 px-1 flex items-center gap-1 ${
                                    item.rankChange > 0
                                      ? 'border-green-500 text-green-500 bg-green-500/10'
                                      : 'border-red-500 text-red-500 bg-red-500/10'
                                  }`}
                                >
                                  {item.rankChange > 0 ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3" />
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

                  {/* Expand Button */}
                  <div className="absolute bottom-2 right-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExpanded(true)}
                      className="body-text bg-background border-border shadow-md hover:bg-muted h-6 px-2"
                    >
                      <Expand className="mr-1 h-3 w-3" /> Expand
                    </Button>
                  </div>
                </div>
            </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Expanded Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Sentiment Rankings</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">{getSentimentLabel(selectedRankingSentiment)} Score</TableHead>
                <TableHead className="text-center">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getAllRankingsForSentiment(selectedRankingSentiment, currentSentimentData).map((item, index) => (
                <TableRow key={`all-sentiment-ranking-${item.rank}-${index}`}>
                  <TableCell>
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
                              className="text-foreground"
                              style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                            >
                              {truncateForRanking(item.name)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            <strong>{item.name}</strong><br/>
                            {getSentimentLabel(selectedRankingSentiment)}: {item.total || 0}<br/>
                            Rank: #{item.rank}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right">
                    <span 
                      className="text-foreground"
                      style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                    >
                      {item.total}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.rankChange !== 0 && (
                      <span className="text-xs">
                        {item.rankChange > 0 ? (
                          <ArrowUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-500" />
                        )}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
    </SkeletonWrapper>
  )
}
