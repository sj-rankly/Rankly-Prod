import { Dashboard } from '@/components/Dashboard'

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  // ✅ Pass urlAnalysisId from URL params to Dashboard component
  const urlAnalysisId = params.analysisId as string | undefined
  return <Dashboard initialTab={params.tab as string} urlAnalysisId={urlAnalysisId} />
}
