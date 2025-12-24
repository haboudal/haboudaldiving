import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db } from '../config/database';
import { logger } from '../utils/logger';

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await db.query<Migration>('SELECT name FROM migrations ORDER BY id');
  return result.rows.map((row) => row.name);
}

async function getMigrationFiles(): Promise<string[]> {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files;
}

async function runMigration(filename: string): Promise<void> {
  const filepath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  await db.transaction(async (client) => {
    // Execute migration SQL
    await client.query(sql);

    // Record migration
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [filename]
    );
  });
}

async function migrate(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    await ensureMigrationsTable();

    const executed = await getExecutedMigrations();
    const files = await getMigrationFiles();

    const pending = files.filter((file) => !executed.includes(file));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Found ${pending.length} pending migration(s)`);

    for (const file of pending) {
      logger.info(`Running migration: ${file}`);
      await runMigration(file);
      logger.info(`Completed: ${file}`);
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  } finally {
    await db.end();
  }
}

async function rollback(): Promise<void> {
  try {
    logger.info('Rolling back last migration...');

    const executed = await getExecutedMigrations();

    if (executed.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const lastMigration = executed[executed.length - 1];
    const rollbackFile = lastMigration.replace('.sql', '.down.sql');
    const rollbackPath = path.join(__dirname, 'migrations', rollbackFile);

    if (!fs.existsSync(rollbackPath)) {
      logger.error(`Rollback file not found: ${rollbackFile}`);
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }

    const sql = fs.readFileSync(rollbackPath, 'utf8');

    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
    });

    logger.info(`Rolled back: ${lastMigration}`);
  } catch (error) {
    logger.error('Rollback failed', { error });
    throw error;
  } finally {
    await db.end();
  }
}

// CLI
const command = process.argv[2];

if (command === 'rollback') {
  rollback().catch(() => process.exit(1));
} else {
  migrate().catch(() => process.exit(1));
}
