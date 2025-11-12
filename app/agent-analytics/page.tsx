'use client'

import { GA4AgentAnalyticsTab } from '@/components/tabs/agent-analytics/GA4AgentAnalyticsTab'
import { SetupOptionsSection } from '@/components/tabs/agent-analytics/SetupOptionsSection'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopNav } from '@/components/layout/TopNav'
import { SettingsModal } from '@/components/agent-analytics/modals/SettingsModal'
import { clearGA4Cache, checkGA4Connection } from '@/services/ga4Api'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function AgentAnalyticsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('platform')
  const [selectedDateRange, setSelectedDateRange] = useState('7 days')
  const [isSyncing, setIsSyncing] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  // Set active tab from URL params
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam && ['platform', 'pages', 'journey', 'geo-device'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Get last sync time
  useEffect(() => {
    setLastSyncTime(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
  }, [])

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('🔍 [AgentAnalyticsPage] Checking connection status...')
        const response = await checkGA4Connection()
        console.log('📦 [AgentAnalyticsPage] Connection response:', response)
        
        if (response.success && response.data?.connected && response.data?.isActive) {
          console.log('✅ [AgentAnalyticsPage] Already connected, setting isConnected to true')
          setIsConnected(true)
        } else {
          console.log('❌ [AgentAnalyticsPage] Not connected or not active')
          setIsConnected(false)
        }
      } catch (error) {
        console.error('❌ [AgentAnalyticsPage] Error checking connection:', error)
        setIsConnected(false)
      }
    }
    checkConnection()
  }, [])

  const handleSyncNow = async () => {
    setIsSyncing(true)
    try {
      // Clear GA4 cache and fetch fresh data
      await clearCacheAndRefresh()
      // Update last sync time
      setLastSyncTime(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    } catch (error) {
      console.error('Error during sync:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const clearCacheAndRefresh = async () => {
    try {
      const response = await clearGA4Cache()
      
      if (response.success) {
        console.log('✅ GA4 cache cleared successfully')
        toast.success('Cache cleared! Fetching fresh data...')
        // Trigger refresh by updating the refresh trigger
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.error('Failed to clear GA4 cache:', response.error)
        toast.error('Failed to clear cache. Please try again.')
      }
    } catch (error) {
      console.error('Error clearing GA4 cache:', error)
      toast.error('Error clearing cache. Please try again.')
    }
  }

  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range)
  }

  const handleSettings = () => {
    setSettingsModalOpen(true)
  }

  const handleDisconnect = async () => {
    // Handle disconnect logic
    setIsConnected(false)
  }

  const handleSetupComplete = async () => {
    console.log('🎉 [AgentAnalyticsPage] handleSetupComplete called')
    // Wait a moment for backend to process
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Refresh connection status
    try {
      const response = await checkGA4Connection()
      console.log('📦 [AgentAnalyticsPage] SetupComplete response:', response)
      
      if (response.success && response.data?.connected && response.data?.isActive) {
        console.log('✅ [AgentAnalyticsPage] Setup complete, setting isConnected to true')
        setIsConnected(true)
      } else {
        console.log('❌ [AgentAnalyticsPage] Setup complete but not connected')
      }
    } catch (error) {
      console.error('❌ [AgentAnalyticsPage] Error checking connection after setup:', error)
    }
  }

  return (
    <>
      {/* Show Welcome/Setup if not connected */}
      {!isConnected ? (
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <div className="flex-shrink-0">
            <Sidebar />
          </div>

          {/* Main Content - Setup Page */}
          <div className="flex-1 flex items-center justify-center">
            <SetupOptionsSection onSetupComplete={handleSetupComplete} />
          </div>
        </div>
      ) : (
        // Show full dashboard if connected
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <div className="flex-shrink-0">
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation */}
            <TopNav 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              isAgentAnalytics={true}
              onSyncNow={handleSyncNow}
              onSettings={handleSettings}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime || undefined}
              selectedDateRange={selectedDateRange}
              onDateRangeChange={handleDateRangeChange}
            />

            {/* Content Area */}
            <main className="flex-1 overflow-auto bg-gray-50 dark:bg-neutral-950">
              <div className="px-2 py-4">
                <GA4AgentAnalyticsTab 
                  activeTab={activeTab}
                  selectedDateRange={selectedDateRange}
                  onTabChange={setActiveTab}
                  onDateRangeChange={setSelectedDateRange}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </main>
          </div>

          {/* Settings Modal */}
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            onDisconnect={handleDisconnect}
          />
        </div>
      )}
    </>
  )
}

export default function AgentAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <AgentAnalyticsContent />
    </Suspense>
  )
}
