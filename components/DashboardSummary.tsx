'use client'

import { Badge } from '@/components/ui/badge'

interface DashboardSummaryProps {
  dashboardData?: any
}

export function DashboardSummary({ dashboardData }: DashboardSummaryProps) {
  if (!dashboardData?.overall) {
    return null
  }

  const overall = dashboardData.overall
  const topics = dashboardData.topics || []
  const personas = dashboardData.personas || []
  
  // Calculate unique topics and personas that have data
  const topicsWithData = topics.filter((topic: any) => topic.brandMetrics && topic.brandMetrics.length > 0)
  const personasWithData = personas.filter((persona: any) => persona.brandMetrics && persona.brandMetrics.length > 0)

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{overall.totalPrompts} prompts</span>
        <Badge variant="secondary" className="text-xs">
          {overall.totalResponses} tests
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span>{topicsWithData.length} topics</span>
        <span>•</span>
        <span>{personasWithData.length} pers</span>
      </div>
    </div>
  )
}
