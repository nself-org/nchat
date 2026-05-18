/**
 * DM Library - Direct Message management utilities
 *
 * Re-exports all DM-related types and functions
 */

// Types
export * from "./dm-types";

// DM Management
export {
  generateDMSlug,
  generateDMDisplayName,
  getDefaultDMSettings,
  validateCreateDMInput,
  validateGroupDMInput,
  canAddParticipants,
  canRemoveParticipant,
  canUpdateDMSettings,
  canArchiveDM,
  canDeleteDM,
  getOtherParticipant,
  getOtherParticipants,
  findExistingDM,
  sortDMsByRecent,
  sortDMsByUnread,
  sortDMsAlphabetically,
  filterDMsByQuery,
  getUnreadDMs,
  getTotalUnreadCount,
  getDMAvatarUrls,
  getDMAvatarInitials,
  formatDMTimestamp,
  hasRecentActivity,
} from "./dm-manager";

// Search
export {
  searchDMMessages,
  searchDMConversations,
  generateHighlights,
  createSearchResult,
  parseSearchQuery,
  getSearchSuggestions,
  buildSearchIndex,
  searchIndex,
  type SearchIndex,
} from "./dm-search";

// Archive
export {
  createArchiveInfo,
  canArchive,
  canUnarchive,
  getArchiveDisplayInfo,
  filterByArchiveStatus,
  getArchivedDMs,
  getActiveDMs,
  getArchiveCount,
  sortByArchiveDate,
  canBulkArchive,
  canBulkUnarchive,
  getStaleArchivedDMs,
  estimateArchiveStorage,
  prepareArchiveExport,
  type ArchiveOptions,
  type UnarchiveResult,
  type ArchiveExport,
} from "./dm-archive";

// Notifications
export {
  getDefaultNotificationPreference,
  calculateMuteExpiry,
  isDMMuted,
  getMuteTimeRemaining,
  getMutePresets,
  shouldShowNotification,
  shouldShowDesktopNotification,
  shouldShowMobileNotification,
  shouldPlaySound,
  createNotificationDisplay,
  calculateBadgeCount,
  getUnmutedUnreadCount,
  groupNotificationsByDM,
  createSummaryNotification,
  type NotificationEvent,
  type MuteOptions,
  type NotificationDisplay,
} from "./dm-notifications";

// Group DM
export {
  validateGroupName,
  validateGroupDescription,
  validateParticipantCount,
  validateGroupDMCreation,
  canAddToGroup,
  canInviteToGroup,
  canRemoveFromGroup,
  canModifyGroupSettings,
  canChangeRole,
  generateGroupAvatarUrls,
  getGroupInitials,
  getGroupDisplayName,
  getParticipantSummary,
  getOnlineCount,
  canTransferOwnership,
  getLeaveConsequences,
} from "./group-dm";
