'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts'
import { ChevronDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Expand } from 'lucide-react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { formatToTwoDecimals, formatWordCount } from '@/lib/numberUtils'

// Mock data for Word Count - Same as Visibility Score for consistency
const chartData = [
  { name: 'DataFlow', score: 59.4, color: '#3B82F6', comparisonScore: 55.2 },
  { name: 'CloudSync', score: 42.4, color: '#EF4444', comparisonScore: 38.7 },
  { name: 'SmartAI', score: 37.2, color: '#8B5CF6', comparisonScore: 35.1 },
  { name: 'TechCorp', score: 29.5, color: '#06B6D4', comparisonScore: 27.8 },
  { name: 'InnovateTech', score: 24.0, color: '#10B981', comparisonScore: 22.3, isOwner: true }
]

const rankings = [
  { rank: 1, name: 'DataFlow', score: '59.4', rankChange: 0, isOwner: false },
  { rank: 2, name: 'CloudSync', score: '42.4', rankChange: 1, isOwner: false },
  { rank: 3, name: 'SmartAI', score: '37.2', rankChange: -1, isOwner: false },
  { rank: 4, name: 'TechCorp', score: '29.5', rankChange: -1, isOwner: false },
  { rank: 5, name: 'InnovateTech', score: '24.0', rankChange: 0, isOwner: true }
]

const allRankings = [
  { rank: 1, name: 'DataFlow', score: '59.4', rankChange: 0, isOwner: false },
  { rank: 2, name: 'CloudSync', score: '42.4', rankChange: 1, isOwner: false },
  { rank: 3, name: 'SmartAI', score: '37.2', rankChange: -1, isOwner: false },
  { rank: 4, name: 'TechCorp', score: '29.5', rankChange: -1, isOwner: false },
  { rank: 5, name: 'InnovateTech', score: '24.0', rankChange: 0, isOwner: true },
  { rank: 6, name: 'NextGen Solutions', score: '18.3', rankChange: 1, isOwner: false },
  { rank: 7, name: 'Future Systems', score: '15.8', rankChange: -1, isOwner: false },
  { rank: 8, name: 'Digital Dynamics', score: '12.5', rankChange: 0, isOwner: false },
  { rank: 9, name: 'CloudFirst Inc', score: '10.9', rankChange: 1, isOwner: false },
  { rank: 10, name: 'AI Solutions Pro', score: '8.2', rankChange: -1, isOwner: false },
  { rank: 11, name: 'TechVision Corp', score: '6.8', rankChange: 0, isOwner: false },
  { rank: 12, name: 'Digital Edge', score: '5.6', rankChange: 1, isOwner: false },
  { rank: 13, name: 'NextWave Technologies', score: '4.9', rankChange: -1, isOwner: false },
  { rank: 14, name: 'Innovation Labs', score: '3.1', rankChange: 0, isOwner: false },
  { rank: 15, name: 'Quantum Systems', score: '2.4', rankChange: 1, isOwner: false }
]

function UnifiedWordCountSection() {
  const { data } = useAnalytics()
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('bar')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  const [activePlatform, setActivePlatform] = useState('')
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

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
  
  // Transform brand metrics to chart data format for word count
  const realChartData = brandMetrics.slice(0, 5).map((brand, index) => ({
    name: brand.brandName,
    score: parseFloat(formatToTwoDecimals(brand.wordCount || 0)),
    color: getColorForBrand(brand.brandName, index),
    comparisonScore: parseFloat(formatToTwoDecimals((brand.wordCount || 0) * 0.9)), // Mock comparison data for now
    isOwner: brand.brandName === data.userBrandName
  }))

  // Transform brand metrics to rankings format
  const realRankings = brandMetrics.map((brand, index) => ({
    rank: brand.wordCountRank || (index + 1),
    name: brand.brandName,
    score: formatWordCount(brand.wordCount || 0),
    rankChange: 0, // Mock data for now
    isOwner: brand.brandName === data.userBrandName
  }))

  // Use real data if available, otherwise fall back to mock data
  const displayChartData = realChartData.length > 0 ? realChartData : chartData
  const baseRankings = realRankings.length > 0 ? realRankings : rankings
  
  // Get display rankings (show top 5 or top 4 + owned brand if not in top 5)
  const getDisplayRankings = () => {
    const ownedBrand = baseRankings.find(item => item.isOwner)
    if (!ownedBrand || baseRankings.slice(0, 5).some(item => item.isOwner)) {
      return baseRankings.slice(0, 5)
    }
    
    const top4 = baseRankings.slice(0, 4)
    return [...top4, ownedBrand]
  }

  const displayRankings = getDisplayRankings()
  
  // Set active platform to first item if not set
  if (!activePlatform && displayChartData.length > 0) {
    setActivePlatform(displayChartData[0].name)
  }

  // Get user's brand score (rank 1 or first brand)
  const userBrand = brandMetrics.find(b => b.wordCountRank === 1) || brandMetrics[0]
  const userBrandScore = userBrand?.wordCount || 0

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    })
  }

  const getDateLabel = () => {
    if (!selectedDate) return 'Select date'
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (selectedDate.toDateString() === today.toDateString()) return 'Today'
    if (selectedDate.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return formatDate(selectedDate)
  }

  const getComparisonLabel = () => {
    if (!comparisonDate) return 'vs Yesterday'
    const daysDiff = Math.floor((selectedDate!.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff === 1) return 'vs Yesterday'
    if (daysDiff === 7) return 'vs Last Week'
    if (daysDiff === 30) return 'vs Last Month'
    return `vs ${formatDate(comparisonDate)}`
  }

  const showComparison = !!comparisonDate

  return (
    <div className="w-full">
      {/* Unified Section Container */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the box */}
          <div className="space-y-4 mb-6">
            <div>
              <h2 className="text-foreground">Word Count</h2>
              <p className="body-text text-muted-foreground mt-1">Share of total answer words attributed to your brand</p>
            </div>

            {/* Calendar Row */}
            <div className="flex items-center gap-2">

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

            {/* Title and Score Display */}
            <div className="space-y-2">
              <h3 className="text-foreground">Word Count</h3>
              <div className="flex items-center gap-3">
                <div className="metric text-2xl text-foreground">{userBrandScore}</div>
                {showComparison && (
                  <Badge variant="outline" className="caption h-5 px-2 border-green-500 text-green-500 bg-green-500/10">
                    +2.3
                  </Badge>
                )}
              </div>
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
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.8}</span>
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.6}</span>
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.4}</span>
                        <span>{Math.max(...displayChartData.map(d => d.score)) * 0.2}</span>
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
                            score: `${bar.score}`,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10
                          })
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Score label above bar */}
                        <div className="caption text-foreground text-center mb-2">
                          {showComparison ? (
                            <div className="space-y-1">
                              <div className="text-foreground">{bar.score}</div>
                              <div className="text-xs text-muted-foreground">{bar.comparisonScore}</div>
                            </div>
                          ) : (
                            <div className="text-foreground">{bar.score}</div>
                          )}
                        </div>
                        
                        {/* Bar container */}
                        <div className="flex items-end gap-1">
                          {/* Current period bar */}
                          <div 
                            className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                            style={{
                              height: `${(bar.score / Math.max(...displayChartData.map(d => d.score))) * 120}px`,
                              minHeight: '4px',
                              backgroundColor: bar.color
                            }}
                          />

                          {/* Comparison bar - Only show when comparison is enabled */}
                          {showComparison && (
                            <div
                              className="w-4 rounded-t-sm opacity-70 transition-all duration-300 hover:opacity-90 cursor-pointer"
                              style={{
                                height: `${(bar.comparisonScore / Math.max(...displayChartData.map(d => d.score))) * 120}px`,
                                minHeight: '2px',
                                backgroundColor: bar.color,
                                filter: 'brightness(0.7)'
                              }}
                            />
                          )}
                        </div>

                        {/* Company name below bars */}
                        <div className="w-16 h-6 flex items-center justify-center mt-2">
                          <span className="caption text-foreground text-center">{bar.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Hover tooltip */}
                  {hoveredBar && chartType === 'bar' && (
                    <div 
                      className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none min-w-[200px]"
                      style={{
                        left: `${hoveredBar.x}px`,
                        top: `${hoveredBar.y}px`,
                        transform: 'translateX(-50%) translateY(-100%)'
                      }}
                    >
                      {/* Company info */}
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{hoveredBar.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: {hoveredBar.score} words
                        </div>
                      </div>
                    </div>
                  )}
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
                              const activeData = chartData[activeIndex] || chartData.find(item => item.isOwner) || chartData[0]
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

                      {/* Comparison period (inner ring) - Only show when comparison is enabled */}
                      {showComparison && (
                        <Pie
                          data={chartData}
                          dataKey="comparisonScore"
                          nameKey="name"
                          innerRadius={25}
                          outerRadius={45}
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
                              key={`comparison-cell-${index}`} 
                              fill={entry.color}
                              stroke={activeIndex === index ? '#fff' : 'none'}
                              strokeWidth={activeIndex === index ? 2 : 0}
                              style={{
                                filter: activeIndex === index ? 'brightness(1.1)' : 'brightness(0.7)'
                              }}
                            />
                          ))}
                        </Pie>
                      )}
                    </PieChart>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Rankings Table */}
          <div className="space-y-6 relative">
            {/* Title */}
            <div>
              <h3 className="text-foreground">Word Count Rank</h3>
            </div>

            {/* Rankings Table */}
            <div className="relative pb-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="body-text text-muted-foreground">Company</TableHead>
                    <TableHead className="body-text text-muted-foreground text-right">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRankings.map((item, index) => (
                    <TableRow key={item.name} className="hover:bg-muted/50">
                      <TableCell>
                        <span 
                          className="body-text"
                          style={{ color: item.isOwner ? '#2563EB' : 'inherit' }}
                        >
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="body-text">#{item.rank}</span>
                          {showComparison && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs h-5 px-1 ${
                                item.rankChange > 0 
                                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                                  : item.rankChange < 0 
                                  ? 'border-red-500 text-red-500 bg-red-500/10'
                                  : 'border-gray-500 text-gray-500 bg-gray-500/10'
                              }`}
                            >
                              {item.rankChange > 0 && <ArrowUp className="h-3 w-3 mr-1" />}
                              {item.rankChange < 0 && <ArrowDown className="h-3 w-3 mr-1" />}
                              {item.rankChange === 0 && <span className="mr-1">—</span>}
                              {item.rankChange !== 0 ? Math.abs(item.rankChange) : ''}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                      <DialogTitle className="text-foreground">All Word Count Rankings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="body-text text-muted-foreground">Company</TableHead>
                            <TableHead className="body-text text-muted-foreground text-right">Rank</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayRankings.map((item, index) => (
                            <TableRow key={item.name} className="hover:bg-muted/50">
                              <TableCell>
                                <span 
                                  className="body-text"
                                  style={{ color: item.isOwner ? '#2563EB' : 'inherit' }}
                                >
                                  {item.name}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="body-text">#{item.rank}</span>
                                  {showComparison && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs h-5 px-1 ${
                                        item.rankChange > 0 
                                          ? 'border-green-500 text-green-500 bg-green-500/10' 
                                          : item.rankChange < 0 
                                          ? 'border-red-500 text-red-500 bg-red-500/10'
                                          : 'border-gray-500 text-gray-500 bg-gray-500/10'
                                      }`}
                                    >
                                      {item.rankChange > 0 && <ArrowUp className="h-3 w-3 mr-1" />}
                                      {item.rankChange < 0 && <ArrowDown className="h-3 w-3 mr-1" />}
                                      {item.rankChange === 0 && <span className="mr-1">—</span>}
                                      {item.rankChange !== 0 ? Math.abs(item.rankChange) : ''}
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
        </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedWordCountSection }
