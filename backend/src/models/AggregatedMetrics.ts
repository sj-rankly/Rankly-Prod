import mongoose, { Schema, Document } from 'mongoose';

// Granular metrics for a single brand
export interface IBrandMetrics {
  brandId: string;
  brandName: string;
  isOwner?: boolean; // Whether this is the user's brand

  // Visibility Score
  visibilityScore: number; // Percentage
  visibilityRank: number;
  visibilityRankChange?: number;

  // Word Count
  wordCount: number; // Percentage
  wordCountRank: number;
  wordCountRankChange?: number;

  // Depth of Mention
  depthOfMention: number; // Percentage (with exponential decay)
  depthRank: number;
  depthRankChange?: number;

  // Share of Voice
  shareOfVoice: number; // Percentage
  shareOfVoiceRank: number;
  shareOfVoiceRankChange?: number;

  // Average Position
  avgPosition: number;
  avgPositionRank: number;
  avgPositionRankChange?: number;

  // Position Distribution (1st, 2nd, 3rd+)
  count1st: number;
  count2nd: number;
  count3rd: number;
  rank1st: number;
  rank2nd: number;
  rank3rd: number;

  // Raw counts for calculations
  totalAppearances: number;
  totalMentions: number;
  totalWordCountRaw: number;
}

// Aggregated metrics document
export interface IAggregatedMetrics extends Document {
  userId: string;

  // Scope of aggregation
  scope: 'overall' | 'platform' | 'topic' | 'persona' | 'prompt';
  scopeValue?: string; // e.g., 'chatgpt', 'Landing Page Optimization', 'Digital Marketer'

  // Date range for this aggregation
  dateFrom: Date;
  dateTo: Date;

  // Total counts
  totalPrompts: number;
  totalResponses: number;
  totalBrands: number;

  // Metrics for each brand
  brandMetrics: IBrandMetrics[];

  // Metadata
  lastCalculated: Date;
  promptTestIds: string[]; // References to PromptTest documents used
}

const BrandMetricsSchema = new Schema({
  brandId: { type: String, required: true },
  brandName: { type: String, required: true },

  visibilityScore: { type: Number, required: true },
  visibilityRank: { type: Number, required: true },
  visibilityRankChange: { type: Number },

  wordCount: { type: Number, required: true },
  wordCountRank: { type: Number, required: true },
  wordCountRankChange: { type: Number },

  depthOfMention: { type: Number, required: true },
  depthRank: { type: Number, required: true },
  depthRankChange: { type: Number },

  shareOfVoice: { type: Number, required: true },
  shareOfVoiceRank: { type: Number, required: true },
  shareOfVoiceRankChange: { type: Number },

  avgPosition: { type: Number, required: true },
  avgPositionRank: { type: Number, required: true },
  avgPositionRankChange: { type: Number },

  count1st: { type: Number, required: true },
  count2nd: { type: Number, required: true },
  count3rd: { type: Number, required: true },
  rank1st: { type: Number, required: true },
  rank2nd: { type: Number, required: true },
  rank3rd: { type: Number, required: true },

  totalAppearances: { type: Number, required: true },
  totalMentions: { type: Number, required: true },
  totalWordCountRaw: { type: Number, required: true }
}, { _id: false });

const AggregatedMetricsSchema = new Schema({
  userId: { type: String, required: true, index: true },

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
AggregatedMetricsSchema.index({ userId: 1, scope: 1, scopeValue: 1, dateFrom: 1, dateTo: 1 });
AggregatedMetricsSchema.index({ userId: 1, lastCalculated: -1 });

export const AggregatedMetrics = mongoose.model<IAggregatedMetrics>('AggregatedMetrics', AggregatedMetricsSchema);
