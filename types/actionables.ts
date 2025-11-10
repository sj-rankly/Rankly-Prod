export type ActionableReason =
  | 'low_llm_traffic_with_citations'
  | 'low_llm_traffic'
  | 'mapping_required'
  | 'missing_citation'
  | 'unknown'

export interface ActionableTrafficMetrics {
  sessions: number
  sqs?: number
  conversionRate?: number
  bounceRate?: number
  timeOnPage?: number
}

export interface ActionableCitationDetail {
  platform: string
  url: string
  promptId?: string
  promptText?: string
  citationType?: string
  firstSeenAt?: string
  lastSeenAt?: string
}

export interface ActionableCitationSummary {
  platforms: string[]
  totalCitations: number
  details: ActionableCitationDetail[]
}

export interface ActionableUrlMapping {
  sourceUrl: string
  targetUrl: string
  note?: string
}

export interface ActionablePageContentCandidate {
  url: string
  label?: string
}

export interface ActionablePageContentMetadata {
  title: string | null
  description: string | null
  keywords: string | null
  contentBlocks: ActionableContentBlock[] | null
  headings: {
    h1?: string[]
    h2?: string[]
    h3?: string[]
  } | null
  paragraphCount: number
  contactInfo: {
    emails?: string[]
    phones?: string[]
    addresses?: string[]
  } | null
  businessInfo: {
    companyName?: string
    tagline?: string
    services?: string[]
  } | null
  socialLinks: string[] | null
  htmlSnapshot: string | null // ✅ NEW: Full HTML snapshot for preview injection
}

export interface ActionablePageContentWarning {
  url: string
  source?: string
  message?: string
}

export interface ActionableContentBlock {
  type: string
  text: string
  listType?: 'ordered' | 'unordered' | null
}

export interface ActionablePageContentResponse {
  markdown: string
  resolvedUrl: string | null
  requestedUrl: string | null
  attemptedUrls: ActionablePageContentCandidate[]
  metadata: ActionablePageContentMetadata
  scrapedAt: string
  warnings?: ActionablePageContentWarning[]
}

export interface ActionablePageContentRequest {
  url?: string
  normalizedUrl?: string
  mapping?: ActionableUrlMapping | null
  mappingTargetUrl?: string
  sourceUrls?: string[]
}

export interface HtmlPreviewResponse {
  previewId: string
  previewUrl: string
}

export interface ActionableRegenerateContentRequest {
  originalContent: string
  model?: string
  metadata?: ActionablePageContentMetadata | null
  context?: Record<string, unknown>
  pageUrl?: string
  persona?: string
  objective?: string
  urlAnalysisId?: string // ✅ NEW: Pass urlAnalysisId to fetch personas/topics
}

export interface RegenerationSummary {
  summary: string
  core_value_proposition?: string[]
  structural_outline?: Array<{ section: string; purpose: string; coverage_score?: string }>
  search_intent_hypotheses?: string[]
  content_gaps?: string[]
  risk_flags?: string[]
}

export interface RegenerationIntent {
  initial_intent?: {
    statement?: string
    supporting_queries?: string[]
    confidence?: string
    creator_assumptions?: string[]
  }
  reflection?: {
    who?: Array<{
      inferred_role: string // ✅ Persona type from onboarding (e.g., "Enterprise CTO")
      description?: string // ✅ Persona description from onboarding
      painPoints?: string[] // ✅ Persona pain points from onboarding
      goals?: string[] // ✅ Persona goals from onboarding
      relevance?: 'High' | 'Medium' | 'Low' // ✅ Persona relevance from onboarding
      rationale?: string // Why this persona searches for THIS PAGE
      domain_background?: string
      knowledge_profile?: 'novice' | 'intermediate' | 'expert'
    }>
    what?: Array<{
      role: string // ✅ Must match inferred_role from WHO (persona type)
      relevant_topics?: string[] // ✅ Map onboarding topics to this persona
      retrieval_needs?: string[] // ✅ Derived from persona painPoints/goals
      candidate_motivations?: string[] // ✅ Derived from persona goals
      search_goals?: string[] // ✅ Derived from persona painPoints
      domain_background?: string // ✅ Derived from persona description
      knowledge_profile?: 'novice' | 'intermediate' | 'expert'
      role_specific_constraints?: string[] // ✅ Derived from persona painPoints/goals
    }>
    why?: Array<{
      role: string // ✅ Must match inferred_role from WHO (persona type)
      initial_intent_statement?: string // ✅ Quote from initial intent
      role_specific_need?: string // ✅ What persona needs (from WHAT)
      semantic_gap?: string // ✅ Gap between initial intent and persona need
      misalignment_cause?: string // ✅ Consider persona painPoints/goals
      impact?: string
    }>
    how?: {
      core_informational_focus?: string // ✅ What to preserve
      semantic_reconstruction?: string // ✅ How to reconstruct for ALL personas
      generalization_strategy?: string // ✅ Address all personas
      adaptability_enhancements?: string[] // ✅ Per persona
      topic_coverage?: string // ✅ How topics are addressed per persona
      constraint_propagation?: string
    }
  }
  refined_intent?: {
    intent_statement?: string // ✅ FIXED: Semantically reconstructed intent
    preserved_core?: string // ✅ FIXED: What core was preserved
    expanded_scope?: string // ✅ FIXED: How scope was expanded
    micro_moments?: string[]
    success_criteria?: string[]
    alignment_notes?: string[]
  }
}

export interface RegenerationPlan {
  optimization_objectives?: Array<{
    objective: string
    intent_link?: string
    evidence?: string
  }>
  step_plan?: Array<{
    step: number
    focus_area: string
    action: string
    reasoning?: string
    success_signal?: string
  }>
  tone_and_voice?: {
    voice?: string
    reading_level?: string
    style_guidelines?: string[]
  }
  metadata_directives?: {
    title?: string
    description?: string
    schema?: string[]
  }
}

export interface RegenerationRewriteMeta {
  highlights?: string[]
  cta_recommendations?: string[]
  metadata?: {
    title?: string
    description?: string
    faq?: Array<{ question: string; answer: string }>
  }
}

// ✅ NEW: Evaluation types for before/after comparison
export interface PAWCEvaluation {
  depthOfMention: number | null
  sampleSize: number
  note?: string
  error?: string
}

export interface SubjectiveMetricsEvaluation {
  scores: {
    relevance: number
    influence: number
    uniqueness: number
    position: number
    clickProbability: number
    diversity: number
    overallQuality: number
  } | null
  averageScore: number | null
  sampleSize: number
  weakAreas?: string[]
  note?: string
  error?: string
}

export interface ContentQualityEvaluation {
  overallScore: number
  wordCount: number
  headingCount: number
  paragraphCount: number
  listCount: number
  structureScore: number
  note: string
}

export interface ContentEvaluation {
  timestamp: string
  pageUrl: string
  brandName: string
  isRegenerated: boolean
  contentLength: number
  pawc: PAWCEvaluation
  subjectiveMetrics: SubjectiveMetricsEvaluation
  contentQuality: ContentQualityEvaluation
}

export interface ImprovementReport {
  timestamp: string
  before: ContentEvaluation
  after: ContentEvaluation
  improvements: {
    pawc?: {
      before: number | null
      after: number | null
      delta: number | null
      percentChange?: number
      improved?: boolean
      note?: string
    }
    subjectiveMetrics?: {
      before: Record<string, number> | null
      after: Record<string, number> | null
      deltas?: Record<string, {
        before: number
        after: number
        delta: number
        percentChange: number
        improved: boolean
      }>
      averageDelta?: number
      improvedMetricsCount?: number
      improvedMetrics?: string[]
      degradedMetrics?: string[]
      note?: string
    }
    contentQuality?: {
      before: number
      after: number
      delta: number
      improved: boolean
    }
  }
  overallImprovement: number | null
  summary: {
    improved: boolean
    improvementPercentage: number
    keyImprovements: string[]
    keyDegradations: string[]
    warnings?: Array<{
      type: 'semantic_drift' | 'other'
      severity: 'none' | 'low' | 'high' | 'critical' | 'error'
      message: string
      similarity?: number | null
    }>
  }
}

// ✅ NEW: Semantic drift measurement types
export interface SemanticDriftMeasurement {
  similarity: number | null // Cosine similarity (0-1, where 1 = identical)
  driftDetected: boolean | null // True if similarity < threshold
  severity: 'none' | 'low' | 'high' | 'critical' | 'error'
  threshold: number // Drift threshold (default: 0.7)
  criticalThreshold?: number // Critical drift threshold (default: 0.5)
  recommendation: string // Human-readable recommendation
  timestamp?: string
  error?: string // Error message if measurement failed
  note?: string // Additional notes
}

export interface ActionableRegenerateContentResponse {
  model: string
  content: string
  summary: RegenerationSummary
  intent: RegenerationIntent
  plan: RegenerationPlan
  rewriteMeta?: RegenerationRewriteMeta
  usage?: {
    totalTokens: number
    perStage: {
      summarization: number
      initialIntent: number // ✅ FIXED: Stage 2a
      refinedIntent: number // ✅ FIXED: Stage 2b
      intent: number // Combined total
      plan: number
      rewrite: number
    }
  }
  // ✅ NEW: Semantic drift measurement
  semanticDrift?: SemanticDriftMeasurement
  // ✅ NEW: Before/after evaluation results
  evaluation?: {
    before: ContentEvaluation | null
    after: ContentEvaluation | null
    improvement: ImprovementReport | null
  }
}

export interface ActionablePageRow {
  id: string
  title?: string
  url: string
  normalizedUrl: string
  hostname: string
  sourceUrls?: string[]
  traffic: ActionableTrafficMetrics
  citations: ActionableCitationSummary
  platformSessions?: Record<string, number>
  contentGroup?: string
  llmJourney?: string
  provider?: string
  recommendedAction: 'create-content' | 'regenerate-content'
  actionableReason: ActionableReason
  hasMappingWarning?: boolean
  mapping?: ActionableUrlMapping
}


