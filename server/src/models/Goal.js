const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  subTopics: [{
    name: String,
    description: String
  }],
  order: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Quiz stats for this topic
  quizAttempts: {
    type: Number,
    default: 0
  },
  lastQuizScore: Number,
  averageScore: Number,
  // Difficulty level (adjusted by AI based on performance)
  difficultyLevel: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, { _id: true });

const materialFileSchema = new mongoose.Schema({
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
  },
  // Extracted text content from the file
  extractedText: {
    type: String,
    default: ''
  },
  extractionStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  extractionError: String,
  pageCount: Number
}, { _id: true });

const goalSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Goal details
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  // AI-refined version of the title (SMART goal)
  refinedTitle: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  targetMarks: {
    type: String,
    trim: true
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  
  // Study materials uploaded by user
  materials: [materialFileSchema],
  
  // AI-extracted topics from materials
  topics: [topicSchema],
  
  // Overall progress
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Gamification
  xpEarned: {
    type: Number,
    default: 0
  },
  streakDays: {
    type: Number,
    default: 0
  },
  lastStudyDate: Date,
  
  // AI processing status
  aiProcessingStatus: {
    type: String,
    enum: ['pending', 'extracting', 'analyzing', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  aiProcessingError: String,
  
  // Content generation flags
  contentGeneration: {
    notesGenerated: { type: Boolean, default: false },
    summariesGenerated: { type: Boolean, default: false },
    quizzesGenerated: { type: Boolean, default: false },
    essaysGenerated: { type: Boolean, default: false }
  },
  
  // Adaptive learning data
  learningProfile: {
    // Tracks performance patterns
    averageQuizScore: { type: Number, default: 0 },
    totalQuizAttempts: { type: Number, default: 0 },
    strongTopics: [String],
    weakTopics: [String],
    // AI-recommended next actions
    recommendedFocus: String,
    lastAnalyzedAt: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  completedAt: Date
}, {
  timestamps: true
});

// Index for efficient querying
goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, createdAt: -1 });

// Virtual for days until deadline
goalSchema.virtual('daysRemaining').get(function() {
  if (!this.deadline) return null;
  const today = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for study sessions count (can be populated from sessions)
goalSchema.virtual('studySessionsCount', {
  ref: 'Session',
  localField: '_id',
  foreignField: 'goalId',
  count: true
});

// Method to calculate overall progress from topics
goalSchema.methods.calculateProgress = function() {
  if (!this.topics || this.topics.length === 0) return 0;
  
  const totalProgress = this.topics.reduce((sum, topic) => sum + (topic.progress || 0), 0);
  return Math.round(totalProgress / this.topics.length);
};

// Method to update progress and check completion
goalSchema.methods.updateProgress = async function() {
  this.progress = this.calculateProgress();
  
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Pre-save hook to ensure consistency
goalSchema.pre('save', function() {
  // Recalculate progress before saving
  if (this.isModified('topics')) {
    this.progress = this.calculateProgress();
  }
});

module.exports = mongoose.model('Goal', goalSchema);
