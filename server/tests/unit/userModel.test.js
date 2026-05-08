/**
 * Unit Tests: User model — Account Lockout
 *
 * Tests the isLocked virtual property and incLoginAttempts / resetLoginAttempts
 * instance methods defined in server/src/models/User.js.
 *
 * Lockout logic: loginAttempts + 1 >= 5 triggers lockUntil (2-hour lock).
 * isLocked virtual returns true when lockUntil > Date.now().
 */

const db = require('../setup/db');
const User = require('../../src/models/User');

describe('User Model — Account Lockout', () => {
  beforeAll(async () => await db.connect());
  afterAll(async () => await db.close());
  afterEach(async () => await User.deleteMany({}));

  function makeUser(suffix = '') {
    const ts = Date.now() + suffix;
    return User.create({
      username: `locktest${ts}`,
      email: `locktest${ts}@example.com`,
      password: 'TestPassword123!',
    });
  }

  // ------------------------------------------------------------------
  // UT-LOCK-01: New account is NOT locked
  // ------------------------------------------------------------------
  test('UT-LOCK-01: newly created account is not locked', async () => {
    const user = await makeUser();
    expect(user.isLocked).toBe(false);
  });

  // ------------------------------------------------------------------
  // UT-LOCK-02: Account locks after 5 failed login attempts
  // ------------------------------------------------------------------
  test('UT-LOCK-02: account is locked after 5 calls to incLoginAttempts()', async () => {
    let user = await makeUser('_02');

    for (let i = 0; i < 5; i++) {
      await user.incLoginAttempts();
      // Reload from DB to get updated loginAttempts / lockUntil
      user = await User.findById(user._id);
    }

    expect(user.isLocked).toBe(true);
  });

  // ------------------------------------------------------------------
  // UT-LOCK-03: Account is NOT locked after only 4 failed attempts
  // ------------------------------------------------------------------
  test('UT-LOCK-03: account is NOT locked after 4 calls to incLoginAttempts()', async () => {
    let user = await makeUser('_03');

    for (let i = 0; i < 4; i++) {
      await user.incLoginAttempts();
      user = await User.findById(user._id);
    }

    expect(user.isLocked).toBe(false);
  });

  // ------------------------------------------------------------------
  // UT-LOCK-04: resetLoginAttempts() clears the lock
  // ------------------------------------------------------------------
  test('UT-LOCK-04: resetLoginAttempts() unlocks a locked account', async () => {
    let user = await makeUser('_04');

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await user.incLoginAttempts();
      user = await User.findById(user._id);
    }
    user = await User.findById(user._id);
    expect(user.isLocked).toBe(true);

    // Reset
    await user.resetLoginAttempts();
    user = await User.findById(user._id);

    expect(user.isLocked).toBe(false);
    expect(user.loginAttempts).toBe(0); // reset to default
  });

  // ------------------------------------------------------------------
  // UT-LOCK-05: loginAttempts count increments correctly
  // ------------------------------------------------------------------
  test('UT-LOCK-05: loginAttempts count increments from 0 to 3 after 3 failures', async () => {
    let user = await makeUser('_05');

    for (let i = 0; i < 3; i++) {
      await user.incLoginAttempts();
    }
    user = await User.findById(user._id);

    expect(user.loginAttempts).toBe(3);
  });

  // ------------------------------------------------------------------
  // UT-LOCK-06: lockUntil is set when account becomes locked
  // ------------------------------------------------------------------
  test('UT-LOCK-06: lockUntil is set to a future date when account locks', async () => {
    let user = await makeUser('_06');

    for (let i = 0; i < 5; i++) {
      await user.incLoginAttempts();
      user = await User.findById(user._id);
    }
    user = await User.findById(user._id);

    expect(user.lockUntil).toBeDefined();
    expect(user.lockUntil.getTime()).toBeGreaterThan(Date.now());
  });
});
