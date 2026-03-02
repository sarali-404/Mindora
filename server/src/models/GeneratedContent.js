const mongoose = require('mongoose');

// Schema for quiz questions
const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  explanation: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, { _id: true });

// Schema for essay/long-form questions
const essayQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  sampleAnswer: String,
  keyPoints: [String],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, { _id: true });

// Schema for user's quiz attempts
const quizAttemptSchema = new mongoose.Schema({
  attemptedAt: {
    type: Date,
    default: Date.now
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOption: Number,
    isCorrect: Boolean,
    timeTaken: Number // seconds
  }],
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  timeTaken: Number // total seconds
}, { _id: true });

// Schema for user's essay answers
const essayAnswerSchema = new mongoose.Schema({
  answeredAt: {
    type: Date,
    default: Date.now
  },
  questionId: mongoose.Schema.Types.ObjectId,
  userAnswer: String,
  // AI feedback (if enabled)
  aiFeedback: {
    score: Number,
    feedback: String,
    strengths: [String],
    improvements: [String]
  }
}, { _id: true });

const generatedContentSchema = new mongoose.Schema({
  // Reference to the goal
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  
  // Reference to specific topic (optional - for topic-specific content)
  topic: {
    type: String,
    trim: true
  },
  
  // Content type
  contentType: {
    type: String,
    enum: ['notes', 'summary', 'quiz', 'essay', 'flashcard'],
    required: true
  },
  
  // For notes and summaries
  textContent: {
    title: String,
    content: String, // Markdown format
    keyPoints: [String],
    sections: [{
      heading: String,
      content: String
    }]
  },
  
  // For quizzes (MCQ)
  quizContent: {
    title: String,
    description: String,
    questions: [quizQuestionSchema],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive'],
      default: 'medium'
    },
    timeLimit: Number, // in minutes, optional
    passingScore: {
      type: Number,
      default: 70
    }
  },
  
  // User's quiz attempts
  quizAttempts: [quizAttemptSchema],
  
  // For essay questions
  essayContent: {
    title: String,
    description: String,
    questions: [essayQuestionSchema]
  },
  
  // User's essay answers
  essayAnswers: [essayAnswerSchema],
  
  // For flashcards
  flashcards: [{
    front: String,
    back: String,
    hint: String,
    mastered: {
      type: Boolean,
      default: false
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    lastReviewed: Date
  }],
  
  // Generation metadata
  generatedBy: {
    type: String,
    enum: ['groq', 'gemini', 'manual'],
    default: 'groq'
  },
  generationPrompt: String, // Store the prompt used (for debugging/improvement)
  
  // Difficulty tracking (for adaptive learning)
  currentDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  
  // User interaction stats
  stats: {
    views: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    totalAttempts: { type: Number, default: 0 },
    lastAccessedAt: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'regenerating'],
    default: 'active'
  },
  
  // Version tracking for regeneration
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    content: mongoose.Schema.Types.Mixed,
    createdAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
generatedContentSchema.index({ goal: 1, contentType: 1 });
generatedContentSchema.index({ goal: 1, topic: 1 });
generatedContentSchema.index({ goal: 1, status: 1 });

// Method to record a quiz attempt
generatedContentSchema.methods.recordQuizAttempt = async function(attemptData) {
  this.quizAttempts.push(attemptData);
  
  // Update stats
  this.stats.totalAttempts = this.quizAttempts.length;
  const totalScore = this.quizAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
  this.stats.averageScore = Math.round(totalScore / this.quizAttempts.length);
  this.stats.lastAccessedAt = new Date();
  
  return this.save();
};

// Method to record an essay answer
generatedContentSchema.methods.recordEssayAnswer = async function(answerData) {
  this.essayAnswers.push(answerData);
  this.stats.completions++;
  this.stats.lastAccessedAt = new Date();
  
  return this.save();
};

// Method to get recommended difficulty based on performance
generatedContentSchema.methods.getRecommendedDifficulty = function() {
  if (this.quizAttempts.length < 2) return this.currentDifficulty;
  
  // Get last 3 attempts
  const recentAttempts = this.quizAttempts.slice(-3);
  const avgScore = recentAttempts.reduce((sum, a) => sum + a.percentage, 0) / recentAttempts.length;
  
  if (avgScore >= 85 && this.currentDifficulty !== 'hard') {
    return this.currentDifficulty === 'easy' ? 'medium' : 'hard';
  } else if (avgScore < 50 && this.currentDifficulty !== 'easy') {
    return this.currentDifficulty === 'hard' ? 'medium' : 'easy';
  }
  
  return this.currentDifficulty;
};

// Static method to get all content for a goal
generatedContentSchema.statics.getGoalContent = async function(goalId) {
  return this.find({ goal: goalId, status: 'active' })
    .sort({ contentType: 1, topic: 1, createdAt: -1 });
};

// Static method to get content by type
generatedContentSchema.statics.getByType = async function(goalId, contentType) {
  return this.find({ goal: goalId, contentType, status: 'active' })
    .sort({ topic: 1, createdAt: -1 });
};

module.exports = mongoose.model('GeneratedContent', generatedContentSchema);
