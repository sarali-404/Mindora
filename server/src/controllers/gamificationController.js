/**
 * Gamification Controller
 * Handles all XP, achievement, and leaderboard API endpoints
 */

const gamificationService = require('../services/gamificationService');
const User = require('../models/User');

/**
 * Add XP to user
 * @route POST /api/gamification/xp/add
 */
const addXP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { source, amount } = req.body;

    if (!source || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid source or amount' });
    }

    const result = await gamificationService.addXP(userId, source, amount);

    res.json({
      message: 'XP added successfully',
      result
    });
  } catch (error) {
    console.error('Add XP error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user game profile with achievements
 * @route GET /api/gamification/profile
 */
const getGameProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await gamificationService.getUserGameProfile(userId);

    res.json(profile);
  } catch (error) {
    console.error('Get game profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get leaderboard
 * @route GET /api/gamification/leaderboard
 * @query limit (default: 100)
 * @query page (default: 1)
 */
const getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const leaderboard = await gamificationService.getLeaderboard(limit, page);

    res.json({
      leaderboard,
      pagination: {
        limit,
        page,
        totalEntries: leaderboard.length
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's rank
 * @route GET /api/gamification/rank
 */
const getUserRank = async (req, res) => {
  try {
    const userId = req.user._id;
    const rank = await gamificationService.getUserRank(userId);

    res.json({ rank });
  } catch (error) {
    console.error('Get user rank error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Evaluate achievements for user (manual trigger)
 * @route POST /api/gamification/achievements/evaluate
 */
const evaluateAchievements = async (req, res) => {
  try {
    const userId = req.user._id;
    const newAchievements = await gamificationService.evaluateAchievements(userId);

    res.json({
      message: 'Achievements evaluated',
      newAchievements,
      count: newAchievements.length
    });
  } catch (error) {
    console.error('Evaluate achievements error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's current level and XP info
 * @route GET /api/gamification/level-info
 */
const getLevelInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await gamificationService.getUserGameProfile(userId);

    const level = gamificationService.calculateLevel(profile.totalXP);
    
    // Calculate XP thresholds for visual display
    const xpThresholds = {
      bronze: { min: 0, max: 4999 },
      silver: { min: 5000, max: 14999 },
      gold: { min: 15000, max: null }
    };

    const currentThreshold = xpThresholds[level];
    const nextLevel = level === 'bronze' ? 'silver' : level === 'silver' ? 'gold' : null;
    const nextThreshold = nextLevel ? xpThresholds[nextLevel] : null;
    const xpToNextLevel = nextThreshold ? nextThreshold.min - profile.totalXP : null;

    res.json({
      totalXP: profile.totalXP,
      currentLevel: level,
      currentThreshold,
      nextLevel,
      nextThreshold,
      xpToNextLevel,
      achievementsEarned: profile.achievementsEarned.length
    });
  } catch (error) {
    console.error('Get level info error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get activity stats
 * @route GET /api/gamification/activity-stats
 */
const getActivityStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await gamificationService.getUserGameProfile(userId);

    res.json({
      activityStats: profile.activityStats,
      streaks: profile.streaks
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Compare stats with another user (for social features)
 * @route GET /api/gamification/compare/:userId
 */
const compareStats = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    const currentProfile = await gamificationService.getUserGameProfile(currentUserId);
    const otherProfile = await gamificationService.getUserGameProfile(otherUserId);

    // Get user info for comparison display
    const currentUser = await User.findById(currentUserId).select('name avatar');
    const otherUser = await User.findById(otherUserId).select('name avatar');

    res.json({
      currentUser: {
        ...currentUser.toObject(),
        totalXP: currentProfile.totalXP,
        level: gamificationService.calculateLevel(currentProfile.totalXP),
        achievements: currentProfile.achievementsEarned.length
      },
      otherUser: {
        ...otherUser.toObject(),
        totalXP: otherProfile.totalXP,
        level: gamificationService.calculateLevel(otherProfile.totalXP),
        achievements: otherProfile.achievementsEarned.length
      },
      comparison: {
        xpDifference: currentProfile.totalXP - otherProfile.totalXP,
        achievementDifference: currentProfile.achievementsEarned.length - otherProfile.achievementsEarned.length
      }
    });
  } catch (error) {
    console.error('Compare stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addXP,
  getGameProfile,
  getLeaderboard,
  getUserRank,
  evaluateAchievements,
  getLevelInfo,
  getActivityStats,
  compareStats
};
