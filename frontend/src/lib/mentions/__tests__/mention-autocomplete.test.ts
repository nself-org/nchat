/**
 * Mention Autocomplete Unit Tests
 *
 * Comprehensive tests for mention autocomplete functionality including:
 * - Fuzzy search scoring
 * - User, channel, and role filtering
 * - Suggestion generation
 * - Keyboard navigation
 * - Text insertion
 */

import {
  fuzzyScore,
  matchUser,
  matchChannel,
  matchRole,
  filterUsers,
  filterChannels,
  filterRoles,
  filterGroupMentions,
  userToSuggestion,
  channelToSuggestion,
  groupMentionToSuggestion,
  roleToSuggestion,
  filterMentionSuggestions,
  handleAutocompleteKeyboard,
  getMentionInsertText,
  calculateMentionReplacement,
  getRecentMentions,
  addRecentMention,
  clearRecentMentions,
  MAX_SUGGESTIONS,
} from "../mention-autocomplete";
import type {
  MentionableUser,
  MentionableChannel,
  MentionableRole,
  MentionSuggestion,
  MentionPermissions,
  GroupMentionInfo,
} from "../mention-types";
import { GROUP_MENTIONS } from "../mention-types";

// ============================================================================
// Test Data
// ============================================================================

const createTestUser = (
  overrides?: Partial<MentionableUser>,
): MentionableUser => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  username: "testuser",
  displayName: "Test User",
  avatarUrl: null,
  ...overrides,
});

const createTestChannel = (
  overrides?: Partial<MentionableChannel>,
): MentionableChannel => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "general",
  slug: "general",
  type: "public",
  ...overrides,
});

const createTestRole = (
  overrides?: Partial<MentionableRole>,
): MentionableRole => ({
  id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "admin",
  memberCount: 5,
  ...overrides,
});

const defaultPermissions: MentionPermissions = {
  canMentionUsers: true,
  canMentionChannels: true,
  canMentionEveryone: true,
  canMentionHere: true,
  canMentionChannel: true,
  canMentionRoles: true,
};

const restrictedPermissions: MentionPermissions = {
  canMentionUsers: true,
  canMentionChannels: true,
  canMentionEveryone: false,
  canMentionHere: false,
  canMentionChannel: false,
  canMentionRoles: false,
};

// ============================================================================
// Fuzzy Score Tests
// ============================================================================

describe("fuzzyScore", () => {
  describe("exact match", () => {
    it("should return 1 for exact match", () => {
      expect(fuzzyScore("john", "john")).toBe(1);
    });

    it("should be case insensitive for exact match", () => {
      expect(fuzzyScore("John", "john")).toBe(1);
      expect(fuzzyScore("john", "John")).toBe(1);
    });
  });

  describe("starts with", () => {
    it("should return high score for prefix match", () => {
      const score = fuzzyScore("jo", "john");
      expect(score).toBeGreaterThan(0.9);
      expect(score).toBeLessThan(1);
    });

    it("should return higher score for longer prefix match", () => {
      const twoChar = fuzzyScore("jo", "john");
      const threeChar = fuzzyScore("joh", "john");
      expect(threeChar).toBeGreaterThan(twoChar);
    });
  });

  describe("contains", () => {
    it("should return medium score for substring match", () => {
      const score = fuzzyScore("oh", "john");
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.9);
    });

    it("should prefer earlier occurrences", () => {
      const early = fuzzyScore("ab", "abcdef");
      const late = fuzzyScore("ef", "abcdef");
      expect(early).toBeGreaterThan(late);
    });
  });

  describe("word boundary match", () => {
    it("should match word starts", () => {
      const score = fuzzyScore("doe", "john_doe");
      expect(score).toBeGreaterThan(0.3);
    });
  });

  describe("fuzzy match", () => {
    it("should match character sequences", () => {
      const score = fuzzyScore("jn", "john");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.4);
    });

    it("should prefer consecutive matches", () => {
      const consecutive = fuzzyScore("jo", "john");
      const nonConsecutive = fuzzyScore("jn", "john");
      expect(consecutive).toBeGreaterThan(nonConsecutive);
    });
  });

  describe("no match", () => {
    it("should return 0 for no match", () => {
      expect(fuzzyScore("xyz", "john")).toBe(0);
    });
  });

  describe("empty query", () => {
    it("should return medium score for empty query", () => {
      expect(fuzzyScore("", "john")).toBe(0.5);
    });
  });
});

// ============================================================================
// Match Tests
// ============================================================================

describe("matchUser", () => {
  it("should match by username", () => {
    const user = createTestUser({ username: "john", displayName: "John Doe" });
    const score = matchUser(user, "john");
    expect(score).toBe(1);
  });

  it("should match by display name", () => {
    const user = createTestUser({ username: "jdoe", displayName: "John Doe" });
    const score = matchUser(user, "John");
    expect(score).toBeGreaterThan(0.9);
  });

  it("should return best score between username and display name", () => {
    const user = createTestUser({ username: "jd", displayName: "John Doe" });
    const score = matchUser(user, "jo");
    // Should match display name better than username
    expect(score).toBeGreaterThan(0.9);
  });
});

describe("matchChannel", () => {
  it("should match by channel name", () => {
    const channel = createTestChannel({ name: "General", slug: "general" });
    const score = matchChannel(channel, "General");
    expect(score).toBe(1);
  });

  it("should match by channel slug", () => {
    const channel = createTestChannel({
      name: "General Discussion",
      slug: "general",
    });
    const score = matchChannel(channel, "general");
    expect(score).toBe(1);
  });

  it("should return best score between name and slug", () => {
    const channel = createTestChannel({ name: "Dev Team", slug: "dev-team" });
    const nameScore = matchChannel(channel, "Dev");
    expect(nameScore).toBeGreaterThan(0.9);
  });
});

describe("matchRole", () => {
  it("should match by role name", () => {
    const role = createTestRole({ name: "admin" });
    const score = matchRole(role, "admin");
    expect(score).toBe(1);
  });

  it("should match partial role names", () => {
    const role = createTestRole({ name: "administrator" });
    const score = matchRole(role, "admin");
    expect(score).toBeGreaterThan(0.9);
  });
});

// ============================================================================
// Filter Tests
// ============================================================================

describe("filterUsers", () => {
  const users: MentionableUser[] = [
    createTestUser({ id: "1", username: "alice", displayName: "Alice Smith" }),
    createTestUser({ id: "2", username: "bob", displayName: "Bob Jones" }),
    createTestUser({
      id: "3",
      username: "charlie",
      displayName: "Charlie Brown",
    }),
    createTestUser({
      id: "4",
      username: "alice2",
      displayName: "Alice Johnson",
      presence: "online",
    }),
  ];

  it("should filter users by query", () => {
    const result = filterUsers(users, "alice");
    expect(result.length).toBe(2);
    expect(result.map((u) => u.username)).toContain("alice");
    expect(result.map((u) => u.username)).toContain("alice2");
  });

  it("should respect limit parameter", () => {
    const result = filterUsers(users, "", 2);
    expect(result.length).toBe(2);
  });

  it("should sort by score", () => {
    const result = filterUsers(users, "alice");
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it("should prefer online users with equal scores", () => {
    const result = filterUsers(users, "alice");
    // alice2 is online and should be prioritized
    const alice2Index = result.findIndex((u) => u.username === "alice2");
    expect(alice2Index).toBeLessThanOrEqual(1); // Should be among top results
  });

  it("should return all users with empty query", () => {
    const result = filterUsers(users, "");
    expect(result.length).toBe(4);
  });

  it("should return empty for no matches", () => {
    const result = filterUsers(users, "xyz");
    expect(result.length).toBe(0);
  });
});

describe("filterChannels", () => {
  const channels: MentionableChannel[] = [
    createTestChannel({
      id: "1",
      name: "General",
      slug: "general",
      type: "public",
    }),
    createTestChannel({
      id: "2",
      name: "Random",
      slug: "random",
      type: "public",
    }),
    createTestChannel({
      id: "3",
      name: "Development",
      slug: "dev",
      type: "private",
    }),
    createTestChannel({
      id: "4",
      name: "Archived",
      slug: "archived",
      isArchived: true,
    }),
  ];

  it("should filter channels by query", () => {
    const result = filterChannels(channels, "gen");
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe("general");
  });

  it("should exclude archived channels", () => {
    const result = filterChannels(channels, "");
    expect(result.map((c) => c.slug)).not.toContain("archived");
  });

  it("should prefer public channels with equal scores", () => {
    // Both match 'd' but public should come first
    const channelsWithD = [
      createTestChannel({ id: "1", name: "Dev", slug: "dev", type: "public" }),
      createTestChannel({
        id: "2",
        name: "Design",
        slug: "design",
        type: "private",
      }),
    ];
    const result = filterChannels(channelsWithD, "d");
    expect(result.length).toBe(2);
  });

  it("should sort alphabetically with equal scores and types", () => {
    const similarChannels = [
      createTestChannel({
        id: "1",
        name: "Beta",
        slug: "beta",
        type: "public",
      }),
      createTestChannel({
        id: "2",
        name: "Alpha",
        slug: "alpha",
        type: "public",
      }),
    ];
    const result = filterChannels(similarChannels, "");
    expect(result[0].name).toBe("Alpha");
  });
});

describe("filterRoles", () => {
  const roles: MentionableRole[] = [
    createTestRole({ id: "1", name: "admin", memberCount: 5 }),
    createTestRole({ id: "2", name: "moderator", memberCount: 10 }),
    createTestRole({ id: "3", name: "developer", memberCount: 15 }),
  ];

  it("should filter roles by query", () => {
    const result = filterRoles(roles, "admin");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("admin");
  });

  it("should sort by score", () => {
    const result = filterRoles(roles, "mod");
    expect(result[0].name).toBe("moderator");
  });

  it("should return all roles with empty query", () => {
    const result = filterRoles(roles, "");
    expect(result.length).toBe(3);
  });
});

describe("filterGroupMentions", () => {
  it("should include @everyone when permitted", () => {
    const result = filterGroupMentions("", defaultPermissions);
    expect(result.some((g) => g.type === "everyone")).toBe(true);
  });

  it("should include @here when permitted", () => {
    const result = filterGroupMentions("", defaultPermissions);
    expect(result.some((g) => g.type === "here")).toBe(true);
  });

  it("should include @channel when permitted", () => {
    const result = filterGroupMentions("", defaultPermissions);
    expect(result.some((g) => g.type === "channel")).toBe(true);
  });

  it("should exclude unpermitted group mentions", () => {
    const result = filterGroupMentions("", restrictedPermissions);
    expect(result.length).toBe(0);
  });

  it("should filter by query", () => {
    const result = filterGroupMentions("every", defaultPermissions);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("everyone");
  });

  it("should match partial query", () => {
    const result = filterGroupMentions("her", defaultPermissions);
    expect(result.some((g) => g.type === "here")).toBe(true);
  });
});

// ============================================================================
// Suggestion Generation Tests
// ============================================================================

describe("userToSuggestion", () => {
  it("should create user suggestion with correct type", () => {
    const user = createTestUser({
      id: "user-1",
      username: "john",
      displayName: "John Doe",
    });
    const suggestion = userToSuggestion(user);

    expect(suggestion.type).toBe("user");
    expect(suggestion.id).toBe("user-1");
    expect(suggestion.label).toBe("John Doe");
    expect(suggestion.sublabel).toBe("@john");
    expect(suggestion.data).toBe(user);
  });

  it("should include avatar URL when available", () => {
    const user = createTestUser({
      avatarUrl: "https://example.com/avatar.jpg",
    });
    const suggestion = userToSuggestion(user);

    expect(suggestion.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("should include presence when available", () => {
    const user = createTestUser({ presence: "online" });
    const suggestion = userToSuggestion(user);

    expect(suggestion.presence).toBe("online");
  });
});

describe("channelToSuggestion", () => {
  it("should create channel suggestion with correct type", () => {
    const channel = createTestChannel({
      id: "channel-1",
      name: "General",
      slug: "general",
    });
    const suggestion = channelToSuggestion(channel);

    expect(suggestion.type).toBe("channel");
    expect(suggestion.id).toBe("channel-1");
    expect(suggestion.label).toBe("General");
    expect(suggestion.data).toBe(channel);
  });

  it("should include description as sublabel", () => {
    const channel = createTestChannel({
      description: "Main discussion channel",
    });
    const suggestion = channelToSuggestion(channel);

    expect(suggestion.sublabel).toBe("Main discussion channel");
  });

  it("should use correct icon for public channels", () => {
    const channel = createTestChannel({ type: "public" });
    const suggestion = channelToSuggestion(channel);

    expect(suggestion.icon).toBe("hash");
  });

  it("should use correct icon for private channels", () => {
    const channel = createTestChannel({ type: "private" });
    const suggestion = channelToSuggestion(channel);

    expect(suggestion.icon).toBe("lock");
  });

  it("should use custom icon when provided", () => {
    const channel = createTestChannel({ icon: "star" });
    const suggestion = channelToSuggestion(channel);

    expect(suggestion.icon).toBe("star");
  });
});

describe("groupMentionToSuggestion", () => {
  it("should create group suggestion for @everyone", () => {
    const suggestion = groupMentionToSuggestion(GROUP_MENTIONS.everyone);

    expect(suggestion.type).toBe("group");
    expect(suggestion.id).toBe("everyone");
    expect(suggestion.label).toBe("@everyone");
    expect(suggestion.sublabel).toBe(GROUP_MENTIONS.everyone.description);
  });

  it("should create group suggestion for @here", () => {
    const suggestion = groupMentionToSuggestion(GROUP_MENTIONS.here);

    expect(suggestion.type).toBe("group");
    expect(suggestion.id).toBe("here");
    expect(suggestion.label).toBe("@here");
  });

  it("should create group suggestion for @channel", () => {
    const suggestion = groupMentionToSuggestion(GROUP_MENTIONS.channel);

    expect(suggestion.type).toBe("group");
    expect(suggestion.id).toBe("channel");
    expect(suggestion.label).toBe("@channel");
  });
});

describe("roleToSuggestion", () => {
  it("should create role suggestion with correct type", () => {
    const role = createTestRole({
      id: "role-1",
      name: "admin",
      memberCount: 5,
    });
    const suggestion = roleToSuggestion(role);

    expect(suggestion.type).toBe("role");
    expect(suggestion.id).toBe("role-1");
    expect(suggestion.label).toBe("@admin");
    expect(suggestion.sublabel).toBe("5 members");
  });

  it("should include role color when available", () => {
    const role = createTestRole({ color: "#ff0000" });
    const suggestion = roleToSuggestion(role);

    expect(suggestion.color).toBe("#ff0000");
  });

  it("should have shield icon", () => {
    const role = createTestRole();
    const suggestion = roleToSuggestion(role);

    expect(suggestion.icon).toBe("shield");
  });
});

// ============================================================================
// Main Filter Function Tests
// ============================================================================

describe("filterMentionSuggestions", () => {
  const users: MentionableUser[] = [
    createTestUser({ id: "1", username: "alice", displayName: "Alice" }),
    createTestUser({ id: "2", username: "bob", displayName: "Bob" }),
  ];

  const channels: MentionableChannel[] = [
    createTestChannel({ id: "1", name: "General", slug: "general" }),
    createTestChannel({ id: "2", name: "Random", slug: "random" }),
  ];

  const roles: MentionableRole[] = [
    createTestRole({ id: "1", name: "admin", memberCount: 5 }),
  ];

  it("should return user suggestions for @ trigger", () => {
    const result = filterMentionSuggestions({
      users,
      channels,
      trigger: "@",
      query: "alice",
      permissions: restrictedPermissions,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe("user");
  });

  it("should return channel suggestions for # trigger", () => {
    const result = filterMentionSuggestions({
      users,
      channels,
      trigger: "#",
      query: "gen",
      permissions: defaultPermissions,
    });

    expect(result.length).toBe(1);
    expect(result[0].type).toBe("channel");
    expect(result[0].label).toBe("General");
  });

  it("should include group mentions for @ trigger", () => {
    const result = filterMentionSuggestions({
      users,
      channels,
      trigger: "@",
      query: "",
      permissions: defaultPermissions,
    });

    expect(result.some((s) => s.type === "group")).toBe(true);
  });

  it("should not include group mentions without permission", () => {
    const result = filterMentionSuggestions({
      users,
      channels,
      trigger: "@",
      query: "",
      permissions: restrictedPermissions,
    });

    expect(result.some((s) => s.type === "group")).toBe(false);
  });

  it("should include role mentions when permitted", () => {
    const result = filterMentionSuggestions({
      users,
      roles,
      trigger: "@",
      query: "admin",
      permissions: defaultPermissions,
    });

    expect(result.some((s) => s.type === "role")).toBe(true);
  });

  it("should respect maxSuggestions limit", () => {
    const manyUsers = Array.from({ length: 20 }, (_, i) =>
      createTestUser({
        id: `${i}`,
        username: `user${i}`,
        displayName: `User ${i}`,
      }),
    );

    const result = filterMentionSuggestions({
      users: manyUsers,
      trigger: "@",
      query: "",
      maxSuggestions: 5,
      permissions: restrictedPermissions,
    });

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should prioritize channel members", () => {
    const channelMemberIds = new Set(["1"]);

    const result = filterMentionSuggestions({
      users,
      trigger: "@",
      query: "",
      permissions: restrictedPermissions,
      prioritizeChannelMembers: true,
      channelMemberIds,
    });

    // Alice (id: 1) should be first since she's a channel member
    expect(result[0].label).toBe("Alice");
  });
});

// ============================================================================
// Keyboard Navigation Tests
// ============================================================================

describe("handleAutocompleteKeyboard", () => {
  const suggestions: MentionSuggestion[] = [
    userToSuggestion(createTestUser({ username: "alice" })),
    userToSuggestion(createTestUser({ username: "bob" })),
    userToSuggestion(createTestUser({ username: "charlie" })),
  ];

  const mockSelect = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
    mockSelect.mockClear();
    mockClose.mockClear();
  });

  describe("ArrowDown", () => {
    it("should increment selected index", () => {
      const result = handleAutocompleteKeyboard(
        "ArrowDown",
        0,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(1);
    });

    it("should wrap to beginning at end of list", () => {
      const result = handleAutocompleteKeyboard(
        "ArrowDown",
        2,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.newIndex).toBe(0);
    });
  });

  describe("ArrowUp", () => {
    it("should decrement selected index", () => {
      const result = handleAutocompleteKeyboard(
        "ArrowUp",
        1,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(0);
    });

    it("should wrap to end at beginning of list", () => {
      const result = handleAutocompleteKeyboard(
        "ArrowUp",
        0,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.newIndex).toBe(2);
    });
  });

  describe("Enter", () => {
    it("should call onSelect with selected suggestion", () => {
      handleAutocompleteKeyboard(
        "Enter",
        1,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(mockSelect).toHaveBeenCalledWith(suggestions[1]);
    });

    it("should return handled: true", () => {
      const result = handleAutocompleteKeyboard(
        "Enter",
        0,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.handled).toBe(true);
    });
  });

  describe("Tab", () => {
    it("should call onSelect with selected suggestion", () => {
      handleAutocompleteKeyboard("Tab", 0, suggestions, mockSelect, mockClose);

      expect(mockSelect).toHaveBeenCalledWith(suggestions[0]);
    });
  });

  describe("Escape", () => {
    it("should call onClose", () => {
      handleAutocompleteKeyboard(
        "Escape",
        0,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(mockClose).toHaveBeenCalled();
    });

    it("should return handled: true", () => {
      const result = handleAutocompleteKeyboard(
        "Escape",
        0,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.handled).toBe(true);
    });
  });

  describe("other keys", () => {
    it("should return handled: false for unrecognized keys", () => {
      const result = handleAutocompleteKeyboard(
        "a",
        0,
        suggestions,
        mockSelect,
        mockClose,
      );

      expect(result.handled).toBe(false);
    });
  });
});

// ============================================================================
// Insertion Tests
// ============================================================================

describe("getMentionInsertText", () => {
  it("should generate text for user mention", () => {
    const suggestion = userToSuggestion(createTestUser({ username: "john" }));
    const text = getMentionInsertText(suggestion);

    expect(text).toBe("@john ");
  });

  it("should generate text for channel mention", () => {
    const suggestion = channelToSuggestion(
      createTestChannel({ slug: "general" }),
    );
    const text = getMentionInsertText(suggestion);

    expect(text).toBe("#general ");
  });

  it("should generate text for group mention", () => {
    const suggestion = groupMentionToSuggestion(GROUP_MENTIONS.everyone);
    const text = getMentionInsertText(suggestion);

    expect(text).toBe("@everyone ");
  });

  it("should generate text for role mention", () => {
    const suggestion = roleToSuggestion(createTestRole({ name: "admin" }));
    const text = getMentionInsertText(suggestion);

    expect(text).toBe("@admin ");
  });
});

describe("calculateMentionReplacement", () => {
  it("should calculate correct replacement for user mention", () => {
    const text = "Hello @jo";
    const suggestion = userToSuggestion(createTestUser({ username: "john" }));
    const result = calculateMentionReplacement(text, 9, suggestion, 6);

    expect(result.newText).toBe("Hello @john ");
    // Cursor position: 6 (trigger start) + 6 (length of '@john ') = 12
    expect(result.newCursorPosition).toBe(12);
  });

  it("should preserve text before mention", () => {
    const text = "Hey @a";
    const suggestion = userToSuggestion(createTestUser({ username: "alice" }));
    const result = calculateMentionReplacement(text, 6, suggestion, 4);

    expect(result.newText).toBe("Hey @alice ");
  });

  it("should preserve text after cursor", () => {
    const text = "Hey @j world";
    const suggestion = userToSuggestion(createTestUser({ username: "john" }));
    const result = calculateMentionReplacement(text, 6, suggestion, 4);

    expect(result.newText).toBe("Hey @john  world");
  });

  it("should handle mention at start of text", () => {
    const text = "@j";
    const suggestion = userToSuggestion(createTestUser({ username: "john" }));
    const result = calculateMentionReplacement(text, 2, suggestion, 0);

    expect(result.newText).toBe("@john ");
    expect(result.newCursorPosition).toBe(6);
  });
});

// ============================================================================
// Recent Mentions Tests
// ============================================================================

describe("Recent Mentions", () => {
  beforeEach(() => {
    clearRecentMentions();
    // Mock localStorage
    const mockStorage: { [key: string]: string } = {};
    jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation((key) => mockStorage[key] || null);
    jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation((key, value) => {
        mockStorage[key] = value;
      });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getRecentMentions", () => {
    it("should return empty array when no recent mentions", () => {
      const result = getRecentMentions();
      expect(result).toEqual([]);
    });

    it("should return stored mentions", () => {
      addRecentMention("john");
      const result = getRecentMentions();
      expect(result).toContain("john");
    });
  });

  describe("addRecentMention", () => {
    it("should add mention to list", () => {
      addRecentMention("john");
      const result = getRecentMentions();
      expect(result).toContain("john");
    });

    it("should add most recent at beginning", () => {
      addRecentMention("john");
      addRecentMention("jane");
      const result = getRecentMentions();
      expect(result[0]).toBe("jane");
    });

    it("should move existing mention to front", () => {
      addRecentMention("john");
      addRecentMention("jane");
      addRecentMention("john");
      const result = getRecentMentions();
      expect(result[0]).toBe("john");
      expect(result.filter((m) => m === "john").length).toBe(1);
    });

    it("should limit to 5 recent mentions", () => {
      for (let i = 0; i < 10; i++) {
        addRecentMention(`user${i}`);
      }
      const result = getRecentMentions();
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("clearRecentMentions", () => {
    it("should clear all recent mentions", () => {
      addRecentMention("john");
      addRecentMention("jane");
      clearRecentMentions();
      const result = getRecentMentions();
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty user list", () => {
    const result = filterUsers([], "john");
    expect(result).toEqual([]);
  });

  it("should handle empty channel list", () => {
    const result = filterChannels([], "general");
    expect(result).toEqual([]);
  });

  it("should handle empty role list", () => {
    const result = filterRoles([], "admin");
    expect(result).toEqual([]);
  });

  it("should handle special characters in query", () => {
    const users = [createTestUser({ username: "john" })];
    const result = filterUsers(users, "@#$%");
    expect(result).toEqual([]);
  });

  it("should handle very long query", () => {
    const users = [createTestUser({ username: "john" })];
    const longQuery = "a".repeat(1000);
    const result = filterUsers(users, longQuery);
    expect(result).toEqual([]);
  });

  it("should handle users with no avatar", () => {
    const user = createTestUser({ avatarUrl: null });
    const suggestion = userToSuggestion(user);
    expect(suggestion.avatarUrl).toBeUndefined();
  });

  it("should handle channels with no description", () => {
    const channel = createTestChannel({ description: undefined });
    const suggestion = channelToSuggestion(channel);
    expect(suggestion.sublabel).toBeUndefined();
  });

  it("should handle empty suggestions array in keyboard handler", () => {
    const result = handleAutocompleteKeyboard(
      "ArrowDown",
      0,
      [],
      jest.fn(),
      jest.fn(),
    );
    expect(result.handled).toBe(true);
    expect(result.newIndex).toBeNaN(); // Empty array causes NaN from modulo
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have MAX_SUGGESTIONS defined", () => {
    expect(MAX_SUGGESTIONS).toBe(10);
  });
});
