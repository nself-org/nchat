/**
 * Input Validation & Sanitization
 *
 * Centralized validation and sanitization utilities to prevent injection attacks
 */

import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

// =============================================================================
// Common Validation Schemas
// =============================================================================

/**
 * Username validation (alphanumeric, underscore, hyphen)
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens",
  );

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be at most 255 characters");

/**
 * Password validation (strong password requirements)
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character",
  );

/**
 * Channel name validation
 */
export const channelNameSchema = z
  .string()
  .min(1, "Channel name is required")
  .max(80, "Channel name must be at most 80 characters")
  .regex(
    /^[a-zA-Z0-9_-\s]+$/,
    "Channel name can only contain letters, numbers, spaces, underscores, and hyphens",
  );

/**
 * Message content validation
 */
export const messageContentSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(10000, "Message must be at most 10,000 characters");

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(2048, "URL must be at most 2048 characters");

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid("Invalid UUID");

/**
 * Hex color validation
 */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color (must be #RRGGBB)");

/**
 * File size validation (bytes)
 */
export const fileSizeSchema = z
  .number()
  .int()
  .positive()
  .max(100 * 1024 * 1024, "File size must be at most 100MB");

/**
 * MIME type validation (allowlist)
 */
export const mimeTypeSchema = z.enum([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",

  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",

  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

// =============================================================================
// Sanitization Functions
// =============================================================================

/**
 * Sanitize HTML content (remove dangerous tags and attributes)
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text (escape HTML entities)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize filename (remove path traversal attempts)
 */
export function sanitizeFilename(filename: string): string {
  // Remove separators and invalid chars first, then remove .. iteratively.
  // Removing .. before special chars is wrong: ".:../" → remove / → ".:..." →
  // remove .. → ".:." → remove : → ".." (bypass). Iterate until stable.
  let result = filename
    .replace(/[/\\]/g, "") // Remove path separators
    .replace(/[<>:"|?*]/g, "") // Remove invalid filename characters
    .trim();
  // Remove .. iteratively until stable (other removals can expose new .. sequences)
  while (result.includes("..")) {
    result = result.replace(/\.\./g, "");
  }
  return result;
}

/**
 * Sanitize URL (ensure it's a valid HTTP(S) URL)
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow HTTP(S)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    // Block localhost/private IPs in production
    if (process.env.NODE_ENV === "production") {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.16.")
      ) {
        return null;
      }
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  try {
    emailSchema.parse(email);
    return email.toLowerCase().trim();
  } catch {
    return null;
  }
}

// =============================================================================
// SQL Injection Prevention
// =============================================================================

/**
 * Escape SQL LIKE pattern (for PostgreSQL)
 */
export function escapeLikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Validate table/column name (prevent SQL injection)
 */
export function validateIdentifier(identifier: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

// =============================================================================
// NoSQL Injection Prevention
// =============================================================================

/**
 * Sanitize MongoDB query (remove dangerous operators)
 */
export function sanitizeMongoQuery(
  query: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    // Remove keys starting with $ (operators)
    if (key.startsWith("$")) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMongoQuery(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// =============================================================================
// Command Injection Prevention
// =============================================================================

/**
 * Validate shell argument (prevent command injection)
 */
export function validateShellArg(arg: string): boolean {
  // Only allow alphanumeric, underscore, hyphen, dot, slash
  return /^[a-zA-Z0-9_.\/-]+$/.test(arg);
}

/**
 * Escape shell argument (for use in shell commands)
 */
export function escapeShellArg(arg: string): string {
  // Wrap in single quotes and escape existing single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// =============================================================================
// Validation Helper
// =============================================================================

/**
 * Generic validation function with detailed errors
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      };
    }
    return {
      success: false,
      errors: ["Validation failed"],
    };
  }
}
