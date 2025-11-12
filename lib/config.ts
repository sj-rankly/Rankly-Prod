/**
 * Frontend Configuration
 * 
 * This file contains all configurable settings for the frontend.
 * These values should match the backend configuration for consistency.
 */

export const frontendConfig = {
  // ===== UI LIMITS =====
  limits: {
    // Maximum competitors to show in UI (should match backend MAX_COMPETITORS_DISPLAY)
    maxCompetitors: 4,
    
    // Maximum topics to show in UI (should match backend MAX_TOPICS_DISPLAY)
    maxTopics: 2,
    
    // Maximum personas to show in UI (should match backend MAX_PERSONAS_DISPLAY)
    maxPersonas: 2,
    
    // Maximum citations to display per brand
    maxCitationsPerBrand: 200,
    
    // Maximum word count for analysis display
    maxWordCount: 10000
  },

  // ===== ANIMATION CONFIGURATION =====
  animations: {
    // Card animation delays (milliseconds)
    cardDelays: {
      card1: 2000,
      card2: 4500,
      card3: 8000,
      card4: 12000
    },
    
    // Step completion delays (milliseconds)
    stepDelays: {
      step1: 2000,
      step2: 4000,
      step3: 6000
    },
    
    // Animation durations (milliseconds)
    durations: {
      fadeIn: 500,
      slideIn: 500,
      zoomIn: 300,
      transition: 300
    }
  },

  // ===== CHART CONFIGURATION =====
  charts: {
    // Brand color palette (should match backend)
    brandColors: [
      '#3B82F6', // Blue
      '#EF4444', // Red  
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#84CC16', // Lime
      '#F97316'  // Orange
    ],
    
    // Chart dimensions
    dimensions: {
      height: 400,
      width: '100%',
      margin: { top: 20, right: 30, bottom: 40, left: 40 }
    }
  },

  // ===== VALIDATION MESSAGES =====
  validation: {
    maxCompetitors: 'Please select no more than 4 competitors',
    maxTopics: 'Please select no more than 2 topics',
    maxPersonas: 'Please select no more than 2 personas',
    requiredField: 'This field is required',
    invalidUrl: 'Please enter a valid URL',
    invalidEmail: 'Please enter a valid email address'
  },
  
  // ===== PERFORMANCE CONFIGURATION =====
  performance: {
    // Debounce delay for search inputs (milliseconds)
    searchDebounce: 300,
    
    // Throttle delay for scroll events (milliseconds)
    scrollThrottle: 100,
    
    // Maximum items to render in lists
    maxListItems: 100,
    
    // Virtual scrolling threshold
    virtualScrollThreshold: 50
  },

  // ===== DEVELOPMENT CONFIGURATION =====
  development: {
    // Enable debug logging
    debugLogging: process.env.NODE_ENV === 'development',
    
    // Enable performance monitoring
    performanceMonitoring: process.env.NODE_ENV === 'development',
    
    // Mock API responses for development
    mockApiResponses: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_MOCK_API === 'true'
  }
};

// ===== HELPER FUNCTIONS =====
export function getBrandColor(index: number): string {
  return frontendConfig.charts.brandColors[index % frontendConfig.charts.brandColors.length];
}

export function validateCompetitorCount(count: number): boolean {
  return count <= frontendConfig.limits.maxCompetitors;
}

export function validateTopicCount(count: number): boolean {
  return count <= frontendConfig.limits.maxTopics;
}

export function validatePersonaCount(count: number): boolean {
  return count <= frontendConfig.limits.maxPersonas;
}

export function getValidationMessage(type: 'competitors' | 'topics' | 'personas'): string {
  switch (type) {
    case 'competitors':
      return frontendConfig.validation.maxCompetitors;
    case 'topics':
      return frontendConfig.validation.maxTopics;
    case 'personas':
      return frontendConfig.validation.maxPersonas;
    default:
      return '';
  }
}

// ===== EXPORTS =====
export default frontendConfig;
