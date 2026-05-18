/**
 * Environment utilities for nself-chat
 * Type-safe environment variable access with validation and defaults
 * @module lib/env
 */

/**
 * Environment variable types
 */
type EnvValue = string | number | boolean | string[];

/**
 * Environment variable configuration
 */
interface EnvVarConfig<T extends EnvValue> {
  /** Default value if not set */
  default?: T;
  /** Whether the variable is required */
  required?: boolean;
  /** Custom validation function */
  validate?: (value: T) => boolean;
  /** Description for documentation */
  description?: string;
}

/**
 * Environment variable error
 */
export class EnvError extends Error {
  constructor(
    public varName: string,
    message: string,
  ) {
    super(`Environment variable ${varName}: ${message}`);
    this.name = "EnvError";
  }
}

/**
 * Get a raw environment variable
 * @param name - Environment variable name
 * @returns Value or undefined
 */
function getRawEnv(name: string): string | undefined {
  // Client-side: only NEXT_PUBLIC_ vars are available
  if (typeof window !== "undefined") {
    return (process.env as Record<string, string | undefined>)[name];
  }

  // Server-side: all vars available
  return process.env[name];
}

/**
 * Get a string environment variable
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns String value
 * @throws EnvError if required and not set, or validation fails
 * @example
 * const apiUrl = envString('NEXT_PUBLIC_API_URL', { default: 'http://localhost:3000' });
 */
export function envString(
  name: string,
  config: EnvVarConfig<string> = {},
): string {
  const { default: defaultValue, required = false, validate } = config;

  const value = getRawEnv(name);

  if (value === undefined || value === "") {
    if (required && defaultValue === undefined) {
      throw new EnvError(name, "is required but not set");
    }
    return defaultValue ?? "";
  }

  if (validate && !validate(value)) {
    throw new EnvError(name, "failed validation");
  }

  return value;
}

/**
 * Get a number environment variable
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns Number value
 * @throws EnvError if required and not set, invalid number, or validation fails
 * @example
 * const port = envNumber('PORT', { default: 3000 });
 */
export function envNumber(
  name: string,
  config: EnvVarConfig<number> = {},
): number {
  const { default: defaultValue, required = false, validate } = config;

  const raw = getRawEnv(name);

  if (raw === undefined || raw === "") {
    if (required && defaultValue === undefined) {
      throw new EnvError(name, "is required but not set");
    }
    return defaultValue ?? 0;
  }

  const value = parseFloat(raw);

  if (isNaN(value)) {
    throw new EnvError(name, `invalid number: "${raw}"`);
  }

  if (validate && !validate(value)) {
    throw new EnvError(name, "failed validation");
  }

  return value;
}

/**
 * Get an integer environment variable
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns Integer value
 * @throws EnvError if required and not set, invalid integer, or validation fails
 */
export function envInt(
  name: string,
  config: EnvVarConfig<number> = {},
): number {
  const value = envNumber(name, config);
  return Math.floor(value);
}

/**
 * Get a boolean environment variable
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns Boolean value
 * @example
 * const isDebug = envBool('DEBUG', { default: false });
 */
export function envBool(
  name: string,
  config: EnvVarConfig<boolean> = {},
): boolean {
  const { default: defaultValue = false, required = false, validate } = config;

  const raw = getRawEnv(name);

  if (raw === undefined || raw === "") {
    if (required) {
      throw new EnvError(name, "is required but not set");
    }
    return defaultValue;
  }

  const truthy = ["true", "1", "yes", "on"];
  const falsy = ["false", "0", "no", "off"];
  const normalized = raw.toLowerCase().trim();

  let value: boolean;
  if (truthy.includes(normalized)) {
    value = true;
  } else if (falsy.includes(normalized)) {
    value = false;
  } else {
    throw new EnvError(name, `invalid boolean: "${raw}"`);
  }

  if (validate && !validate(value)) {
    throw new EnvError(name, "failed validation");
  }

  return value;
}

/**
 * Get an array environment variable (comma-separated)
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns Array of strings
 * @example
 * const hosts = envArray('ALLOWED_HOSTS', { default: ['localhost'] });
 */
export function envArray(
  name: string,
  config: EnvVarConfig<string[]> & { separator?: string } = {},
): string[] {
  const {
    default: defaultValue = [],
    required = false,
    validate,
    separator = ",",
  } = config;

  const raw = getRawEnv(name);

  if (raw === undefined || raw === "") {
    if (required) {
      throw new EnvError(name, "is required but not set");
    }
    return defaultValue;
  }

  const value = raw
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);

  if (validate && !validate(value)) {
    throw new EnvError(name, "failed validation");
  }

  return value;
}

/**
 * Get an enum environment variable
 * @param name - Environment variable name
 * @param allowedValues - Array of allowed values
 * @param config - Configuration options
 * @returns Enum value
 * @example
 * const env = envEnum('NODE_ENV', ['development', 'production', 'test']);
 */
export function envEnum<T extends string>(
  name: string,
  allowedValues: readonly T[],
  config: Omit<EnvVarConfig<T>, "validate"> = {},
): T {
  const { default: defaultValue, required = false } = config;

  const raw = getRawEnv(name);

  if (raw === undefined || raw === "") {
    if (required && defaultValue === undefined) {
      throw new EnvError(name, "is required but not set");
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new EnvError(name, "no default value provided");
  }

  if (!allowedValues.includes(raw as T)) {
    throw new EnvError(
      name,
      `invalid value "${raw}". Allowed values: ${allowedValues.join(", ")}`,
    );
  }

  return raw as T;
}

/**
 * Get a URL environment variable (validated)
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns URL string
 */
export function envUrl(
  name: string,
  config: EnvVarConfig<string> = {},
): string {
  const value = envString(name, config);

  if (!value) {
    return value;
  }

  try {
    new URL(value);
    return value;
  } catch {
    throw new EnvError(name, `invalid URL: "${value}"`);
  }
}

/**
 * Get a JSON environment variable
 * @param name - Environment variable name
 * @param config - Configuration options
 * @returns Parsed JSON value
 */
export function envJson<T>(
  name: string,
  config: {
    default?: T;
    required?: boolean;
    validate?: (value: T) => boolean;
    description?: string;
  } = {},
): T {
  const { default: defaultValue, required = false, validate } = config;

  const raw = getRawEnv(name);

  if (raw === undefined || raw === "") {
    if (required && defaultValue === undefined) {
      throw new EnvError(name, "is required but not set");
    }
    return defaultValue as T;
  }

  try {
    const value = JSON.parse(raw) as T;

    if (validate && !validate(value)) {
      throw new EnvError(name, "failed validation");
    }

    return value;
  } catch (error) {
    if (error instanceof EnvError) throw error;
    throw new EnvError(name, `invalid JSON: "${raw}"`);
  }
}

/**
 * Check if an environment variable is set
 * @param name - Environment variable name
 * @returns Whether the variable is set
 */
export function envIsSet(name: string): boolean {
  const value = getRawEnv(name);
  return value !== undefined && value !== "";
}

/**
 * Environment mode types
 */
export type EnvironmentMode = "development" | "production" | "test";

/**
 * Centralized environment configuration for nself-chat
 */
export const env = {
  // Environment mode
  get NODE_ENV(): EnvironmentMode {
    return envEnum("NODE_ENV", ["development", "production", "test"], {
      default: "development",
    });
  },

  get isDevelopment(): boolean {
    return this.NODE_ENV === "development";
  },

  get isProduction(): boolean {
    return this.NODE_ENV === "production";
  },

  get isTest(): boolean {
    return this.NODE_ENV === "test";
  },

  // API URLs
  get GRAPHQL_URL(): string {
    return envUrl("NEXT_PUBLIC_GRAPHQL_URL", {
      default: "http://api.localhost/v1/graphql",
    });
  },

  get AUTH_URL(): string {
    return envUrl("NEXT_PUBLIC_AUTH_URL", {
      default: "http://auth.localhost/v1/auth",
    });
  },

  get STORAGE_URL(): string {
    return envUrl("NEXT_PUBLIC_STORAGE_URL", {
      default: "http://storage.localhost/v1/storage",
    });
  },

  get WS_URL(): string {
    return envUrl("NEXT_PUBLIC_WS_URL", {
      default: "ws://api.localhost/v1/graphql",
    });
  },

  // Application settings
  get APP_NAME(): string {
    return envString("NEXT_PUBLIC_APP_NAME", {
      default: "nchat",
    });
  },

  get APP_URL(): string {
    return envUrl("NEXT_PUBLIC_APP_URL", {
      default: "http://localhost:3000",
    });
  },

  // Authentication
  get USE_DEV_AUTH(): boolean {
    return envBool("NEXT_PUBLIC_USE_DEV_AUTH", {
      default: this.isDevelopment,
    });
  },

  // Feature flags
  get ENABLE_ANALYTICS(): boolean {
    return envBool("NEXT_PUBLIC_ENABLE_ANALYTICS", {
      default: this.isProduction,
    });
  },

  get ENABLE_ERROR_REPORTING(): boolean {
    return envBool("NEXT_PUBLIC_ENABLE_ERROR_REPORTING", {
      default: this.isProduction,
    });
  },

  get ENABLE_SERVICE_WORKER(): boolean {
    return envBool("NEXT_PUBLIC_ENABLE_SERVICE_WORKER", {
      default: this.isProduction,
    });
  },

  // Theming
  get PRIMARY_COLOR(): string {
    return envString("NEXT_PUBLIC_PRIMARY_COLOR", {
      default: "#6366f1",
    });
  },

  // Limits
  get MAX_UPLOAD_SIZE(): number {
    return envInt("NEXT_PUBLIC_MAX_UPLOAD_SIZE", {
      default: 10 * 1024 * 1024, // 10MB
    });
  },

  // Server-side only (won't be available on client)
  get DATABASE_URL(): string {
    if (typeof window !== "undefined") {
      throw new Error("DATABASE_URL is only available server-side");
    }
    return envString("DATABASE_URL", { required: false, default: "" });
  },

  get HASURA_ADMIN_SECRET(): string {
    if (typeof window !== "undefined") {
      throw new Error("HASURA_ADMIN_SECRET is only available server-side");
    }
    return envString("HASURA_ADMIN_SECRET", { required: false, default: "" });
  },

  get JWT_SECRET(): string {
    if (typeof window !== "undefined") {
      throw new Error("JWT_SECRET is only available server-side");
    }
    return envString("JWT_SECRET", { required: false, default: "" });
  },
} as const;

/**
 * Validate all required environment variables at startup
 * Call this in your app initialization
 * @returns Object with validation results
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Define required variables for each environment
  const requiredClient = ["NEXT_PUBLIC_GRAPHQL_URL", "NEXT_PUBLIC_AUTH_URL"];

  const requiredServer: string[] = [
    // Add server-side required vars here
  ];

  // Check client variables
  for (const name of requiredClient) {
    if (!envIsSet(name)) {
      errors.push(`Missing required environment variable: ${name}`);
    }
  }

  // Check server variables (only on server)
  if (typeof window === "undefined") {
    for (const name of requiredServer) {
      if (!envIsSet(name)) {
        errors.push(`Missing required environment variable: ${name}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log environment configuration (safe values only)
 * Useful for debugging startup issues
 */
export function logEnvConfig(): void {
  const safeConfig = {
    NODE_ENV: env.NODE_ENV,
    isDevelopment: env.isDevelopment,
    isProduction: env.isProduction,
    APP_NAME: env.APP_NAME,
    APP_URL: env.APP_URL,
    GRAPHQL_URL: env.GRAPHQL_URL,
    AUTH_URL: env.AUTH_URL,
    USE_DEV_AUTH: env.USE_DEV_AUTH,
    ENABLE_ANALYTICS: env.ENABLE_ANALYTICS,
  };
}

/**
 * Get browser/client environment info
 */
export function getClientEnvironment(): {
  isBrowser: boolean;
  isServer: boolean;
  userAgent: string | null;
  language: string | null;
  platform: string | null;
  online: boolean;
} {
  const isBrowser = typeof window !== "undefined";

  return {
    isBrowser,
    isServer: !isBrowser,
    userAgent: isBrowser ? navigator.userAgent : null,
    language: isBrowser ? navigator.language : null,
    platform: isBrowser ? navigator.platform : null,
    online: isBrowser ? navigator.onLine : true,
  };
}

/**
 * Feature flag helper
 * @param flagName - Name of the feature flag
 * @param defaultValue - Default value if flag not set
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(
  flagName: string,
  defaultValue: boolean = false,
): boolean {
  const envName = `NEXT_PUBLIC_FEATURE_${flagName.toUpperCase().replace(/-/g, "_")}`;
  return envBool(envName, { default: defaultValue });
}

export default env;
