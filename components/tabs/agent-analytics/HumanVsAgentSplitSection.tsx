'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'

const splitData = {
  humans: 70,
  agents: 30,
  lastWeekHumans: 68,
  lastWeekAgents: 32,
  changeHumans: 2,
  changeAgents: -2
}

export function HumanVsAgentSplitSection() {
  const [hoveredSegment, setHoveredSegment] = useState<'humans' | 'agents' | null>(null)

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">Human vs Agent Split</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Breakdown of human vs bot/crawler traffic</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            
            {/* Donut Chart */}
            <div className="relative w-48 h-48 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                
                {/* Humans Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeDasharray={`${(splitData.humans / 100) * 251.2} 251.2`}
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('humans')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
                
                {/* Agents Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="8"
                  strokeDasharray={`${(splitData.agents / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${(splitData.humans / 100) * 251.2}`}
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('agents')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-foreground">
                  {splitData.humans}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Humans
                </div>
              </div>
            </div>

            {/* Legend and Stats */}
            <div className="space-y-4">
              {/* Humans */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-foreground">Humans</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{splitData.humans}%</span>
                  <div className={`flex items-center gap-1 text-xs ${
                    splitData.changeHumans > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {splitData.changeHumans > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(splitData.changeHumans)}%</span>
                  </div>
                </div>
              </div>

              {/* Agents */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium text-foreground">Agents</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{splitData.agents}%</span>
                  <div className={`flex items-center gap-1 text-xs ${
                    splitData.changeAgents > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {splitData.changeAgents > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(splitData.changeAgents)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Week-over-week change indicator */}
            <div className="pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground text-center">
                Week-over-week change
              </div>
            </div>

            {/* Hover Tooltip */}
            {hoveredSegment && (
              <div className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none"
                   style={{
                     left: '50%',
                     top: '50%',
                     transform: 'translate(-50%, -50%)'
                   }}>
                <div className="text-white text-sm">
                  Last Week: {splitData.lastWeekHumans}% Humans, {splitData.lastWeekAgents}% Agents
                </div>
              </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
