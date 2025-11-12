const mongoose = require('mongoose');

const promptTestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    index: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    required: true,
    index: true
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  
  // Test Configuration
  promptText: { 
    type: String, 
    required: true 
  },
  queryType: { 
    type: String, 
    enum: ['Informational', 'Navigational', 'Commercial', 'Transactional'],
    required: true 
  },
  
  // LLM Provider Info
  llmProvider: { 
    type: String, 
    enum: ['openai', 'gemini', 'claude', 'perplexity'],
    required: true,
    index: true
  },
  llmModel: { 
    type: String, 
    required: true 
  },
  
  // Raw LLM Response
  rawResponse: { 
    type: String, 
    required: true 
  },
  responseTime: { 
    type: Number, 
    default: 0 
  }, // in milliseconds
  tokensUsed: { 
    type: Number, 
    default: 0 
  },
  cost: { 
    type: Number, 
    default: 0 
  }, // in USD
  
  // Simplified scorecard - core metrics only
  scorecard: {
    brandMentioned: { type: Boolean, default: false },
    brandPosition: { type: Number, default: null }, // First sentence where brand appears
    brandMentionCount: { type: Number, default: 0 }, // Total mentions of user's brand
    
    // Citation metrics
    citationPresent: { type: Boolean, default: false },
    citationType: { type: String, enum: ['direct_link', 'reference', 'mention', 'none'], default: 'none' },
    brandCitations: { type: Number, default: 0 },      // Direct brand links
    earnedCitations: { type: Number, default: 0 },     // Third-party mentions
    socialCitations: { type: Number, default: 0 },     // Social media
    totalCitations: { type: Number, default: 0 },      // Sum of all
    
    // Sentiment analysis
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative', 'mixed'], default: 'neutral' },
    sentimentScore: { type: Number, min: -1, max: 1, default: 0 }, // -1 (negative) to +1 (positive)
    
    competitorsMentioned: [{ type: String }]
  },

  // Brand-level metrics - stores raw data for aggregation formulas
  brandMetrics: [{
    brandName: { type: String, required: true },
    mentioned: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false }, // Flag to identify user's brand vs competitors

    // Position metrics
    firstPosition: { type: Number }, // 1-indexed: where brand first appears in response (sentence number)
    mentionCount: { type: Number, default: 0 }, // Total mentions - PRIMARY METRIC

    // Sentence-level data (for Depth of Mention calculation)
    sentences: [{
      text: { type: String },
      position: { type: Number }, // 0-indexed sentence position in response
      wordCount: { type: Number }
    }],
    totalWordCount: { type: Number, default: 0 }, // Sum of words in all brand sentences

    // Citations - categorized by type
    citationMetrics: {
      brandCitations: { type: Number, default: 0 },    // Direct links to brand website (stripe.com)
      earnedCitations: { type: Number, default: 0 },   // Third-party articles/reviews
      socialCitations: { type: Number, default: 0 },   // Social media mentions
      totalCitations: { type: Number, default: 0 }     // Sum of all types
    },
    
    // Sentiment analysis
    sentiment: { 
      type: String, 
      enum: ['positive', 'neutral', 'negative', 'mixed'], 
      default: 'neutral' 
    },
    sentimentScore: { type: Number, min: -1, max: 1, default: 0 }, // -1 to +1
    sentimentDrivers: [{  // What drives the sentiment
      text: { type: String },
      sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
      keywords: [{ type: String }]
    }],
    
    // Detailed citation list
    citations: [{
      url: { type: String },
      type: { type: String, enum: ['brand', 'earned', 'social'] },
      context: { type: String }
    }]
  }],
  
  // Response Metadata (for Depth of Mention calculation)
  responseMetadata: {
    totalSentences: { type: Number, default: 0 },  // Total sentences in response
    totalWords: { type: Number, default: 0 },      // Total words in response
    totalBrandsDetected: { type: Number, default: 0 }
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  error: { type: String },
  
  // Timestamps
  testedAt: { type: Date, default: Date.now },
  scoredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
promptTestSchema.index({ userId: 1, testedAt: -1 });
promptTestSchema.index({ userId: 1, urlAnalysisId: 1, testedAt: -1 });
promptTestSchema.index({ promptId: 1, llmProvider: 1 });
promptTestSchema.index({ topicId: 1, status: 1 });
promptTestSchema.index({ status: 1, createdAt: 1 });

// Update timestamp on save
promptTestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for quick access
promptTestSchema.virtual('metrics').get(function() {
  return {
    visibility: this.scorecard.visibilityScore,
    overall: this.scorecard.overallScore
  };
});

module.exports = mongoose.model('PromptTest', promptTestSchema);


