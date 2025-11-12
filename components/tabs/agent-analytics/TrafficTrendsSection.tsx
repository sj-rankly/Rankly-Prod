'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'
import { useState } from 'react'

const dayData = [
  { date: 'Mon', humanVisits: 1200, agentVisits: 500 },
  { date: 'Tue', humanVisits: 1350, agentVisits: 600 },
  { date: 'Wed', humanVisits: 1100, agentVisits: 450 },
  { date: 'Thu', humanVisits: 1450, agentVisits: 700 },
  { date: 'Fri', humanVisits: 1600, agentVisits: 800 },
  { date: 'Sat', humanVisits: 800, agentVisits: 300 },
  { date: 'Sun', humanVisits: 900, agentVisits: 350 },
]

const weekData = [
  { week: 'Week 1', humanVisits: 8400, agentVisits: 3700 },
  { week: 'Week 2', humanVisits: 9200, agentVisits: 4100 },
  { week: 'Week 3', humanVisits: 8800, agentVisits: 3800 },
  { week: 'Week 4', humanVisits: 9500, agentVisits: 4200 },
]

type DataPoint = { date: string; humanVisits: number; agentVisits: number } | { week: string; humanVisits: number; agentVisits: number }

export function TrafficTrendsSection() {
  const [timeView, setTimeView] = useState<'day' | 'week'>('day')
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)

  const currentData = timeView === 'day' ? dayData : weekData
  const maxVisits = Math.max(...currentData.map(d => Math.max(d.humanVisits, d.agentVisits)))

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Traffic Trends</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Traffic patterns over time showing human vs agent visits</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Toggle Buttons */}
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={timeView === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeView('day')}
            className="text-xs"
          >
            Day
          </Button>
          <Button
            variant={timeView === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeView('week')}
            className="text-xs"
          >
            Week
          </Button>
        </div>
      </div>

      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            
            {/* Line Chart */}
            <div className="relative h-64">
              <svg viewBox="0 0 400 200" className="w-full h-full">
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <line
                    key={ratio}
                    x1="40"
                    y1={200 * ratio}
                    x2="380"
                    y2={200 * ratio}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-muted/30"
                  />
                ))}

                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <text
                    key={ratio}
                    x="35"
                    y={200 * ratio + 4}
                    textAnchor="end"
                    className="text-xs fill-muted-foreground"
                  >
                    {Math.round(maxVisits * ratio).toLocaleString()}
                  </text>
                ))}

                {/* X-axis labels */}
                {currentData.map((point, index) => (
                  <text
                    key={index}
                    x={40 + (index * 340) / (currentData.length - 1)}
                    y="195"
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {'date' in point ? point.date : point.week}
                  </text>
                ))}

                {/* Human Traffic Line */}
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={currentData.map((point, index) => 
                    `${40 + (index * 340) / (currentData.length - 1)},${200 - (point.humanVisits / maxVisits) * 160}`
                  ).join(' ')}
                  className="cursor-pointer hover:opacity-80"
                />

                {/* Agent Traffic Line (Dotted) */}
                <polyline
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8,4"
                  points={currentData.map((point, index) => 
                    `${40 + (index * 340) / (currentData.length - 1)},${200 - (point.agentVisits / maxVisits) * 160}`
                  ).join(' ')}
                  className="cursor-pointer hover:opacity-80"
                />

                {/* Data Points */}
                {currentData.map((point, index) => {
                  const x = 40 + (index * 340) / (currentData.length - 1)
                  const humanY = 200 - (point.humanVisits / maxVisits) * 160
                  const agentY = 200 - (point.agentVisits / maxVisits) * 160

                  return (
                    <g key={index}>
                      {/* Human Traffic Point */}
                      <circle
                        cx={x}
                        cy={humanY}
                        r="4"
                        fill="#10B981"
                        className="cursor-pointer hover:r-6 transition-all"
                        onMouseEnter={() => setHoveredPoint(point)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* Agent Traffic Point */}
                      <circle
                        cx={x}
                        cy={agentY}
                        r="4"
                        fill="#8B5CF6"
                        className="cursor-pointer hover:r-6 transition-all"
                        onMouseEnter={() => setHoveredPoint(point)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span className="text-sm text-muted-foreground">Human Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-purple-500 border-dashed border-t-2 border-purple-500"></div>
                <span className="text-sm text-muted-foreground">Agent Traffic</span>
              </div>
            </div>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none">
                <div className="text-white text-sm space-y-1">
                  <div className="font-medium">{'date' in hoveredPoint ? hoveredPoint.date : hoveredPoint.week}</div>
                  <div className="text-green-400">Human: {hoveredPoint.humanVisits.toLocaleString()}</div>
                  <div className="text-purple-400">Agent: {hoveredPoint.agentVisits.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
