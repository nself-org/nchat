// ============================================
// Modal System - Core Components
// ============================================

// Modal Provider - Renders all modals from store
export { ModalProvider, useModalProviderMounted } from "./modal-provider";

// Base Modal - Foundation component for building modals
export {
  BaseModal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalClose,
  ModalTrigger,
  ModalPortal,
  CompleteModal,
  type BaseModalProps,
  type ModalHeaderProps,
  type ModalTitleProps,
  type ModalDescriptionProps,
  type ModalBodyProps,
  type ModalFooterProps,
  type CompleteModalProps,
  type ModalSize,
} from "./base-modal";

// ============================================
// Modal System - Standard Modals
// ============================================

// Confirm Modal - Confirmation dialogs
export {
  ConfirmModal,
  DeleteConfirmModal,
  UnsavedChangesModal,
  type ConfirmModalProps,
  type ConfirmVariant,
  type DeleteConfirmModalProps,
  type UnsavedChangesModalProps,
} from "./confirm-modal";

// Alert Modal - Alert/notification dialogs
export {
  AlertModal,
  WarningAlert,
  ErrorAlert,
  SuccessAlert,
  InfoAlert,
  type AlertModalProps,
  type AlertIcon,
} from "./alert-modal";

// Prompt Modal - Input prompt dialogs
export {
  PromptModal,
  RenameModal,
  CreateNameModal,
  type PromptModalProps,
  type InputType,
  type RenameModalProps,
  type CreateNameModalProps,
} from "./prompt-modal";

// ============================================
// Modal System - Media Modals
// ============================================

// Image Lightbox - Full-screen image viewer
export {
  ImageLightbox,
  type ImageLightboxProps,
  type LightboxImage,
} from "./image-lightbox";

// Video Modal - Video player modal
export { VideoModal, type VideoModalProps } from "./video-modal";

// ============================================
// Modal System - Feature Modals
// ============================================

// Profile Modal - User profile display
export {
  ProfileModal,
  type ProfileModalProps,
  type ProfileUser,
  type ProfileStatus,
} from "./profile-modal";

// Settings Modal - Quick settings editor
export {
  SettingsModal,
  QuickSettingsModal,
  type SettingsModalProps,
  type QuickSettingsModalProps,
  type SettingDefinition,
  type SettingsSection,
  type SettingType,
  type SettingOption,
} from "./settings-modal";

// ============================================
// Existing Application Modals
// ============================================

// Channel modals
export { CreateChannelModal } from "./create-channel-modal";
export type {
  ChannelMember,
  ChannelCategory,
  CreateChannelData,
} from "./create-channel-modal";

export { EditChannelModal } from "./edit-channel-modal";
export type { ChannelData, EditChannelData } from "./edit-channel-modal";

export { LeaveChannelModal } from "./leave-channel-modal";
export type { ChannelInfo } from "./leave-channel-modal";

// User modals
export { InviteMembersModal } from "./invite-members-modal";
export type { InvitableUser } from "./invite-members-modal";

export { UserProfileModal } from "./user-profile-modal";
export type { UserProfile, UserStatus } from "./user-profile-modal";

// Message modals
export { DeleteMessageModal } from "./delete-message-modal";
export type { MessagePreview } from "./delete-message-modal";

export { PinMessageModal, UnpinMessageModal } from "./pin-message-modal";
export type { PinnableMessage } from "./pin-message-modal";

// Utility modals (legacy - prefer new ConfirmModal)
export {
  ConfirmationModal,
  DeleteConfirmationModal,
  UnsavedChangesModal as LegacyUnsavedChangesModal,
} from "./confirmation-modal";
export type { ConfirmationVariant } from "./confirmation-modal";

// Image preview (legacy - prefer new ImageLightbox)
export { ImagePreviewModal } from "./image-preview-modal";
export type { ImageItem } from "./image-preview-modal";

// Keyboard shortcuts
export { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";

// ============================================
// Re-export hooks from lib/modals
// ============================================
export {
  useModal,
  useModalOpen,
  useTopModal,
  useConfirm,
  useDeleteConfirm,
  useDiscardConfirm,
  useLeaveConfirm,
  usePrompt,
  useRenamePrompt,
  useCreatePrompt,
  usePasswordPrompt,
  useModalStore,
} from "@/lib/modals";
