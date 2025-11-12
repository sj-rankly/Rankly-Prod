const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema({
  description: { type: String, required: true },
  impact: { type: String, required: true, enum: ['High', 'Medium', 'Low'] },
  recommendation: { type: String, required: true }
}, { _id: false });

const PerformanceInsightSchema = new mongoose.Schema({
  metric: { type: String, required: true },
  description: { type: String, required: true },
  value: { type: Number },
  gap: { type: Number },
  rank: { type: Number }
}, { _id: false });

const InsightsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    index: true
  },
  tabType: { 
    type: String, 
    required: true, 
    enum: ['visibility', 'prompts', 'sentiment', 'citations'],
    index: true
  },
  whatsWorking: [InsightSchema],
  needsAttention: [InsightSchema],
  performanceInsights: [PerformanceInsightSchema],
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours
});

// Indexes for efficient querying
InsightsSchema.index({ userId: 1, tabType: 1, generatedAt: -1 });
InsightsSchema.index({ userId: 1, urlAnalysisId: 1, tabType: 1 });
InsightsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

module.exports = mongoose.model('Insights', InsightsSchema);
