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
    // Use atomic upsert to avoid race conditions when multiple requests
    // fire simultaneously for a user with no existing game profile
    const profile = await UserGameProfile.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
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

    // Update daily streak
    await updateStreak(userId);

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
 * Determine the highest qualifying level number for a tiered achievement.
 * Returns 0 if no tier is met.
 */
function getHighestQualifyingLevel(achievement, profile) {
  const stats = profile.activityStats;
  const streak = profile.currentStreak.count;

  switch (achievement.evaluationKey) {
    case 'goal_architect': {
      const thresholds = [1, 3, 5, 10, 20];
      let level = 0;
      thresholds.forEach((t, i) => { if (stats.goalsCreated >= t) level = i + 1; });
      return level;
    }
    case 'quiz_master': {
      // [quizzes, minAvgScore] per level
      const criteria = [[5, 70], [15, 75], [30, 80], [60, 85], [100, 90]];
      let level = 0;
      criteria.forEach(([q, s], i) => {
        if (stats.quizzesCompleted >= q && stats.quizAvgScore >= s) level = i + 1;
      });
      return level;
    }
    case 'reading_bird': {
      const thresholds = [5, 15, 30, 60, 100];
      let level = 0;
      thresholds.forEach((t, i) => { if (stats.readingHoursTotal >= t) level = i + 1; });
      return level;
    }
    case 'memory_master': {
      const criteria = [[10, 70], [20, 75], [30, 80], [50, 85], [75, 90]];
      let level = 0;
      criteria.forEach(([q, s], i) => {
        if (stats.quizzesCompleted >= q && stats.quizAvgScore >= s) level = i + 1;
      });
      return level;
    }
    case 'goal_crusher': {
      const thresholds = [1, 3, 10, 20, 50];
      let level = 0;
      thresholds.forEach((t, i) => { if (stats.goalsCompleted >= t) level = i + 1; });
      return level;
    }
    case 'teaching_bird': {
      const thresholds = [1, 5, 20, 50, 100];
      let level = 0;
      thresholds.forEach((t, i) => { if (stats.materialsShared >= t) level = i + 1; });
      return level;
    }
    case 'streak_master': {
      const thresholds = [7, 30, 90, 180, 365];
      let level = 0;
      thresholds.forEach((t, i) => { if (streak >= t) level = i + 1; });
      return level;
    }
    case 'morning_champion': {
      const thresholds = [14, 30, 60, 120, 365];
      let level = 0;
      thresholds.forEach((t, i) => { if (stats.morningStudyDays >= t) level = i + 1; });
      return level;
    }
    default:
      return 0;
  }
}

/**
 * Check and award achievements based on criteria.
 * Supports tiered upgrades (level 1→2→3→4→5) and one-time achievements.
 * Returns array of newly awarded/upgraded achievements.
 */
async function evaluateAchievements(userId) {
  try {
    const profile = await UserGameProfile.findOne({ user: userId });
    if (!profile) return [];

    const achievements = await Achievement.find({ enabled: true });
    const newlyAwarded = [];

    for (const achievement of achievements) {
      const existingIndex = profile.achievementsEarned.findIndex(
        a => a.achievement.toString() === achievement._id.toString()
      );
      const existingEntry = existingIndex !== -1 ? profile.achievementsEarned[existingIndex] : null;

      // --- One-time achievements ---
      if (!achievement.isTiered) {
        if (existingEntry) continue; // already earned, skip

        let shouldAward = false;
        if (achievement.evaluationKey === 'welcome_aboard') shouldAward = true;
        if (achievement.evaluationKey === 'first_steps' && profile.activityStats.goalsCompleted >= 1) shouldAward = true;

        if (shouldAward) {
          const xpReward = achievement.oneTimeTier?.xpReward || 0;
          profile.achievementsEarned.push({
            achievement: achievement._id,
            tier: 'one-time',
            unlockedAt: Date.now()
          });
          if (xpReward > 0) {
            await addXP(userId, `achievement:${achievement.key}:one-time`, xpReward);
          }
          newlyAwarded.push({ achievementId: achievement._id, key: achievement.key, name: achievement.name, tier: 'one-time', xpReward });
          console.log(`🏆 Achievement Awarded: User=${userId}, Achievement=${achievement.name}, Tier=one-time, XP=${xpReward}`);
        }
        continue;
      }

      // --- Tiered achievements ---
      const currentLevel = existingEntry ? (parseInt(existingEntry.tier) || 0) : 0;
      const highestQualifying = getHighestQualifyingLevel(achievement, profile);

      if (highestQualifying <= currentLevel) continue; // no new level earned

      // Award XP for each newly unlocked level
      let totalXpAwarded = 0;
      for (let lvl = currentLevel + 1; lvl <= highestQualifying; lvl++) {
        const tierData = achievement.tiers.find(t => t.level === lvl);
        const xpReward = tierData?.xpReward || 0;
        if (xpReward > 0) {
          await addXP(userId, `achievement:${achievement.key}:${lvl}`, xpReward);
          totalXpAwarded += xpReward;
        }
      }

      // Update or create earned entry
      const newTierStr = String(highestQualifying);
      if (existingIndex !== -1) {
        profile.achievementsEarned[existingIndex].tier = newTierStr;
        profile.achievementsEarned[existingIndex].unlockedAt = Date.now();
      } else {
        profile.achievementsEarned.push({
          achievement: achievement._id,
          tier: newTierStr,
          unlockedAt: Date.now()
        });
      }

      newlyAwarded.push({
        achievementId: achievement._id,
        key: achievement.key,
        name: achievement.name,
        tier: newTierStr,
        xpReward: totalXpAwarded,
        previousLevel: currentLevel
      });

      console.log(`🏆 Achievement Upgraded: User=${userId}, Achievement=${achievement.name}, Lv.${currentLevel}→Lv.${highestQualifying}, XP=${totalXpAwarded}`);
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
    const isOneTime = tier === 'one-time';
    const levelNum = isOneTime ? null : parseInt(tier);
    const tierLabel = isOneTime ? '' : ` (Lv.${levelNum})`;

    const xpReward = isOneTime
      ? (achievement.oneTimeTier?.xpReward || 0)
      : (achievement.tiers?.find(t => t.level === levelNum)?.xpReward || 0);

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
        xpReward
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
    // Atomic upsert: creates profile if missing, handles concurrent requests safely
    const profile = await UserGameProfile.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('achievementsEarned.achievement');

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
 * Update user's daily study streak.
 * Call after any XP-earning activity.
 */
async function updateStreak(userId) {
  try {
    let profile = await UserGameProfile.findOne({ user: userId });
    if (!profile) {
      profile = await initializeGameProfile(userId);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastStudy = profile.currentStreak.lastStudyDate
      ? new Date(profile.currentStreak.lastStudyDate)
      : null;

    if (lastStudy) {
      const lastStudyDay = new Date(lastStudy.getFullYear(), lastStudy.getMonth(), lastStudy.getDate());
      const diffDays = Math.round((today - lastStudyDay) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already studied today — no change
        return profile.currentStreak.count;
      } else if (diffDays === 1) {
        // Consecutive day — increment
        profile.currentStreak.count += 1;
      } else {
        // Missed day(s) — reset
        profile.currentStreak.count = 1;
        profile.currentStreak.startDate = today;
      }
    } else {
      // First ever study activity
      profile.currentStreak.count = 1;
      profile.currentStreak.startDate = today;
    }

    profile.currentStreak.lastStudyDate = today;

    // Update longest streak if beaten
    if (profile.currentStreak.count > (profile.longestStreak?.count || 0)) {
      profile.longestStreak = {
        count: profile.currentStreak.count,
        startDate: profile.currentStreak.startDate,
        endDate: today
      };
    }

    await profile.save();
    return profile.currentStreak.count;
  } catch (error) {
    console.error('Update streak error:', error);
    return 0;
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
  updateStreak,
  updateActivityStats,
  evaluateAchievements,
  createAchievementNotification,
  getUserGameProfile,
  getLeaderboard,
  getUserRank
};
