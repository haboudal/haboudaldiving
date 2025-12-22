import { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TEST USER DATA
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'diver' | 'instructor' | 'center_owner' | 'admin';
  isMinor: boolean;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: uuidv4(),
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'diver',
  isMinor: false,
  ...overrides,
});

export const createTestAdmin = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({ role: 'admin', ...overrides });

export const createTestInstructor = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({ role: 'instructor', ...overrides });

export const createTestCenterOwner = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({ role: 'center_owner', ...overrides });

// ============================================================================
// JWT TOKEN GENERATION
// ============================================================================

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_at_least_32_chars';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_at_least_32_chars';

export const generateAccessToken = (user: TestUser): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      isMinor: user.isMinor,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

export const generateRefreshToken = (user: TestUser): string => {
  return jwt.sign(
    { userId: user.id, tokenVersion: 1 },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

export const generateExpiredToken = (user: TestUser): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      isMinor: user.isMinor,
    },
    ACCESS_SECRET,
    { expiresIn: '-1s' }
  );
};

// ============================================================================
// API REQUEST HELPERS
// ============================================================================

export class ApiTestClient {
  private app: Express;
  private token: string | null = null;

  constructor(app: Express) {
    this.app = app;
  }

  setToken(token: string): this {
    this.token = token;
    return this;
  }

  clearToken(): this {
    this.token = null;
    return this;
  }

  authenticateAs(user: TestUser): this {
    this.token = generateAccessToken(user);
    return this;
  }

  private getRequest(method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string) {
    const req = request(this.app)[method](path);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    return req;
  }

  get(path: string) {
    return this.getRequest('get', path);
  }

  post(path: string) {
    return this.getRequest('post', path);
  }

  patch(path: string) {
    return this.getRequest('patch', path);
  }

  put(path: string) {
    return this.getRequest('put', path);
  }

  delete(path: string) {
    return this.getRequest('delete', path);
  }
}

export const createApiClient = (app: Express): ApiTestClient => {
  return new ApiTestClient(app);
};

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

export const generateUUID = (): string => uuidv4();

export const generateEmail = (prefix = 'test'): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

export const generatePhoneNumber = (): string =>
  `+966${Math.floor(Math.random() * 900000000 + 100000000)}`;

export interface TestCenter {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  licenseNumber: string;
  ownerId: string;
}

export const createTestCenter = (ownerId: string, overrides: Partial<TestCenter> = {}): TestCenter => ({
  id: uuidv4(),
  name: `Test Diving Center ${Date.now()}`,
  nameAr: 'مركز غوص تجريبي',
  email: generateEmail('center'),
  phone: generatePhoneNumber(),
  licenseNumber: `LIC-${Date.now()}`,
  ownerId,
  ...overrides,
});

export interface TestTrip {
  id: string;
  centerId: string;
  siteId: string;
  date: string;
  departureTime: string;
  returnTime: string;
  maxParticipants: number;
  pricePerDiver: number;
}

export const createTestTrip = (centerId: string, overrides: Partial<TestTrip> = {}): TestTrip => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    id: uuidv4(),
    centerId,
    siteId: uuidv4(),
    date: tomorrow.toISOString().split('T')[0],
    departureTime: '08:00',
    returnTime: '14:00',
    maxParticipants: 10,
    pricePerDiver: 350,
    ...overrides,
  };
};

export interface TestBooking {
  id: string;
  tripId: string;
  userId: string;
  status: string;
  totalPrice: number;
}

export const createTestBooking = (
  tripId: string,
  userId: string,
  overrides: Partial<TestBooking> = {}
): TestBooking => ({
  id: uuidv4(),
  tripId,
  userId,
  status: 'pending',
  totalPrice: 350,
  ...overrides,
});

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export const expectValidUUID = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const expectValidDate = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return !isNaN(Date.parse(value));
};

export const expectPaginatedResponse = (body: unknown): boolean => {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  return (
    'data' in obj &&
    'pagination' in obj &&
    typeof obj.pagination === 'object' &&
    obj.pagination !== null &&
    'page' in (obj.pagination as Record<string, unknown>) &&
    'limit' in (obj.pagination as Record<string, unknown>) &&
    'total' in (obj.pagination as Record<string, unknown>)
  );
};

// ============================================================================
// WAIT UTILITIES
// ============================================================================

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await wait(interval);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};
