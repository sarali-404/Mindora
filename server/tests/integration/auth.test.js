/**
 * Integration Tests: Authentication API
 *
 * Tests the full HTTP request → controller → DB → response cycle.
 * Uses an in-memory MongoDB and mocks external services (email, gamification).
 *
 * Endpoints tested:
 *   POST /api/auth/create-account  (IT-01, IT-02)
 *   POST /api/auth/verify-otp      (IT-03, IT-04)
 *   POST /api/auth/login            (IT-05, IT-06, IT-07)
 */

const request = require('supertest');
const db = require('../setup/db');
const { createTestApp } = require('../setup/app');
const User = require('../../src/models/User');

// ── Mock external services ────────────────────────────────────────────────────
// Prevent real emails from being sent during tests.
// generateOTP is mocked to return a fixed value so tests can predict the OTP.
jest.mock('../../src/services/emailService', () => ({
  generateOTP: jest.fn(() => '123456'),
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetOTP: jest.fn().mockResolvedValue({ success: true }),
  verifyEmailConnection: jest.fn().mockResolvedValue(true),
}));

// Prevent gamification side effects (achievement evaluation, notifications)
// during auth tests.
jest.mock('../../src/services/gamificationService', () => ({
  initializeGameProfile: jest.fn().mockResolvedValue({}),
  evaluateAchievements: jest.fn().mockResolvedValue([]),
  addXP: jest.fn().mockResolvedValue({ newXP: 25, xpGained: 25, leveledUp: false, newLevel: 'Bronze' }),
}));

// ── Test setup ────────────────────────────────────────────────────────────────
let app;

beforeAll(async () => {
  await db.connect();
  app = createTestApp();
});

afterAll(async () => await db.close());
afterEach(async () => await db.clear());

// Suppress console noise from controllers
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Create a user via the API and return the response body */
async function registerUser(email = 'testuser@example.com', password = 'Password123!') {
  return request(app)
    .post('/api/auth/create-account')
    .send({ email, password, confirmPassword: password });
}

/** Create a fully-verified user directly in the DB, bypassing OTP */
async function createVerifiedUser(email = 'verified@example.com', password = 'Password123!') {
  // Create via API so the password gets properly hashed by the pre-save hook
  const res = await registerUser(email, password);
  // Mark as fully verified with registrationStep 4 (passes all login checks)
  await User.findByIdAndUpdate(res.body.data.userId, {
    isEmailVerified: true,
    verificationStatus: 'email_verified',
    registrationStep: 4,
  });
  return { userId: res.body.data.userId, email, password };
}

// =============================================================================
// POST /api/auth/create-account
// =============================================================================
describe('POST /api/auth/create-account', () => {

  // IT-01: Valid registration
  test('IT-01: valid data returns 201 with requiresOTP: true', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresOTP).toBe(true);
    expect(res.body.data.email).toBe('testuser@example.com');
    expect(res.body.data.userId).toBeDefined();
  });

  // IT-02: Missing password
  test('IT-02: missing password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/create-account')
      .send({ email: 'nopw@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // IT-03: Password mismatch
  test('IT-03: mismatched confirmPassword returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/create-account')
      .send({ email: 'mismatch@example.com', password: 'Password123!', confirmPassword: 'Different123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // IT-04: Duplicate fully-verified email returns 400
  test('IT-04: duplicate verified email returns 400 with appropriate message', async () => {
    // Create a fully verified user
    await User.create({
      username: 'alreadyhere',
      email: 'duplicate@example.com',
      password: 'Password123!',
      isEmailVerified: true,
      verificationStatus: 'email_verified',
      registrationStep: 4,
    });

    const res = await registerUser('duplicate@example.com');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // IT-05: Duplicate unverified email → resends OTP instead of error
  test('IT-05: duplicate unverified email resends OTP (returns 200 with requiresOTP)', async () => {
    // Register once (creates unverified user)
    await registerUser('resend@example.com');

    // Register again with same email
    const res = await registerUser('resend@example.com');

    expect(res.status).toBe(200);
    expect(res.body.data.requiresOTP).toBe(true);
  });
});

// =============================================================================
// POST /api/auth/verify-otp
// =============================================================================
describe('POST /api/auth/verify-otp', () => {

  // IT-06: Correct OTP verifies email
  test('IT-06: correct OTP returns 200 and advances verification status', async () => {
    const { body } = await registerUser('otp@example.com');
    const { userId } = body.data;

    // The mock returns '123456' for generateOTP, which is stored in emailOTP.code
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ userId, otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm DB state
    const user = await User.findById(userId);
    expect(user.isEmailVerified).toBe(true);
    expect(user.verificationStatus).toBe('email_verified');
  });

  // IT-07: Wrong OTP returns 400
  test('IT-07: wrong OTP returns 400', async () => {
    const { body } = await registerUser('wrongotp@example.com');
    const { userId } = body.data;

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ userId, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // IT-08: Expired OTP returns 400
  test('IT-08: expired OTP returns 400', async () => {
    const user = await User.create({
      username: 'expiredotp_user',
      email: 'expiredotp@example.com',
      password: 'Password123!',
      verificationStatus: 'unverified',
      isEmailVerified: false,
      emailOTP: {
        code: '999999',
        expiresAt: new Date(Date.now() - 60000), // expired 1 minute ago
      },
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ userId: user._id.toString(), otp: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // IT-09: Non-existent userId returns 404
  test('IT-09: non-existent userId returns 404', async () => {
    const fakeId = new (require('mongoose').Types.ObjectId)();

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ userId: fakeId.toString(), otp: '123456' });

    expect(res.status).toBe(404);
  });
});

// =============================================================================
// POST /api/auth/login
// =============================================================================
describe('POST /api/auth/login', () => {

  // IT-10: Valid credentials return 200 and token
  test('IT-10: valid credentials return 200 with token', async () => {
    await createVerifiedUser('login@example.com', 'Password123!');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'login@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('login@example.com');
  });

  // IT-11: Wrong password returns 401
  test('IT-11: wrong password returns 401', async () => {
    await createVerifiedUser('badpw@example.com', 'Password123!');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'badpw@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // IT-12: Non-existent user returns 401
  test('IT-12: non-existent email returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // IT-13: Unverified user is redirected to OTP flow (not blocked with error)
  test('IT-13: unverified user login returns 200 with requiresOTP: true', async () => {
    await registerUser('unverified@example.com', 'Password123!');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'unverified@example.com', password: 'Password123!' });

    // Controller returns 200 with requiresOTP, not a hard error
    expect(res.status).toBe(200);
    expect(res.body.data.requiresOTP).toBe(true);
  });

  // IT-14 & IT-15: 5 wrong passwords lock the account
  test('IT-14: account locks after 5 consecutive wrong password attempts', async () => {
    await createVerifiedUser('lockme@example.com', 'CorrectPass123!');

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'lockme@example.com', password: 'WrongPassword!' });
    }

    const user = await User.findOne({ email: 'lockme@example.com' });
    expect(user.isLocked).toBe(true);
  });

  test('IT-15: locked account returns 423 on next login attempt', async () => {
    await createVerifiedUser('locked2@example.com', 'CorrectPass123!');

    // Lock the account via 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'locked2@example.com', password: 'WrongPassword!' });
    }

    // Sixth attempt — account already locked
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'locked2@example.com', password: 'CorrectPass123!' });

    expect(res.status).toBe(423);
    expect(res.body.success).toBe(false);
  });
});
