import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Info, Settings, ChevronDown, Expand, Calendar as CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Label, Pie, PieChart, Sector, Cell } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { formatToTwoDecimals } from '@/lib/numberUtils'

// Mock data for Average Position
const chartData = [
  { name: 'DataFlow', score: 1.7, color: '#3B82F6' },
  { name: 'CloudSync', score: 1.8, color: '#10B981' },
  { name: 'SmartAI', score: 2.0, color: '#8B5CF6' },
  { name: 'TechCorp', score: 2.0, color: '#EF4444' },
  { name: 'InnovateTech', score: 2.1, color: '#06B6D4' },
]

const allRankings = [
  { rank: 1, name: 'DataFlow', score: '1.7', isOwner: false },
  { rank: 2, name: 'CloudSync', score: '1.8', isOwner: false },
  { rank: 3, name: 'SmartAI', score: '2.0', isOwner: false },
  { rank: 4, name: 'TechCorp', score: '2.1', isOwner: false },
  { rank: 5, name: 'InnovateTech', score: '2.2', isOwner: true },
  { rank: 6, name: 'NextGen Solutions', score: '2.3', isOwner: false },
  { rank: 7, name: 'Future Systems', score: '2.4', isOwner: false },
  { rank: 8, name: 'Digital Dynamics', score: '2.5', isOwner: false },
  { rank: 9, name: 'CloudFirst Inc', score: '2.6', isOwner: false },
  { rank: 10, name: 'AI Solutions Pro', score: '2.7', isOwner: false },
  { rank: 11, name: 'TechVision Corp', score: '2.8', isOwner: false },
  { rank: 12, name: 'Digital Edge', score: '2.9', isOwner: false },
  { rank: 13, name: 'NextWave Technologies', score: '3.0', isOwner: false },
  { rank: 14, name: 'Innovation Labs', score: '3.1', isOwner: false },
  { rank: 15, name: 'Quantum Systems', score: '3.2', isOwner: false },
]

// Show top 5 by default, but include owned brand if it's not in top 5
const getDisplayRankings = () => {
  const top5 = allRankings.slice(0, 5)
  const ownedBrand = allRankings.find(item => item.isOwner)
  
  // If owned brand is not in top 5, replace the last item with owned brand
  if (ownedBrand && ownedBrand.rank > 5) {
    return [...top5.slice(0, 4), ownedBrand]
  }
  
  return top5
}

const rankings = getDisplayRankings()

function UnifiedAveragePositionSection() {
  const { data } = useAnalytics()
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('bar')
  const [activePlatform, setActivePlatform] = useState('')
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
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
  
  // Transform brand metrics to chart data format for average position
  const realChartData = brandMetrics.slice(0, 5).map((brand, index) => ({
    name: brand.brandName,
    score: parseFloat(formatToTwoDecimals(brand.avgPosition || 0)),
    color: getColorForBrand(brand.brandName, index)
  }))

  // Transform brand metrics to rankings format
  const realRankings = brandMetrics.map((brand, index) => ({
    rank: brand.avgPositionRank || (index + 1),
    name: brand.brandName,
    score: formatToTwoDecimals(brand.avgPosition || 0),
    isOwner: brand.brandName === data.userBrandName
  }))

  // Use real data if available, otherwise fall back to mock data
  const displayChartData = realChartData.length > 0 ? realChartData : chartData
  const displayRankings = realRankings.length > 0 ? realRankings : rankings
  
  // Set active platform to first item if not set
  if (!activePlatform && displayChartData.length > 0) {
    setActivePlatform(displayChartData[0].name)
  }

  // Get user's brand score (rank 1 or first brand)
  const userBrand = brandMetrics.find(b => b.avgPositionRank === 1) || brandMetrics[0]
  const userBrandScore = userBrand?.avgPosition || 0

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
              <h2 className="text-foreground">Average Position</h2>
              <p className="body-text text-muted-foreground mt-1">The typical order where your brand appears in answers</p>
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
              <h3 className="text-foreground">Average Position</h3>
              <div className="metric text-2xl text-foreground">{userBrandScore}</div>
            </div>

            {/* Contained Chart */}
            <div className="relative h-48 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
              {chartType === 'bar' && (
                <>
                  {/* Y-axis labels on the left */}
                  <div className="absolute left-2 top-3 bottom-3 flex flex-col justify-between caption text-muted-foreground">
                    {displayChartData.length > 0 && (
                      <>
                        <span>{Math.max(...displayChartData.map(d => d.score))}</span>
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.75}</span>
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.5}</span>
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.25}</span>
                        <span>0</span>
                      </>
                    )}
                  </div>
              
              {/* Chart bars area */}
              <div className="ml-10 h-full flex items-end justify-between relative">
                {displayChartData.map((bar) => (
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
                        {/* Score label above bar */}
                        <div className="caption text-foreground text-center">
                          {bar.score}
                        </div>
                        
                        {/* Vertical Bar */}
                        <div 
                          className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                          style={{ 
                            height: `${(bar.score / Math.max(...displayChartData.map(d => d.score))) * 120}px`,
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
                        data={chartData}
                        dataKey="score"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={80}
                        strokeWidth={2}
                        onMouseEnter={(data, index) => {
                          setActiveIndex(index)
                          setActivePlatform(data.name)
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(-1)
                        }}
                      >
                        {displayChartData.map((entry, index) => (
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
                              const activeData = chartData[activeIndex] || chartData[0]
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
                                    {activeData.score}
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
                    {displayChartData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setActivePlatform(item.name)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="caption text-foreground">{item.name}</span>
                        <span className="caption text-muted-foreground">
                          {item.score}
                        </span>
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
                  <div className="space-y-1">
                    <div className="text-white font-semibold text-sm">{hoveredBar.name}</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Score:</span>
                      <span className="text-white font-medium">{hoveredBar.score}</span>
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
              <h3 className="text-lg font-semibold text-foreground">Average Position Rank</h3>
              <div className="text-2xl font-bold text-foreground">#{allRankings.find(item => item.isOwner)?.rank || 10}</div>
            </div>

            {/* Simple Table */}
            <div className="space-y-2 pb-8 relative">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-medium text-muted-foreground py-3 px-0">
                      Asset
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground py-3 px-0">
                      Average Position
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
                      <TableCell className="py-3 px-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {item.rank}.
                          </span>
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-sm font-medium" 
                              style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                            >
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-0">
                        <span className="text-sm font-medium text-foreground">
                          {item.score}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button - Bottom Right */}
            <div className="absolute bottom-2 right-0">
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
                    <DialogTitle className="text-foreground">All Average Position Rankings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60">
                          <TableHead className="text-xs font-medium text-muted-foreground py-3 px-0">
                            Asset
                          </TableHead>
                          <TableHead className="text-right text-xs font-medium text-muted-foreground py-3 px-0">
                            Average Position
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
                            <TableCell className="py-3 px-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground w-6">
                                  {item.rank}.
                                </span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="text-sm font-medium font-semibold" 
                                    style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3 px-0">
                              <span 
                                className="text-sm font-medium font-semibold" 
                                style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                              >
                                {item.score}
                              </span>
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

export { UnifiedAveragePositionSection }
