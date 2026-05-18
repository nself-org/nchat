/**
 * Environment Configuration Module
 *
 * Centralized environment variable validation and access.
 * Use these utilities instead of accessing process.env directly.
 */

export {
  validatePublicEnv,
  validateServerEnv,
  validateProductionEnv,
  getEnvInfo,
  checkEnvHealth,
  type PublicEnv,
  type ServerEnv,
} from "./validation";

// Singleton instances for validated environments
let _publicEnv: ReturnType<
  typeof import("./validation").validatePublicEnv
> | null = null;
let _serverEnv: ReturnType<
  typeof import("./validation").validateServerEnv
> | null = null;

/**
 * Get validated public environment variables
 * Uses cached instance after first call
 */
export function getPublicEnv() {
  if (!_publicEnv) {
    const { validatePublicEnv } = require("./validation");
    _publicEnv = validatePublicEnv();
  }
  return _publicEnv;
}

/**
 * Get validated server environment variables
 * Uses cached instance after first call
 * Should only be called in server-side code (API routes, getServerSideProps, etc.)
 */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() cannot be called on the client side. Use getPublicEnv() instead.",
    );
  }

  if (!_serverEnv) {
    const { validateServerEnv } = require("./validation");
    _serverEnv = validateServerEnv();
  }
  return _serverEnv;
}

/**
 * Reset cached environment (useful for testing)
 */
export function resetEnvCache() {
  _publicEnv = null;
  _serverEnv = null;
}

/**
 * Check if running in development mode
 */
export function isDevelopment() {
  const env = getPublicEnv();
  return env?.NEXT_PUBLIC_ENV === "development";
}

/**
 * Check if running in production mode
 */
export function isProduction() {
  const env = getPublicEnv();
  return env?.NEXT_PUBLIC_ENV === "production";
}

/**
 * Check if running in staging mode
 */
export function isStaging() {
  const env = getPublicEnv();
  return env?.NEXT_PUBLIC_ENV === "staging";
}

/**
 * Check if using development authentication
 */
export function isDevAuth() {
  const env = getPublicEnv();
  return env?.NEXT_PUBLIC_USE_DEV_AUTH ?? false;
}

/**
 * Check if server-side code
 */
export function isServer() {
  return typeof window === "undefined";
}

/**
 * Check if client-side code
 */
export function isClient() {
  return typeof window !== "undefined";
}
