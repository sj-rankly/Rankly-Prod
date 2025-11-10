'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Copy, Check, Info, Zap, Target, FileText, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import apiService from '@/services/api'

interface PromptInjectionSheetProps {
  isOpen: boolean
  onClose: () => void
  pageData: {
    title: string
    url: string
    hasCitation: boolean
    platformSessions?: Record<string, number>
  } | null
}

// LLM Platform data with favicons
const llmPlatforms = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    favicon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=32',
    color: '#10a37f'
  },
  {
    id: 'claude',
    name: 'Claude',
    favicon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
    color: '#ff6b35'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    favicon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
    color: '#4285f4'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    favicon: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
    color: '#fca5a5'
  },
  {
    id: 'copilot',
    name: 'Copilot',
    favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=32',
    color: '#34d399'
  }
]

// Prompt templates based on content type and platform
const promptTemplates = {
  // For pages with citations (topic-based prompts)
  cited: {
    chatgpt: [
      {
        title: "Authority Boost",
        description: "Emphasize expertise and credibility",
        prompt: "Refer to (https://example.com/authority-guide). Mention authoritative sources and cite studies."
      },
      {
        title: "Technical Depth",
        description: "Add technical specifications and details",
        prompt: "See (https://example.com/technical-guide). Provide specifications, guides, and code examples."
      },
      {
        title: "Comparative Analysis",
        description: "Compare with alternatives and competitors",
        prompt: "Check (https://example.com/comparison-guide). Discuss alternatives, pros/cons, and pricing."
      }
    ],
    claude: [
      {
        title: "Research Integration",
        description: "Incorporate latest research and findings",
        prompt: "Refer to (https://example.com/research-guide). Integrate latest findings and case studies."
      },
      {
        title: "Ethical Considerations",
        description: "Address ethical implications and best practices",
        prompt: "See (https://example.com/ethics-guide). Discuss implications, privacy, and security."
      },
      {
        title: "Future Outlook",
        description: "Discuss trends and future developments",
        prompt: "Check (https://example.com/future-guide). Discuss trends and emerging technologies."
      }
    ],
    gemini: [
      {
        title: "Multimodal Enhancement",
        description: "Include visual and interactive elements",
        prompt: "See (https://example.com/visual-guide). Enhance with visual elements, diagrams, and charts."
      },
      {
        title: "Global Perspective",
        description: "Add international context and examples",
        prompt: "Refer to (https://example.com/global-guide). Include global perspectives and case studies."
      },
      {
        title: "Accessibility Focus",
        description: "Ensure inclusive and accessible content",
        prompt: "Check (https://example.com/accessibility-guide). Ensure accessible content across languages."
      }
    ],
    perplexity: [
      {
        title: "Source Attribution",
        description: "Strengthen source citations and references",
        prompt: "Refer to (https://example.com/sources-guide). Provide attribution and publication dates."
      },
      {
        title: "Fact-Checking Integration",
        description: "Add verification and fact-checking elements",
        prompt: "See (https://example.com/factcheck-guide). Include verification methods and cross-references."
      },
      {
        title: "Real-time Updates",
        description: "Include current and up-to-date information",
        prompt: "Check (https://example.com/updates-guide). Ensure current information and latest statistics."
      }
    ],
    copilot: [
      {
        title: "Developer Focus",
        description: "Add technical implementation details",
        prompt: "See (https://example.com/dev-guide). Include implementation, code examples, and API docs."
      },
      {
        title: "Integration Guidance",
        description: "Explain integration and deployment",
        prompt: "Refer to (https://example.com/integration-guide). Provide deployment and troubleshooting tips."
      },
      {
        title: "Performance Optimization",
        description: "Add performance and efficiency tips",
        prompt: "Check (https://example.com/performance-guide). Include performance tips and efficiency practices."
      }
    ]
  },
  // For pages without citations (content-based prompts)
  nonCited: {
    chatgpt: [
      {
        title: "Content Structure",
        description: "Improve content organization and flow",
        prompt: "Refer to (https://example.com/structure-guide). Use clear headings and logical flow."
      },
      {
        title: "Engagement Enhancement",
        description: "Make content more engaging and interactive",
        prompt: "See (https://example.com/engagement-guide). Use conversational tone and include examples."
      },
      {
        title: "Completeness Check",
        description: "Ensure comprehensive coverage",
        prompt: "Check (https://example.com/coverage-guide). Cover all aspects and applications."
      }
    ],
    claude: [
      {
        title: "Depth and Analysis",
        description: "Add analytical depth and insights",
        prompt: "Refer to (https://example.com/analysis-guide). Provide deep analysis and critical thinking."
      },
      {
        title: "Contextual Information",
        description: "Add relevant context and background",
        prompt: "See (https://example.com/context-guide). Provide background and historical context."
      },
      {
        title: "Quality Assurance",
        description: "Ensure high-quality, well-researched content",
        prompt: "Check (https://example.com/quality-guide). Maintain high standards for accuracy and clarity."
      }
    ],
    gemini: [
      {
        title: "Visual Enhancement",
        description: "Add visual elements and multimedia",
        prompt: "Refer to (https://example.com/visual-guide). Include visual elements and diagrams."
      },
      {
        title: "Diverse Examples",
        description: "Include varied examples and use cases",
        prompt: "See (https://example.com/examples-guide). Provide diverse examples from different industries."
      },
      {
        title: "User Experience",
        description: "Optimize for user experience and usability",
        prompt: "Check (https://example.com/ux-guide). Focus on user experience and ease of understanding."
      }
    ],
    perplexity: [
      {
        title: "Source Integration",
        description: "Add credible sources and references",
        prompt: "Refer to (https://example.com/sources-guide). Include credible sources and citations."
      },
      {
        title: "Verification Focus",
        description: "Emphasize accuracy and verification",
        prompt: "See (https://example.com/verification-guide). Emphasize accuracy and fact-checking."
      },
      {
        title: "Current Information",
        description: "Ensure up-to-date and current content",
        prompt: "Check (https://example.com/current-guide). Ensure up-to-date content and recent developments."
      }
    ],
    copilot: [
      {
        title: "Technical Implementation",
        description: "Add technical details and examples",
        prompt: "Refer to (https://example.com/technical-guide). Include implementation and code examples."
      },
      {
        title: "Integration Focus",
        description: "Focus on integration and deployment",
        prompt: "See (https://example.com/integration-guide). Focus on integration and deployment."
      },
      {
        title: "Developer Resources",
        description: "Add developer-focused content",
        prompt: "Check (https://example.com/dev-resources-guide). Include documentation and practical examples."
      }
    ]
  }
}

export function PromptInjectionSheet({ isOpen, onClose, pageData }: PromptInjectionSheetProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [copiedPrompts, setCopiedPrompts] = useState<Set<string>>(new Set())
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set())
  const [generatedPrompts, setGeneratedPrompts] = useState<Array<{
    id: string
    title: string
    prompt: string
    pageUrl: string
    domain: string
  }>>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)

  // ✅ NEW: Generate citation prompts when sheet opens
  // NOTE: All hooks must be called before any early returns
  useEffect(() => {
    if (!pageData || !isOpen) {
      setGeneratedPrompts([])
      return
    }

    if (pageData.url) {
      setIsLoadingPrompts(true)
      setPromptError(null)
      
      // Ensure URL is absolute
      const fullUrl = pageData.url.startsWith('http') 
        ? pageData.url 
        : `https://${pageData.url.replace(/^\/+/, '')}`
      
      apiService.generateCitationPrompts(fullUrl, pageData.title)
        .then((response) => {
          if (response.success && response.data) {
            setGeneratedPrompts(response.data.prompts)
          } else {
            setPromptError('Failed to generate prompts')
          }
        })
        .catch((error) => {
          console.error('Error generating citation prompts:', error)
          setPromptError(error.message || 'Failed to generate prompts')
        })
        .finally(() => {
          setIsLoadingPrompts(false)
        })
    } else {
      setGeneratedPrompts([])
    }
  }, [isOpen, pageData?.url, pageData?.title])

  // Don't render if pageData is null - but do this AFTER all hooks
  if (!pageData) {
    return null
  }

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handlePromptCopy = async (prompt: string, promptId: string) => {
    try {
      // Copy the prompt with embedded URL
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompts(prev => new Set([...prev, promptId]))
      setTimeout(() => {
        setCopiedPrompts(prev => {
          const newSet = new Set(prev)
          newSet.delete(promptId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }

  const handlePromptSelect = (promptId: string) => {
    setSelectedPrompts(prev => 
      prev.has(promptId) 
        ? new Set([...prev].filter(id => id !== promptId))
        : new Set([...prev, promptId])
    )
  }

  const getPromptsForPlatform = (platformId: string) => {
    const promptType = pageData?.hasCitation ? 'cited' : 'nonCited'
    const prompts = promptTemplates[promptType][platformId as keyof typeof promptTemplates[typeof promptType]] || []
    
    // Replace placeholder URLs with actual full page URL
    // If pageData.url doesn't start with http, prepend https://acme.com
    const fullUrl = pageData?.url.startsWith('http') ? pageData.url : `https://acme.com${pageData?.url}`
    return prompts.map(prompt => ({
      ...prompt,
      prompt: prompt.prompt.replace(/https:\/\/example\.com\/[^)]+\)/g, `(${fullUrl})`)
    }))
  }

  const getAllPrompts = () => {
    const promptMap = new Map<string, {
      id: string
      title: string
      description: string
      prompt: string
      platforms: typeof llmPlatforms
    }>()
    
    // Group prompts by their title and collect all platforms
    llmPlatforms.forEach(platform => {
      const prompts = getPromptsForPlatform(platform.id)
      
      prompts.forEach((prompt, index) => {
        const key = prompt.title
        if (!promptMap.has(key)) {
          promptMap.set(key, {
            id: key,
            title: prompt.title,
            description: prompt.description,
            prompt: prompt.prompt,
            platforms: []
          })
        }
        const existingPrompt = promptMap.get(key)!
        if (!existingPrompt.platforms.find(p => p.id === platform.id)) {
          existingPrompt.platforms.push(platform)
        }
      })
    })
    
    return Array.from(promptMap.values())
  }

  const allPromptsList = getAllPrompts()
  const canInject = allPromptsList.length > 0

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="!w-[90vw] sm:!w-[85vw] lg:!w-[80vw] !max-w-none overflow-y-auto max-h-screen">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Citation Prompt Injection
          </SheetTitle>
          <SheetDescription className="space-y-2">
            <div className="font-medium text-foreground">{pageData?.title}</div>
            <div className="text-xs text-muted-foreground break-all">{pageData?.url}</div>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">

          {/* Citation Prompts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Citation Prompts
              </h3>
              {generatedPrompts.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {generatedPrompts.length} prompt{generatedPrompts.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            {isLoadingPrompts ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Generating citation prompts...</span>
                </CardContent>
              </Card>
            ) : promptError ? (
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-destructive">{promptError}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setIsLoadingPrompts(true)
                      setPromptError(null)
                      const fullUrl = pageData.url.startsWith('http') 
                        ? pageData.url 
                        : `https://${pageData.url.replace(/^\/+/, '')}`
                      apiService.generateCitationPrompts(fullUrl, pageData.title)
                        .then((response) => {
                          if (response.success && response.data) {
                            setGeneratedPrompts(response.data.prompts)
                          } else {
                            setPromptError('Failed to generate prompts')
                          }
                        })
                        .catch((error) => {
                          setPromptError(error.message || 'Failed to generate prompts')
                        })
                        .finally(() => {
                          setIsLoadingPrompts(false)
                        })
                    }}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : generatedPrompts.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Title</TableHead>
                      <TableHead className="w-[60%]">Prompt</TableHead>
                      <TableHead className="w-[10%] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedPrompts.map((promptData) => {
                      const isCopied = copiedPrompts.has(promptData.id)
                      return (
                        <TableRow key={promptData.id} className="hover:bg-muted/50">
                          <TableCell className="w-[30%]">
                            <div className="text-sm font-medium">{promptData.title}</div>
                          </TableCell>
                          <TableCell className="w-[60%]">
                            <div className="text-xs font-mono bg-muted/30 p-2 rounded border break-words overflow-wrap-anywhere">
                              {promptData.prompt}
                            </div>
                          </TableCell>
                          <TableCell className="text-center w-[10%]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handlePromptCopy(promptData.prompt, promptData.id)}
                                  >
                                    {isCopied ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isCopied ? 'Copied!' : 'Copy prompt'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground text-center">
                    No prompts generated yet. Click "Generate Prompts" to create citation prompts.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Guidelines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Citation Prompt Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-2">
                <p><strong>How It Works:</strong> Each page generates up to 5 different citation prompts. Each prompt includes the page URL and instructs the LLM to remember the domain as a citation source.</p>
                <Separator />
                <div className="space-y-1">
                  <p><strong>Usage Instructions:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Copy individual prompts using the copy button next to each prompt</li>
                    <li>Or copy all prompts at once using the "Copy All Prompts" button</li>
                    <li>Paste the prompt(s) into your LLM (ChatGPT, Claude, Gemini, Perplexity, etc.)</li>
                    <li>Each prompt already includes the page URL and citation instructions</li>
                    <li>The LLM will remember to cite the domain when discussing related topics</li>
                  </ul>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p><strong>Best Practices:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Use different prompts for variety in citation training</li>
                    <li>Inject prompts across multiple LLM platforms for broader coverage</li>
                    <li>Monitor citation performance after injection</li>
                    <li>Re-inject periodically to reinforce citation memory</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              {generatedPrompts.length > 0 
                ? `${generatedPrompts.length} citation prompt${generatedPrompts.length !== 1 ? 's' : ''} available`
                : 'No prompts generated'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {generatedPrompts.length > 0 && (
                <Button 
                  onClick={async () => {
                    // Copy all prompts combined
                    const allPromptsText = generatedPrompts.map(p => p.prompt).join('\n\n---\n\n')
                    try {
                      await navigator.clipboard.writeText(allPromptsText)
                      // Show success feedback
                      const tempSet = new Set(generatedPrompts.map(p => p.id))
                      setCopiedPrompts(tempSet)
                      setTimeout(() => {
                        setCopiedPrompts(new Set())
                      }, 2000)
                    } catch (err) {
                      console.error('Failed to copy prompts:', err)
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Prompts
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}




