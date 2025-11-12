'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface NavigationArrowsProps {
  previousPath?: string
  nextPath?: string
  onPrevious?: () => void
  onNext?: () => void
  showPrevious?: boolean
  showNext?: boolean
}

export function NavigationArrows({
  previousPath,
  nextPath,
  onPrevious,
  onNext,
  showPrevious = true,
  showNext = true
}: NavigationArrowsProps) {
  const router = useRouter()

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    }
    if (previousPath) {
      router.push(previousPath)
    }
  }

  const handleNext = () => {
    if (onNext) {
      onNext()
    }
    if (nextPath) {
      router.push(nextPath)
    }
  }

  return (
    <>
      {/* Previous Arrow - Top Left inside card */}
      {showPrevious && previousPath && (
        <button
          onClick={handlePrevious}
          className="absolute top-4 left-4 z-10 w-7 h-7 flex items-center justify-center hover:opacity-70 transition-opacity duration-200"
          aria-label="Previous step"
        >
          <svg className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next Arrow - Top Right inside card */}
      {showNext && nextPath && (
        <button
          onClick={handleNext}
          className="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center hover:opacity-70 transition-opacity duration-200"
          aria-label="Next step"
        >
          <svg className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </>
  )
}
