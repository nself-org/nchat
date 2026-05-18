/**
 * Channel Services Index
 *
 * Central export for all channel-related services.
 */

// Channel Service
export {
  ChannelService,
  getChannelService,
  createChannelService,
  type Channel,
  type CreateChannelInput,
  type UpdateChannelInput,
  type ChannelListOptions,
  type SearchChannelsOptions,
  type ChannelListResult,
} from "./channel.service";

// Membership Service
export {
  MembershipService,
  getMembershipService,
  createMembershipService,
  type ChannelMember,
  type MembershipDetails,
  type UserChannelInfo,
  type MemberListResult,
} from "./membership.service";

// Permissions Service
export {
  PermissionsService,
  getPermissionsService,
  createPermissionsService,
  type ChannelPermission,
  type ChannelPermissionContext,
} from "./permissions.service";

// Category Service
export { CategoryService, categoryService } from "./category.service";

// Channel Hierarchy Service (Categories, Reordering, Permission Inheritance)
export {
  ChannelHierarchyService,
  getChannelHierarchyService,
  createChannelHierarchyService,
  type CategoryState,
  type CategoryWithState,
  type ReorderResult,
  type MoveChannelResult,
  type CategoryPermissionInheritance,
  type HierarchySnapshot,
} from "./hierarchy.service";

// Thread Service (Full lifecycle management)
export {
  ThreadService,
  getThreadService,
  createThreadService,
  type Thread,
  type ThreadMessage,
  type ThreadParticipant,
  type ThreadAttachment,
  type ThreadReaction,
  type ThreadMention,
  type CreateThreadInput,
  type ReplyToThreadInput,
  type ThreadListOptions,
  type ThreadListResult,
  type ThreadArchiveOptions,
  type AutoArchiveDuration,
} from "./thread.service";

// Forum Service (Discord-style forum channels)
export {
  ForumService,
  getForumService,
  createForumService,
  type ForumChannel,
  type ForumPost,
  type ForumPostReply,
  type ForumTag,
  type ForumSortOrder,
  type CreateForumPostInput,
  type UpdateForumPostInput,
  type CreateForumTagInput,
  type UpdateForumTagInput,
  type ForumListOptions,
  type ForumListResult,
  type ForumSettings,
} from "./forum.service";

// Archive Service (Archive states with reasons)
export {
  ArchiveService,
  getArchiveService,
  createArchiveService,
  type ArchiveEntityType,
  type ArchiveState,
  type ArchiveOptions,
  type ArchiveHistoryEntry,
  type ArchiveSettings,
  type ArchivableEntity,
  type ArchivePermissionContext,
  type BulkArchiveResult,
} from "./archive.service";

// Guild Service (Discord-style servers)
export {
  DEFAULT_GUILD_CATEGORIES,
  DEFAULT_GUILD_CHANNELS,
  GUILD_TEMPLATES,
  generateGuildSlug,
  getGuildTemplate,
  createGuildStructure,
  validateGuildSettings,
  calculateBoostTier,
  getGuildFeatures,
  type GuildTemplate,
  type GuildCreationOptions,
  type GuildStructure,
} from "./guild.service";

// Community Service (WhatsApp-style communities)
export { CommunityService, communityService } from "./community.service";

// Broadcast Service (WhatsApp-style broadcast lists)
export { BroadcastService, broadcastService } from "./broadcast.service";

// Governance Service (Naming policies, templates, lifecycle, archival)
export {
  GovernanceService,
  getGovernanceService,
  createGovernanceService,
  resetGovernanceService,
  DEFAULT_NAMING_POLICY,
  DEFAULT_CHANNELS,
  DEFAULT_ARCHIVAL_POLICY,
  DEFAULT_CREATION_RULES,
  BUILT_IN_TEMPLATES,
  type NamingPolicy,
  type DefaultChannelConfig,
  type ArchivalPolicy,
  type ChannelCreationRules,
  type LifecycleHookType,
  type LifecycleHook,
  type ChannelApprovalRequest,
  type GovernanceAuditEntry,
  type GovernanceChannelTemplate,
  type NamingValidationResult,
  type GovernanceConfig,
} from "./governance.service";
