const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  // Achievement identifier
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
    // Path to achievement image in assets
  },
  
  // Tier information (one-time or multi-tier)
  isTiered: {
    type: Boolean,
    default: true
  },
  tiers: {
    bronze: {
      xpReward: { type: Number, default: 0 },
      criteria: { type: String, default: '' },
      description: String
    },
    silver: {
      xpReward: { type: Number, default: 0 },
      criteria: { type: String, default: '' },
      description: String
    },
    gold: {
      xpReward: { type: Number, default: 0 },
      criteria: { type: String, default: '' },
      description: String
    }
  },
  
  // For one-time achievements
  oneTimeTier: {
    xpReward: { type: Number, default: 0 },
    criteria: { type: String, default: '' }
  },
  
  // Achievement category for filtering
  category: {
    type: String,
    enum: ['goals', 'quizzes', 'reading', 'social', 'streaks', 'profile', 'other'],
    default: 'other'
  },
  
  // Evaluation logic key (for backend to know how to check)
  evaluationKey: {
    type: String,
    required: true
  },
  
  // Disabled flag
  enabled: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

achievementSchema.index({ key: 1 });
achievementSchema.index({ evaluationKey: 1 });
achievementSchema.index({ category: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);
