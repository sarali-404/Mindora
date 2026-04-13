const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: ['achievement', 'goal_progress', 'social', 'recommendation', 'session', 'general'],
    required: true
  },
  
  // Content
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Reference to related entity (optional)
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['goal', 'achievement', 'user', 'session', 'material', null],
      default: null
    },
    entityId: mongoose.Schema.Types.ObjectId
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Email sent flag
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  
  // Metadata for notification details
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Expiration (auto-delete old notifications)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
