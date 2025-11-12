'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Info, ArrowUp, ArrowDown, Minus, Settings, ChevronDown, Expand, Calendar as CalendarIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Label, Sector } from 'recharts'
import { formatToTwoDecimals, formatPercentage } from '@/lib/numberUtils'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAnalytics } from '@/contexts/AnalyticsContext'

const pieData = [
  { name: 'DataFlow', value: 10.6, color: '#3B82F6' },
  { name: 'CloudSync', value: 10.2, color: '#06B6D4' },
  { name: 'SmartAI', value: 7.5, color: '#8B5CF6' },
  { name: 'TechCorp', value: 5.7, color: '#EF4444' },
  { name: 'InnovateTech', value: 1.9, color: '#10B981' },
  { name: 'Others', value: 64.1, color: '#9CA3AF' },
]

const allRankings = [
  { rank: 1, name: 'DataFlow', score: '10.6%', trend: 'down', change: '-1', isOwned: false },
  { rank: 2, name: 'CloudSync', score: '10.2%', trend: 'up', change: '+1', isOwned: false },
  { rank: 3, name: 'SmartAI', score: '7.5%', trend: 'down', change: '-1', isOwned: false },
  { rank: 4, name: 'TechCorp', score: '5.7%', trend: 'stable', change: '0', isOwned: false },
  { rank: 5, name: 'InnovateTech', score: '4.2%', trend: 'up', change: '+2', isOwned: true },
  { rank: 6, name: 'NextGen Solutions', score: '3.8%', trend: 'stable', change: '0', isOwned: false },
  { rank: 7, name: 'Future Systems', score: '3.5%', trend: 'up', change: '+1', isOwned: false },
  { rank: 8, name: 'Digital Dynamics', score: '3.1%', trend: 'down', change: '-1', isOwned: false },
  { rank: 9, name: 'CloudFirst Inc', score: '2.8%', trend: 'up', change: '+2', isOwned: false },
  { rank: 10, name: 'AI Solutions Pro', score: '1.9%', trend: 'stable', change: '0', isOwned: false },
  { rank: 11, name: 'TechVision Corp', score: '1.6%', trend: 'down', change: '-1', isOwned: false },
  { rank: 12, name: 'Digital Edge', score: '1.4%', trend: 'up', change: '+1', isOwned: false },
  { rank: 13, name: 'NextWave Technologies', score: '1.2%', trend: 'stable', change: '0', isOwned: false },
  { rank: 14, name: 'Innovation Labs', score: '1.0%', trend: 'down', change: '-2', isOwned: false },
  { rank: 15, name: 'Quantum Systems', score: '0.8%', trend: 'up', change: '+1', isOwned: false },
]

// Show top 5 by default, but include owned brand if it's not in top 5
const getDisplayRankings = () => {
  const top5 = allRankings.slice(0, 5)
  const ownedBrand = allRankings.find(item => item.isOwned)
  
  // If owned brand is not in top 5, replace the last item with owned brand
  if (ownedBrand && ownedBrand.rank > 5) {
    return [...top5.slice(0, 4), ownedBrand]
  }
  
  return top5
}

const rankings = getDisplayRankings()

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <ArrowUp className="w-3 h-3 text-green-600" />
    case 'down':
      return <ArrowDown className="w-3 h-3 text-red-600" />
    case 'stable':
      return <Minus className="w-3 h-3 text-gray-500" />
    default:
      return null
  }
}

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'up':
      return 'text-green-600'
    case 'down':
      return 'text-red-600'
    case 'stable':
      return 'text-gray-500'
    default:
      return 'text-gray-500'
  }
}

export function ShareOfVoiceCard() {
  const { data } = useAnalytics()
  const [hoveredSegment, setHoveredSegment] = useState<{ name: string; value: string; color: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('donut')
  const [activePlatform, setActivePlatform] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)

  // Helper function to get consistent colors for brands
  const getColorForBrand = (brandName: string, index: number) => {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#8B5CF6', // purple
      '#06B6D4', // cyan
      '#10B981', // green
      '#F59E0B', // orange
      '#EC4899', // pink
      '#6366F1', // indigo
    ]
    return colors[index % colors.length]
  }

  // Get real data from analytics context
  const visibilityData = data.visibility
  const brandMetrics = visibilityData?.brandMetrics || []
  
  // Transform brand metrics to pie chart data format
  const realPieData = brandMetrics.slice(0, 5).map((brand: any, index: number) => ({
    name: brand.brandName,
    value: parseFloat(formatToTwoDecimals(brand.shareOfVoice || 0)),
    color: getColorForBrand(brand.brandName, index)
  }))

  // Transform brand metrics to rankings format
  const realRankings = brandMetrics.map((brand: any, index: number) => ({
    rank: brand.shareOfVoiceRank || (index + 1),
    name: brand.brandName,
    score: formatPercentage(brand.shareOfVoice || 0),
    trend: 'stable' as const,
    change: '0',
    isOwned: brand.brandName === data.userBrandName
  }))

  // Use real data if available, otherwise fall back to mock data
  const displayPieData = realPieData.length > 0 ? realPieData : pieData
  const displayRankings = realRankings.length > 0 ? realRankings : allRankings
  
  // Set active platform to first item if not set
  if (!activePlatform && displayPieData.length > 0) {
    setActivePlatform(displayPieData[0].name)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const showComparison = comparisonDate !== undefined
  const comparisonLabel = comparisonDate ? formatDate(comparisonDate) : 'Yesterday'

  return (
    <div className="w-full">
      {/* Unified Section Container */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the box */}
          <div className="space-y-4 mb-6">
            <div>
              <h2 className="text-foreground">Share of Voice</h2>
              <p className="body-text text-muted-foreground mt-1">Mentions of your brand in AI-generated answers relative to competitors</p>
        </div>
        
          {/* Calendar Row */}
          <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="body-text w-40">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {selectedDate ? formatDate(selectedDate) : 'Select date'}
                    </span>
                  </div>
                  <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
                </div>
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
          
          {/* Left Section: Chart */}
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
                <DropdownMenuContent align="end">
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
              <h3 className="text-foreground">Share of Voice</h3>
              <div className="metric text-2xl text-foreground">
                {pieData.find(item => item.name === 'InnovateTech')?.value || '1.9'}%
              </div>
            </div>

            {/* Contained Chart */}
            <div className="relative h-48 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
              {chartType === 'bar' && (
                <>
                  {/* Y-axis labels on the left */}
                  <div className="absolute left-2 top-3 bottom-3 flex flex-col justify-between caption text-muted-foreground">
                    <span>10.6%</span>
                    <span>8.0%</span>
                    <span>5.0%</span>
                    <span>2.0%</span>
                    <span>0%</span>
                  </div>
                  
                  {/* Chart bars area */}
                  <div className="ml-10 h-full flex items-end justify-between relative">
                    {pieData.filter(bar => bar.name !== 'Others').map((bar) => (
                      <div 
                        key={bar.name} 
                        className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredSegment({
                            name: bar.name,
                            value: `${bar.value}%`,
                            color: bar.color,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10
                      })
                    }}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                        {/* Score label above bar */}
                        <div className="caption text-foreground text-center">
                          {bar.value}%
                        </div>
                        
                        {/* Vertical Bar */}
                        <div 
                          className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                          style={{ 
                            height: `${(bar.value / 10.6) * 120}px`,
                            minHeight: '4px',
                            backgroundColor: bar.color
                          }}
                        />
                        
                        {/* Company name below bars */}
                        <div className="w-16 h-6 flex items-center justify-center">
                          <span className="caption text-foreground text-center">{bar.name}</span>
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
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={2}
                        onMouseEnter={(data, index) => {
                          setActiveIndex(index)
                          setActivePlatform(data.name)
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(-1)
                        }}
                      >
                        {displayPieData.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke={activeIndex === index ? entry.color : 'transparent'}
                            strokeWidth={activeIndex === index ? 3 : 0}
                            style={{
                              filter: activeIndex === index ? 'brightness(1.2)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const activeData = pieData.find(item => item.name === activePlatform) || pieData[pieData.length - 1] // Default to Fibr
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
                                    {activeData.value}%
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
                  </div>
                  
                  {/* Legend */}
                  <div className="ml-4 space-y-1">
                    {displayPieData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className={`flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                          activePlatform === item.name ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                        }`}
                        onClick={() => {
                          setActivePlatform(item.name)
                          setActiveIndex(index)
                        }}
                        onMouseEnter={() => {
                          setActivePlatform(item.name)
                          setActiveIndex(index)
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(-1)
                        }}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full transition-transform duration-200 ${
                            activePlatform === item.name ? 'scale-125' : 'scale-100'
                          }`}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={`caption transition-colors duration-200 ${
                          activePlatform === item.name ? 'text-foreground font-medium' : 'text-foreground'
                        }`}>
                          {item.name}
                        </span>
                        <span className={`caption transition-colors duration-200 ${
                          activePlatform === item.name ? 'text-muted-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {item.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hover Card */}
              {hoveredSegment && chartType === 'bar' && (
                <div 
                  className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none min-w-[200px]"
                  style={{
                    left: `${hoveredSegment.x}px`,
                    top: `${hoveredSegment.y}px`,
                    transform: 'translateX(-50%) translateY(-100%)'
                  }}
                >
                  <div className="space-y-1">
                    <div className="text-white font-semibold text-sm">{hoveredSegment.name}</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Share:</span>
                      <span className="text-white font-medium">{hoveredSegment.value}</span>
                    </div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Ranking Table */}
          <div className="space-y-6 pl-8 relative">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Share of Voice Rank</h3>
              <div className="text-2xl font-bold text-foreground">#{allRankings.find(item => item.isOwned)?.rank || 10}</div>
            </div>

            {/* Standardized Table */}
            <div className="space-y-2 pb-8 relative">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-medium text-muted-foreground py-3 px-3">
                      Asset
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground py-3 px-3">
                      Share of Voice
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRankings.slice(0, 5).map((item, index) => (
                    <TableRow
                      key={`${item.name}-${item.rank}`}
                      className={`
                        border-border/60 hover:bg-muted/30 transition-colors
                        ${index !== displayRankings.slice(0, 5).length - 1 ? 'border-b border-solid border-border/30' : ''}
                      `}
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {item.rank}.
                          </span>
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-sm font-medium" 
                              style={{color: item.isOwned ? '#2563EB' : 'inherit'}}
                            >
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium text-foreground">#{item.rank}</span>
                          <div className={`flex items-center gap-1 ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}
                            <span className="text-xs">{item.change}</span>
                          </div>
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
                    <DialogTitle className="text-foreground">All Share of Voice Rankings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60">
                          <TableHead className="text-xs font-medium text-muted-foreground py-3 px-3">
                            Asset
                          </TableHead>
                          <TableHead className="text-right text-xs font-medium text-muted-foreground py-3 px-3">
                            Share of Voice
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayRankings.map((item, index) => (
                          <TableRow 
                            key={item.rank} 
                            className={`
                              border-border/60 hover:bg-muted/30 transition-colors
                              ${index !== displayRankings.length - 1 ? 'border-b border-solid border-border/30' : ''}
                            `}
                          >
                            <TableCell className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground w-6">
                                  {item.rank}.
                                </span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="text-sm font-medium font-semibold" 
                                    style={{color: item.isOwned ? '#2563EB' : 'inherit'}}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3 px-3">
                              <div className="flex items-center justify-end gap-2">
                                <span 
                                  className="text-sm font-medium font-semibold" 
                                  style={{color: item.isOwned ? '#2563EB' : 'inherit'}}
                                >#{item.rank}</span>
                                <div className={`flex items-center gap-1 ${getTrendColor(item.trend)}`}>
                                  {getTrendIcon(item.trend)}
                                  <span className="text-xs">{item.change}</span>
                                </div>
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
  )
}
