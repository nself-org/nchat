/**
 * Poll Components Index
 *
 * Export all poll-related components for easy importing.
 *
 * @example
 * ```tsx
 * import {
 *   CreatePollModal,
 *   PollDisplay,
 *   PollResults,
 * } from '@/components/polls'
 * ```
 */

// Main components
export { CreatePollModal } from "./create-poll-modal";
export { PollDisplay } from "./poll-display";
export { PollOption, PollOptionCompact } from "./poll-option";
export { PollResults } from "./poll-results";
export { PollVotersModal } from "./poll-voters-modal";
export {
  PollSettings,
  PollSettingsInline,
  PollSettingsSummary,
} from "./poll-settings";

// Re-export types from the store for convenience
export type {
  Poll,
  PollOptionData,
  PollVote,
  PollSettings as PollSettingsType,
  PollUser,
} from "@/lib/polls/poll-store";
