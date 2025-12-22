import { Pool, PoolClient } from 'pg';

// Test database connection pool
let testPool: Pool | null = null;
let testClient: PoolClient | null = null;

// Get or create test database pool
export const getTestPool = (): Pool => {
  if (!testPool) {
    testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'diving_platform_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 5,
    });
  }
  return testPool;
};

// Start a transaction for test isolation
export const beginTransaction = async (): Promise<PoolClient> => {
  const pool = getTestPool();
  testClient = await pool.connect();
  await testClient.query('BEGIN');
  return testClient;
};

// Rollback transaction after test
export const rollbackTransaction = async (): Promise<void> => {
  if (testClient) {
    await testClient.query('ROLLBACK');
    testClient.release();
    testClient = null;
  }
};

// Close the test pool
export const closeTestPool = async (): Promise<void> => {
  if (testClient) {
    testClient.release();
    testClient = null;
  }
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
};

// Execute a query on the test database
export const query = async <T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> => {
  const client = testClient || getTestPool();
  const result = await client.query(sql, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount || 0,
  };
};

// Seed test data
export const seedTestData = async (): Promise<void> => {
  const client = testClient || getTestPool();

  // Create test user
  await client.query(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified)
    VALUES
      ('07b2ad4a-4c5b-4c5c-97d2-f4f3b362cfd4', 'test.diver@example.com', '$2b$10$test', 'Test', 'Diver', 'diver', 'active', true),
      ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'test.admin@example.com', '$2b$10$test', 'Test', 'Admin', 'admin', 'active', true),
      ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'test.owner@example.com', '$2b$10$test', 'Test', 'Owner', 'center_owner', 'active', true)
    ON CONFLICT (email) DO NOTHING
  `);

  // Create test region
  await client.query(`
    INSERT INTO regions (id, name_en, name_ar, country_code)
    VALUES ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Red Sea Coast', 'ساحل البحر الأحمر', 'SA')
    ON CONFLICT DO NOTHING
  `);

  // Create test dive site
  await client.query(`
    INSERT INTO dive_sites (id, name_en, name_ar, site_code, region_id, zone, max_depth, daily_diver_quota, status)
    VALUES ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Coral Garden', 'حديقة المرجان', 'CG001', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'zone_1', 18, 50, 'active')
    ON CONFLICT DO NOTHING
  `);

  // Create test diving center
  await client.query(`
    INSERT INTO diving_centers (id, name_en, name_ar, email, phone, owner_id, status)
    VALUES ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Test Diving Center', 'مركز غوص تجريبي', 'center@test.com', '+966501234567', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'active')
    ON CONFLICT DO NOTHING
  `);
};

// Clean test data
export const cleanTestData = async (): Promise<void> => {
  const client = testClient || getTestPool();

  // Delete in reverse order of foreign key dependencies
  await client.query("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test.%')");
  await client.query("DELETE FROM trip_bookings WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test.%')");
  await client.query("DELETE FROM trips WHERE center_id IN (SELECT id FROM diving_centers WHERE email LIKE '%@test.com')");
  await client.query("DELETE FROM diving_centers WHERE email LIKE '%@test.com'");
  await client.query("DELETE FROM users WHERE email LIKE 'test.%'");
};

// Reset test database (truncate all tables)
export const resetTestDatabase = async (): Promise<void> => {
  const client = testClient || getTestPool();

  // Get all table names
  const result = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  `);

  // Truncate all tables with CASCADE
  for (const row of result.rows) {
    await client.query(`TRUNCATE TABLE ${row.tablename} CASCADE`);
  }
};
