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

// SMTP and FRONTEND_URL are optional — app starts without them;
// email features return 503 when SMTP is unconfigured.
const PRODUCTION_WARNED_VARIABLES = [
  'FRONTEND_URL',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
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

  const warnedInProduction = isProduction
    ? PRODUCTION_WARNED_VARIABLES.filter((key) => !readEnv(config, key))
    : [];

  if (warnedInProduction.length > 0) {
    console.warn(
      `[config] Optional variable(s) not set: ${warnedInProduction.join(', ')}. Email features will be unavailable.`,
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

  const smtpPort = Number(readEnv(config, 'SMTP_PORT') || '587');
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
  }
  config.SMTP_PORT = String(smtpPort);

  const frontendUrl = readEnv(config, 'FRONTEND_URL');
  if (frontendUrl) {
    try {
      const url = new URL(frontendUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error('FRONTEND_URL must be an HTTP(S) URL.');
    }
  }

  return config;
}
