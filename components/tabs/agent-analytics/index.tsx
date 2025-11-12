'use client'

// Agent Analytics Tab Components
export { SetupOptionsSection } from './SetupOptionsSection'
export { PlatformTrafficCard } from './PlatformTrafficCard'
export { HumanAIVisitsSection } from './HumanAIVisitsSection'
export { HumanVsAgentSplitSection } from './HumanVsAgentSplitSection'
export { TrafficTrendsSection } from './TrafficTrendsSection'
export { TopPagesTable } from './TopPagesTable'

// Agent Analytics Tab Main Component
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, Download, Filter, Globe, ChevronDown, Calendar as CalendarIcon, Check } from 'lucide-react'
import { SetupOptionsSection } from './SetupOptionsSection'
import { PlatformTrafficCard } from './PlatformTrafficCard'
import { HumanAIVisitsSection } from './HumanAIVisitsSection'
import { HumanVsAgentSplitSection } from './HumanVsAgentSplitSection'
import { TrafficTrendsSection } from './TrafficTrendsSection'
import { TopPagesTable } from './TopPagesTable'

interface AgentAnalyticsTabProps {
  onToggleFullScreen?: (isFullScreen: boolean) => void
}

export function AgentAnalyticsTab({ onToggleFullScreen }: AgentAnalyticsTabProps) {
  const [isSetup, setIsSetup] = useState(false) // Set to false to show setup screen first
  const [activeTab, setActiveTab] = useState('human')
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    all: true,
    chatgpt: true,
    perplexity: true,
    gemini: true,
    claude: true
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform as keyof typeof prev]
    }))
  }

  const getSelectedCount = () => {
    const { all, ...platforms } = selectedPlatforms
    return Object.values(platforms).filter(Boolean).length
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const getDateLabel = () => {
    if (!selectedDate) return 'Select Date'
    return formatDate(selectedDate)
  }

  const getComparisonLabel = () => {
    if (!comparisonDate) return ''
    
    const daysDiff = Math.floor((selectedDate!.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === 1) return 'vs Yesterday'
    if (daysDiff === 7) return 'vs Last Week'
    if (daysDiff === 30) return 'vs Last Month'
    return `vs ${formatDate(comparisonDate)}`
  }

  if (!isSetup) {
    return <SetupOptionsSection onSetupComplete={() => setIsSetup(true)} />
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar - Only shown after setup */}
      <div className="relative">
        {/* Navigation Tabs - Left aligned */}
        <div className="pl-4 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent p-0 h-auto border-0 flex space-x-0">
                     <TabsTrigger 
                       value="human" 
                       className="relative px-4 py-2 body-text rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
                     >
                Human
              </TabsTrigger>
              <TabsTrigger 
                value="ai-visits" 
                className="relative px-4 py-2 body-text rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
              >
                AI Visits
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filter Row - Calendar and Platforms dropdown */}
        <div className="px-4 py-3 mt-2">
          <div className="flex justify-between items-center w-full">
            {/* Calendar - Left */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                         <Button variant="outline" size="sm" className="body-text justify-between w-32">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {getDateLabel()}
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {selectedDate && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="body-text w-40">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {comparisonDate ? formatDate(comparisonDate) : 'Compare with'}
                          </span>
                        </div>
                        <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={comparisonDate}
                      onSelect={setComparisonDate}
                      initialFocus
                      disabled={(date) => date >= selectedDate}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Platforms dropdown - Right */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                       <Button variant="outline" size="sm" className="body-text">
                  <Globe className="mr-2 h-4 w-4" />
                  Platforms ({getSelectedCount()})
                  <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuCheckboxItem
                  checked={selectedPlatforms.all}
                  onCheckedChange={() => handlePlatformToggle('all')}
                >
                  All Platforms
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedPlatforms.chatgpt}
                  onCheckedChange={() => handlePlatformToggle('chatgpt')}
                >
                  ChatGPT
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedPlatforms.perplexity}
                  onCheckedChange={() => handlePlatformToggle('perplexity')}
                >
                  Perplexity
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedPlatforms.gemini}
                  onCheckedChange={() => handlePlatformToggle('gemini')}
                >
                  Gemini
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedPlatforms.claude}
                  onCheckedChange={() => handlePlatformToggle('claude')}
                >
                  Claude
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Section Divider */}
        <div className="border-b border-gray-200"></div>
      </div>

      {/* Platform Traffic Card - Full Width */}
      <div className="space-y-6">
        <PlatformTrafficCard 
          title="Platform Traffic"
          description="Traffic distribution across AI platforms"
          totalVisits={3560}
          growthPercentage={12.5}
          selectedPlatforms={selectedPlatforms}
          selectedDate={selectedDate}
          comparisonDate={comparisonDate}
          comparisonLabel={getComparisonLabel()}
          showComparison={!!comparisonDate}
        />
      </div>

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Human AI Visits (Tabbed) */}
        <div className="space-y-6">
          <HumanAIVisitsSection selectedPlatforms={selectedPlatforms} />
        </div>

        {/* Column 2: Human vs Agent Split + Trends */}
        <div className="space-y-6">
          <HumanVsAgentSplitSection />
          <TrafficTrendsSection />
        </div>

        {/* Column 3: Full-width Top Pages Table */}
        <div className="lg:col-span-1">
          <TopPagesTable />
        </div>
      </div>
    </div>
  )
}
