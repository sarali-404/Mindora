const mongoose = require('mongoose');

const userGameProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // XP & Level
  totalXP: {
    type: Number,
    default: 0,
    min: 0
  },
  currentLevel: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold'],
    default: 'Bronze'
  },
  
  // Achievements earned (links to Achievement records)
  achievementsEarned: [{
    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'one-time'],
      default: 'one-time'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Study streaks (local timezone aware)
  currentStreak: {
    count: { type: Number, default: 0 },
    startDate: Date,
    lastStudyDate: Date,
    timezone: { type: String, default: 'UTC' }
  },
  
  longestStreak: {
    count: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date
  },
  
  // Activity tracking for achievements
  activityStats: {
    quizzesCompleted: { type: Number, default: 0 },
    quizAvgScore: { type: Number, default: 0 },
    essaysSubmitted: { type: Number, default: 0 },
    readingHoursTotal: { type: Number, default: 0 },
    materialsShared: { type: Number, default: 0 },
    goalsCompleted: { type: Number, default: 0 },
    goalsCreated: { type: Number, default: 0 },
    morningStudyDays: { type: Number, default: 0 }
  },
  
  // Social stats
  followers: {
    type: Number,
    default: 0
  },
  following: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  profileCreatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for leaderboards
userGameProfileSchema.index({ totalXP: -1 });
userGameProfileSchema.index({ user: 1 });

module.exports = mongoose.model('UserGameProfile', userGameProfileSchema);
