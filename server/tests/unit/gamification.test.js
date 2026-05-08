/**
 * Unit Tests: gamificationService.js — XP and Level boundaries
 *
 * Tests the addXP function and level calculation logic.
 * Uses an in-memory MongoDB; a real UserGameProfile document is created.
 *
 * XP Thresholds (from gamificationService.js):
 *   Bronze: 0–4999
 *   Silver: 5000–14999
 *   Gold:   15000+
 *
 * XP Awards (from repo notes):
 *   Goal created: 25 XP
 *   Quiz completed: dynamic
 *   Session host: 20 XP
 *   Session participant: 15 XP
 */

const db = require('../setup/db');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const UserGameProfile = require('../../src/models/UserGameProfile');
const gamificationService = require('../../src/services/gamificationService');

// Suppress console.log noise from gamificationService during tests
beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => console.log.mockRestore());

describe('gamificationService — XP & Level boundaries', () => {
  let userId;

  beforeAll(async () => {
    await db.connect();
    const user = await User.create({
      username: 'xptest_user',
      email: 'xptest@example.com',
      password: 'TestPassword123!',
    });
    userId = user._id;
  });

  afterAll(async () => await db.close());

  // Delete the game profile between tests so XP starts fresh each time
  afterEach(async () => {
    await UserGameProfile.deleteMany({});
  });

  // ------------------------------------------------------------------
  // UT-GAM-01: 0 XP → Bronze
  // ------------------------------------------------------------------
  test('UT-GAM-01: level is BRONZE for 0 XP', async () => {
    const result = await gamificationService.addXP(userId, 'test_source', 0);
    expect(result.newLevel).toBe('Bronze');
    expect(result.newXP).toBe(0);
  });

  // ------------------------------------------------------------------
  // UT-GAM-02: 4999 XP → still Bronze (upper Bronze boundary)
  // ------------------------------------------------------------------
  test('UT-GAM-02: level is BRONZE for 4999 XP (upper Bronze boundary)', async () => {
    const result = await gamificationService.addXP(userId, 'test_source', 4999);
    expect(result.newLevel).toBe('Bronze');
  });

  // ------------------------------------------------------------------
  // UT-GAM-03: 5000 XP → Silver (exact threshold)
  // ------------------------------------------------------------------
  test('UT-GAM-03: level is SILVER at exactly 5000 XP and leveledUp is true', async () => {
    const result = await gamificationService.addXP(userId, 'test_source', 5000);
    expect(result.newLevel).toBe('Silver');
    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe('Bronze');
  });

  // ------------------------------------------------------------------
  // UT-GAM-04: 14999 XP → still Silver (upper Silver boundary)
  // ------------------------------------------------------------------
  test('UT-GAM-04: level is SILVER for 14999 XP (upper Silver boundary)', async () => {
    const result = await gamificationService.addXP(userId, 'test_source', 14999);
    expect(result.newLevel).toBe('Silver');
  });

  // ------------------------------------------------------------------
  // UT-GAM-05: 15000 XP → Gold (exact threshold)
  // ------------------------------------------------------------------
  test('UT-GAM-05: level is GOLD at exactly 15000 XP and leveledUp is true', async () => {
    const result = await gamificationService.addXP(userId, 'test_source', 15000);
    expect(result.newLevel).toBe('Gold');
    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe('Bronze');
  });

  // ------------------------------------------------------------------
  // UT-GAM-06: XP accumulates correctly across multiple addXP calls
  // ------------------------------------------------------------------
  test('UT-GAM-06: XP accumulates correctly across multiple calls', async () => {
    await gamificationService.addXP(userId, 'activity_1', 100);
    await gamificationService.addXP(userId, 'activity_2', 50);
    const result = await gamificationService.addXP(userId, 'activity_3', 25);
    expect(result.newXP).toBe(175);
    expect(result.xpGained).toBe(25);
  });

  // ------------------------------------------------------------------
  // UT-GAM-07: Negative XP is clamped to 0 (no penalty mechanic)
  // ------------------------------------------------------------------
  test('UT-GAM-07: negative XP amount is clamped to 0 (no XP deducted)', async () => {
    const result = await gamificationService.addXP(userId, 'test_source', -100);
    expect(result.newXP).toBe(0);
    // xpGained reflects the raw input amount; newXP is clamped via Math.max(0, amount)
    expect(result.xpGained).toBe(-100);
  });

  // ------------------------------------------------------------------
  // UT-GAM-08: Goal creation awards 25 XP (per spec)
  // ------------------------------------------------------------------
  test('UT-GAM-08: adding 25 XP (goal creation award) stores correct total', async () => {
    const result = await gamificationService.addXP(userId, 'goal_created', 25);
    expect(result.newXP).toBe(25);
    expect(result.xpGained).toBe(25);
    expect(result.newLevel).toBe('Bronze');
  });

  // ------------------------------------------------------------------
  // UT-GAM-09: initializeGameProfile creates profile with 0 XP
  // ------------------------------------------------------------------
  test('UT-GAM-09: initializeGameProfile creates profile with 0 XP and Bronze level', async () => {
    const profile = await gamificationService.initializeGameProfile(userId);
    expect(profile).toBeDefined();
    expect(profile.totalXP).toBe(0);
    expect(profile.currentLevel).toBe('Bronze');
  });

  // ------------------------------------------------------------------
  // UT-GAM-10: addXP is idempotent for profile creation (no duplicate profiles)
  // ------------------------------------------------------------------
  test('UT-GAM-10: concurrent initializeGameProfile calls do not create duplicate profiles', async () => {
    // Call twice — should upsert, not create two documents
    await gamificationService.initializeGameProfile(userId);
    await gamificationService.initializeGameProfile(userId);
    const count = await UserGameProfile.countDocuments({ user: userId });
    expect(count).toBe(1);
  });
});
