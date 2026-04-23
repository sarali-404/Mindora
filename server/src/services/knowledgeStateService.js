const ActivityLog = require('../models/ActivityLog');
const Goal = require('../models/Goal');
const GeneratedContent = require('../models/GeneratedContent');

// ============================================================
// Knowledge State Service
// Inspired by Bayesian Knowledge Tracing (BKT) & Elo Rating
// ============================================================

// --- Configuration ---

// Exponential decay factor for recency weighting
// Higher λ = faster decay (recent activities matter much more)
const RECENCY_DECAY_LAMBDA = 0.05; // ~50% weight at 14 days old

// Activity type base weights (how much each activity influences knowledge)
const ACTIVITY_WEIGHTS = {
    quiz_attempt: {
        correct: 3.0,    // Strong evidence of knowledge
        incorrect: -2.0  // Evidence of gap
    },
    essay_submission: {
        perPoint: 0.08   // score * perPoint (e.g., 80% → +6.4)
    },
    note_view: {
        base: 0.3        // Minimal — just opening isn't learning
    },
    summary_view: {
        base: 0.2
    },
    summary_time_spent: {
        perMinute: 0.45,  // 0.45 points per minute of summary reading
        maxMinutes: 20    // Cap at 20 min per session
    },
    note_time_spent: {
        perMinute: 0.5,  // 0.5 points per minute of reading
        maxMinutes: 30   // Cap at 30 min per session
    },
    flashcard_review: {
        perCard: 0.2,
        masteredBonus: 0.5
    },
    note_completed: {
        base: 1.5  // Strong signal: user read the full note (time + scroll)
    },
    summary_completed: {
        base: 1.0  // Strong signal: user read the full summary (time + scroll)
    }
};

// Difficulty multipliers — correct answers on hard questions are worth more
const DIFFICULTY_MULTIPLIERS = {
    correct: { easy: 0.5, medium: 1.0, hard: 1.5 },
    incorrect: { easy: 1.5, medium: 1.0, hard: 0.5 }
};

// Knowledge level thresholds
const THRESHOLDS = {
    STRONG: 75,   // Topic is "strong" if score >= 75
    WEAK: 40,     // Topic is "weak" if score <= 40
    MASTERED: 90  // Topic is practically mastered
};

// Consistency bonus parameters
const STREAK_BONUS_PER = 0.5;   // Bonus per consecutive correct quiz
const MAX_STREAK_BONUS = 5.0;
const IMPROVEMENT_BONUS = 2.0;  // Bonus if trend is improving

// --- Core Functions ---

/**
 * Sigmoid function: maps any value to 0-1 range
 * Used to normalize the raw weighted sum into a 0-100 score
 */
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate recency weight using exponential decay
 * More recent activities get higher weight
 * @param {Date} activityDate
 * @returns {number} weight between 0 and 1
 */
function recencyWeight(activityDate) {
    const daysSince = (Date.now() - new Date(activityDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-RECENCY_DECAY_LAMBDA * daysSince);
}

/**
 * Process a single activity log into a weighted score contribution
 * @param {Object} log - ActivityLog document
 * @returns {number} score contribution (can be negative)
 */
function processActivity(log) {
    const weight = recencyWeight(log.createdAt);
    let rawScore = 0;

    switch (log.activityType) {
        case 'quiz_attempt': {
            const { score, totalQuestions, correctCount, difficulty, questionResults } = log.data || {};

            if (questionResults && questionResults.length > 0) {
                // Per-question scoring (more granular)
                for (const qr of questionResults) {
                    const diff = qr.difficulty || difficulty || 'medium';
                    if (qr.isCorrect) {
                        rawScore += ACTIVITY_WEIGHTS.quiz_attempt.correct * (DIFFICULTY_MULTIPLIERS.correct[diff] || 1.0);
                    } else {
                        rawScore += ACTIVITY_WEIGHTS.quiz_attempt.incorrect * (DIFFICULTY_MULTIPLIERS.incorrect[diff] || 1.0);
                    }
                }
            } else if (totalQuestions && correctCount !== undefined) {
                // Fallback: aggregate scoring
                const diff = difficulty || 'medium';
                const incorrect = totalQuestions - correctCount;
                rawScore += correctCount * ACTIVITY_WEIGHTS.quiz_attempt.correct * (DIFFICULTY_MULTIPLIERS.correct[diff] || 1.0);
                rawScore += incorrect * ACTIVITY_WEIGHTS.quiz_attempt.incorrect * (DIFFICULTY_MULTIPLIERS.incorrect[diff] || 1.0);
            }
            break;
        }

        case 'essay_submission': {
            const essayScore = log.data?.score || 0;
            rawScore = essayScore * ACTIVITY_WEIGHTS.essay_submission.perPoint;
            break;
        }

        case 'note_view': {
            rawScore = ACTIVITY_WEIGHTS.note_view.base;
            break;
        }

        case 'summary_view': {
            rawScore = ACTIVITY_WEIGHTS.summary_view.base;
            break;
        }

        case 'summary_time_spent': {
            const minutes = Math.min(
                (log.data?.duration || 0) / 60,
                ACTIVITY_WEIGHTS.summary_time_spent.maxMinutes
            );
            rawScore = minutes * ACTIVITY_WEIGHTS.summary_time_spent.perMinute;
            break;
        }

        case 'note_time_spent': {
            const minutes = Math.min(
                (log.data?.duration || 0) / 60,
                ACTIVITY_WEIGHTS.note_time_spent.maxMinutes
            );
            rawScore = minutes * ACTIVITY_WEIGHTS.note_time_spent.perMinute;
            break;
        }

        case 'flashcard_review': {
            const reviewed = log.data?.cardsReviewed || 0;
            const mastered = log.data?.cardsMastered || 0;
            rawScore = reviewed * ACTIVITY_WEIGHTS.flashcard_review.perCard
                + mastered * ACTIVITY_WEIGHTS.flashcard_review.masteredBonus;
            break;
        }

        case 'note_completed': {
            rawScore = ACTIVITY_WEIGHTS.note_completed.base;
            break;
        }

        case 'summary_completed': {
            rawScore = ACTIVITY_WEIGHTS.summary_completed.base;
            break;
        }
    }

    return rawScore * weight;
}

/**
 * Calculate consistency bonus from quiz streak and improvement trend
 * @param {Array} quizLogs - Quiz activity logs sorted by date (oldest first)
 * @returns {number} bonus score
 */
function calculateConsistencyBonus(quizLogs) {
    if (quizLogs.length < 2) return 0;

    let bonus = 0;

    // 1. Streak bonus: consecutive passes (score >= 70%)
    let streak = 0;
    for (let i = quizLogs.length - 1; i >= 0; i--) {
        if ((quizLogs[i].data?.score || 0) >= 70) {
            streak++;
        } else {
            break;
        }
    }
    bonus += Math.min(streak * STREAK_BONUS_PER, MAX_STREAK_BONUS);

    // 2. Improvement trend: compare first half avg to second half avg
    const mid = Math.floor(quizLogs.length / 2);
    const firstHalf = quizLogs.slice(0, mid);
    const secondHalf = quizLogs.slice(mid);

    const firstAvg = firstHalf.reduce((s, l) => s + (l.data?.score || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, l) => s + (l.data?.score || 0), 0) / secondHalf.length;

    if (secondAvg > firstAvg + 5) {
        bonus += IMPROVEMENT_BONUS; // Improving trend
    }

    return bonus;
}

/**
 * CORE: Calculate knowledge score for a specific topic
 * 
 * Algorithm:
 *  1. Fetch all activity logs for this goal+topic
 *  2. Process each activity with recency weighting
 *  3. Sum weighted scores
 *  4. Add consistency bonus
 *  5. Apply sigmoid normalization → 0-100 scale
 * 
 * @param {string} goalId
 * @param {string} topicName
 * @returns {Promise<{score: number, details: Object}>}
 */
async function calculateTopicKnowledge(goalId, topicName) {
    const logs = await ActivityLog.find({ goal: goalId, topicName })
        .sort({ createdAt: 1 }); // oldest first

    if (logs.length === 0) {
        return {
            score: 0,
            level: 'untouched',
            details: {
                totalActivities: 0,
                quizAttempts: 0,
                avgQuizScore: 0,
                lastActivity: null,
                trend: 'none',
                rawScore: 0
            }
        };
    }

    // 1. Process all activities
    let weightedSum = 0;
    for (const log of logs) {
        weightedSum += processActivity(log);
    }

    // 2. Consistency bonus (quiz-specific)
    const quizLogs = logs.filter(l => l.activityType === 'quiz_attempt');
    weightedSum += calculateConsistencyBonus(quizLogs);

    // 3. Sigmoid normalization
    // Center around 0 (no activities → 50 after sigmoid, but we handle empty above)
    // Scale factor: dividing by expected range to keep sigmoid in useful zone
    const scaleFactor = Math.max(logs.length * 0.5, 1); // Prevent division issues
    const normalized = sigmoid(weightedSum / scaleFactor);
    let score = Math.round(normalized * 100);

    // 4. Compute details
    const quizScores = quizLogs.map(l => l.data?.score || 0);
    const avgQuizScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;

    // Count wrong answers across all quiz attempts
    let wrongAnswerCount = 0;
    let totalAnswerCount = 0;
    for (const qlog of quizLogs) {
        const results = qlog.data?.questionResults || [];
        if (results.length > 0) {
            wrongAnswerCount += results.filter(r => !r.isCorrect).length;
            totalAnswerCount += results.length;
        } else if (qlog.data?.totalQuestions) {
            // Fallback: derive from score percentage
            const wrong = Math.round(qlog.data.totalQuestions * (1 - (qlog.data.score || 0) / 100));
            wrongAnswerCount += wrong;
            totalAnswerCount += qlog.data.totalQuestions;
        }
    }

    const hasPassedQuiz = quizScores.some(s => s >= 70);

    // Cap score at 39 (just below WEAK threshold) if no quiz has ever been attempted.
    // Reading alone is engagement, not proven knowledge.
    if (quizLogs.length === 0) {
        score = Math.min(score, 39);
    }

    // Trend detection
    let trend = 'stable';
    if (quizScores.length >= 3) {
        const recent = quizScores.slice(-3);
        const older = quizScores.slice(-6, -3);
        if (older.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            if (recentAvg > olderAvg + 5) trend = 'improving';
            else if (recentAvg < olderAvg - 5) trend = 'declining';
        }
    }

    // Level classification
    let level;
    if (score >= THRESHOLDS.MASTERED) level = 'mastered';
    else if (score >= THRESHOLDS.STRONG) level = 'strong';
    else if (score >= THRESHOLDS.WEAK) level = 'developing';
    else if (score > 0) level = 'weak';
    else level = 'untouched';

    return {
        score,
        level,
        details: {
            totalActivities: logs.length,
            quizAttempts: quizLogs.length,
            avgQuizScore,
            hasPassedQuiz,
            wrongAnswerCount,
            totalAnswerCount,
            lastActivity: logs[logs.length - 1]?.createdAt,
            trend,
            rawScore: Math.round(weightedSum * 100) / 100
        }
    };
}

/**
 * Calculate knowledge state for ALL topics in a goal
 * Also auto-populates strongTopics, weakTopics, and coverage
 * 
 * @param {string} goalId
 * @returns {Promise<Object>} Full knowledge state
 */
async function calculateGoalKnowledge(goalId) {
    const goal = await Goal.findById(goalId);
    if (!goal) throw new Error('Goal not found');

    const topicScores = {};
    const strongTopics = [];
    const weakTopics = [];
    const coveredTopics = [];
    const untouchedTopics = [];

    // Calculate score for each topic
    for (const topic of goal.topics) {
        const result = await calculateTopicKnowledge(goalId, topic.name);
        topicScores[topic.name] = result;

        if (result.level === 'strong' || result.level === 'mastered') {
            strongTopics.push(topic.name);
        } else if (result.level === 'weak') {
            weakTopics.push(topic.name);
        }

        if (result.details.totalActivities > 0) {
            coveredTopics.push(topic.name);
        } else {
            untouchedTopics.push(topic.name);
        }
    }

    // Overall knowledge score (weighted average across topics)
    const scores = Object.values(topicScores).map(t => t.score);
    const overallScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    // Coverage percentage
    const coverage = goal.topics.length > 0
        ? Math.round((coveredTopics.length / goal.topics.length) * 100)
        : 0;

    // Overall trend
    const trends = Object.values(topicScores).map(t => t.details.trend);
    const improvingCount = trends.filter(t => t === 'improving').length;
    const decliningCount = trends.filter(t => t === 'declining').length;
    let overallTrend = 'stable';
    if (improvingCount > decliningCount + 1) overallTrend = 'improving';
    else if (decliningCount > improvingCount + 1) overallTrend = 'declining';

    return {
        overallScore,
        overallTrend,
        coverage,
        topicScores,
        strongTopics,
        weakTopics,
        coveredTopics,
        untouchedTopics,
        totalTopics: goal.topics.length,
        calculatedAt: new Date()
    };
}

/**
 * Update the Goal's learningProfile with latest knowledge state
 * Called after each activity is logged
 * 
 * @param {string} goalId
 * @returns {Promise<Object>} Updated knowledge state
 */
async function updateGoalLearningProfile(goalId) {
    const knowledgeState = await calculateGoalKnowledge(goalId);

    // Update the goal's learningProfile
    const goal = await Goal.findById(goalId);
    if (!goal) return knowledgeState;

    goal.learningProfile = {
        averageQuizScore: knowledgeState.overallScore,
        totalQuizAttempts: Object.values(knowledgeState.topicScores)
            .reduce((sum, t) => sum + t.details.quizAttempts, 0),
        strongTopics: knowledgeState.strongTopics,
        weakTopics: knowledgeState.weakTopics,
        recommendedFocus: knowledgeState.weakTopics[0] || knowledgeState.untouchedTopics[0] || null,
        lastAnalyzedAt: new Date()
    };

    // Fetch essay content existence per topic (to cap progress when essays exist but untried)
    const essayDocs = await GeneratedContent.find({
        goal: goalId, contentType: 'essay', status: 'active'
    }).select('topic').lean();
    const topicsWithEssays = new Set(essayDocs.map(e => e.topic).filter(Boolean));

    // Pre-count essay submissions per topic from activity logs
    const essaySubmitLogs = await ActivityLog.find({
        goal: goalId, activityType: 'essay_submission'
    }).select('topicName').lean();
    const essaySubmissionsByTopic = {};
    for (const log of essaySubmitLogs) {
        if (log.topicName) essaySubmissionsByTopic[log.topicName] = (essaySubmissionsByTopic[log.topicName] || 0) + 1;
    }

    // Update individual topic difficulty levels and auto-advance progress from BKT
    for (const topic of goal.topics) {
        const topicData = knowledgeState.topicScores[topic.name];
        if (topicData) {
            // Adaptive content difficulty
            if (topicData.score >= THRESHOLDS.STRONG) {
                topic.difficultyLevel = 'hard'; // They're strong, challenge them
            } else if (topicData.score <= THRESHOLDS.WEAK) {
                topic.difficultyLevel = 'easy'; // They're struggling, ease up
            } else {
                topic.difficultyLevel = 'medium';
            }

            // Cap progress at 85 if essays exist for this topic but none have been attempted.
            // This signals the user needs to demonstrate written comprehension for full mastery.
            const hasUntriedEssays = topicsWithEssays.has(topic.name) && !essaySubmissionsByTopic[topic.name];
            const progressCap = hasUntriedEssays ? 85 : 100;

            // Enforce cap on existing progress (corrects any previously over-advanced value)
            if (topic.progress > progressCap) {
                topic.progress = progressCap;
            }

            // Sync BKT score → topic.progress (only increase, capped by essay gate)
            if (topicData.score > (topic.progress || 0)) {
                topic.progress = Math.min(topicData.score, progressCap);
            }
        }
    }

    await goal.save();

    return knowledgeState;
}

/**
 * Get knowledge context string for AI prompt injection
 * Used by aiService when generating adaptive content
 * 
 * @param {string} goalId
 * @param {string} topicName
 * @returns {Promise<string>} Context string for LLM prompt
 */
async function getKnowledgeContext(goalId, topicName) {
    const goalKnowledge = await calculateGoalKnowledge(goalId);
    const topicKnowledge = goalKnowledge.topicScores[topicName];

    if (!topicKnowledge || topicKnowledge.details.totalActivities === 0) {
        return `Student has not studied "${topicName}" yet. Generate content at introductory level.`;
    }

    const { score, level, details } = topicKnowledge;

    let context = `Student's Knowledge Profile for "${topicName}":\n`;
    context += `- Knowledge Score: ${score}/100 (${level})\n`;
    context += `- Quiz Attempts: ${details.quizAttempts}, Average Score: ${details.avgQuizScore}%\n`;
    context += `- Performance Trend: ${details.trend}\n`;

    if (goalKnowledge.weakTopics.length > 0) {
        context += `- Weak Areas (overall): ${goalKnowledge.weakTopics.join(', ')}\n`;
    }
    if (goalKnowledge.strongTopics.length > 0) {
        context += `- Strong Areas (overall): ${goalKnowledge.strongTopics.join(', ')}\n`;
    }

    // Difficulty recommendation
    if (score >= THRESHOLDS.STRONG) {
        context += `\nThis student is performing well. Generate challenging content to push mastery.`;
    } else if (score <= THRESHOLDS.WEAK) {
        context += `\nThis student is struggling. Generate simpler content with more explanations and examples.`;
    } else {
        context += `\nThis student is at an intermediate level. Generate balanced content.`;
    }

    if (details.trend === 'declining') {
        context += ` Their performance is declining — focus on reinforcing fundamentals.`;
    } else if (details.trend === 'improving') {
        context += ` Their performance is improving — they can handle slightly harder material.`;
    }

    return context;
}

module.exports = {
    calculateTopicKnowledge,
    calculateGoalKnowledge,
    updateGoalLearningProfile,
    getKnowledgeContext,
    THRESHOLDS
};
