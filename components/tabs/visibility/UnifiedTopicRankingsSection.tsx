import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { truncateForDisplay, truncateForChart, truncateForRanking, truncateForTooltip } from '@/lib/textUtils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface UnifiedTopicRankingsSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

function UnifiedTopicRankingsSection({ filterContext, dashboardData }: UnifiedTopicRankingsSectionProps) {
  // Transform dashboard data to topic rankings format
  const getTopicRankingsFromDashboard = () => {
    console.log('🔍 [TopicRankings] Dashboard data:', dashboardData?.metrics?.topicRankings)
    console.log('🔍 [TopicRankings] Topics data:', dashboardData?.topics)
    
    if (dashboardData?.metrics?.topicRankings) {
      console.log('🔍 [TopicRankings] First topic ranking:', dashboardData.metrics.topicRankings[0])
      if (dashboardData.metrics.topicRankings[0]) {
        console.log('🔍 [TopicRankings] First topic has rankings:', dashboardData.metrics.topicRankings[0].rankings)
      }
    }

    if (!dashboardData?.metrics?.topicRankings || dashboardData.metrics.topicRankings.length === 0) {
      console.log('⚠️ [TopicRankings] No topic ranking data available')
      return []
    }

    // ✅ Use the backend-provided topic rankings structure
    // ✅ FIX: Re-sort by visibility score to ensure correct rankings (higher is better)
    return dashboardData.metrics.topicRankings
      .filter((topicRanking: any) => topicRanking.rankings && topicRanking.rankings.length > 0)
      .map((topicRanking: any) => {
        // Re-sort by visibility score (higher is better) and re-assign ranks
        const sortedRankings = [...topicRanking.rankings]
          .sort((a: any, b: any) => {
            const scoreA = a.score || 0
            const scoreB = b.score || 0
            return scoreB - scoreA // Descending: higher scores first
          })
          .slice(0, 5) // Show top 5
          .map((competitor: any, index: number) => ({
            rank: index + 1, // Re-assign rank based on sorted order
            name: competitor.name,
            isOwner: competitor.isOwner || false,
            score: competitor.score || 0,
            // ✅ FIX: Include URL from backend data (like Prompts tab)
            url: competitor.url || null
          }))
        
        return {
          topic: topicRanking.topic,
          rankings: sortedRankings
        }
      })
      .filter((topic: any) => topic.rankings.length > 0) // ✅ Only topics with actual rankings
  }

  const topicData = getTopicRankingsFromDashboard()
  const hasData = topicData.length > 0
  
  // ✅ Debug logging
  console.log('📊 [TopicRankings] Processed topic data:', topicData)
  console.log('📊 [TopicRankings] Has data:', hasData)
  
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={<UnifiedCardSkeleton type="table" tableColumns={3} tableRows={4} />}
    >
      <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Ranking by Topic</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm leading-relaxed">
                    Visibility rankings by topic show how your brand performs across different conversation themes. Rankings help identify which topics drive the most brand visibility and where you can improve.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your brand&apos;s visibility ranking across different topics
          </p>
        </div>
        
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Empty State */}
          {!hasData && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">No topic ranking data available</p>
                <p className="text-sm text-muted-foreground">
                  This table shows visibility rankings only for topics that have been analyzed. 
                  Select and analyze topics in the prompt designer to see rankings here.
                </p>
              </div>
            </div>
          )}

          {/* Topic Rankings Table */}
          {hasData && (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-2">Topics</div>
              <div className="col-span-1 text-center">#1</div>
              <div className="col-span-1 text-center">#2</div>
              <div className="col-span-1 text-center">#3</div>
              <div className="col-span-1 text-center">#4</div>
              <div className="col-span-1 text-center">#5</div>
            </div>

            {/* Topic Rows */}
            {topicData.map((topic, index) => (
              <div key={topic.topic} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Topic Column */}
                <div className="col-span-2 flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                </div>

                {/* Ranking Columns */}
                {topic.rankings.slice(0, 5).map((ranking) => (
                  <div key={`${topic.topic}-${ranking.rank}`} className="col-span-1 flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-20 h-8 flex items-center justify-center rounded-full px-2 cursor-help">
                            <div className="flex items-center gap-1">
                              <img
                                src={getDynamicFaviconUrl((ranking as any).url ? { url: (ranking as any).url, name: ranking.name } : ranking.name, 16)}
                                alt={ranking.name}
                                className="w-3 h-3 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                data-favicon-identifier={(ranking as any).url || ranking.name}
                                data-favicon-size="16"
                                onError={handleFaviconError}
                              />
                              <span 
                                className="text-xs font-medium truncate" 
                                style={{color: ranking.isOwner ? '#2563EB' : 'inherit'}}
                              >
                                {ranking.name}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            <strong>{ranking.name}</strong><br/>
                            Visibility Score: {ranking.score}%<br/>
                            Rank: #{ranking.rank}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            ))}
          </div>
          )}
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
    </SkeletonWrapper>
  )
}

export { UnifiedTopicRankingsSection }
