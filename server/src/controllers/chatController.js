const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const socketService = require('../services/socketService');
const path = require('path');
const fs = require('fs');

// Message limit for unverified users
const UNVERIFIED_DAILY_LIMIT = 50;

// @desc    Send a message
// @route   POST /api/chat/send/:userId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { userId } = req.params; // Receiver ID
    const senderId = req.user._id;
    const { content } = req.body;

    // Must be admin-verified to send messages
    if (!req.user.profile?.idPhoto?.verified) {
      return res.status(403).json({
        success: false,
        message: 'Verify your account to send messages.',
        requiresVerification: true
      });
    }

    // Can't message yourself
    if (userId === senderId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a message to yourself'
      });
    }

    // Check if users are friends
    const areFriends = await Friendship.areFriends(senderId, userId);
    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: 'You can only message your friends'
      });
    }

    // Check if blocked
    const isBlocked = await Friendship.isBlocked(senderId, userId);
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot send message to this user'
      });
    }

    // Validate content
    if (!content && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Message content or attachment is required'
      });
    }

    if (content && content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters'
      });
    }

    // Generate conversation ID
    const conversationId = Message.generateConversationId(senderId, userId);

    // Create message object
    const messageData = {
      conversationId,
      sender: senderId,
      receiver: userId,
      content: content || ''
    };

    // Handle reply-to reference
    if (req.body.replyTo) {
      messageData.replyTo = req.body.replyTo;
    }

    // Handle file attachment
    if (req.file) {
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' 
        : req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document') ? 'document'
        : 'other';

      messageData.attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        type: fileType
      };
    }

    const message = await Message.create(messageData);
    await message.populate('sender', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto');
    await message.populate('receiver', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto');
    await message.populate('replyTo', 'content sender attachment deletedForEveryone');

    // Emit socket event for real-time delivery
    const sent = socketService.sendToUser(userId, 'new_message', message);
    console.log(`📤 Message sent to ${userId}: ${sent ? 'delivered' : 'user offline'}`);

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: message
    });
  } catch (error) {
    // Clean up uploaded file if message creation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// @desc    Get conversation with a user
// @route   GET /api/chat/conversation/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user._id;

    // Check if users are friends
    const areFriends = await Friendship.areFriends(currentUserId, userId);
    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: 'You can only view conversations with friends'
      });
    }

    const messages = await Message.getConversation(currentUserId, userId, parseInt(page), parseInt(limit));

    // Mark messages as read
    const conversationId = Message.generateConversationId(currentUserId, userId);
    await Message.markAsRead(conversationId, currentUserId);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
};

// @desc    Get all conversations (chat list)
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Message.getConversations(userId);

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

// @desc    Delete message for self
// @route   DELETE /api/chat/message/:messageId/self
// @access  Private
exports.deleteMessageForSelf = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is sender or receiver
    const isSender = message.sender.toString() === userId.toString();
    const isReceiver = message.receiver.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete this message'
      });
    }

    await message.deleteForSelf(userId);

    res.json({
      success: true,
      message: 'Message deleted for you'
    });
  } catch (error) {
    console.error('Delete message for self error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// @desc    Delete message for everyone
// @route   DELETE /api/chat/message/:messageId/everyone
// @access  Private
exports.deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.deleteForEveryone(userId);

    // Emit socket event for real-time deletion
    const receiverId = message.receiver.toString();
    socketService.sendToUser(receiverId, 'message_deleted', {
      messageId,
      conversationId: message.conversationId
    });

    res.json({
      success: true,
      message: 'Message deleted for everyone'
    });
  } catch (error) {
    console.error('Delete message for everyone error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete message'
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/read/:userId
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversationId = Message.generateConversationId(currentUserId, userId);
    await Message.markAsRead(conversationId, currentUserId);

    // Emit socket event for read receipts
    socketService.sendToUser(userId, 'messages_read', {
      conversationId,
      readBy: currentUserId
    });

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// @desc    Get attachment file
// @route   GET /api/chat/attachment/:filename
// @access  Private
exports.getAttachment = async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user._id;

    // Find message with this attachment
    const message = await Message.findOne({
      'attachment.filename': filename,
      $or: [{ sender: userId }, { receiver: userId }],
      deletedForEveryone: false,
      deletedFor: { $ne: userId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found or access denied'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/chat', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Get attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attachment',
      error: error.message
    });
  }
};

// @desc    Toggle emoji reaction on a DM message
// @route   POST /api/chat/message/:messageId/reaction
// @access  Private
exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check user is sender or receiver
    const isSender = message.sender.toString() === userId.toString();
    const isReceiver = message.receiver.toString() === userId.toString();
    if (!isSender && !isReceiver) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Find or create the reaction entry for this emoji
    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      message.reactions.push({ emoji, users: [userId] });
    } else {
      const idx = reaction.users.findIndex(u => u.toString() === userId.toString());
      if (idx === -1) {
        reaction.users.push(userId);
      } else {
        reaction.users.splice(idx, 1);
        // Remove empty reaction entry
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      }
    }

    await message.save();

    // Serialize reactions to plain objects so Socket.IO sends clean JSON
    const plainReactions = message.reactions.map(r => ({
      _id: r._id.toString(),
      emoji: r.emoji,
      users: r.users.map(u => u.toString())
    }));

    // Use room-based emit (each user joins a room named after their userId)
    const otherId = isSender ? message.receiver.toString() : message.sender.toString();
    const io = socketService.getIO();
    io.to(otherId).emit('message_reaction', { messageId, reactions: plainReactions });
    // Also update the reactor themselves via socket (consistent with API response)
    io.to(userId.toString()).emit('message_reaction', { messageId, reactions: plainReactions });

    res.json({ success: true, data: plainReactions });
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle reaction', error: error.message });
  }
};
