'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, TestTube2, X } from 'lucide-react';

export function TestScrapingSection() {
  const [isOpen, setIsOpen] = useState(true); // ✅ Open by default for visibility
  const [url, setUrl] = useState('https://www.krvvy.com/blogs/wardrobe-wisdom/3-tips-to-choose-the-best-shapewear-for-plus-size');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const testScraping = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setScreenshot(null); // Reset screenshot

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/actionables/page-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to scrape');
    } finally {
      setLoading(false);
    }
  };

  const fetchScreenshot = async () => {
    setScreenshotLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/actionables/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to capture screenshot`);
      }

      const data = await response.json();
      setScreenshot(data.data.screenshot);
    } catch (err: any) {
      console.error('Screenshot error:', err);
      // Don't show error to user, just skip screenshot
    } finally {
      setScreenshotLoading(false);
    }
  };

  const openPreview = () => {
    setShowPreview(true);
    setIframeError(false); // Reset iframe error state
    setIframeLoading(true); // Reset iframe loading state
    setScreenshot(null); // Reset screenshot (will load if iframe fails)
  };

  const handleIframeError = () => {
    console.log('🚨 Iframe blocked, falling back to screenshot...');
    setIframeError(true);
    setIframeLoading(false);
    fetchScreenshot(); // Fallback to screenshot
  };

  const handleIframeLoad = () => {
    console.log('✅ Iframe loaded successfully');
    setIframeLoading(false);
  };

  const presetUrls = [
    { name: 'Krvvy', url: 'https://www.krvvy.com/blogs/wardrobe-wisdom/3-tips-to-choose-the-best-shapewear-for-plus-size' },
    { name: 'Fibr.ai', url: 'https://fibr.ai' },
    { name: 'Example', url: 'https://example.com' },
  ];

  return (
    <div className="mb-8 border-b pb-6">
      <UnifiedCard className="border-4 border-dashed border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-lg">
        <UnifiedCardContent className="p-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <TestTube2 className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <div>
                <h3 className="font-semibold text-foreground">🧪 Test Scraping (DEV ONLY)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Test enhanced bot detection bypass & content filtering • Remove before production
                </p>
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {isOpen && (
            <div className="mt-6 space-y-4">
              {/* URL Input */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Test URL</label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL to scrape..."
                    className="flex-1 text-sm"
                  />
                  <Button onClick={testScraping} disabled={loading || !url} size="sm">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>

              {/* Preset URLs */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Quick test:</span>
                {presetUrls.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(preset.url)}
                    disabled={loading}
                    className="text-xs h-7"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-destructive">Failed</div>
                    <div className="text-xs text-muted-foreground mt-1">{error}</div>
                  </div>
                </div>
              )}

              {/* Bot Detection Error */}
              {result && !result.success && result.error?.code === 'BOT_DETECTION' && (
                <div className="rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-lg text-foreground">{result.error.solution?.title || '🤖 Bot Detection Detected'}</div>
                      <div className="text-sm text-muted-foreground mt-1">{result.error.message}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 rounded-md p-4 mb-4">
                    <div className="font-semibold text-sm mb-2 text-foreground">Solution:</div>
                    <ol className="text-sm space-y-2 text-foreground">
                      {result.error.solution?.instructions?.map((instruction: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-orange-600 dark:text-orange-500 font-bold">{i + 1}.</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  
                  {result.error.solution?.alternativeInstructions && (
                    <div className="bg-white dark:bg-gray-900 rounded-md p-4 border border-dashed border-gray-300">
                      <div className="font-semibold text-sm mb-2 text-foreground">Alternative:</div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        {result.error.solution.alternativeInstructions.map((alt: string, i: number) => (
                          <div key={i}>• {alt}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success */}
              {result && result.success && (
                <>
                  <div className="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/10 p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-foreground">Success</div>
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {result.data?.metadata?.contentBlocks?.length || 0}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Blocks</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {result.data?.metadata?.paragraphCount || 0}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Paragraphs</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {result.data?.metadata?.headings?.length || 0}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Headings</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {result.data?.metadata?.htmlSnapshot
                              ? `${(result.data.metadata.htmlSnapshot.length / 1024).toFixed(0)}KB`
                              : '0KB'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">HTML</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning for no content */}
                  {(!result.data?.metadata?.contentBlocks?.length ||
                    result.data.metadata.contentBlocks.length === 0) && (
                    <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-semibold text-foreground">No Content Extracted</div>
                        <div className="text-muted-foreground mt-1">
                          Content might be filtered (header/footer) or text doesn&apos;t meet criteria
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 text-xs bg-muted/30 rounded-md p-3">
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="text-foreground font-medium">
                        {result.data?.metadata?.title || 'N/A'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <span className="text-muted-foreground">URL:</span>
                      <span className="text-foreground text-[10px] break-all">
                        {result.data?.resolvedUrl || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Visual Preview Button */}
                  {result.data?.markdown && (
                    <Button
                      type="button"
                      onClick={openPreview}
                      className="w-full"
                      size="lg"
                    >
                      👁️ Visual Preview (Original vs Scraped)
                    </Button>
                  )}

                  {/* Sample Content */}
                  {result.data?.markdown && (
                    <details className="group">
                      <summary className="text-xs font-medium text-foreground cursor-pointer hover:text-primary">
                        View Raw Extracted Content (click to expand)
                      </summary>
                      <div className="mt-2 bg-muted/50 rounded-md p-3 max-h-60 overflow-y-auto">
                        <pre className="text-[10px] text-foreground whitespace-pre-wrap font-mono">
                          {result.data.markdown.slice(0, 1000)}
                          {result.data.markdown.length > 1000 && '\n\n... (truncated)'}
                        </pre>
                      </div>
                    </details>
                  )}
                </>
              )}

              {/* Features Info */}
              <div className="grid md:grid-cols-2 gap-3 text-[10px] pt-2 border-t">
                <div>
                  <div className="font-medium text-foreground mb-1">Bot Detection Bypass:</div>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>✓ Chrome 131 user agent</div>
                    <div>✓ navigator.webdriver hidden</div>
                    <div>✓ Mock plugins & platform</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Filtered Elements:</div>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>✓ Headers & footers</div>
                    <div>✓ Banners & nav elements</div>
                    <div>✓ Newsletter forms</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Visual Preview Modal - SIDE-BY-SIDE WITH SCREENSHOT */}
      {showPreview && result?.data && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {!iframeError ? '🌐 Side-by-Side Comparison' : '📸 Side-by-Side Comparison'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {!iframeError 
                    ? 'Original page (iframe) vs. extracted content' 
                    : 'Original screenshot vs. extracted content (iframe blocked)'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Stats Bar */}
            <div className="px-4 py-2 bg-muted/50 border-b">
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">Blocks:</span>
                  <span className="font-bold text-foreground">{result.data.metadata?.contentBlocks?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-muted-foreground">Paragraphs:</span>
                  <span className="font-bold text-foreground">{result.data.metadata?.paragraphCount || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-muted-foreground">Headings:</span>
                  <span className="font-bold text-foreground">{(result.data.metadata?.headings?.h1?.length || 0) + (result.data.metadata?.headings?.h2?.length || 0) + (result.data.metadata?.headings?.h3?.length || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-muted-foreground">Characters:</span>
                  <span className="font-bold text-foreground">{result.data.markdown?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Side-by-Side Content */}
            <div className="grid grid-cols-2 gap-0 max-h-[calc(95vh-120px)] overflow-hidden">
              {/* LEFT: Original Page (Iframe → Screenshot Fallback) */}
              <div className="border-r flex flex-col">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs">ORIGINAL</span>
                    {!iframeError ? 'Live Page' : 'Screenshot'}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950 relative">
                  {/* 1️⃣ TRY IFRAME FIRST */}
                  {!iframeError && (
                    <>
                      {iframeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-950 z-10">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                            <span className="text-sm text-muted-foreground mt-2 block">Loading iframe...</span>
                          </div>
                        </div>
                      )}
                      <iframe
                        src={url}
                        className="w-full h-full border-0"
                        title="Original page"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    </>
                  )}

                  {/* 2️⃣ FALLBACK TO SCREENSHOT IF IFRAME FAILS */}
                  {iframeError && (
                    <div className="p-4 h-full overflow-y-auto">
                      {screenshotLoading && (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                            <span className="text-sm text-muted-foreground mt-2 block">Capturing screenshot...</span>
                            <p className="text-xs text-muted-foreground mt-1">(Iframe was blocked by X-Frame-Options)</p>
                          </div>
                        </div>
                      )}
                      {!screenshotLoading && screenshot && (
                        <img 
                          src={screenshot} 
                          alt="Original page screenshot" 
                          className="w-full border rounded shadow-lg"
                        />
                      )}
                      {!screenshotLoading && !screenshot && (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm font-semibold">Preview unavailable</p>
                            <p className="text-xs mt-1">Iframe blocked & screenshot failed</p>
                            <Button
                              onClick={() => window.open(url, '_blank')}
                              size="sm"
                              variant="outline"
                              className="mt-3"
                            >
                              Open Original Page
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Extracted Content */}
              <div className="flex flex-col">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border-b">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs">EXTRACTED</span>
                    Content
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 p-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {/* Title */}
                    <div className="mb-4 pb-3 border-b">
                      <h1 className="text-2xl font-bold text-foreground mb-2">
                        {result.data.metadata?.title || 'Untitled'}
                      </h1>
                    </div>

                    {/* Content Blocks */}
                    <div className="space-y-3">
                      {result.data.metadata?.contentBlocks?.map((block: any, i: number) => (
                        <div key={i}>
                          {block.type === 'h1' && (
                            <h1 className="text-xl font-bold text-foreground mb-2 pb-2 border-b">{block.text}</h1>
                          )}
                          {block.type === 'h2' && (
                            <h2 className="text-lg font-bold text-foreground mb-2 mt-4">{block.text}</h2>
                          )}
                          {block.type === 'h3' && (
                            <h3 className="text-base font-semibold text-foreground mb-1 mt-3">{block.text}</h3>
                          )}
                          {block.type === 'p' && (
                            <p className="text-sm text-foreground leading-relaxed mb-2">
                              {block.text}
                            </p>
                          )}
                          {block.type === 'li' && (
                            <li className="text-sm text-foreground ml-4">
                              {block.text}
                            </li>
                          )}
                          {block.type === 'blockquote' && (
                            <blockquote className="border-l-4 border-blue-500 pl-3 italic text-muted-foreground my-3">
                              {block.text}
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* If no content blocks, show raw markdown */}
                    {(!result.data.metadata?.contentBlocks || result.data.metadata.contentBlocks.length === 0) && (
                      <div className="whitespace-pre-wrap text-sm text-foreground font-mono">
                        {result.data.markdown}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

