/**
 * Leaflet Map Component
 * 
 * Interactive choropleth map using Leaflet.js
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { WORLD_GEOJSON_URL } from '@/lib/data/worldGeoJSON'

// Color function based on session count
function getColor(sessions: number) {
  return sessions > 50 ? '#003366' : // Dark blue
         sessions > 25 ? '#0066CC' : // Blue
         sessions > 10 ? '#3399FF' : // Light blue
         sessions > 5  ? '#66B3FF' : // Lighter blue
         sessions > 1  ? '#99CCFF' : // Very light blue
         sessions > 0  ? '#CCE6FF' : // Lightest blue
                        '#E6F3FF'   // Almost white blue
}

// Style function for GeoJSON features
function getStyle(feature: any, sessions: number) {
  return {
    fillColor: getColor(sessions),
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7
  }
}


interface LeafletMapProps {
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

// Legend component
function Legend({ totalSessions }: { totalSessions: number }) {
  const map = useMap()

  useEffect(() => {
    const legend = (L.control as any)({ position: 'bottomright' })

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend')
      div.style.cssText = `
        background: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        min-width: 140px;
      `
      
      const grades = [0, 1, 5, 10, 25, 50]
      const labels = ['< 1', '1-5', '5-10', '10-25', '25-50', '50+']
      
      div.innerHTML = `
        ${grades.map((grade, i) => `
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="
              width: 12px; 
              height: 12px; 
              background: ${getColor(grade + 1)}; 
              margin-right: 8px;
              border-radius: 2px;
            "></div>
            <span style="color: #6b7280;">${labels[i]}</span>
          </div>
        `).join('')}
        <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; text-align: center; color: #6b7280;">
          Total: ${totalSessions.toLocaleString()}
        </div>
      `
      
      return div
    }

    legend.addTo(map)

    return () => {
      map.removeControl(legend)
    }
  }, [map, totalSessions])

  return null
}

export default function LeafletMap({ countries, totalSessions }: LeafletMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Create country data lookup with multiple name variations
  const countryDataMap = new Map()
  
  countries.forEach(country => {
    const name = country.country.toLowerCase()
    countryDataMap.set(name, country)
    
    // Add common variations for better matching
    if (name === 'united states') {
      countryDataMap.set('usa', country)
      countryDataMap.set('us', country)
      countryDataMap.set('united states of america', country)
    }
    if (name === 'united kingdom') {
      countryDataMap.set('uk', country)
      countryDataMap.set('great britain', country)
    }
    if (name === 'south korea') {
      countryDataMap.set('korea', country)
      countryDataMap.set('korea, republic of', country)
    }
    if (name === 'north korea') {
      countryDataMap.set('korea, democratic people\'s republic of', country)
    }
  })

  // Load world countries GeoJSON data
  useEffect(() => {
    const fetchWorldData = async () => {
      try {
        console.log('🗺️ Fetching world GeoJSON data...')
        console.log('📊 Our countries data:', countries.map(c => ({ name: c.country, sessions: c.sessions })))
        
        // Fetch real world GeoJSON data
        const response = await fetch(WORLD_GEOJSON_URL)
        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('✅ World GeoJSON loaded:', data.features.length, 'countries')
        
        // Filter and enhance the data with our country sessions
        const enhancedFeatures = data.features.map((feature: any) => {
          // Try multiple property names (different GeoJSON sources use different naming)
          const countryName = feature.properties.ADMIN || feature.properties.name || feature.properties.NAME || feature.properties.Country
          
          // Try to match with our data (case-insensitive)
          let countryData = countryDataMap.get(countryName?.toLowerCase())
          
          // If no direct match, try fuzzy matching
          if (!countryData && countryName) {
            const searchName = countryName.toLowerCase()
            for (const [key, value] of countryDataMap.entries()) {
              if (searchName.includes(key) || key.includes(searchName)) {
                countryData = value
                break
              }
            }
          }
          
          console.log(`🗺️ Country: ${countryName}, Sessions: ${countryData?.sessions || 0}`)
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              name: countryName,
              sessions: countryData?.sessions || 0,
              percentage: countryData?.percentage || 0,
              conversionRate: countryData?.conversionRate || 0,
              bounceRate: countryData?.bounceRate || 0,
              avgSessionDuration: countryData?.avgSessionDuration || 0,
              engagementRate: countryData?.engagementRate || 0
            }
          }
        })

        setGeoJsonData({
          type: 'FeatureCollection',
          features: enhancedFeatures
        })
        setIsLoading(false)
      } catch (error) {
        console.error('❌ Error loading GeoJSON:', error)
        setIsLoading(false)
      }
    }

    fetchWorldData()
  }, [countries])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading world map...</p>
        </div>
      </div>
    )
  }

  if (!geoJsonData) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-muted-foreground">Map data unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '500px', width: '100%' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '500px', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        attributionControl={false}
        doubleClickZoom={true}
        dragging={true}
        keyboard={true}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
      >
        {/* No TileLayer - pure white background */}
      
          <GeoJSON
            data={geoJsonData}
            style={(feature) => getStyle(feature, feature?.properties?.sessions || 0)}
            onEachFeature={(feature, layer) => {
              const props = feature.properties

              // Enhanced interactive features - NO COLOR CHANGES
              layer.on({
                mouseover: (e) => {
                  const target = e.target
                  // NO color changes - keep exact same color
                  target.setStyle({
                    weight: 2,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7,
                    fillColor: getColor(props.sessions) // Keep EXACT same color
                  })
                  target.bringToFront()
                  
                  // Add tooltip-like effect
                  if (props.sessions > 0) {
                    layer.bindTooltip(`
                      <div style="font-weight: 600; color: #1f2937;">
                        ${props.name}: ${props.sessions} sessions
                      </div>
                    `, {
                      permanent: false,
                      direction: 'top',
                      offset: [0, -10],
                      className: 'custom-tooltip'
                    }).openTooltip()
                  }
                },
                mouseout: (e) => {
                  const target = e.target
                  target.setStyle(getStyle(feature, props.sessions))
                  layer.closeTooltip()
                },
                click: (e) => {
                  const target = e.target
                  const map = target._map
                  
                  // Zoom to country with smooth animation
                  if (props.sessions > 0) {
                    map.fitBounds(target.getBounds(), {
                      padding: [20, 20],
                      maxZoom: 6
                    })
                  }
                  
                  // Open detailed popup on click
                  if (props.sessions > 0) {
                    layer.bindPopup(`
                      <div style="min-width: 250px; font-family: system-ui;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
                          <div style="width: 12px; height: 12px; background: ${getColor(props.sessions)}; border-radius: 2px; margin-right: 8px;"></div>
                          <h3 style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${props.name}</h3>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                          <div style="color: #6b7280;">LLM Sessions:</div>
                          <div style="font-weight: 600; color: #111827;">${props.sessions.toLocaleString()}</div>
                          <div style="color: #6b7280;">Traffic %:</div>
                          <div style="font-weight: 600; color: #2563eb;">${props.percentage.toFixed(2)}%</div>
                          <div style="color: #6b7280;">Conversion Rate:</div>
                          <div style="font-weight: 600; color: #059669;">${props.conversionRate.toFixed(2)}%</div>
                          <div style="color: #6b7280;">Bounce Rate:</div>
                          <div style="font-weight: 600; color: #dc2626;">${props.bounceRate.toFixed(2)}%</div>
                          <div style="color: #6b7280;">Avg Session:</div>
                          <div style="font-weight: 600; color: #111827;">${props.avgSessionDuration.toFixed(2)}s</div>
                          <div style="color: #6b7280;">Engagement:</div>
                          <div style="font-weight: 600; color: #7c3aed;">${props.engagementRate.toFixed(2)}%</div>
                        </div>
                      </div>
                    `, {
                      maxWidth: 300,
                      className: 'custom-popup'
                    }).openPopup()
                  }
                }
              })

              // Add cursor pointer for countries with sessions
              if (props.sessions > 0) {
                layer.on('mouseover', () => {
                  document.body.style.cursor = 'pointer'
                })
                layer.on('mouseout', () => {
                  document.body.style.cursor = ''
                })
              }
            }}
          />

          <Legend totalSessions={totalSessions} />
          </MapContainer>
    </div>
  )
}
