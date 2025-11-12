'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, RefreshCw, Trash2, AlertCircle } from 'lucide-react'
import { checkGA4Connection, disconnectGA4, initiateGA4OAuth } from '@/services/ga4Api'
import { toast } from 'sonner'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onDisconnect: () => void
  lastSyncTime?: string
}

interface ConnectionStatus {
  isConnected: boolean
  isActive: boolean
  propertyName?: string
  accountName?: string
  error?: string
}

export function SettingsModal({ isOpen, onClose, onDisconnect, lastSyncTime }: SettingsModalProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ 
    isConnected: false, 
    isActive: false 
  })
  const [loading, setLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Show modal immediately, then fetch status in background
      fetchConnectionStatus()
    }
  }, [isOpen])

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true)
      const response = await checkGA4Connection()
      
      console.log('🔍 [SettingsModal] Connection status response:', response)
      
      if (response.success && response.data) {
        setConnectionStatus({
          isConnected: response.data.connected || false,
          isActive: response.data.isActive || false,
          propertyName: response.data.propertyName,
          accountName: response.data.accountName,
          error: undefined
        })
      } else {
        // Connection check failed or not connected
        setConnectionStatus({ 
          isConnected: false, 
          isActive: false,
          error: response.error || 'Not connected to GA4'
        })
      }
    } catch (error) {
      console.error('❌ [SettingsModal] Error fetching connection status:', error)
      setConnectionStatus({ 
        isConnected: false, 
        isActive: false,
        error: error instanceof Error ? error.message : 'Failed to check connection status'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      
      const response = await disconnectGA4()
      
      if (response.success) {
        toast.success('Disconnected from GA4 successfully')
        setConnectionStatus({ isConnected: false, isActive: false })
        onDisconnect()
        onClose()
      } else {
        toast.error(response.error || 'Failed to disconnect from GA4')
        console.error('❌ [SettingsModal] Failed to disconnect:', response.error)
      }
    } catch (error) {
      console.error('❌ [SettingsModal] Error disconnecting:', error)
      toast.error('Error disconnecting from GA4')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleConnect = () => {
    // Close modal and redirect to GA4 OAuth
    onClose()
    initiateGA4OAuth()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md" 
        style={{ 
          zIndex: 9999,
          position: 'fixed'
        }}
      >
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your Google Analytics connection and sync settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">GA4 Connection Status</h3>
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Badge 
                  variant={connectionStatus.isConnected && connectionStatus.isActive ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {connectionStatus.isConnected && connectionStatus.isActive ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </>
                  ) : connectionStatus.isConnected && !connectionStatus.isActive ? (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Not Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Not Connected
                    </>
                  )}
                </Badge>
              )}
            </div>

            {/* Error Message */}
            {connectionStatus.error && !loading && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive font-medium">Connection Error</p>
                    <p className="text-xs text-muted-foreground mt-1">{connectionStatus.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Connected Info */}
            {connectionStatus.isConnected && connectionStatus.isActive && (
              <div className="space-y-3">
                {connectionStatus.accountName && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Account</span>
                        <p className="text-sm font-medium">{connectionStatus.accountName}</p>
                      </div>
                    </div>
                  </div>
                )}

                {connectionStatus.propertyName && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">GA4 Property</span>
                        <p className="text-sm font-medium">{connectionStatus.propertyName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Not Active Warning */}
            {connectionStatus.isConnected && !connectionStatus.isActive && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Connection Not Active
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Your GA4 connection exists but no property is selected. Please reconnect to select a property.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Last Sync */}
          {lastSyncTime && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Last Synced</h3>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {lastSyncTime}
                  </span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Actions</h3>
            
            {connectionStatus.isConnected && connectionStatus.isActive ? (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={fetchConnectionStatus}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Connection Status
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {disconnecting ? 'Disconnecting...' : 'Disconnect GA4'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleConnect}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Connect to GA4 Analytics
                </Button>
                
                {connectionStatus.isConnected && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={fetchConnectionStatus}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}












