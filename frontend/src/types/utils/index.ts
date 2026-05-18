/**
 * Type Utilities Index
 *
 * Central export file for all type utility functions and types.
 */

// ============================================================================
// Branded Types
// ============================================================================

export type {
  // ID types
  UserId,
  ChannelId,
  MessageId,
  ThreadId,
  WorkspaceId,
  CategoryId,
  RoleId,
  AttachmentId,
  ReactionId,
  NotificationId,
  SubscriptionId,
  PlanId,
  InvoiceId,
  WebhookId,
  BotId,
  SessionId,
  AuditLogId,
  // Code/token types
  InviteCode,
  WebhookToken,
  ApiKey,
  AccessToken,
  RefreshToken,
  // String format types
  Email,
  Url,
  Slug,
  Username,
  ISODateString,
  HexColor,
  Timezone,
  Locale,
  MimeType,
  // Numeric types
  PositiveInt,
  NonNegativeInt,
  Percentage,
  UnixTimestamp,
  UnixTimestampMs,
  Bytes,
  DurationSeconds,
  DurationMs,
  // Utility types
  Unbrand,
  BrandOf,
} from "./branded.types";

export {
  // Factory functions
  createUserId,
  createChannelId,
  createMessageId,
  createThreadId,
  createWorkspaceId,
  createEmail,
  createUrl,
  createSlug,
  createUsername,
  createISODateString,
  createHexColor,
  createPositiveInt,
  createNonNegativeInt,
  createPercentage,
  // Unsafe factory functions
  unsafeUserId,
  unsafeChannelId,
  unsafeMessageId,
  unsafeEmail,
  // Validation functions
  isValidUUID,
  isValidEmail,
  isValidUrl,
  isValidHexColor,
  isValidSlug,
  isValidUsername,
} from "./branded.types";

// ============================================================================
// Helper Types
// ============================================================================

export type {
  // Object types
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  DeepMutable,
  PartialBy,
  RequiredBy,
  NullableBy,
  Merge,
  PickByValue,
  OmitByValue,
  KeysOfType,
  ValueOf,
  Asyncify,
  // Array types
  ArrayElement,
  Tuple,
  Head,
  Tail,
  Last,
  Arrayify,
  NonEmptyArray,
  // Function types
  Params,
  Return,
  Await,
  TypedFunction,
  AsyncFunction,
  ThisType,
  // Union types
  UnionToIntersection,
  LastOfUnion,
  UnionToTuple,
  Strict,
  // String types
  SnakeToCamel,
  CamelToSnake,
  StringLiteral,
  // Conditional types
  If,
  IsEqual,
  IsAny,
  IsNever,
  IsUnknown,
  IsUnion,
  // Record types
  OptionalRecord,
  ReadonlyRecord,
  Dictionary,
  NumericDictionary,
  // Utility types
  RemoveIndex,
  Path,
  PathValue,
  // Assertion types
  AssertEqual,
  AssertExtends,
  AssertNotAny,
  // Nominal types
  Nominal,
  BaseType,
} from "./helpers.types";

// ============================================================================
// Type Guards
// ============================================================================

export {
  // Primitive guards
  isString,
  isNonEmptyString,
  isNumber,
  isFiniteNumber,
  isInteger,
  isPositiveNumber,
  isNonNegativeNumber,
  isBoolean,
  isNull,
  isUndefined,
  isNullish,
  isDefined,
  isFunction,
  isSymbol,
  isBigInt,
  // Object guards
  isObject,
  isPlainObject,
  isArray,
  isArrayOf,
  isNonEmptyArray,
  isDate,
  isDateString,
  isPromise,
  isError,
  // String format guards
  isUUID,
  isEmail,
  isURL,
  isHexColor,
  isSlug,
  // Domain guards
  isUserRole,
  isPresenceStatus,
  isChannelType,
  isDirectMessageChannel,
  isGroupDMChannel,
  isDMChannel,
  isSystemMessage,
  hasAttachments,
  hasReactions,
  hasThread,
  isReply,
  // API guards
  isApiError,
  isFieldError,
  hasFieldErrors,
  // User guards
  isUser,
  isAdmin,
  isModerator,
  isActiveUser,
  isOnline,
  // Notification guards
  isNotificationType,
  isUnreadNotification,
  isHighPriorityNotification,
  // Generic guards
  hasKeys,
  hasShape,
  assertType,
  narrowOrDefault,
} from "./guards";
