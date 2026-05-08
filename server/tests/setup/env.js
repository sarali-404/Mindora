// Test environment variables — applied before any test module loads
process.env.JWT_SECRET = 'mindora-test-jwt-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'mindora-test-refresh-secret';
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.EMAIL_FROM = 'test@mindora.test';
