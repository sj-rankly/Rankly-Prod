/**
 * Device Tab - Device Analytics Module
 *
 * Shows device, OS, and browser breakdown
 */

'use client'

import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { GeoDeviceSkeleton } from '@/components/ui/geo-device-skeleton'
import { getConversionEvents } from '@/services/ga4Api'

interface DeviceTabProps {
  range: Range
  realDeviceData?: any
  dateRange?: string
  isLoading?: boolean
  selectedConversionEvent?: string
  onConversionEventChange?: (event: string) => void
}

export function DeviceTab({ 
  range, 
  realDeviceData, 
  dateRange = '30 days', 
  isLoading = false,
  selectedConversionEvent: propSelectedConversionEvent,
  onConversionEventChange
}: DeviceTabProps) {
  const [conversionEvents, setConversionEvents] = useState<any[]>([])
  const [selectedConversionEvent, setSelectedConversionEvent] = useState(propSelectedConversionEvent || 'conversions')

  // Sync with prop if provided
  useEffect(() => {
    if (propSelectedConversionEvent && propSelectedConversionEvent !== selectedConversionEvent) {
      setSelectedConversionEvent(propSelectedConversionEvent)
    }
  }, [propSelectedConversionEvent, selectedConversionEvent])

  // Handle conversion event change
  const handleConversionEventChange = (event: string) => {
    setSelectedConversionEvent(event)
    onConversionEventChange?.(event)
  }

  // Fetch conversion events on component mount
  useEffect(() => {
    const fetchConversionEvents = async () => {
      try {
        const response = await getConversionEvents()
        if (response.success) {
          setConversionEvents(response.data.events || [])
        }
      } catch (error) {
        console.error('Failed to fetch conversion events:', error)
      }
    }
    fetchConversionEvents()
  }, [])

  // Show skeleton if loading
  if (isLoading) {
    return <GeoDeviceSkeleton />
  }

  // If no real data, show skeleton loading state
  if (!realDeviceData || !realDeviceData.data?.deviceBreakdown || realDeviceData.data.deviceBreakdown.length === 0) {
    return <GeoDeviceSkeleton />
  }

  const deviceBreakdown = realDeviceData.data?.deviceBreakdown || []
  const osBreakdown = realDeviceData.data?.osBreakdown || []
  const browserBreakdown = realDeviceData.data?.browserBreakdown || []
  const totalSessions = realDeviceData.data?.totalSessions || 0

  return (
    <div className="space-y-6">
      {/* Device Category Breakdown */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">LLM Device Category Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  LLM traffic metrics by device type
                </p>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Conversion Events Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Conversion Event:</span>
                  <Select value={selectedConversionEvent} onValueChange={handleConversionEventChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select conversion event" />
                    </SelectTrigger>
                    <SelectContent>
                      {conversionEvents.map((event) => (
                        <SelectItem key={event.name} value={event.name}>
                          <div className="flex items-center gap-2">
                            <span>{event.displayName}</span>
                            {event.category && (
                              <Badge variant="outline" className="text-xs">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Summary Metrics */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">
                        Total Sessions <span className="text-lg font-semibold text-foreground ml-1">{totalSessions}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="font-semibold mb-1">Total LLM Sessions</p>
                      <p className="text-sm">
                        Total number of sessions originating from LLM platforms (ChatGPT, Claude, Gemini, Perplexity, etc.) for the selected date range, broken down by device category.
                      </p>
                      <p className="text-xs mt-2 text-muted-foreground">
                        Note: Session counts may vary slightly between Geo and Device tabs due to how GA4 aggregates data across different dimension combinations. This is expected behavior.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto">
              <TooltipProvider>
                <Table className="min-w-[1200px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] text-left">
                        <div className="cursor-pointer hover:bg-muted/50 p-1 rounded text-left">
                          <span className="text-xs font-medium text-muted-foreground">Device Type</span>
                        </div>
                      </TableHead>

                      <TableHead className="w-[150px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">LLM Sessions</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>LLM sessions from this device</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[150px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Traffic %</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Percentage of total traffic</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Percentage of sessions that converted</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[140px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Bounce Rate</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Single-page sessions without engagement</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[180px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Avg Session Duration</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Average time per session</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Engagement Rate</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Percentage of engaged sessions</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {deviceBreakdown.map((device: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="w-[200px] text-left align-middle">
                          <span className="text-sm font-medium text-foreground capitalize">{device.device}</span>
                        </TableCell>

                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{device.sessions}</span>
                        </TableCell>

                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-primary">{device.percentage.toFixed(1)}%</span>
                        </TableCell>

                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{device.conversionRate.toFixed(1)}%</span>
                        </TableCell>

                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-destructive">{device.bounceRate.toFixed(1)}%</span>
                        </TableCell>

                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{device.avgSessionDuration}s</span>
                        </TableCell>

                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{device.engagementRate.toFixed(1)}%</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* OS and Browser Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* Operating System */}
        <UnifiedCard>
          <UnifiedCardContent className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">LLM Operating System</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  LLM sessions by OS
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">
                        <span className="text-xs font-medium text-muted-foreground">OS</span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">Sessions</span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">%</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {osBreakdown.slice(0, 10).map((os: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-left">
                          <span className="text-sm font-medium text-foreground">{os.os}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-foreground">{os.sessions}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-primary">{os.percentage.toFixed(1)}%</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>

        {/* Browser */}
        <UnifiedCard>
          <UnifiedCardContent className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">LLM Browser</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  LLM sessions by browser
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">
                        <span className="text-xs font-medium text-muted-foreground">Browser</span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">Sessions</span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">%</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {browserBreakdown.slice(0, 10).map((browser: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-left">
                          <span className="text-sm font-medium text-foreground">{browser.browser}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-foreground">{browser.sessions}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-primary">{browser.percentage.toFixed(1)}%</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    </div>
  )
}

