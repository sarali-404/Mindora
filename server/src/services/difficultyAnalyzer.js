const ActivityLog = require('../models/ActivityLog');
const Goal = require('../models/Goal');
const GeneratedContent = require('../models/GeneratedContent');

// Thresholds for difficulty adjustment
const QUIZ_TOO_EASY = 85;   // avg score >= 85% on last 3 → suggest harder
const QUIZ_TOO_HARD = 45;   // avg score <= 45% on last 3 → suggest easier
const ESSAY_TOO_EASY = 90;  // avg essay score >= 90% with 2+ → suggest harder
const ESSAY_TOO_HARD = 40;  // avg essay score <= 40% → suggest easier
const MIN_QUIZ_ATTEMPTS = 3;
const MIN_ESSAY_ATTEMPTS = 2;

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

function getHarder(current) {
  const idx = DIFFICULTY_ORDER.indexOf(current || 'medium');
  return idx < DIFFICULTY_ORDER.length - 1 ? DIFFICULTY_ORDER[idx + 1] : null;
}

function getSofter(current) {
  const idx = DIFFICULTY_ORDER.indexOf(current || 'medium');
  return idx > 0 ? DIFFICULTY_ORDER[idx - 1] : null;
}

/**
 * Analyze a single topic's recent quiz/essay performance
 * to determine if content difficulty should change.
 */
async function analyzeTopicDifficulty(goalId, topicName, currentDifficulty) {
  const suggestions = [];

  // --- Quiz analysis ---
  const quizLogs = await ActivityLog.find({
    goal: goalId,
    topicName,
    activityType: 'quiz_attempt'
  }).sort({ createdAt: -1 }).limit(MIN_QUIZ_ATTEMPTS);

  if (quizLogs.length >= MIN_QUIZ_ATTEMPTS) {
    const avgScore = quizLogs.reduce((sum, l) => sum + (l.data?.score || 0), 0) / quizLogs.length;

    if (avgScore >= QUIZ_TOO_EASY) {
      const harder = getHarder(currentDifficulty);
      if (harder) {
        suggestions.push({
          topicName,
          currentDifficulty: currentDifficulty || 'medium',
          suggestedDifficulty: harder,
          reason: `Your last ${MIN_QUIZ_ATTEMPTS} quiz scores averaged ${Math.round(avgScore)}% — you're ready for a challenge!`,
          contentTypes: ['quiz'],
          direction: 'harder'
        });
      }
    } else if (avgScore <= QUIZ_TOO_HARD) {
      const softer = getSofter(currentDifficulty);
      if (softer) {
        suggestions.push({
          topicName,
          currentDifficulty: currentDifficulty || 'medium',
          suggestedDifficulty: softer,
          reason: `Your last ${MIN_QUIZ_ATTEMPTS} quiz scores averaged ${Math.round(avgScore)}% — let's build stronger foundations first.`,
          contentTypes: ['quiz'],
          direction: 'easier'
        });
      }
    }
  }

  // --- Essay analysis ---
  const essayLogs = await ActivityLog.find({
    goal: goalId,
    topicName,
    activityType: 'essay_submission'
  }).sort({ createdAt: -1 }).limit(3);

  if (essayLogs.length >= MIN_ESSAY_ATTEMPTS) {
    const avgEssay = essayLogs.reduce((sum, l) => sum + (l.data?.score || 0), 0) / essayLogs.length;

    if (avgEssay >= ESSAY_TOO_EASY) {
      const harder = getHarder(currentDifficulty);
      if (harder) {
        // Check if quiz already suggested harder — merge if so
        const existing = suggestions.find(s => s.direction === 'harder');
        if (existing) {
          if (!existing.contentTypes.includes('essay')) existing.contentTypes.push('essay');
        } else {
          suggestions.push({
            topicName,
            currentDifficulty: currentDifficulty || 'medium',
            suggestedDifficulty: harder,
            reason: `Your essay scores averaged ${Math.round(avgEssay)}% — time for harder questions!`,
            contentTypes: ['essay'],
            direction: 'harder'
          });
        }
      }
    } else if (avgEssay <= ESSAY_TOO_HARD) {
      const softer = getSofter(currentDifficulty);
      if (softer) {
        const existing = suggestions.find(s => s.direction === 'easier');
        if (existing) {
          if (!existing.contentTypes.includes('essay')) existing.contentTypes.push('essay');
        } else {
          suggestions.push({
            topicName,
            currentDifficulty: currentDifficulty || 'medium',
            suggestedDifficulty: softer,
            reason: `Your essay scores averaged ${Math.round(avgEssay)}% — let's simplify a bit.`,
            contentTypes: ['essay'],
            direction: 'easier'
          });
        }
      }
    }
  }

  return suggestions;
}

/**
 * Analyze ALL topics in a goal and return difficulty adjustment suggestions.
 * @param {string} goalId
 * @returns {Promise<Array>} Array of suggestion objects
 */
async function analyze(goalId) {
  const goal = await Goal.findById(goalId);
  if (!goal || !goal.topics?.length) return [];

  const allSuggestions = [];

  for (const topic of goal.topics) {
    const topicSuggestions = await analyzeTopicDifficulty(
      goalId,
      topic.name,
      topic.difficultyLevel || 'medium'
    );
    allSuggestions.push(...topicSuggestions);
  }

  return allSuggestions;
}

module.exports = { analyze, analyzeTopicDifficulty };
