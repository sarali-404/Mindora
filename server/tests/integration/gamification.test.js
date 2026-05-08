/**
 * Integration Tests: Gamification API
 *
 * Tests the gamification endpoints using real DB (in-memory) and real service logic.
 * gamificationService is NOT mocked here — we test the actual XP/level behavior
 * end-to-end through HTTP.
 *
 * Endpoints tested:
 *   GET  /api/gamification/level-info     (IT-GAM-01, IT-GAM-02)
 *   GET  /api/gamification/profile        (IT-GAM-03)
 *   GET  /api/gamification/activity-stats (IT-GAM-04)
 */

const request = require('supertest');
const db = require('../setup/db');
const { createTestApp } = require('../setup/app');
const User = require('../../src/models/User');
const UserGameProfile = require('../../src/models/UserGameProfile');
const gamificationService = require('../../src/services/gamificationService');
const { generateToken } = require('../../src/utils/tokenUtils');

// ── Mock only external services that are not under test ───────────────────────
jest.mock('../../src/services/emailService', () => ({
  generateOTP: jest.fn(() => '123456'),
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Notification service creates Notification documents; mock it to avoid
// requiring the Notification model to be fully seeded.
jest.mock('../../src/services/notificationService', () => ({
  notifyIfPreferred: jest.fn().mockResolvedValue(null),
  createNotification: jest.fn().mockResolvedValue(null),
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

// ── Helper ────────────────────────────────────────────────────────────────────
async function createAuthUser() {
  const user = await User.create({
    username: `gamtest_${Date.now()}`,
    email: `gamtest_${Date.now()}@example.com`,
    password: 'Password123!',
    isEmailVerified: true,
    verificationStatus: 'email_verified',
    registrationStep: 4,
    isActive: true,
  });
  const token = generateToken(user._id, 'user');
  return { user, token };
}

// =============================================================================
// GET /api/gamification/level-info
// =============================================================================
describe('GET /api/gamification/level-info', () => {

  // IT-GAM-01: Returns level info for a new user (0 XP, Bronze)
  test('IT-GAM-01: returns Bronze level and 0 XP for a new user', async () => {
    const { user, token } = await createAuthUser();
    await gamificationService.initializeGameProfile(user._id);

    const res = await request(app)
      .get('/api/gamification/level-info')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(res.body.currentLevel).toBe('Bronze');
    expect(typeof res.body.totalXP).toBe('number');
    expect(res.body.totalXP).toBe(0);
  });

  // IT-GAM-02: Returns Silver level after 5000 XP is added
  test('IT-GAM-02: returns Silver level after 5000 XP is awarded', async () => {
    const { user, token } = await createAuthUser();
    // Award 5000 XP directly via service (bypasses HTTP for speed)
    await gamificationService.addXP(user._id, 'test_award', 5000);

    const res = await request(app)
      .get('/api/gamification/level-info')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.currentLevel).toBe('Silver');
    expect(res.body.totalXP).toBe(5000);
  });

  // IT-GAM-03: Returns Gold level after 15000 XP
  test('IT-GAM-03: returns Gold level after 15000 XP is awarded', async () => {
    const { user, token } = await createAuthUser();
    await gamificationService.addXP(user._id, 'test_award', 15000);

    const res = await request(app)
      .get('/api/gamification/level-info')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.currentLevel).toBe('Gold');
  });

  // IT-GAM-04: Unauthenticated request returns 401
  test('IT-GAM-04: unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/gamification/level-info');
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// GET /api/gamification/profile
// =============================================================================
describe('GET /api/gamification/profile', () => {

  // IT-GAM-05: Returns profile with expected shape
  test('IT-GAM-05: returns game profile with XP, level, streak fields', async () => {
    const { user, token } = await createAuthUser();
    await gamificationService.initializeGameProfile(user._id);

    const res = await request(app)
      .get('/api/gamification/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const profile = res.body;
    expect(profile).toHaveProperty('totalXP');
    expect(profile).toHaveProperty('currentLevel');
    expect(profile).toHaveProperty('currentStreak');
    expect(profile).toHaveProperty('achievementsEarned');
  });
});

// =============================================================================
// GET /api/gamification/activity-stats
// =============================================================================
describe('GET /api/gamification/activity-stats', () => {

  // IT-GAM-06: Returns stats object with expected numeric fields
  test('IT-GAM-06: returns activity stats with quizzesCompleted and quizAvgScore', async () => {
    const { user, token } = await createAuthUser();
    await gamificationService.initializeGameProfile(user._id);

    const res = await request(app)
      .get('/api/gamification/activity-stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const stats = res.body.activityStats;
    expect(stats).toHaveProperty('quizzesCompleted');
    expect(stats).toHaveProperty('quizAvgScore');
    expect(stats).toHaveProperty('goalsCreated');
  });
});
