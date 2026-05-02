const Notification = require('../models/Notification');
const UserPreferences = require('../models/UserPreferences');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Get transporter from environment (same as emailService)
const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  const cleanPass = pass ? pass.replace(/['"]/g, '').trim() : '';

  if (!user || !cleanPass) {
    console.error('❌ Email credentials missing! Check your .env file.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send email notification via Gmail (Nodemailer)
 * @param {string} userEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email body
 */
async function sendEmailNotification(userEmail, subject, htmlContent) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    const mailOptions = {
      from: {
        name: 'Mindora',
        address: process.env.EMAIL_USER
      },
      to: userEmail,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${userEmail}: ${subject}`);
    return result;
  } catch (error) {
    console.error('Email send error:', error.message);
    // Non-blocking - don't throw, just log
    return null;
  }
}

/**
 * Create and save a notification
 */
async function createNotification(userId, type, title, message, metadata = {}, relatedEntity = null) {
  try {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      relatedEntity,
      metadata,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await notification.save();
    console.log(`📢 Notification created: ${title}`);

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
}

/**
 * Create achievement notification with optional email
 */
async function notifyAchievementUnlocked(user, achievement, tier) {
  try {
    const tierInfo = tier === 'one-time' ? achievement.oneTimeTier : achievement.tiers[tier];
    const xpReward = tierInfo.xpReward;

    // Create in-app notification
    await createNotification(
      user._id,
      'achievement',
      `🎉 ${achievement.name} - ${tier.charAt(0).toUpperCase() + tier.slice(1)}${tier === 'one-time' ? '!' : ' Tier!'}`,
      `${tierInfo.description} - You earned ${xpReward} XP!`,
      {
        achievementKey: achievement.key,
        tier,
        xpReward
      },
      { entityType: 'achievement', entityId: achievement._id }
    );

    // Check user preferences for email notification
    const prefs = await getUserPreferences(user._id);
    const shouldEmailAchievements = prefs?.notifications?.email?.achievements !== false;

    if (shouldEmailAchievements && user.email) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Quicksand', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; color: white;">
                      <h2 style="margin: 0 0 10px 0; font-size: 28px;">🎉 Achievement Unlocked!</h2>
                      <p style="margin: 0; font-size: 14px; opacity: 0.9;">Great job! You earned a new achievement.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <h3 style="margin: 0 0 10px 0; color: #1F2937; font-size: 22px;">${achievement.name}</h3>
                      <p style="margin: 0 0 20px 0; color: #6B7280; font-size: 14px;">${tierInfo.description}</p>
                      <div style="background-color: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; text-align: left; margin: 20px 0;">
                        <p style="margin: 0; color: #667eea; font-weight: 600;">🏆 Tier: ${tier.toUpperCase()}</p>
                        <p style="margin: 5px 0 0 0; color: #667eea; font-weight: 600;">⭐ XP Reward: +${xpReward} XP</p>
                      </div>
                      <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 13px;">Keep up the excellent work on your learning journey!</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9CA3AF; font-size: 12px;">Mindora - Study Smarter, Not Harder</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      sendEmailNotification(user.email, `🎉 Achievement Unlocked: ${achievement.name}`, emailHtml).catch(e =>
        console.error('Achievement email error:', e.message)
      );
    }

    return true;
  } catch (error) {
    console.error('Notify achievement unlocked error:', error);
    throw error;
  }
}

/**
 * Notify weak areas recommendation
 */
async function notifyWeakAreasRecommendation(user, weakAreas) {
  try {
    const weakAreasList = weakAreas.slice(0, 3).join(', ');

    // Create in-app notification
    await createNotification(
      user._id,
      'recommendation',
      '💡 Study Recommendation',
      `Focus on these weak areas: ${weakAreasList}`,
      { weakAreas },
      null
    );

    // Check email preference
    const prefs = await getUserPreferences(user._id);
    const shouldEmailRecommendations = prefs?.notifications?.email?.recommendations !== false;

    if (shouldEmailRecommendations && user.email) {
      const areasHtml = weakAreas.slice(0, 3).map(area => `<li style="margin: 8px 0; color: #4B5563;">${area}</li>`).join('');
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Quicksand', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 16px 16px 0 0; color: white;">
                      <h2 style="margin: 0 0 10px 0; font-size: 28px;">📊 Study Recommendation</h2>
                      <p style="margin: 0; font-size: 14px; opacity: 0.9;">We analyzed your progress and found areas to improve.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h3 style="margin: 0 0 20px 0; color: #1F2937; font-size: 18px;">Areas to Focus On:</h3>
                      <ul style="margin: 0; padding-left: 20px;">
                        ${areasHtml}
                      </ul>
                      <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 14px;">Start a quiz or review session on these topics to strengthen your knowledge!</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9CA3AF; font-size: 12px;">Mindora - Study Smarter, Not Harder</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      sendEmailNotification(user.email, '📊 Your Personalized Study Recommendation', emailHtml).catch(e =>
        console.error('Recommendation email error:', e.message)
      );
    }

    return true;
  } catch (error) {
    console.error('Notify weak areas error:', error);
    throw error;
  }
}

/**
 * Get user notifications (paginated)
 */
async function getUserNotifications(userId, limit = 20, page = 1) {
  try {
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ user: userId });
    const unread = await Notification.countDocuments({ user: userId, isRead: false });

    return {
      notifications,
      total,
      unread,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Get user notifications error:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: Date.now() },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Mark notification as read error:', error);
    throw error;
  }
}

/**
 * Delete notification
 */
async function deleteNotification(notificationId, userId) {
  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      user: userId
    });

    return result.deletedCount > 0;
  } catch (error) {
    console.error('Delete notification error:', error);
    throw error;
  }
}

/**
 * Save user notification preferences
 */
async function saveUserPreferences(userId, preferences) {
  try {
    let userPrefs = await UserPreferences.findOne({ user: userId });

    if (!userPrefs) {
      userPrefs = new UserPreferences({ user: userId });
    }

    // Update preferences — deep merge each sub-object instead of replacing
    if (preferences.notifications) {
      userPrefs.notifications = {
        ...(userPrefs.notifications?.toObject ? userPrefs.notifications.toObject() : userPrefs.notifications || {}),
        ...preferences.notifications,
        // Merge nested inApp and email objects instead of replacing
        inApp: {
          ...(userPrefs.notifications?.inApp?.toObject ? userPrefs.notifications.inApp.toObject() : userPrefs.notifications?.inApp || {}),
          ...(preferences.notifications.inApp || {})
        },
        email: {
          ...(userPrefs.notifications?.email?.toObject ? userPrefs.notifications.email.toObject() : userPrefs.notifications?.email || {}),
          ...(preferences.notifications.email || {})
        }
      };
    }
    if (preferences.display) {
      userPrefs.display = preferences.display;
    }
    if (preferences.timezone) {
      userPrefs.timezone = preferences.timezone;
    }
    if (preferences.privacy) {
      userPrefs.privacy = {
        ...(userPrefs.privacy?.toObject ? userPrefs.privacy.toObject() : userPrefs.privacy || {}),
        ...preferences.privacy
      };
    }

    userPrefs.updatedAt = Date.now();
    await userPrefs.save();

    return userPrefs;
  } catch (error) {
    console.error('Save user preferences error:', error);
    throw error;
  }
}

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId) {
  try {
    let prefs = await UserPreferences.findOne({ user: userId });

    if (!prefs) {
      prefs = new UserPreferences({ user: userId });
      await prefs.save();
    }

    return prefs;
  } catch (error) {
    console.error('Get user preferences error:', error);
    throw error;
  }
}

/**
 * Notify a user only if their preferences allow it.
 * prefPath: dot-notated path inside notifications prefs, e.g. 'inApp.goalProgress'
 */
async function notifyIfPreferred(userId, type, prefPath, title, message, metadata = {}, relatedEntity = null) {
  try {
    const prefs = await getUserPreferences(userId);
    const keys = prefPath.split('.');
    let val = prefs?.notifications;
    for (const k of keys) val = val?.[k];
    if (val === false) return null; // Preference disabled
    return await createNotification(userId, type, title, message, metadata, relatedEntity);
  } catch (error) {
    console.error('notifyIfPreferred error:', error.message);
    return null;
  }
}

/**
 * Send a friend request email notification
 */
async function notifyFriendRequest(recipient, requesterName) {
  try {
    await notifyIfPreferred(
      recipient._id,
      'social',
      'inApp.social',
      'New Friend Request',
      `${requesterName} sent you a friend request`,
      { requesterName }
    );

    const prefs = await getUserPreferences(recipient._id);
    if (prefs?.notifications?.email?.social !== false && recipient.email) {
      const emailHtml = `
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;font-family:'Quicksand',Arial,sans-serif;background:#f5f5f5;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr><td align="center" style="padding:40px 0;">
            <table role="presentation" style="width:100%;max-width:500px;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
              <tr><td style="padding:40px;text-align:center;background:linear-gradient(135deg,#0073a0,#38bdf8);border-radius:16px 16px 0 0;color:white;">
                <h2 style="margin:0 0 10px 0;font-size:26px;">👋 New Friend Request</h2>
                <p style="margin:0;font-size:14px;opacity:0.9;">Someone wants to connect with you on Mindora</p>
              </td></tr>
              <tr><td style="padding:40px;text-align:center;">
                <p style="color:#1F2937;font-size:18px;font-weight:600;margin:0 0 16px;">${requesterName}</p>
                <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">sent you a friend request. Log in to accept or decline.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/app/community" style="display:inline-block;padding:12px 28px;background:#0073a0;color:#fff;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">View Request</a>
              </td></tr>
              <tr><td style="padding:20px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #e5e7eb;">
                <p style="margin:0;color:#9CA3AF;font-size:12px;">Mindora - Study Smarter, Not Harder</p>
              </td></tr>
            </table>
          </td></tr>
        </table></body></html>`;
      sendEmailNotification(recipient.email, `👋 ${requesterName} sent you a friend request`, emailHtml)
        .catch(e => console.error('Friend request email error:', e.message));
    }
  } catch (error) {
    console.error('notifyFriendRequest error:', error.message);
  }
}

/**
 * Send streak reminder email to a user whose streak is at risk today
 */
async function sendStreakReminderEmail(user, streakCount) {
  try {
    const prefs = await getUserPreferences(user._id);
    if (prefs?.notifications?.email?.recommendations === false) return;

    const firstName = user.profile?.firstName || user.username || 'there';
    const subject = `🔥 ${firstName}, don't lose your ${streakCount}-day streak today!`;
    const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/app/dashboard`;

    const emailHtml = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0;padding:0;font-family:'Quicksand',Arial,sans-serif;background:#f5f5f5;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr><td align="center" style="padding:40px 0;">
          <table role="presentation" style="width:100%;max-width:520px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
            <!-- Header -->
            <tr><td style="padding:36px 40px 28px;text-align:center;background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);border-radius:16px 16px 0 0;color:#fff;">
              <div style="font-size:52px;line-height:1;margin-bottom:12px;">🔥</div>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;">Your streak is at risk!</h1>
              <p style="margin:0;font-size:14px;opacity:0.9;">Log in before midnight to keep it alive</p>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:36px 40px;text-align:center;">
              <p style="color:#374151;font-size:16px;margin:0 0 24px;">Hey <strong>${firstName}</strong> 👋</p>
              <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 28px;">
                You've built an impressive <strong style="color:#f59e0b;">${streakCount}-day study streak</strong>
                on Mindora — don't let it slip away! You haven't studied today yet, and your streak
                resets at midnight. Just open the app to keep it going.
              </p>
              <!-- Streak badge -->
              <div style="display:inline-block;background:#fff7ed;border:2px solid #f59e0b;border-radius:12px;padding:16px 32px;margin-bottom:28px;">
                <div style="font-size:40px;line-height:1;">🔥 ${streakCount}</div>
                <div style="color:#92400e;font-weight:700;font-size:13px;margin-top:4px;">Day Streak</div>
              </div>
              <br>
              <a href="${dashboardUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                Study Now — Keep My Streak 🔥
              </a>
            </td></tr>
            <!-- Footer -->
            <tr><td style="padding:20px 40px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                Mindora · Study Smarter, Not Harder<br>
                <span style="font-size:11px;">You're receiving this because you have an active study streak.</span>
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table></body></html>`;

    await sendEmailNotification(user.email, subject, emailHtml);
  } catch (error) {
    console.error('Streak reminder email error:', error.message);
  }
}

module.exports = {
  createNotification,
  notifyIfPreferred,
  sendEmailNotification,
  notifyAchievementUnlocked,
  notifyWeakAreasRecommendation,
  notifyFriendRequest,
  sendStreakReminderEmail,
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  saveUserPreferences,
  getUserPreferences
};
