/**
 * Forward Library
 *
 * State management and hooks for message forwarding in nself-chat.
 *
 * @example
 * ```tsx
 * import { useForward, useForwardStore, FEATURES } from '@/lib/forward'
 *
 * function MessageActions({ message }) {
 *   const { openForwardModal, canForward } = useForward()
 *
 *   if (!canForward) return null
 *
 *   return (
 *     <button onClick={() => openForwardModal(message)}>
 *       Forward
 *     </button>
 *   )
 * }
 * ```
 */

// Store
export {
  useForwardStore,
  type ForwardStore,
  type ForwardState,
  type ForwardActions,
  type ForwardDestination,
  type ForwardMessage,
  type ForwardRequest,
  type ForwardResult,
  type DestinationType,
  // Selectors
  selectIsOpen,
  selectMessageToForward,
  selectSelectedDestinations,
  selectSelectedCount,
  selectIsDestinationSelected,
  selectComment,
  selectRecentDestinations,
  selectIsForwarding,
  selectForwardResults,
  selectHasSuccessfulForwards,
  selectHasFailedForwards,
  selectSearchQuery,
  selectCanForward,
} from "./forward-store";

// Hooks
export {
  useForward,
  useQuickForward,
  type UseForwardOptions,
  type UseForwardReturn,
} from "./use-forward";
