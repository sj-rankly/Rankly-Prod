'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { useState } from 'react'

const agentTrafficData = [
  { platform: 'ChatGPT', percentage: 35, visits: 8750, color: '#3B82F6' },
  { platform: 'Perplexity', percentage: 30, visits: 7500, color: '#10B981' },
  { platform: 'Gemini', percentage: 22, visits: 5500, color: '#F59E0B' },
  { platform: 'Claude', percentage: 13, visits: 3250, color: '#8B5CF6' },
]

export function AgentTrafficSection() {
  const [hoveredPlatform, setHoveredPlatform] = useState<{ platform: string; percentage: number; visits: number } | null>(null)

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">Agent Traffic (Bots & Crawlers)</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Traffic from AI bots and crawlers accessing your site</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            
            {/* Horizontal Bar Chart with Dashed Style */}
            <div className="space-y-4">
              {agentTrafficData.map((item, index) => (
                <div 
                  key={item.platform}
                  className="group cursor-pointer"
                  onMouseEnter={() => setHoveredPlatform(item)}
                  onMouseLeave={() => setHoveredPlatform(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-20">
                        {item.platform}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {item.percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({item.visits.toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar with Dashed Style */}
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                        opacity: 0.7,
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 4px,
                          rgba(255,255,255,0.3) 4px,
                          rgba(255,255,255,0.3) 8px
                        )`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Hover Tooltip */}
            {hoveredPlatform && (
              <div className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none"
                   style={{
                     left: '50%',
                     top: '50%',
                     transform: 'translate(-50%, -50%)'
                   }}>
                <div className="text-white text-sm">
                  <span className="font-medium">{hoveredPlatform.percentage}%</span> of agent traffic ({hoveredPlatform.visits.toLocaleString()} visits) from <span className="font-medium">{hoveredPlatform.platform}</span>
                </div>
              </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
