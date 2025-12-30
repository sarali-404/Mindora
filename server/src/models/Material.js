const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  materialType: {
    type: String,
    required: [true, 'Material type is required'],
    enum: ['PDF', 'Slides', 'Notes', 'Video', 'Image', 'Document', 'Other']
  },
  // File information
  file: {
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  },
  // Author information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Visibility settings
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Statistics
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  // Likes
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  // Saves/Bookmarks
  saves: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  savesCount: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
materialSchema.index({ title: 'text', description: 'text', tags: 'text', subject: 'text' });
materialSchema.index({ author: 1 });
materialSchema.index({ subject: 1 });
materialSchema.index({ materialType: 1 });
materialSchema.index({ visibility: 1 });
materialSchema.index({ createdAt: -1 });
materialSchema.index({ likesCount: -1 });
materialSchema.index({ views: -1 });

// Virtual for comments count (will be populated from Comment model)
materialSchema.virtual('commentsCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'material',
  count: true
});

// Method to check if user has liked
materialSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(id => id.toString() === userId.toString());
};

// Method to check if user has saved
materialSchema.methods.isSavedBy = function(userId) {
  return this.saves.some(id => id.toString() === userId.toString());
};

// Pre-save middleware to update counts
materialSchema.pre('save', function() {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  if (this.isModified('saves')) {
    this.savesCount = this.saves.length;
  }
});

// Ensure virtuals are included in JSON output
materialSchema.set('toJSON', { virtuals: true });
materialSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Material', materialSchema);
