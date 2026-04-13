const UserGameProfile = require('../models/UserGameProfile');
const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');
const User = require('../models/User');

// XP Thresholds
const XP_THRESHOLDS = {
  BRONZE: { min: 0, max: 4999 },
  SILVER: { min: 5000, max: 14999 },
  GOLD: { min: 15000, max: Infinity }
};

/**
 * Calculate level (Bronze/Silver/Gold) based on total XP
 */
function calculateLevel(totalXP) {
  if (totalXP >= XP_THRESHOLDS.GOLD.min) return 'Gold';
  if (totalXP >= XP_THRESHOLDS.SILVER.min) return 'Silver';
  return 'Bronze';
}

/**
 * Initialize game profile for new user
 */
async function initializeGameProfile(userId) {
  try {
    const existingProfile = await UserGameProfile.findOne({ user: userId });
    if (existingProfile) return existingProfile;

    const profile = new UserGameProfile({
      user: userId,
      totalXP: 0,
      currentLevel: 'Bronze',
      currentStreak: { count: 0 }
    });

    await profile.save();
    return profile;
  } catch (error) {
    console.error('Initialize game profile error:', error);
    throw error;
  }
}

/**
 * Add XP to user (main entry point for all activities)
 * Returns { newXP, leveledUp, previousLevel, newLevel }
 */
async function addXP(userId, source, amount) {
  try {
    let profile = await UserGameProfile.findOne({ user: userId });
    if (!profile) {
      profile = await initializeGameProfile(userId);
    }

    const previousLevel = profile.currentLevel;
    const previousXP = profile.totalXP;
    
    // Add XP
    profile.totalXP += Math.max(0, amount);
    
    // Update level
    const newLevel = calculateLevel(profile.totalXP);
    const leveledUp = newLevel !== previousLevel;
    profile.currentLevel = newLevel;
    
    profile.lastUpdatedAt = Date.now();
    await profile.save();

    // Log for debugging
    console.log(`✅ XP Added: User=${userId}, Source=${source}, Amount=${amount}, Total=${profile.totalXP}, Level=${newLevel}`);

    return {
      newXP: profile.totalXP,
      xpGained: amount,
      leveledUp,
      previousLevel,
      newLevel,
      source
    };
  } catch (error) {
    console.error('Add XP error:', error);
    throw error;
  }
}

/**
 * Update activity stats (called after quizzes, essays, etc.)
 */
async function updateActivityStats(userId, updates) {
  try {
    const profile = await UserGameProfile.findOne({ user: userId });
    if (!profile) {
      return initializeGameProfile(userId);
    }

    // Update activity stats
    if (updates.quizzesCompleted) {
      profile.activityStats.quizzesCompleted += updates.quizzesCompleted;
    }
    if (updates.quizAvgScore !== undefined) {
      // Running average
      const total = profile.activityStats.quizzesCompleted;
      const oldAvg = profile.activityStats.quizAvgScore;
      profile.activityStats.quizAvgScore = (oldAvg * (total - 1) + updates.quizAvgScore) / total;
    }
    if (updates.essaysSubmitted) {
      profile.activityStats.essaysSubmitted += updates.essaysSubmitted;
    }
    if (updates.readingHours) {
      profile.activityStats.readingHoursTotal += updates.readingHours;
    }
    if (updates.materialsShared) {
      profile.activityStats.materialsShared += updates.materialsShared;
    }
    if (updates.goalsCompleted) {
      profile.activityStats.goalsCompleted += updates.goalsCompleted;
    }
    if (updates.goalsCreated) {
      profile.activityStats.goalsCreated += updates.goalsCreated;
    }

    profile.lastUpdatedAt = Date.now();
    await profile.save();

    return profile;
  } catch (error) {
    console.error('Update activity stats error:', error);
    throw error;
  }
}

/**
 * Check and award achievements based on criteria
 * Returns array of newly awarded achievements
 */
async function evaluateAchievements(userId) {
  try {
    const profile = await UserGameProfile.findOne({ user: userId });
    if (!profile) return [];

    const achievements = await Achievement.find({ enabled: true });
    const newlyAwarded = [];

    for (const achievement of achievements) {
      // Check if already awarded
      const alreadyAwarded = profile.achievementsEarned.some(
        a => a.achievement.toString() === achievement._id.toString()
      );

      if (alreadyAwarded) continue;

      // Evaluate based on achievement key
      let tierToAward = null;

      switch (achievement.evaluationKey) {
        case 'welcome_aboard':
          tierToAward = 'one-time';
          break;

        case 'first_steps':
          if (profile.activityStats.goalsCompleted >= 1) {
            tierToAward = 'one-time';
          }
          break;

        case 'goal_architect':
          if (profile.activityStats.goalsCreated >= 5) tierToAward = 'gold';
          else if (profile.activityStats.goalsCreated >= 3) tierToAward = 'silver';
          else if (profile.activityStats.goalsCreated >= 1) tierToAward = 'bronze';
          break;

        case 'quiz_master':
          if (profile.activityStats.quizzesCompleted >= 30 && profile.activityStats.quizAvgScore >= 90) tierToAward = 'gold';
          else if (profile.activityStats.quizzesCompleted >= 15 && profile.activityStats.quizAvgScore >= 80) tierToAward = 'silver';
          else if (profile.activityStats.quizzesCompleted >= 5 && profile.activityStats.quizAvgScore >= 70) tierToAward = 'bronze';
          break;

        case 'reading_bird':
          if (profile.activityStats.readingHoursTotal >= 30) tierToAward = 'gold';
          else if (profile.activityStats.readingHoursTotal >= 15) tierToAward = 'silver';
          else if (profile.activityStats.readingHoursTotal >= 5) tierToAward = 'bronze';
          break;

        case 'memory_master':
          if (profile.activityStats.quizzesCompleted >= 30 && profile.activityStats.quizAvgScore >= 90) tierToAward = 'gold';
          else if (profile.activityStats.quizzesCompleted >= 20 && profile.activityStats.quizAvgScore >= 80) tierToAward = 'silver';
          else if (profile.activityStats.quizzesCompleted >= 10 && profile.activityStats.quizAvgScore >= 75) tierToAward = 'bronze';
          break;

        case 'goal_crusher':
          if (profile.activityStats.goalsCompleted >= 10) tierToAward = 'gold';
          else if (profile.activityStats.goalsCompleted >= 3) tierToAward = 'silver';
          else if (profile.activityStats.goalsCompleted >= 1) tierToAward = 'bronze';
          break;

        case 'teaching_bird':
          if (profile.activityStats.materialsShared >= 20) tierToAward = 'gold';
          else if (profile.activityStats.materialsShared >= 5) tierToAward = 'silver';
          else if (profile.activityStats.materialsShared >= 1) tierToAward = 'bronze';
          break;

        case 'streak_master':
          if (profile.currentStreak.count >= 90) tierToAward = 'gold';
          else if (profile.currentStreak.count >= 30) tierToAward = 'silver';
          else if (profile.currentStreak.count >= 7) tierToAward = 'bronze';
          break;

        case 'morning_champion':
          if (profile.activityStats.morningStudyDays >= 60) tierToAward = 'gold';
          else if (profile.activityStats.morningStudyDays >= 30) tierToAward = 'silver';
          else if (profile.activityStats.morningStudyDays >= 14) tierToAward = 'bronze';
          break;
      }

      if (tierToAward) {
        const tierData = tierToAward === 'one-time' ? achievement.oneTimeTier : achievement.tiers[tierToAward];
        const xpReward = tierData?.xpReward || 0;

        // Award achievement
        profile.achievementsEarned.push({
          achievement: achievement._id,
          tier: tierToAward,
          unlockedAt: Date.now()
        });

        // Add XP reward
        if (xpReward > 0) {
          await addXP(userId, `achievement:${achievement.key}:${tierToAward}`, xpReward);
        }

        newlyAwarded.push({
          achievementId: achievement._id,
          key: achievement.key,
          name: achievement.name,
          tier: tierToAward,
          xpReward
        });

        console.log(`🏆 Achievement Awarded: User=${userId}, Achievement=${achievement.name}, Tier=${tierToAward}, XP=${xpReward}`);
      }
    }

    if (newlyAwarded.length > 0) {
      profile.lastUpdatedAt = Date.now();
      await profile.save();
    }

    return newlyAwarded;
  } catch (error) {
    console.error('Evaluate achievements error:', error);
    throw error;
  }
}

/**
 * Create notification for achievement unlock
 */
async function createAchievementNotification(userId, achievement, tier) {
  try {
    const tierLabel = tier === 'one-time' ? '' : ` (${tier.charAt(0).toUpperCase() + tier.slice(1)})`;
    
    const notification = new Notification({
      user: userId,
      type: 'achievement',
      title: `🏆 Achievement Unlocked${tierLabel}`,
      message: `You earned "${achievement.name}" achievement!`,
      relatedEntity: {
        entityType: 'achievement',
        entityId: achievement._id
      },
      metadata: {
        achievementKey: achievement.key,
        tier: tier,
        xpReward: tier === 'one-time' ? achievement.oneTimeTier.xpReward : achievement.tiers[tier].xpReward
      }
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Create achievement notification error:', error);
    throw error;
  }
}

/**
 * Get user game profile
 */
async function getUserGameProfile(userId) {
  try {
    let profile = await UserGameProfile.findOne({ user: userId })
      .populate('achievementsEarned.achievement');
    
    if (!profile) {
      profile = await initializeGameProfile(userId);
    }

    return profile;
  } catch (error) {
    console.error('Get user game profile error:', error);
    throw error;
  }
}

/**
 * Get leaderboard (top N users by XP)
 */
async function getLeaderboard(limit = 100, page = 1) {
  try {
    const skip = (page - 1) * limit;

    const leaderboard = await UserGameProfile.find()
      .populate('user', 'username profile.firstName profile.lastName profile.avatar')
      .sort({ totalXP: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UserGameProfile.countDocuments();

    return {
      leaderboard,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Get leaderboard error:', error);
    throw error;
  }
}

/**
 * Get user's rank on leaderboard
 */
async function getUserRank(userId) {
  try {
    const profile = await UserGameProfile.findOne({ user: userId });
    if (!profile) return null;

    const rank = await UserGameProfile.countDocuments({
      totalXP: { $gt: profile.totalXP }
    }) + 1;

    return {
      rank,
      totalXP: profile.totalXP,
      currentLevel: profile.currentLevel
    };
  } catch (error) {
    console.error('Get user rank error:', error);
    throw error;
  }
}

module.exports = {
  calculateLevel,
  initializeGameProfile,
  addXP,
  updateActivityStats,
  evaluateAchievements,
  createAchievementNotification,
  getUserGameProfile,
  getLeaderboard,
  getUserRank
};
