/**
 * Purpose:    Runtime feature detection for the LiveKit-backed surfaces (calls / meetings /
 *             streams). Mirrors the legacy `nchatBundle.livekit` / NEXT_PUBLIC_LIVEKIT_URL
 *             gate so the pages render an upsell CTA instead of attempting a connection when
 *             the nChat-bundle livekit plugin is absent (PRI Feature-Detection hard rule).
 * Inputs:     import.meta.env.VITE_LIVEKIT_URL (Vite env; was NEXT_PUBLIC_LIVEKIT_URL).
 * Outputs:    hasLiveKit (boolean), liveKitUrl (string | null).
 * Constraints:Always runtime — never assume Pro is available. Buttons/pages hide gracefully;
 *             the app never hard-crashes without a license.
 * Usage:      import { hasLiveKit } from '@/components/calls/livekit-feature'
 * SOT:        F-NCHAT-VITE-CALLS-LIVEKIT-01
 */
export const liveKitUrl: string | null =
  (import.meta.env.VITE_LIVEKIT_URL as string | undefined) ?? null

export const hasLiveKit: boolean = liveKitUrl != null && liveKitUrl.length > 0
