/**
 * Error narrowing utilities for `catch (e: unknown)` blocks.
 *
 * TypeScript's `strict` mode types caught values as `unknown`, not `Error` —
 * these helpers narrow safely instead of re-widening the catch variable back
 * to `any`, which is the pattern this module replaces across the codebase
 * (P6-E11-W2-S3-T17a: `: any` debt reduction).
 * @module utils/error
 */

/**
 * Extracts a human-readable message from an unknown caught value.
 * Falls back to `String(error)` for non-Error throws (strings, objects, etc).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Extracts the `name` of an unknown caught value, falling back to a generic
 * label for non-Error throws.
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  return "UnknownError";
}
