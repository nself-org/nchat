/**
 * RecordingConsentBanner — Recording consent overlay for nChat (S50-T14)
 *
 * Displays a consent dialog before any call recording session begins.
 * User must explicitly accept. Declining cancels the recording.
 *
 * Usage:
 *   <RecordingConsentBanner
 *     show={showConsent}
 *     onAccept={handleAccept}
 *     onDecline={handleDecline}
 *   />
 *
 * Legal context:
 *   - US all-party consent states (CA, FL, IL, etc.): all parties must consent.
 *   - EU GDPR: explicit consent required before recording personal conversations.
 *   - See: https://nself.org/legal/recording-consent
 */

import React from 'react'

interface RecordingConsentBannerProps {
  show: boolean
  onAccept: () => void
  onDecline: () => void
  /** Optional: name of the person initiating the recording (for clarity) */
  initiator?: string
}

export function RecordingConsentBanner({
  show,
  onAccept,
  onDecline,
  initiator,
}: RecordingConsentBannerProps) {
  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Call recording consent"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
        <div className="mb-4 text-center text-4xl" aria-hidden="true">
          🎙️
        </div>

        <h2 className="mb-3 text-center text-lg font-semibold text-white">
          This call is being recorded
        </h2>

        <p className="mb-2 text-center text-sm text-gray-400">
          {initiator
            ? `${initiator} has enabled call recording.`
            : 'This session will be recorded.'}
          {' '}You must consent before the call continues.
        </p>

        <p className="mb-6 text-center text-xs text-gray-500">
          <a
            href="https://nself.org/legal/recording-consent"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-300"
          >
            Recording Consent Policy
          </a>
          {' · '}
          <a
            href="https://nself.org/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-300"
          >
            Privacy Policy
          </a>
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-xl bg-[#6366f1] py-2.5 text-sm font-medium text-white hover:bg-[#4f46e5]"
          >
            I consent
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecordingConsentBanner
