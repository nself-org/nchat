/**
 * Entity Conversion Service Tests
 *
 * Tests for entity type conversions
 */

import {
  upgradeGroupToSupergroup,
  downgradeSupergrouplToGroup,
  convertDMToGroup,
  canConvertTo,
  getConversionTargets,
  getConversionRecommendation,
} from "../entity-conversion.service";

import type {
  GroupEntity,
  SupergroupEntity,
  DirectMessageEntity,
} from "@/types/entities";

// =============================================================================
// MOCK DATA
// =============================================================================

const now = new Date().toISOString();

function createMockGroup(overrides: Partial<GroupEntity> = {}): GroupEntity {
  return {
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
    joinLink: "https://join.example.com/abc123",
    joinLinkExpiresAt: null,
    lastMessage: {
      id: "msg-1",
      content: "Hello!",
      senderId: "user-2",
      senderName: "Alice",
      timestamp: now,
      hasAttachment: false,
      attachmentType: null,
    },
    adminIds: ["user-1", "user-2"],
    pinnedMessageIds: ["msg-1", "msg-2"],
    canUpgradeToSupergroup: true,
    ...overrides,
  };
}

function createMockSupergroup(
  overrides: Partial<SupergroupEntity> = {},
): SupergroupEntity {
  return {
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
    memberCount: 100,
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
    pinnedMessageIds: ["msg-1"],
    linkedChannelId: null,
    lastMessage: null,
    upgradedFromGroupId: null,
    upgradedAt: null,
    ...overrides,
  };
}

function createMockDM(
  overrides: Partial<DirectMessageEntity> = {},
): DirectMessageEntity {
  return {
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
    ...overrides,
  };
}

const defaultOptions = {
  preserveOriginal: false,
  notifyMembers: true,
  performedBy: "user-1",
};

// =============================================================================
// GROUP -> SUPERGROUP TESTS
// =============================================================================

describe("upgradeGroupToSupergroup", () => {
  it("should successfully upgrade a valid group", () => {
    const group = createMockGroup();
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.success).toBe(true);
    expect(result.entity).not.toBeNull();
    expect(result.entity?.type).toBe("supergroup");
    expect(result.errors).toHaveLength(0);
  });

  it("should preserve group ID during upgrade", () => {
    const group = createMockGroup({ id: "group-specific-id" });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.entity?.id).toBe("group-specific-id");
  });

  it("should preserve group name and description", () => {
    const group = createMockGroup({
      name: "My Awesome Group",
      description: "A great group",
    });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.entity?.name).toBe("My Awesome Group");
    expect(result.entity?.description).toBe("A great group");
  });

  it("should migrate admins correctly", () => {
    const group = createMockGroup({ adminIds: ["user-1", "user-2", "user-3"] });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.entity?.admins).toHaveLength(3);
    expect(result.entity?.admins.map((a) => a.userId)).toEqual([
      "user-1",
      "user-2",
      "user-3",
    ]);
  });

  it("should preserve join link", () => {
    const group = createMockGroup({ joinLink: "https://join.test/abc" });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.entity?.joinLink).toBe("https://join.test/abc");
  });

  it("should preserve pinned messages", () => {
    const group = createMockGroup({
      pinnedMessageIds: ["msg-1", "msg-2", "msg-3"],
    });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.entity?.pinnedMessageIds).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
    ]);
  });

  it("should set upgrade metadata", () => {
    const group = createMockGroup();
    const result = upgradeGroupToSupergroup(group, {
      ...defaultOptions,
      reason: "Growing community",
    });

    expect(result.entity?.metadata.upgradedFrom).toBe("group");
    expect(result.entity?.metadata.upgradeReason).toBe("Growing community");
    expect(result.entity?.upgradedFromGroupId).toBe(group.id);
    expect(result.entity?.upgradedAt).toBeDefined();
  });

  it("should add warning for large groups about disabled features", () => {
    const group = createMockGroup({ memberCount: 250 });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Read receipts");
  });

  it("should map group settings to supergroup settings", () => {
    const group = createMockGroup({
      groupSettings: {
        sendMessagesPermission: "admins",
        addMembersPermission: "admins",
        changeInfoPermission: "admins",
        pinMessagesPermission: "admins",
        membersCanShareLink: false,
        approvalRequired: true,
      },
    });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.entity?.supergroupSettings.restrictedMode).toBe(true);
    expect(result.entity?.supergroupSettings.invitePermission).toBe("admins");
    expect(result.entity?.supergroupSettings.approvalRequired).toBe(true);
  });

  it("should create migration log", () => {
    const group = createMockGroup();
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.migrationLog.length).toBeGreaterThanOrEqual(2);
    expect(result.migrationLog[0].action).toBe("UPGRADE_STARTED");
    expect(result.migrationLog[result.migrationLog.length - 1].action).toBe(
      "UPGRADE_COMPLETED",
    );
  });

  it("should reject archived groups", () => {
    const group = createMockGroup({ status: "archived" });
    const result = upgradeGroupToSupergroup(group, defaultOptions);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject non-group entities", () => {
    const notGroup = createMockGroup({ type: "dm" as "group" });
    const result = upgradeGroupToSupergroup(notGroup, defaultOptions);

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SUPERGROUP -> GROUP TESTS
// =============================================================================

describe("downgradeSupergrouplToGroup", () => {
  it("should successfully downgrade a small supergroup", () => {
    const supergroup = createMockSupergroup({ memberCount: 100 });
    const result = downgradeSupergrouplToGroup(supergroup, defaultOptions);

    expect(result.success).toBe(true);
    expect(result.entity).not.toBeNull();
    expect(result.entity?.type).toBe("group");
    expect(result.errors).toHaveLength(0);
  });

  it("should reject supergroups with too many members", () => {
    const supergroup = createMockSupergroup({ memberCount: 300 });
    const result = downgradeSupergrouplToGroup(supergroup, defaultOptions);

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("member count"))).toBe(true);
  });

  it("should reject supergroups with forum mode enabled", () => {
    const supergroup = createMockSupergroup({
      memberCount: 100,
      supergroupSettings: {
        ...createMockSupergroup().supergroupSettings,
        forumMode: true,
      },
    });
    const result = downgradeSupergrouplToGroup(supergroup, defaultOptions);

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("forum mode"))).toBe(true);
  });

  it("should limit admins to group maximum", () => {
    const manyAdmins = Array.from({ length: 20 }, (_, i) => ({
      userId: `user-${i}`,
      title: null,
      addedBy: "user-1",
      addedAt: now,
      permissions: {
        changeInfo: true,
        deleteMessages: true,
        banUsers: true,
        inviteUsers: true,
        pinMessages: true,
        addAdmins: false,
        manageTopics: false,
        manageVideoChats: true,
        anonymous: false,
      },
    }));

    const supergroup = createMockSupergroup({
      memberCount: 100,
      admins: manyAdmins,
    });
    const result = downgradeSupergrouplToGroup(supergroup, defaultOptions);

    expect(result.success).toBe(true);
    expect(result.entity?.adminIds.length).toBeLessThanOrEqual(10);
    expect(result.warnings.some((w) => w.includes("Admin count"))).toBe(true);
  });

  it("should limit pinned messages to group maximum", () => {
    const manyPinned = Array.from({ length: 60 }, (_, i) => `msg-${i}`);
    const supergroup = createMockSupergroup({
      memberCount: 100,
      pinnedMessageIds: manyPinned,
    });
    const result = downgradeSupergrouplToGroup(supergroup, defaultOptions);

    expect(result.success).toBe(true);
    expect(result.entity?.pinnedMessageIds.length).toBeLessThanOrEqual(50);
    expect(result.warnings.some((w) => w.includes("Pinned messages"))).toBe(
      true,
    );
  });

  it("should map supergroup settings to group settings", () => {
    const supergroup = createMockSupergroup({
      memberCount: 100,
      supergroupSettings: {
        ...createMockSupergroup().supergroupSettings,
        restrictedMode: true,
        invitePermission: "everyone",
        approvalRequired: true,
      },
    });
    const result = downgradeSupergrouplToGroup(supergroup, defaultOptions);

    expect(result.entity?.groupSettings.sendMessagesPermission).toBe("admins");
    expect(result.entity?.groupSettings.membersCanShareLink).toBe(true);
    expect(result.entity?.groupSettings.approvalRequired).toBe(true);
  });

  it("should set downgrade metadata", () => {
    const supergroup = createMockSupergroup({ memberCount: 100 });
    const result = downgradeSupergrouplToGroup(supergroup, {
      ...defaultOptions,
      reason: "Reducing scope",
    });

    expect(result.entity?.metadata.downgradedFrom).toBe("supergroup");
    expect(result.entity?.metadata.downgradeReason).toBe("Reducing scope");
  });
});

// =============================================================================
// DM -> GROUP TESTS
// =============================================================================

describe("convertDMToGroup", () => {
  it("should successfully convert DM to group with additional participants", () => {
    const dm = createMockDM();
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: ["user-3"],
      },
      defaultOptions,
    );

    expect(result.success).toBe(true);
    expect(result.entity).not.toBeNull();
    expect(result.entity?.type).toBe("group");
    expect(result.entity?.memberCount).toBe(3);
  });

  it("should require at least 3 participants", () => {
    const dm = createMockDM();
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: [], // Only 2 from DM
      },
      defaultOptions,
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("3 participants"))).toBe(true);
  });

  it("should create a new group ID (not reuse DM ID)", () => {
    const dm = createMockDM({ id: "dm-123" });
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: ["user-3", "user-4"],
      },
      defaultOptions,
    );

    expect(result.entity?.id).not.toBe("dm-123");
    expect(result.entity?.id).toMatch(/^group-/);
  });

  it("should set the creator as owner", () => {
    const dm = createMockDM();
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: ["user-3"],
      },
      { ...defaultOptions, performedBy: "user-1" },
    );

    expect(result.entity?.ownerId).toBe("user-1");
    expect(result.entity?.adminIds).toContain("user-1");
  });

  it("should warn that DM history is not transferred", () => {
    const dm = createMockDM();
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: ["user-3"],
      },
      defaultOptions,
    );

    expect(result.warnings.some((w) => w.includes("DM history"))).toBe(true);
  });

  it("should set metadata about creation from DM", () => {
    const dm = createMockDM({ id: "dm-original" });
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: ["user-3"],
      },
      defaultOptions,
    );

    expect(result.entity?.metadata.createdFromDM).toBe("dm-original");
  });

  it("should generate slug from group name", () => {
    const dm = createMockDM();
    const result = convertDMToGroup(
      {
        dm,
        groupName: "My New Group",
        additionalParticipantIds: ["user-3"],
      },
      defaultOptions,
    );

    expect(result.entity?.slug).toBe("my-new-group");
  });

  it("should deduplicate participant IDs", () => {
    const dm = createMockDM({ participantIds: ["user-1", "user-2"] });
    const result = convertDMToGroup(
      {
        dm,
        groupName: "New Group",
        additionalParticipantIds: ["user-2", "user-3"], // user-2 already in DM
      },
      defaultOptions,
    );

    expect(result.entity?.memberCount).toBe(3); // Deduplicated
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe("canConvertTo", () => {
  it("should allow DM to convert to group", () => {
    const dm = createMockDM();
    const result = canConvertTo(dm, "group");
    expect(result.valid).toBe(true);
  });

  it("should not allow DM to convert to other types", () => {
    const dm = createMockDM();
    expect(canConvertTo(dm, "supergroup").valid).toBe(false);
    expect(canConvertTo(dm, "community").valid).toBe(false);
    expect(canConvertTo(dm, "channel").valid).toBe(false);
  });

  it("should allow group to convert to supergroup", () => {
    const group = createMockGroup();
    const result = canConvertTo(group, "supergroup");
    expect(result.valid).toBe(true);
  });

  it("should not allow group to convert to other types", () => {
    const group = createMockGroup();
    expect(canConvertTo(group, "dm").valid).toBe(false);
    expect(canConvertTo(group, "community").valid).toBe(false);
    expect(canConvertTo(group, "channel").valid).toBe(false);
  });

  it("should allow supergroup to convert to group", () => {
    const supergroup = createMockSupergroup();
    const result = canConvertTo(supergroup, "group");
    expect(result.valid).toBe(true);
  });

  it("should not allow community conversion", () => {
    const community = { type: "community" } as any;
    expect(canConvertTo(community, "group").valid).toBe(false);
    expect(canConvertTo(community, "channel").valid).toBe(false);
  });

  it("should not allow channel conversion", () => {
    const channel = { type: "channel" } as any;
    expect(canConvertTo(channel, "group").valid).toBe(false);
    expect(canConvertTo(channel, "community").valid).toBe(false);
  });
});

describe("getConversionTargets", () => {
  it("should return group for DM", () => {
    const dm = createMockDM();
    expect(getConversionTargets(dm)).toEqual(["group"]);
  });

  it("should return supergroup for group", () => {
    const group = createMockGroup();
    expect(getConversionTargets(group)).toEqual(["supergroup"]);
  });

  it("should return group for supergroup", () => {
    const supergroup = createMockSupergroup();
    expect(getConversionTargets(supergroup)).toEqual(["group"]);
  });

  it("should return empty array for community", () => {
    const community = { type: "community" } as any;
    expect(getConversionTargets(community)).toEqual([]);
  });

  it("should return empty array for channel", () => {
    const channel = { type: "channel" } as any;
    expect(getConversionTargets(channel)).toEqual([]);
  });
});

describe("getConversionRecommendation", () => {
  it("should recommend upgrade for groups with many members", () => {
    const group = createMockGroup({ memberCount: 220 });
    const recommendation = getConversionRecommendation(group);

    expect(recommendation.recommended).toBe(true);
    expect(recommendation.targetType).toBe("supergroup");
    expect(recommendation.reason).toContain("220 members");
  });

  it("should not recommend upgrade for small groups", () => {
    const group = createMockGroup({ memberCount: 50 });
    const recommendation = getConversionRecommendation(group);

    expect(recommendation.recommended).toBe(false);
    expect(recommendation.targetType).toBeNull();
  });

  it("should not recommend for DMs", () => {
    const dm = createMockDM();
    const recommendation = getConversionRecommendation(dm);

    expect(recommendation.recommended).toBe(false);
  });

  it("should not recommend for supergroups", () => {
    const supergroup = createMockSupergroup();
    const recommendation = getConversionRecommendation(supergroup);

    expect(recommendation.recommended).toBe(false);
  });
});
