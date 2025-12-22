import { vi } from 'vitest';

// ============================================================================
// MOCK DATABASE
// ============================================================================

interface MockQueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

type QueryHandler = (query: string, params?: unknown[]) => MockQueryResult;

class MockDatabase {
  private handlers: Map<string, QueryHandler> = new Map();
  private defaultRows: unknown[] = [];

  // Set default return value for queries
  setDefaultRows(rows: unknown[]): void {
    this.defaultRows = rows;
  }

  // Add a handler for specific query patterns
  onQuery(pattern: string | RegExp, handler: QueryHandler): void {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.handlers.set(key, handler);
  }

  // Mock query function
  query = vi.fn(async <T = unknown>(
    query: string,
    params?: unknown[]
  ): Promise<MockQueryResult<T>> => {
    // Check for matching handlers
    for (const [pattern, handler] of this.handlers) {
      if (query.includes(pattern) || new RegExp(pattern).test(query)) {
        return handler(query, params) as MockQueryResult<T>;
      }
    }

    // Return default
    return {
      rows: this.defaultRows as T[],
      rowCount: this.defaultRows.length,
    };
  });

  // Reset all mocks and handlers
  reset(): void {
    this.handlers.clear();
    this.defaultRows = [];
    this.query.mockClear();
  }
}

export const mockDb = new MockDatabase();

// ============================================================================
// MOCK REDIS
// ============================================================================

class MockRedis {
  private store: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

  get = vi.fn(async (key: string): Promise<string | null> => {
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.store.delete(key);
      this.expirations.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  });

  set = vi.fn(async (key: string, value: string): Promise<void> => {
    this.store.set(key, value);
  });

  setEx = vi.fn(async (key: string, seconds: number, value: string): Promise<void> => {
    this.store.set(key, value);
    this.expirations.set(key, Date.now() + seconds * 1000);
  });

  del = vi.fn(async (key: string): Promise<void> => {
    this.store.delete(key);
    this.expirations.delete(key);
  });

  exists = vi.fn(async (key: string): Promise<number> => {
    return this.store.has(key) ? 1 : 0;
  });

  expire = vi.fn(async (key: string, seconds: number): Promise<void> => {
    if (this.store.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
    }
  });

  incr = vi.fn(async (key: string): Promise<number> => {
    const current = parseInt(this.store.get(key) || '0', 10);
    const newValue = current + 1;
    this.store.set(key, newValue.toString());
    return newValue;
  });

  reset(): void {
    this.store.clear();
    this.expirations.clear();
    this.get.mockClear();
    this.set.mockClear();
    this.setEx.mockClear();
    this.del.mockClear();
    this.exists.mockClear();
    this.expire.mockClear();
    this.incr.mockClear();
  }
}

export const mockRedis = new MockRedis();

// ============================================================================
// COMMON MOCK DATA
// ============================================================================

export const mockUsers = {
  diver: {
    id: '07b2ad4a-4c5b-4c5c-97d2-f4f3b362cfd4',
    email: 'diver@example.com',
    password_hash: '$2b$10$hashedpassword',
    first_name: 'John',
    last_name: 'Diver',
    role: 'diver',
    status: 'active',
    email_verified: true,
    is_minor: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  admin: {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    email: 'admin@example.com',
    password_hash: '$2b$10$hashedpassword',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    status: 'active',
    email_verified: true,
    is_minor: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  centerOwner: {
    id: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    email: 'owner@center.com',
    password_hash: '$2b$10$hashedpassword',
    first_name: 'Center',
    last_name: 'Owner',
    role: 'center_owner',
    status: 'active',
    email_verified: true,
    is_minor: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
};

export const mockCenter = {
  id: 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  name_en: 'Red Sea Divers',
  name_ar: 'غواصو البحر الأحمر',
  email: 'info@redseadivers.com',
  phone: '+966501234567',
  owner_id: mockUsers.centerOwner.id,
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockDiveSite = {
  id: 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
  name_en: 'Coral Garden',
  name_ar: 'حديقة المرجان',
  site_code: 'CG001',
  region_id: 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
  zone: 'zone_1',
  max_depth: 18,
  daily_diver_quota: 50,
  status: 'active',
};

export const mockTrip = {
  id: 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
  center_id: mockCenter.id,
  site_id: mockDiveSite.id,
  date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  departure_time: '08:00',
  return_time: '14:00',
  max_participants: 10,
  current_participants: 3,
  price_per_diver: 350,
  status: 'published',
  created_at: new Date(),
  updated_at: new Date(),
};
