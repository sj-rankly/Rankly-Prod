"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Chart container
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: Record<string, {
      label?: React.ReactNode
      color?: string
      theme?: Record<string, string>
    }>
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/40 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
        className
      )}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      <RechartsPrimitive.ResponsiveContainer>
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: any }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]: any) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .filter(([_, config]: any) => config.theme || config.color)
          .map(([key, itemConfig]: any) => {
            const color = itemConfig.theme?.light || itemConfig.color
            return [
              `.chart-${id} [data-color=${key}] {`,
              `  color: hsl(${color});`,
              `}`,
              `[data-theme="dark"] .chart-${id} [data-color=${key}] {`,
              `  color: hsl(${itemConfig.theme?.dark || color});`,
              `}`,
            ].join("\n")
          })
          .join("\n"),
      }}
    />
  )
}

// Chart tooltip
const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
      active?: boolean
      payload?: any[]
      label?: any
      labelFormatter?: (label: any, payload?: any[]) => React.ReactNode
      labelClassName?: string
      formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode
      color?: string
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = item.payload

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(label, payload)}
          </div>
        )
      }

      if (!labelFormatter && typeof label === "string") {
        return <div className={cn("font-medium", labelClassName)}>{label}</div>
      }

      return null
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = item.payload
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": indicator === "line",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    hideIndicator ? "items-end" : "items-center"
                  )}
                >
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {item.name}
                    </span>
                  </div>
                  {formatter ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
}

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
    theme?: {
      light?: string
      dark?: string
    }
  }
>
