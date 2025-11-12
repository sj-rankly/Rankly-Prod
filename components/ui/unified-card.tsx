"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const UnifiedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Unified design system
      "rounded-xl border border-border/60 bg-card text-card-foreground",
      // Shadow system
      "shadow-sm hover:shadow-md transition-shadow duration-200",
      // Dark mode support
      "dark:bg-neutral-900 dark:border-neutral-800",
      className
    )}
    {...props}
  />
))
UnifiedCard.displayName = "UnifiedCard"

const UnifiedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
UnifiedCardHeader.displayName = "UnifiedCardHeader"

const UnifiedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
UnifiedCardTitle.displayName = "UnifiedCardTitle"

const UnifiedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
UnifiedCardDescription.displayName = "UnifiedCardDescription"

const UnifiedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
UnifiedCardContent.displayName = "UnifiedCardContent"

const UnifiedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
UnifiedCardFooter.displayName = "UnifiedCardFooter"

export { UnifiedCard, UnifiedCardHeader, UnifiedCardFooter, UnifiedCardTitle, UnifiedCardDescription, UnifiedCardContent }