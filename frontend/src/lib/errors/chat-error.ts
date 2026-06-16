/**
 * ChatError — discriminated union for all chat-surface failures.
 *
 * Purpose: Typed error taxonomy covering every failure mode in the nchat UI.
 *          Callers switch on `type` for exhaustive, user-visible messages.
 * Inputs:  Constructed via `chatError(type, message, details?)`.
 * Outputs: ChatError object with distinct `type` + `userMessage` per variant.
 * Constraints: Six mandatory types per spec; extend here, never inline ad-hoc strings.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: typed errors: complete
 */

// =============================================================================
// Discriminated Union
// =============================================================================

/** All valid ChatError variant types. */
export type ChatErrorType =
  | "network"
  | "auth"
  | "rate_limit"
  | "e2ee_failure"
  | "livekit_error"
  | "bot_error";

/**
 * ChatError — typed discriminated union for chat surface errors.
 * Use `type` for exhaustive switch; `userMessage` for UI display.
 */
export interface ChatError {
  /** Discriminant — switch on this for exhaustive handling. */
  readonly type: ChatErrorType;
  /** Human-readable message safe for display to the end user. */
  readonly userMessage: string;
  /** Internal technical detail — do not display; use for logging only. */
  readonly detail?: string;
  /** Milliseconds to wait before a retry is allowed (rate_limit only). */
  readonly retryAfterMs?: number;
}

// =============================================================================
// Per-variant user messages (canonical wording)
// =============================================================================

const USER_MESSAGES: Record<ChatErrorType, string> = {
  network:
    "Connection lost. Check your network and try again.",
  auth:
    "Your session has expired. Please sign in again.",
  rate_limit:
    "You're sending messages too quickly. Please slow down.",
  e2ee_failure:
    "End-to-end encryption error. The message could not be encrypted or decrypted.",
  livekit_error:
    "Call connection failed. Please try again or check your audio/video permissions.",
  bot_error:
    "The bot failed to respond. Check the webhook URL and try again.",
};

// =============================================================================
// Constructor
// =============================================================================

/**
 * Create a typed ChatError.
 *
 * @param type     — discriminant variant
 * @param detail   — internal technical message (not shown to users)
 * @param overrides — optional field overrides (e.g. custom userMessage, retryAfterMs)
 */
export function chatError(
  type: ChatErrorType,
  detail?: string,
  overrides?: Partial<Omit<ChatError, "type">>,
): ChatError {
  return {
    type,
    userMessage: USER_MESSAGES[type],
    detail,
    ...overrides,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

export function isChatError(value: unknown): value is ChatError {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as ChatError).type === "string" &&
    "userMessage" in value
  );
}

export function isChatErrorType(
  value: unknown,
  type: ChatErrorType,
): value is ChatError {
  return isChatError(value) && value.type === type;
}

// =============================================================================
// Result integration helper
// =============================================================================

/**
 * Narrow an unknown thrown value to a ChatError.
 * Falls back to a `network` error if not recognisable.
 */
export function asChatError(raw: unknown): ChatError {
  if (isChatError(raw)) return raw;
  const detail =
    raw instanceof Error ? raw.message : String(raw);
  return chatError("network", detail);
}
