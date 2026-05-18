/**
 * Environment Variable Validation
 *
 * Validates required environment variables at build time and runtime.
 * Provides helpful error messages when configuration is missing or invalid.
 */

import { z } from "zod";

import { logger } from "@/lib/logger";

// ============================================================================
// Environment Schemas
// ============================================================================

/**
 * Schema for Next.js public environment variables
 */
const publicEnvSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("ɳChat"),
  NEXT_PUBLIC_ENV: z
    .enum(["development", "staging", "production", "test"])
    .optional()
    .default("development"),

  // Development Mode
  NEXT_PUBLIC_USE_DEV_AUTH: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),

  // Backend URLs (required in production)
  NEXT_PUBLIC_GRAPHQL_URL: z.string().url().optional(),
  NEXT_PUBLIC_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_STORAGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_REALTIME_URL: z.string().url().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  NEXT_PUBLIC_ENABLE_ERROR_TRACKING: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),

  // Optional Services
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
});

/**
 * Schema for server-side environment variables
 */
const serverEnvSchema = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),

  // Database
  DATABASE_URL: z.string().url().optional(),
  HASURA_ADMIN_SECRET: z.string().optional(),

  // Authentication (Nhost)
  NHOST_SUBDOMAIN: z.string().optional(),
  NHOST_REGION: z.string().optional(),
  NHOST_ADMIN_SECRET: z.string().optional(),

  // Storage (S3/MinIO)
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // External Services
  AI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Security
  JWT_SECRET: z.string().min(32).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Analytics & Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates public environment variables
 */
export function validatePublicEnv() {
  // Skip validation during build if SKIP_ENV_VALIDATION is set
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    // Return default values for build time
    return publicEnvSchema.parse({});
  }

  try {
    return publicEnvSchema.parse({
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
      NEXT_PUBLIC_USE_DEV_AUTH: process.env.NEXT_PUBLIC_USE_DEV_AUTH,
      NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL,
      NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
      NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
      NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
      NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
      NEXT_PUBLIC_ENABLE_ERROR_TRACKING:
        process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors
        .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(
        `Invalid public environment variables:\n${errors}\n\nPlease check your .env.local file.`,
      );
    }
    throw error;
  }
}

/**
 * Validates server environment variables
 */
export function validateServerEnv() {
  // Skip validation during build if SKIP_ENV_VALIDATION is set
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    // Return default values for build time
    return serverEnvSchema.parse({});
  }

  try {
    return serverEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      HASURA_ADMIN_SECRET: process.env.HASURA_ADMIN_SECRET,
      NHOST_SUBDOMAIN: process.env.NHOST_SUBDOMAIN,
      NHOST_REGION: process.env.NHOST_REGION,
      NHOST_ADMIN_SECRET: process.env.NHOST_ADMIN_SECRET,
      S3_ENDPOINT: process.env.S3_ENDPOINT,
      S3_BUCKET: process.env.S3_BUCKET,
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
      S3_SECRET_KEY: process.env.S3_SECRET_KEY,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      SMTP_FROM: process.env.SMTP_FROM,
      AI_API_KEY: process.env.AI_API_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
      SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors
        .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(
        `Invalid server environment variables:\n${errors}\n\nPlease check your .env file.`,
      );
    }
    throw error;
  }
}

/**
 * Production environment check
 * Ensures all required variables are set for production deployment
 */
export function validateProductionEnv() {
  const env = validatePublicEnv();

  if (env.NEXT_PUBLIC_ENV === "production") {
    const required = [
      "NEXT_PUBLIC_GRAPHQL_URL",
      "NEXT_PUBLIC_AUTH_URL",
      "NEXT_PUBLIC_STORAGE_URL",
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nPlease configure these in your deployment platform.`,
      );
    }

    if (env.NEXT_PUBLIC_USE_DEV_AUTH) {
      console.warn(
        "⚠️  WARNING: Development auth is enabled in production mode. This is insecure and should only be used for testing.",
      );
    }
  }

  return env;
}

// ============================================================================
// Environment Info
// ============================================================================

/**
 * Gets environment information for debugging
 */
export function getEnvInfo() {
  const env = validatePublicEnv();

  return {
    environment: env.NEXT_PUBLIC_ENV,
    appName: env.NEXT_PUBLIC_APP_NAME,
    isDevAuth: env.NEXT_PUBLIC_USE_DEV_AUTH,
    hasGraphQL: !!env.NEXT_PUBLIC_GRAPHQL_URL,
    hasAuth: !!env.NEXT_PUBLIC_AUTH_URL,
    hasStorage: !!env.NEXT_PUBLIC_STORAGE_URL,
    hasRealtime: !!env.NEXT_PUBLIC_REALTIME_URL,
    analyticsEnabled: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    errorTrackingEnabled: env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
  };
}

/**
 * Checks if environment is properly configured
 */
export function checkEnvHealth(): { healthy: boolean; issues: string[] } {
  const issues: string[] = [];
  const env = validatePublicEnv();

  // Check production requirements
  if (env.NEXT_PUBLIC_ENV === "production") {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) {
      issues.push("Missing NEXT_PUBLIC_GRAPHQL_URL in production");
    }
    if (!process.env.NEXT_PUBLIC_AUTH_URL) {
      issues.push("Missing NEXT_PUBLIC_AUTH_URL in production");
    }
    if (env.NEXT_PUBLIC_USE_DEV_AUTH) {
      issues.push("Development auth is enabled in production (insecure)");
    }
  }

  // Check for development mode warnings
  if (env.NEXT_PUBLIC_ENV === "development") {
    if (!env.NEXT_PUBLIC_USE_DEV_AUTH && !process.env.NEXT_PUBLIC_AUTH_URL) {
      issues.push("Neither dev auth nor production auth URL is configured");
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
