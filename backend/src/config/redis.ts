import { createClient, RedisClientType } from 'redis';
import { config } from './index';
import { logger } from '../utils/logger';

let client: RedisClientType | null = null;

export const redis = {
  connect: async (): Promise<void> => {
    if (client) return;

    client = createClient({
      url: config.redis.url,
      password: config.redis.password,
    });

    client.on('error', (err) => logger.error('Redis error', { error: err.message }));
    client.on('connect', () => logger.info('Redis connected'));

    await client.connect();
  },

  disconnect: async (): Promise<void> => {
    if (client) {
      await client.quit();
      client = null;
    }
  },

  get: async (key: string): Promise<string | null> => {
    if (!client) throw new Error('Redis not connected');
    return client.get(key);
  },

  set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    if (!client) throw new Error('Redis not connected');
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  },

  setEx: async (key: string, ttlSeconds: number, value: string): Promise<void> => {
    if (!client) throw new Error('Redis not connected');
    await client.setEx(key, ttlSeconds, value);
  },

  del: async (...keys: string[]): Promise<number> => {
    if (!client) throw new Error('Redis not connected');
    return client.del(keys);
  },

  keys: async (pattern: string): Promise<string[]> => {
    if (!client) throw new Error('Redis not connected');
    return client.keys(pattern);
  },

  exists: async (key: string): Promise<boolean> => {
    if (!client) throw new Error('Redis not connected');
    return (await client.exists(key)) === 1;
  },

  healthCheck: async (): Promise<boolean> => {
    if (!client) return false;
    try {
      return (await client.ping()) === 'PONG';
    } catch {
      return false;
    }
  },
};
