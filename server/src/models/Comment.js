const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  // Parent comment for replies
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  // Likes on comment
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'deleted', 'hidden'],
    default: 'active'
  },
  // Edit tracking
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ material: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

// Pre-save to update likes count
commentSchema.pre('save', function() {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
});

// Method to check if user has liked
commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(id => id.toString() === userId.toString());
};

module.exports = mongoose.model('Comment', commentSchema);
