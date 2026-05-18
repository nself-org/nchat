/**
 * Entity Validators Tests
 *
 * Comprehensive test suite for entity validation utilities
 */

import {
  // Type guards
  isDirectMessage,
  isGroup,
  isSupergroup,
  isCommunity,
  isChannel,
  isMultiMemberEntity,
  hasAdminSupport,
  supportsBroadcast,
  supportsCategories,
  supportsRoles,
  supportsPublicLink,
  isValidEntityType,

  // Limit validators
  getEntityLimits,
  validateMemberCount,
  validateAdminCount,
  validatePinnedMessageCount,

  // Name and description validators
  validateEntityName,
  validateEntityDescription,
  validateSlug,
  validateUsername,

  // Permission validators
  canPerformAction,
  canAddMembers,
  canRemoveMember,
  canAssignRole,

  // Input validators
  validateCreateGroupInput,
  validateCreateSupergroupInput,
  validateCreateCommunityInput,
  validateCreateChannelInput,
  validateUpgradeToSupergroupInput,

  // Conversion validators
  canUpgradeToSupergroup,
  canDowngradeToGroup,

  // Settings validators
  validateEntitySettings,

  // Utility functions
  generateSlug,
  getRoleLevel,
  compareRoles,
  outranks,
} from "../entity-validators";

import type {
  ChatEntity,
  DirectMessageEntity,
  GroupEntity,
  SupergroupEntity,
  CommunityEntity,
  ChannelEntity,
  EntityMemberRole,
} from "@/types/entities";

import { ENTITY_LIMITS } from "@/types/entities";

// =============================================================================
// MOCK DATA
// =============================================================================

const now = new Date().toISOString();

const mockDM: DirectMessageEntity = {
  id: "dm-1",
  type: "dm",
  name: "DM with Alice",
  slug: "dm-user1-user2",
  description: null,
  avatarUrl: null,
  bannerUrl: null,
  visibility: "private",
  status: "active",
  ownerId: "user-1",
  workspaceId: "ws-1",
  memberCount: 2,
  createdAt: now,
  updatedAt: now,
  settings: {
    slowModeSeconds: 0,
    muteNewMembers: false,
    minAccountAgeDays: 0,
    isNsfw: false,
    defaultNotificationLevel: "all",
    whoCanSendMessages: "everyone",
    whoCanAddMembers: "no_one",
    whoCanEditInfo: "owner",
    messageRetentionDays: 0,
    showMemberList: true,
  },
  features: {},
  metadata: {},
  otherParticipant: {
    id: "member-1",
    entityId: "dm-1",
    userId: "user-2",
    role: "member",
    joinedAt: now,
    lastReadAt: null,
    lastReadMessageId: null,
    notificationLevel: "all",
    isMuted: false,
    mutedUntil: null,
    isBanned: false,
    bannedAt: null,
    bannedBy: null,
    banReason: null,
    user: {
      id: "user-2",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      status: "online",
      lastSeenAt: null,
    },
  },
  participantIds: ["user-1", "user-2"],
  lastMessage: null,
  archivedByUserId: null,
  isPinned: false,
  isEncrypted: true,
};

const mockGroup: GroupEntity = {
  id: "group-1",
  type: "group",
  name: "Test Group",
  slug: "test-group",
  description: "A test group",
  avatarUrl: null,
  bannerUrl: null,
  visibility: "private",
  status: "active",
  ownerId: "user-1",
  workspaceId: "ws-1",
  memberCount: 50,
  createdAt: now,
  updatedAt: now,
  settings: {
    slowModeSeconds: 0,
    muteNewMembers: false,
    minAccountAgeDays: 0,
    isNsfw: false,
    defaultNotificationLevel: "all",
    whoCanSendMessages: "everyone",
    whoCanAddMembers: "admins",
    whoCanEditInfo: "admins",
    messageRetentionDays: 0,
    showMemberList: true,
  },
  features: {},
  metadata: {},
  groupSettings: {
    sendMessagesPermission: "everyone",
    addMembersPermission: "admins",
    changeInfoPermission: "admins",
    pinMessagesPermission: "admins",
    membersCanShareLink: true,
    approvalRequired: false,
  },
  joinLink: null,
  joinLinkExpiresAt: null,
  lastMessage: null,
  adminIds: ["user-1"],
  pinnedMessageIds: [],
  canUpgradeToSupergroup: true,
};

const mockSupergroup: SupergroupEntity = {
  id: "supergroup-1",
  type: "supergroup",
  name: "Test Supergroup",
  slug: "test-supergroup",
  description: "A test supergroup",
  avatarUrl: null,
  bannerUrl: null,
  visibility: "public",
  status: "active",
  ownerId: "user-1",
  workspaceId: "ws-1",
  memberCount: 5000,
  createdAt: now,
  updatedAt: now,
  settings: {
    slowModeSeconds: 0,
    muteNewMembers: false,
    minAccountAgeDays: 0,
    isNsfw: false,
    defaultNotificationLevel: "all",
    whoCanSendMessages: "everyone",
    whoCanAddMembers: "admins",
    whoCanEditInfo: "admins",
    messageRetentionDays: 0,
    showMemberList: true,
  },
  features: {},
  metadata: {},
  supergroupSettings: {
    slowModeSeconds: 0,
    restrictedMode: false,
    hideMemberList: false,
    approvalRequired: false,
    forumMode: false,
    invitePermission: "admins",
    antiSpam: {
      enabled: true,
      deleteSpam: true,
      banSpammers: false,
      minAccountAge: 0,
    },
    restrictions: {
      stickersDisabled: false,
      gifsDisabled: false,
      mediaDisabled: false,
      pollsDisabled: false,
      linksDisabled: false,
    },
  },
  username: "testsupergroup",
  joinLink: null,
  admins: [
    {
      userId: "user-1",
      title: "Owner",
      addedBy: "user-1",
      addedAt: now,
      permissions: {
        changeInfo: true,
        deleteMessages: true,
        banUsers: true,
        inviteUsers: true,
        pinMessages: true,
        addAdmins: true,
        manageTopics: true,
        manageVideoChats: true,
        anonymous: false,
      },
    },
  ],
  pinnedMessageIds: [],
  linkedChannelId: null,
  lastMessage: null,
  upgradedFromGroupId: null,
  upgradedAt: null,
};

const mockCommunity: CommunityEntity = {
  id: "community-1",
  type: "community",
  name: "Test Community",
  slug: "test-community",
  description: "A test community",
  avatarUrl: null,
  bannerUrl: null,
  visibility: "public",
  status: "active",
  ownerId: "user-1",
  workspaceId: "ws-1",
  memberCount: 1000,
  createdAt: now,
  updatedAt: now,
  settings: {
    slowModeSeconds: 0,
    muteNewMembers: false,
    minAccountAgeDays: 0,
    isNsfw: false,
    defaultNotificationLevel: "mentions",
    whoCanSendMessages: "everyone",
    whoCanAddMembers: "admins",
    whoCanEditInfo: "admins",
    messageRetentionDays: 0,
    showMemberList: true,
  },
  features: {},
  metadata: {},
  communitySettings: {
    createChannelsPermission: "admins",
    createCategoriesPermission: "admins",
    createEventsPermission: "moderators",
    discoverable: true,
    communityEnabled: true,
    welcomeScreen: {
      enabled: false,
      description: null,
      channels: [],
    },
    defaultNotifications: "mentions",
    everyoneRestricted: true,
    maxFileSizeMb: 25,
  },
  vanityUrl: "testcommunity",
  splashUrl: null,
  discoverySplashUrl: null,
  systemChannelId: null,
  rulesChannelId: null,
  welcomeChannelId: null,
  defaultChannelId: null,
  categories: [],
  roles: [],
  verificationLevel: "none",
  contentFilterLevel: "disabled",
  boostTier: 0,
  boostCount: 0,
  channelCount: 5,
};

const mockChannel: ChannelEntity = {
  id: "channel-1",
  type: "channel",
  name: "Test Channel",
  slug: "test-channel",
  description: "A test broadcast channel",
  avatarUrl: null,
  bannerUrl: null,
  visibility: "public",
  status: "active",
  ownerId: "user-1",
  workspaceId: "ws-1",
  memberCount: 10000,
  createdAt: now,
  updatedAt: now,
  settings: {
    slowModeSeconds: 0,
    muteNewMembers: false,
    minAccountAgeDays: 0,
    isNsfw: false,
    defaultNotificationLevel: "all",
    whoCanSendMessages: "admins",
    whoCanAddMembers: "admins",
    whoCanEditInfo: "admins",
    messageRetentionDays: 0,
    showMemberList: true,
  },
  features: {},
  metadata: {},
  channelSettings: {
    allowReactions: true,
    showSignature: true,
    discussionEnabled: false,
    discussionSlowMode: 0,
    subscriberListVisibility: "public",
    schedulingEnabled: true,
    silentBroadcast: false,
  },
  username: "testchannel",
  joinLink: null,
  subscriberCount: 10000,
  admins: [],
  linkedGroupId: null,
  lastPost: null,
  isVerified: false,
  signatureEnabled: true,
  contentRestriction: "none",
};

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe("Type Guards", () => {
  describe("isDirectMessage", () => {
    it("should return true for DM entity", () => {
      expect(isDirectMessage(mockDM)).toBe(true);
    });

    it("should return false for non-DM entities", () => {
      expect(isDirectMessage(mockGroup)).toBe(false);
      expect(isDirectMessage(mockSupergroup)).toBe(false);
      expect(isDirectMessage(mockCommunity)).toBe(false);
      expect(isDirectMessage(mockChannel)).toBe(false);
    });
  });

  describe("isGroup", () => {
    it("should return true for group entity", () => {
      expect(isGroup(mockGroup)).toBe(true);
    });

    it("should return false for non-group entities", () => {
      expect(isGroup(mockDM)).toBe(false);
      expect(isGroup(mockSupergroup)).toBe(false);
      expect(isGroup(mockCommunity)).toBe(false);
      expect(isGroup(mockChannel)).toBe(false);
    });
  });

  describe("isSupergroup", () => {
    it("should return true for supergroup entity", () => {
      expect(isSupergroup(mockSupergroup)).toBe(true);
    });

    it("should return false for non-supergroup entities", () => {
      expect(isSupergroup(mockDM)).toBe(false);
      expect(isSupergroup(mockGroup)).toBe(false);
      expect(isSupergroup(mockCommunity)).toBe(false);
      expect(isSupergroup(mockChannel)).toBe(false);
    });
  });

  describe("isCommunity", () => {
    it("should return true for community entity", () => {
      expect(isCommunity(mockCommunity)).toBe(true);
    });

    it("should return false for non-community entities", () => {
      expect(isCommunity(mockDM)).toBe(false);
      expect(isCommunity(mockGroup)).toBe(false);
      expect(isCommunity(mockSupergroup)).toBe(false);
      expect(isCommunity(mockChannel)).toBe(false);
    });
  });

  describe("isChannel", () => {
    it("should return true for channel entity", () => {
      expect(isChannel(mockChannel)).toBe(true);
    });

    it("should return false for non-channel entities", () => {
      expect(isChannel(mockDM)).toBe(false);
      expect(isChannel(mockGroup)).toBe(false);
      expect(isChannel(mockSupergroup)).toBe(false);
      expect(isChannel(mockCommunity)).toBe(false);
    });
  });

  describe("isMultiMemberEntity", () => {
    it("should return true for multi-member entities", () => {
      expect(isMultiMemberEntity(mockGroup)).toBe(true);
      expect(isMultiMemberEntity(mockSupergroup)).toBe(true);
      expect(isMultiMemberEntity(mockCommunity)).toBe(true);
      expect(isMultiMemberEntity(mockChannel)).toBe(true);
    });

    it("should return false for DM", () => {
      expect(isMultiMemberEntity(mockDM)).toBe(false);
    });
  });

  describe("hasAdminSupport", () => {
    it("should return true for entities with admin support", () => {
      expect(hasAdminSupport(mockGroup)).toBe(true);
      expect(hasAdminSupport(mockSupergroup)).toBe(true);
      expect(hasAdminSupport(mockCommunity)).toBe(true);
      expect(hasAdminSupport(mockChannel)).toBe(true);
    });

    it("should return false for DM", () => {
      expect(hasAdminSupport(mockDM)).toBe(false);
    });
  });

  describe("supportsBroadcast", () => {
    it("should return true for broadcast-capable entities", () => {
      expect(supportsBroadcast(mockSupergroup)).toBe(true);
      expect(supportsBroadcast(mockChannel)).toBe(true);
    });

    it("should return false for non-broadcast entities", () => {
      expect(supportsBroadcast(mockDM)).toBe(false);
      expect(supportsBroadcast(mockGroup)).toBe(false);
      expect(supportsBroadcast(mockCommunity)).toBe(false);
    });
  });

  describe("supportsCategories", () => {
    it("should return true only for community", () => {
      expect(supportsCategories(mockCommunity)).toBe(true);
    });

    it("should return false for other entities", () => {
      expect(supportsCategories(mockDM)).toBe(false);
      expect(supportsCategories(mockGroup)).toBe(false);
      expect(supportsCategories(mockSupergroup)).toBe(false);
      expect(supportsCategories(mockChannel)).toBe(false);
    });
  });

  describe("supportsRoles", () => {
    it("should return true for supergroup and community", () => {
      expect(supportsRoles(mockSupergroup)).toBe(true);
      expect(supportsRoles(mockCommunity)).toBe(true);
    });

    it("should return false for other entities", () => {
      expect(supportsRoles(mockDM)).toBe(false);
      expect(supportsRoles(mockGroup)).toBe(false);
      expect(supportsRoles(mockChannel)).toBe(false);
    });
  });

  describe("supportsPublicLink", () => {
    it("should return true for non-DM entities", () => {
      expect(supportsPublicLink(mockGroup)).toBe(true);
      expect(supportsPublicLink(mockSupergroup)).toBe(true);
      expect(supportsPublicLink(mockCommunity)).toBe(true);
      expect(supportsPublicLink(mockChannel)).toBe(true);
    });

    it("should return false for DM", () => {
      expect(supportsPublicLink(mockDM)).toBe(false);
    });
  });

  describe("isValidEntityType", () => {
    it("should return true for valid entity types", () => {
      expect(isValidEntityType("dm")).toBe(true);
      expect(isValidEntityType("group")).toBe(true);
      expect(isValidEntityType("supergroup")).toBe(true);
      expect(isValidEntityType("community")).toBe(true);
      expect(isValidEntityType("channel")).toBe(true);
    });

    it("should return false for invalid types", () => {
      expect(isValidEntityType("invalid")).toBe(false);
      expect(isValidEntityType("")).toBe(false);
      expect(isValidEntityType("chat")).toBe(false);
    });
  });
});

// =============================================================================
// LIMIT VALIDATOR TESTS
// =============================================================================

describe("Limit Validators", () => {
  describe("getEntityLimits", () => {
    it("should return correct limits for each entity type", () => {
      expect(getEntityLimits("dm")).toEqual(ENTITY_LIMITS.dm);
      expect(getEntityLimits("group")).toEqual(ENTITY_LIMITS.group);
      expect(getEntityLimits("supergroup")).toEqual(ENTITY_LIMITS.supergroup);
      expect(getEntityLimits("community")).toEqual(ENTITY_LIMITS.community);
      expect(getEntityLimits("channel")).toEqual(ENTITY_LIMITS.channel);
    });

    it("should have correct DM limits", () => {
      const limits = getEntityLimits("dm");
      expect(limits.minMembers).toBe(2);
      expect(limits.maxMembers).toBe(2);
      expect(limits.maxAdmins).toBe(0);
    });

    it("should have correct group limits", () => {
      const limits = getEntityLimits("group");
      expect(limits.minMembers).toBe(2);
      expect(limits.maxMembers).toBe(256);
      expect(limits.maxAdmins).toBe(10);
    });

    it("should have correct supergroup limits", () => {
      const limits = getEntityLimits("supergroup");
      expect(limits.minMembers).toBe(2);
      expect(limits.maxMembers).toBe(200_000);
      expect(limits.maxAdmins).toBe(50);
    });
  });

  describe("validateMemberCount", () => {
    it("should validate DM member count", () => {
      expect(validateMemberCount("dm", 2).valid).toBe(true);
      expect(validateMemberCount("dm", 1).valid).toBe(false);
      expect(validateMemberCount("dm", 3).valid).toBe(false);
    });

    it("should validate group member count", () => {
      expect(validateMemberCount("group", 2).valid).toBe(true);
      expect(validateMemberCount("group", 256).valid).toBe(true);
      expect(validateMemberCount("group", 1).valid).toBe(false);
      expect(validateMemberCount("group", 257).valid).toBe(false);
    });

    it("should validate supergroup member count", () => {
      expect(validateMemberCount("supergroup", 2).valid).toBe(true);
      expect(validateMemberCount("supergroup", 200_000).valid).toBe(true);
      expect(validateMemberCount("supergroup", 1).valid).toBe(false);
      expect(validateMemberCount("supergroup", 200_001).valid).toBe(false);
    });
  });

  describe("validateAdminCount", () => {
    it("should validate group admin count", () => {
      expect(validateAdminCount("group", 5).valid).toBe(true);
      expect(validateAdminCount("group", 10).valid).toBe(true);
      expect(validateAdminCount("group", 11).valid).toBe(false);
    });

    it("should validate supergroup admin count", () => {
      expect(validateAdminCount("supergroup", 25).valid).toBe(true);
      expect(validateAdminCount("supergroup", 50).valid).toBe(true);
      expect(validateAdminCount("supergroup", 51).valid).toBe(false);
    });
  });

  describe("validatePinnedMessageCount", () => {
    it("should validate DM pinned messages", () => {
      expect(validatePinnedMessageCount("dm", 5).valid).toBe(true);
      expect(validatePinnedMessageCount("dm", 6).valid).toBe(false);
    });

    it("should validate group pinned messages", () => {
      expect(validatePinnedMessageCount("group", 50).valid).toBe(true);
      expect(validatePinnedMessageCount("group", 51).valid).toBe(false);
    });
  });
});

// =============================================================================
// NAME AND DESCRIPTION VALIDATOR TESTS
// =============================================================================

describe("Name and Description Validators", () => {
  describe("validateEntityName", () => {
    it("should validate valid names", () => {
      expect(validateEntityName("Test Group", "group").valid).toBe(true);
      expect(validateEntityName("A", "group").valid).toBe(true);
      expect(
        validateEntityName("My Amazing Community!", "community").valid,
      ).toBe(true);
    });

    it("should reject empty names", () => {
      expect(validateEntityName("", "group").valid).toBe(false);
      expect(validateEntityName("   ", "group").valid).toBe(false);
    });

    it("should reject names that are too long", () => {
      const longName = "a".repeat(101);
      expect(validateEntityName(longName, "group").valid).toBe(false);
    });

    it("should reject names with control characters", () => {
      expect(validateEntityName("Test\x00Group", "group").valid).toBe(false);
    });
  });

  describe("validateEntityDescription", () => {
    it("should accept valid descriptions", () => {
      expect(validateEntityDescription("A test description").valid).toBe(true);
      expect(validateEntityDescription(null).valid).toBe(true);
      expect(validateEntityDescription(undefined).valid).toBe(true);
    });

    it("should reject descriptions that are too long", () => {
      const longDesc = "a".repeat(2001);
      expect(validateEntityDescription(longDesc).valid).toBe(false);
    });
  });

  describe("validateSlug", () => {
    it("should validate valid slugs", () => {
      expect(validateSlug("my-group").valid).toBe(true);
      expect(validateSlug("test123").valid).toBe(true);
      expect(validateSlug("ab").valid).toBe(true);
    });

    it("should reject empty slugs", () => {
      expect(validateSlug("").valid).toBe(false);
    });

    it("should reject slugs starting with hyphen", () => {
      expect(validateSlug("-my-group").valid).toBe(false);
    });

    it("should reject slugs ending with hyphen", () => {
      expect(validateSlug("my-group-").valid).toBe(false);
    });

    it("should reject slugs with consecutive hyphens", () => {
      expect(validateSlug("my--group").valid).toBe(false);
    });

    it("should reject slugs with uppercase", () => {
      expect(validateSlug("MyGroup").valid).toBe(false);
    });
  });

  describe("validateUsername", () => {
    it("should accept valid usernames", () => {
      expect(validateUsername("testuser").valid).toBe(true);
      expect(validateUsername("Test123").valid).toBe(true);
      expect(validateUsername("test_user").valid).toBe(true);
    });

    it("should accept empty usernames (optional)", () => {
      expect(validateUsername("").valid).toBe(true);
    });

    it("should reject short usernames", () => {
      expect(validateUsername("test").valid).toBe(false);
    });

    it("should reject usernames starting with number", () => {
      expect(validateUsername("1testuser").valid).toBe(false);
    });

    it("should reject reserved usernames", () => {
      expect(validateUsername("admin").valid).toBe(false);
      expect(validateUsername("support").valid).toBe(false);
      expect(validateUsername("system").valid).toBe(false);
    });
  });
});

// =============================================================================
// PERMISSION VALIDATOR TESTS
// =============================================================================

describe("Permission Validators", () => {
  describe("canPerformAction", () => {
    it("should allow owner to perform all actions", () => {
      expect(canPerformAction("owner", "send_message")).toBe(true);
      expect(canPerformAction("owner", "manage_members")).toBe(true);
      expect(canPerformAction("owner", "manage_settings")).toBe(true);
      expect(canPerformAction("owner", "delete_entity")).toBe(true);
      expect(canPerformAction("owner", "pin_message")).toBe(true);
      expect(canPerformAction("owner", "ban_member")).toBe(true);
    });

    it("should allow admin to perform most actions", () => {
      expect(canPerformAction("admin", "send_message")).toBe(true);
      expect(canPerformAction("admin", "manage_members")).toBe(true);
      expect(canPerformAction("admin", "manage_settings")).toBe(true);
      expect(canPerformAction("admin", "delete_entity")).toBe(false);
    });

    it("should allow moderator limited actions", () => {
      expect(canPerformAction("moderator", "send_message")).toBe(true);
      expect(canPerformAction("moderator", "pin_message")).toBe(true);
      expect(canPerformAction("moderator", "ban_member")).toBe(true);
      expect(canPerformAction("moderator", "manage_settings")).toBe(false);
    });

    it("should allow member only to send messages", () => {
      expect(canPerformAction("member", "send_message")).toBe(true);
      expect(canPerformAction("member", "manage_members")).toBe(false);
    });

    it("should not allow subscriber or guest to perform actions", () => {
      expect(canPerformAction("subscriber", "send_message")).toBe(false);
      expect(canPerformAction("guest", "send_message")).toBe(false);
    });
  });

  describe("canAddMembers", () => {
    it("should not allow adding members to DM", () => {
      const result = canAddMembers(mockDM, "admin", 2);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Cannot add members to a direct message");
    });

    it("should allow admin to add members to group", () => {
      const result = canAddMembers(mockGroup, "admin", 50);
      expect(result.valid).toBe(true);
    });

    it("should not allow member to add members", () => {
      const result = canAddMembers(mockGroup, "member", 50);
      expect(result.valid).toBe(false);
    });

    it("should not allow adding when at max capacity", () => {
      const result = canAddMembers(mockGroup, "admin", 256);
      expect(result.valid).toBe(false);
    });
  });

  describe("canRemoveMember", () => {
    it("should allow members to leave (except owner)", () => {
      expect(canRemoveMember("member", "member", true).valid).toBe(true);
      expect(canRemoveMember("admin", "admin", true).valid).toBe(true);
    });

    it("should not allow owner to leave without transferring", () => {
      const result = canRemoveMember("owner", "owner", true);
      expect(result.valid).toBe(false);
    });

    it("should not allow removing owner", () => {
      const result = canRemoveMember("admin", "owner", false);
      expect(result.valid).toBe(false);
    });

    it("should only allow owner to remove admins", () => {
      expect(canRemoveMember("owner", "admin", false).valid).toBe(true);
      expect(canRemoveMember("admin", "admin", false).valid).toBe(false);
    });
  });

  describe("canAssignRole", () => {
    it("should only allow owner to manage admin roles", () => {
      expect(canAssignRole("owner", "member", "admin").valid).toBe(true);
      expect(canAssignRole("admin", "member", "admin").valid).toBe(false);
    });

    it("should not allow changing owner role directly", () => {
      expect(canAssignRole("owner", "owner", "admin").valid).toBe(false);
      expect(canAssignRole("owner", "admin", "owner").valid).toBe(false);
    });
  });
});

// =============================================================================
// INPUT VALIDATOR TESTS
// =============================================================================

describe("Input Validators", () => {
  describe("validateCreateGroupInput", () => {
    it("should validate correct input", () => {
      const result = validateCreateGroupInput({
        name: "Test Group",
        participantIds: ["user-2", "user-3"],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing name", () => {
      const result = validateCreateGroupInput({
        name: "",
        participantIds: ["user-2"],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject empty participants", () => {
      const result = validateCreateGroupInput({
        name: "Test Group",
        participantIds: [],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject duplicate participants", () => {
      const result = validateCreateGroupInput({
        name: "Test Group",
        participantIds: ["user-2", "user-2"],
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "DUPLICATE_PARTICIPANTS"),
      ).toBe(true);
    });
  });

  describe("validateCreateSupergroupInput", () => {
    it("should validate correct input", () => {
      const result = validateCreateSupergroupInput({
        name: "Test Supergroup",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid username", () => {
      const result = validateCreateSupergroupInput({
        name: "Test",
        username: "ab", // Too short
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateCreateCommunityInput", () => {
    it("should validate correct input", () => {
      const result = validateCreateCommunityInput({
        name: "Test Community",
        template: "default",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid template", () => {
      const result = validateCreateCommunityInput({
        name: "Test",
        template: "invalid" as "default",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateCreateChannelInput", () => {
    it("should validate correct input", () => {
      const result = validateCreateChannelInput({
        name: "Test Channel",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("validateUpgradeToSupergroupInput", () => {
    it("should validate correct input", () => {
      const result = validateUpgradeToSupergroupInput({
        groupId: "group-1",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing groupId", () => {
      const result = validateUpgradeToSupergroupInput({
        groupId: "",
      });
      expect(result.valid).toBe(false);
    });
  });
});

// =============================================================================
// CONVERSION VALIDATOR TESTS
// =============================================================================

describe("Conversion Validators", () => {
  describe("canUpgradeToSupergroup", () => {
    it("should allow active groups to upgrade", () => {
      const result = canUpgradeToSupergroup(mockGroup);
      expect(result.valid).toBe(true);
    });

    it("should reject non-group entities", () => {
      const notGroup = { ...mockDM, type: "dm" as const };
      const result = canUpgradeToSupergroup(notGroup as unknown as GroupEntity);
      expect(result.valid).toBe(false);
    });

    it("should reject archived groups", () => {
      const archivedGroup = { ...mockGroup, status: "archived" as const };
      const result = canUpgradeToSupergroup(archivedGroup);
      expect(result.valid).toBe(false);
    });
  });

  describe("canDowngradeToGroup", () => {
    it("should allow small supergroups to downgrade", () => {
      const smallSupergroup = { ...mockSupergroup, memberCount: 100 };
      const result = canDowngradeToGroup(smallSupergroup);
      expect(result.valid).toBe(true);
    });

    it("should reject supergroups with too many members", () => {
      const largeSupergroup = { ...mockSupergroup, memberCount: 300 };
      const result = canDowngradeToGroup(largeSupergroup);
      expect(result.valid).toBe(false);
    });

    it("should reject supergroups with forum mode enabled", () => {
      const forumSupergroup = {
        ...mockSupergroup,
        memberCount: 100,
        supergroupSettings: {
          ...mockSupergroup.supergroupSettings,
          forumMode: true,
        },
      };
      const result = canDowngradeToGroup(forumSupergroup);
      expect(result.valid).toBe(false);
    });
  });
});

// =============================================================================
// SETTINGS VALIDATOR TESTS
// =============================================================================

describe("Settings Validators", () => {
  describe("validateEntitySettings", () => {
    it("should validate valid slow mode values", () => {
      expect(validateEntitySettings({ slowModeSeconds: 0 }).valid).toBe(true);
      expect(validateEntitySettings({ slowModeSeconds: 60 }).valid).toBe(true);
      expect(validateEntitySettings({ slowModeSeconds: 3600 }).valid).toBe(
        true,
      );
    });

    it("should reject invalid slow mode values", () => {
      expect(validateEntitySettings({ slowModeSeconds: 7 }).valid).toBe(false);
      expect(validateEntitySettings({ slowModeSeconds: 100 }).valid).toBe(
        false,
      );
    });

    it("should validate account age restrictions", () => {
      expect(validateEntitySettings({ minAccountAgeDays: 0 }).valid).toBe(true);
      expect(validateEntitySettings({ minAccountAgeDays: 30 }).valid).toBe(
        true,
      );
      expect(validateEntitySettings({ minAccountAgeDays: -1 }).valid).toBe(
        false,
      );
      expect(validateEntitySettings({ minAccountAgeDays: 400 }).valid).toBe(
        false,
      );
    });
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe("Utility Functions", () => {
  describe("generateSlug", () => {
    it("should generate valid slugs", () => {
      expect(generateSlug("My Test Group")).toBe("my-test-group");
      expect(generateSlug("Hello World!")).toBe("hello-world");
      expect(generateSlug("Test   123")).toBe("test-123");
    });

    it("should handle special characters", () => {
      expect(generateSlug("Test@#$%Group")).toBe("test-group");
    });

    it("should trim leading/trailing hyphens", () => {
      expect(generateSlug("  Test Group  ")).toBe("test-group");
    });

    it("should limit length to 50 characters", () => {
      const longName = "a".repeat(100);
      expect(generateSlug(longName).length).toBeLessThanOrEqual(50);
    });
  });

  describe("getRoleLevel", () => {
    it("should return correct role levels", () => {
      expect(getRoleLevel("owner")).toBe(100);
      expect(getRoleLevel("admin")).toBe(80);
      expect(getRoleLevel("moderator")).toBe(60);
      expect(getRoleLevel("member")).toBe(40);
      expect(getRoleLevel("subscriber")).toBe(20);
      expect(getRoleLevel("guest")).toBe(10);
    });
  });

  describe("compareRoles", () => {
    it("should return positive when role1 > role2", () => {
      expect(compareRoles("owner", "admin")).toBeGreaterThan(0);
      expect(compareRoles("admin", "member")).toBeGreaterThan(0);
    });

    it("should return negative when role1 < role2", () => {
      expect(compareRoles("member", "admin")).toBeLessThan(0);
      expect(compareRoles("guest", "owner")).toBeLessThan(0);
    });

    it("should return 0 when roles are equal", () => {
      expect(compareRoles("admin", "admin")).toBe(0);
    });
  });

  describe("outranks", () => {
    it("should return true when role1 outranks role2", () => {
      expect(outranks("owner", "admin")).toBe(true);
      expect(outranks("admin", "moderator")).toBe(true);
      expect(outranks("moderator", "member")).toBe(true);
    });

    it("should return false when role1 does not outrank role2", () => {
      expect(outranks("member", "admin")).toBe(false);
      expect(outranks("admin", "owner")).toBe(false);
      expect(outranks("admin", "admin")).toBe(false);
    });
  });
});
