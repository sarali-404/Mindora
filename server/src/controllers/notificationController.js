/**
 * Notification Controller
 * Handles user notifications and preferences
 */

const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');

/**
 * Get user's notifications
 * @route GET /api/notifications
 * @query limit (default: 20)
 * @query page (default: 1)
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const result = await notificationService.getUserNotifications(userId, limit, page);

    res.json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark notification as read
 * @route PUT /api/notifications/:notificationId/read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await notificationService.markNotificationAsRead(notificationId, userId);

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark all notifications as read
 * @route PUT /api/notifications/mark-all-read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:notificationId
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId, userId);

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete all notifications
 * @route DELETE /api/notifications/all
 */
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({ user: userId });

    res.json({
      message: 'All notifications deleted',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get notification count (unread)
 * @route GET /api/notifications/count
 */
const getNotificationCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    const totalCount = await Notification.countDocuments({
      user: userId
    });

    res.json({
      unreadCount,
      totalCount
    });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user notification preferences
 * @route GET /api/notifications/preferences
 */
const getPreferences = async (req, res) => {
  try {
    const userId = req.user._id;

    const preferences = await notificationService.getUserPreferences(userId);

    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user notification preferences
 * @route PUT /api/notifications/preferences
 * @body preferences object with notification toggles
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    const updated = await notificationService.saveUserPreferences(userId, preferences);

    res.json({
      message: 'Preferences updated',
      preferences: updated
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update specific notification preference (toggle)
 * @route PUT /api/notifications/preferences/:setting
 * @param setting (e.g., 'notifications.inApp.achievements')
 * @body { value: boolean }
 */
const updatePreferenceSetting = async (req, res) => {
  try {
    const userId = req.user._id;
    const { setting } = req.params;
    const { value } = req.body;

    const preferences = await notificationService.getUserPreferences(userId);

    // Navigate nested object using dot notation
    const keys = setting.split('.');
    let current = preferences;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    const updated = await notificationService.saveUserPreferences(userId, preferences);

    res.json({
      message: `${setting} updated`,
      preferences: updated
    });
  } catch (error) {
    console.error('Update preference setting error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get notifications by type
 * @route GET /api/notifications/type/:type
 */
const getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const validTypes = ['achievement', 'goal_progress', 'social', 'recommendation', 'session'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const skip = (page - 1) * limit;
    const notifications = await Notification.find({
      user: userId,
      type
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      user: userId,
      type
    });

    res.json({
      notifications,
      pagination: {
        limit,
        page,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications by type error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCount,
  getPreferences,
  updatePreferences,
  updatePreferenceSetting,
  getNotificationsByType
};
