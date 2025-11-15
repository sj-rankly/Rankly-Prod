'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function TestScrapingPage() {
  const [url, setUrl] = useState('https://www.krvvy.com/blogs/wardrobe-wisdom/3-tips-to-choose-the-best-shapewear-for-plus-size');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testScraping = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

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

  const presetUrls = [
    { name: 'Krvvy Blog', url: 'https://www.krvvy.com/blogs/wardrobe-wisdom/3-tips-to-choose-the-best-shapewear-for-plus-size' },
    { name: 'Fibr.ai', url: 'https://fibr.ai' },
    { name: 'Example.com', url: 'https://example.com' },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">🧪 Test Page Scraping</h1>
          <p className="text-muted-foreground mt-2">
            Test the enhanced scraping infrastructure with bot detection bypass and improved filtering
          </p>
        </div>

        <UnifiedCard>
          <UnifiedCardContent className="space-y-4 p-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Test URL
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to scrape..."
                  className="flex-1"
                />
                <Button onClick={testScraping} disabled={loading || !url}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    'Test Scraping'
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Presets:</span>
              {presetUrls.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => setUrl(preset.url)}
                  disabled={loading}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </UnifiedCardContent>
        </UnifiedCard>

        {error && (
          <UnifiedCard className="border-destructive">
            <UnifiedCardContent className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">Scraping Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </UnifiedCardContent>
          </UnifiedCard>
        )}

        {result && (
          <>
            <UnifiedCard className="border-green-500">
              <UnifiedCardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Scraping Successful</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {result.data?.metadata?.contentBlocks?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Content Blocks</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {result.data?.metadata?.paragraphCount || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Paragraphs</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {result.data?.metadata?.headings?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Headings</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {result.data?.metadata?.htmlSnapshot
                            ? `${(result.data.metadata.htmlSnapshot.length / 1024).toFixed(1)}KB`
                            : '0KB'}
                        </div>
                        <div className="text-xs text-muted-foreground">HTML Size</div>
                      </div>
                    </div>
                  </div>
                </div>
              </UnifiedCardContent>
            </UnifiedCard>

            {(!result.data?.metadata?.contentBlocks?.length || result.data.metadata.contentBlocks.length === 0) && (
              <UnifiedCard className="border-yellow-500">
                <UnifiedCardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground">No Content Extracted</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        The page loaded successfully but no content blocks were extracted. This could mean:
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                        <li>Content is in header/footer/nav (correctly filtered out)</li>
                        <li>Content is dynamically loaded (JavaScript-heavy site)</li>
                        <li>Text doesn&apos;t meet meaningful content criteria</li>
                        <li>Unusual site structure</li>
                      </ul>
                    </div>
                  </div>
                </UnifiedCardContent>
              </UnifiedCard>
            )}

            <UnifiedCard>
              <UnifiedCardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Page Metadata</h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="text-foreground font-medium">
                        {result.data?.metadata?.title || 'N/A'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="text-foreground">
                        {result.data?.metadata?.description || 'N/A'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Resolved URL:</span>
                      <span className="text-foreground text-xs break-all">
                        {result.data?.resolvedUrl || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {result.data?.markdown && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Extracted Content</h3>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                        {result.data.markdown}
                      </pre>
                    </div>
                  </div>
                )}
              </UnifiedCardContent>
            </UnifiedCard>
          </>
        )}

        <UnifiedCard className="bg-muted/30">
          <UnifiedCardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">✅ Enhanced Scraping Features</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-foreground mb-2">Bot Detection Bypass</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Realistic user agent (Chrome 131)</li>
                  <li>✓ Extra HTTP headers</li>
                  <li>✓ navigator.webdriver override</li>
                  <li>✓ Mock plugins & platform</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Content Filtering</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Headers & footers</li>
                  <li>✓ Navigation elements</li>
                  <li>✓ Banners & announcements</li>
                  <li>✓ Newsletter forms</li>
                  <li>✓ Social links & badges</li>
                </ul>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>

        <div className="text-center text-sm text-muted-foreground">
          <p>⚠️ This is a test page - remove before production deployment</p>
        </div>
      </div>
    </div>
  );
}

