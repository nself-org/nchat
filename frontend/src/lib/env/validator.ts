/**
 * Environment Variables Validator
 *
 * Validates all required environment variables at build/runtime.
 * Provides type-safe access to environment variables.
 */

import { z } from "zod";

import { logger } from "@/lib/logger";

// =============================================================================
// Environment Schemas
// =============================================================================

/**
 * Server-side environment variables schema
 */
const serverEnvSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "test", "production", "staging"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),

  // Hasura
  HASURA_GRAPHQL_ADMIN_SECRET: z.string().optional(),
  HASURA_GRAPHQL_JWT_SECRET: z.string().optional(),

  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NHOST_BACKEND_URL: z.string().url().optional(),
  NHOST_SUBDOMAIN: z.string().optional(),
  NHOST_REGION: z.string().optional(),

  // Storage
  STORAGE_URL: z.string().url().optional(),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().default(6379),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Analytics
  PLAUSIBLE_DOMAIN: z.string().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

/**
 * Client-side (public) environment variables schema
 */
const clientEnvSchema = z.object({
  // App configuration
  NEXT_PUBLIC_APP_NAME: z.string().default("ɳChat"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),

  // Feature flags
  NEXT_PUBLIC_USE_DEV_AUTH: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_ENABLE_SENTRY: z.enum(["true", "false"]).default("false"),

  // API URLs
  NEXT_PUBLIC_GRAPHQL_URL: z.string().url().optional(),
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  NEXT_PUBLIC_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_STORAGE_URL: z.string().url().optional(),

  // OAuth
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_DISCORD_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_SLACK_CLIENT_ID: z.string().optional(),

  // Stripe (public key)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Maps & Geocoding
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_API_KEY: z.string().optional(),

  // Analytics (public)
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),

  // Feature-specific
  NEXT_PUBLIC_MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB
  NEXT_PUBLIC_MAX_MESSAGE_LENGTH: z.coerce.number().default(5000),
  NEXT_PUBLIC_SOCKET_RECONNECT_DELAY: z.coerce.number().default(1000),
});

// =============================================================================
// Types
// =============================================================================

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export interface ValidationResult {
  success: boolean;
  errors?: z.ZodError;
  env?: ServerEnv & ClientEnv;
}

export interface EnvStatus {
  valid: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate server environment variables
 */
export function validateServerEnv(): ValidationResult {
  try {
    const env = serverEnvSchema.parse(process.env);
    return {
      success: true,
      env: env as ServerEnv & ClientEnv,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error,
      };
    }
    throw error;
  }
}

/**
 * Validate client environment variables
 */
export function validateClientEnv(): ValidationResult {
  try {
    const env = clientEnvSchema.parse(process.env);
    return {
      success: true,
      env: env as ServerEnv & ClientEnv,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error,
      };
    }
    throw error;
  }
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const serverResult = validateServerEnv();
    const clientResult = validateClientEnv();

    if (!serverResult.success || !clientResult.success) {
      return {
        success: false,
        errors: serverResult.errors || clientResult.errors,
      };
    }

    return {
      success: true,
      env: { ...serverResult.env, ...clientResult.env } as ServerEnv &
        ClientEnv,
    };
  } else {
    return validateClientEnv();
  }
}

/**
 * Get environment status with detailed information
 */
export function getEnvStatus(): EnvStatus {
  const result = validateEnv();

  if (result.success) {
    return {
      valid: true,
      missing: [],
      invalid: [],
      warnings: [],
    };
  }

  const missing: string[] = [];
  const invalid: string[] = [];

  if (result.errors) {
    for (const issue of result.errors.issues) {
      const path = issue.path.join(".");

      if (issue.code === "invalid_type" && issue.received === "undefined") {
        missing.push(path);
      } else {
        invalid.push(`${path}: ${issue.message}`);
      }
    }
  }

  // Generate warnings for optional but recommended variables
  const warnings: string[] = [];
  if (!process.env.SENTRY_DSN) {
    warnings.push("SENTRY_DSN not set - error tracking disabled");
  }
  if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
    warnings.push(
      "NEXT_PUBLIC_GOOGLE_ANALYTICS_ID not set - analytics disabled",
    );
  }

  return {
    valid: false,
    missing,
    invalid,
    warnings,
  };
}

/**
 * Format environment errors for logging
 */
export function formatEnvErrors(errors: z.ZodError): string {
  return errors.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Log environment status
 */
export function logEnvStatus(): void {
  const status = getEnvStatus();

  if (status.valid) {
    return;
  }

  logger.error("❌ Environment validation failed:\n");

  if (status.missing.length > 0) {
    logger.error("Missing variables:");
    status.missing.forEach((v) => logger.error(`  - ${v}`));
  }

  if (status.invalid.length > 0) {
    logger.error("\nInvalid variables:");
    status.invalid.forEach((v) => logger.error(`  - ${v}`));
  }

  if (status.warnings.length > 0) {
    logger.warn("\n⚠️  Warnings:");
    status.warnings.forEach((w) => logger.warn(`  - ${w}`));
  }
}

// =============================================================================
// Type-safe Environment Access
// =============================================================================

/**
 * Get validated environment variables (throws if invalid)
 */
export function getEnv(): ServerEnv & ClientEnv {
  const result = validateEnv();

  if (!result.success) {
    const formatted = result.errors
      ? formatEnvErrors(result.errors)
      : "Unknown error";
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.env!;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Check if on server side
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize and validate environment on module load
 */
if (process.env.NODE_ENV !== "test") {
  const result = validateEnv();

  if (!result.success) {
    logger.error("\n🔴 ENVIRONMENT VALIDATION FAILED\n");
    logEnvStatus();

    // Fail fast in production
    if (isProduction()) {
      logger.error(
        "\n❌ Cannot start application with invalid environment variables",
      );
      process.exit(1);
    }
  } else if (isDevelopment()) {
    // Log warnings in development
    const status = getEnvStatus();
    if (status.warnings.length > 0) {
      logger.warn("\n⚠️  Environment warnings:");
      status.warnings.forEach((w) => logger.warn(`  - ${w}`));
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export default {
  validate: validateEnv,
  getStatus: getEnvStatus,
  getEnv,
  isProduction,
  isDevelopment,
  isTest,
  isServer,
  logStatus: logEnvStatus,
};
