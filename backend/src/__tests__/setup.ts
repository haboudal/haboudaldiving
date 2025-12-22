import { beforeAll, afterAll, beforeEach, afterEach, vi, expect } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_bytes_xx';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'diving_platform_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.EMAIL_MOCK_MODE = 'true';
process.env.SMS_MOCK_MODE = 'true';
process.env.FIREBASE_MOCK_MODE = 'true';
process.env.USE_MOCK_SRSA = 'true';

// Custom matcher: toBeOneOf
expect.extend({
  toBeOneOf(received: number, expected: number[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be one of ${expected.join(', ')}`
          : `Expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});

// Global test hooks
beforeAll(async () => {
  // Setup that runs once before all tests
});

afterAll(async () => {
  // Cleanup that runs once after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});
