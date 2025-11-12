const mongoose = require('mongoose');

/**
 * SubjectiveMetrics Schema
 * Stores qualitative evaluation metrics for brand citations in LLM responses
 */
const subjectiveMetricsSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    required: true,
    index: true
  },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    index: true
  },
  
  // Brand and Platform Info
  brandName: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    // Multiple platforms can be evaluated together
    required: true
  },
  
  // Subjective Metrics (0-5 scale for G-Eval 2.0, 1-5 for original G-Eval)
  relevance: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    reasoning: {
      type: String,
      required: true
    }
  },
  
  influence: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    reasoning: {
      type: String,
      required: true
    }
  },
  
  uniqueness: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    reasoning: {
      type: String,
      required: true
    }
  },
  
  position: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    reasoning: {
      type: String,
      required: true
    }
  },
  
  clickProbability: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    reasoning: {
      type: String,
      required: true
    }
  },
  
  diversity: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    reasoning: {
      type: String,
      required: true
    }
  },
  
  // Overall Assessment (0-5 scale for G-Eval 2.0)
  overallQuality: {
    score: {
      type: Number,
      required: true,
      min: 0, // ✅ UPDATED: Support 0-5 for G-Eval 2.0
      max: 5
    },
    summary: {
      type: String,
      required: true
    }
  },
  
  // Metadata
  evaluatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  model: {
    type: String,
    default: 'gpt-4o-mini'
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  evaluationTime: {
    type: Number, // milliseconds
    default: 0
  },
  cost: {
    type: Number, // USD
    default: 0
  },
  
  // Source Data (for reference and debugging)
  sourceData: {
    query: String,
    answer: String,
    citationText: String,
    sourceUrl: String,
    citationNumber: Number,
    answerLength: Number,
    totalCitations: Number
  },
  
  // ✅ NEW: G-Eval 2.0 metadata
  geval2Metadata: {
    methodology: String,
    rubricsGenerated: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  errorMessage: String
  
}, {
  timestamps: true
});

// Indexes for efficient querying
subjectiveMetricsSchema.index({ userId: 1, promptId: 1 });
subjectiveMetricsSchema.index({ promptId: 1, brandName: 1 }, { unique: true }); // One evaluation per prompt-brand
subjectiveMetricsSchema.index({ userId: 1, evaluatedAt: -1 });
subjectiveMetricsSchema.index({ brandName: 1 });

// Virtual for average score
subjectiveMetricsSchema.virtual('averageScore').get(function() {
  return (
    this.relevance.score +
    this.influence.score +
    this.uniqueness.score +
    this.position.score +
    this.clickProbability.score +
    this.diversity.score
  ) / 6;
});

// Method to get all scores as object
subjectiveMetricsSchema.methods.getScoresObject = function() {
  return {
    relevance: this.relevance.score,
    influence: this.influence.score,
    uniqueness: this.uniqueness.score,
    position: this.position.score,
    clickProbability: this.clickProbability.score,
    diversity: this.diversity.score,
    overallQuality: this.overallQuality.score,
    average: this.averageScore
  };
};

// Static method to get metrics summary for a prompt
subjectiveMetricsSchema.statics.getPromptSummary = async function(promptId, brandName) {
  const metrics = await this.find({ promptId, brandName });
  
  if (metrics.length === 0) return null;
  
  const avgScores = {
    relevance: 0,
    influence: 0,
    uniqueness: 0,
    position: 0,
    clickProbability: 0,
    diversity: 0,
    overallQuality: 0
  };
  
  metrics.forEach(metric => {
    avgScores.relevance += metric.relevance.score;
    avgScores.influence += metric.influence.score;
    avgScores.uniqueness += metric.uniqueness.score;
    avgScores.position += metric.position.score;
    avgScores.clickProbability += metric.clickProbability.score;
    avgScores.diversity += metric.diversity.score;
    avgScores.overallQuality += metric.overallQuality.score;
  });
  
  const count = metrics.length;
  Object.keys(avgScores).forEach(key => {
    avgScores[key] = Math.round((avgScores[key] / count) * 10) / 10;
  });
  
  return {
    avgScores,
    evaluationCount: count,
    lastEvaluated: metrics[0].evaluatedAt,
    platforms: [...new Set(metrics.map(m => m.platform))]
  };
};

const SubjectiveMetrics = mongoose.model('SubjectiveMetrics', subjectiveMetricsSchema);

module.exports = SubjectiveMetrics;

