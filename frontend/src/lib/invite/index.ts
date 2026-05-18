/**
 * Invite Module - Channel and Workspace invite system for nself-chat
 *
 * This module provides comprehensive invite link functionality including
 * code generation, validation, QR code support, and share utilities.
 */

// Service exports
export {
  generateInviteCode,
  generateChannelInviteCode,
  generateWorkspaceInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
  isInviteExpired,
  hasReachedMaxUses,
  getRemainingUses,
  getTimeUntilExpiry,
  formatTimeUntilExpiry,
  buildInviteLink,
  getBaseUrl,
  parseInviteLink,
  calculateExpirationDate,
  getExpirationOption,
  copyInviteLinkToClipboard,
  shareInviteLink,
  generateMailtoLink,
  transformInviteData,
  validateInvite,
  EXPIRATION_OPTIONS,
  MAX_USES_OPTIONS,
  type InviteType,
  type InviteCodeOptions,
  type InviteValidationResult,
  type InviteInfo,
  type InviteValidationError,
  type ExpirationOption,
  type MaxUsesOption,
} from "./invite-service";

// Store exports
export {
  useInviteStore,
  selectIsCreateModalOpen,
  selectCreateModalOptions,
  selectIsCreating,
  selectCreatedInvite,
  selectCreateError,
  selectInvitePreview,
  selectIsAccepting,
  selectAcceptError,
  selectAcceptSuccess,
  selectRecentInvites,
  selectActiveInvites,
  selectIsLoadingInvites,
  selectInvitesError,
  selectHasCreatedInvite,
  selectCanAccept,
  type CreateInviteOptions,
  type InvitePreview,
  type CreatedInvite,
  type InviteState,
  type InviteActions,
  type InviteStore,
} from "./invite-store";

// Hook exports
export {
  useInvite,
  type UseInviteOptions,
  type UseInviteReturn,
} from "./use-invite";
