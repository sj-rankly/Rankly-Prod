'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Removed recharts import for now to avoid build issues
import { Users, Bot, TrendingUp, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// TODO: Connect to real analytics API endpoint when available
// This component currently shows placeholder data as traffic analytics
// are not yet implemented in the backend
const humanTrafficData: any[] = []
const agentTrafficData: any[] = []

// Removed unused data arrays for now

interface HumanAIVisitsSectionProps {
  selectedPlatforms: {
    all: boolean
    chatgpt: boolean
    perplexity: boolean
    gemini: boolean
    claude: boolean
  }
}

export function HumanAIVisitsSection({ selectedPlatforms }: HumanAIVisitsSectionProps) {
  const [activeTab, setActiveTab] = useState('human')

  // Show empty state if no data
  if (humanTrafficData.length === 0 && agentTrafficData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">Traffic Analytics Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Human and agent traffic analytics will be available once we integrate with your website's traffic data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto border-0">
          <TabsTrigger 
            value="human" 
            className="relative px-6 py-3 text-sm font-medium rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
          >
            <Users className="mr-2 h-4 w-4" />
            Human AI Visits
          </TabsTrigger>
          <TabsTrigger 
            value="agent" 
            className="relative px-6 py-3 text-sm font-medium rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
          >
            <Bot className="mr-2 h-4 w-4" />
            Agent Traffic
          </TabsTrigger>
        </TabsList>

        {/* Human AI Visits Tab */}
        <TabsContent value="human" className="mt-6">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Human Traffic Across Platforms
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="ml-2 h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Human visitors accessing your content through AI platforms</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">-</div>
                  <div className="text-sm text-muted-foreground">
                    No data available
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {humanTrafficData.map((item) => (
                  <div key={item.platform} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.platform}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">{item.visits.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Traffic Tab */}
        <TabsContent value="agent" className="mt-6">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                  <Bot className="mr-2 h-5 w-5" />
                  Agent Traffic (Bots/Crawlers)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="ml-2 h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Automated bot and crawler traffic from AI platforms</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">-</div>
                  <div className="text-sm text-muted-foreground">
                    No data available
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentTrafficData.map((item) => (
                  <div key={item.platform} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.platform}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">{item.visits.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
