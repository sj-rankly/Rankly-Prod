/**
 * Data filtering utilities for applying global filters across all sections
 */

export interface FilteredDataOptions {
  selectedTopics: string[]
  selectedPersonas: string[]
  selectedPlatforms: string[]
}

/**
 * Filters data based on selected topics, personas, and platforms
 * @param data - The data to filter
 * @param options - Filter options
 * @returns Filtered data
 */
export function applyGlobalFilters<T extends Record<string, any>>(
  data: T[], 
  options: FilteredDataOptions
): T[] {
  const { selectedTopics, selectedPersonas, selectedPlatforms } = options

  return data.filter(item => {
    // Filter by topics
    const topicMatch = selectedTopics.includes('All Topics') || 
      (item.topic && selectedTopics.includes(item.topic)) ||
      (item.topics && item.topics.some((topic: string) => selectedTopics.includes(topic)))

    // Filter by personas
    const personaMatch = selectedPersonas.includes('All Personas') ||
      (item.persona && selectedPersonas.includes(item.persona)) ||
      (item.personas && item.personas.some((persona: string) => selectedPersonas.includes(persona)))

    // Filter by platforms
    const platformMatch = selectedPlatforms.includes('All Platforms') ||
      (item.platform && selectedPlatforms.includes(item.platform)) ||
      (item.platforms && item.platforms.some((platform: string) => selectedPlatforms.includes(platform)))

    return topicMatch && personaMatch && platformMatch
  })
}

/**
 * Generates filtered mock data for different sections based on selected filters
 * @param section - The section name (visibility, sentiment, citations)
 * @param options - Filter options
 * @returns Filtered mock data
 */
export function getFilteredMockData(section: string, options: FilteredDataOptions) {
  // This is a placeholder - in a real implementation, you would have
  // different data sets for different filter combinations
  const baseData = getBaseMockData()
  
  return applyGlobalFilters(baseData, options)
}

/**
 * Gets base mock data for a section
 * @returns Base mock data
 */
function getBaseMockData() {
  // This would contain the actual mock data for each section
  // For now, returning empty array as placeholder
  return []
}

/**
 * Updates metrics based on filtered data
 * @param filteredData - The filtered data
 * @returns Updated metrics
 */
export function calculateFilteredMetrics<T>(filteredData: T[]) {
  // This would contain logic to recalculate metrics based on filtered data
  // For now, returning the original data as placeholder
  return filteredData
}
