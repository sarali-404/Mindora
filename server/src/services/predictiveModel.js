const ActivityLog = require('../models/ActivityLog');
const Goal = require('../models/Goal');
const knowledgeService = require('./knowledgeStateService');

// ============================================================
// Predictive ML Model Service
// Logistic Regression from scratch in Node.js
// Predicts: Quiz Pass Probability & Exam Readiness Score
// ============================================================

// --- Logistic Regression Implementation ---

class LogisticRegression {
    /**
     * @param {number} numFeatures - Number of input features
     * @param {number} learningRate - Gradient descent step size
     */
    constructor(numFeatures, learningRate = 0.01) {
        this.numFeatures = numFeatures;
        this.learningRate = learningRate;
        // Initialize weights to small random values
        this.weights = Array.from({ length: numFeatures }, () => (Math.random() - 0.5) * 0.1);
        this.bias = 0;
        this.trained = false;
        this.trainingHistory = [];
    }

    /** Sigmoid activation function */
    sigmoid(z) {
        // Clamp to prevent overflow
        const clamped = Math.max(-500, Math.min(500, z));
        return 1 / (1 + Math.exp(-clamped));
    }

    /**
     * Forward pass: compute prediction for a single sample
     * @param {number[]} features - Input feature vector
     * @returns {number} Probability between 0 and 1
     */
    predict(features) {
        if (features.length !== this.numFeatures) {
            throw new Error(`Expected ${this.numFeatures} features, got ${features.length}`);
        }
        let z = this.bias;
        for (let i = 0; i < this.numFeatures; i++) {
            z += this.weights[i] * features[i];
        }
        return this.sigmoid(z);
    }

    /**
     * Train on a dataset using mini-batch gradient descent
     * @param {number[][]} X - Feature matrix (rows = samples, cols = features)
     * @param {number[]} y - Labels (0 or 1)
     * @param {number} epochs - Number of iterations
     * @returns {Object} Training stats
     */
    train(X, y, epochs = 100) {
        if (X.length === 0 || X.length !== y.length) {
            return { loss: Infinity, epochs: 0 };
        }

        const n = X.length;
        let finalLoss = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            const weightGradients = new Array(this.numFeatures).fill(0);
            let biasGradient = 0;

            for (let i = 0; i < n; i++) {
                const pred = this.predict(X[i]);
                const error = pred - y[i];

                // Binary cross-entropy loss
                const clampedPred = Math.max(1e-7, Math.min(1 - 1e-7, pred));
                totalLoss += -(y[i] * Math.log(clampedPred) + (1 - y[i]) * Math.log(1 - clampedPred));

                // Accumulate gradients
                for (let j = 0; j < this.numFeatures; j++) {
                    weightGradients[j] += error * X[i][j];
                }
                biasGradient += error;
            }

            // Update weights and bias
            for (let j = 0; j < this.numFeatures; j++) {
                this.weights[j] -= this.learningRate * (weightGradients[j] / n);
            }
            this.bias -= this.learningRate * (biasGradient / n);

            finalLoss = totalLoss / n;
        }

        this.trained = true;
        this.trainingHistory.push({
            samples: n,
            finalLoss,
            timestamp: new Date()
        });

        return { loss: finalLoss, epochs, samples: n };
    }

    /** Serialize model weights to JSON */
    toJSON() {
        return {
            weights: this.weights,
            bias: this.bias,
            numFeatures: this.numFeatures,
            learningRate: this.learningRate,
            trained: this.trained,
            trainingHistory: this.trainingHistory
        };
    }

    /** Restore model from JSON */
    static fromJSON(json) {
        const model = new LogisticRegression(json.numFeatures, json.learningRate);
        model.weights = json.weights;
        model.bias = json.bias;
        model.trained = json.trained || false;
        model.trainingHistory = json.trainingHistory || [];
        return model;
    }
}

// --- Feature Extraction ---

// Quiz Pass Prediction features (7 features):
// [0] avgQuizScore        - Average quiz score for this topic (0-100, normalized)
// [1] recentQuizScore     - Most recent quiz score (0-100, normalized)
// [2] quizAttemptCount    - Number of quiz attempts (log-scaled)
// [3] knowledgeScore      - Knowledge state score (0-100, normalized)
// [4] noteTimeMinutes     - Total note reading time in minutes (log-scaled)
// [5] essayAvgScore       - Average essay score (0-100, normalized)
// [6] daysSinceLastQuiz   - Days since last quiz attempt (log-scaled, inverted)

/**
 * Extract features for quiz pass prediction
 * @param {string} goalId
 * @param {string} topicName
 * @returns {Promise<number[]>} Feature vector (normalized 0-1)
 */
async function extractQuizFeatures(goalId, topicName) {
    const logs = await ActivityLog.find({ goal: goalId, topicName })
        .sort({ createdAt: -1 });

    const quizLogs = logs.filter(l => l.activityType === 'quiz_attempt');
    const essayLogs = logs.filter(l => l.activityType === 'essay_submission');
    const timeLogs = logs.filter(l => l.activityType === 'note_time_spent');

    // Feature 0: Average quiz score
    const quizScores = quizLogs.map(l => l.data?.score || 0);
    const avgQuizScore = quizScores.length > 0
        ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length / 100
        : 0.5; // Prior: assume 50% if no data

    // Feature 1: Most recent quiz score
    const recentQuizScore = quizScores.length > 0 ? quizScores[0] / 100 : 0.5;

    // Feature 2: Quiz attempt count (log-scaled)
    const quizAttemptCount = Math.log(1 + quizLogs.length) / Math.log(20); // normalize to ~1 at 19 attempts

    // Feature 3: Knowledge score
    let knowledgeScore = 0.5;
    try {
        const topicKnowledge = await knowledgeService.calculateTopicKnowledge(goalId, topicName);
        knowledgeScore = topicKnowledge.score / 100;
    } catch (e) { /* use default */ }

    // Feature 4: Note reading time (log-scaled, in minutes)
    const totalReadingSeconds = timeLogs.reduce((sum, l) => sum + (l.data?.duration || 0), 0);
    const noteTimeMinutes = Math.log(1 + totalReadingSeconds / 60) / Math.log(60); // normalize

    // Feature 5: Average essay score
    const essayScores = essayLogs.map(l => l.data?.score || 0);
    const essayAvgScore = essayScores.length > 0
        ? essayScores.reduce((a, b) => a + b, 0) / essayScores.length / 100
        : 0.5;

    // Feature 6: Days since last quiz (inverted, recent = higher)
    let daysSinceLastQuiz = 0.5;
    if (quizLogs.length > 0) {
        const days = (Date.now() - new Date(quizLogs[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);
        daysSinceLastQuiz = 1 / (1 + days / 7); // 1.0 if today, ~0.5 at 7 days, ~0.3 at 14 days
    }

    return [avgQuizScore, recentQuizScore, quizAttemptCount, knowledgeScore, noteTimeMinutes, essayAvgScore, daysSinceLastQuiz];
}

/**
 * Build training data from historical quiz attempts for a goal
 * @param {string} goalId
 * @returns {Promise<{X: number[][], y: number[]}>}
 */
async function buildTrainingData(goalId) {
    const goal = await Goal.findById(goalId);
    if (!goal) return { X: [], y: [] };

    const X = [];
    const y = [];

    for (const topic of goal.topics) {
        const quizLogs = await ActivityLog.find({
            goal: goalId,
            topicName: topic.name,
            activityType: 'quiz_attempt'
        }).sort({ createdAt: 1 });

        // For each quiz attempt, build features from all PRIOR data
        for (let i = 0; i < quizLogs.length; i++) {
            const currentLog = quizLogs[i];
            const priorLogs = await ActivityLog.find({
                goal: goalId,
                topicName: topic.name,
                createdAt: { $lt: currentLog.createdAt }
            }).sort({ createdAt: -1 });

            // Build features from prior data
            const priorQuizzes = priorLogs.filter(l => l.activityType === 'quiz_attempt');
            const priorEssays = priorLogs.filter(l => l.activityType === 'essay_submission');
            const priorTime = priorLogs.filter(l => l.activityType === 'note_time_spent');

            const priorScores = priorQuizzes.map(l => l.data?.score || 0);
            const avgScore = priorScores.length > 0
                ? priorScores.reduce((a, b) => a + b, 0) / priorScores.length / 100
                : 0.5;
            const recentScore = priorScores.length > 0 ? priorScores[0] / 100 : 0.5;
            const attemptCount = Math.log(1 + priorQuizzes.length) / Math.log(20);

            let ks = 0.5;
            try {
                const tk = await knowledgeService.calculateTopicKnowledge(goalId, topic.name);
                ks = tk.score / 100;
            } catch (e) { }

            const readingSec = priorTime.reduce((s, l) => s + (l.data?.duration || 0), 0);
            const readingNorm = Math.log(1 + readingSec / 60) / Math.log(60);

            const essayScores = priorEssays.map(l => l.data?.score || 0);
            const essayAvg = essayScores.length > 0
                ? essayScores.reduce((a, b) => a + b, 0) / essayScores.length / 100
                : 0.5;

            let daysSince = 0.5;
            if (priorQuizzes.length > 0) {
                const days = (new Date(currentLog.createdAt).getTime() - new Date(priorQuizzes[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);
                daysSince = 1 / (1 + days / 7);
            }

            X.push([avgScore, recentScore, attemptCount, ks, readingNorm, essayAvg, daysSince]);
            y.push((currentLog.data?.score || 0) >= 70 ? 1 : 0); // Pass = score >= 70%
        }
    }

    return { X, y };
}

// --- Model Persistence ---

/**
 * Save model weights to the Goal document
 */
async function saveModel(goalId, modelType, model) {
    const update = {};
    update[`predictiveModels.${modelType}`] = model.toJSON();
    await Goal.findByIdAndUpdate(goalId, { $set: update });
}

/**
 * Load model from Goal document
 */
async function loadModel(goalId, modelType) {
    const goal = await Goal.findById(goalId).lean();
    const modelData = goal?.predictiveModels?.[modelType];
    if (modelData && modelData.trained) {
        return LogisticRegression.fromJSON(modelData);
    }
    return null;
}

// --- Public API ---

const NUM_FEATURES = 7;

/**
 * Train (or retrain) the quiz pass prediction model for a goal
 * Called after each quiz attempt
 */
async function trainQuizPassModel(goalId) {
    const { X, y } = await buildTrainingData(goalId);

    if (X.length < 3) {
        // Not enough data to train meaningfully
        return { trained: false, reason: 'Need at least 3 quiz attempts to train', samples: X.length };
    }

    // Try to load existing model (for continued training)
    let model = await loadModel(goalId, 'quizPass');
    if (!model) {
        model = new LogisticRegression(NUM_FEATURES, 0.05);
    }

    const stats = model.train(X, y, 200);
    await saveModel(goalId, 'quizPass', model);

    return { trained: true, ...stats };
}

/**
 * Predict quiz pass probability for a specific topic
 * @returns {Promise<{probability: number, confidence: string, ready: boolean}>}
 */
async function predictQuizPass(goalId, topicName) {
    const model = await loadModel(goalId, 'quizPass');

    if (!model) {
        // Fallback: use knowledge score as a rough estimate
        try {
            const topicKnowledge = await knowledgeService.calculateTopicKnowledge(goalId, topicName);
            return {
                probability: topicKnowledge.score / 100,
                confidence: 'low',
                ready: topicKnowledge.score >= 70,
                modelTrained: false,
                message: 'Based on knowledge score (model not yet trained)'
            };
        } catch (e) {
            return { probability: 0.5, confidence: 'none', ready: false, modelTrained: false, message: 'No data available' };
        }
    }

    const features = await extractQuizFeatures(goalId, topicName);
    const probability = model.predict(features);

    // Confidence based on training data size
    const lastTraining = model.trainingHistory[model.trainingHistory.length - 1];
    const samples = lastTraining?.samples || 0;
    const confidence = samples >= 15 ? 'high' : samples >= 8 ? 'medium' : 'low';

    return {
        probability: Math.round(probability * 100) / 100,
        percentage: Math.round(probability * 100),
        confidence,
        ready: probability >= 0.7,
        modelTrained: true,
        trainingSamples: samples
    };
}

/**
 * Calculate exam readiness score across all topics
 * Weighted combination of knowledge scores and quiz pass predictions
 */
async function calculateExamReadiness(goalId) {
    const goal = await Goal.findById(goalId);
    if (!goal || !goal.topics.length) {
        return { readiness: 0, breakdown: [], recommendation: 'Start studying to build your readiness score.' };
    }

    const breakdown = [];
    let totalWeight = 0;
    let weightedSum = 0;

    for (const topic of goal.topics) {
        const prediction = await predictQuizPass(goalId, topic.name);
        let topicKnowledge;
        try {
            topicKnowledge = await knowledgeService.calculateTopicKnowledge(goalId, topic.name);
        } catch (e) {
            topicKnowledge = { score: 0, level: 'untouched', details: { totalActivities: 0 } };
        }

        // Combine: 60% knowledge score + 40% quiz prediction
        const combinedScore = topicKnowledge.score * 0.6 + prediction.probability * 100 * 0.4;
        const weight = topicKnowledge.details.totalActivities > 0 ? 1 : 0.3; // Lower weight for untouched topics

        breakdown.push({
            topic: topic.name,
            knowledgeScore: topicKnowledge.score,
            knowledgeLevel: topicKnowledge.level,
            quizPassProbability: prediction.percentage || Math.round(prediction.probability * 100),
            combinedScore: Math.round(combinedScore),
            ready: combinedScore >= 70,
            confidence: prediction.confidence
        });

        weightedSum += combinedScore * weight;
        totalWeight += weight;
    }

    const readiness = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Sort breakdown: weakest first
    breakdown.sort((a, b) => a.combinedScore - b.combinedScore);

    // Generate recommendation
    const weakCount = breakdown.filter(b => !b.ready).length;
    let recommendation;
    if (readiness >= 85) {
        recommendation = "You're well-prepared! Focus on maintaining your strong areas and do a final review.";
    } else if (readiness >= 70) {
        recommendation = `Good progress! Focus on your ${weakCount} weaker topic${weakCount !== 1 ? 's' : ''} to push your readiness higher.`;
    } else if (readiness >= 50) {
        recommendation = `You're making progress but need more study. Prioritize: ${breakdown.slice(0, 2).map(b => b.topic).join(', ')}.`;
    } else {
        recommendation = `Keep studying! Start with the fundamentals of ${breakdown[0]?.topic || 'your weakest topics'}.`;
    }

    return {
        readiness,
        totalTopics: goal.topics.length,
        readyTopics: breakdown.filter(b => b.ready).length,
        breakdown,
        recommendation,
        calculatedAt: new Date()
    };
}

/**
 * Get all predictions for a goal (quiz pass per topic + exam readiness)
 */
async function getPredictions(goalId) {
    const examReadiness = await calculateExamReadiness(goalId);

    return {
        examReadiness,
        modelInfo: {
            type: 'Logistic Regression',
            features: NUM_FEATURES,
            featureNames: [
                'avgQuizScore', 'recentQuizScore', 'quizAttemptCount',
                'knowledgeScore', 'noteReadingTime', 'essayAvgScore', 'daysSinceLastQuiz'
            ]
        }
    };
}

module.exports = {
    LogisticRegression,
    trainQuizPassModel,
    predictQuizPass,
    calculateExamReadiness,
    getPredictions,
    extractQuizFeatures,
    buildTrainingData
};
