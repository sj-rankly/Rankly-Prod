const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  queryType: {
    type: String,
    enum: ['Informational', 'Navigational', 'Commercial', 'Transactional'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  metadata: {
    targetPersonas: [String],
    targetCompetitors: [String],
    generatedBy: {
      type: String,
      enum: ['ai', 'user'],
      default: 'user'
    }
  },
  performance: {
    tested: {
      type: Boolean,
      default: false
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    llmResults: [{
      llmProvider: {
        type: String,
        enum: ['openai', 'claude', 'gemini', 'perplexity', 'google_search']
      },
      testedAt: Date,
      response: String,
      mentioned: {
        brand: Boolean,
        competitors: [String]
      },
      citationScore: Number
    }],
    testResults: [{
      testDate: Date,
      success: Boolean,
      notes: String
    }]
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
promptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
promptSchema.index({ userId: 1 });
promptSchema.index({ userId: 1, topicId: 1 });
promptSchema.index({ userId: 1, status: 1 });
promptSchema.index({ userId: 1, urlAnalysisId: 1 }); // ✅ Index for urlAnalysisId filtering
promptSchema.index({ userId: 1, urlAnalysisId: 1, status: 1 }); // ✅ Composite index for common queries

module.exports = mongoose.model('Prompt', promptSchema);

