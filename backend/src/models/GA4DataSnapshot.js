const mongoose = require('mongoose');

const ga4DataSnapshotSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  propertyId: { type: String, required: true },
  dataType: { 
    type: String, 
    required: true
    // Can be any string like 'llm-platforms', 'platform-split-conversions', etc.
  },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Compound index for efficient queries
ga4DataSnapshotSchema.index({ 
  userId: 1, 
  propertyId: 1, 
  dataType: 1, 
  startDate: 1, 
  endDate: 1 
});

// TTL index to auto-delete expired data
ga4DataSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GA4DataSnapshot', ga4DataSnapshotSchema);

