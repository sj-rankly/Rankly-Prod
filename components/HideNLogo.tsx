'use client'

import { useEffect } from 'react'

/**
 * Component to hide/remove the Next.js "N" logo watermark that appears in production
 * This logo typically appears in the bottom-right corner of the page
 * Works in both development and production, but only removes the watermark
 */
export function HideNLogo() {
  useEffect(() => {
    const removeNLogo = () => {
      // Method 1: Find and remove Next.js watermark by common selectors
      // The Next.js watermark typically has these characteristics:
      // - Fixed position, bottom-right corner
      // - Contains "N" text or Next.js logo
      // - Has specific classes or data attributes
      
      // Check for Next.js watermark in various possible locations
      const selectors = [
        // Common Next.js watermark selectors
        'a[href*="nextjs.org"]',
        'a[href*="vercel.com"]',
        '[class*="nextjs"]',
        '[id*="nextjs"]',
        '[data-nextjs]',
        // Bottom-right positioned elements with "N" text
        '[style*="position: fixed"][style*="bottom"][style*="right"]',
        '[style*="position:fixed"][style*="bottom"][style*="right"]',
      ]

      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach((element) => {
            const text = element.textContent?.trim() || ''
            const href = (element as HTMLElement).getAttribute('href') || ''
            
            // Check if it's likely the Next.js logo/watermark
            if (
              text === 'N' || 
              text.includes('Next.js') ||
              text.includes('Powered by') ||
              href.includes('nextjs.org') ||
              href.includes('vercel.com')
            ) {
              // Hide and remove
              ;(element as HTMLElement).style.display = 'none'
              ;(element as HTMLElement).style.visibility = 'hidden'
              ;(element as HTMLElement).style.opacity = '0'
              element.remove()
            }
          })
        } catch (e) {
          // Ignore selector errors
        }
      })

      // Method 2: Find fixed/absolute positioned elements in bottom-right with "N"
      const allElements = document.querySelectorAll('*')
      allElements.forEach((element) => {
        try {
          const styles = window.getComputedStyle(element)
          const isFixedOrAbsolute = styles.position === 'fixed' || styles.position === 'absolute'
          const isBottomRight = 
            (styles.bottom === '0px' || styles.bottom === '1rem' || styles.bottom === '1.5rem' || styles.bottom === '24px') &&
            (styles.right === '0px' || styles.right === '1rem' || styles.right === '1.5rem' || styles.right === '24px')
          
          if (isFixedOrAbsolute && isBottomRight) {
            const text = element.textContent?.trim() || ''
            const href = (element as HTMLElement).getAttribute('href') || ''
            
            // Check if it contains "N" or Next.js related text
            if (
              text === 'N' || 
              text === 'nextjs' ||
              text.includes('Next.js') ||
              href.includes('nextjs.org') ||
              href.includes('vercel.com')
            ) {
              ;(element as HTMLElement).style.display = 'none'
              ;(element as HTMLElement).style.visibility = 'hidden'
              ;(element as HTMLElement).style.opacity = '0'
              element.remove()
            }
          }
        } catch (e) {
          // Ignore errors
        }
      })

      // Method 3: Check sidebar footer for "N" logo (if using sidebar layout)
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        const footer = sidebar.querySelector('footer') || sidebar.lastElementChild
        if (footer) {
          const roundedElements = footer.querySelectorAll('[class*="rounded"], [class*="circle"]')
          roundedElements.forEach((element) => {
            const text = element.textContent?.trim() || ''
            if (text === 'N' || (text.length === 1 && text === 'N')) {
              ;(element as HTMLElement).style.display = 'none'
              element.remove()
            }
          })
        }
      }
    }

    // Run immediately
    removeNLogo()

    // Run after delays to catch dynamically injected elements
    const timeouts = [
      setTimeout(removeNLogo, 100),
      setTimeout(removeNLogo, 500),
      setTimeout(removeNLogo, 1000),
      setTimeout(removeNLogo, 2000),
    ]

    // Use MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
      removeNLogo()
    })

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
      observer.disconnect()
    }
  }, [])

  return null
}

