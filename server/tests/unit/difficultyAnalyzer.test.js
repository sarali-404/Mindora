/**
 * Unit Tests: difficultyAnalyzer.js
 *
 * Tests the core adaptive difficulty algorithm directly, without HTTP.
 * Uses an in-memory MongoDB so no real Atlas connection is needed.
 *
 * Evaluation target: "observable difficulty adjustment within 3–5 quiz iterations"
 * These tests prove adjustment triggers at exactly iteration 3.
 *
 * Thresholds in code:
 *   QUIZ_TOO_EASY  = 85   (avg >= 85 on last 3 → escalate)
 *   QUIZ_TOO_HARD  = 45   (avg <= 45 on last 3 → reduce)
 *   MIN_QUIZ_ATTEMPTS = 3
 */

const db = require('../setup/db');
const mongoose = require('mongoose');
const ActivityLog = require('../../src/models/ActivityLog');
const Goal = require('../../src/models/Goal');
const User = require('../../src/models/User');
const { analyzeTopicDifficulty } = require('../../src/services/difficultyAnalyzer');

describe('difficultyAnalyzer — analyzeTopicDifficulty()', () => {
  let goalId;
  let userId;

  beforeAll(async () => {
    await db.connect();

    // Minimal user (password required by schema)
    const user = await User.create({
      username: 'difftest_user',
      email: 'difftest@example.com',
      password: 'TestPassword123!',
    });
    userId = user._id;

    // Goal with one topic at 'easy' (will be overridden per test via function param)
    const goal = await Goal.create({
      user: userId,
      title: 'Test Adaptive Difficulty Goal',
      subject: 'Computer Science',
      deadline: new Date(Date.now() + 86400000 * 30),
      topics: [{ name: 'Topic A', difficultyLevel: 'easy' }],
    });
    goalId = goal._id;
  });

  afterAll(async () => await db.close());

  // Clear ActivityLog between tests so logs don't bleed across test cases
  afterEach(async () => {
    await ActivityLog.deleteMany({});
  });

  // ------------------------------------------------------------------
  // UT-01: Escalation path — high scores from easy → should suggest medium
  // ------------------------------------------------------------------
  test('UT-01: escalates to MEDIUM when avg quiz score >= 85 over 3 attempts (from EASY)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 88 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 92 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'easy');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedDifficulty).toBe('medium');
    expect(suggestions[0].currentDifficulty).toBe('easy');
    expect(suggestions[0].direction).toBe('harder');
    expect(suggestions[0].contentTypes).toContain('quiz');
    // Verify reason string is human-readable
    expect(suggestions[0].reason).toMatch(/quiz/i);
  });

  // ------------------------------------------------------------------
  // UT-02: Escalation path — high scores from medium → should suggest hard
  // ------------------------------------------------------------------
  test('UT-02: escalates to HARD when avg quiz score >= 85 over 3 attempts (from MEDIUM)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 87 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 86 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'medium');

    expect(suggestions[0].suggestedDifficulty).toBe('hard');
    expect(suggestions[0].direction).toBe('harder');
  });

  // ------------------------------------------------------------------
  // UT-03: Reduction path — low scores from medium → should suggest easy
  // ------------------------------------------------------------------
  test('UT-03: reduces to EASY when avg quiz score <= 45 over 3 attempts (from MEDIUM)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 40 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 45 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 42 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'medium');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedDifficulty).toBe('easy');
    expect(suggestions[0].currentDifficulty).toBe('medium');
    expect(suggestions[0].direction).toBe('easier');
  });

  // ------------------------------------------------------------------
  // UT-04: Mid-range scores — no change should be suggested
  // ------------------------------------------------------------------
  test('UT-04: returns NO suggestion when avg score is in mid-range (46–84)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 70 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 68 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 72 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'medium');

    expect(suggestions).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // UT-05: Minimum attempts gate — only 2 logs, should NOT trigger
  // ------------------------------------------------------------------
  test('UT-05: returns NO suggestion with only 2 quiz attempts (below MIN_QUIZ_ATTEMPTS=3)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 90 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'easy');

    expect(suggestions).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // UT-06: Ceiling check — already at HARD, high scores → no escalation
  // ------------------------------------------------------------------
  test('UT-06: does NOT escalate when already at HARD (ceiling)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 92 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 95 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'hard');

    expect(suggestions).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // UT-07: Floor check — already at EASY, low scores → no reduction
  // ------------------------------------------------------------------
  test('UT-07: does NOT reduce when already at EASY (floor)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 40 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 38 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 42 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'easy');

    expect(suggestions).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // UT-08: Exact boundary — avg exactly 85% → should escalate (inclusive threshold)
  // ------------------------------------------------------------------
  test('UT-08a: triggers escalation at EXACTLY 85% average (inclusive boundary)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 85 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 85 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 85 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'medium');

    expect(suggestions[0]?.direction).toBe('harder');
  });

  // ------------------------------------------------------------------
  // UT-08b: Exact boundary — avg exactly 45% → should reduce (inclusive threshold)
  // ------------------------------------------------------------------
  test('UT-08b: triggers reduction at EXACTLY 45% average (inclusive boundary)', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 45 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 45 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt', data: { score: 45 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'medium');

    expect(suggestions[0]?.direction).toBe('easier');
  });

  // ------------------------------------------------------------------
  // UT-09: Only last 3 attempts are evaluated (older logs ignored)
  // ------------------------------------------------------------------
  test('UT-09: evaluates only the 3 most recent attempts (ignores older low-score logs)', async () => {
    const now = Date.now();
    // 2 old low-score attempts (should be ignored)
    await ActivityLog.create({
      user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt',
      data: { score: 30 }, createdAt: new Date(now - 5000),
    });
    await ActivityLog.create({
      user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt',
      data: { score: 35 }, createdAt: new Date(now - 4000),
    });
    // 3 recent high-score attempts (should trigger escalation)
    await ActivityLog.create({
      user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt',
      data: { score: 90 }, createdAt: new Date(now - 3000),
    });
    await ActivityLog.create({
      user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt',
      data: { score: 92 }, createdAt: new Date(now - 2000),
    });
    await ActivityLog.create({
      user: userId, goal: goalId, topicName: 'Topic A', activityType: 'quiz_attempt',
      data: { score: 88 }, createdAt: new Date(now - 1000),
    });

    // Average of last 3 = (90+92+88)/3 = 90 → should escalate
    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'medium');

    expect(suggestions[0]?.direction).toBe('harder');
  });

  // ------------------------------------------------------------------
  // UT-10: Essay analysis — escalate when essay avg >= 90 over 2 attempts
  // ------------------------------------------------------------------
  test('UT-10: escalates based on essay scores when avg >= 90 over 2+ attempts', async () => {
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'essay_submission', data: { score: 92 } },
      { user: userId, goal: goalId, topicName: 'Topic A', activityType: 'essay_submission', data: { score: 91 } },
    ]);

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'easy');

    const essaySuggestion = suggestions.find(s => s.contentTypes.includes('essay'));
    expect(essaySuggestion).toBeDefined();
    expect(essaySuggestion.direction).toBe('harder');
  });

  // ------------------------------------------------------------------
  // UT-11: Only 1 essay log → no essay suggestion (below MIN_ESSAY_ATTEMPTS=2)
  // ------------------------------------------------------------------
  test('UT-11: returns NO essay suggestion with only 1 essay attempt', async () => {
    await ActivityLog.create({
      user: userId, goal: goalId, topicName: 'Topic A', activityType: 'essay_submission', data: { score: 95 },
    });

    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'easy');

    expect(suggestions).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // UT-12: Topic name isolation — logs for a different topic are not counted
  // ------------------------------------------------------------------
  test('UT-12: logs for a different topic do NOT affect the target topic', async () => {
    // High scores for 'Topic B' — should not affect 'Topic A'
    await ActivityLog.insertMany([
      { user: userId, goal: goalId, topicName: 'Topic B', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: userId, goal: goalId, topicName: 'Topic B', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: userId, goal: goalId, topicName: 'Topic B', activityType: 'quiz_attempt', data: { score: 90 } },
    ]);

    // Topic A has no logs → should return empty
    const suggestions = await analyzeTopicDifficulty(goalId, 'Topic A', 'easy');

    expect(suggestions).toHaveLength(0);
  });
});
