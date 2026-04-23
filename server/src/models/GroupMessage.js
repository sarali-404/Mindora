const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupConversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    trim: true
  },
  // Optional file attachment (same structure as DM Message)
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
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Efficient paginated fetch of messages in a group
groupMessageSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
