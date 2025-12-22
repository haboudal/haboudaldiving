function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function getEnvVarBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// Entity IDs for different payment methods
export interface HyperPayEntityIds {
  MADA: string;
  VISA: string;
  MASTER: string;
  APPLEPAY: string;
  STC_PAY: string;
}

export const hyperPayConfig = {
  // Base URL - sandbox vs production
  baseUrl: getEnvVarBool('HYPERPAY_TEST_MODE', true)
    ? 'https://eu-test.oppwa.com'
    : 'https://eu-prod.oppwa.com',

  // API version
  apiVersion: 'v1',

  // Access token for API authentication
  accessToken: getEnvVar('HYPERPAY_ACCESS_TOKEN', 'test_access_token'),

  // Entity IDs for each payment method
  entityIds: {
    MADA: getEnvVar('HYPERPAY_ENTITY_ID_MADA', 'test_entity_mada'),
    VISA: getEnvVar('HYPERPAY_ENTITY_ID_VISA', 'test_entity_visa'),
    MASTER: getEnvVar('HYPERPAY_ENTITY_ID_MASTER', 'test_entity_master'),
    APPLEPAY: getEnvVar('HYPERPAY_ENTITY_ID_APPLEPAY', 'test_entity_applepay'),
    STC_PAY: getEnvVar('HYPERPAY_ENTITY_ID_STC_PAY', 'test_entity_stcpay'),
  } as HyperPayEntityIds,

  // Webhook secret for signature verification
  webhookSecret: getEnvVar('HYPERPAY_WEBHOOK_SECRET', 'test_webhook_secret'),

  // Test mode flag
  testMode: getEnvVarBool('HYPERPAY_TEST_MODE', true),

  // Checkout expiration (15 minutes)
  checkoutExpirationMinutes: 15,

  // Request timeout in ms
  timeout: 30000,
} as const;

export type HyperPayConfig = typeof hyperPayConfig;
