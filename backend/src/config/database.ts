import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  min: config.database.pool.min,
  max: config.database.pool.max,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

export const db = {
  query: async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error', { text: text.substring(0, 100), error });
      throw error;
    }
  },

  getClient: async (): Promise<PoolClient> => {
    return pool.connect();
  },

  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  end: async (): Promise<void> => {
    await pool.end();
    logger.info('Database pool closed');
  },

  healthCheck: async (): Promise<boolean> => {
    try {
      const result = await pool.query('SELECT 1');
      return result.rowCount === 1;
    } catch {
      return false;
    }
  },
};

export { pool };
