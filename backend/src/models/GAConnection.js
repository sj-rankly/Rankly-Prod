const mongoose = require('mongoose');

const gaConnectionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: String,
  accessToken: String,
  accessTokenExpiry: Date,
  refreshToken: String,
  accountId: String,
  propertyId: String,
  accountName: String,
  propertyName: String,
  defaultUri: String, // Store the property's default URI (e.g., "https://fibr.ai")
  measurementId: String,
  streamId: String,
  lastDataSyncTime: Date,
  isActive: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add compound indexes for efficient queries
gaConnectionSchema.index({ userId: 1, deleted: 1 });
gaConnectionSchema.index({ userId: 1, isActive: 1, deleted: 1 });

module.exports = mongoose.model('GAConnection', gaConnectionSchema);

