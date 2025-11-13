'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'

interface SankeyData {
  from: string
  to: string
  value: number
  color: string
}

interface D3SankeyChartProps {
  data: SankeyData[]
  width?: number
  height?: number
  onLinkHover?: (link: { from: string; to: string; value: number } | null, position: { x: number; y: number } | null) => void
  onSlugHover?: (slug: string | null, position: { x: number; y: number } | null) => void
  getLLMDomain?: (platform: string) => string
}

export function D3SankeyChart({
  data,
  width = 1200,
  height = 600,
  onLinkHover,
  onSlugHover,
  getLLMDomain
}: D3SankeyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    // Extract unique nodes
    const platformsSet = new Set<string>()
    const slugsSet = new Set<string>()

    data.forEach(d => {
      platformsSet.add(d.from)
      slugsSet.add(d.to)
    })

    const platforms = Array.from(platformsSet)
    const slugs = Array.from(slugsSet)

    // Create nodes array
    const nodes: Array<{ name: string; isPlatform?: boolean }> = [
      ...platforms.map(name => ({ name, isPlatform: true })),
      ...slugs.map(name => ({ name, isPlatform: false }))
    ]

    // Create links array with indices
    const links: Array<{
      source: number;
      target: number;
      value: number;
      color?: string;
      sourceName?: string;
      targetName?: string;
    }> = data.map(d => ({
      source: platforms.indexOf(d.from),
      target: platforms.length + slugs.indexOf(d.to),
      value: d.value,
      color: d.color,
      sourceName: d.from,
      targetName: d.to
    }))

    // Create sankey layout
    const sankeyLayout = sankey<any, any>()
      .nodeWidth(8)
      .nodePadding(20)
      .extent([[150, 20], [width - 150, height - 20]])

    // Generate the sankey diagram
    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyLayout({
      nodes: nodes as any,
      links: links as any
    })

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', 'transparent')

    // Create link path generator
    const linkPath = sankeyLinkHorizontal()

    // Draw links (flows)
    const linkGroup = svg.append('g')
      .attr('class', 'links')
      .attr('fill', 'none')

    const linkElements = linkGroup.selectAll('path')
      .data(sankeyLinks)
      .enter()
      .append('path')
      .attr('d', linkPath as any)
      .attr('stroke', (d: any) => d.color || '#94a3b8')
      .attr('stroke-width', (d: any) => Math.max(1, d.width || 0))
      .attr('opacity', 0.5)
      .attr('class', 'sankey-link')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d: any) {
        const linkKey = `${d.sourceName}-${d.targetName}`
        setHoveredLink(linkKey)
        
        // Highlight this link
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', (d: any) => Math.max(2, (d.width || 0) + 2))

        // Dim other links
        linkElements
          .filter(function(other: any) {
            return `${other.sourceName}-${other.targetName}` !== linkKey
          })
          .attr('opacity', 0.2)

        // Call hover callback
        if (onLinkHover) {
          onLinkHover(
            {
              from: d.sourceName,
              to: d.targetName,
              value: d.value
            },
            { x: event.pageX, y: event.pageY }
          )
        }
      })
      .on('mouseleave', function() {
        setHoveredLink(null)
        
        // Reset all links
        linkElements
          .attr('opacity', 0.5)
          .attr('stroke-width', (d: any) => Math.max(1, d.width || 0))

        if (onLinkHover) {
          onLinkHover(null, null)
        }
      })

    // Draw nodes with platform-specific colors
    const nodeGroup = svg.append('g')
      .attr('class', 'nodes')

    // For platform nodes (left side): use platform color
    // For slug nodes (right side): use gradient based on incoming links
    sankeyNodes.forEach((node: any) => {
      if (node.isPlatform) {
        // Left side - platform nodes: use platform color
        const platformColor = data.find(d => d.from === node.name)?.color || '#94a3b8'
        
        nodeGroup.append('rect')
          .attr('x', node.x0)
          .attr('y', node.y0)
          .attr('height', Math.max(1, node.y1 - node.y0))
          .attr('width', node.x1 - node.x0)
          .attr('fill', platformColor)
          .attr('opacity', 0.9)
          .attr('stroke', platformColor)
          .attr('stroke-width', 1)
      } else {
        // Right side - slug nodes: create gradient based on incoming links
        const incomingLinks = sankeyLinks.filter((link: any) => link.target === node)
        
        if (incomingLinks.length === 0) {
          // No incoming links, use default gray
          nodeGroup.append('rect')
            .attr('x', node.x0)
            .attr('y', node.y0)
            .attr('height', Math.max(1, node.y1 - node.y0))
            .attr('width', node.x1 - node.x0)
            .attr('fill', '#94a3b8')
            .attr('opacity', 0.8)
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 0.5)
        } else if (incomingLinks.length === 1) {
          // Single incoming link, use that color
          nodeGroup.append('rect')
            .attr('x', node.x0)
            .attr('y', node.y0)
            .attr('height', Math.max(1, node.y1 - node.y0))
            .attr('width', node.x1 - node.x0)
            .attr('fill', incomingLinks[0].color || '#94a3b8')
            .attr('opacity', 0.9)
            .attr('stroke', incomingLinks[0].color || '#94a3b8')
            .attr('stroke-width', 1)
        } else {
          // Multiple incoming links: create segmented colors proportional to link widths
          const totalHeight = node.y1 - node.y0
          let currentY = node.y0
          
          // Sort links by their y-position (source order)
          const sortedLinks = [...incomingLinks].sort((a: any, b: any) => a.y0 - b.y0)
          
          sortedLinks.forEach((link: any) => {
            const linkHeight = link.width || 1
            const segmentHeight = (linkHeight / node.value) * totalHeight
            
            nodeGroup.append('rect')
              .attr('x', node.x0)
              .attr('y', currentY)
              .attr('height', Math.max(1, segmentHeight))
              .attr('width', node.x1 - node.x0)
              .attr('fill', link.color || '#94a3b8')
              .attr('opacity', 0.9)
              .attr('stroke', 'none')
            
            currentY += segmentHeight
          })
        }
      }
    })

    // Add labels
    const labelGroup = svg.append('g')
      .attr('class', 'labels')

    // Platform labels (left side) with favicons
    const platformLabels = labelGroup.selectAll('.platform-label')
      .data(sankeyNodes.filter((d: any) => d.isPlatform))
      .enter()
      .append('g')
      .attr('class', 'platform-label')
      .attr('transform', (d: any) => `translate(${d.x0 - 15}, ${(d.y0 + d.y1) / 2})`)

    // Add favicon for platforms
    if (getLLMDomain) {
      platformLabels
        .append('image')
        .attr('x', -40)
        .attr('y', -10)
        .attr('width', 20)
        .attr('height', 20)
        .attr('href', (d: any) => getDynamicFaviconUrl(getLLMDomain(d.name), 32))
        .on('error', function(event, d: any) {
          // Fallback to colored circle if favicon fails
          d3.select(this.parentNode as any)
            .append('circle')
            .attr('cx', -30)
            .attr('cy', 0)
            .attr('r', 8)
            .attr('fill', data.find(link => link.from === d.name)?.color || '#94a3b8')
        })
    }

    platformLabels
      .append('text')
      .attr('x', -45)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .text((d: any) => d.name)

    // Slug labels (right side) with hover
    const slugLabels = labelGroup.selectAll('.slug-label')
      .data(sankeyNodes.filter((d: any) => !d.isPlatform))
      .enter()
      .append('g')
      .attr('class', 'slug-label')
      .attr('transform', (d: any) => `translate(${d.x1 + 15}, ${(d.y0 + d.y1) / 2})`)
      .style('cursor', 'pointer')

    slugLabels
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .text((d: any) => d.name)
      .on('mouseenter', function(event, d: any) {
        // Highlight text
        d3.select(this)
          .attr('font-weight', '700')
          .attr('fill', isDarkMode ? '#60a5fa' : '#2563eb')

        // Call hover callback
        if (onSlugHover) {
          const bbox = (this as SVGTextElement).getBoundingClientRect()
          onSlugHover(d.name, { x: bbox.right + 10, y: bbox.top + bbox.height / 2 })
        }
      })
      .on('mouseleave', function(event, d: any) {
        // Reset text
        d3.select(this)
          .attr('font-weight', '600')
          .attr('fill', isDarkMode ? '#ffffff' : '#000000')

        if (onSlugHover) {
          onSlugHover(null, null)
        }
      })

  }, [data, width, height, isDarkMode, onLinkHover, onSlugHover, getLLMDomain])

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <svg ref={svgRef} className="sankey-chart" />
    </div>
  )
}

