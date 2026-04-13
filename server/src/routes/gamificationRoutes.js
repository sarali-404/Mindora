/**
 * Gamification Routes
 */

const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const { protect } = require('../middleware/auth');

// XP and Profile routes
router.post('/xp/add', protect, gamificationController.addXP);
router.get('/profile', protect, gamificationController.getGameProfile);
router.get('/level-info', protect, gamificationController.getLevelInfo);

// Achievement routes
router.post('/achievements/evaluate', protect, gamificationController.evaluateAchievements);

// Leaderboard routes
router.get('/leaderboard', protect, gamificationController.getLeaderboard);
router.get('/rank', protect, gamificationController.getUserRank);

// Activity stats routes
router.get('/activity-stats', protect, gamificationController.getActivityStats);

// Comparison routes
router.get('/compare/:userId', protect, gamificationController.compareStats);

module.exports = router;
