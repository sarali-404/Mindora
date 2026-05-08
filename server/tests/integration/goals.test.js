/**
 * Integration Tests: Goals API
 *
 * Tests goal creation, the goal-limit for unverified users, and the
 * difficulty-suggestions endpoint after seeding quiz ActivityLog records.
 *
 * Endpoints tested:
 *   POST /api/goals                             (IT-GOAL-01, IT-GOAL-02)
 *   GET  /api/goals/:goalId/difficulty-suggestions  (IT-GOAL-03, IT-GOAL-04)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const db = require('../setup/db');
const { createTestApp } = require('../setup/app');
const User = require('../../src/models/User');
const Goal = require('../../src/models/Goal');
const ActivityLog = require('../../src/models/ActivityLog');
const { generateToken } = require('../../src/utils/tokenUtils');

// ── Mock external services ────────────────────────────────────────────────────
jest.mock('../../src/services/emailService', () => ({
  generateOTP: jest.fn(() => '123456'),
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/services/gamificationService', () => ({
  initializeGameProfile: jest.fn().mockResolvedValue({}),
  evaluateAchievements: jest.fn().mockResolvedValue([]),
  addXP: jest.fn().mockResolvedValue({ newXP: 25, xpGained: 25, leveledUp: false, newLevel: 'Bronze' }),
  updateActivityStats: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/services/aiService', () => ({
  extractTopics: jest.fn().mockResolvedValue([{ name: 'Intro Topic', description: 'Mock topic' }]),
  generateNotes: jest.fn().mockResolvedValue('Mock notes'),
  generateQuiz: jest.fn().mockResolvedValue([]),
  getGoalSuggestions: jest.fn().mockResolvedValue({ suggestions: [], isVague: false }),
  refineGoalTitle: jest.fn().mockResolvedValue('Refined goal title'),
}));

// ── Test setup ────────────────────────────────────────────────────────────────
let app;

beforeAll(async () => {
  await db.connect();
  app = createTestApp();
});

afterAll(async () => await db.close());
afterEach(async () => await db.clear());

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Create a test user + Bearer token for authenticated requests */
async function createAuthUser({ idVerified = false } = {}) {
  const user = await User.create({
    username: `goaltest_${Date.now()}`,
    email: `goaltest_${Date.now()}@example.com`,
    password: 'Password123!',
    isEmailVerified: true,
    verificationStatus: 'email_verified',
    registrationStep: 4,
    isActive: true,
    ...(idVerified && {
      profile: {
        idPhoto: { url: 'http://example.com/id.jpg', uploadedAt: new Date(), verified: true },
      },
    }),
  });
  const token = generateToken(user._id, 'user');
  return { user, token };
}

/** Valid goal payload */
const validGoalPayload = () => ({
  goalTitle: 'Master Data Structures and Algorithms',
  subject: 'Computer Science',
  deadline: new Date(Date.now() + 86400000 * 60).toISOString(),
});

// =============================================================================
// POST /api/goals — Goal creation
// =============================================================================
describe('POST /api/goals', () => {

  // IT-GOAL-01: Authenticated user can create a goal
  test('IT-GOAL-01: authenticated user creates goal → 201 with goal data', async () => {
    const { token } = await createAuthUser();

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send(validGoalPayload());

    expect(res.status).toBe(201);
    // createGoal returns an empty 201 body (fire-and-forget pattern)
    expect(res.body).toBeDefined();
  });

  // IT-GOAL-02: Unverified user blocked after first goal
  test('IT-GOAL-02: unverified user cannot create a second goal → 403', async () => {
    const { user, token } = await createAuthUser({ idVerified: false });

    // Create the first goal directly in DB
    await Goal.create({
      user: user._id,
      title: 'First Goal',
      subject: 'Science',
      deadline: new Date(Date.now() + 86400000 * 30),
      status: 'active',
    });

    // Attempt to create a second goal via API
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send(validGoalPayload());

    expect(res.status).toBe(403);
    expect(res.body.requiresVerification).toBe(true);
  });

  // IT-GOAL-03: Missing required fields → 400
  test('IT-GOAL-03: missing deadline returns 400', async () => {
    const { token } = await createAuthUser();

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ goalTitle: 'Missing Deadline Goal', subject: 'Math' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // IT-GOAL-04: Unauthenticated request → 401
  test('IT-GOAL-04: request without token returns 401', async () => {
    const res = await request(app)
      .post('/api/goals')
      .send(validGoalPayload());

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// GET /api/goals/:goalId/difficulty-suggestions
// =============================================================================
describe('GET /api/goals/:goalId/difficulty-suggestions', () => {

  // IT-GOAL-05: Returns suggestions after 3 high-score quiz attempts
  test('IT-GOAL-05: returns escalation suggestion after 3 quiz scores >= 85', async () => {
    const { user, token } = await createAuthUser();

    const goal = await Goal.create({
      user: user._id,
      title: 'Algorithm Study Goal',
      subject: 'Computer Science',
      deadline: new Date(Date.now() + 86400000 * 30),
      topics: [{ name: 'Sorting Algorithms', difficultyLevel: 'easy' }],
    });

    // Seed 3 high-score quiz attempts for this topic
    await ActivityLog.insertMany([
      { user: user._id, goal: goal._id, topicName: 'Sorting Algorithms', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: user._id, goal: goal._id, topicName: 'Sorting Algorithms', activityType: 'quiz_attempt', data: { score: 88 } },
      { user: user._id, goal: goal._id, topicName: 'Sorting Algorithms', activityType: 'quiz_attempt', data: { score: 92 } },
    ]);

    const res = await request(app)
      .get(`/api/goals/${goal._id}/difficulty-suggestions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].direction).toBe('harder');
    expect(res.body.data[0].suggestedDifficulty).toBe('medium');
  });

  // IT-GOAL-06: Returns empty array when fewer than 3 attempts
  test('IT-GOAL-06: returns empty suggestions array with fewer than 3 attempts', async () => {
    const { user, token } = await createAuthUser();

    const goal = await Goal.create({
      user: user._id,
      title: 'Goal With Few Attempts',
      subject: 'Physics',
      deadline: new Date(Date.now() + 86400000 * 30),
      topics: [{ name: 'Newton Laws', difficultyLevel: 'medium' }],
    });

    // Only 2 quiz logs — below threshold
    await ActivityLog.insertMany([
      { user: user._id, goal: goal._id, topicName: 'Newton Laws', activityType: 'quiz_attempt', data: { score: 90 } },
      { user: user._id, goal: goal._id, topicName: 'Newton Laws', activityType: 'quiz_attempt', data: { score: 90 } },
    ]);

    const res = await request(app)
      .get(`/api/goals/${goal._id}/difficulty-suggestions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  // IT-GOAL-07: Returns reduction suggestion after 3 low-score quiz attempts
  test('IT-GOAL-07: returns reduction suggestion after 3 quiz scores <= 45', async () => {
    const { user, token } = await createAuthUser();

    const goal = await Goal.create({
      user: user._id,
      title: 'Hard Goal',
      subject: 'Mathematics',
      deadline: new Date(Date.now() + 86400000 * 30),
      topics: [{ name: 'Calculus', difficultyLevel: 'hard' }],
    });

    await ActivityLog.insertMany([
      { user: user._id, goal: goal._id, topicName: 'Calculus', activityType: 'quiz_attempt', data: { score: 40 } },
      { user: user._id, goal: goal._id, topicName: 'Calculus', activityType: 'quiz_attempt', data: { score: 42 } },
      { user: user._id, goal: goal._id, topicName: 'Calculus', activityType: 'quiz_attempt', data: { score: 38 } },
    ]);

    const res = await request(app)
      .get(`/api/goals/${goal._id}/difficulty-suggestions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].direction).toBe('easier');
  });

  // IT-GOAL-08: Cannot access another user's goal suggestions → 403 or 404
  test('IT-GOAL-08: cannot access difficulty suggestions for another users goal', async () => {
    const { token: tokenA } = await createAuthUser();
    const { user: userB } = await createAuthUser();

    const goalB = await Goal.create({
      user: userB._id,
      title: "User B's Goal",
      subject: 'History',
      deadline: new Date(Date.now() + 86400000 * 30),
    });

    const res = await request(app)
      .get(`/api/goals/${goalB._id}/difficulty-suggestions`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Should be 403 (forbidden) or 404 (not found for this user)
    expect([403, 404]).toContain(res.status);
  });
});
