const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Notification toggles
  notifications: {
    // In-app notifications
    inApp: {
      achievements: { type: Boolean, default: true },
      goalProgress: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true },
      sessions: { type: Boolean, default: true }
    },
    
    // Email notifications
    email: {
      achievements: { type: Boolean, default: true },
      goalProgress: { type: Boolean, default: false },
      social: { type: Boolean, default: false },
      recommendations: { type: Boolean, default: true },
      sessions: { type: Boolean, default: true },
      digestFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'never'],
        default: 'weekly'
      }
    }
  },
  
  // Display preferences
  display: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  
  // Timezone for streak calculations
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Privacy settings
  privacy: {
    profilePublic: { type: Boolean, default: true },
    showXPOnLeaderboard: { type: Boolean, default: true },
    allowFollowers: { type: Boolean, default: true }
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userPreferencesSchema.index({ user: 1 });

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
