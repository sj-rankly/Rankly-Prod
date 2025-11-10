'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageList } from '@/components/tabs/pages/PageList'
import { useFilters } from '@/contexts/FilterContext'
import { checkGA4Connection } from '@/services/ga4Api'
import type { Range } from '@/types/traffic'
import { Badge } from '@/components/ui/badge'
import { fetchActionablePages } from '@/services/actionablesService'

const DEFAULT_DATE_RANGE = '30 days'
const GA4_CONNECTION_QUERY_KEY = ['ga4-connection-status']

function buildDateRange(label: string): Range {
  const parsed = Number.parseInt(label, 10)
  const windowInDays = Number.isFinite(parsed) && parsed > 0 ? parsed : 30

  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  const from = new Date(now)
  from.setDate(now.getDate() - (windowInDays - 1))
  from.setHours(0, 0, 0, 0)

  return { from, to }
}

export default function ActionablesDashboard() {
  const { selectedAnalysisId } = useFilters()
  const [selectedDateRange] = useState<string>(DEFAULT_DATE_RANGE)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const {
    data: ga4Connection,
    isLoading: isGa4ConnectionLoading,
    error: ga4ConnectionError,
  } = useQuery({
    queryKey: GA4_CONNECTION_QUERY_KEY,
    queryFn: async () => {
      const response = await checkGA4Connection()
      if (!response.success) {
        throw new Error(response.error || 'Unable to determine GA4 connection status')
      }
      return response.data ?? null
    },
    staleTime: 5 * 60 * 1000,
  })

  const range = useMemo<Range>(() => buildDateRange(selectedDateRange), [selectedDateRange])
  const analysisReady = Boolean(selectedAnalysisId)
  const isGa4Connected = Boolean(ga4Connection?.connected && ga4Connection?.isActive)
  const ga4ConnectionErrorMessage =
    ga4ConnectionError instanceof Error ? ga4ConnectionError.message : null
  const {
    data: actionableData,
    isLoading: isActionablesLoading,
    isFetching: isActionablesFetching,
    error: actionablesError,
    refetch: refetchActionables,
  } = useQuery({
    queryKey: ['actionables-pages', selectedDateRange],
    queryFn: () =>
      fetchActionablePages({
        dateRangeLabel: selectedDateRange,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const actionablesErrorMessage =
    actionablesError instanceof Error ? actionablesError.message : null
  const actionableRows = actionableData?.rows ?? []
  const actionableWarnings = actionableData?.warnings ?? []
  const highestSessions = actionableData?.metadata.ga4.highestSessions
  const lowTrafficThreshold = actionableData?.metadata.ga4.lowTrafficThreshold
  const displayThreshold = actionableData?.metadata.ga4.displayThreshold
  const isInitialActionablesLoading =
    (isActionablesLoading || isActionablesFetching) && actionableRows.length === 0

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ActionablesPage] State snapshot', {
        analysisReady,
        isGa4Connected,
        isInitialActionablesLoading,
        rows: actionableRows.length,
        highestSessions,
        lowTrafficThreshold,
        warnings: actionableWarnings,
        error: actionablesErrorMessage,
      })
    }
  }, [
    analysisReady,
    isGa4Connected,
    isInitialActionablesLoading,
    actionableRows.length,
    highestSessions,
    lowTrafficThreshold,
    actionableWarnings,
    actionablesErrorMessage,
  ])

  const analysisBadgeVariant = !isHydrated
    ? 'outline'
    : analysisReady
      ? 'default'
      : 'secondary'

  const analysisBadgeLabel = !isHydrated
    ? 'Answer Engine Analysis: Checking…'
    : analysisReady
      ? 'Answer Engine Analysis: Ready'
      : 'Answer Engine Analysis: Required'

  const ga4BadgeVariant = !isHydrated || isGa4ConnectionLoading
    ? 'outline'
    : isGa4Connected
      ? 'default'
      : 'secondary'

  const ga4BadgeLabel = !isHydrated
    ? 'GA4: Checking…'
    : isGa4ConnectionLoading
      ? 'GA4: Checking…'
      : isGa4Connected
        ? 'GA4: Connected'
        : 'GA4: Not Connected'

  const actionablesBadgeVariant = !isHydrated
    ? 'outline'
    : actionableRows.length > 0
      ? 'default'
      : 'outline'

  const actionablesBadgeLabel = !isHydrated
    ? 'Actionables: Checking…'
    : isInitialActionablesLoading
      ? 'Actionables: Loading…'
      : actionableRows.length > 0
        ? `Actionables: ${actionableRows.length}`
        : 'Actionables: No Matches Yet'

  const ga4AlertVisible = isHydrated && !isGa4Connected && !isGa4ConnectionLoading

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-neutral-950">
          <div className="px-2 py-4">
            <div className="space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight text-foreground">
                      Actionables
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Surface pages cited by answer engines that still need traffic optimisation.
                    </p>
                  </div>
                </div>

                {ga4ConnectionErrorMessage && (
                  <p className="text-sm text-destructive">
                    {ga4ConnectionErrorMessage}
                  </p>
                )}

                {ga4AlertVisible && (
                  <p className="text-sm text-muted-foreground">
                    Connect GA4 in Traffic Analytics to populate this tab with low LLM session pages.
                  </p>
                )}
              </section>

              <div>
                <PageList
                  range={range}
                  actionablePages={actionableRows}
                  warnings={actionableWarnings}
                  errorMessage={actionablesErrorMessage}
                  onRetry={refetchActionables}
                  dateRange={selectedDateRange}
                  isLoading={isInitialActionablesLoading}
                  lowTrafficThreshold={lowTrafficThreshold}
                  displayThreshold={displayThreshold}
                  highestSessions={highestSessions}
                  urlAnalysisId={selectedAnalysisId} // ✅ NEW: Pass urlAnalysisId for new features
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

