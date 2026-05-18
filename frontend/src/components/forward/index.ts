/**
 * Forward Components
 *
 * Complete message forwarding system for nself-chat.
 * Includes modal, destination list, preview, and forwarded message display.
 *
 * @example
 * ```tsx
 * // Use the connected modal (recommended)
 * import { ConnectedForwardModal } from '@/components/forward'
 *
 * function App() {
 *   return <ConnectedForwardModal />
 * }
 *
 * // Or use individual components with custom state
 * import {
 *   ForwardMessageModal,
 *   ForwardDestinationList,
 *   ForwardedMessage,
 * } from '@/components/forward'
 * ```
 */

// Main modal
export {
  ForwardMessageModal,
  ConnectedForwardModal,
  type ForwardMessageModalProps,
  type ConnectedForwardModalProps,
} from "./forward-message-modal";

// Destination components
export {
  ForwardDestinationItem,
  ForwardDestinationItemSkeleton,
  type ForwardDestinationItemProps,
  type ForwardDestinationItemSkeletonProps,
} from "./forward-destination-item";

export {
  ForwardDestinationList,
  ForwardDestinationListSkeleton,
  type ForwardDestinationListProps,
} from "./forward-destination-list";

// Preview components
export { ForwardPreview, type ForwardPreviewProps } from "./forward-preview";

// Forwarded message display
export {
  ForwardedMessage,
  ForwardedMessageCompact,
  ForwardIndicator,
  type ForwardedMessageProps,
  type ForwardedMessageCompactProps,
  type ForwardIndicatorProps,
  type OriginalMessage,
  type ForwardedMessageUser,
  type ForwardedMessageChannel,
  type ForwardedMessageAttachment,
} from "./forwarded-message";
