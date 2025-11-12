"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface MarkdownTableProps {
  headers: string[]
  rows: string[][]
  className?: string
}

export function MarkdownTable({ headers, rows, className }: MarkdownTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse border border-border rounded-lg">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-muted-foreground border-b border-border/50"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}










