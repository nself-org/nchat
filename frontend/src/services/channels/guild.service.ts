/**
 * Guild/Server Management Service
 * Handles Discord-style server/guild operations
 */

import type {
  Workspace,
  CreateChannelInput,
  ChannelCategory,
  Channel,
} from "@/types/advanced-channels";

// ============================================================================
// Guild Structure Defaults
// ============================================================================

export const DEFAULT_GUILD_CATEGORIES = [
  { name: "TEXT CHANNELS", position: 0, icon: "💬" },
  { name: "VOICE CHANNELS", position: 1, icon: "🔊" },
  { name: "INFORMATION", position: 2, icon: "ℹ️" },
] as const;

export const DEFAULT_GUILD_CHANNELS = [
  {
    name: "general",
    categoryName: "TEXT CHANNELS",
    type: "public" as const,
    position: 0,
    isDefault: true,
    topic: "General discussion",
  },
  {
    name: "random",
    categoryName: "TEXT CHANNELS",
    type: "public" as const,
    position: 1,
    topic: "Random off-topic chat",
  },
  {
    name: "announcements",
    categoryName: "TEXT CHANNELS",
    type: "public" as const,
    position: 2,
    isReadonly: true,
    topic: "Important announcements (read-only)",
  },
  {
    name: "General Voice",
    categoryName: "VOICE CHANNELS",
    type: "voice" as const,
    position: 0,
    maxMembers: 10,
  },
  {
    name: "Team Voice",
    categoryName: "VOICE CHANNELS",
    type: "voice" as const,
    position: 1,
    maxMembers: 25,
  },
  {
    name: "rules",
    categoryName: "INFORMATION",
    type: "public" as const,
    position: 0,
    isReadonly: true,
    topic: "Server rules and guidelines",
  },
  {
    name: "welcome",
    categoryName: "INFORMATION",
    type: "public" as const,
    position: 1,
    isReadonly: true,
    topic: "Welcome new members!",
  },
] as const;

// ============================================================================
// Interfaces
// ============================================================================

export interface GuildTemplate {
  name: string;
  description: string;
  categories: ReadonlyArray<{ name: string; position: number; icon: string }>;
  channels: ReadonlyArray<{
    name: string;
    categoryName: string;
    type: "public" | "private" | "voice";
    position: number;
    isDefault?: boolean;
    isReadonly?: boolean;
    topic?: string;
    maxMembers?: number;
  }>;
}

export interface GuildCreationOptions {
  name: string;
  slug?: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  vanityUrl?: string;
  ownerId: string;
  organizationId: string;
  template?: "default" | "community" | "gaming" | "study" | "blank";
  verificationLevel?: number;
  explicitContentFilter?: number;
  isDiscoverable?: boolean;
  maxMembers?: number;
  maxChannels?: number;
  maxFileSizeMb?: number;
}

export interface GuildStructure {
  guild: Workspace;
  categories: ChannelCategory[];
  channels: Channel[];
  defaultChannelId: string;
  rulesChannelId?: string;
}

// ============================================================================
// Templates
// ============================================================================

export const GUILD_TEMPLATES: Record<string, GuildTemplate> = {
  default: {
    name: "Default",
    description: "Standard guild with text and voice channels",
    categories: DEFAULT_GUILD_CATEGORIES,
    channels: DEFAULT_GUILD_CHANNELS,
  },
  community: {
    name: "Community",
    description: "Community-focused with discussion channels",
    categories: [
      { name: "WELCOME", position: 0, icon: "👋" },
      { name: "GENERAL", position: 1, icon: "💬" },
      { name: "TOPICS", position: 2, icon: "📚" },
      { name: "VOICE", position: 3, icon: "🔊" },
    ],
    channels: [
      {
        name: "welcome",
        categoryName: "WELCOME",
        type: "public" as const,
        position: 0,
        isReadonly: true,
      },
      {
        name: "rules",
        categoryName: "WELCOME",
        type: "public" as const,
        position: 1,
        isReadonly: true,
      },
      {
        name: "general",
        categoryName: "GENERAL",
        type: "public" as const,
        position: 0,
        isDefault: true,
      },
      {
        name: "introductions",
        categoryName: "GENERAL",
        type: "public" as const,
        position: 1,
      },
      {
        name: "announcements",
        categoryName: "GENERAL",
        type: "public" as const,
        position: 2,
        isReadonly: true,
      },
      {
        name: "topic-1",
        categoryName: "TOPICS",
        type: "public" as const,
        position: 0,
      },
      {
        name: "topic-2",
        categoryName: "TOPICS",
        type: "public" as const,
        position: 1,
      },
      {
        name: "Lounge",
        categoryName: "VOICE",
        type: "voice" as const,
        position: 0,
        maxMembers: 10,
      },
    ],
  },
  gaming: {
    name: "Gaming",
    description: "Gaming-focused with team channels",
    categories: [
      { name: "INFORMATION", position: 0, icon: "ℹ️" },
      { name: "TEXT CHAT", position: 1, icon: "💬" },
      { name: "VOICE CHAT", position: 2, icon: "🔊" },
    ],
    channels: [
      {
        name: "rules",
        categoryName: "INFORMATION",
        type: "public" as const,
        position: 0,
        isReadonly: true,
      },
      {
        name: "announcements",
        categoryName: "INFORMATION",
        type: "public" as const,
        position: 1,
        isReadonly: true,
      },
      {
        name: "general",
        categoryName: "TEXT CHAT",
        type: "public" as const,
        position: 0,
        isDefault: true,
      },
      {
        name: "looking-for-group",
        categoryName: "TEXT CHAT",
        type: "public" as const,
        position: 1,
      },
      {
        name: "off-topic",
        categoryName: "TEXT CHAT",
        type: "public" as const,
        position: 2,
      },
      {
        name: "General",
        categoryName: "VOICE CHAT",
        type: "voice" as const,
        position: 0,
        maxMembers: 10,
      },
      {
        name: "Squad 1",
        categoryName: "VOICE CHAT",
        type: "voice" as const,
        position: 1,
        maxMembers: 5,
      },
      {
        name: "Squad 2",
        categoryName: "VOICE CHAT",
        type: "voice" as const,
        position: 2,
        maxMembers: 5,
      },
    ],
  },
  study: {
    name: "Study",
    description: "Study group with focus rooms",
    categories: [
      { name: "INFO", position: 0, icon: "📌" },
      { name: "STUDY", position: 1, icon: "📖" },
      { name: "FOCUS ROOMS", position: 2, icon: "🎯" },
    ],
    channels: [
      {
        name: "welcome",
        categoryName: "INFO",
        type: "public" as const,
        position: 0,
        isReadonly: true,
      },
      {
        name: "resources",
        categoryName: "INFO",
        type: "public" as const,
        position: 1,
      },
      {
        name: "general",
        categoryName: "STUDY",
        type: "public" as const,
        position: 0,
        isDefault: true,
      },
      {
        name: "homework-help",
        categoryName: "STUDY",
        type: "public" as const,
        position: 1,
      },
      {
        name: "study-tips",
        categoryName: "STUDY",
        type: "public" as const,
        position: 2,
      },
      {
        name: "Focus Room 1",
        categoryName: "FOCUS ROOMS",
        type: "voice" as const,
        position: 0,
        maxMembers: 4,
      },
      {
        name: "Focus Room 2",
        categoryName: "FOCUS ROOMS",
        type: "voice" as const,
        position: 1,
        maxMembers: 4,
      },
    ],
  },
  blank: {
    name: "Blank",
    description: "Empty guild with no default channels",
    categories: [],
    channels: [],
  },
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Generate a unique slug from guild name
 */
export function generateGuildSlug(
  name: string,
  existingSlugs: string[] = [],
): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // If slug exists, append number
  let counter = 1;
  let uniqueSlug = slug;
  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

/**
 * Get guild template by name
 */
export function getGuildTemplate(templateName: string): GuildTemplate {
  return GUILD_TEMPLATES[templateName] || GUILD_TEMPLATES.default;
}

/**
 * Create guild structure from template
 * Returns the complete structure ready for database insertion
 */
export function createGuildStructure(
  options: GuildCreationOptions,
): GuildStructure {
  const template = getGuildTemplate(options.template || "default");
  const now = new Date().toISOString();

  // Generate slug if not provided
  const slug = options.slug || generateGuildSlug(options.name);

  // Create guild (workspace)
  const guild: Workspace = {
    id: `guild-${Date.now()}`,
    organizationId: options.organizationId,
    name: options.name,
    slug,
    description: options.description,
    iconUrl: options.iconUrl,
    bannerUrl: options.bannerUrl,
    vanityUrl: options.vanityUrl,
    isDiscoverable: options.isDiscoverable ?? false,
    verificationLevel: options.verificationLevel ?? 0,
    explicitContentFilter: options.explicitContentFilter ?? 0,
    systemChannelId: undefined, // Will be set after channel creation
    rulesChannelId: undefined, // Will be set after channel creation
    memberCount: 1, // Creator
    boostTier: 0,
    boostCount: 0,
    maxMembers: options.maxMembers ?? 5000,
    maxChannels: options.maxChannels ?? 100,
    maxFileSizeMb: options.maxFileSizeMb ?? 25,
    ownerId: options.ownerId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    settings: {},
    features: {},
  };

  // Create categories
  const categories: ChannelCategory[] = template.categories.map((cat, idx) => ({
    id: `cat-${guild.id}-${idx}`,
    workspaceId: guild.id,
    name: cat.name,
    description: undefined,
    icon: cat.icon || undefined,
    color: undefined,
    position: cat.position,
    defaultPermissions: 0n, // Base permissions
    syncPermissions: true,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  }));

  // Create category lookup map
  const categoryMap = new Map<string, string>();
  categories.forEach((cat) => {
    const templateCat = template.categories.find((tc) => tc.name === cat.name);
    if (templateCat) {
      categoryMap.set(templateCat.name, cat.id);
    }
  });

  // Create channels
  const channels: Channel[] = template.channels.map((ch, idx) => {
    const categoryId = categoryMap.get(ch.categoryName);
    return {
      id: `channel-${guild.id}-${idx}`,
      workspaceId: guild.id,
      categoryId,
      name: ch.name,
      slug: ch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: undefined,
      topic: "topic" in ch ? ch.topic : undefined,
      icon: undefined,
      type: ch.type,
      subtype: undefined,
      isPrivate: false,
      isArchived: false,
      isDefault: "isDefault" in ch ? ch.isDefault || false : false,
      isReadonly: "isReadonly" in ch ? ch.isReadonly || false : false,
      isNsfw: false,
      maxMembers: "maxMembers" in ch ? ch.maxMembers || 0 : 0,
      slowmodeSeconds: 0,
      bannerUrl: undefined,
      position: ch.position,
      permissionSyncId: categoryId,
      creatorId: options.ownerId,
      lastMessageAt: undefined,
      lastMessageId: undefined,
      messageCount: 0,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: undefined,
    };
  });

  // Find default channel
  const defaultChannel = channels.find((ch) => ch.isDefault) || channels[0];
  const rulesChannel = channels.find((ch) => ch.name === "rules");

  // Update guild with system channels
  guild.systemChannelId = defaultChannel?.id;
  guild.rulesChannelId = rulesChannel?.id;

  return {
    guild,
    categories,
    channels,
    defaultChannelId: defaultChannel?.id || "",
    rulesChannelId: rulesChannel?.id,
  };
}

/**
 * Validate guild settings
 */
export function validateGuildSettings(options: GuildCreationOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.name.length < 2 || options.name.length > 100) {
    errors.push("Guild name must be between 2 and 100 characters");
  }

  if (options.slug) {
    if (!/^[a-z0-9-]+$/.test(options.slug)) {
      errors.push(
        "Slug must contain only lowercase letters, numbers, and hyphens",
      );
    }
    if (options.slug.length < 2 || options.slug.length > 50) {
      errors.push("Slug must be between 2 and 50 characters");
    }
  }

  if (options.vanityUrl) {
    if (!/^[a-z0-9-]+$/.test(options.vanityUrl)) {
      errors.push(
        "Vanity URL must contain only lowercase letters, numbers, and hyphens",
      );
    }
    if (options.vanityUrl.length < 3 || options.vanityUrl.length > 30) {
      errors.push("Vanity URL must be between 3 and 30 characters");
    }
  }

  if (
    options.maxMembers &&
    (options.maxMembers < 10 || options.maxMembers > 500000)
  ) {
    errors.push("Max members must be between 10 and 500,000");
  }

  if (
    options.maxChannels &&
    (options.maxChannels < 10 || options.maxChannels > 500)
  ) {
    errors.push("Max channels must be between 10 and 500");
  }

  if (
    options.maxFileSizeMb &&
    (options.maxFileSizeMb < 8 || options.maxFileSizeMb > 1024)
  ) {
    errors.push("Max file size must be between 8 MB and 1 GB");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate guild boost tier based on boost count
 */
export function calculateBoostTier(boostCount: number): number {
  if (boostCount >= 30) return 3;
  if (boostCount >= 15) return 2;
  if (boostCount >= 2) return 1;
  return 0;
}

/**
 * Get guild features based on boost tier
 */
export function getGuildFeatures(boostTier: number): string[] {
  const features: string[] = [];

  if (boostTier >= 1) {
    features.push(
      "ANIMATED_ICON",
      "INVITE_SPLASH",
      "BANNER",
      "UPLOAD_LIMIT_100MB",
    );
  }
  if (boostTier >= 2) {
    features.push("VANITY_URL", "UPLOAD_LIMIT_500MB", "HD_VIDEO");
  }
  if (boostTier >= 3) {
    features.push("DISCOVERY", "UPLOAD_LIMIT_1GB", "4K_VIDEO", "HD_STREAMING");
  }

  return features;
}
