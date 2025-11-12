const mongoose = require('mongoose');

const urlAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  analysisDate: {
    type: Date,
    default: Date.now
  },
  analysisLevel: {
    type: String,
    enum: ['company', 'product', 'category'],
    default: 'company'
  },
  brandContext: {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    industry: {
      type: String,
      required: true,
      trim: true
    },
    businessModel: {
      type: String,
      required: true,
      trim: true
    },
    targetMarket: {
      type: String,
      required: true,
      trim: true
    },
    valueProposition: {
      type: String,
      required: true,
      trim: true
    },
    keyServices: [{
      type: String,
      trim: true
    }],
    brandTone: {
      type: String,
      required: true,
      trim: true
    },
    marketPosition: {
      type: String,
      required: true,
      trim: true
    }
  },
  productContext: {
    productName: {
      type: String,
      trim: true
    },
    productCategory: {
      type: String,
      trim: true
    },
    productType: {
      type: String,
      trim: true
    },
    targetAudience: {
      type: String,
      trim: true
    },
    valueProposition: {
      type: String,
      trim: true
    },
    keyFeatures: [{
      type: String,
      trim: true
    }],
    useCases: [{
      type: String,
      trim: true
    }],
    marketPosition: {
      type: String,
      trim: true
    }
  },
  categoryContext: {
    categoryName: {
      type: String,
      trim: true
    },
    categoryType: {
      type: String,
      trim: true
    },
    targetMarket: {
      type: String,
      trim: true
    },
    productTypes: [{
      type: String,
      trim: true
    }],
    marketTrends: [{
      type: String,
      trim: true
    }]
  },
  competitors: [{
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
    reason: {
      type: String,
      required: true,
      trim: true
    },
    similarity: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      required: true
    }
  }],
  topics: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    keywords: [{
      type: String,
      trim: true
    }],
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      required: true
    }
  }],
  personas: [{
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
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['completed', 'failed', 'processing'],
    default: 'completed'
  },
  testMetadata: {
    testRunId: {
      type: String
    },
    lowCostModels: {
      type: Boolean,
      default: false
    },
    testedAt: {
      type: Date
    }
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
urlAnalysisSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
urlAnalysisSchema.index({ userId: 1 });
urlAnalysisSchema.index({ userId: 1, url: 1 });
urlAnalysisSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UrlAnalysis', urlAnalysisSchema);
