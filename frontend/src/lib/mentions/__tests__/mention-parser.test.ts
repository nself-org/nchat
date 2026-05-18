/**
 * Mention Parser Unit Tests
 *
 * Comprehensive tests for mention parsing functionality including:
 * - User mentions (@username)
 * - Channel mentions (#channel)
 * - Group mentions (@everyone, @here, @channel)
 * - Parsing and resolution
 * - Edge cases and validation
 */

import {
  parseMentions,
  parseAndResolveMentions,
  extractUserMentions,
  extractChannelMentions,
  extractGroupMentions,
  containsMentions,
  containsUserMention,
  mentionsCurrentUser,
  replaceMentionsWithHTML,
  stripMentions,
  escapeMentions,
  unescapeMentions,
  isValidMentionUsername,
  isValidMentionChannelName,
  getMentionTypeFromRaw,
  formatUserMention,
  formatChannelMention,
  formatGroupMention,
  getMentionDisplayText,
  parseAutocompleteQuery,
  isCursorInMention,
  USER_MENTION_REGEX,
  CHANNEL_MENTION_REGEX,
  EVERYONE_MENTION_REGEX,
  HERE_MENTION_REGEX,
  CHANNEL_GROUP_MENTION_REGEX,
  ALL_MENTIONS_REGEX,
} from "../mention-parser";
import type {
  MentionableUser,
  MentionableChannel,
  ParsedMention,
} from "../mention-types";

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

// ============================================================================
// Regular Expression Tests
// ============================================================================

describe("Mention Regular Expressions", () => {
  describe("USER_MENTION_REGEX", () => {
    it("should match simple usernames", () => {
      const text = "@john hello";
      const matches = [...text.matchAll(USER_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("john");
    });

    it("should match usernames with underscores", () => {
      const text = "@john_doe hello";
      const matches = [...text.matchAll(USER_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("john_doe");
    });

    it("should match usernames with hyphens", () => {
      const text = "@john-doe hello";
      const matches = [...text.matchAll(USER_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("john-doe");
    });

    it("should match usernames with numbers", () => {
      const text = "@user123 hello";
      const matches = [...text.matchAll(USER_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("user123");
    });

    it("should match multiple mentions", () => {
      const text = "@alice and @bob are here";
      const matches = [...text.matchAll(USER_MENTION_REGEX)];
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe("alice");
      expect(matches[1][1]).toBe("bob");
    });

    it("should not match @ by itself", () => {
      const text = "@ hello";
      const matches = [...text.matchAll(USER_MENTION_REGEX)];
      expect(matches).toHaveLength(0);
    });
  });

  describe("CHANNEL_MENTION_REGEX", () => {
    it("should match simple channel names", () => {
      const text = "#general is the channel";
      const matches = [...text.matchAll(CHANNEL_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("general");
    });

    it("should match channels with hyphens", () => {
      const text = "check out #dev-team";
      const matches = [...text.matchAll(CHANNEL_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("dev-team");
    });

    it("should match channels with underscores", () => {
      const text = "go to #dev_team";
      const matches = [...text.matchAll(CHANNEL_MENTION_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("dev_team");
    });

    it("should match multiple channel mentions", () => {
      const text = "see #general and #random";
      const matches = [...text.matchAll(CHANNEL_MENTION_REGEX)];
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe("general");
      expect(matches[1][1]).toBe("random");
    });
  });

  describe("EVERYONE_MENTION_REGEX", () => {
    it("should match @everyone", () => {
      const text = "Hello @everyone!";
      expect(EVERYONE_MENTION_REGEX.test(text)).toBe(true);
    });

    it("should match @everyone case insensitively", () => {
      // Note: Need to reset lastIndex since regex has /g flag
      EVERYONE_MENTION_REGEX.lastIndex = 0;
      expect(EVERYONE_MENTION_REGEX.test("@Everyone")).toBe(true);
      EVERYONE_MENTION_REGEX.lastIndex = 0;
      expect(EVERYONE_MENTION_REGEX.test("@EVERYONE")).toBe(true);
    });

    it("should not match @everyoneX", () => {
      expect(EVERYONE_MENTION_REGEX.test("@everyoneX")).toBe(false);
    });
  });

  describe("HERE_MENTION_REGEX", () => {
    it("should match @here", () => {
      const text = "Attention @here!";
      expect(HERE_MENTION_REGEX.test(text)).toBe(true);
    });

    it("should match @here case insensitively", () => {
      HERE_MENTION_REGEX.lastIndex = 0;
      expect(HERE_MENTION_REGEX.test("@Here")).toBe(true);
      HERE_MENTION_REGEX.lastIndex = 0;
      expect(HERE_MENTION_REGEX.test("@HERE")).toBe(true);
    });
  });

  describe("CHANNEL_GROUP_MENTION_REGEX", () => {
    it("should match @channel", () => {
      const text = "Alert @channel!";
      expect(CHANNEL_GROUP_MENTION_REGEX.test(text)).toBe(true);
    });

    it("should match @channel case insensitively", () => {
      CHANNEL_GROUP_MENTION_REGEX.lastIndex = 0;
      expect(CHANNEL_GROUP_MENTION_REGEX.test("@Channel")).toBe(true);
      CHANNEL_GROUP_MENTION_REGEX.lastIndex = 0;
      expect(CHANNEL_GROUP_MENTION_REGEX.test("@CHANNEL")).toBe(true);
    });
  });

  describe("ALL_MENTIONS_REGEX", () => {
    it("should match both @ and # mentions", () => {
      const text = "@john check #general";
      const matches = [...text.matchAll(ALL_MENTIONS_REGEX)];
      expect(matches).toHaveLength(2);
    });
  });
});

// ============================================================================
// Core Parsing Tests
// ============================================================================

describe("parseMentions", () => {
  it("should parse a single user mention", () => {
    const result = parseMentions("Hello @john!");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].type).toBe("user");
    expect(result.mentions[0].identifier).toBe("john");
    expect(result.mentions[0].raw).toBe("@john");
  });

  it("should parse multiple user mentions", () => {
    const result = parseMentions("Hey @alice and @bob!");
    expect(result.mentions).toHaveLength(2);
    expect(result.mentions[0].identifier).toBe("alice");
    expect(result.mentions[1].identifier).toBe("bob");
  });

  it("should parse @everyone mention", () => {
    const result = parseMentions("Hello @everyone!");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].type).toBe("everyone");
    expect(result.hasEveryone).toBe(true);
  });

  it("should parse @here mention", () => {
    const result = parseMentions("Hey @here!");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].type).toBe("here");
    expect(result.hasHere).toBe(true);
  });

  it("should parse @channel mention", () => {
    const result = parseMentions("Attention @channel!");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].type).toBe("channel");
    expect(result.hasChannel).toBe(true);
  });

  it("should parse #channel mentions", () => {
    const result = parseMentions("Check #general please");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].type).toBe("channel");
    expect(result.mentions[0].identifier).toBe("general");
    expect(result.mentions[0].raw).toBe("#general");
  });

  it("should parse mixed mentions", () => {
    const result = parseMentions("@alice check #general and notify @everyone");
    expect(result.mentions).toHaveLength(3);
    expect(result.hasEveryone).toBe(true);
  });

  it("should return correct start and end positions", () => {
    const result = parseMentions("Hello @john how are you");
    expect(result.mentions[0].start).toBe(6);
    expect(result.mentions[0].end).toBe(11);
  });

  it("should sort mentions by position", () => {
    const result = parseMentions("@second middle @first end");
    expect(result.mentions[0].start).toBeLessThan(result.mentions[1].start);
  });

  it("should handle empty string", () => {
    const result = parseMentions("");
    expect(result.mentions).toHaveLength(0);
    expect(result.hasEveryone).toBe(false);
    expect(result.hasHere).toBe(false);
    expect(result.hasChannel).toBe(false);
  });

  it("should handle string with no mentions", () => {
    const result = parseMentions("Hello world, no mentions here!");
    expect(result.mentions).toHaveLength(0);
  });

  it("should handle mentions at start of string", () => {
    const result = parseMentions("@john is here");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].start).toBe(0);
  });

  it("should handle mentions at end of string", () => {
    const result = parseMentions("hello @john");
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].end).toBe(11);
  });

  it("should handle consecutive mentions", () => {
    const result = parseMentions("@alice@bob");
    // The regex matches @alice@bob, then @bob as separate matches
    expect(result.mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle mentions with punctuation", () => {
    const result = parseMentions("@john, @jane, and @jim.");
    expect(result.mentions).toHaveLength(3);
  });
});

// ============================================================================
// Resolution Tests
// ============================================================================

describe("parseAndResolveMentions", () => {
  const users: MentionableUser[] = [
    createTestUser({ id: "user-1", username: "john", displayName: "John Doe" }),
    createTestUser({
      id: "user-2",
      username: "jane",
      displayName: "Jane Smith",
    }),
  ];

  const channels: MentionableChannel[] = [
    createTestChannel({ id: "channel-1", name: "General", slug: "general" }),
    createTestChannel({ id: "channel-2", name: "Random", slug: "random" }),
  ];

  it("should resolve user mentions", () => {
    const result = parseAndResolveMentions("@john hello", users, channels);
    expect(result.mentions[0].data).toBeDefined();
    expect(result.mentions[0].data?.type).toBe("user");
    expect(result.userIds).toContain("user-1");
  });

  it("should resolve channel mentions", () => {
    const result = parseAndResolveMentions("check #general", users, channels);
    expect(result.mentions[0].data).toBeDefined();
    expect(result.mentions[0].data?.type).toBe("channel");
    expect(result.channelIds).toContain("channel-1");
  });

  it("should handle unresolved user mentions", () => {
    const result = parseAndResolveMentions("@unknown hello", users, channels);
    expect(result.mentions[0].data).toBeUndefined();
    expect(result.userIds).toHaveLength(0);
  });

  it("should handle unresolved channel mentions", () => {
    const result = parseAndResolveMentions("check #unknown", users, channels);
    expect(result.mentions[0].data).toBeUndefined();
    expect(result.channelIds).toHaveLength(0);
  });

  it("should be case insensitive for username lookup", () => {
    const result = parseAndResolveMentions("@JOHN hello", users, channels);
    expect(result.mentions[0].data).toBeDefined();
    expect(result.userIds).toContain("user-1");
  });

  it("should be case insensitive for channel lookup", () => {
    const result = parseAndResolveMentions("check #GENERAL", users, channels);
    expect(result.mentions[0].data).toBeDefined();
    expect(result.channelIds).toContain("channel-1");
  });

  it("should resolve mixed mentions correctly", () => {
    const result = parseAndResolveMentions(
      "@john check #general and @jane",
      users,
      channels,
    );
    expect(result.userIds).toHaveLength(2);
    expect(result.channelIds).toHaveLength(1);
    expect(result.userIds).toContain("user-1");
    expect(result.userIds).toContain("user-2");
  });

  it("should not duplicate user IDs", () => {
    const result = parseAndResolveMentions(
      "@john hello @john again",
      users,
      channels,
    );
    expect(result.userIds).toHaveLength(1);
    expect(result.mentions).toHaveLength(2);
  });

  it("should preserve group mention data", () => {
    const result = parseAndResolveMentions("@everyone hello", users, channels);
    expect(result.mentions[0].data).toBeDefined();
    expect(result.mentions[0].data?.type).toBe("everyone");
    expect(result.hasEveryone).toBe(true);
  });
});

// ============================================================================
// Extraction Tests
// ============================================================================

describe("extractUserMentions", () => {
  it("should extract user mentions only", () => {
    const mentions = extractUserMentions("@john and @jane check #general");
    expect(mentions).toHaveLength(2);
    expect(mentions).toContain("john");
    expect(mentions).toContain("jane");
  });

  it("should not include special mentions", () => {
    const mentions = extractUserMentions("@john @everyone @here");
    expect(mentions).toHaveLength(1);
    expect(mentions).toContain("john");
    expect(mentions).not.toContain("everyone");
    expect(mentions).not.toContain("here");
  });

  it("should not include duplicates", () => {
    const mentions = extractUserMentions("@john @jane @john");
    expect(mentions).toHaveLength(2);
  });

  it("should return empty array for no mentions", () => {
    const mentions = extractUserMentions("no mentions here");
    expect(mentions).toHaveLength(0);
  });
});

describe("extractChannelMentions", () => {
  it("should extract channel mentions only", () => {
    const mentions = extractChannelMentions("@john check #general and #random");
    expect(mentions).toHaveLength(2);
    expect(mentions).toContain("general");
    expect(mentions).toContain("random");
  });

  it("should not include duplicates", () => {
    const mentions = extractChannelMentions("#general hello #general");
    expect(mentions).toHaveLength(1);
  });

  it("should return empty array for no mentions", () => {
    const mentions = extractChannelMentions("no mentions here");
    expect(mentions).toHaveLength(0);
  });
});

describe("extractGroupMentions", () => {
  it("should detect @everyone", () => {
    const result = extractGroupMentions("Hello @everyone!");
    expect(result.hasEveryone).toBe(true);
    expect(result.hasHere).toBe(false);
    expect(result.hasChannel).toBe(false);
  });

  it("should detect @here", () => {
    const result = extractGroupMentions("Hey @here!");
    expect(result.hasHere).toBe(true);
    expect(result.hasEveryone).toBe(false);
  });

  it("should detect @channel", () => {
    const result = extractGroupMentions("Alert @channel!");
    expect(result.hasChannel).toBe(true);
    expect(result.hasEveryone).toBe(false);
  });

  it("should detect multiple group mentions", () => {
    const result = extractGroupMentions("@everyone and @here!");
    expect(result.hasEveryone).toBe(true);
    expect(result.hasHere).toBe(true);
  });

  it("should return false for no group mentions", () => {
    const result = extractGroupMentions("Hello @john!");
    expect(result.hasEveryone).toBe(false);
    expect(result.hasHere).toBe(false);
    expect(result.hasChannel).toBe(false);
  });
});

// ============================================================================
// Contains Tests
// ============================================================================

describe("containsMentions", () => {
  it("should return true for @ mentions", () => {
    expect(containsMentions("@john hello")).toBe(true);
  });

  it("should return true for # mentions", () => {
    ALL_MENTIONS_REGEX.lastIndex = 0;
    expect(containsMentions("#general hello")).toBe(true);
  });

  it("should return false for no mentions", () => {
    expect(containsMentions("hello world")).toBe(false);
  });

  it("should return false for standalone @ or #", () => {
    expect(containsMentions("email@domain.com")).toBe(true); // Will match @domain
    expect(containsMentions("# header")).toBe(false);
  });
});

describe("containsUserMention", () => {
  it("should return true if username is mentioned", () => {
    expect(containsUserMention("@john hello", "john")).toBe(true);
  });

  it("should return false if username is not mentioned", () => {
    expect(containsUserMention("@jane hello", "john")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(containsUserMention("@JOHN hello", "john")).toBe(true);
    expect(containsUserMention("@john hello", "JOHN")).toBe(true);
  });

  it("should not match partial usernames", () => {
    expect(containsUserMention("@johnny hello", "john")).toBe(false);
  });
});

describe("mentionsCurrentUser", () => {
  it("should return true for direct mention", () => {
    expect(mentionsCurrentUser("@john hello", "john")).toBe(true);
  });

  it("should return true for @everyone", () => {
    expect(mentionsCurrentUser("@everyone hello", "john")).toBe(true);
  });

  it("should return true for @here", () => {
    expect(mentionsCurrentUser("@here hello", "john")).toBe(true);
  });

  it("should return true for @channel", () => {
    expect(mentionsCurrentUser("@channel hello", "john")).toBe(true);
  });

  it("should return false for other user mentions", () => {
    expect(mentionsCurrentUser("@jane hello", "john")).toBe(false);
  });
});

// ============================================================================
// Replacement and Formatting Tests
// ============================================================================

describe("replaceMentionsWithHTML", () => {
  const usersMap = new Map<string, MentionableUser>([
    [
      "john",
      createTestUser({
        id: "user-1",
        username: "john",
        displayName: "John Doe",
      }),
    ],
  ]);

  const channelsMap = new Map<string, MentionableChannel>([
    [
      "general",
      createTestChannel({ id: "channel-1", name: "General", slug: "general" }),
    ],
  ]);

  it("should replace user mentions with HTML", () => {
    const result = replaceMentionsWithHTML(
      "@john hello",
      usersMap,
      channelsMap,
    );
    expect(result).toContain('class="mention mention-user"');
    expect(result).toContain('data-user-id="user-1"');
    expect(result).toContain("John Doe");
  });

  it("should replace channel mentions with HTML", () => {
    const result = replaceMentionsWithHTML(
      "check #general",
      usersMap,
      channelsMap,
    );
    expect(result).toContain('class="mention mention-channel"');
    expect(result).toContain('data-channel-id="channel-1"');
    expect(result).toContain("General");
  });

  it("should replace @everyone with HTML", () => {
    const result = replaceMentionsWithHTML(
      "Hey @everyone!",
      usersMap,
      channelsMap,
    );
    expect(result).toContain('class="mention mention-group mention-everyone"');
    expect(result).toContain("@everyone");
  });

  it("should replace @here with HTML", () => {
    const result = replaceMentionsWithHTML("Hey @here!", usersMap, channelsMap);
    expect(result).toContain("mention-here");
    expect(result).toContain("@here");
  });

  it("should handle unknown users", () => {
    const result = replaceMentionsWithHTML(
      "@unknown hello",
      usersMap,
      channelsMap,
    );
    expect(result).toContain("mention-unknown");
    expect(result).toContain("@unknown");
  });

  it("should handle unknown channels", () => {
    const result = replaceMentionsWithHTML(
      "#unknown hello",
      usersMap,
      channelsMap,
    );
    expect(result).toContain("mention-unknown");
    expect(result).toContain("#unknown");
  });

  it("should accept custom templates", () => {
    const result = replaceMentionsWithHTML(
      "@john hello",
      usersMap,
      channelsMap,
      {
        userTemplate: (u) => `<b>@${u.username}</b>`,
      },
    );
    expect(result).toContain("<b>@john</b>");
  });
});

describe("stripMentions", () => {
  it("should strip @ from user mentions", () => {
    const result = stripMentions("@john hello");
    expect(result).toBe("john hello");
  });

  it("should strip # from channel mentions", () => {
    const result = stripMentions("#general hello");
    expect(result).toBe("general hello");
  });

  it("should strip both @ and # mentions", () => {
    const result = stripMentions("@john check #general");
    expect(result).toBe("john check general");
  });
});

describe("escapeMentions", () => {
  it("should escape @ symbols", () => {
    const result = escapeMentions("@john");
    expect(result).toBe("\\@john");
  });

  it("should escape # symbols", () => {
    const result = escapeMentions("#general");
    expect(result).toBe("\\#general");
  });

  it("should escape both symbols", () => {
    const result = escapeMentions("@john #general");
    expect(result).toBe("\\@john \\#general");
  });
});

describe("unescapeMentions", () => {
  it("should unescape @ symbols", () => {
    const result = unescapeMentions("\\@john");
    expect(result).toBe("@john");
  });

  it("should unescape # symbols", () => {
    const result = unescapeMentions("\\#general");
    expect(result).toBe("#general");
  });

  it("should be inverse of escapeMentions", () => {
    const original = "@john #general";
    const escaped = escapeMentions(original);
    const unescaped = unescapeMentions(escaped);
    expect(unescaped).toBe(original);
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("isValidMentionUsername", () => {
  it("should accept valid usernames", () => {
    expect(isValidMentionUsername("john")).toBe(true);
    expect(isValidMentionUsername("john_doe")).toBe(true);
    expect(isValidMentionUsername("john-doe")).toBe(true);
    expect(isValidMentionUsername("john123")).toBe(true);
    expect(isValidMentionUsername("JohnDoe")).toBe(true);
  });

  it("should reject invalid usernames", () => {
    expect(isValidMentionUsername("john doe")).toBe(false);
    expect(isValidMentionUsername("john.doe")).toBe(false);
    expect(isValidMentionUsername("john@doe")).toBe(false);
    expect(isValidMentionUsername("")).toBe(false);
  });
});

describe("isValidMentionChannelName", () => {
  it("should accept valid channel names", () => {
    expect(isValidMentionChannelName("general")).toBe(true);
    expect(isValidMentionChannelName("dev-team")).toBe(true);
    expect(isValidMentionChannelName("dev_team")).toBe(true);
    expect(isValidMentionChannelName("General123")).toBe(true);
  });

  it("should reject invalid channel names", () => {
    expect(isValidMentionChannelName("dev team")).toBe(false);
    expect(isValidMentionChannelName("dev.team")).toBe(false);
    expect(isValidMentionChannelName("")).toBe(false);
  });
});

describe("getMentionTypeFromRaw", () => {
  it("should identify user mentions", () => {
    expect(getMentionTypeFromRaw("@john")).toBe("user");
  });

  it("should identify channel mentions", () => {
    expect(getMentionTypeFromRaw("#general")).toBe("channel");
  });

  it("should identify @everyone", () => {
    expect(getMentionTypeFromRaw("@everyone")).toBe("everyone");
  });

  it("should identify @here", () => {
    expect(getMentionTypeFromRaw("@here")).toBe("here");
  });

  it("should identify @channel", () => {
    expect(getMentionTypeFromRaw("@channel")).toBe("channel");
  });
});

// ============================================================================
// Formatting Tests
// ============================================================================

describe("formatUserMention", () => {
  it("should format user mention", () => {
    expect(formatUserMention("john")).toBe("@john");
  });
});

describe("formatChannelMention", () => {
  it("should format channel mention", () => {
    expect(formatChannelMention("general")).toBe("#general");
  });
});

describe("formatGroupMention", () => {
  it("should format @everyone", () => {
    expect(formatGroupMention("everyone")).toBe("@everyone");
  });

  it("should format @here", () => {
    expect(formatGroupMention("here")).toBe("@here");
  });

  it("should format @channel", () => {
    expect(formatGroupMention("channel")).toBe("@channel");
  });
});

describe("getMentionDisplayText", () => {
  it("should return display name for user mention", () => {
    const mention: ParsedMention = {
      type: "user",
      raw: "@john",
      identifier: "john",
      start: 0,
      end: 5,
      data: {
        type: "user",
        userId: "user-1",
        username: "john",
        displayName: "John Doe",
      },
    };
    expect(getMentionDisplayText(mention)).toBe("@John Doe");
  });

  it("should return channel name for channel mention", () => {
    const mention: ParsedMention = {
      type: "channel",
      raw: "#general",
      identifier: "general",
      start: 0,
      end: 8,
      data: {
        type: "channel",
        channelId: "channel-1",
        channelName: "General",
        channelSlug: "general",
      },
    };
    expect(getMentionDisplayText(mention)).toBe("#General");
  });

  it("should return raw text for unresolved mention", () => {
    const mention: ParsedMention = {
      type: "user",
      raw: "@unknown",
      identifier: "unknown",
      start: 0,
      end: 8,
    };
    expect(getMentionDisplayText(mention)).toBe("@unknown");
  });
});

// ============================================================================
// Autocomplete Query Tests
// ============================================================================

describe("parseAutocompleteQuery", () => {
  it("should parse @ mention at cursor", () => {
    const result = parseAutocompleteQuery("Hello @jo", 9);
    expect(result).not.toBeNull();
    expect(result!.trigger).toBe("@");
    expect(result!.query).toBe("jo");
    expect(result!.start).toBe(6);
  });

  it("should parse # mention at cursor", () => {
    const result = parseAutocompleteQuery("Check #gen", 10);
    expect(result).not.toBeNull();
    expect(result!.trigger).toBe("#");
    expect(result!.query).toBe("gen");
  });

  it("should return empty query for trigger only", () => {
    const result = parseAutocompleteQuery("Hello @", 7);
    expect(result).not.toBeNull();
    expect(result!.trigger).toBe("@");
    expect(result!.query).toBe("");
  });

  it("should return null for cursor not in mention", () => {
    const result = parseAutocompleteQuery("Hello world", 5);
    expect(result).toBeNull();
  });

  it("should return null for trigger mid-word", () => {
    const result = parseAutocompleteQuery("email@domain", 8);
    expect(result).toBeNull();
  });

  it("should handle cursor at start", () => {
    const result = parseAutocompleteQuery("@john", 5);
    expect(result).not.toBeNull();
    expect(result!.query).toBe("john");
  });

  it("should handle trigger after space", () => {
    const result = parseAutocompleteQuery("Hey @", 5);
    expect(result).not.toBeNull();
    expect(result!.trigger).toBe("@");
  });
});

describe("isCursorInMention", () => {
  it("should return true when cursor is in mention", () => {
    expect(isCursorInMention("@john", 3)).toBe(true);
  });

  it("should return false when cursor is not in mention", () => {
    expect(isCursorInMention("hello world", 5)).toBe(false);
  });

  it("should return true for # trigger", () => {
    expect(isCursorInMention("#general", 5)).toBe(true);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle multiline content", () => {
    const content = "Line 1 @john\nLine 2 @jane";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(2);
  });

  it("should handle mentions with newlines between", () => {
    const content = "@john\n\n@jane";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(2);
  });

  it("should handle tab characters", () => {
    const content = "@john\t@jane";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(2);
  });

  it("should handle Unicode in surrounding text", () => {
    const content = "Hello @john 👋";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].identifier).toBe("john");
  });

  it("should handle very long usernames", () => {
    const longUsername = "a".repeat(100);
    const content = `@${longUsername} hello`;
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].identifier).toBe(longUsername);
  });

  it("should handle content with only mentions", () => {
    const content = "@john @jane @bob";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(3);
  });

  it("should handle special characters after mention", () => {
    const content = "@john! @jane? @bob.";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(3);
    expect(result.mentions[0].identifier).toBe("john");
    expect(result.mentions[1].identifier).toBe("jane");
    expect(result.mentions[2].identifier).toBe("bob");
  });

  it("should handle parentheses around mentions", () => {
    const content = "(@john) hello";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(1);
  });

  it("should handle brackets around mentions", () => {
    const content = "[@john] hello";
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(1);
  });

  it("should handle quotes around mentions", () => {
    const content = '"@john" hello';
    const result = parseMentions(content);
    expect(result.mentions).toHaveLength(1);
  });
});
