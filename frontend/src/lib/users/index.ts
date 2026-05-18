// User Directory
export {
  filterBySearch,
  filterByRole,
  filterByPresence,
  filterByDepartment,
  filterByTeam,
  filterByLocation,
  applyFilters,
  sortUsers,
  defaultSort,
  groupUsers,
  calculateStats,
  extractDepartments,
  extractTeams,
  extractLocations,
} from "./user-directory";
export type {
  DirectoryFilters,
  SortOptions,
  GroupOptions,
  DirectoryStats,
} from "./user-directory";

// User Search
export {
  searchUsers,
  getSearchSuggestions,
  highlightMatches,
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
} from "./user-search";
export type {
  SearchResult,
  SearchOptions,
  SearchField,
  SearchSuggestion,
} from "./user-search";

// User Profile
export {
  validateField,
  validateProfile,
  isValidUsername,
  isValidEmail,
  formatUserName,
  formatPresenceStatus,
  formatPhoneNumber,
  getInitials,
  getDefaultAvatarUrl,
  prepareProfileForApi,
  parseProfileFromApi,
  isProfileComplete,
  getProfileCompletionPercentage,
  getProfileCompletionSuggestions,
  PROFILE_FIELD_CONFIGS,
} from "./user-profile";
export type {
  ProfileValidationResult,
  ProfileFieldConfig,
} from "./user-profile";

// User Privacy
export {
  canSeeField,
  isContact,
  isBlocked,
  getVisibilityLabel,
  addContact,
  removeContact,
  updateContact,
  getContact,
  blockUser,
  unblockUser,
  getBlockedUser,
  canSendDirectMessage,
  canMention,
  filterVisibleInDirectory,
  filterSearchable,
  savePrivacySettings,
  loadPrivacySettings,
  saveContacts,
  loadContacts,
  saveBlockedUsers,
  loadBlockedUsers,
  DEFAULT_PRIVACY_SETTINGS,
} from "./user-privacy";
export type { BlockedUser, Contact, PrivacySettings } from "./user-privacy";

// Organization Chart
export {
  buildOrgChart,
  buildOrgChartFromTitles,
  findNodeByUserId,
  getPathToUser,
  getAncestors,
  getDescendants,
  getSiblings,
  toggleNodeExpansion,
  expandToDepth,
  expandAll,
  collapseAll,
  expandPathToUser,
  calculateOrgStats,
  getUserDepth,
  getUsersAtDepth,
  orgChartToRelationships,
  orgChartToUserList,
} from "./org-chart";
export type {
  OrgRelationship,
  OrgChartOptions,
  OrgChartStats,
} from "./org-chart";
