'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
// Chart components not available, using Recharts directly
import { Info, TrendingUp, Settings, ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Cell, Label, Pie, PieChart, Sector } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'

// Mock data for platform traffic
const platformData = [
  { platform: 'ChatGPT', percentage: 35, visits: 1250, fill: '#3B82F6', comparisonVisits: 1100 },
  { platform: 'Perplexity', percentage: 28, visits: 980, fill: '#EF4444', comparisonVisits: 850 },
  { platform: 'Gemini', percentage: 20, visits: 720, fill: '#8B5CF6', comparisonVisits: 650 },
  { platform: 'Claude', percentage: 17, visits: 610, fill: '#10B981', comparisonVisits: 580 },
]

// Chart config not needed for direct Recharts usage

const rankings = [
  { rank: 1, platform: 'ChatGPT', percentage: '35%', visits: '1,250', isTop: true },
  { rank: 2, platform: 'Perplexity', percentage: '28%', visits: '980', isTop: false },
  { rank: 3, platform: 'Gemini', percentage: '20%', visits: '720', isTop: false },
  { rank: 4, platform: 'Claude', percentage: '17%', visits: '610', isTop: false },
]

interface PlatformTrafficCardProps {
  title: string
  description: string
  totalVisits: number
  growthPercentage: number
  selectedPlatforms: {
    all: boolean
    chatgpt: boolean
    perplexity: boolean
    gemini: boolean
    claude: boolean
  }
  selectedDate?: Date
  comparisonDate?: Date
  comparisonLabel: string
  showComparison: boolean
}

export function PlatformTrafficCard({ 
  title, 
  description, 
  totalVisits, 
  growthPercentage,
  selectedPlatforms,
  selectedDate,
  comparisonDate,
  comparisonLabel,
  showComparison
}: PlatformTrafficCardProps) {
  const [hoveredBar, setHoveredBar] = useState<{ platform: string; percentage: number; visits: number; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('donut')
  const [activePlatform, setActivePlatform] = useState(platformData[0].platform)
  const [activeIndex, setActiveIndex] = useState(0)
  const id = "platform-traffic-chart"

  // Filter data based on selected platforms
  const filteredData = platformData.filter(item => {
    if (selectedPlatforms.all) return true
    const platformKey = item.platform.toLowerCase().replace(' ', '') as keyof typeof selectedPlatforms
    return selectedPlatforms[platformKey] || false
  })

  const filteredRankings = rankings.filter(item => {
    if (selectedPlatforms.all) return true
    const platformKey = item.platform.toLowerCase().replace(' ', '') as keyof typeof selectedPlatforms
    return selectedPlatforms[platformKey] || false
  })


  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground">{title}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="body-text">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="text-right">
          <div className="metric text-2xl text-foreground">{totalVisits.toLocaleString()}</div>
          <div className="body-text text-green-600 flex items-center">
            <TrendingUp className="mr-1 h-3 w-3" />
            +{growthPercentage}% vs last week
          </div>
        </div>
      </div>

      {/* Main Content Box */}
      <Card className="w-full border-0 shadow-none bg-transparent">
        <CardContent className="p-4">
        
        {/* Container with full-height divider */}
        <div className="relative">
          {/* Full-height vertical divider touching top and bottom */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
          
          <div className="grid grid-cols-2 gap-8">
          
          {/* Left Section: Platform Traffic Bars */}
          <div className="space-y-6">
            {/* Title and Chart Config */}
            <div className="flex items-center justify-between">
                     <div className="space-y-2">
                       <h3 className="text-foreground">Platform Traffic</h3>
                       <div className="metric text-2xl text-foreground">{totalVisits.toLocaleString()}</div>
                     </div>
              
              {/* Chart Config Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text">
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

            {/* Platform Chart - Dynamic based on chart type */}
            <div className="relative h-48 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                      {chartType === 'bar' && (
                        <>
                          {/* Y-axis labels on the left */}
                          <div className="absolute left-2 top-3 bottom-3 flex flex-col justify-between text-xs text-muted-foreground">
                            <span>35%</span>
                            <span>28%</span>
                            <span>20%</span>
                            <span>17%</span>
                            <span>0%</span>
                          </div>

                          {/* Chart bars area */}
                          <div className="ml-10 h-full flex items-end justify-between relative">
                            {filteredData.map((bar) => (
                              <div
                                key={bar.platform}
                                className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setHoveredBar({
                                    platform: bar.platform,
                                    percentage: bar.percentage,
                                    visits: bar.visits,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                  })
                                }}
                                onMouseLeave={() => setHoveredBar(null)}
                              >
                                {/* Percentage label above bars */}
                                <div className="caption text-foreground text-center">
                                  {showComparison ? (
                                    <div className="space-y-1">
                                      <div className="text-foreground">{bar.percentage}%</div>
                                      <div className="text-muted-foreground text-[10px]">
                                        {Math.round((bar.comparisonVisits / 1250) * 100)}%
                                      </div>
                                    </div>
                                  ) : (
                                    bar.percentage + '%'
                                  )}
                                </div>

                                {/* Bars container */}
                                <div className="flex items-end gap-1">
                                  {/* Current period bar */}
                                  <div
                                    className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                                    style={{
                                      height: `${(bar.percentage / 35) * 120}px`,
                                      minHeight: '4px',
                                      backgroundColor: bar.fill
                                    }}
                                  />

                                  {/* Comparison bar - Only show when comparison is enabled */}
                                  {showComparison && (
                                    <div
                                      className="w-4 rounded-t-sm opacity-70 transition-all duration-300 hover:opacity-90 cursor-pointer"
                                      style={{
                                        height: `${(bar.comparisonVisits / 1250) * (bar.percentage / 35) * 120}px`,
                                        minHeight: '2px',
                                        backgroundColor: bar.fill,
                                        filter: 'brightness(0.7)'
                                      }}
                                    />
                                  )}
                                </div>

                                {/* Platform name below bars */}
                                <div className="w-16 h-6 flex items-center justify-center">
                                  <span className="caption text-foreground text-center">{bar.platform}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Legend for comparison - Only show when comparison is enabled */}
                          {showComparison && (
                            <div className="absolute bottom-2 left-10 flex items-center gap-4 caption">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-2 bg-gray-400 rounded"></div>
                                <span className="text-muted-foreground">{comparisonLabel}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-2 bg-gray-600 rounded"></div>
                                <span className="text-muted-foreground">Current Period</span>
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
                        data={filteredData}
                        dataKey="visits"
                        nameKey="platform"
                        innerRadius={showComparison ? 55 : 40}
                        outerRadius={80}
                        strokeWidth={2}
                        onMouseEnter={(data, index) => {
                          setActiveIndex(index)
                          setActivePlatform(data.platform)
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(-1)
                        }}
                      >
                        {filteredData.map((entry, index) => (
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
                              const activeData = filteredData[activeIndex] || filteredData[0]
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
                                    {activeData.visits.toLocaleString()}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 16}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    {activeData.platform}
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
                          data={filteredData}
                          dataKey="comparisonVisits"
                          nameKey="platform"
                          innerRadius={25}
                          outerRadius={45}
                          strokeWidth={2}
                          activeShape={({
                            outerRadius = 0,
                            ...props
                          }: PieSectorDataItem) => (
                            <Sector {...props} outerRadius={outerRadius + 5} />
                          )}
                        >
                          {filteredData.map((entry, index) => (
                            <Cell key={`cell-comparison-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      )}
                    </PieChart>
                  </div>
                  
                  {/* Legend */}
                  <div className="ml-4 space-y-1">
                    {filteredData.map((item, index) => (
                      <div 
                        key={item.platform} 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setActivePlatform(item.platform)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="caption text-foreground">{item.platform}</span>
                        <span className="caption text-muted-foreground">
                          {showComparison ? (
                            <div className="flex flex-col">
                              <span>{item.percentage}%</span>
                              <span className="text-[10px] opacity-70">
                                {Math.round((item.comparisonVisits / 1250) * 100)}%
                              </span>
                            </div>
                          ) : (
                            item.percentage + '%'
                          )}
                        </span>
                      </div>
                    ))}
                    
                    {/* Ring legend for donut chart comparison */}
                    {showComparison && (
                      <div className="mt-3 pt-2 border-t border-border/30 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-gray-400 rounded-full"></div>
                                <span className="caption text-muted-foreground">Outer Ring - Current</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 border-2 border-gray-400 rounded-full"></div>
                                <span className="caption text-muted-foreground">Inner Ring - {comparisonLabel}</span>
                              </div>
                      </div>
                    )}
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
                    <div className="text-white font-semibold text-sm">{hoveredBar.platform}</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Current:</span>
                      <span className="text-white font-medium">{hoveredBar.visits.toLocaleString()} ({hoveredBar.percentage}%)</span>
                    </div>
                    {showComparison && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300">{comparisonLabel}:</span>
                        <span className="text-gray-400">
                          {(() => {
                            const platform = filteredData.find(p => p.platform === hoveredBar.platform)
                            return platform ? platform.comparisonVisits.toLocaleString() : '0'
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

          {/* Right Section: Platform Rankings */}
          <div className="space-y-6 pl-8">
            <div className="space-y-2">
              <h3 className="text-foreground">Platform Rank</h3>
              <div className="metric text-2xl text-foreground">#1</div>
            </div>

            {/* Rankings Table */}
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="caption text-muted-foreground py-2 px-3">
                      Platform
                    </TableHead>
                    <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                      Traffic
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRankings.map((item) => (
                    <TableRow 
                      key={item.rank} 
                      className="border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-3">
                                   <span className="body-text text-muted-foreground w-6">
                                     {item.rank}.
                                   </span>
                          <div className="flex items-center gap-2">
                            <span className={`body-text ${item.isTop ? 'text-primary' : 'text-foreground'}`}>
                              {item.platform}
                            </span>
                            {item.isTop && (
                              <Badge variant="outline" className="caption h-5 px-2 border-primary text-primary bg-primary/10">
                                Top
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-3">
                        <div className="text-right">
                          <div className="body-text text-foreground">
                            {item.percentage}
                          </div>
                          <div className="caption text-muted-foreground">
                            {item.visits}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button */}
            <div className="flex justify-end pt-2">
              <button className="body-text text-muted-foreground hover:text-foreground transition-colors text-xs">
                Expand
              </button>
            </div>
          </div>
        </div>
        </div>
        </CardContent>
      </Card>
    </div>
  )
}
