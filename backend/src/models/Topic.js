const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
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
  selected: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  source: {
    type: String,
    enum: ['ai', 'user'],
    default: 'user'
  },
  promptCount: {
    type: Number,
    default: 0
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
topicSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
topicSchema.index({ userId: 1 });
topicSchema.index({ userId: 1, selected: 1 });

module.exports = mongoose.model('Topic', topicSchema);

