/**
 * Validation Utilities
 *
 * Helper functions for validating request data using Zod schemas.
 *
 * @module lib/validation/validate
 */

import { z, ZodError } from "zod";
import { NextRequest } from "next/server";
import { ApiError, ValidationError } from "@/lib/api/middleware";

// ============================================================================
// Types
// ============================================================================

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationFailure {
  success: false;
  errors: Record<string, string[]>;
}

// ============================================================================
// Core Validation
// ============================================================================

/**
 * Validate data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with data or errors
 *
 * @example
 * ```typescript
 * const result = validate(signInSchema, body)
 * if (!result.success) {
 *   return badRequestResponse('Validation failed', 'VALIDATION_ERROR', result.errors)
 * }
 * const { email, password } = result.data
 * ```
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> | ValidationFailure {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};

      for (const issue of error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(issue.message);
      }

      return { success: false, errors };
    }

    // Unexpected error
    throw error;
  }
}

/**
 * Validate data and throw ValidationError on failure
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const { email, password } = validateOrThrow(signInSchema, body)
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     return badRequestResponse('Validation failed', 'VALIDATION_ERROR', error.errors)
 *   }
 * }
 * ```
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validate(schema, data);

  if (!result.success) {
    throw new ValidationError(result.errors);
  }

  return result.data;
}

// ============================================================================
// Request Body Validation
// ============================================================================

/**
 * Validate request body against a Zod schema
 *
 * @param request - NextRequest to validate
 * @param schema - Zod schema to validate against
 * @returns Validated data
 * @throws ApiError if JSON is invalid
 * @throws ValidationError if validation fails
 *
 * @example
 * ```typescript
 * async function POST(request: NextRequest) {
 *   const body = await validateRequestBody(request, signInSchema)
 *   // body is now typed and validated
 * }
 * ```
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError("Invalid JSON body", "INVALID_JSON", 400);
  }

  return validateOrThrow(schema, body);
}

// ============================================================================
// Query Parameter Validation
// ============================================================================

/**
 * Validate query parameters against a Zod schema
 *
 * @param request - NextRequest to validate
 * @param schema - Zod schema to validate against
 * @returns Validated data
 * @throws ValidationError if validation fails
 *
 * @example
 * ```typescript
 * const querySchema = z.object({
 *   page: z.coerce.number().int().positive().default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 * })
 *
 * async function GET(request: NextRequest) {
 *   const query = await validateQueryParams(request, querySchema)
 *   // query.page and query.limit are typed and validated
 * }
 * ```
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): T {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // Multiple values for same key
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }

  return validateOrThrow(schema, params);
}

// ============================================================================
// Path Parameter Validation
// ============================================================================

/**
 * Validate path parameters against a Zod schema
 *
 * @param params - Path parameters from route context
 * @param schema - Zod schema to validate against
 * @returns Validated data
 * @throws ValidationError if validation fails
 *
 * @example
 * ```typescript
 * const paramsSchema = z.object({
 *   id: z.string().uuid(),
 * })
 *
 * async function GET(
 *   request: NextRequest,
 *   context: { params: { id: string } }
 * ) {
 *   const params = validatePathParams(context.params, paramsSchema)
 *   // params.id is typed and validated as UUID
 * }
 * ```
 */
export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<T>,
): T {
  return validateOrThrow(schema, params);
}

// ============================================================================
// Sanitization Utilities
// ============================================================================

/**
 * Sanitize HTML to prevent XSS attacks
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  return (
    html
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      // Remove event handlers
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "")
      // Remove javascript: protocol
      .replace(/href="javascript:[^"]*"/gi, 'href="#"')
      .replace(/src="javascript:[^"]*"/gi, "")
  );
}

/**
 * Sanitize SQL to prevent SQL injection
 *
 * @param sql - SQL string to sanitize
 * @returns Sanitized SQL
 */
export function sanitizeSql(sql: string): string {
  return (
    sql
      // Escape single quotes
      .replace(/'/g, "''")
      // Remove SQL comments
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
  );
}

/**
 * Validate and sanitize filename
 *
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return (
    filename
      // Replace invalid characters with underscores
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      // Remove leading/trailing dots and spaces
      .replace(/^[.\s]+|[.\s]+$/g, "")
      // Limit length
      .substring(0, 255)
  );
}

/**
 * Validate and sanitize URL
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid email
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Check if value is a valid UUID
 */
export function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Check if value is a valid URL
 */
export function isUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid hex color
 */
export function isHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
