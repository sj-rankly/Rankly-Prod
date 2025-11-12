/**
 * Low / No Traffic Pages Tab - Actionables Module
 *
 * Identifies pages with low or zero LLM traffic and suggests content actions
 */

'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface LowTrafficPage {
  id: string
  title: string
  url: string
  sessions: number
  trafficBand: 'Zero' | 'Very Low' | 'Low'
  hasCitation: boolean
  suggestedAction: 'Create New Content' | 'Regenerate Content'
}

export function LowTrafficPagesTab() {
  const [selectedPage, setSelectedPage] = useState<LowTrafficPage | null>(null)

  // Mock data for demonstration
  const mockLowTrafficPages: LowTrafficPage[] = [
    {
      id: '1',
      title: 'AI Tools Comparison Guide',
      url: 'https://acme.com/ai-tools-comparison',
      sessions: 12,
      trafficBand: 'Very Low',
      hasCitation: true,
      suggestedAction: 'Regenerate Content'
    },
    {
      id: '2',
      title: 'Pricing Plans',
      url: 'https://acme.com/pricing',
      sessions: 12,
      trafficBand: 'Very Low',
      hasCitation: true,
      suggestedAction: 'Regenerate Content'
    },
    {
      id: '3',
      title: 'API Documentation',
      url: 'https://acme.com/docs/api',
      sessions: 0,
      trafficBand: 'Zero',
      hasCitation: false,
      suggestedAction: 'Create New Content'
    },
    {
      id: '4',
      title: 'Getting Started Guide',
      url: 'https://acme.com/getting-started',
      sessions: 8,
      trafficBand: 'Low',
      hasCitation: false,
      suggestedAction: 'Create New Content'
    },
    {
      id: '5',
      title: 'Contact Us',
      url: 'https://acme.com/contact',
      sessions: 3,
      trafficBand: 'Very Low',
      hasCitation: true,
      suggestedAction: 'Regenerate Content'
    }
  ]

  const openPanel = (page: LowTrafficPage) => {
    setSelectedPage(page)
    // In a real implementation, this would open a side panel
    console.log('Opening panel for:', page.title)
  }

  const getTrafficBadgeVariant = (trafficBand: string) => {
    switch (trafficBand) {
      case 'Zero':
        return 'destructive'
      case 'Very Low':
        return 'secondary'
      case 'Low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getActionBadgeVariant = (hasCitation: boolean) => {
    return hasCitation ? 'secondary' : 'default'
  }

  // Empty state if no low traffic pages
  if (mockLowTrafficPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          🎉 All your pages are performing well. No low-traffic pages detected.
        </p>
      </div>
    )
  }

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Low / No Traffic Pages</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Identify pages below significance threshold and take content actions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1 text-xs">30 days</Badge>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-[880px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[360px]">Page</TableHead>
                    <TableHead className="text-center w-[140px]">LLM Traffic</TableHead>
                    <TableHead className="text-center w-[120px]">Citation</TableHead>
                    <TableHead className="text-center w-[200px]">Suggested Action</TableHead>
                    <TableHead className="text-center w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {mockLowTrafficPages.map((page) => (
                    <TableRow key={page.id} className="hover:bg-muted/50 transition-colors">
                      {/* 1. Page */}
                      <TableCell className="text-left">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {page.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            <a 
                              href={page.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:text-primary transition-colors"
                            >
                              {page.url}
                            </a>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Traffic */}
                      <TableCell className="text-center">
                        <Badge variant={getTrafficBadgeVariant(page.trafficBand)}>
                          {page.trafficBand}
                        </Badge>
                      </TableCell>

                      {/* 3. Citation */}
                      <TableCell className="text-center">
                        {page.hasCitation ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No
                          </Badge>
                        )}
                      </TableCell>

                      {/* 4. Action */}
                      <TableCell className="text-center">
                        <Badge
                          variant={getActionBadgeVariant(page.hasCitation)}
                          className="font-medium"
                        >
                          {page.suggestedAction}
                        </Badge>
                      </TableCell>

                      {/* 5. Right Arrow */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPanel(page)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted/70"
                        >
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
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
  )
}




