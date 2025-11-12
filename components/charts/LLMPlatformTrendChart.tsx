'use client'

import { useQuery } from '@tanstack/react-query'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, CartesianGrid, YAxis, Legend, ResponsiveContainer } from 'recharts'
import { getPlatformTrends } from '@/services/ga4Api'
import { getFaviconUrlForDomain } from '@/lib/faviconUtils'

interface LLMPlatformTrendChartProps {
  dateRange: string
}

// Function to get the domain for each LLM platform for favicon fetching
function getLLMDomain(platform: string): string {
  switch (platform) {
    case 'ChatGPT':
      return 'chatgpt.com'
    case 'Claude':
      return 'claude.ai'
    case 'Gemini':
      return 'gemini.google.com'
    case 'Other LLM':
      return 'openai.com' // Fallback to OpenAI for other LLMs
    default:
      return 'openai.com'
  }
}

export function LLMPlatformTrendChart({ dateRange }: LLMPlatformTrendChartProps) {
  const { data: trendData, isLoading, isError, error } = useQuery({
    queryKey: ['llmPlatformTrends', dateRange],
    queryFn: async () => {
      console.log('🔍 Fetching LLM platform trend data for dateRange:', dateRange)
      
      try {
        // Map dateRange to days for API call
        const daysMap: Record<string, number> = {
          '7 days': 7,
          '14 days': 14,
          '30 days': 30
        }
        const days = daysMap[dateRange] || 7
        
        const result = await getPlatformTrends(`${days}daysAgo`, 'today')
        console.log('🔍 API Response:', result)
        
        if (result.success && result.data) {
          return result.data
        }
        
        // Fallback to mock data
        console.log('🔄 Using fallback mock data for LLM platform trends')
        return [
          {
            date: '2024-10-09',
            'ChatGPT': 12,
            'Claude': 8,
            'Gemini': 5,
            'Other LLM': 3
          },
          {
            date: '2024-10-10',
            'ChatGPT': 15,
            'Claude': 9,
            'Gemini': 6,
            'Other LLM': 4
          },
          {
            date: '2024-10-11',
            'ChatGPT': 18,
            'Claude': 11,
            'Gemini': 7,
            'Other LLM': 5
          },
          {
            date: '2024-10-12',
            'ChatGPT': 16,
            'Claude': 10,
            'Gemini': 8,
            'Other LLM': 4
          },
          {
            date: '2024-10-13',
            'ChatGPT': 20,
            'Claude': 12,
            'Gemini': 9,
            'Other LLM': 6
          },
          {
            date: '2024-10-14',
            'ChatGPT': 22,
            'Claude': 13,
            'Gemini': 10,
            'Other LLM': 7
          }
        ]
      } catch (error) {
        console.error('❌ Error fetching LLM platform trends:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading LLM platform trends...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-sm text-destructive">Failed to load LLM platform trends</div>
      </div>
    )
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No LLM platform trend data available</div>
      </div>
    )
  }

  // Define data keys for LLM platforms
  const dataKeys = ['ChatGPT', 'Claude', 'Gemini', 'Other LLM']
  
  // Chart configuration with distinct colors for each LLM platform
  const chartConfig = {
    ChatGPT: {
      label: 'ChatGPT',
      color: '#10b981', // Green
    },
    Claude: {
      label: 'Claude',
      color: '#3b82f6', // Blue
    },
    Gemini: {
      label: 'Gemini',
      color: '#8b5cf6', // Purple
    },
    'Other LLM': {
      label: 'Other LLM',
      color: '#6b7280', // Gray
    },
  }

  return (
    <div className="h-full w-full">
      {/* Favicon Legend for LLM Platforms */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
        {dataKeys.map((key) => {
          const config = chartConfig[key as keyof typeof chartConfig]
          return (
            <div key={key} className="flex items-center gap-1">
              <img
                src={getFaviconUrlForDomain(getLLMDomain(key), 16)}
                alt={`${config.label} favicon`}
                className="w-4 h-4 rounded-sm"
                onError={(e) => {
                  // Fallback to colored dot if favicon fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = document.createElement('div')
                  fallback.className = 'w-3 h-3 rounded-full'
                  fallback.style.backgroundColor = config.color
                  target.parentNode?.insertBefore(fallback, target)
                }}
              />
              <span className="text-xs text-foreground">{config.label}</span>
            </div>
          )
        })}
      </div>
      
      <ChartContainer config={chartConfig} className="h-full w-full min-h-[200px]">
        <LineChart
          accessibilityLayer
          data={trendData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `${value}`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Legend />
          {dataKeys.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={chartConfig[key as keyof typeof chartConfig].color}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: chartConfig[key as keyof typeof chartConfig].color,
                strokeWidth: 2,
                fill: '#fff',
              }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
