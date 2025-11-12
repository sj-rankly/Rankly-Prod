const mongoose = require('mongoose');

const BrandMetricsSchema = new mongoose.Schema({
  brandId: { type: String, required: true },
  brandName: { type: String, required: true },
  isOwner: { type: Boolean, default: false }, // Whether this is the user's brand

  // Visibility Score (primary metric)
  visibilityScore: { type: Number, required: true }, // Percentage (0-100)
  visibilityRank: { type: Number, required: true },
  visibilityRankChange: { type: Number },

  // Primary ranking metric
  totalMentions: { type: Number, required: true },
  mentionRank: { type: Number, required: true },
  mentionRankChange: { type: Number },

  shareOfVoice: { type: Number, required: true },
  shareOfVoiceRank: { type: Number, required: true },
  shareOfVoiceRankChange: { type: Number },

  avgPosition: { type: Number, required: true },
  avgPositionRank: { type: Number, required: true },
  avgPositionRankChange: { type: Number },

  // Depth of Mention (exponential decay formula)
  depthOfMention: { type: Number, required: true }, // Percentage (0-100)
  depthRank: { type: Number, required: true },
  depthRankChange: { type: Number },

  // Citation metrics
  citationShare: { type: Number, required: true }, // % of tests where brand was cited
  citationShareRank: { type: Number, required: true },
  brandCitationsTotal: { type: Number, required: true },    // Total direct brand citations
  earnedCitationsTotal: { type: Number, required: true },   // Total earned media citations
  socialCitationsTotal: { type: Number, required: true },   // Total social citations
  totalCitations: { type: Number, required: true },         // Sum of all citation types

  // Sentiment metrics
  sentimentScore: { type: Number, min: -1, max: 1, required: true }, // Average sentiment (-1 to +1)
  sentimentBreakdown: {
    positive: { type: Number, default: 0 },    // Count of positive mentions
    neutral: { type: Number, default: 0 },     // Count of neutral mentions
    negative: { type: Number, default: 0 },    // Count of negative mentions
    mixed: { type: Number, default: 0 }        // Count of mixed sentiment
  },
  sentimentShare: { type: Number, required: true }, // % positive mentions

  count1st: { type: Number, required: true },
  count2nd: { type: Number, required: true },
  count3rd: { type: Number, required: true },
  rank1st: { type: Number, required: true },
  rank2nd: { type: Number, required: true },
  rank3rd: { type: Number, required: true },

  totalAppearances: { type: Number, required: true }
}, { _id: false });

const AggregatedMetricsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    index: true
  },

  scope: {
    type: String,
    required: true,
    enum: ['overall', 'platform', 'topic', 'persona', 'prompt']
  },
  scopeValue: { type: String },

  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },

  totalPrompts: { type: Number, required: true },
  totalResponses: { type: Number, required: true },
  totalBrands: { type: Number, required: true },

  brandMetrics: [BrandMetricsSchema],

  lastCalculated: { type: Date, default: Date.now },
  promptTestIds: [{ type: String }]
});

// Composite indexes for efficient querying
AggregatedMetricsSchema.index({ userId: 1, urlAnalysisId: 1, scope: 1, scopeValue: 1, dateFrom: 1, dateTo: 1 });
AggregatedMetricsSchema.index({ userId: 1, urlAnalysisId: 1, lastCalculated: -1 });
AggregatedMetricsSchema.index({ userId: 1, scope: 1, scopeValue: 1, dateFrom: 1, dateTo: 1 });

module.exports = mongoose.model('AggregatedMetrics', AggregatedMetricsSchema);
