const mongoose = require('mongoose');

const urlMappingRuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    required: true,
    index: true,
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true,
  },
  targetUrl: {
    type: String,
    required: true,
    trim: true,
  },
  note: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'urlMappingRules',
});

urlMappingRuleSchema.index({ userId: 1, urlAnalysisId: 1, sourceUrl: 1 }, { unique: true });

urlMappingRuleSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UrlMappingRule', urlMappingRuleSchema);



