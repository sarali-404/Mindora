const express = require('express');
const cookieParser = require('cookie-parser');

/**
 * Create a minimal Express application for integration testing.
 * Only mounts the routes required by tests — no Socket.io, no Discord, no DB connection.
 * DB connection is managed separately by tests/setup/db.js.
 */
function createTestApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount only the routes needed for testing
  app.use('/api/auth', require('../../src/routes/authRoutes'));
  app.use('/api/goals', require('../../src/routes/goalRoutes'));
  app.use('/api/gamification', require('../../src/routes/gamificationRoutes'));

  return app;
}

module.exports = { createTestApp };
