'use client'

import { useEffect, useState } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function TestDataPage() {
  const { data } = useOnboarding()
  const { isAuthenticated } = useAuth()
  const [backendData, setBackendData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchBackendData = async () => {
    setLoading(true)
    try {
      console.log('🧪 Testing backend data fetch...')
      const response = await apiService.getOnboardingData()
      console.log('📊 Backend response:', response)
      setBackendData(response)
    } catch (error) {
      console.error('❌ Backend fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const testWebsiteAnalysis = async () => {
    setLoading(true)
    try {
      console.log('🧪 Testing website analysis...')
      const response = await apiService.analyzeWebsite('https://openai.com')
      console.log('📊 Website analysis response:', response)
    } catch (error) {
      console.error('❌ Website analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Data Page</h1>
        <p>Please sign in to test data flow.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Data Flow Test Page</h1>
      
      <div className="space-y-6">
        {/* Test Buttons */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Test Actions</h2>
          <div className="space-x-4">
            <button
              onClick={fetchBackendData}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch Backend Data'}
            </button>
            <button
              onClick={testWebsiteAnalysis}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Test Website Analysis'}
            </button>
          </div>
        </div>

        {/* Frontend Context Data */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">📱 Frontend Context Data</h2>
          <pre className="bg-white p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        {/* Backend Data */}
        {backendData && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">🖥️ Backend Data</h2>
            <pre className="bg-white p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(backendData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
