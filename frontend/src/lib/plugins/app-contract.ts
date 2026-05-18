/**
 * App/Plugin Contract
 *
 * Core type definitions for the nChat third-party app integration system.
 * Defines the manifest schema, scopes, events, tokens, and validation logic
 * that form the stable API contract for bots, apps, and workflow integrations.
 */

// ============================================================================
// APP SCOPES
// ============================================================================

/**
 * Granular permission scopes for app authorization.
 * Hierarchical: `admin:*` implies all admin sub-scopes.
 */
export type AppScope =
  // Message scopes
  | "read:messages"
  | "write:messages"
  | "delete:messages"
  // Channel scopes
  | "read:channels"
  | "write:channels"
  | "admin:channels"
  // User scopes
  | "read:users"
  | "read:user_email"
  // Reaction scopes
  | "read:reactions"
  | "write:reactions"
  // File scopes
  | "read:files"
  | "write:files"
  // Thread scopes
  | "read:threads"
  | "write:threads"
  // Presence scopes
  | "read:presence"
  // Webhook scopes
  | "write:webhooks"
  // Admin scopes
  | "admin:apps"
  | "admin:users"
  | "admin:moderation"
  // Wildcard scopes
  | "admin:*"
  | "read:*"
  | "write:*";

/**
 * All defined scopes for validation purposes.
 */
export const ALL_SCOPES: readonly AppScope[] = [
  "read:messages",
  "write:messages",
  "delete:messages",
  "read:channels",
  "write:channels",
  "admin:channels",
  "read:users",
  "read:user_email",
  "read:reactions",
  "write:reactions",
  "read:files",
  "write:files",
  "read:threads",
  "write:threads",
  "read:presence",
  "write:webhooks",
  "admin:apps",
  "admin:users",
  "admin:moderation",
  "admin:*",
  "read:*",
  "write:*",
] as const;

/**
 * Map of wildcard scopes to their implied concrete scopes.
 */
export const SCOPE_HIERARCHY: Record<string, AppScope[]> = {
  "admin:*": [
    "admin:channels",
    "admin:apps",
    "admin:users",
    "admin:moderation",
  ],
  "read:*": [
    "read:messages",
    "read:channels",
    "read:users",
    "read:user_email",
    "read:reactions",
    "read:files",
    "read:threads",
    "read:presence",
  ],
  "write:*": [
    "write:messages",
    "write:channels",
    "write:reactions",
    "write:files",
    "write:threads",
    "write:webhooks",
  ],
};

/**
 * Check whether a set of granted scopes satisfies a required scope.
 */
export function hasScope(
  grantedScopes: AppScope[],
  requiredScope: AppScope,
): boolean {
  // Direct match
  if (grantedScopes.includes(requiredScope)) {
    return true;
  }

  // Check wildcard expansion
  for (const granted of grantedScopes) {
    const expanded = SCOPE_HIERARCHY[granted];
    if (expanded && expanded.includes(requiredScope)) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether granted scopes satisfy all required scopes.
 */
export function hasAllScopes(
  grantedScopes: AppScope[],
  requiredScopes: AppScope[],
): boolean {
  return requiredScopes.every((scope) => hasScope(grantedScopes, scope));
}

/**
 * Expand wildcard scopes into their concrete equivalents.
 */
export function expandScopes(scopes: AppScope[]): AppScope[] {
  const expanded = new Set<AppScope>();
  for (const scope of scopes) {
    expanded.add(scope);
    const children = SCOPE_HIERARCHY[scope];
    if (children) {
      for (const child of children) {
        expanded.add(child);
      }
    }
  }
  return Array.from(expanded);
}

/**
 * Validate that a scope string is a known scope.
 */
export function isValidScope(scope: string): scope is AppScope {
  return (ALL_SCOPES as readonly string[]).includes(scope);
}

// ============================================================================
// APP EVENTS
// ============================================================================

/**
 * Events that apps can subscribe to.
 */
export type AppEventType =
  // Message events
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "message.pinned"
  // Reaction events
  | "reaction.added"
  | "reaction.removed"
  // Channel events
  | "channel.created"
  | "channel.updated"
  | "channel.deleted"
  | "channel.archived"
  // Member events
  | "member.joined"
  | "member.left"
  | "member.role_changed"
  // User events
  | "user.updated"
  | "user.presence_changed"
  // Thread events
  | "thread.created"
  | "thread.reply_added"
  // File events
  | "file.uploaded"
  | "file.deleted"
  // App lifecycle events
  | "app.installed"
  | "app.uninstalled"
  | "app.enabled"
  | "app.disabled";

/**
 * All valid event types for validation.
 */
export const ALL_EVENT_TYPES: readonly AppEventType[] = [
  "message.created",
  "message.updated",
  "message.deleted",
  "message.pinned",
  "reaction.added",
  "reaction.removed",
  "channel.created",
  "channel.updated",
  "channel.deleted",
  "channel.archived",
  "member.joined",
  "member.left",
  "member.role_changed",
  "user.updated",
  "user.presence_changed",
  "thread.created",
  "thread.reply_added",
  "file.uploaded",
  "file.deleted",
  "app.installed",
  "app.uninstalled",
  "app.enabled",
  "app.disabled",
] as const;

/**
 * Map from event types to the scopes required to receive them.
 */
export const EVENT_REQUIRED_SCOPES: Record<AppEventType, AppScope[]> = {
  "message.created": ["read:messages"],
  "message.updated": ["read:messages"],
  "message.deleted": ["read:messages"],
  "message.pinned": ["read:messages"],
  "reaction.added": ["read:reactions"],
  "reaction.removed": ["read:reactions"],
  "channel.created": ["read:channels"],
  "channel.updated": ["read:channels"],
  "channel.deleted": ["read:channels"],
  "channel.archived": ["read:channels"],
  "member.joined": ["read:channels"],
  "member.left": ["read:channels"],
  "member.role_changed": ["read:channels"],
  "user.updated": ["read:users"],
  "user.presence_changed": ["read:presence"],
  "thread.created": ["read:threads"],
  "thread.reply_added": ["read:threads"],
  "file.uploaded": ["read:files"],
  "file.deleted": ["read:files"],
  "app.installed": [],
  "app.uninstalled": [],
  "app.enabled": [],
  "app.disabled": [],
};

/**
 * Validate that an event type string is known.
 */
export function isValidEventType(eventType: string): eventType is AppEventType {
  return (ALL_EVENT_TYPES as readonly string[]).includes(eventType);
}

// ============================================================================
// APP MANIFEST
// ============================================================================

/**
 * UI surface where an app can render content.
 */
export type AppUISurface =
  | "message_action"
  | "channel_sidebar"
  | "settings_page"
  | "command_palette"
  | "message_composer";

/**
 * Slash command definition within a manifest.
 */
export interface AppCommand {
  /** Command trigger (e.g., "poll") - invoked as /poll */
  name: string;
  /** Human-readable description */
  description: string;
  /** Command arguments schema (JSON Schema subset) */
  arguments?: AppCommandArgument[];
}

export interface AppCommandArgument {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "user" | "channel";
  required?: boolean;
  default?: string | number | boolean;
}

/**
 * Rate limit configuration declared by an app in its manifest.
 */
export interface AppRateLimitConfig {
  /** Requests per window */
  requestsPerMinute: number;
  /** Burst allowance above the base rate */
  burstAllowance?: number;
}

/**
 * The app manifest: what a third-party app declares about itself.
 * This is the JSON document that app developers submit when registering.
 */
export interface AppManifest {
  /** Manifest schema version */
  schemaVersion: "1.0";
  /** Unique app identifier (reverse-domain style, e.g. "com.example.mybot") */
  appId: string;
  /** Display name */
  name: string;
  /** Short description (max 200 chars) */
  description: string;
  /** Long description (markdown, max 5000 chars) */
  longDescription?: string;
  /** App version (semver) */
  version: string;
  /** Developer or organization name */
  developer: {
    name: string;
    email: string;
    url?: string;
  };
  /** App icon URL */
  iconUrl?: string;
  /** App homepage URL */
  homepageUrl?: string;
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
  /** Requested permission scopes */
  scopes: AppScope[];
  /** Event subscriptions */
  events?: AppEventType[];
  /** Webhook URL for event delivery */
  webhookUrl?: string;
  /** Slash commands provided by this app */
  commands?: AppCommand[];
  /** UI surfaces this app renders into */
  uiSurfaces?: AppUISurface[];
  /** Rate limit configuration */
  rateLimit?: AppRateLimitConfig;
  /** Redirect URL for OAuth installation flow */
  redirectUrl?: string;
  /** App category tags */
  categories?: string[];
}

// ============================================================================
// MANIFEST VALIDATION
// ============================================================================

export interface ManifestValidationError {
  field: string;
  message: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: ManifestValidationError[];
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const APP_ID_REGEX = /^[a-z][a-z0-9_.-]{2,63}$/;
const COMMAND_NAME_REGEX = /^[a-z][a-z0-9_-]{0,31}$/;

/**
 * Validate an app manifest against the schema contract.
 */
export function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: ManifestValidationError[] = [];

  if (!manifest || typeof manifest !== "object") {
    return {
      valid: false,
      errors: [{ field: "manifest", message: "Manifest must be an object" }],
    };
  }

  const m = manifest as Record<string, unknown>;

  // schemaVersion
  if (m.schemaVersion !== "1.0") {
    errors.push({
      field: "schemaVersion",
      message: 'schemaVersion must be "1.0"',
    });
  }

  // appId
  if (typeof m.appId !== "string" || !APP_ID_REGEX.test(m.appId)) {
    errors.push({
      field: "appId",
      message:
        "appId must be a lowercase string (3-64 chars) starting with a letter, containing only [a-z0-9_.-]",
    });
  }

  // name
  if (typeof m.name !== "string" || m.name.length < 1 || m.name.length > 64) {
    errors.push({
      field: "name",
      message: "name must be a string between 1 and 64 characters",
    });
  }

  // description
  if (
    typeof m.description !== "string" ||
    m.description.length < 1 ||
    m.description.length > 200
  ) {
    errors.push({
      field: "description",
      message: "description must be a string between 1 and 200 characters",
    });
  }

  // longDescription (optional)
  if (m.longDescription !== undefined) {
    if (
      typeof m.longDescription !== "string" ||
      m.longDescription.length > 5000
    ) {
      errors.push({
        field: "longDescription",
        message: "longDescription must be a string of at most 5000 characters",
      });
    }
  }

  // version
  if (typeof m.version !== "string" || !SEMVER_REGEX.test(m.version)) {
    errors.push({
      field: "version",
      message: 'version must be a valid semver string (e.g. "1.0.0")',
    });
  }

  // developer
  if (!m.developer || typeof m.developer !== "object") {
    errors.push({
      field: "developer",
      message: "developer must be an object with name and email",
    });
  } else {
    const dev = m.developer as Record<string, unknown>;
    if (typeof dev.name !== "string" || dev.name.length < 1) {
      errors.push({
        field: "developer.name",
        message: "developer.name is required",
      });
    }
    if (typeof dev.email !== "string" || !dev.email.includes("@")) {
      errors.push({
        field: "developer.email",
        message: "developer.email must be a valid email",
      });
    }
    if (
      dev.url !== undefined &&
      (typeof dev.url !== "string" || dev.url.length === 0)
    ) {
      errors.push({
        field: "developer.url",
        message: "developer.url must be a non-empty string if provided",
      });
    }
  }

  // scopes
  if (!Array.isArray(m.scopes) || m.scopes.length === 0) {
    errors.push({
      field: "scopes",
      message: "scopes must be a non-empty array of valid scope strings",
    });
  } else {
    for (const scope of m.scopes) {
      if (!isValidScope(scope)) {
        errors.push({ field: "scopes", message: `Unknown scope: "${scope}"` });
      }
    }
  }

  // events (optional)
  if (m.events !== undefined) {
    if (!Array.isArray(m.events)) {
      errors.push({
        field: "events",
        message: "events must be an array of event type strings",
      });
    } else {
      for (const evt of m.events) {
        if (!isValidEventType(evt)) {
          errors.push({
            field: "events",
            message: `Unknown event type: "${evt}"`,
          });
        }
      }
    }
  }

  // webhookUrl
  if (m.webhookUrl !== undefined) {
    if (typeof m.webhookUrl !== "string") {
      errors.push({
        field: "webhookUrl",
        message: "webhookUrl must be a string",
      });
    } else {
      try {
        const url = new URL(m.webhookUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.push({
            field: "webhookUrl",
            message: "webhookUrl must use http or https protocol",
          });
        }
      } catch {
        errors.push({
          field: "webhookUrl",
          message: "webhookUrl must be a valid URL",
        });
      }
    }
  }

  // If events are subscribed to, webhookUrl is required
  if (Array.isArray(m.events) && m.events.length > 0 && !m.webhookUrl) {
    errors.push({
      field: "webhookUrl",
      message: "webhookUrl is required when events are subscribed to",
    });
  }

  // commands (optional)
  if (m.commands !== undefined) {
    if (!Array.isArray(m.commands)) {
      errors.push({ field: "commands", message: "commands must be an array" });
    } else {
      const commandNames = new Set<string>();
      for (let i = 0; i < m.commands.length; i++) {
        const cmd = m.commands[i] as Record<string, unknown>;
        if (
          typeof cmd.name !== "string" ||
          !COMMAND_NAME_REGEX.test(cmd.name)
        ) {
          errors.push({
            field: `commands[${i}].name`,
            message: "Command name must be lowercase alphanumeric (1-32 chars)",
          });
        } else if (commandNames.has(cmd.name as string)) {
          errors.push({
            field: `commands[${i}].name`,
            message: `Duplicate command name: "${cmd.name}"`,
          });
        } else {
          commandNames.add(cmd.name as string);
        }
        if (
          typeof cmd.description !== "string" ||
          cmd.description.length === 0
        ) {
          errors.push({
            field: `commands[${i}].description`,
            message: "Command description is required",
          });
        }
      }
    }
  }

  // uiSurfaces (optional)
  if (m.uiSurfaces !== undefined) {
    const validSurfaces: AppUISurface[] = [
      "message_action",
      "channel_sidebar",
      "settings_page",
      "command_palette",
      "message_composer",
    ];
    if (!Array.isArray(m.uiSurfaces)) {
      errors.push({
        field: "uiSurfaces",
        message: "uiSurfaces must be an array",
      });
    } else {
      for (const surface of m.uiSurfaces) {
        if (!validSurfaces.includes(surface)) {
          errors.push({
            field: "uiSurfaces",
            message: `Unknown UI surface: "${surface}"`,
          });
        }
      }
    }
  }

  // rateLimit (optional)
  if (m.rateLimit !== undefined) {
    if (typeof m.rateLimit !== "object" || m.rateLimit === null) {
      errors.push({
        field: "rateLimit",
        message: "rateLimit must be an object",
      });
    } else {
      const rl = m.rateLimit as Record<string, unknown>;
      if (
        typeof rl.requestsPerMinute !== "number" ||
        rl.requestsPerMinute <= 0
      ) {
        errors.push({
          field: "rateLimit.requestsPerMinute",
          message: "requestsPerMinute must be a positive number",
        });
      }
      if (
        rl.burstAllowance !== undefined &&
        (typeof rl.burstAllowance !== "number" || rl.burstAllowance < 0)
      ) {
        errors.push({
          field: "rateLimit.burstAllowance",
          message: "burstAllowance must be a non-negative number",
        });
      }
    }
  }

  // categories (optional)
  if (m.categories !== undefined) {
    if (!Array.isArray(m.categories)) {
      errors.push({
        field: "categories",
        message: "categories must be an array of strings",
      });
    } else {
      for (const cat of m.categories) {
        if (typeof cat !== "string") {
          errors.push({
            field: "categories",
            message: "Each category must be a string",
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// APP STATUS AND REGISTRATION
// ============================================================================

/**
 * Possible states for a registered app.
 */
export type AppStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

/**
 * Installation status for an app within a workspace.
 */
export type AppInstallationStatus = "installed" | "disabled" | "uninstalled";

/**
 * Registered app record (persisted in the registry).
 */
export interface RegisteredApp {
  /** Internal registration ID */
  id: string;
  /** App manifest */
  manifest: AppManifest;
  /** Review/publication status */
  status: AppStatus;
  /** Client secret for OAuth flow (hashed in storage) */
  clientSecret: string;
  /** Who registered the app */
  registeredBy: string;
  /** Registration timestamp */
  registeredAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Rejection reason (if status === 'rejected') */
  rejectionReason?: string;
}

/**
 * App installation record (per workspace).
 */
export interface AppInstallation {
  /** Installation ID */
  id: string;
  /** Registered app ID */
  appId: string;
  /** Workspace where installed */
  workspaceId: string;
  /** Granted scopes (may be a subset of requested) */
  grantedScopes: AppScope[];
  /** Installation status */
  status: AppInstallationStatus;
  /** Who installed */
  installedBy: string;
  /** When installed */
  installedAt: string;
  /** When last updated */
  updatedAt: string;
}

// ============================================================================
// APP TOKENS
// ============================================================================

/**
 * Token types for app authentication.
 */
export type AppTokenType = "access_token" | "refresh_token";

/**
 * An issued app token.
 */
export interface AppToken {
  /** Token ID */
  id: string;
  /** The token value (only returned at creation, stored hashed) */
  token: string;
  /** Token type */
  type: AppTokenType;
  /** App ID */
  appId: string;
  /** Installation ID */
  installationId: string;
  /** Scopes this token grants */
  scopes: AppScope[];
  /** Expiration timestamp (ISO 8601) */
  expiresAt: string;
  /** When issued */
  issuedAt: string;
  /** Whether revoked */
  revoked: boolean;
  /** When revoked (if applicable) */
  revokedAt?: string;
}

/**
 * Token issuance request.
 */
export interface TokenRequest {
  /** App registration ID */
  appId: string;
  /** Client secret */
  clientSecret: string;
  /** Installation ID */
  installationId: string;
  /** Requested scopes (subset of granted) */
  scopes?: AppScope[];
}

/**
 * Token issuance response.
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  scopes: AppScope[];
}

// ============================================================================
// EVENT DELIVERY
// ============================================================================

/**
 * Event payload delivered to an app's webhook.
 */
export interface AppEventPayload {
  /** Unique delivery ID for dedup */
  deliveryId: string;
  /** Event type */
  event: AppEventType;
  /** Timestamp of the event */
  timestamp: string;
  /** App ID */
  appId: string;
  /** Installation ID */
  installationId: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Delivery status for tracking event delivery attempts.
 */
export type EventDeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "retrying";

/**
 * Event delivery record.
 */
export interface EventDeliveryRecord {
  /** Delivery ID */
  deliveryId: string;
  /** App ID */
  appId: string;
  /** Event type */
  event: AppEventType;
  /** Delivery status */
  status: EventDeliveryStatus;
  /** Number of attempts made */
  attempts: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** HTTP status code of last attempt */
  lastStatusCode?: number;
  /** Error from last attempt */
  lastError?: string;
  /** When first queued */
  createdAt: string;
  /** When next retry will happen */
  nextRetryAt?: string;
  /** When delivered or permanently failed */
  completedAt?: string;
}

// ============================================================================
// SANDBOX CONTEXT
// ============================================================================

/**
 * Execution context for an app, providing isolation guarantees.
 */
export interface AppSandboxContext {
  /** App ID */
  appId: string;
  /** Installation ID */
  installationId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Granted scopes for this context */
  scopes: AppScope[];
  /** Rate limit state */
  rateLimitRemaining: number;
  /** Rate limit reset timestamp */
  rateLimitReset: string;
}

/**
 * Create a sandbox context from an installation and token.
 */
export function createSandboxContext(
  installation: AppInstallation,
  token: AppToken,
  rateLimitRemaining: number,
  rateLimitReset: string,
): AppSandboxContext {
  return {
    appId: installation.appId,
    installationId: installation.id,
    workspaceId: installation.workspaceId,
    scopes: token.scopes,
    rateLimitRemaining,
    rateLimitReset,
  };
}
