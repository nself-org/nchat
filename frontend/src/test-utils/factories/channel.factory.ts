/**
 * Channel Factory
 *
 * Factory functions for creating channel test data
 */

import type { TestChannel } from "../render";

// ============================================================================
// Counter for unique IDs
// ============================================================================

let channelIdCounter = 0;

function generateChannelId(): string {
  return `channel-${++channelIdCounter}-${Date.now()}`;
}

// ============================================================================
// Channel Factory
// ============================================================================

export interface ChannelFactoryOptions extends Partial<TestChannel> {}

/**
 * Create a test channel with default values
 */
export function createChannel(
  options: ChannelFactoryOptions = {},
): TestChannel {
  const id = options.id || generateChannelId();
  const name = options.name || `channel-${channelIdCounter}`;
  const slug = options.slug || name.toLowerCase().replace(/\s+/g, "-");

  return {
    id,
    name,
    slug,
    description: options.description,
    type: options.type || "public",
    isDefault: options.isDefault ?? false,
    isArchived: options.isArchived ?? false,
    memberCount: options.memberCount ?? 1,
  };
}

/**
 * Create multiple test channels
 */
export function createChannels(
  count: number,
  options: ChannelFactoryOptions = {},
): TestChannel[] {
  return Array.from({ length: count }, (_, i) =>
    createChannel({
      ...options,
      name: options.name ? `${options.name}-${i + 1}` : `channel-${i + 1}`,
    }),
  );
}

/**
 * Create a public channel
 */
export function createPublicChannel(
  options: Omit<ChannelFactoryOptions, "type"> = {},
): TestChannel {
  return createChannel({
    ...options,
    type: "public",
  });
}

/**
 * Create a private channel
 */
export function createPrivateChannel(
  options: Omit<ChannelFactoryOptions, "type"> = {},
): TestChannel {
  return createChannel({
    ...options,
    type: "private",
  });
}

/**
 * Create a direct message channel
 */
export function createDirectChannel(
  user1Id: string,
  user2Id: string,
  options: Omit<ChannelFactoryOptions, "type" | "name" | "slug"> = {},
): TestChannel {
  return createChannel({
    ...options,
    id: options.id || `dm-${user1Id}-${user2Id}`,
    name: "", // DMs typically don't have names
    slug: `dm-${user1Id}-${user2Id}`,
    type: "direct",
    memberCount: 2,
  });
}

/**
 * Create a group DM channel
 */
export function createGroupChannel(
  options: Omit<ChannelFactoryOptions, "type"> = {},
): TestChannel {
  return createChannel({
    name: "Group Chat",
    ...options,
    type: "group",
  });
}

/**
 * Create the default/general channel
 */
export function createDefaultChannel(
  options: Omit<ChannelFactoryOptions, "isDefault"> = {},
): TestChannel {
  return createChannel({
    name: "general",
    slug: "general",
    description: "General discussion for everyone",
    ...options,
    isDefault: true,
  });
}

/**
 * Create an archived channel
 */
export function createArchivedChannel(
  options: Omit<ChannelFactoryOptions, "isArchived"> = {},
): TestChannel {
  return createChannel({
    name: "archived-project",
    description: "Archived project channel",
    ...options,
    isArchived: true,
  });
}

/**
 * Create a channel with many members
 */
export function createPopularChannel(
  memberCount: number = 100,
  options: Omit<ChannelFactoryOptions, "memberCount"> = {},
): TestChannel {
  return createChannel({
    name: "popular",
    description: "A popular channel with many members",
    ...options,
    memberCount,
  });
}

// ============================================================================
// Pre-defined Channels
// ============================================================================

export const predefinedChannels = {
  general: createDefaultChannel({
    id: "channel-general",
    memberCount: 25,
  }),
  random: createPublicChannel({
    id: "channel-random",
    name: "random",
    slug: "random",
    description: "Random conversations and fun",
    memberCount: 20,
  }),
  engineering: createPrivateChannel({
    id: "channel-engineering",
    name: "engineering",
    slug: "engineering",
    description: "Engineering team discussions",
    memberCount: 8,
  }),
  announcements: createPublicChannel({
    id: "channel-announcements",
    name: "announcements",
    slug: "announcements",
    description: "Important announcements",
    memberCount: 50,
  }),
  archived: createArchivedChannel({
    id: "channel-archived",
    name: "old-project",
    slug: "old-project",
    memberCount: 5,
  }),
};

/**
 * Create a typical workspace channel setup
 */
export function createWorkspaceChannels(): TestChannel[] {
  return [
    predefinedChannels.general,
    predefinedChannels.random,
    predefinedChannels.announcements,
    createPrivateChannel({
      name: "team-leads",
      slug: "team-leads",
      description: "Team leads discussions",
      memberCount: 5,
    }),
    createPrivateChannel({
      name: "hr-internal",
      slug: "hr-internal",
      description: "HR team internal",
      memberCount: 3,
    }),
  ];
}

// ============================================================================
// Reset Counter
// ============================================================================

export function resetChannelIdCounter() {
  channelIdCounter = 0;
}
