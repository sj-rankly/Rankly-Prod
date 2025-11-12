'use client'

import { useState, useEffect } from 'react'
import apiService from '@/services/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UrlAnalysis {
  id: string
  url: string
  companyName: string
  analysisDate: string
  status: string
}

interface URLSelectorProps {
  value?: string
  onChange: (urlAnalysisId: string) => void
}

export function URLSelector({ value, onChange }: URLSelectorProps) {
  const [urlAnalyses, setUrlAnalyses] = useState<UrlAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUrlAnalyses()
  }, [])

  const fetchUrlAnalyses = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiService.getUrlAnalyses()

      if (response.success && response.data) {
        setUrlAnalyses(response.data)

        // Auto-select the most recent URL if no value is set
        if (!value && response.data.length > 0) {
          onChange(response.data[0].id)
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch URL analyses:', err)
      setError(err.message || 'Failed to load analyzed URLs')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        Loading URLs...
      </div>
    )
  }

  if (error || urlAnalyses.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-muted-foreground">
        {error || 'No analyzed URLs found'}
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Select analyzed URL" />
      </SelectTrigger>
      <SelectContent>
        {urlAnalyses.map((analysis) => (
          <SelectItem key={analysis.id} value={analysis.id}>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{analysis.companyName}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                {analysis.url}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(analysis.analysisDate).toLocaleDateString()}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
