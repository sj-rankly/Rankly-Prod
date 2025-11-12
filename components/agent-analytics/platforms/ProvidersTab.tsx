/**
* Platforms Tab - Rankly Design System
*
* Shows LLM platform performance with Rankly's design patterns
*/

'use client'

import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModernTrendUp, ModernTrendDown } from '@/components/ui/modern-arrows'

interface PlatformsTabProps {
  range: Range
  realLLMData?: any
}

export function PlatformsTab({ range, realLLMData }: PlatformsTabProps) {
  console.log('[PlatformsTab] Received data:', {
    hasRealLLMData: !!realLLMData,
    dataStructure: realLLMData ? Object.keys(realLLMData) : null,
    dataDataStructure: realLLMData?.data ? Object.keys(realLLMData.data) : null,
    hasPlatforms: realLLMData?.data?.platforms ? realLLMData.data.platforms.length : 0,
    platformsData: realLLMData?.data?.platforms ? realLLMData.data.platforms.slice(0, 2) : null,
    fullRealLLMData: realLLMData
  })
  
  // Debug: Check if we have any data at all
  if (!realLLMData) {
    console.log('[PlatformsTab] No realLLMData at all')
    return (
      <div>
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-foreground">Platform Performance</h2>
                <p className="body-text text-muted-foreground mt-1">
                  No data available. Please sync data first.
                </p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Debug: Check if we have platforms data
  if (!realLLMData.data?.platforms || realLLMData.data.platforms.length === 0) {
    console.log('[PlatformsTab] No platforms data:', {
      hasData: !!realLLMData.data,
      platformsArray: realLLMData.data?.platforms,
      platformsLength: realLLMData.data?.platforms?.length
    })
    return (
      <div>
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-foreground">Platform Performance</h2>
                <p className="body-text text-muted-foreground mt-1">
                  No platform data available. Data structure: {JSON.stringify(Object.keys(realLLMData.data || {}))}
                </p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  const platforms = realLLMData.data?.platforms || []

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-foreground">LLM Platform Performance</h2>
              <p className="body-text text-muted-foreground mt-1">
                Traffic and engagement metrics by LLM platform
              </p>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="caption text-muted-foreground py-2 px-3">
                    Platform
                  </TableHead>
                  <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                    Sessions
                  </TableHead>
                  <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                    Share
                  </TableHead>
                  <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                    SQS
                  </TableHead>
                  <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                    LVS
                  </TableHead>
                  <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                    Conv. Rate
                  </TableHead>
                  <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                    Trend
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform: any, index: number) => (
                  <TableRow
                    key={platform.platform}
                    className="border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="body-text font-medium text-foreground capitalize">
                          {platform.platform}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="metric text-sm text-foreground">
                        {platform.sessions.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="body-text text-muted-foreground">
                        {platform.percentage.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="metric text-sm text-foreground">
                        {platform.sqs.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="metric text-sm text-primary font-semibold">
                        {platform.lvs.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="body-text text-foreground">
                        {(platform.conversionRate * 100).toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      {platform.trend === 'up' ? (
                        <Badge
                          variant="outline"
                          className="caption h-5 px-2 border-green-500 text-green-500 bg-green-500/10"
                        >
                          <ModernTrendUp className="w-3 h-3" />
                        </Badge>
                      ) : platform.trend === 'down' ? (
                        <Badge
                          variant="outline"
                          className="caption h-5 px-2 border-red-500 text-red-500 bg-red-500/10"
                        >
                          <ModernTrendDown className="w-3 h-3" />
                        </Badge>
                      ) : (
                        <span className="caption text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
