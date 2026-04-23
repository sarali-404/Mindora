const mongoose = require('mongoose');

const groupConversationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Cached last message info for conversation list preview
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  lastMessagePreview: {
    type: String,
    maxlength: 100,
    default: ''
  }
}, {
  timestamps: true
});

// Efficient lookup: "all groups I'm in"
groupConversationSchema.index({ members: 1, lastMessageAt: -1 });
groupConversationSchema.index({ creator: 1 });

module.exports = mongoose.model('GroupConversation', groupConversationSchema);
