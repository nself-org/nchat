/**
 * Simple Environment Utilities
 *
 * Lightweight environment detection without complex validation.
 * Use for simple checks in hooks and utilities.
 */

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development";
  }
  return process.env.NEXT_PUBLIC_ENV === "development";
};

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production";
  }
  return process.env.NEXT_PUBLIC_ENV === "production";
};

/**
 * Check if running in staging mode
 */
export const isStaging = (): boolean => {
  return process.env.NEXT_PUBLIC_ENV === "staging";
};

/**
 * Check if server-side
 */
export const isServer = (): boolean => {
  return typeof window === "undefined";
};

/**
 * Check if client-side
 */
export const isClient = (): boolean => {
  return typeof window !== "undefined";
};

/**
 * Get public environment variable safely
 */
export const getPublicEnv = () => {
  return {
    NEXT_PUBLIC_ENV: (process.env.NEXT_PUBLIC_ENV || "development") as
      | "development"
      | "staging"
      | "production"
      | "test",
    NEXT_PUBLIC_USE_DEV_AUTH: process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true",
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "ɳChat",
  };
};
