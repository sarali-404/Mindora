const Session = require('../models/Session');
const discordService = require('./discordService');

class SessionScheduler {
  constructor() {
    this.checkInterval = null;
  }

  // Start the scheduler - runs every minute
  start() {
    console.log('📅 Session scheduler started');
    
    this.checkInterval = setInterval(() => {
      this.checkExpiredSessions();
    }, 60000); // Check every 60 seconds
  }

  // Stop the scheduler
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('📅 Session scheduler stopped');
    }
  }

  // Check for sessions that should have ended
  async checkExpiredSessions() {
    try {
      const now = new Date();
      
      // Find all live sessions where endTime has passed
      // endTime = scheduledAt (which is set to actual start time) + duration in minutes
      const expiredSessions = await Session.find({
        status: 'live',
        $expr: {
          $lte: [
            { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] }, // scheduledAt + duration in ms
            now
          ]
        }
      });

      if (expiredSessions.length === 0) return;

      console.log(`⏰ Found ${expiredSessions.length} expired session(s)`);

      // End each expired session
      for (const session of expiredSessions) {
        await this.endSession(session);
      }
    } catch (error) {
      console.error('Session scheduler error:', error);
    }
  }

  // End a session and clean up Discord channel
  async endSession(session) {
    try {
      console.log(`🔚 Auto-ending session: ${session.title}`);

      // Delete Discord channel
      if (session.discord?.channelId) {
        try {
          await discordService.deleteSessionChannel(session.discord.channelId);
          console.log(`✅ Discord channel deleted: ${session.discord.channelName}`);
        } catch (error) {
          console.error(`❌ Failed to delete Discord channel: ${error.message}`);
        }
      }

      // Update announcement message
      if (session.discord?.messageId) {
        try {
          await discordService.updateAnnouncementMessage(session.discord.messageId, session, 'ended');
        } catch (error) {
          console.error(`❌ Failed to update announcement: ${error.message}`);
        }
      }

      // Update session status
      session.status = 'ended';
      session.endedAt = new Date();
      await session.save();

      console.log(`✅ Session auto-ended: ${session.title}`);
    } catch (error) {
      console.error(`Error auto-ending session ${session._id}:`, error);
    }
  }
}

// Export singleton
const scheduler = new SessionScheduler();
module.exports = scheduler;
