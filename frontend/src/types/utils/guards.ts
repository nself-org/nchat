/**
 * Type Guards for nself-chat
 *
 * Runtime type guard functions for narrowing types safely.
 * Use these guards to validate unknown data at runtime.
 */

import type { Message, MessageType } from "../message";
import type {
  Channel,
  ChannelType,
  DirectMessageChannel,
  GroupDMChannel,
} from "../channel";
import type { User, UserRole, UserPresenceStatus } from "../user";
import type { Notification, NotificationType } from "../notification";
import type { ApiErrorResponse, FieldError } from "../api/error.types";

// ============================================================================
// Primitive Type Guards
// ============================================================================

/**
 * Check if value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Check if value is a number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Check if value is a finite number.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value);
}

/**
 * Check if value is an integer.
 */
export function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Check if value is a positive number.
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a non-negative number.
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * Check if value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Check if value is null.
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is undefined.
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if value is null or undefined.
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is defined (not null or undefined).
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a function.
 */
export function isFunction(
  value: unknown,
): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Check if value is a symbol.
 */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === "symbol";
}

/**
 * Check if value is a bigint.
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === "bigint";
}

// ============================================================================
// Object Type Guards
// ============================================================================

/**
 * Check if value is an object (not null, not array).
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a plain object (not a class instance).
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is an array of a specific type.
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

/**
 * Check if value is a non-empty array.
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a Date object.
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid Date string (ISO 8601).
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Check if value is a Promise.
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) && isFunction((value as Record<string, unknown>).then))
  );
}

/**
 * Check if value is an Error.
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// ============================================================================
// String Format Guards
// ============================================================================

/**
 * UUID regex pattern.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if value is a valid UUID.
 */
export function isUUID(value: unknown): value is string {
  return isString(value) && UUID_REGEX.test(value);
}

/**
 * Email regex pattern.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Check if value is a valid email.
 */
export function isEmail(value: unknown): value is string {
  return isString(value) && EMAIL_REGEX.test(value);
}

/**
 * Check if value is a valid URL.
 */
export function isURL(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hex color regex pattern.
 */
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Check if value is a valid hex color.
 */
export function isHexColor(value: unknown): value is string {
  return isString(value) && HEX_COLOR_REGEX.test(value);
}

/**
 * Slug regex pattern.
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Check if value is a valid slug.
 */
export function isSlug(value: unknown): value is string {
  return isString(value) && SLUG_REGEX.test(value.toLowerCase());
}

// ============================================================================
// Domain Type Guards
// ============================================================================

/**
 * Valid user roles.
 */
const USER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "moderator",
  "member",
  "guest",
];

/**
 * Check if value is a valid user role.
 */
export function isUserRole(value: unknown): value is UserRole {
  return isString(value) && USER_ROLES.includes(value as UserRole);
}

/**
 * Valid presence statuses.
 */
const PRESENCE_STATUSES: UserPresenceStatus[] = [
  "online",
  "away",
  "dnd",
  "offline",
];

/**
 * Check if value is a valid presence status.
 */
export function isPresenceStatus(value: unknown): value is UserPresenceStatus {
  return (
    isString(value) && PRESENCE_STATUSES.includes(value as UserPresenceStatus)
  );
}

/**
 * Valid channel types.
 */
const CHANNEL_TYPES: ChannelType[] = [
  "public",
  "private",
  "direct",
  "group_dm",
];

/**
 * Check if value is a valid channel type.
 */
export function isChannelType(value: unknown): value is ChannelType {
  return isString(value) && CHANNEL_TYPES.includes(value as ChannelType);
}

/**
 * Check if channel is a direct message.
 */
export function isDirectMessageChannel(
  channel: any,
): channel is DirectMessageChannel {
  return channel?.type === "direct" && "participant" in (channel || {});
}

/**
 * Check if channel is a group DM.
 */
export function isGroupDMChannel(channel: any): channel is GroupDMChannel {
  return channel?.type === "group_dm" && "participants" in (channel || {});
}

/**
 * Check if channel is a DM (direct or group).
 */
export function isDMChannel(
  channel: any,
): channel is DirectMessageChannel | GroupDMChannel {
  return channel?.type === "direct" || channel?.type === "group_dm";
}

/**
 * System message types.
 */
const SYSTEM_MESSAGE_TYPES: MessageType[] = [
  "system",
  "user_joined",
  "user_left",
  "user_added",
  "user_removed",
  "user_banned",
  "channel_created",
  "channel_renamed",
  "channel_archived",
  "topic_changed",
  "description_changed",
  "icon_changed",
  "message_pinned",
  "message_unpinned",
  "call_started",
  "call_ended",
  "call_missed",
  "thread_created",
];

/**
 * Check if message is a system message.
 */
export function isSystemMessage(message: Message): boolean {
  return SYSTEM_MESSAGE_TYPES.includes(message.type);
}

/**
 * Check if message has attachments.
 */
export function hasAttachments(message: Message): boolean {
  return !!(message.attachments && message.attachments.length > 0);
}

/**
 * Check if message has reactions.
 */
export function hasReactions(message: Message): boolean {
  return !!(message.reactions && message.reactions.length > 0);
}

/**
 * Check if message has a thread.
 */
export function hasThread(message: Message): boolean {
  return !!(message.threadInfo && message.threadInfo.replyCount > 0);
}

/**
 * Check if message is a reply.
 */
export function isReply(message: Message): boolean {
  return !!message.replyToId;
}

// ============================================================================
// API Response Guards
// ============================================================================

/**
 * Check if response is an API error.
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    isObject(response) &&
    "success" in response &&
    response.success === false &&
    "error" in response &&
    isObject(response.error)
  );
}

/**
 * Check if value is a field error.
 */
export function isFieldError(value: unknown): value is FieldError {
  return (
    isObject(value) &&
    "field" in value &&
    isString(value.field) &&
    "message" in value &&
    isString(value.message)
  );
}

/**
 * Check if value has field errors.
 */
export function hasFieldErrors(
  error: unknown,
): error is { fieldErrors: FieldError[] } {
  return (
    isObject(error) &&
    "fieldErrors" in error &&
    isArrayOf(error.fieldErrors, isFieldError)
  );
}

// ============================================================================
// User Guards
// ============================================================================

/**
 * Check if value is a valid user object.
 */
export function isUser(value: unknown): value is User {
  return (
    isObject(value) &&
    "id" in value &&
    isUUID(value.id) &&
    "email" in value &&
    isEmail(value.email) &&
    "displayName" in value &&
    isString(value.displayName)
  );
}

/**
 * Check if user has admin privileges.
 */
export function isAdmin(user: User): boolean {
  return user.role === "owner" || user.role === "admin";
}

/**
 * Check if user has moderator privileges.
 */
export function isModerator(user: User): boolean {
  return (
    user.role === "owner" || user.role === "admin" || user.role === "moderator"
  );
}

/**
 * Check if user is active.
 */
export function isActiveUser(user: User): boolean {
  return user.isActive && !user.isBot;
}

/**
 * Check if user is online.
 */
export function isOnline(user: User): boolean {
  return user.presence?.status === "online";
}

// ============================================================================
// Notification Guards
// ============================================================================

/**
 * Valid notification types.
 */
const NOTIFICATION_TYPES: NotificationType[] = [
  "mention",
  "direct_message",
  "reply",
  "thread_reply",
  "reaction",
  "channel_invite",
  "channel_join",
  "channel_leave",
  "channel_update",
  "follow",
  "user_join",
  "system",
  "announcement",
  "security_alert",
  "integration",
  "bot",
  "webhook",
];

/**
 * Check if value is a valid notification type.
 */
export function isNotificationType(value: unknown): value is NotificationType {
  return (
    isString(value) && NOTIFICATION_TYPES.includes(value as NotificationType)
  );
}

/**
 * Check if notification is unread.
 */
export function isUnreadNotification(notification: Notification): boolean {
  return notification.status === "unread";
}

/**
 * Check if notification is high priority.
 */
export function isHighPriorityNotification(
  notification: Notification,
): boolean {
  return notification.priority === "high" || notification.priority === "urgent";
}

// ============================================================================
// Generic Guards
// ============================================================================

/**
 * Create a type guard for an object with specific keys.
 */
export function hasKeys<K extends string>(
  value: unknown,
  keys: K[],
): value is Record<K, unknown> {
  if (!isObject(value)) return false;
  return keys.every((key) => key in value);
}

/**
 * Create a type guard for an object with specific property types.
 */
export function hasShape<T extends Record<string, (v: unknown) => boolean>>(
  value: unknown,
  shape: T,
): value is {
  [K in keyof T]: T[K] extends (v: unknown) => v is infer U ? U : unknown;
} {
  if (!isObject(value)) return false;
  return Object.entries(shape).every(([key, guard]) => guard(value[key]));
}

/**
 * Type assertion function.
 * Throws if guard fails.
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string,
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(message || "Type assertion failed");
  }
}

/**
 * Type narrowing with default value.
 */
export function narrowOrDefault<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue: T,
): T {
  return guard(value) ? value : defaultValue;
}
