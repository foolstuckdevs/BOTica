import type { APIConfig } from '../types';

/**
 * BOTica Chatbot Configuration
 *
 * Centralizes all configuration for the RAG chatbot system
 * including API endpoints, timeouts, and validation rules
 */

// Environment validation
const requiredEnvVars = ['AI_API_KEY', 'DATABASE_URL'] as const;

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Config] Missing required environment variables:', missing);
    return { valid: false, missing };
  }

  return { valid: true, missing: [] };
}

/**
 * Get validated API configuration
 */
export function getAPIConfig(): APIConfig {
  const validation = validateEnvironment();
  if (!validation.valid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(
        ', ',
      )}`,
    );
  }

  return {
    openai: {
      apiKey: process.env.AI_API_KEY!,
      baseUrl: process.env.AI_API_BASE || 'https://api.openai.com/v1',
      model: process.env.AI_MODEL || 'gpt-4o-mini',
    },
    rxnav: {
      baseUrl: 'https://rxnav.nlm.nih.gov/REST',
      timeout: 10000, // 10 seconds
    },
    medlineplus: {
      baseUrl: 'https://connect.medlineplus.gov',
      timeout: 15000, // 15 seconds
    },
  };
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  const validation = validateEnvironment();
  if (!validation.valid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(
        ', ',
      )}`,
    );
  }

  return {
    connectionString: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  };
}

/**
 * Feature flags and limits
 */
export const CHATBOT_CONFIG = {
  // Query limits
  maxQueryLength: 1000,
  maxSessionsPerUser: 5,
  maxQueriesPerMinute: 10,

  // Response limits
  maxResponseLength: 2000,
  maxInventoryResults: 5,

  // Timeouts (milliseconds)
  agentTimeout: 30000,
  toolTimeout: 15000,
  llmTimeout: 20000,

  // Safety settings
  enableGuardrails: true,
  allowPrescriptionInfo: false, // Only with prescription context
  logQueries: process.env.NODE_ENV === 'development',

  // Cache settings
  cacheResponses: process.env.NODE_ENV === 'production',
  cacheTimeout: 300000, // 5 minutes

  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,
} as const;

/**
 * Get environment-specific settings
 */
export function getEnvironmentConfig() {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  return {
    isDevelopment: isDev,
    isProduction: isProd,
    logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    enableVerboseLogging: isDev || process.env.VERBOSE_LOGS === 'true',
    enableHealthChecks: true,
    enableMetrics: isProd,
  };
}

/**
 * Validate configuration on startup
 */
export function validateConfig(): boolean {
  try {
    const apiConfig = getAPIConfig();
    getDatabaseConfig(); // Validate database config
    const envConfig = getEnvironmentConfig();

    console.log('[Config] Configuration validated successfully');
    console.log(
      `[Config] Environment: ${
        envConfig.isDevelopment ? 'Development' : 'Production'
      }`,
    );
    console.log(`[Config] AI Model: ${apiConfig.openai.model}`);
    console.log(
      `[Config] Features: Guardrails=${CHATBOT_CONFIG.enableGuardrails}, Cache=${CHATBOT_CONFIG.cacheResponses}`,
    );

    return true;
  } catch (error) {
    console.error('[Config] Configuration validation failed:', error);
    return false;
  }
}

// Export configuration for external use
export const config = {
  api: getAPIConfig,
  database: getDatabaseConfig,
  environment: getEnvironmentConfig,
  chatbot: CHATBOT_CONFIG,
  validate: validateConfig,
  validateEnvironment,
};
