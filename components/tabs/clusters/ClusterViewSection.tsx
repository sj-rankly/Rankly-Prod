'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Filter, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import apiService from '@/services/api'

interface ClusterBrand {
  name: string
  visibilityScore: number
  mentionRate: number
}

interface TopPrompt {
  id: string
  text: string
  queryType: string
  visibilityScore: number
}

interface Cluster {
  id: string
  name: string
  promptCount: number
  testCount: number
  avgVisibility: number
  brandMentionRate: number
  platforms: string[]
  personas: string[]
  topPrompts: TopPrompt[]
  metrics: {
    totalMentions: number
    avgPosition: number
    citationRate: number
  }
}

interface ClusterData {
  clusters: Cluster[]
  summary: {
    totalClusters: number
    totalTopics: number
    totalPrompts: number
    totalTests: number
    avgVisibility: number
    topPerforming: { name: string; score: number }[]
    needsAttention: { name: string; score: number }[]
  }
}

function ClusterViewSection() {
  const { urlAnalysisId } = useAnalytics()
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [summary, setSummary] = useState<ClusterData['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClusters()
  }, [urlAnalysisId])

  const fetchClusters = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
      const response = await apiService.get(`/clusters${params}`)

      if (response.data.success) {
        setClusters(response.data.data.clusters || [])
        setSummary(response.data.data.summary || null)
      } else {
        setError(response.data.message || 'Failed to load clusters')
      }
    } catch (err: any) {
      console.error('Error fetching clusters:', err)
      setError(err.message || 'Failed to load cluster data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    // Export cluster data as JSON
    const dataStr = JSON.stringify({ clusters, summary }, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cluster-analysis-${new Date().toISOString()}.json`
    link.click()
  }

  // Filter clusters based on selected topic
  const filteredClusters = selectedTopic === "all" 
    ? clusters 
    : clusters.filter(cluster => cluster.name === selectedTopic)

  // Get unique topic names for filter
  const topicNames = ['all', ...new Set(clusters.map(c => c.name))]

  const getCompetitionLevel = (avgVisibility: number): { level: string; color: string } => {
    if (avgVisibility >= 70) return { level: 'High Performance', color: 'text-green-600 dark:text-green-400' }
    if (avgVisibility >= 40) return { level: 'Medium Performance', color: 'text-yellow-600 dark:text-yellow-400' }
    return { level: 'Needs Attention', color: 'text-red-600 dark:text-red-400' }
  }

  if (loading) {
    return (
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading cluster analysis...</span>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    )
  }

  if (error) {
    return (
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-8">
          <div className="text-center space-y-3">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={fetchClusters} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    )
  }

  if (clusters.length === 0) {
    return (
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-8">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">No cluster data available.</p>
            <p className="text-sm text-muted-foreground">Complete some prompt tests to see cluster analysis.</p>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Topic Clusters</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Analysis of topic performance grouped by clusters with visibility metrics.
          </p>
        </div>
          
        {/* Export Button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UnifiedCard>
            <UnifiedCardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Clusters</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalClusters}</p>
              </div>
            </UnifiedCardContent>
          </UnifiedCard>

          <UnifiedCard>
            <UnifiedCardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Prompts</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalPrompts}</p>
              </div>
            </UnifiedCardContent>
          </UnifiedCard>

          <UnifiedCard>
            <UnifiedCardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalTests}</p>
              </div>
            </UnifiedCardContent>
          </UnifiedCard>

          <UnifiedCard>
            <UnifiedCardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Visibility</p>
                <p className="text-2xl font-bold text-foreground">{summary.avgVisibility}%</p>
              </div>
            </UnifiedCardContent>
          </UnifiedCard>
        </div>
      )}

      {/* Main Content */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topicNames.map(topic => (
                      <SelectItem key={topic} value={topic}>
                        {topic === 'all' ? 'All Topics' : topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {filteredClusters.length} of {clusters.length} clusters
              </div>
            </div>

            {/* Cluster Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredClusters.map((cluster) => {
                const competition = getCompetitionLevel(cluster.avgVisibility)
                
                return (
                  <UnifiedCard key={cluster.id} className="border-2">
                    <UnifiedCardContent className="p-5">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{cluster.name}</h3>
                            <p className={`text-sm font-medium ${competition.color}`}>
                              {competition.level}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {cluster.promptCount} prompts
                          </Badge>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Avg Visibility</p>
                            <p className="text-xl font-bold text-foreground">{cluster.avgVisibility}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Mention Rate</p>
                            <p className="text-xl font-bold text-foreground">{cluster.brandMentionRate}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Avg Position</p>
                            <p className="text-xl font-bold text-foreground">
                              {cluster.metrics.avgPosition > 0 ? cluster.metrics.avgPosition.toFixed(1) : 'N/A'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Citation Rate</p>
                            <p className="text-xl font-bold text-foreground">{cluster.metrics.citationRate}%</p>
                          </div>
                        </div>

                        {/* Platforms */}
                        {cluster.platforms.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Platforms:</p>
                            <div className="flex flex-wrap gap-1">
                              {cluster.platforms.map(platform => (
                                <Badge key={platform} variant="secondary" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Prompts */}
                        {cluster.topPrompts.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Top Performing Prompts:</p>
                            <div className="space-y-1">
                              {cluster.topPrompts.slice(0, 3).map((prompt, idx) => (
                                <div key={prompt.id} className="text-xs text-foreground/80 truncate">
                                  {idx + 1}. {prompt.text} ({prompt.visibilityScore}%)
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </UnifiedCardContent>
                  </UnifiedCard>
                )
              })}
            </div>

            {filteredClusters.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No clusters found for the selected topic.</p>
              </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Top Performing & Needs Attention */}
      {summary && (summary.topPerforming.length > 0 || summary.needsAttention.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.topPerforming.length > 0 && (
            <UnifiedCard>
              <UnifiedCardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Top Performing Topics</h3>
                <div className="space-y-2">
                  {summary.topPerforming.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{topic.name}</span>
                      <Badge variant="outline" className="text-green-600 dark:text-green-400">
                        {topic.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </UnifiedCardContent>
            </UnifiedCard>
          )}

          {summary.needsAttention.length > 0 && (
            <UnifiedCard>
              <UnifiedCardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Needs Attention</h3>
                <div className="space-y-2">
                  {summary.needsAttention.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{topic.name}</span>
                      <Badge variant="outline" className="text-red-600 dark:text-red-400">
                        {topic.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </UnifiedCardContent>
            </UnifiedCard>
          )}
        </div>
      )}
    </div>
  )
}

export { ClusterViewSection }
