module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup/env.js'],
  testTimeout: 30000,
  forceExit: true,
  verbose: true,
};
