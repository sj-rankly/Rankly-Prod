'use client'

import { useEffect, useState } from 'react'

interface DualIframeViewerProps {
  originalUrl: string | null
  regeneratedPreviewUrl: string | null
  originalTitle?: string
  regeneratedTitle?: string
  isLoading?: boolean
}

export function DualIframeViewer({
  originalUrl,
  regeneratedPreviewUrl,
  originalTitle = 'Current Design',
  regeneratedTitle = 'Proposed Design',
  isLoading = false,
}: DualIframeViewerProps) {
  const [originalLoaded, setOriginalLoaded] = useState(false)
  const [regeneratedLoaded, setRegeneratedLoaded] = useState(false)

  useEffect(() => {
    setOriginalLoaded(false)
    setRegeneratedLoaded(false)
  }, [originalUrl, regeneratedPreviewUrl])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[90vh]">
      {/* Current Design */}
      <div className="border rounded-xl overflow-hidden flex flex-col relative">
        {originalUrl ? (
          <>
            {!originalLoaded && isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10 pointer-events-none">
                <div className="text-sm text-muted-foreground">Loading current page...</div>
              </div>
            )}
            <iframe
              src={originalUrl}
              className="w-full flex-1 border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
              onLoad={() => setOriginalLoaded(true)}
              title={originalTitle}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/50">
            <div className="text-sm text-muted-foreground text-center p-4">
              {isLoading ? 'Loading current page...' : 'No original page URL available'}
            </div>
          </div>
        )}
      </div>

      {/* Proposed Design */}
      <div className="border rounded-xl overflow-hidden flex flex-col relative">
        {regeneratedPreviewUrl ? (
          <>
            {!regeneratedLoaded && isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10 pointer-events-none">
                <div className="text-sm text-muted-foreground">Generating preview...</div>
              </div>
            )}
            <iframe
              src={regeneratedPreviewUrl}
              className="w-full flex-1 border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => setRegeneratedLoaded(true)}
              title={regeneratedTitle}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/50">
            <div className="text-sm text-muted-foreground text-center p-4">
              {isLoading ? 'Generating preview...' : 'Regenerate content to see preview'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

