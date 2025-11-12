/**
 * Interactive Choropleth Map Component
 * 
 * Based on Leaflet.js choropleth example
 * https://leafletjs.com/examples/choropleth/
 */

'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the entire map component to avoid SSR issues
const DynamicMap = dynamic(() => import('./LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Loading interactive map...</p>
      </div>
    </div>
  )
})

interface ChoroplethMapProps {
  countries: Array<{
    country: string
    sessions: number
    percentage: number
    conversionRate: number
    bounceRate: number
    avgSessionDuration: number
    engagementRate: number
  }>
  totalSessions: number
}

export function ChoroplethMap({ countries, totalSessions }: ChoroplethMapProps) {
  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden">
      <DynamicMap countries={countries} totalSessions={totalSessions} />
    </div>
  )
}