'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Settings, ChevronDown, ArrowUp, ArrowDown, Expand, Calendar as CalendarIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts'
import { format } from 'date-fns'
import { useAnalytics } from '@/contexts/AnalyticsContext'

// Mock data for Position
const positionData = [
  { 
    name: 'DataFlow', 
    firstRank: 47.4, 
    secondRank: 33.7, 
    thirdRank: 18.9,
    total: 95,
    color: '#3B82F6',
    isOwner: false
  },
  { 
    name: 'CloudSync', 
    firstRank: 43.2, 
    secondRank: 31.8, 
    thirdRank: 25.0,
    total: 88,
    color: '#EF4444',
    isOwner: false
  },
  { 
    name: 'SmartAI', 
    firstRank: 45.7, 
    secondRank: 38.0, 
    thirdRank: 16.3,
    total: 92,
    color: '#8B5CF6',
    isOwner: false
  },
  { 
    name: 'TechCorp', 
    firstRank: 33.3, 
    secondRank: 40.0, 
    thirdRank: 26.7,
    total: 75,
    color: '#06B6D4',
    isOwner: false
  },
  { 
    name: 'InnovateTech', 
    firstRank: 41.2, 
    secondRank: 32.4, 
    thirdRank: 26.4,
    total: 68,
    color: '#10B981',
    isOwner: true
  }
]

const rankings = [
  { rank: 1, name: 'SmartAI', total: '92', rankChange: 1, isOwner: false },
  { rank: 2, name: 'DataFlow', total: '95', rankChange: -1, isOwner: false },
  { rank: 3, name: 'CloudSync', total: '88', rankChange: 0, isOwner: false },
  { rank: 4, name: 'TechCorp', total: '75', rankChange: 1, isOwner: false },
  { rank: 5, name: 'InnovateTech', total: '68', rankChange: -1, isOwner: true }
]

const allRankings = [
  { rank: 1, name: 'SmartAI', total: '92', rankChange: 1, isOwner: false },
  { rank: 2, name: 'DataFlow', total: '95', rankChange: -1, isOwner: false },
  { rank: 3, name: 'CloudSync', total: '88', rankChange: 0, isOwner: false },
  { rank: 4, name: 'TechCorp', total: '75', rankChange: 1, isOwner: false },
  { rank: 5, name: 'InnovateTech', total: '68', rankChange: -1, isOwner: true },
  { rank: 6, name: 'NextGen Solutions', total: '62', rankChange: 0, isOwner: false },
  { rank: 7, name: 'Future Systems', total: '58', rankChange: 1, isOwner: false },
  { rank: 8, name: 'Digital Dynamics', total: '55', rankChange: -1, isOwner: false },
  { rank: 9, name: 'CloudFirst Inc', total: '52', rankChange: 0, isOwner: false },
  { rank: 10, name: 'AI Solutions Pro', total: '48', rankChange: 1, isOwner: false },
  { rank: 11, name: 'TechVision Corp', total: '45', rankChange: -1, isOwner: false },
  { rank: 12, name: 'Digital Edge', total: '42', rankChange: 0, isOwner: false },
  { rank: 13, name: 'NextWave Technologies', total: '38', rankChange: 1, isOwner: false },
  { rank: 14, name: 'Innovation Labs', total: '35', rankChange: -1, isOwner: false },
  { rank: 15, name: 'Quantum Systems', total: '32', rankChange: 0, isOwner: false }
]

const CHART_COLORS = ['#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#84CC16', '#F97316']

export function UnifiedPositionSection() {
  const { data } = useAnalytics()
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar')
  const [selectedRank, setSelectedRank] = useState<'firstRank' | 'secondRank' | 'thirdRank'>('firstRank')
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // Get real data from analytics context
  const visibilityData = data.visibility
  const brandMetrics = visibilityData?.brandMetrics || []
  
  // Transform brand metrics to position data format
  const realPositionData = brandMetrics.slice(0, 5).map((brand, index) => ({
    name: brand.brandName,
    firstRank: brand.count1st || 0,
    secondRank: brand.count2nd || 0,
    thirdRank: brand.count3rd || 0,
    total: (brand.count1st || 0) + (brand.count2nd || 0) + (brand.count3rd || 0),
    color: CHART_COLORS[index % CHART_COLORS.length],
    isOwner: brand.brandName === data.userBrandName
  }))

  // Transform brand metrics to rankings format
  const realRankings = brandMetrics.map((brand, index) => ({
    rank: index + 1,
    name: brand.brandName,
    total: ((brand.count1st || 0) + (brand.count2nd || 0) + (brand.count3rd || 0)).toString(),
    rankChange: 0,
    isOwner: brand.brandName === data.userBrandName
  }))

  // Use real data if available, otherwise fall back to mock data
  const displayPositionData = realPositionData.length > 0 ? realPositionData : positionData
  const displayRankings = realRankings.length > 0 ? realRankings : allRankings

  const getRankLabel = (rank: string) => {
    switch (rank) {
      case 'firstRank': return '1st'
      case 'secondRank': return '2nd'
      case 'thirdRank': return '3rd'
      default: return '1st'
    }
  }

  const getDonutData = () => {
    return displayPositionData.map((item, index) => ({
      name: item.name,
      value: item[selectedRank],
      fill: item.isOwner ? '#2563EB' : CHART_COLORS[index % CHART_COLORS.length]
    }))
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
    <div className="w-full">
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the box */}
          <div className="space-y-4 mb-6">
            <div>
              <h2 className="text-foreground">Position Distribution (1st/2nd/3rd)</h2>
              <p className="body-text text-muted-foreground mt-1">How often your brand appears first, second, or third in answers</p>
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
                    {comparisonDate ? `Compare with ${getDateLabel(comparisonDate)}` : 'Compare with...'}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Split - Chart */}
            <div className="space-y-4 relative">
              {/* Top Row - Chart Config and Rank Selection */}
              <div className="flex justify-end items-center gap-3">
                {/* Rank Selection Buttons - Always visible to explain bar sections */}
                <div className="inline-flex rounded-md overflow-hidden border border-gray-600">
                  {(['firstRank', 'secondRank', 'thirdRank'] as const).map((rank, index) => (
                    <Button
                      key={rank}
                      variant="outline"
                      size="sm"
                      onClick={chartType === 'donut' ? () => setSelectedRank(rank) : undefined}
                      disabled={chartType === 'bar'}
                      style={{
                        backgroundColor: chartType === 'donut' && selectedRank === rank ? '#e5e5e5' : '#262626',
                        color: chartType === 'donut' && selectedRank === rank ? '#171717' : '#d4d4d4',
                        borderLeft: index > 0 ? '1px solid #525252' : 'none'
                      }}
                      className={`
                        body-text rounded-none border-0 text-xs
                        ${index === 0 ? 'rounded-l-md' : ''}
                        ${index === 2 ? 'rounded-r-md' : ''}
                        ${chartType === 'bar' ? 'opacity-60 cursor-default' : 'cursor-pointer hover:brightness-110'}
                      `}
                    >
                      {getRankLabel(rank)}
                    </Button>
                  ))}
                </div>

                {/* Chart Config Dropdown - Top right of left split */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="body-text bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                      <Settings className="mr-2 h-4 w-4" /> Chart Config <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setChartType('bar')}>Bar Chart</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChartType('donut')}>Donut Chart</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

                {/* Chart */}
                <div className="relative h-48 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                  {chartType === 'bar' ? (
                    <div className="h-full flex items-end justify-between relative">
                      {displayPositionData.map((brand, index) => (
                        <div
                          key={brand.name}
                          className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                          onMouseEnter={() => setHoveredBar(index)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {/* Tooltip - Show on hover */}
                          {hoveredBar === index && (
                            <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
                              <div className="font-semibold mb-1">{brand.name}</div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                                  <span>1st: {brand.firstRank.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                                  <span>2nd: {brand.secondRank.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                                  <span>3rd: {brand.thirdRank.toFixed(1)}%</span>
                                </div>
                              </div>
                              {/* Arrow pointing down */}
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                            </div>
                          )}
                          
                          {/* Stacked bar */}
                          <div 
                            className="flex flex-col items-center cursor-pointer transition-opacity"
                            style={{ opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.5 }}
                          >
                            {/* 3rd Rank (Red - Top) */}
                            <div
                              className="w-4 rounded-t-sm transition-all"
                              style={{
                                height: `${(brand.thirdRank / 100) * 120}px`,
                                minHeight: '2px',
                                backgroundColor: '#EF4444',
                                filter: hoveredBar === index ? 'brightness(1.2)' : 'none'
                              }}
                            />
                            {/* 2nd Rank (Orange - Middle) */}
                            <div
                              className="w-4 transition-all"
                              style={{
                                height: `${(brand.secondRank / 100) * 120}px`,
                                minHeight: '2px',
                                backgroundColor: '#F59E0B',
                                filter: hoveredBar === index ? 'brightness(1.2)' : 'none'
                              }}
                            />
                            {/* 1st Rank (Green - Bottom) */}
                            <div
                              className="w-4 rounded-b-sm transition-all"
                              style={{
                                height: `${(brand.firstRank / 100) * 120}px`,
                                minHeight: '4px',
                                backgroundColor: '#10B981',
                                filter: hoveredBar === index ? 'brightness(1.2)' : 'none'
                              }}
                            />
                          </div>
                          
                          {/* X-axis labels */}
                          <div className="w-16 h-6 flex items-center justify-center mt-2">
                            <span className="caption text-foreground text-center">{brand.name}</span>
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
                                      className="fill-foreground text-lg font-bold"
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
                </div>

            </div>

            {/* Right Split - Rankings */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground font-medium">Position Rankings</h3>
                  
                  {/* Rank Selection for Rankings Table */}
                  <div className="inline-flex rounded-md overflow-hidden border border-gray-600">
                    {(['firstRank', 'secondRank', 'thirdRank'] as const).map((rank, index) => (
                      <Button
                        key={rank}
                        variant="outline"
                        size="sm"
                        onClick={chartType === 'donut' ? () => setSelectedRank(rank) : undefined}
                        disabled={chartType === 'bar'}
                        style={{
                          backgroundColor: chartType === 'donut' && selectedRank === rank ? '#e5e5e5' : '#262626',
                          color: chartType === 'donut' && selectedRank === rank ? '#171717' : '#d4d4d4',
                          borderLeft: index > 0 ? '1px solid #525252' : 'none'
                        }}
                        className={`
                          body-text rounded-none border-0 text-xs
                          ${index === 0 ? 'rounded-l-md' : ''}
                          ${index === 2 ? 'rounded-r-md' : ''}
                          ${chartType === 'bar' ? 'opacity-60 cursor-default' : 'cursor-pointer hover:brightness-110'}
                        `}
                      >
                        {getRankLabel(rank)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="relative pb-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">
                          {chartType === 'donut' ? `${getRankLabel(selectedRank)} Position` : 'Total'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRankings.slice(0, 5).map((item) => (
                        <TableRow key={`${item.name}-${item.rank}`}>
                          <TableCell>
                            <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
                              {item.rank}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={item.isOwner ? 'font-bold text-[#2563EB]' : 'text-foreground'}
                            >
                              {item.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={item.isOwner ? 'font-bold text-[#2563EB]' : 'text-foreground'}>
                                {item.total}
                              </span>
                              {showComparison && item.rankChange !== 0 && (
                                <span className="text-xs flex items-center gap-0.5">
                                  {item.rankChange > 0 ? (
                                    <ArrowUp className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 text-red-500" />
                                  )}
                                </span>
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
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Expanded Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Position Rankings</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRankings.map((item) => (
                <TableRow key={item.rank}>
                  <TableCell>
                    <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
                      {item.rank}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={item.isOwner ? 'font-bold text-[#2563EB]' : 'text-foreground'}
                    >
                      {item.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.isOwner ? 'font-bold text-[#2563EB]' : 'text-foreground'}>
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
  )
}
