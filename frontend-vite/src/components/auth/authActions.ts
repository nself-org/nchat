/**
 * Purpose:    Typed client helpers for the ɳChat auth flows that are NOT covered by
 *             @nself/auth-core's login/logout/refresh (signup, password reset, magic
 *             link, email verification, 2FA backup, OAuth session completion). Each
 *             helper calls the documented nHost Auth REST surface / Hasura Action and
 *             returns Result<T, AppError> so callers render @nself/ui AsyncScreen states
 *             instead of throwing. Per P3 nchat-api-migration-tickets.md these targets are
 *             ACTION/BFF conversions; until the backend Action lands the call degrades to a
 *             typed Err the UI surfaces gracefully (backend_pending).
 * Inputs:     email/password/token/code strings per helper.
 * Outputs:    Promise<Result<T, AppError>> — never throws.
 * Constraints:No next/* imports. Cookie transport: credentials:'include'. No token stored
 *             in JS (cookie-based web strategy). Base URL from VITE_AUTH_URL.
 * SOT:        F-NCHAT-VITE-AUTH-ACTIONS-01
 */
import { ok, err, type Result, type AppError } from '@nself/errors'

const AUTH_BASE =
  (import.meta.env.VITE_AUTH_URL as string | undefined) ??
  'https://api.local.nself.org/v1/auth'

/** Map an unknown thrown/HTTP failure to a canonical AppError. */
function toAppError(status: number, message: string): AppError {
  if (status === 401) return { code: 'auth_failed', status: 401, message }
  if (status === 403) return { code: 'forbidden', status: 403, message }
  if (status === 404) return { code: 'not_found', status: 404, message }
  if (status === 422) return { code: 'validation_error', status: 422, message }
  if (status === 429) return { code: 'rate_limited', status: 429, message }
  return { code: 'internal', status: 500, message }
}

/** Network/parse failure → internal AppError carrying the original message. */
function networkError(e: unknown): AppError {
  const message =
    e instanceof Error ? e.message : 'A network error occurred. Please try again.'
  return { code: 'internal', status: 500, message }
}

interface PostOptions {
  /** HTTP method (default POST). */
  method?: 'POST' | 'PUT'
}

/**
 * POST/PUT JSON to an auth endpoint with cookie credentials.
 * Returns Ok(parsed body) on 2xx, Err(AppError) otherwise — never throws.
 */
async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  opts: PostOptions = {},
): Promise<Result<T, AppError>> {
  try {
    const res = await fetch(`${AUTH_BASE}${path}`, {
      method: opts.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (!res.ok) {
      const message =
        (data as { error?: { message?: string }; message?: string } | null)?.error
          ?.message ??
        (data as { message?: string } | null)?.message ??
        'Request failed. Please try again.'
      return err(toAppError(res.status, message))
    }

    return ok((data ?? {}) as T)
  } catch (e) {
    return err(networkError(e))
  }
}

// ─── Sign up ─────────────────────────────────────────────────────────────────

export interface SignUpInput {
  email: string
  password: string
  username: string
  displayName: string
}

/** Create a new account. Backend: nHost Auth signup Action (N-2-S3a, backend_pending). */
export function signUp(input: SignUpInput): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/signup/email-password', {
    email: input.email,
    password: input.password,
    options: { displayName: input.displayName, metadata: { username: input.username } },
  })
}

// ─── Password reset ──────────────────────────────────────────────────────────

/** Request a password-reset email. Backend: auth Action (N-2-S3a, backend_pending). */
export function requestPasswordReset(
  email: string,
): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/user/password/reset', { email })
}

/** Complete a password reset with a token. Backend: auth Action (N-2-S3a, backend_pending). */
export function resetPassword(
  token: string,
  newPassword: string,
): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/user/password', { ticket: token, newPassword }, {
    method: 'PUT',
  })
}

// ─── Magic link ──────────────────────────────────────────────────────────────

/** Send a passwordless magic link. Backend: auth Action (N-2-S3a, backend_pending). */
export function sendMagicLink(email: string): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/signin/passwordless/email', { email })
}

/** Verify a magic-link token. Backend: auth Action (N-2-S3a, backend_pending). */
export function verifyMagicLink(token: string): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/signin/passwordless/email/verify', { ticket: token })
}

// ─── Email verification ──────────────────────────────────────────────────────

/** Verify an email-confirmation token. Backend: auth Action (N-2-S3a, backend_pending). */
export function verifyEmail(
  token: string,
): Promise<Result<{ alreadyVerified?: boolean }, AppError>> {
  return postJson<{ alreadyVerified?: boolean }>('/user/email/verify', { ticket: token })
}

/** Resend the email-confirmation message. Backend: auth Action (N-2-S3a, backend_pending). */
export function resendVerification(
  email: string,
): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/user/email/send-verification-email', { email })
}

// ─── 2FA TOTP ────────────────────────────────────────────────────────────────

/** Verify a 6-digit TOTP code against the MFA ticket. Backend: auth Action (N-2-S3a). */
export function verifyTotp(
  ticket: string,
  code: string,
): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/mfa/totp', { ticket, otp: code })
}

// ─── 2FA backup code ─────────────────────────────────────────────────────────

/** Verify a 2FA backup code against the MFA ticket. Backend: auth Action (N-2-S3a). */
export function verifyBackupCode(
  ticket: string,
  backupCode: string,
): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/mfa/totp/recovery', {
    ticket,
    code: backupCode.replace(/\s+/g, ''),
  })
}

// ─── OAuth session completion ────────────────────────────────────────────────

/**
 * Complete an OAuth round-trip by exchanging the returned refresh token for a
 * cookie session. Backend: auth Action / BFF (N-2-S5, backend_pending).
 */
export function completeOAuth(
  refreshToken: string,
): Promise<Result<{ ok: true }, AppError>> {
  return postJson<{ ok: true }>('/token', { refreshToken })
}
