import 'dotenv/config';

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function getEnvVarInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return defaultValue;
  }
  return parseInt(value, 10);
}

function getEnvVarBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const config = {
  env: getEnvVar('NODE_ENV', 'development'),
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',

  server: {
    port: getEnvVarInt('PORT', 3001),
    host: getEnvVar('HOST', 'localhost'),
    apiVersion: getEnvVar('API_VERSION', 'v1'),
  },

  database: {
    host: getEnvVar('DB_HOST', 'localhost'),
    port: getEnvVarInt('DB_PORT', 5432),
    name: getEnvVar('DB_NAME', 'diving_platform'),
    user: getEnvVar('DB_USER', 'postgres'),
    password: getEnvVar('DB_PASSWORD', 'postgres'),
    ssl: getEnvVarBool('DB_SSL', false),
    pool: {
      min: getEnvVarInt('DB_POOL_MIN', 2),
      max: getEnvVarInt('DB_POOL_MAX', 10),
    },
  },

  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: getEnvVar('JWT_ACCESS_SECRET', 'dev_access_secret_min_32_chars_here'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET', 'dev_refresh_secret_min_32_chars_here'),
    accessExpiresIn: getEnvVar('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
    accessExpiresInMs: 15 * 60 * 1000,
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  },

  encryption: {
    key: getEnvVar('ENCRYPTION_KEY', 'dev_encryption_key_32_bytes_here'),
    ivLength: getEnvVarInt('ENCRYPTION_IV_LENGTH', 16),
  },

  srsa: {
    apiUrl: getEnvVar('SRSA_API_URL', 'https://api.srsa.gov.sa'),
    apiKey: getEnvVar('SRSA_API_KEY', 'mock_api_key'),
    apiSecret: getEnvVar('SRSA_API_SECRET', 'mock_api_secret'),
    useMock: getEnvVarBool('USE_MOCK_SRSA', true),
  },

  email: {
    mockMode: getEnvVarBool('EMAIL_MOCK_MODE', true),
    host: getEnvVar('EMAIL_HOST', 'smtp.gmail.com'),
    port: getEnvVarInt('EMAIL_PORT', 587),
    secure: getEnvVarBool('EMAIL_SECURE', false),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: getEnvVar('EMAIL_FROM', 'noreply@divingplatform.sa'),
  },

  sms: {
    mockMode: getEnvVarBool('SMS_MOCK_MODE', true),
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: getEnvVar('SMS_FROM_NUMBER', '+966500000000'),
  },

  firebase: {
    mockMode: getEnvVarBool('FIREBASE_MOCK_MODE', true),
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  },

  logging: {
    level: getEnvVar('LOG_LEVEL', 'debug'),
    format: getEnvVar('LOG_FORMAT', 'dev'),
  },

  cors: {
    allowedOrigins: getEnvVar('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(','),
  },

  rateLimit: {
    windowMs: getEnvVarInt('RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: getEnvVarInt('RATE_LIMIT_MAX_REQUESTS', 100),
  },
} as const;

export type Config = typeof config;
