const mongoose = require('mongoose');

// Per-question result for quiz attempts
const questionResultSchema = new mongoose.Schema({
    questionId: mongoose.Schema.Types.ObjectId,
    isCorrect: Boolean,
    timeTaken: Number,       // seconds per question
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    }
}, { _id: false });

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    goal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal',
        required: true
    },
    topicName: {
        type: String,
        required: true,
        trim: true
    },
    activityType: {
        type: String,
        enum: [
            'quiz_attempt',
            'essay_submission',
            'note_view',
            'summary_view',
            'flashcard_review',
            'note_time_spent',
            'summary_time_spent',
            'note_completed',
            'summary_completed'
        ],
        required: true
    },

    // Activity-specific data
    data: {
        // Quiz / Essay scores
        score: Number,              // percentage (0-100) 
        totalQuestions: Number,
        correctCount: Number,
        timeTaken: Number,          // total seconds
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard']
        },
        // Per-question breakdown (quiz only)
        questionResults: [questionResultSchema],

        // Note/Summary time tracking
        duration: Number,           // seconds spent reading

        // Scroll tracking
        scrollPercent: Number,

        // Flashcard review
        cardsReviewed: Number,
        cardsMastered: Number
    }
}, {
    timestamps: true   // createdAt = when the activity happened
});

// Indexes for efficient querying
activityLogSchema.index({ user: 1, goal: 1, topicName: 1 });
activityLogSchema.index({ user: 1, goal: 1, activityType: 1 });
activityLogSchema.index({ user: 1, goal: 1, createdAt: -1 });
activityLogSchema.index({ goal: 1, topicName: 1, createdAt: -1 });

// Static: get all activities for a goal's topic
activityLogSchema.statics.getTopicActivities = function (goalId, topicName) {
    return this.find({ goal: goalId, topicName })
        .sort({ createdAt: -1 });
};

// Static: get all activities for a goal
activityLogSchema.statics.getGoalActivities = function (goalId) {
    return this.find({ goal: goalId })
        .sort({ createdAt: -1 });
};

// Static: get recent activities for a user across a goal
activityLogSchema.statics.getRecentActivities = function (userId, goalId, limit = 50) {
    return this.find({ user: userId, goal: goalId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
