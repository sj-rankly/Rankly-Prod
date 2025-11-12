const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  painPoints: [{
    type: String,
    trim: true
  }],
  goals: [{
    type: String,
    trim: true
  }],
  relevance: {
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
personaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
personaSchema.index({ userId: 1 });
personaSchema.index({ userId: 1, selected: 1 });

module.exports = mongoose.model('Persona', personaSchema);

