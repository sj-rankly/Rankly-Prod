'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Info, Settings, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const chartData = [
  { name: 'DataFlow', score: 59.4, color: '#3B82F6' },
  { name: 'CloudSync', score: 42.4, color: '#EF4444' },
  { name: 'SmartAI', score: 37.2, color: '#8B5CF6' },
  { name: 'TechCorp', score: 29.5, color: '#06B6D4' },
  { name: 'InnovateTech', score: 24.0, color: '#10B981' },
]

const rankings = [
  { rank: 1, name: 'DataFlow', score: '59.4%', isOwner: false },
  { rank: 2, name: 'CloudSync', score: '42.4%', isOwner: false },
  { rank: 3, name: 'SmartAI', score: '37.2%', isOwner: false },
  { rank: 4, name: 'TechCorp', score: '29.5%', isOwner: false },
  { rank: 5, name: 'InnovateTech', score: '24%', isOwner: true },
]

function VisibilityScoreSection() {
  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Score</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">How often your brand appears in AI-generated answers across selected platforms, topics, and personas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Chart Config Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              <Settings className="mr-2 h-4 w-4" />
              Chart Config
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Bar Chart</DropdownMenuItem>
            <DropdownMenuItem>Line Chart</DropdownMenuItem>
            <DropdownMenuItem>Donut Chart</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <p className="text-sm text-muted-foreground">
        How often your brand appears in AI-generated answers across selected platforms, topics, and personas.
      </p>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
        
        {/* Container with full-height divider */}
        <div className="relative">
          {/* Full-height vertical divider touching top and bottom */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
          
          <div className="grid grid-cols-2 gap-8">
          
          {/* Left Section: Vertical Bar Chart */}
          <div className="space-y-6">
            {/* Title and Score Display */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Visibility Score</h3>
              <div className="text-2xl font-bold text-foreground">24%</div>
            </div>

            {/* Contained Bar Chart */}
            <div className="relative h-48 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
              {/* Y-axis labels on the left */}
              <div className="absolute left-2 top-3 bottom-3 flex flex-col justify-between text-xs text-muted-foreground">
                <span>65.3%</span>
                <span>49%</span>
                <span>32.7%</span>
                <span>16.3%</span>
                <span>0%</span>
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
                        score: `${bar.score}%`,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10
                      })
                    }}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Score label above bar */}
                    <div className="text-xs font-medium text-foreground">
                      {bar.score}%
                    </div>
                    
                    {/* Vertical Bar */}
                    <div 
                      className="w-6 bg-foreground dark:bg-foreground rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{ 
                        height: `${(bar.score / 65.3) * 120}px`,
                        minHeight: '4px'
                      }}
                    />
                    
                    {/* Company name below bar */}
                    <div className="w-6 h-6 flex items-center justify-center">
                      <span className="text-xs font-medium text-foreground truncate">{bar.name}</span>
                    </div>
                  </div>
                ))}

                {/* Hover Card */}
                {hoveredBar && (
                  <div 
                    className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 shadow-lg flex items-center gap-2 pointer-events-none"
                    style={{
                      left: `${hoveredBar.x}px`,
                      top: `${hoveredBar.y}px`,
                      transform: 'translateX(-50%) translateY(-100%)'
                    }}
                  >
                    {/* Company name */}
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {hoveredBar.name.charAt(0)}
                    </div>
                    
                    {/* Brand name and score */}
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{hoveredBar.name}</span>
                      <span className="text-white font-medium text-sm">{hoveredBar.score}</span>
                    </div>
                    
                    {/* Pointer */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section: Ranking Table */}
          <div className="space-y-6 pl-8">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Visibility Score Rank</h3>
              <div className="text-2xl font-bold text-foreground">#6</div>
            </div>

            {/* Simple Table */}
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-medium text-muted-foreground py-2 px-3">
                      Asset
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground py-2 px-3">
                      Visibility Score
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((item) => (
                    <TableRow 
                      key={item.rank} 
                      className="border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-3">
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
                      <TableCell className="text-right py-3 px-3">
                        <span className="text-sm font-medium text-foreground">
                          {item.score}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button */}
            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-6 px-2">
                Expand
              </Button>
            </div>
          </div>
        </div>
        </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { VisibilityScoreSection }
