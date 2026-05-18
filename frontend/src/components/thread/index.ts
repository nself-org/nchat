// Thread Components
// Export all thread-related components for the nself-chat application

// Main panel component
export {
  ThreadPanel,
  ThreadPanelLayout,
  ThreadSlideInPanel,
  type ThreadPanelProps,
  type ThreadPanelLayoutProps,
  type ThreadSlideInPanelProps,
} from "./thread-panel";

// Header component
export {
  ThreadHeader,
  ThreadHeaderCompact,
  type ThreadHeaderProps,
  type ThreadHeaderCompactProps,
} from "./thread-header";

// Message list component (virtualized)
export {
  ThreadMessageList,
  type ThreadMessageListProps,
} from "./thread-message-list";

// Reply input component
export {
  ThreadReplyInput,
  type ThreadReplyInputProps,
  type Mention,
  type Attachment,
} from "./thread-reply-input";

// Preview component (for main chat)
export {
  ThreadPreview,
  ThreadPreviewCompact,
  ThreadPreviewExpanded,
  StartThreadButton,
  type ThreadPreviewProps,
  type ThreadPreviewCompactProps,
  type ThreadPreviewExpandedProps,
  type ThreadPreviewData,
  type ThreadPreviewParticipant,
  type StartThreadButtonProps,
} from "./thread-preview";

// Participants component
export {
  ThreadParticipants,
  ThreadParticipantList,
  type ThreadParticipantsProps,
  type ThreadParticipantListProps,
} from "./thread-participants";

// Sidebar component (thread list)
export {
  ThreadSidebar,
  ThreadSidebarTrigger,
  type ThreadSidebarProps,
  type ThreadSidebarTriggerProps,
} from "./thread-sidebar";
