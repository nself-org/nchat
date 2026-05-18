/**
 * Environment Detection Utilities
 *
 * Detects existing configuration and environment state to:
 * 1. Pre-fill wizard with existing values
 * 2. Skip already-configured steps
 * 3. Show users what's already done vs what needs setup
 */

export interface EnvironmentStatus {
  // Backend detection
  backend: {
    exists: boolean;
    initialized: boolean;
    running: boolean;
    services: {
      postgres: ServiceStatus;
      hasura: ServiceStatus;
      auth: ServiceStatus;
      storage: ServiceStatus;
      redis: ServiceStatus;
      meilisearch: ServiceStatus;
      mailpit: ServiceStatus;
    };
  };

  // Environment files
  envFiles: {
    local: EnvFileStatus;
    development: EnvFileStatus;
    staging: EnvFileStatus;
    production: EnvFileStatus;
  };

  // Configuration state
  config: {
    exists: boolean;
    source: "localStorage" | "database" | "env" | "none";
    isComplete: boolean;
    completedSteps: number[];
    missingRequired: string[];
  };

  // Deployment state
  deployment: {
    frontendUrl: string | null;
    backendUrl: string | null;
    environment: "development" | "staging" | "production" | null;
  };

  // Overall readiness
  readiness: {
    canRunDevMode: boolean;
    canDeploy: boolean;
    issues: string[];
    suggestions: string[];
  };
}

export interface ServiceStatus {
  enabled: boolean;
  running: boolean;
  healthy: boolean;
  url?: string;
}

export interface EnvFileStatus {
  exists: boolean;
  path: string;
  variables: Record<string, string>;
  missing: string[];
}

/**
 * Required environment variables for each phase
 */
export const REQUIRED_ENV_VARS = {
  // Minimum for dev mode
  development: ["NEXT_PUBLIC_APP_NAME"],

  // Required for staging/production
  production: [
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_GRAPHQL_URL",
    "NEXT_PUBLIC_AUTH_URL",
    "NEXT_PUBLIC_STORAGE_URL",
  ],

  // Optional but recommended
  recommended: [
    "NEXT_PUBLIC_THEME_PRIMARY",
    "NEXT_PUBLIC_THEME_MODE",
    "NEXT_PUBLIC_SOCKET_URL",
  ],
};

/**
 * Map AppConfig properties to environment variables
 */
export const CONFIG_TO_ENV_MAP: Record<string, string> = {
  // App Identity
  "branding.appName": "NEXT_PUBLIC_APP_NAME",
  "branding.tagline": "NEXT_PUBLIC_APP_TAGLINE",
  "branding.companyName": "NEXT_PUBLIC_COMPANY_NAME",
  "branding.websiteUrl": "NEXT_PUBLIC_WEBSITE_URL",
  "branding.logo": "NEXT_PUBLIC_LOGO_URL",
  "branding.favicon": "NEXT_PUBLIC_FAVICON_URL",

  // Theme
  "theme.preset": "NEXT_PUBLIC_THEME_PRESET",
  "theme.colorScheme": "NEXT_PUBLIC_THEME_MODE",
  "theme.colors.primary": "NEXT_PUBLIC_THEME_PRIMARY",
  "theme.colors.secondary": "NEXT_PUBLIC_THEME_SECONDARY",
  "theme.colors.accent": "NEXT_PUBLIC_THEME_ACCENT",
  "theme.colors.background": "NEXT_PUBLIC_THEME_BACKGROUND",
  "theme.borderRadius": "NEXT_PUBLIC_THEME_BORDER_RADIUS",
  "theme.fontFamily": "NEXT_PUBLIC_THEME_FONT",

  // Landing Page
  landingTheme: "NEXT_PUBLIC_LANDING_THEME",
  "homepage.mode": "NEXT_PUBLIC_HOMEPAGE_MODE",
  "homepage.redirectTo": "NEXT_PUBLIC_HOMEPAGE_REDIRECT",

  // Auth Providers
  "authProviders.emailPassword": "NEXT_PUBLIC_AUTH_EMAIL",
  "authProviders.magicLinks": "NEXT_PUBLIC_AUTH_MAGIC_LINK",
  "authProviders.google": "NEXT_PUBLIC_AUTH_GOOGLE",
  "authProviders.github": "NEXT_PUBLIC_AUTH_GITHUB",
  "authProviders.apple": "NEXT_PUBLIC_AUTH_APPLE",
  "authProviders.microsoft": "NEXT_PUBLIC_AUTH_MICROSOFT",
  "authProviders.discord": "NEXT_PUBLIC_AUTH_DISCORD",
  "authProviders.slack": "NEXT_PUBLIC_AUTH_SLACK",
  "authProviders.facebook": "NEXT_PUBLIC_AUTH_FACEBOOK",
  "authProviders.twitter": "NEXT_PUBLIC_AUTH_TWITTER",
  "authProviders.idme.enabled": "NEXT_PUBLIC_AUTH_IDME",

  // Access Permissions
  "authPermissions.mode": "NEXT_PUBLIC_ACCESS_MODE",
  "authPermissions.requireEmailVerification":
    "NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION",
  "authPermissions.requireApproval": "NEXT_PUBLIC_REQUIRE_APPROVAL",

  // Features (core)
  "features.publicChannels": "NEXT_PUBLIC_FEATURE_PUBLIC_CHANNELS",
  "features.privateChannels": "NEXT_PUBLIC_FEATURE_PRIVATE_CHANNELS",
  "features.directMessages": "NEXT_PUBLIC_FEATURE_DMS",
  "features.threads": "NEXT_PUBLIC_FEATURE_THREADS",
  "features.reactions": "NEXT_PUBLIC_FEATURE_REACTIONS",
  "features.fileUploads": "NEXT_PUBLIC_FEATURE_FILE_UPLOADS",
  "features.voiceMessages": "NEXT_PUBLIC_FEATURE_VOICE_MESSAGES",
  "features.videoChat": "NEXT_PUBLIC_FEATURE_VIDEO_CHAT",
  "features.customEmoji": "NEXT_PUBLIC_FEATURE_CUSTOM_EMOJI",
  "features.giphy": "NEXT_PUBLIC_FEATURE_GIPHY",
  "features.polls": "NEXT_PUBLIC_FEATURE_POLLS",
  "features.bots": "NEXT_PUBLIC_FEATURE_BOTS",

  // Owner
  "owner.name": "NEXT_PUBLIC_OWNER_NAME",
  "owner.email": "NEXT_PUBLIC_OWNER_EMAIL",
  "owner.company": "NEXT_PUBLIC_OWNER_COMPANY",
};

/**
 * Reverse map: ENV variable to AppConfig path
 */
export const ENV_TO_CONFIG_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CONFIG_TO_ENV_MAP).map(([k, v]) => [v, k]),
);

/**
 * Parse environment variables and build partial config
 */
export function envToConfig(
  env: Record<string, string | undefined>,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  for (const [envKey, configPath] of Object.entries(ENV_TO_CONFIG_MAP)) {
    const value = env[envKey];
    if (value !== undefined && value !== "") {
      setNestedValue(config, configPath, parseEnvValue(value));
    }
  }

  return config;
}

/**
 * Generate environment variables from AppConfig
 */
export function configToEnv(
  config: Record<string, unknown>,
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [configPath, envKey] of Object.entries(CONFIG_TO_ENV_MAP)) {
    const value = getNestedValue(config, configPath);
    if (value !== undefined && value !== null && value !== "") {
      env[envKey] = formatEnvValue(value);
    }
  }

  return env;
}

/**
 * Generate .env file content from config
 */
export function generateEnvFile(
  config: Record<string, unknown>,
  options: {
    environment: "development" | "staging" | "production";
    backendUrls?: {
      graphql?: string;
      auth?: string;
      storage?: string;
      socket?: string;
    };
    includeComments?: boolean;
  },
): string {
  const lines: string[] = [];
  const { environment, backendUrls, includeComments = true } = options;

  if (includeComments) {
    lines.push(
      "# =============================================================================",
    );
    lines.push(`# nself-chat Environment Configuration (${environment})`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(
      "# =============================================================================",
    );
    lines.push("");
  }

  // Environment
  if (includeComments) lines.push("# Environment");
  lines.push(`NEXT_PUBLIC_ENV=${environment}`);
  lines.push(
    `NEXT_PUBLIC_USE_DEV_AUTH=${environment === "development" ? "true" : "false"}`,
  );
  lines.push("");

  // Backend URLs
  if (includeComments) lines.push("# Backend Services (nself CLI)");
  if (backendUrls?.graphql) {
    lines.push(`NEXT_PUBLIC_GRAPHQL_URL=${backendUrls.graphql}`);
  } else if (environment === "development") {
    lines.push("NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql");
  }
  if (backendUrls?.auth) {
    lines.push(`NEXT_PUBLIC_AUTH_URL=${backendUrls.auth}`);
  } else if (environment === "development") {
    lines.push("NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth");
  }
  if (backendUrls?.storage) {
    lines.push(`NEXT_PUBLIC_STORAGE_URL=${backendUrls.storage}`);
  } else if (environment === "development") {
    lines.push("NEXT_PUBLIC_STORAGE_URL=http://storage.localhost/v1/storage");
  }
  if (backendUrls?.socket) {
    lines.push(`NEXT_PUBLIC_SOCKET_URL=${backendUrls.socket}`);
  }
  lines.push("");

  // App Identity
  const appConfig = configToEnv(config);

  if (includeComments) lines.push("# App Identity");
  const identityVars = [
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_TAGLINE",
    "NEXT_PUBLIC_COMPANY_NAME",
    "NEXT_PUBLIC_WEBSITE_URL",
  ];
  for (const key of identityVars) {
    if (appConfig[key]) lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Branding
  if (includeComments) lines.push("# Branding");
  const brandingVars = ["NEXT_PUBLIC_LOGO_URL", "NEXT_PUBLIC_FAVICON_URL"];
  for (const key of brandingVars) {
    if (appConfig[key]) lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Theme
  if (includeComments) lines.push("# Theme");
  const themeVars = Object.keys(appConfig).filter((k) =>
    k.startsWith("NEXT_PUBLIC_THEME_"),
  );
  for (const key of themeVars) {
    lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Landing Page
  if (includeComments) lines.push("# Landing Page");
  const landingVars = [
    "NEXT_PUBLIC_LANDING_THEME",
    "NEXT_PUBLIC_HOMEPAGE_MODE",
    "NEXT_PUBLIC_HOMEPAGE_REDIRECT",
  ];
  for (const key of landingVars) {
    if (appConfig[key]) lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Authentication
  if (includeComments) lines.push("# Authentication Providers");
  const authVars = Object.keys(appConfig).filter((k) =>
    k.startsWith("NEXT_PUBLIC_AUTH_"),
  );
  for (const key of authVars) {
    lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Access Control
  if (includeComments) lines.push("# Access Control");
  const accessVars = [
    "NEXT_PUBLIC_ACCESS_MODE",
    "NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION",
    "NEXT_PUBLIC_REQUIRE_APPROVAL",
  ];
  for (const key of accessVars) {
    if (appConfig[key]) lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Features
  if (includeComments) lines.push("# Features");
  const featureVars = Object.keys(appConfig).filter((k) =>
    k.startsWith("NEXT_PUBLIC_FEATURE_"),
  );
  for (const key of featureVars) {
    lines.push(`${key}=${appConfig[key]}`);
  }
  lines.push("");

  // Owner
  if (includeComments) lines.push("# Owner Information");
  const ownerVars = Object.keys(appConfig).filter((k) =>
    k.startsWith("NEXT_PUBLIC_OWNER_"),
  );
  for (const key of ownerVars) {
    lines.push(`${key}=${appConfig[key]}`);
  }

  return lines.join("\n");
}

// Helper functions
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function parseEnvValue(value: string): unknown {
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;

  // String
  return value;
}

function formatEnvValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return String(value);
}

/**
 * Determine which wizard steps can be skipped based on existing config
 */
export function getSkippableSteps(config: Record<string, unknown>): number[] {
  const skippable: number[] = [];

  // Step 3: App Identity - skip if name and owner are set
  if (
    getNestedValue(config, "branding.appName") &&
    getNestedValue(config, "owner.email")
  ) {
    skippable.push(3);
  }

  // Step 4: Branding - skip if logo is set
  if (getNestedValue(config, "branding.logo")) {
    skippable.push(4);
  }

  // Step 5: Theme - skip if preset is set
  if (getNestedValue(config, "theme.preset")) {
    skippable.push(5);
  }

  // Step 6: Landing Page - skip if theme is set
  if (getNestedValue(config, "landingTheme")) {
    skippable.push(6);
  }

  // Step 7: Auth - skip if at least one provider is enabled
  const authProviders = getNestedValue(config, "authProviders") as
    | Record<string, unknown>
    | undefined;
  if (authProviders && Object.values(authProviders).some((v) => v === true)) {
    skippable.push(7);
  }

  // Step 8: Permissions - skip if mode is set
  if (getNestedValue(config, "authPermissions.mode")) {
    skippable.push(8);
  }

  // Step 9: Features - always show (user may want to customize)

  return skippable;
}
