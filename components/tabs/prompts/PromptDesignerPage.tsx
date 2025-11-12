'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Save,
  Search,
  Sparkles,
  Upload,
  Plus,
  MoreHorizontal,
  ChevronsUpDown,
  ArrowUpDown,
  Layers,
  Flag
} from 'lucide-react'

interface PromptDesignerPageProps {
  onBack?: () => void
}

export function PromptDesignerPage({ onBack }: PromptDesignerPageProps) {
  const [selectedTab, setSelectedTab] = useState("active")
  const [selectedTopic, setSelectedTopic] = useState("personalization")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])

  const tabs = [
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
    { id: "visibility", label: "Visibility" },
    { id: "sentiment", label: "Sentiment" },
    { id: "platforms", label: "Platforms" }
  ]

  const topics = [
    { id: "all", name: "All Topics", count: 6 },
    { id: "conversion", name: "Conversion Rate Optimizati...", count: 5 },
    { id: "personalization", name: "Personalization", count: 1 }
  ]

  const prompts = [
    {
      id: "1",
      text: "is fibr a good tool for personalization",
      language: "English (en-US)",
      regions: [{ flag: "🇺🇸", name: "US" }],
      tags: ["Tag"],
      platforms: [
        { id: "chatgpt", name: "ChatGPT", color: "bg-black" },
        { id: "perplexity", name: "Perplexity", color: "bg-blue-500" },
        { id: "gemini", name: "Gemini", color: "bg-white border" },
        { id: "claude", name: "Claude", color: "bg-gray-300" }
      ],
      updated: "3 days ago",
      created: "3 days ago"
    }
  ]

  const togglePrompt = (promptId: string) => {
    setSelectedPrompts(prev => 
      prev.includes(promptId) 
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" className="gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Edits are temporary until saved</span>
          <Button size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 border-r bg-background">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Topics (2)</h3>
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    selectedTopic === topic.id ? 'bg-accent' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedTopic(topic.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{topic.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {topic.count}
                    </Badge>
                  </div>
                  {selectedTopic === topic.id && (
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Add Topic
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Prompt Builder</h1>
            <p className="text-muted-foreground">
              We run these prompts across AI platforms to generate the insights that you see across Profound.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-6">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={selectedTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTab(tab.id)}
                className="gap-2"
              >
                {tab.id === "platforms" && <Layers className="w-4 h-4" />}
                {tab.label}
                {tab.id === "platforms" && <ChevronsUpDown className="w-3 h-3" />}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">8 / 200 prompts</span>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-1/4"></div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </Button>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Prompt
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedPrompts.length === prompts.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedPrompts(prompts.map(p => p.id))
                  } else {
                    setSelectedPrompts([])
                  }
                }}
              />
              <span className="text-sm font-medium flex items-center gap-2">
                Prompts ({prompts.length})
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
              </span>
            </div>
          </div>

          {/* Prompts Table */}
          <div className="space-y-4">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedPrompts.includes(prompt.id)}
                    onCheckedChange={() => togglePrompt(prompt.id)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">{prompt.text}</p>
                        
                        <div className="grid grid-cols-5 gap-4 text-xs text-muted-foreground">
                          {/* Language */}
                          <div>
                            <span className="block font-medium text-foreground mb-1">Language</span>
                            <span>{prompt.language}</span>
                          </div>
                          
                          {/* Regions */}
                          <div>
                            <span className="block font-medium text-foreground mb-1">Regions</span>
                            <div className="flex items-center gap-1">
                              {prompt.regions.map((region, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <span>{region.flag}</span>
                                  <span>{region.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Tags */}
                          <div>
                            <span className="block font-medium text-foreground mb-1">Tags</span>
                            <div className="flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              <span>{prompt.tags[0]}</span>
                            </div>
                          </div>
                          
                          {/* Platforms */}
                          <div>
                            <span className="block font-medium text-foreground mb-1">Platforms</span>
                            <div className="flex gap-1">
                              {prompt.platforms.map((platform) => (
                                <div
                                  key={platform.id}
                                  className={`w-6 h-6 rounded-full ${platform.color} flex items-center justify-center text-xs`}
                                  title={platform.name}
                                >
                                  {platform.name.charAt(0).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Updated/Created */}
                          <div>
                            <span className="block font-medium text-foreground mb-1">Updated</span>
                            <span className="block mb-1">{prompt.updated}</span>
                            <span className="block font-medium text-foreground mb-1">Created</span>
                            <span>{prompt.created}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Prompt Placeholder */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Add a new prompt...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
