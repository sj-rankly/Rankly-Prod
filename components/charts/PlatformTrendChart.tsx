'use client'

import { TrendArrowUp } from '@/components/ui/modern-arrows'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Expand } from 'lucide-react'
import { getPlatformTrends } from '@/services/ga4Api'

interface PlatformTrendChartProps {
  dateRange: string
}

const chartConfig = {
  'organic': {
    label: 'Organic',
    color: '#34a853', // Green
  },
  'direct': {
    label: 'Direct',
    color: '#ea4335', // Red
  },
  'referral': {
    label: 'Referral',
    color: '#fbbc04', // Yellow
  },
  'LLMs': {
    label: 'LLMs',
    color: '#10a37f', // Teal
  },
  'other': {
    label: 'Other',
    color: '#6b7280', // Gray
  },
  'social': {
    label: 'Social',
    color: '#ff6d01', // Orange
  },
  'email': {
    label: 'Email',
    color: '#46bdc6', // Cyan
  },
  'paid': {
    label: 'Paid',
    color: '#9334e6', // Purple
  },
} satisfies ChartConfig

export function PlatformTrendChart({ dateRange }: PlatformTrendChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { data: trendData, isLoading, isError, error } = useQuery({
    queryKey: ['platformTrends', dateRange],
    queryFn: async () => {
      console.log('📈 [PlatformTrendChart] Fetching trend data for dateRange:', dateRange)
      
      // Map dateRange to days for API call
      const daysMap: Record<string, number> = {
        '7 days': 7,
        '14 days': 14,
        '30 days': 30
      }
      const days = daysMap[dateRange] || 7
      
      try {
        const result = await getPlatformTrends(`${days}daysAgo`, 'today')
        console.log('✅ [PlatformTrendChart] API Response:', result)
        
        if (!result.success || !result.data) {
          console.error('❌ [PlatformTrendChart] Invalid response format:', result)
          throw new Error('Invalid response format')
        }
        
        console.log('✅ [PlatformTrendChart] Real data loaded:', { dataPoints: result.data.length })
        return result.data
      } catch (error) {
        console.error('❌ [PlatformTrendChart] API failed:', error)
        throw error
      }
    },
  })

  console.log('🔍 Chart component state:', { trendData, isLoading, isError, error })
  console.log('🔍 Chart data structure:', trendData)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading trend data...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-center text-destructive">
        <p>Error loading trend data: {error?.message}</p>
      </div>
    )
  }

  if (!trendData || trendData.length === 0) {
    console.log('🔍 No trend data - trendData:', trendData)
    return (
      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
        <p>No trend data available for the selected period.</p>
        <p className="text-xs mt-2">Debug: trendData = {JSON.stringify(trendData)}</p>
      </div>
    )
  }

  // Get data keys for rendering lines
  const dataKeys = Object.keys(chartConfig)
  
  // Calculate total sessions for the footer
  const totalSessions = trendData.reduce((sum: number, day: any) => {
    return sum + (Object.values(day) as any[]).reduce((daySum: number, value: any) => {
      return daySum + (typeof value === 'number' ? value : 0)
    }, 0)
  }, 0)

  console.log('🔍 Data keys:', dataKeys)

  // Reusable chart component
  const renderChart = (isExpanded: boolean = false) => (
    <div className={`${isExpanded ? 'h-[600px] w-full' : 'h-full w-full'}`}>
      {/* Color Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
        {dataKeys.map((key) => {
          const config = chartConfig[key as keyof typeof chartConfig]
          return (
            <div key={key} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className={`${isExpanded ? 'text-sm' : 'text-xs'} text-foreground`}>{config.label}</span>
            </div>
          )
        })}
      </div>
      
      <ChartContainer config={chartConfig} className="h-full w-full min-h-[200px] overflow-visible">
        <LineChart
          accessibilityLayer
          data={trendData}
          margin={{
            left: 20,
            right: 20,
            top: 12,
            bottom: 30, // Increased bottom margin for date labels
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0} // Force all labels to be shown
            tickFormatter={(value) => {
              // Handle both date strings and objects
              if (typeof value === 'string') {
                const date = new Date(value)
                
                // Format based on date range
                if (dateRange === '7 days' || dateRange === '14 days') {
                  // For 7 and 14 days: show date/month (e.g., "15/10")
                  return `${date.getDate()}/${date.getMonth() + 1}`
                } else if (dateRange === '30 days') {
                  // For 30 days: show date/month format (e.g., "15/10")
                  return `${date.getDate()}/${date.getMonth() + 1}`
                }
                
                return value
              }
              return value
            }}
            tick={{ 
              fontSize: isExpanded ? 12 : 10,
              fill: 'currentColor'
            }}
          />
          <ChartTooltip 
            cursor={false} 
            content={<ChartTooltipContent />} 
          />
          {dataKeys.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={chartConfig[key as keyof typeof chartConfig].color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      
      {/* Footer with trend info */}
    </div>
  )

  return (
    <div className="h-full w-full relative">
      {/* Expand Button - positioned in top-right corner */}
      <div className="absolute top-2 right-2 z-10">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm border-border/50 hover:bg-background shadow-sm"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Traffic Trends - {dateRange}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {renderChart(true)}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Main Chart */}
      {renderChart(false)}
    </div>
  )
}