/**
 * nChat Bundle Plugin Detection
 *
 * The nChat pro bundle ships 7 plugins (chat, livekit, recording, moderation,
 * bots, realtime, auth). Each plugin contributes a public env var consumed by
 * the frontend. Absent env vars mean the plugin is not installed — the feature
 * hides gracefully rather than crashing.
 *
 * Reference: `nchat/backend/.env.example` — nChat Bundle section.
 */

export type NChatPlugin =
  | 'chat'
  | 'livekit'
  | 'recording'
  | 'moderation'
  | 'bots'
  | 'realtime'
  | 'auth'

export const NCHAT_BUNDLE_PLUGINS: readonly NChatPlugin[] = [
  'chat',
  'livekit',
  'recording',
  'moderation',
  'bots',
  'realtime',
  'auth',
] as const

/**
 * Runtime plugin availability — true when the plugin's env var is present.
 *
 * Note: these expressions are inlined at build time by Next.js. Do NOT replace
 * them with a dynamic `process.env[key]` — that returns undefined in the
 * browser. Keep each check as an explicit access to the named env var.
 */
export const nchatBundle = {
  chat: process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true',
  livekit: process.env.NEXT_PUBLIC_LIVEKIT_URL != null && process.env.NEXT_PUBLIC_LIVEKIT_URL !== '',
  recording: process.env.NEXT_PUBLIC_RECORDING_ENABLED === 'true',
  moderation: process.env.NEXT_PUBLIC_MODERATION_ENABLED === 'true',
  bots: process.env.NEXT_PUBLIC_BOTS_ENABLED === 'true',
  realtime:
    process.env.NEXT_PUBLIC_REALTIME_URL != null && process.env.NEXT_PUBLIC_REALTIME_URL !== '',
  auth: process.env.NEXT_PUBLIC_AUTH_SSO_ENABLED === 'true',
} as const

export function isPluginInstalled(plugin: NChatPlugin): boolean {
  return nchatBundle[plugin]
}

export function installedPlugins(): NChatPlugin[] {
  return NCHAT_BUNDLE_PLUGINS.filter((p) => nchatBundle[p])
}

/**
 * Bundle completeness — all 7 plugins present. Indicates full nChat bundle
 * activation via a Basic+ membership key.
 */
export function isFullBundleInstalled(): boolean {
  return NCHAT_BUNDLE_PLUGINS.every((p) => nchatBundle[p])
}

/**
 * Missing plugins — useful for admin UI "complete your bundle" nudges.
 */
export function missingPlugins(): NChatPlugin[] {
  return NCHAT_BUNDLE_PLUGINS.filter((p) => !nchatBundle[p])
}
