const REQUIRED_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRATION',
  'JWT_REFRESH_EXPIRATION',
] as const;

const PRODUCTION_REQUIRED_VARIABLES = [
  'CORS_ORIGIN',
  'BACKEND_URL',
  'YERIA_PRIVATE_KEY',
  'YERIA_PUBLIC_KEY',
] as const;

const PLACEHOLDER_VALUES = new Set([
  '',
  'changeme',
  'change-me',
  'secret',
  'password',
  'change_me_postgres_password',
  'change_me_pgadmin_password',
  'votre_cle_secrete_access',
  'votre_cle_secrete_refresh',
]);

const NUMERIC_VARIABLES = {
  PLATFORM_COMMISSION_RATE: {
    defaultValue: 0.15,
    min: 0,
    max: 1,
  },
  COLLECTION_AUTO_VALIDATION_HOURS: {
    defaultValue: 48,
    min: 1,
    max: 720,
  },
  COLLECTOR_INVOICE_DUE_DAYS: {
    defaultValue: 15,
    min: 0,
    max: 365,
  },
} as const;

function readEnv(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const isProduction = readEnv(config, 'NODE_ENV') === 'production';
  const missing = REQUIRED_VARIABLES.filter((key) => !readEnv(config, key));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  const missingInProduction = isProduction
    ? PRODUCTION_REQUIRED_VARIABLES.filter((key) => !readEnv(config, key))
    : [];

  if (missingInProduction.length > 0) {
    throw new Error(
      `Missing production environment variable(s): ${missingInProduction.join(', ')}`,
    );
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = readEnv(config, key);
    if (PLACEHOLDER_VALUES.has(value.toLowerCase())) {
      throw new Error(`${key} must not use a placeholder value.`);
    }

    if (isProduction && value.length < 32) {
      throw new Error(
        `${key} must contain at least 32 characters in production.`,
      );
    }
  }

  for (const [key, rule] of Object.entries(NUMERIC_VARIABLES)) {
    const rawValue = readEnv(config, key);
    if (!rawValue) {
      config[key] = String(rule.defaultValue);
      continue;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      throw new Error(
        `${key} must be a number between ${rule.min} and ${rule.max}.`,
      );
    }

    config[key] = String(value);
  }

  return config;
}
