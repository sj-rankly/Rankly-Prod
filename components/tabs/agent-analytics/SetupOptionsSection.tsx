'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { initiateGA4OAuth, getAccountsProperties, saveProperty } from '@/services/ga4Api'
import { LLMGrowthChart } from '@/components/charts/LLMGrowthChart'

interface GA4Property {
  propertyId: string
  displayName: string
  accountId: string
  accountName: string
}

interface SetupOptionsSectionProps {
  onSetupComplete: () => void
}

export function SetupOptionsSection({ onSetupComplete }: SetupOptionsSectionProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFetchingProperties, setIsFetchingProperties] = useState(false)
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [connectionStep, setConnectionStep] = useState<'welcome' | 'select-property' | 'connecting'>('welcome')

  const handleConnectGA4 = async () => {
    setIsConnecting(true)
    setConnectionStep('connecting')
    
    try {
      // Redirect to GA4 OAuth (separate from main Google auth)
      initiateGA4OAuth()
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      toast.error('Failed to connect with Google Analytics')
      setIsConnecting(false)
      setConnectionStep('welcome')
    }
  }

  const handlePropertySelect = async (propertyId: string) => {
    console.log('🔧 [SetupOptionsSection] handlePropertySelect called with propertyId:', propertyId)
    setSelectedProperty(propertyId)
    setIsConnecting(true)

    try {
      // Find the selected property to get all details
      const selectedProp = properties.find(p => p.propertyId === propertyId)
      if (!selectedProp) {
        throw new Error('Selected property not found')
      }

      // Call the save-property endpoint
      console.log('💾 [SetupOptionsSection] Saving property:', selectedProp)
      const response = await saveProperty(selectedProp.accountId, selectedProp.propertyId)
      console.log('📦 [SetupOptionsSection] Save property response:', response)

      if (!response.success) {
        throw new Error('Failed to save property')
      }

      toast.success('✅ GA4 connected successfully — loading your dashboard...')
      
      // Small delay for better UX
      setTimeout(() => {
        console.log('✅ [SetupOptionsSection] Calling onSetupComplete')
        onSetupComplete?.()
      }, 1500)

    } catch (error) {
      console.error('❌ [SetupOptionsSection] Error saving property:', error)
      toast.error('Failed to connect property')
      setIsConnecting(false)
    }
  }

  // Check if we're returning from OAuth and fetch properties
  useEffect(() => {
    const checkOAuthReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('oauth_complete') === 'true') {
        setConnectionStep('select-property')
        setIsFetchingProperties(true)

        try {
          const response = await getAccountsProperties()

          if (response.success && response.data?.accounts) {
            // Flatten all properties from all accounts
            const allProperties = response.data.accounts.flatMap((account: any) => 
              (account.properties || []).map((property: any) => ({
                propertyId: property.propertyId,
                displayName: property.propertyName,
                accountId: account.accountId,
                accountName: account.accountName,
              }))
            )
            
            if (allProperties.length === 0) {
              toast.error('No GA4 properties found. Please ensure you have access to at least one GA4 property.')
              setConnectionStep('welcome')
            } else {
              setProperties(allProperties)
              toast.success(`Found ${allProperties.length} GA4 ${allProperties.length === 1 ? 'property' : 'properties'}`)
            }
          } else {
            const errorMessage = response.error || 'Failed to fetch properties. Please check your GA4 connection.'
            console.error('❌ [SetupOptionsSection] Failed to fetch properties:', response)
            toast.error(errorMessage)
            setConnectionStep('welcome')
          }
        } catch (error) {
          console.error('❌ [SetupOptionsSection] Error fetching properties:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch GA4 properties'
          toast.error(errorMessage)
          setConnectionStep('welcome')
        } finally {
          setIsFetchingProperties(false)
        }
      }
    }

    checkOAuthReturn()
  }, [])

  return (
    <div className="w-full max-w-4xl">
        {/* Split Card */}
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/20">
          <div className="grid grid-cols-1 md:grid-cols-2 h-[500px]">
            {/* LEFT SECTION */}
            <div className="flex flex-col justify-between p-12 bg-[#FFFFFF] dark:bg-[#1B1C1E]">
              {connectionStep === 'welcome' && (
                <>
                  {/* Top Cluster (Fixed) */}
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-[20px] font-medium leading-[1.4] text-foreground tracking-[-0.01em] mb-4">
                      Measure AI Traffic & Revenue
                    </h1>
                  </div>

                  {/* Middle Cluster */}
                  <div className="flex flex-col items-center justify-center flex-1">
                    <div className="w-full max-w-sm flex flex-col space-y-6">
                      <p className="text-[15px] font-normal leading-[1.6] text-muted-foreground text-center">
                        Connect Google Analytics to track sessions, conversions, and revenue from LLMs.
                      </p>
                      
                      <Button
                        variant="default"
                        type="button"
                        onClick={handleConnectGA4}
                        disabled={isConnecting}
                        className="w-full bg-foreground text-background hover:bg-foreground/90 text-[15px] font-medium"
                      >
                        <img
                          src="https://www.google.com/favicon.ico"
                          alt="Google"
                          className="w-4 h-4 mr-2"
                        />
                        Connect Google Analytics
                      </Button>

                      <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-[13px] font-normal">
                          <span className="px-2 bg-white dark:bg-[#1B1C1E] text-muted-foreground">OR</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        type="button"
                        className="w-full bg-[#E5E7EB] dark:bg-[#374151] text-[#111113] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#4B5563] text-[15px] font-medium"
                      >
                        Configure Rankly SDK →
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Cluster (Fixed) */}
                  <p className="text-[13px] font-normal leading-[1.6] tracking-[0.01em] text-muted-foreground/80 text-center">
                    to see how AI crawlers, bots, and agents interpret your website.
                  </p>
                </>
              )}

              {connectionStep === 'select-property' && (
                <>
                  {/* Top Cluster (Fixed) */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center space-x-3 mb-4">
                      <img
                        src="https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg"
                        alt="Google Analytics"
                        className="w-8 h-8"
                        onError={(e) => {
                          // Fallback to Google Analytics logo if the main one fails
                          e.currentTarget.src = "https://www.google.com/analytics/static/images/analytics-logo.svg"
                        }}
                      />
                      <h1 className="text-[20px] font-medium leading-[1.4] text-foreground tracking-[-0.01em]">
                        Select Analytics Property
                      </h1>
                    </div>
                  </div>

                  {/* Middle Cluster (Property Selection) */}
                  <div className="flex flex-col items-center justify-center flex-1">
                    <div className="w-full max-w-sm flex flex-col space-y-6">
                      <p className="text-[15px] font-normal leading-[1.6] text-muted-foreground text-center">
                        Choose which Google Analytics property you'd like to connect to your dashboard.
                      </p>
                      
                      {isFetchingProperties ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Loading properties...</p>
                        </div>
                      ) : properties.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No Google Analytics properties found.</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Make sure you have access to at least one GA4 property.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {properties.map((property) => (
                            <label
                              key={property.propertyId}
                              className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <input
                                type="radio"
                                name="property"
                                value={property.propertyId}
                                checked={selectedProperty === property.propertyId}
                                onChange={(e) => setSelectedProperty(e.target.value)}
                                className="h-4 w-4 text-blue-600"
                                disabled={isConnecting}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-[15px] text-foreground">{property.displayName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {property.accountName} • {property.propertyId}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Cluster (Action Buttons) */}
                  <div className="flex flex-col space-y-3">
                    <div className="flex space-x-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setConnectionStep('welcome')}
                        disabled={isConnecting}
                        className="flex-1 bg-[#E5E7EB] dark:bg-[#374151] text-[#111113] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#4B5563] text-[15px] font-medium"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => handlePropertySelect(selectedProperty)}
                        disabled={isConnecting || properties.length === 0 || !selectedProperty}
                        className="flex-1 bg-foreground text-background hover:bg-foreground/90 text-[15px] font-medium"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Connecting...
                          </>
                        ) : (
                          'Connect Property'
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {connectionStep === 'connecting' && (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span className="text-muted-foreground">Connecting...</span>
                </div>
              )}
            </div>

            {/* RIGHT SECTION */}
            <div className="flex flex-col justify-between p-12 bg-[#F8F8F8] dark:bg-[#111113]">
              <LLMGrowthChart />
            </div>
          </div>
        </div>
      </div>
  )
}
