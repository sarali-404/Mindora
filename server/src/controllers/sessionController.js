const Session = require('../models/Session');
const User = require('../models/User');
const discordService = require('../services/discordService');

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (verified users only)
exports.createSession = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      tags,
      scheduledAt,
      duration,
      maxParticipants,
      isImmediate
    } = req.body;

    // Check if user is verified
    if (req.user.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'You must be verified to create sessions. Please complete ID verification.'
      });
    }

    // Validate scheduled time (must be in the future unless immediate)
    const scheduledTime = isImmediate ? new Date() : new Date(scheduledAt);
    if (!isImmediate && scheduledTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    // Create session
    const session = new Session({
      title,
      description,
      host: req.user._id,
      subject,
      tags: tags || [],
      scheduledAt: scheduledTime,
      duration: duration || 60,
      maxParticipants: maxParticipants || 10,
      isImmediate: isImmediate || false,
      participants: [{ user: req.user._id, status: isImmediate ? 'joined' : 'registered' }]
    });

    // If immediate or starting soon, create Discord channel
    const shouldCreateChannel = isImmediate || 
      (scheduledTime - new Date() <= 15 * 60 * 1000); // Within 15 minutes

    if (shouldCreateChannel && discordService.isConfigured()) {
      try {
        // Temporarily populate host for Discord embed (will re-populate after save)
        const hostUser = await User.findById(req.user._id).select('username profile.firstName profile.lastName');
        session.host = hostUser;
        
        const discordData = await discordService.createSessionChannel(session);
        session.discord = discordData;
        
        // Reset host to ObjectId for saving
        session.host = req.user._id;
        
        if (isImmediate) {
          session.status = 'live';
        }
      } catch (discordError) {
        console.error('Discord channel creation failed:', discordError);
        // Continue without Discord - session can still be created
      }
    }

    await session.save();

    // Fetch the saved session with full population
    const savedSession = await Session.findById(session._id)
      .populate('host', 'username profile.firstName profile.lastName profile.avatar')
      .populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: savedSession
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
};

// @desc    Get all sessions with filters
// @route   GET /api/sessions
// @access  Private (verified users only)
exports.getSessions = async (req, res) => {
  try {
    const {
      status,
      subject,
      host,
      upcoming,
      live,
      page = 1,
      limit = 10,
      search
    } = req.query;

    // Build query
    const query = { status: { $ne: 'cancelled' } };

    if (status) {
      query.status = status;
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (host) {
      query.host = host;
    }

    if (upcoming === 'true') {
      query.status = 'scheduled';
      query.scheduledAt = { $gte: new Date() };
    }

    if (live === 'true') {
      query.status = 'live';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Session.countDocuments(query);

    const sessions = await Session.find(query)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('host', 'username profile.firstName profile.lastName profile.avatar')
      .populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    res.json({
      success: true,
      data: sessions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message
    });
  }
};

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Private
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('host', 'username profile.firstName profile.lastName profile.avatar')
      .populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session',
      error: error.message
    });
  }
};

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private (host only)
exports.updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is the host
    if (!session.isHost(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can update this session'
      });
    }

    // Cannot update ended or cancelled sessions
    if (['ended', 'cancelled'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update an ended or cancelled session'
      });
    }

    const allowedUpdates = ['title', 'description', 'subject', 'tags', 'scheduledAt', 'duration', 'maxParticipants'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    await session.save();
    await session.populate('host', 'username profile.firstName profile.lastName profile.avatar');
    await session.populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error.message
    });
  }
};

// @desc    Cancel session
// @route   DELETE /api/sessions/:id
// @access  Private (host only)
exports.cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.isHost(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can cancel this session'
      });
    }

    if (session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Session is already cancelled'
      });
    }

    // Delete Discord channel if exists
    if (session.discord?.channelId) {
      await discordService.deleteSessionChannel(session.discord.channelId);
    }

    session.status = 'cancelled';
    await session.save();

    res.json({
      success: true,
      message: 'Session cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel session',
      error: error.message
    });
  }
};

// @desc    Join a session
// @route   POST /api/sessions/:id/join
// @access  Private (verified users only)
exports.joinSession = async (req, res) => {
  try {
    // Check if user is verified
    if (req.user.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'You must be verified to join sessions. Please complete ID verification.'
      });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This session has been cancelled'
      });
    }

    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'This session has ended'
      });
    }

    if (session.isParticipant(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this session'
      });
    }

    if (session.participants.length >= session.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'This session is full'
      });
    }

    // Add participant
    session.participants.push({
      user: req.user._id,
      status: session.status === 'live' ? 'registered' : 'registered'
    });

    await session.save();
    await session.populate('host', 'username profile.firstName profile.lastName profile.avatar');
    await session.populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    res.json({
      success: true,
      message: 'Successfully joined session',
      data: session
    });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join session',
      error: error.message
    });
  }
};

// @desc    Leave a session
// @route   POST /api/sessions/:id/leave
// @access  Private
exports.leaveSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Host cannot leave their own session
    if (session.isHost(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Host cannot leave the session. Cancel it instead.'
      });
    }

    if (!session.isParticipant(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a participant of this session'
      });
    }

    // Remove participant
    session.participants = session.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );

    await session.save();

    res.json({
      success: true,
      message: 'Successfully left session'
    });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave session',
      error: error.message
    });
  }
};

// @desc    Get user's sessions (hosted and joined)
// @route   GET /api/sessions/my-sessions
// @access  Private
exports.getMySessions = async (req, res) => {
  try {
    const { type = 'all' } = req.query;

    let query = {};

    if (type === 'hosted') {
      query = { host: req.user._id };
    } else if (type === 'joined') {
      query = { 'participants.user': req.user._id, host: { $ne: req.user._id } };
    } else {
      query = {
        $or: [
          { host: req.user._id },
          { 'participants.user': req.user._id }
        ]
      };
    }

    query.status = { $ne: 'cancelled' };

    const sessions = await Session.find(query)
      .sort({ scheduledAt: -1 })
      .populate('host', 'username profile.firstName profile.lastName profile.avatar')
      .populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your sessions',
      error: error.message
    });
  }
};

// @desc    Start a scheduled session (go live)
// @route   POST /api/sessions/:id/start
// @access  Private (host only)
exports.startSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('host', 'username profile.firstName profile.lastName');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.isHost(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can start this session'
      });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot start a session that is ${session.status}`
      });
    }

    // Create Discord channel if not exists
    if (!session.discord?.channelId && discordService.isConfigured()) {
      try {
        const discordData = await discordService.createSessionChannel(session);
        session.discord = discordData;
      } catch (discordError) {
        console.error('Discord channel creation failed:', discordError);
      }
    }

    session.status = 'live';
    session.scheduledAt = new Date(); // Update to actual start time
    await session.save();

    // Update announcement if exists
    if (session.discord?.messageId) {
      await discordService.updateAnnouncementMessage(session.discord.messageId, session, 'live');
    }

    await session.populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');

    res.json({
      success: true,
      message: 'Session started',
      data: session
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message
    });
  }
};

// @desc    End a session
// @route   POST /api/sessions/:id/end
// @access  Private (host only)
exports.endSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.isHost(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can end this session'
      });
    }

    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Session has already ended'
      });
    }

    // Delete Discord channel
    if (session.discord?.channelId) {
      await discordService.deleteSessionChannel(session.discord.channelId);
    }

    // Update announcement
    if (session.discord?.messageId) {
      await discordService.updateAnnouncementMessage(session.discord.messageId, session, 'ended');
    }

    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session',
      error: error.message
    });
  }
};

// @desc    Get Discord server invite link
// @route   GET /api/sessions/discord-invite
// @access  Private
exports.getDiscordInvite = async (req, res) => {
  try {
    const serverInvite = discordService.getServerInvite();
    const isConfigured = discordService.isConfigured();

    res.json({
      success: true,
      data: {
        serverInvite,
        isConfigured
      }
    });
  } catch (error) {
    console.error('Get Discord invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Discord invite',
      error: error.message
    });
  }
};
