'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Database, ExternalLink, RefreshCw, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import apiService from '@/services/api'

interface Analysis {
  id: string
  url: string
  domain: string
  brandName?: string
  createdAt: string
  updatedAt: string
  status: string
  hasData: boolean
  totalPrompts: number
  totalResponses: number
  totalBrands: number
  lastCalculated: string | null
}

interface AnalysisSelectorProps {
  selectedAnalysisId?: string
  onAnalysisChange: (analysisId: string | null) => void
  className?: string
}

export function AnalysisSelector({ 
  selectedAnalysisId, 
  onAnalysisChange, 
  className = '' 
}: AnalysisSelectorProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchAnalyses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getAnalyses()
      
      if (response.success) {
        console.log('🔍 [AnalysisSelector] Fetched analyses:', response.data)
        setAnalyses(response.data)
        
        // Auto-select the first analysis if none is selected
        if (!selectedAnalysisId && response.data.length > 0) {
          onAnalysisChange(response.data[0].id)
        }
      } else {
        setError(response.message || 'Failed to fetch analyses')
      }
    } catch (err) {
      console.error('Error fetching analyses:', err)
      setError('Failed to fetch analyses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const selectedAnalysis = analyses.find(a => a.id === selectedAnalysisId)
  
  // Debug logging
  if (selectedAnalysis) {
    console.log('🔍 [AnalysisSelector] Selected analysis:', selectedAnalysis)
    console.log('🔍 [AnalysisSelector] totalPrompts:', selectedAnalysis.totalPrompts)
    console.log('🔍 [AnalysisSelector] totalResponses:', selectedAnalysis.totalResponses)
    console.log('🔍 [AnalysisSelector] typeof totalResponses:', typeof selectedAnalysis.totalResponses)
    console.log('🔍 [AnalysisSelector] totalResponses === undefined:', selectedAnalysis.totalResponses === undefined)
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const handleStartNewAnalysis = () => {
    // Clear all caches and start completely fresh
    console.log('🔄 [AnalysisSelector] Starting new analysis - clearing caches...')
    
    // Clear onboarding data but keep auth tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedAnalysisId')
      localStorage.removeItem('onboarding-data')
      localStorage.removeItem('websiteData')
      sessionStorage.clear()
    }
    
    // Navigate to fresh analysis page (bypasses existing analysis check)
    router.push('/onboarding/fresh')
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading analyses...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-destructive">Error: {error}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchAnalyses}
          className="h-6 px-2"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No analyses found</span>
        </div>
        
        <Button 
          onClick={handleStartNewAnalysis}
          className="h-8 px-3 text-sm"
          title="Start your first analysis"
        >
          <Plus className="w-4 h-4 mr-1" />
          Start Analysis
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Analysis:</span>
      </div>
      
      <Select value={selectedAnalysisId || ''} onValueChange={onAnalysisChange}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select an analysis">
            {selectedAnalysis && (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedAnalysis.brandName || selectedAnalysis.domain}</span>
                <Badge 
                  variant={selectedAnalysis.hasData ? "default" : "secondary"}
                  className="text-xs"
                >
                  {selectedAnalysis.hasData ? `${selectedAnalysis.totalPrompts} prompts • ${selectedAnalysis.totalResponses || 0} tests` : 'No data'}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {analyses.map((analysis) => (
            <SelectItem key={analysis.id} value={analysis.id}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{analysis.brandName || analysis.domain}</span>
                  <Badge 
                    variant={analysis.hasData ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {analysis.hasData ? `${analysis.totalPrompts} prompts • ${analysis.totalResponses || 0} tests` : 'No data'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Created {formatDate(analysis.createdAt)}</span>
                  {analysis.hasData && analysis.lastCalculated && (
                    <>
                      <span>•</span>
                      <span>Updated {formatDate(analysis.lastCalculated)}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                  {analysis.url}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={fetchAnalyses}
        className="h-8 w-8 p-0"
        title="Refresh analyses"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>

      <Button 
        onClick={handleStartNewAnalysis}
        className="h-8 px-3 text-sm"
        title="Start new analysis"
      >
        <Plus className="w-4 h-4 mr-1" />
        New Analysis
      </Button>
    </div>
  )
}
