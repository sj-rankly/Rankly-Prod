'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAccountsProperties, saveProperty } from '@/services/ga4Api'
import type { GA4Account } from '@/types/ga4'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface PropertySelectorProps {
  onPropertySelected: (property: { accountId: string, propertyId: string }) => void
  onCancel?: () => void
}

export function PropertySelector({ onPropertySelected, onCancel }: PropertySelectorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<GA4Account[]>([])
  const [selectedProperty, setSelectedProperty] = useState<{ accountId: string, propertyId: string } | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await getAccountsProperties()
      if (response.success && response.data) {
        setAccounts(response.data.accounts)
      } else {
        toast.error('Failed to load GA4 properties')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to load GA4 properties')
    } finally {
      setLoading(false)
    }
  }

  const handlePropertySelect = (accountId: string, propertyId: string) => {
    setSelectedProperty({ accountId, propertyId })
  }

  const handleSave = async () => {
    if (!selectedProperty) return

    setSaving(true)
    try {
      const response = await saveProperty(selectedProperty.accountId, selectedProperty.propertyId)
      if (response.success) {
        toast.success('GA4 property connected successfully!')
        onPropertySelected(selectedProperty)
      } else {
        toast.error('Failed to save property selection')
      }
    } catch (error) {
      console.error('Error saving property:', error)
      toast.error('Failed to save property selection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your GA4 properties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl">Select Your GA4 Property</CardTitle>
          <CardDescription>Choose the Google Analytics 4 property you want to track</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.accountId}>
              <CardHeader>
                <CardTitle>{account.accountName}</CardTitle>
                <CardDescription>Account ID: {account.accountId}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {account.properties.map((property) => (
                    <div
                      key={property.propertyId}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProperty?.propertyId === property.propertyId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => handlePropertySelect(account.accountId, property.propertyId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{property.propertyName}</p>
                          <p className="text-sm text-muted-foreground">Property ID: {property.propertyId}</p>
                        </div>
                        {selectedProperty?.propertyId === property.propertyId && (
                          <div className="text-primary">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {selectedProperty && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary">Selected Property:</p>
              <p className="text-primary">{accounts.find(a => a.accountId === selectedProperty.accountId)?.properties.find(p => p.propertyId === selectedProperty.propertyId)?.propertyName}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSave}
              disabled={!selectedProperty || saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

