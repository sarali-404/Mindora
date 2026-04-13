/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Notification list and bulk operations
router.get('/', protect, notificationController.getNotifications);
router.get('/count', protect, notificationController.getNotificationCount);
router.put('/mark-all-read', protect, notificationController.markAllAsRead);
router.delete('/all', protect, notificationController.deleteAllNotifications);

// Get by type
router.get('/type/:type', protect, notificationController.getNotificationsByType);

// Individual notification operations
router.put('/:notificationId/read', protect, notificationController.markAsRead);
router.delete('/:notificationId', protect, notificationController.deleteNotification);

// Preference routes
router.get('/preferences', protect, notificationController.getPreferences);
router.put('/preferences', protect, notificationController.updatePreferences);
router.put('/preferences/:setting', protect, notificationController.updatePreferenceSetting);

module.exports = router;
