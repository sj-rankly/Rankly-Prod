const mongoose = require('mongoose');

const competitorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    trim: true
  },
  similarity: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  source: {
    type: String,
    enum: ['ai', 'user'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
competitorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
competitorSchema.index({ userId: 1 });
competitorSchema.index({ userId: 1, selected: 1 });

module.exports = mongoose.model('Competitor', competitorSchema);

