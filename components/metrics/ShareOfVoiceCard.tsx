'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Info, ArrowUp, ArrowDown, Minus, ChevronDown, Settings } from 'lucide-react'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'

interface ShareOfVoiceData {
  title: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  change: number
  description: string
  chartData: Array<{
    name: string
    value: number
    color: string
  }>
  competitors: Array<{
    id: string
    rank: number
    name: string
    score: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }>
}

interface ShareOfVoiceCardProps {
  data: ShareOfVoiceData
}

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981'  // Green
]

export function ShareOfVoiceCard({ data }: ShareOfVoiceCardProps) {
  const [showAll, setShowAll] = useState(false)
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut')

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />
      case 'down':
        return <ArrowDown className="w-3 h-3" />
      case 'stable':
        return <Minus className="w-3 h-3" />
      default:
        return null
    }
  }

  const displayedCompetitors = showAll ? data.competitors : data.competitors.slice(0, 5)

  return (
    <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-semibold tracking-tight">{data.title}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm leading-relaxed">{data.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
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
        <CardDescription className="text-sm text-muted-foreground">
          Brand mentions across AI platforms
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Value with Trend */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              {data.value}{data.unit}
            </span>
            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-semibold", {
              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400": data.trend === 'up',
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400": data.trend === 'down',
              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400": data.trend === 'stable'
            })}>
              {getTrendIcon(data.trend)}
              <span>
                {data.change > 0 ? '+' : ''}{data.change}{data.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'donut' ? (
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {data.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}
                  iconType="circle"
                  iconSize={8}
                  layout="horizontal"
                  verticalAlign="bottom"
                  height={25}
                />
              </PieChart>
            ) : (
              <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickCount={5}
                />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                />
                {data.chartData.map((entry, index) => (
                  <Bar 
                    key={`bar-${index}`}
                    dataKey="value" 
                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch space-y-4 pt-0">
        {/* Competitor Rankings */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Brand Rankings</h4>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/50">
                  <TableHead className="text-sm font-semibold py-3 w-16">Rank</TableHead>
                  <TableHead className="text-sm font-semibold py-3">Brand</TableHead>
                  <TableHead className="text-sm font-semibold text-right py-3 w-20">Score</TableHead>
                  <TableHead className="text-sm font-semibold text-center py-3 w-24">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showAll ? (
                  <ScrollArea className="h-[300px]">
                    {displayedCompetitors.map((competitor) => (
                      <TableRow key={competitor.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-3">
                          <Badge 
                            variant={competitor.rank === 1 ? "default" : "secondary"}
                            className="w-7 h-7 rounded-full p-0 flex items-center justify-center text-sm font-medium"
                          >
                            {competitor.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                              competitor.name === 'Fibr' 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "bg-muted border-muted-foreground/20"
                            )}>
                              {competitor.name.charAt(0)}
                            </div>
                            <span className={cn(
                              "font-medium text-sm",
                              competitor.name === 'Fibr' && "text-primary font-semibold"
                            )}>
                              {competitor.name}
                            </span>
                            {competitor.name === 'Fibr' && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                                You
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold py-3">
                          {competitor.score}%
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                              competitor.trend === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              competitor.trend === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              competitor.trend === 'stable' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                              {getTrendIcon(competitor.trend)}
                              <span>
                                {competitor.change > 0 ? '+' : ''}{competitor.change}%
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </ScrollArea>
                ) : (
                  displayedCompetitors.map((competitor) => (
                    <TableRow key={competitor.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="py-3">
                        <Badge 
                          variant={competitor.rank === 1 ? "default" : "secondary"}
                          className="w-7 h-7 rounded-full p-0 flex items-center justify-center text-sm font-medium"
                        >
                          {competitor.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                            competitor.name === 'Fibr' 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted border-muted-foreground/20"
                          )}>
                            {competitor.name.charAt(0)}
                          </div>
                          <span className={cn(
                            "font-medium text-sm",
                            competitor.name === 'Fibr' && "text-primary font-semibold"
                          )}>
                            {competitor.name}
                          </span>
                          {competitor.name === 'Fibr' && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold py-3">
                        {competitor.score}%
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                            competitor.trend === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            competitor.trend === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            competitor.trend === 'stable' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {getTrendIcon(competitor.trend)}
                            <span>
                              {competitor.change > 0 ? '+' : ''}{competitor.change}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* View More Button */}
        {data.competitors.length > 5 && (
          <Button 
            variant="outline" 
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            <ChevronDown className={cn("w-4 h-4 mr-2 transition-transform", showAll && "rotate-180")} />
            {showAll ? 'Show Less' : `View More (${data.competitors.length - 5} more)`}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
