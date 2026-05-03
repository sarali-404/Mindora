const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation identifier (sorted combination of 2 user IDs for fast querying)
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Message content
  content: {
    type: String,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    trim: true
  },
  // File attachment (optional)
  attachment: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    type: {
      type: String,
      enum: ['image', 'document', 'other']
    }
  },
  // Message status
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Reply-to reference
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  // Emoji reactions: [{ emoji: '👍', users: [userId, ...] }]
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],

  // Deletion tracking
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Compound index for efficient conversation queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });

// Static method to generate conversation ID from two user IDs
messageSchema.statics.generateConversationId = function(userId1, userId2) {
  // Sort IDs to ensure consistent conversation ID regardless of sender/receiver order
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Static method to get messages in a conversation with pagination
messageSchema.statics.getConversation = async function(userId1, userId2, page = 1, limit = 50) {
  const conversationId = this.generateConversationId(userId1, userId2);
  const skip = (page - 1) * limit;
  
  const messages = await this.find({
    conversationId,
    deletedForEveryone: false,
    deletedFor: { $ne: userId1 } // Don't show messages deleted by this user
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('sender', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto')
  .populate('receiver', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto')
  .populate('replyTo', 'content sender attachment deletedForEveryone');

  // Return in chronological order (oldest first)
  return messages.reverse();
};

// Static method to get all conversations for a user
messageSchema.statics.getConversations = async function(userId) {
  const userIdStr = userId.toString();
  
  // Aggregate to get latest message from each conversation
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
        deletedForEveryone: false,
        deletedFor: { $ne: userId }
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$receiver', userId] },
                { $eq: ['$read', false] }
              ]},
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { 'lastMessage.createdAt': -1 } }
  ]);

  // Populate user details
  const populatedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const lastMsg = conv.lastMessage;
      const otherUserId = lastMsg.sender.toString() === userIdStr 
        ? lastMsg.receiver 
        : lastMsg.sender;
      
      const otherUser = await mongoose.model('User').findById(otherUserId)
        .select('username profile.firstName profile.lastName profile.avatar profile.idPhoto isOnline lastSeen');
      
      return {
        conversationId: conv._id,
        otherUser,
        lastMessage: {
          content: lastMsg.deletedForEveryone ? 'This message was deleted' : lastMsg.content,
          attachment: lastMsg.attachment,
          createdAt: lastMsg.createdAt,
          sender: lastMsg.sender
        },
        unreadCount: conv.unreadCount
      };
    })
  );

  return populatedConversations;
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      receiver: userId,
      read: false
    },
    {
      $set: { read: true, readAt: new Date() }
    }
  );
};

// Static method to count messages sent by user today
messageSchema.statics.countTodayMessages = async function(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  return this.countDocuments({
    sender: userId,
    createdAt: { $gte: startOfDay }
  });
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    receiver: userId,
    read: false,
    deletedForEveryone: false,
    deletedFor: { $ne: userId }
  });
};

// Instance method to delete for self
messageSchema.methods.deleteForSelf = async function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
    await this.save();
  }
};

// Instance method to delete for everyone (only sender can do this within time limit)
messageSchema.methods.deleteForEveryone = async function(userId) {
  // Only sender can delete for everyone
  if (this.sender.toString() !== userId.toString()) {
    throw new Error('Only sender can delete message for everyone');
  }
  
  // Can only delete within 1 hour of sending
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (this.createdAt < oneHourAgo) {
    throw new Error('Cannot delete message after 1 hour');
  }
  
  this.deletedForEveryone = true;
  this.deletedAt = new Date();
  this.content = '';
  this.attachment = undefined;
  await this.save();
};

module.exports = mongoose.model('Message', messageSchema);
