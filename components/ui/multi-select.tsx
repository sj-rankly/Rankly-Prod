import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options",
  className
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onSelectionChange(newValues)
  }

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0])
      return option?.label || placeholder
    }
    return `${selectedValues.length} selected`
  }

  const isPillStyle = className?.includes('pill-style')

  return (
    <div ref={containerRef} className={cn("relative", className)}>
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "justify-between font-medium transition-colors",
              isPillStyle 
                ? "h-9 px-4 rounded-full border px-4 py-2 min-w-[120px]" 
                : "w-full"
            )}
          >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 z-50 mt-2 min-w-full p-1 shadow-lg border">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer transition-colors"
              onClick={() => toggleOption(option.value)}
            >
              <div className="flex h-4 w-4 items-center justify-center">
                {selectedValues.includes(option.value) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="font-medium">{option.label}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
