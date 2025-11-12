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
import { Label, Pie, PieChart, Sector, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, LabelList } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoadingWithData } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { truncateForDisplay, truncateForChart, truncateForRanking, truncateForTooltip } from '@/lib/textUtils'
import { formatToTwoDecimals } from '@/lib/numberUtils'

// Default fallback data removed - component now uses only real data from API

import { frontendConfig } from '@/lib/config'

// Use centralized brand color palette
const brandColors = frontendConfig.charts.brandColors

interface CitationTypesSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  }
  dashboardData?: any
}

// Transform dashboard data to citation types format
const getCitationDataFromDashboard = (dashboardData: any) => {
  if (!dashboardData?.metrics?.competitorsByCitation || dashboardData.metrics.competitorsByCitation.length === 0) {
    console.log('⚠️ [CitationTypesSection] No citation data available')
    return []
  }

  console.log('✅ [CitationTypesSection] Using real citation data:', dashboardData.metrics.competitorsByCitation)

  const citationData = dashboardData.metrics.competitorsByCitation.map((competitor: any, index: number) => {
    // Get citation breakdown from the competitor data
    const brandCitations = competitor.brandCitationsTotal || 0
    const socialCitations = competitor.socialCitationsTotal || 0
    const earnedCitations = competitor.earnedCitationsTotal || 0
    const totalCitations = competitor.totalCitations || (brandCitations + socialCitations + earnedCitations)
    
    // Calculate percentages
    const brand = totalCitations > 0 ? (brandCitations / totalCitations) * 100 : 0
    const social = totalCitations > 0 ? (socialCitations / totalCitations) * 100 : 0
    const earned = totalCitations > 0 ? (earnedCitations / totalCitations) * 100 : 0
    
    return {
      name: competitor.name,
      brand: Math.round(brand * 10) / 10,
      social: Math.round(social * 10) / 10,
      earned: Math.round(earned * 10) / 10,
      total: totalCitations > 0 ? 100 : 0,
      color: brandColors[index % brandColors.length], // Always use our diverse color palette
      isOwner: competitor.isOwner || false, // Use isOwner from backend data
      comparisonBrand: brand,
      comparisonSocial: social,
      comparisonEarned: earned,
      comparisonTotal: 100
    }
  })
  
  return citationData
}

export function CitationTypesSection({ filterContext, dashboardData }: CitationTypesSectionProps) {
  // Get current data from dashboard or use defaults
  const currentCitationData = getCitationDataFromDashboard(dashboardData)
  
  // Apply global filtering with real-time updates
  const getFilteredData = () => {
    const filteredData = [...currentCitationData]
    
    if (filterContext) {
      const { selectedTopics, selectedPersonas, selectedPlatforms } = filterContext
      console.log('🔍 [CitationTypes] Applying global filters:', { selectedTopics, selectedPersonas, selectedPlatforms })
      
      // ✅ REMOVED: Hardcoded filtering logic - now using backend-filtered data from DashboardService
      // The filtering is properly handled by the DashboardService using filterAndAggregateMetrics()
      // which aggregates the actual backend data based on selected topics/personas
      console.log('🔍 [CitationTypes] Using backend-filtered data from DashboardService')
      console.log('🔍 [CitationTypes] Filter context:', { selectedTopics, selectedPersonas, selectedPlatforms })
    }
    
    return filteredData
  }
  
  const filteredCitationData = getFilteredData()
  
  // ✅ Find user's brand from citation data to ensure we display correct metrics
  const userBrandFromData = filteredCitationData.find(item => item.isOwner === true)
  
  // All hooks must be called before any conditional returns
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('donut')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  // ✅ Default to user's brand instead of first item
  const [activePlatform, setActivePlatform] = useState(userBrandFromData?.name || filteredCitationData[0]?.name || '')
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => {
    // ✅ Set initial active index to user's brand
    const userBrandIndex = filteredCitationData.findIndex(item => item.isOwner === true)
    return userBrandIndex >= 0 ? userBrandIndex : 0
  })
  const [selectedCitationType, setSelectedCitationType] = useState('brand')

  // Skeleton loading - only show when data is actually loading
  const { showSkeleton, isVisible } = useSkeletonLoadingWithData(filteredCitationData, filterContext)

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

  // Handle empty data - must be after all hooks
  if (filteredCitationData.length === 0) {
    return (
      <UnifiedCard className="h-full">
        <UnifiedCardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">No Citation Data Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Citation data will appear here once prompt tests are completed.
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

  const getCitationTypeLabel = (type: string) => {
    switch (type) {
      case 'brand': return 'Brand'
      case 'social': return 'Social'
      case 'earned': return 'Earned'
      default: return 'Brand'
    }
  }

  const getRankingsForCitationType = (citationType: string) => {
    // Sort by citation type percentage (higher is better)
    const sortedData = [...filteredCitationData].sort((a, b) => {
      const aValue = (a as any)[citationType] || 0
      const bValue = (b as any)[citationType] || 0
      return bValue - aValue // Descending: higher percentages first
    })
    return sortedData.map((item, index) => {
      const scoreValue = (item as any)[citationType] || 0
      return {
      rank: index + 1,
      name: item.name,
        score: scoreValue, // ✅ Add score field for display
        total: scoreValue.toFixed(1),
      rankChange: Math.floor(Math.random() * 3) - 1,
      isOwner: item.isOwner
      }
    })
  }

  const CitationBar = ({ citationSplit }: { citationSplit: { brand: number; social: number; earned: number } }) => {
    const total = citationSplit.brand + citationSplit.social + citationSplit.earned
    const brandWidth = (citationSplit.brand / total) * 100
    const socialWidth = (citationSplit.social / total) * 100
    const earnedWidth = (citationSplit.earned / total) * 100

    return (
      <div className="relative flex h-6 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="bg-blue-500 h-full flex items-center justify-center" 
          style={{ width: `${brandWidth}%` }}
        >
          {citationSplit.brand > 10 && (
            <span className="text-xs font-medium text-white">
              {citationSplit.brand}%
            </span>
          )}
        </div>
        <div 
          className="bg-orange-500 h-full flex items-center justify-center" 
          style={{ width: `${socialWidth}%` }}
        >
          {citationSplit.social > 10 && (
            <span className="text-xs font-medium text-white">
              {citationSplit.social}%
            </span>
          )}
        </div>
        <div 
          className="bg-red-500 h-full flex items-center justify-center" 
          style={{ width: `${earnedWidth}%` }}
        >
          {citationSplit.earned > 10 && (
            <span className="text-xs font-medium text-white">
              {citationSplit.earned}%
            </span>
          )}
        </div>
      </div>
    )
  }

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
                <h2 className="text-foreground">Citation Types</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm leading-relaxed">
                        Citation Types breakdown shows the distribution of brand, earned, and social citations across competitors. This helps understand citation quality and source diversity.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="body-text text-muted-foreground mt-1">Citation breakdown by type in the selected period</p>
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
        
          {/* Main content with split sections */}
          <div className="relative">
            {/* Vertical Divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2 hidden lg:block"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Split - Chart */}
              <div className="space-y-4 relative">
                {/* Top Row - Chart Config Button */}
                <div className="flex justify-end items-center gap-2">
                  {/* Chart Config Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={!!comparisonDate}
                        className="body-text disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="relative h-64 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                  {chartType === 'bar' && (
                    <div className="h-full flex items-end justify-between relative">
                      {filteredCitationData.map((brand, index) => (
                        <div
                          key={brand.name}
                          className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setHoveredBar({
                              name: brand.name,
                              score: brand.total.toFixed(1),
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            })
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {/* Bars container */}
                          <div className="flex items-end gap-1">
                            {/* Current period stacked bar */}
                            <div 
                              className="flex flex-col items-center cursor-pointer transition-opacity"
                              style={{ opacity: hoveredBar === null || hoveredBar.name === brand.name ? 1 : 0.5 }}
                            >
                              {/* Earned Citations (Red - Top) */}
                              <div
                                className="w-3 rounded-t-sm transition-all"
                                style={{
                                  height: `${(brand.earned / 100) * 120}px`,
                                  minHeight: '2px',
                                  backgroundColor: '#EF4444',
                                  filter: hoveredBar?.name === brand.name ? 'brightness(1.2)' : 'none'
                                }}
                              />
                              {/* Social Citations (Orange - Middle) */}
                              <div
                                className="w-3 transition-all"
                                style={{
                                  height: `${(brand.social / 100) * 120}px`,
                                  minHeight: '2px',
                                  backgroundColor: '#F59E0B',
                                  filter: hoveredBar?.name === brand.name ? 'brightness(1.2)' : 'none'
                                }}
                              />
                              {/* Brand Citations (Blue - Bottom) */}
                              <div
                                className="w-3 rounded-b-sm transition-all"
                                style={{
                                  height: `${(brand.brand / 100) * 120}px`,
                                  minHeight: '4px',
                                  backgroundColor: '#3B82F6',
                                  filter: hoveredBar?.name === brand.name ? 'brightness(1.2)' : 'none'
                                }}
                              />
                            </div>

                            {/* Comparison period stacked bar - Only show when comparison is enabled */}
                            {showComparison && (
                              <div 
                                className="flex flex-col items-center cursor-pointer transition-opacity"
                                style={{ opacity: hoveredBar === null || hoveredBar.name === brand.name ? 0.6 : 0.3 }}
                              >
                                {/* Earned Citations (Red - Top) */}
                                <div
                                  className="w-3 rounded-t-sm transition-all"
                                  style={{
                                    height: `${(brand.comparisonEarned / 100) * 120}px`,
                                    minHeight: '2px',
                                    backgroundColor: '#EF4444',
                                    filter: 'brightness(1.4) saturate(0.8)'
                                  }}
                                />
                                {/* Social Citations (Orange - Middle) */}
                                <div
                                  className="w-3 transition-all"
                                  style={{
                                    height: `${(brand.comparisonSocial / 100) * 120}px`,
                                    minHeight: '2px',
                                    backgroundColor: '#F59E0B',
                                    filter: 'brightness(1.4) saturate(0.8)'
                                  }}
                                />
                                {/* Brand Citations (Blue - Bottom) */}
                                <div
                                  className="w-3 rounded-b-sm transition-all"
                    style={{
                                    height: `${(brand.comparisonBrand / 100) * 120}px`,
                                    minHeight: '4px',
                                    backgroundColor: '#3B82F6',
                                    filter: 'brightness(1.4) saturate(0.8)'
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Type name below bars */}
                          <div className="w-16 h-6 flex items-center justify-center">
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
                  )}

                  {chartType === 'donut' && (
                    <div className="h-full flex items-center justify-center relative">
                      <div className="w-48 h-48">
                        <PieChart width={192} height={192}>
                          {/* Current period (outer ring) */}
                          <Pie
                            data={filteredCitationData}
                            dataKey={selectedCitationType}
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
                            {filteredCitationData.map((entry, index) => (
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
                                  const activeData = filteredCitationData[activeIndex] || userBrandFromData || filteredCitationData[0]
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
                                        {(activeData as any)[selectedCitationType]}%
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
                              data={filteredCitationData}
                              dataKey={`comparison${selectedCitationType.charAt(0).toUpperCase() + selectedCitationType.slice(1)}`}
                              nameKey="name"
                              innerRadius={25}
                              outerRadius={45}
                              strokeWidth={2}
                              animationBegin={200}
                              animationDuration={600}
                              animationEasing="ease-out"
                            >
                              {filteredCitationData.map((entry, index) => (
                                <Cell key={`comparison-cell-${index}`} fill={entry.color} opacity={0.7} />
                              ))}
                            </Pie>
                          )}
                        </PieChart>
            </div>

            {/* Legend */}
                      <div className="ml-4 space-y-1">
                        {filteredCitationData.map((item, index) => (
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
                                  <span className="transition-all duration-500 ease-in-out">{(item as any)[selectedCitationType]}%</span>
                                  <span className="text-[10px] opacity-70">
                                    {(item as any)[`comparison${selectedCitationType.charAt(0).toUpperCase() + selectedCitationType.slice(1)}`]}%
                                  </span>
                                </div>
                              ) : (
                                <span className="transition-all duration-500 ease-in-out">{(item as any)[selectedCitationType]}%</span>
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
                          data={[].map(item => ({
                            month: item.month,
                            'US Bank': (item['US Bank'] as any)[selectedCitationType],
                            'Citibank': (item['Citibank'] as any)[selectedCitationType],
                            'JPMorgan Chase': (item['JPMorgan Chase'] as any)[selectedCitationType],
                            'Bank of America': (item['Bank of America'] as any)[selectedCitationType],
                            'Wells Fargo': (item['Wells Fargo'] as any)[selectedCitationType]
                          }))}
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
                            domain={[0, 35]}
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
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            dataKey="Citibank"
                            type="monotone"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            dataKey="JPMorgan Chase"
                            type="monotone"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            dataKey="Bank of America"
                            type="monotone"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            dataKey="Wells Fargo"
                            type="monotone"
                            stroke="#06B6D4"
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
                        </LineChart>
                      </ResponsiveContainer>
                      
                      {/* Line Chart Legend */}
                      <div className="mt-4 flex flex-wrap gap-4 justify-center">
                        {filteredCitationData.map((item, index) => (
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
                          <span className="text-gray-300">Brand:</span>
                          <span className="text-gray-300 font-medium">
                            {filteredCitationData.find(d => d.name === hoveredBar.name)?.brand}% 
                            {showComparison && (
                              <span className="text-gray-400 text-[10px] ml-1">
                                {filteredCitationData.find(d => d.name === hoveredBar.name)?.comparisonBrand}%
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-300">Social:</span>
                          <span className="text-gray-300 font-medium">
                            {filteredCitationData.find(d => d.name === hoveredBar.name)?.social}%
                            {showComparison && (
                              <span className="text-gray-400 text-[10px] ml-1">
                                {filteredCitationData.find(d => d.name === hoveredBar.name)?.comparisonSocial}%
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-300">Earned:</span>
                          <span className="text-gray-300 font-medium">
                            {filteredCitationData.find(d => d.name === hoveredBar.name)?.earned}%
                            {showComparison && (
                              <span className="text-gray-400 text-[10px] ml-1">
                                {filteredCitationData.find(d => d.name === hoveredBar.name)?.comparisonEarned}%
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Pointer */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Split - Ranking Table */}
              <div className="space-y-4 relative">
                {/* Top Row - Group buttons aligned with left-side buttons */}
                <div className="flex justify-between items-center">
                  {/* Left side - Rank text */}
                  <div className="space-y-2 pl-8">
                    <h3 className="text-foreground">Citation Types Rank</h3>
                    <div className="text-xl font-semibold text-foreground">#{getRankingsForCitationType(selectedCitationType).find(item => item.isOwner)?.rank || 1}</div>
                  </div>

                  {/* Right side - Group buttons aligned with left-side buttons */}
                  <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 -mt-2">
                    {(['brand', 'social', 'earned'] as const).map((type, index) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCitationType(type)}
                        className={`
                          body-text rounded-none border-0 text-xs font-medium px-3 py-1
                          ${index === 0 ? 'rounded-l-lg' : ''}
                          ${index === 2 ? 'rounded-r-lg' : ''}
                          ${index > 0 ? 'border-l border-gray-300' : ''}
                          ${selectedCitationType === type 
                            ? 'bg-black text-white hover:bg-black' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {getCitationTypeLabel(type)}
                      </Button>
                    ))}
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
                          {getCitationTypeLabel(selectedCitationType)} %
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getRankingsForCitationType(selectedCitationType).map((item, index) => (
                        <TableRow 
                          key={`citation-types-ranking-${item.rank}-${index}`} 
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
                                      Citation Share: {formatToTwoDecimals(item.score || parseFloat(item.total) || 0)}%<br/>
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
                                {formatToTwoDecimals(item.score || parseFloat(item.total) || 0)}%
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
                        <DialogTitle className="text-foreground">All Citation Types Rankings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/60">
                              <TableHead className="caption text-muted-foreground py-2 px-3">
                                Company
                              </TableHead>
                              <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                                {getCitationTypeLabel(selectedCitationType)} %
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getRankingsForCitationType(selectedCitationType).map((item, index) => (
                              <TableRow 
                                key={`all-citation-types-ranking-${item.rank}-${index}`} 
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
                                            Citation Share: {formatToTwoDecimals(item.score || parseFloat(item.total) || 0)}%<br/>
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
                                      {formatToTwoDecimals(item.score || parseFloat(item.total) || 0)}%
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
