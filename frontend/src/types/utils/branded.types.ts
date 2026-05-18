/**
 * Branded Types for nself-chat
 *
 * Branded/opaque types provide compile-time type safety for string IDs
 * and other primitive values that should not be interchangeable.
 */

// ============================================================================
// Brand Symbol
// ============================================================================

/**
 * Unique brand symbol for creating branded types.
 * Using a unique symbol ensures types are incompatible at compile time.
 */
declare const __brand: unique symbol;

/**
 * Brand type definition.
 * Adds a phantom brand property to a type for nominal typing.
 */
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// ============================================================================
// ID Branded Types
// ============================================================================

/**
 * Branded UUID type for user IDs.
 * Prevents accidentally using a channel ID where a user ID is expected.
 */
export type UserId = Brand<string, "UserId">;

/**
 * Branded UUID type for channel IDs.
 */
export type ChannelId = Brand<string, "ChannelId">;

/**
 * Branded UUID type for message IDs.
 */
export type MessageId = Brand<string, "MessageId">;

/**
 * Branded UUID type for thread IDs.
 */
export type ThreadId = Brand<string, "ThreadId">;

/**
 * Branded UUID type for workspace IDs.
 */
export type WorkspaceId = Brand<string, "WorkspaceId">;

/**
 * Branded UUID type for category IDs.
 */
export type CategoryId = Brand<string, "CategoryId">;

/**
 * Branded UUID type for role IDs.
 */
export type RoleId = Brand<string, "RoleId">;

/**
 * Branded UUID type for attachment IDs.
 */
export type AttachmentId = Brand<string, "AttachmentId">;

/**
 * Branded UUID type for reaction IDs.
 */
export type ReactionId = Brand<string, "ReactionId">;

/**
 * Branded UUID type for notification IDs.
 */
export type NotificationId = Brand<string, "NotificationId">;

/**
 * Branded UUID type for subscription IDs.
 */
export type SubscriptionId = Brand<string, "SubscriptionId">;

/**
 * Branded UUID type for plan IDs.
 */
export type PlanId = Brand<string, "PlanId">;

/**
 * Branded UUID type for invoice IDs.
 */
export type InvoiceId = Brand<string, "InvoiceId">;

/**
 * Branded UUID type for webhook IDs.
 */
export type WebhookId = Brand<string, "WebhookId">;

/**
 * Branded UUID type for bot IDs.
 */
export type BotId = Brand<string, "BotId">;

/**
 * Branded UUID type for session IDs.
 */
export type SessionId = Brand<string, "SessionId">;

/**
 * Branded UUID type for audit log IDs.
 */
export type AuditLogId = Brand<string, "AuditLogId">;

// ============================================================================
// Code/Token Branded Types
// ============================================================================

/**
 * Branded type for invite codes.
 */
export type InviteCode = Brand<string, "InviteCode">;

/**
 * Branded type for webhook tokens.
 */
export type WebhookToken = Brand<string, "WebhookToken">;

/**
 * Branded type for API keys.
 */
export type ApiKey = Brand<string, "ApiKey">;

/**
 * Branded type for JWT access tokens.
 */
export type AccessToken = Brand<string, "AccessToken">;

/**
 * Branded type for JWT refresh tokens.
 */
export type RefreshToken = Brand<string, "RefreshToken">;

// ============================================================================
// String Format Branded Types
// ============================================================================

/**
 * Branded type for email addresses.
 */
export type Email = Brand<string, "Email">;

/**
 * Branded type for URLs.
 */
export type Url = Brand<string, "Url">;

/**
 * Branded type for URL slugs.
 */
export type Slug = Brand<string, "Slug">;

/**
 * Branded type for usernames.
 */
export type Username = Brand<string, "Username">;

/**
 * Branded type for ISO 8601 date strings.
 */
export type ISODateString = Brand<string, "ISODateString">;

/**
 * Branded type for hex color strings.
 */
export type HexColor = Brand<string, "HexColor">;

/**
 * Branded type for IANA timezone strings.
 */
export type Timezone = Brand<string, "Timezone">;

/**
 * Branded type for locale/language codes.
 */
export type Locale = Brand<string, "Locale">;

/**
 * Branded type for MIME types.
 */
export type MimeType = Brand<string, "MimeType">;

// ============================================================================
// Numeric Branded Types
// ============================================================================

/**
 * Branded type for positive integers.
 */
export type PositiveInt = Brand<number, "PositiveInt">;

/**
 * Branded type for non-negative integers.
 */
export type NonNegativeInt = Brand<number, "NonNegativeInt">;

/**
 * Branded type for percentage values (0-100).
 */
export type Percentage = Brand<number, "Percentage">;

/**
 * Branded type for Unix timestamps (seconds).
 */
export type UnixTimestamp = Brand<number, "UnixTimestamp">;

/**
 * Branded type for Unix timestamps (milliseconds).
 */
export type UnixTimestampMs = Brand<number, "UnixTimestampMs">;

/**
 * Branded type for byte counts.
 */
export type Bytes = Brand<number, "Bytes">;

/**
 * Branded type for duration in seconds.
 */
export type DurationSeconds = Brand<number, "DurationSeconds">;

/**
 * Branded type for duration in milliseconds.
 */
export type DurationMs = Brand<number, "DurationMs">;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a UserId from a string.
 * @throws Error if the string is not a valid UUID.
 */
export function createUserId(id: string): UserId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid UserId: ${id}`);
  }
  return id as UserId;
}

/**
 * Create a ChannelId from a string.
 */
export function createChannelId(id: string): ChannelId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ChannelId: ${id}`);
  }
  return id as ChannelId;
}

/**
 * Create a MessageId from a string.
 */
export function createMessageId(id: string): MessageId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid MessageId: ${id}`);
  }
  return id as MessageId;
}

/**
 * Create a ThreadId from a string.
 */
export function createThreadId(id: string): ThreadId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ThreadId: ${id}`);
  }
  return id as ThreadId;
}

/**
 * Create a WorkspaceId from a string.
 */
export function createWorkspaceId(id: string): WorkspaceId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid WorkspaceId: ${id}`);
  }
  return id as WorkspaceId;
}

/**
 * Create an Email from a string.
 * @throws Error if the string is not a valid email.
 */
export function createEmail(email: string): Email {
  if (!isValidEmail(email)) {
    throw new Error(`Invalid Email: ${email}`);
  }
  return email.toLowerCase() as Email;
}

/**
 * Create a Url from a string.
 * @throws Error if the string is not a valid URL.
 */
export function createUrl(url: string): Url {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }
  return url as Url;
}

/**
 * Create a Slug from a string.
 * @throws Error if the string is not a valid slug.
 */
export function createSlug(slug: string): Slug {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid Slug: ${slug}`);
  }
  return slug.toLowerCase() as Slug;
}

/**
 * Create a Username from a string.
 * @throws Error if the string is not a valid username.
 */
export function createUsername(username: string): Username {
  if (!isValidUsername(username)) {
    throw new Error(`Invalid Username: ${username}`);
  }
  return username.toLowerCase() as Username;
}

/**
 * Create an ISODateString from a Date or string.
 */
export function createISODateString(date: Date | string): ISODateString {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return d.toISOString() as ISODateString;
}

/**
 * Create a HexColor from a string.
 * @throws Error if the string is not a valid hex color.
 */
export function createHexColor(color: string): HexColor {
  if (!isValidHexColor(color)) {
    throw new Error(`Invalid HexColor: ${color}`);
  }
  return color.toLowerCase() as HexColor;
}

/**
 * Create a PositiveInt from a number.
 * @throws Error if the number is not a positive integer.
 */
export function createPositiveInt(n: number): PositiveInt {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid PositiveInt: ${n}`);
  }
  return n as PositiveInt;
}

/**
 * Create a NonNegativeInt from a number.
 * @throws Error if the number is not a non-negative integer.
 */
export function createNonNegativeInt(n: number): NonNegativeInt {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid NonNegativeInt: ${n}`);
  }
  return n as NonNegativeInt;
}

/**
 * Create a Percentage from a number.
 * @throws Error if the number is not between 0 and 100.
 */
export function createPercentage(n: number): Percentage {
  if (n < 0 || n > 100) {
    throw new Error(`Invalid Percentage: ${n}`);
  }
  return n as Percentage;
}

// ============================================================================
// Unsafe Factory Functions (No Validation)
// ============================================================================

/**
 * Unsafe: Create a UserId without validation.
 * Use only when you know the value is valid (e.g., from database).
 */
export function unsafeUserId(id: string): UserId {
  return id as UserId;
}

/**
 * Unsafe: Create a ChannelId without validation.
 */
export function unsafeChannelId(id: string): ChannelId {
  return id as ChannelId;
}

/**
 * Unsafe: Create a MessageId without validation.
 */
export function unsafeMessageId(id: string): MessageId {
  return id as MessageId;
}

/**
 * Unsafe: Create an Email without validation.
 */
export function unsafeEmail(email: string): Email {
  return email as Email;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * UUID v4 regex pattern.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email regex pattern.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hex color regex pattern.
 */
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Slug regex pattern.
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Username regex pattern.
 */
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

/**
 * Validate UUID format.
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate email format.
 */
export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

/**
 * Validate URL format.
 */
export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hex color format.
 */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value);
}

/**
 * Validate slug format.
 */
export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value.toLowerCase());
}

/**
 * Validate username format.
 */
export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value.toLowerCase());
}

// ============================================================================
// Type Extractors
// ============================================================================

/**
 * Extract the raw type from a branded type.
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

/**
 * Extract the brand name from a branded type.
 */
export type BrandOf<T> = T extends Brand<unknown, infer B> ? B : never;
