/**
 * Purpose:    Runtime feature/bundle detection for admin pages (PRI Hard Rule: always runtime,
 *             never assume Pro is available). Mirrors legacy `nchatBundle` / `useFeature` checks
 *             so bundle-gated admin pages (moderation, bots) render an upsell when the plugin
 *             env flag is absent, exactly like the Next.js app.
 * Inputs:     Vite import.meta.env flags (VITE_*_ENABLED) — string 'true' to enable.
 * Outputs:    boolean per feature. Buttons hide gracefully; app never hard-crashes.
 * Constraints:Read env at call time. Default = disabled (free tier) unless flag is 'true'.
 * SOT:        F-NCHAT-VITE-ADMIN-FEATURE-DETECT-01
 */

const env = import.meta.env as Record<string, string | undefined>

function flag(name: string): boolean {
  return env[name] === 'true'
}

/** Bundle/feature flags read from Vite env (runtime). */
export const nchatBundle = {
  get moderation() {
    return flag('VITE_MODERATION_ENABLED')
  },
  get bots() {
    return flag('VITE_BOTS_ENABLED')
  },
  get ai() {
    return flag('VITE_AI_ENABLED')
  },
  get analytics() {
    // Analytics is a free, always-available admin surface.
    return true
  },
  get billing() {
    return flag('VITE_BILLING_ENABLED')
  },
}
