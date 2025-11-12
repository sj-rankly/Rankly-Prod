'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // No caching - always fetch fresh data
        gcTime: 0, // Don't keep data in cache (renamed from cacheTime in v5)
        refetchOnMount: 'always', // Always refetch on mount
        refetchOnWindowFocus: true, // Refetch when window regains focus
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

