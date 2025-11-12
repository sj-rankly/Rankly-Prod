import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Settings2 } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { MultiSelect } from '@/components/ui/multi-select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Platform, Topic, Persona } from '@/types/dashboard'

interface FilterBarProps {
  platforms: Platform[]
  topics: Topic[]
  personas: Persona[]
  onPlatformChange: (platformId: string, enabled: boolean) => void
  onTopicChange: (topicId: string, enabled: boolean) => void
  onPersonaChange: (personaId: string, enabled: boolean) => void
  onDateRangeChange: (from: Date, to: Date) => void
}

export function FilterBar({
  platforms,
  topics,
  personas,
  onPlatformChange,
  onTopicChange,
  onPersonaChange,
  onDateRangeChange,
}: FilterBarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  const selectedPlatforms = platforms.filter(p => p.enabled).map(p => p.id)
  const selectedTopics = topics.filter(t => t.enabled).map(t => t.id)
  const selectedPersonas = personas.filter(p => p.enabled).map(p => p.id)

  const platformOptions = platforms.map(p => ({ label: p.name, value: p.id }))
  const topicOptions = topics.map(t => ({ label: t.name, value: t.id }))
  const personaOptions = personas.map(p => ({ label: p.name, value: p.id }))

  const handlePlatformSelectionChange = (values: string[]) => {
    platforms.forEach(platform => {
      const shouldBeEnabled = values.includes(platform.id)
      if (platform.enabled !== shouldBeEnabled) {
        onPlatformChange(platform.id, shouldBeEnabled)
      }
    })
  }

  const handleTopicSelectionChange = (values: string[]) => {
    topics.forEach(topic => {
      const shouldBeEnabled = values.includes(topic.id)
      if (topic.enabled !== shouldBeEnabled) {
        onTopicChange(topic.id, shouldBeEnabled)
      }
    })
  }

  const handlePersonaSelectionChange = (values: string[]) => {
    personas.forEach(persona => {
      const shouldBeEnabled = values.includes(persona.id)
      if (persona.enabled !== shouldBeEnabled) {
        onPersonaChange(persona.id, shouldBeEnabled)
      }
    })
  }

  return (
    <div className="sticky top-0 z-20 bg-background shadow-sm border-b border-border/50">
      <div className="flex items-center justify-between p-4 gap-4">
        {/* Global Filters */}
        <div className="flex items-center space-x-4">
          <div className="text-sm font-semibold text-muted-foreground">FILTERS</div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={`rounded-full border px-4 py-2 h-9 font-medium transition-colors ${
                  !date && 'text-muted-foreground'
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'MMM dd') : <span>Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <MultiSelect
            options={platformOptions}
            selectedValues={selectedPlatforms}
            onSelectionChange={handlePlatformSelectionChange}
            placeholder="Platforms"
            className="pill-style"
          />
          <MultiSelect
            options={topicOptions}
            selectedValues={selectedTopics}
            onSelectionChange={handleTopicSelectionChange}
            placeholder="Topics"
            className="pill-style"
          />
          <MultiSelect
            options={personaOptions}
            selectedValues={selectedPersonas}
            onSelectionChange={handlePersonaSelectionChange}
            placeholder="Personas"
            className="pill-style"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full border px-4 py-2 h-9 font-medium">
                <Settings2 className="mr-2 h-4 w-4" /> 
                Chart Config
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="font-medium">Configure Chart 1</DropdownMenuItem>
              <DropdownMenuItem className="font-medium">Configure Chart 2</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
