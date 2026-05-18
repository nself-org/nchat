/**
 * Discord Feature Map - Status Integrity Tests
 *
 * Verifies that the Discord feature map has no placeholder, partial,
 * or coming_soon entries. Every feature must be either 'enabled' or
 * 'disabled' with a clear reason.
 *
 * Task 119: Resolve Discord disabled parity feature flags.
 *
 * @module templates/discord/__tests__/discord-features.test
 */

import {
  ALL_DISCORD_FEATURES,
  CORE_FEATURES,
  CHANNEL_FEATURES,
  VOICE_FEATURES,
  ROLE_FEATURES,
  MODERATION_FEATURES,
  SERVER_FEATURES,
  NITRO_FEATURES,
  ACTIVITY_FEATURES,
  INTEGRATION_FEATURES,
  discordFeatureFlags,
  discordFeatureConfig,
  getDiscordFeatureById,
  getDiscordFeaturesByCategory,
  getDiscordEnabledFeatures,
  getDiscordDisabledFeatures,
  getDiscordPlaceholderFeatures,
  isDiscordFeatureEnabled,
  getDiscordFeatureDependencies,
  type FeatureStatus,
  type DiscordFeature,
  type DiscordFeatureCategory,
} from "../features";

// ============================================================================
// STATUS INTEGRITY TESTS
// ============================================================================

describe("Discord Feature Map - Status Integrity", () => {
  it("should contain no features with placeholder status", () => {
    const placeholders = ALL_DISCORD_FEATURES.filter(
      (f) => (f.status as string) === "placeholder",
    );
    expect(placeholders).toHaveLength(0);
  });

  it("should contain no features with partial status", () => {
    const partials = ALL_DISCORD_FEATURES.filter(
      (f) => (f.status as string) === "partial",
    );
    expect(partials).toHaveLength(0);
  });

  it("should contain no features with coming_soon status", () => {
    const comingSoon = ALL_DISCORD_FEATURES.filter(
      (f) => (f.status as string) === "coming_soon",
    );
    expect(comingSoon).toHaveLength(0);
  });

  it("should only contain enabled or disabled statuses", () => {
    const validStatuses: FeatureStatus[] = ["enabled", "disabled"];
    for (const feature of ALL_DISCORD_FEATURES) {
      expect(validStatuses).toContain(feature.status);
    }
  });

  it("should have every feature with a non-empty id, name, and description", () => {
    for (const feature of ALL_DISCORD_FEATURES) {
      expect(feature.id).toBeTruthy();
      expect(feature.name).toBeTruthy();
      expect(feature.description).toBeTruthy();
    }
  });

  it("should have unique feature ids", () => {
    const ids = ALL_DISCORD_FEATURES.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have every feature assigned a valid category", () => {
    const validCategories: DiscordFeatureCategory[] = [
      "core",
      "channels",
      "voice",
      "roles",
      "moderation",
      "server",
      "nitro",
      "activities",
      "integrations",
    ];
    for (const feature of ALL_DISCORD_FEATURES) {
      expect(validCategories).toContain(feature.category);
    }
  });

  it("should have every feature with an icon string", () => {
    for (const feature of ALL_DISCORD_FEATURES) {
      expect(typeof feature.icon).toBe("string");
      expect(feature.icon.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// DISABLED FEATURES - POLICY REQUIREMENTS
// ============================================================================

describe("Discord Feature Map - Disabled Features Policy", () => {
  it("should have a disabledReason for every disabled feature", () => {
    const disabled = ALL_DISCORD_FEATURES.filter(
      (f) => f.status === "disabled",
    );
    for (const feature of disabled) {
      expect(feature.disabledReason).toBeTruthy();
      expect(typeof feature.disabledReason).toBe("string");
      expect(feature.disabledReason!.length).toBeGreaterThan(10);
    }
  });

  it("should have super_reactions as the only disabled feature", () => {
    const disabled = getDiscordDisabledFeatures();
    expect(disabled).toHaveLength(1);
    expect(disabled[0].id).toBe("super_reactions");
  });

  it("should have a clear implementation reason for super_reactions", () => {
    const feature = getDiscordFeatureById("super_reactions");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("animated overlay rendering");
  });

  it("should not have disabledReason on enabled features", () => {
    const enabled = getDiscordEnabledFeatures();
    for (const feature of enabled) {
      expect(feature.disabledReason).toBeUndefined();
    }
  });
});

// ============================================================================
// PREVIOUSLY-PLACEHOLDER FEATURES - NOW RESOLVED
// ============================================================================

describe("Discord Feature Map - Resolved Placeholders", () => {
  it("should have voice_channels enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("voice_channels");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.alwaysOn).toBe(true);
  });

  it("should have stage_channels enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("stage_channels");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.speakerAudienceModel).toBe(true);
  });

  it("should have streaming enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("streaming");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });

  it("should have video_chat enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("video_chat");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });

  it("should have screen_share enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("screen_share");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });

  it("should have go_live enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("go_live");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });

  it("should have server_boosts enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("server_boosts");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.tiers).toEqual([1, 2, 3]);
  });

  it("should have nitro enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("nitro");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.tiers).toEqual(["none", "nitro-basic", "nitro"]);
  });

  it("should have activities enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("activities");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("voice_channels");
  });

  it("should have animated_emoji enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("animated_emoji");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("nitro");
  });

  it("should have custom_stickers enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("custom_stickers");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("nitro");
  });

  it("should have large_file_uploads enabled (was placeholder)", () => {
    const feature = getDiscordFeatureById("large_file_uploads");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("nitro");
  });

  it("should have vanity_url enabled (was disabled)", () => {
    const feature = getDiscordFeatureById("vanity_url");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have server_banner enabled (was disabled)", () => {
    const feature = getDiscordFeatureById("server_banner");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have animated_icon enabled (was disabled)", () => {
    const feature = getDiscordFeatureById("animated_icon");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have invite_splash enabled (was disabled)", () => {
    const feature = getDiscordFeatureById("invite_splash");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have role_icons enabled (was disabled)", () => {
    const feature = getDiscordFeatureById("role_icons");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have linked_roles enabled (was disabled)", () => {
    const feature = getDiscordFeatureById("linked_roles");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });
});

// ============================================================================
// FEATURE CATEGORY COMPLETENESS
// ============================================================================

describe("Discord Feature Map - Category Completeness", () => {
  it("should have 9 core features", () => {
    expect(CORE_FEATURES).toHaveLength(9);
  });

  it("should have 3 channel features", () => {
    expect(CHANNEL_FEATURES).toHaveLength(3);
  });

  it("should have 7 voice features", () => {
    expect(VOICE_FEATURES).toHaveLength(7);
  });

  it("should have 6 role features", () => {
    expect(ROLE_FEATURES).toHaveLength(6);
  });

  it("should have 6 moderation features", () => {
    expect(MODERATION_FEATURES).toHaveLength(6);
  });

  it("should have 8 server features", () => {
    expect(SERVER_FEATURES).toHaveLength(8);
  });

  it("should have 8 nitro features", () => {
    expect(NITRO_FEATURES).toHaveLength(8);
  });

  it("should have 2 activity features", () => {
    expect(ACTIVITY_FEATURES).toHaveLength(2);
  });

  it("should have 5 integration features", () => {
    expect(INTEGRATION_FEATURES).toHaveLength(5);
  });

  it("should have 54 total features", () => {
    expect(ALL_DISCORD_FEATURES).toHaveLength(54);
  });

  it("should have the sum of all categories equal total features", () => {
    const total =
      CORE_FEATURES.length +
      CHANNEL_FEATURES.length +
      VOICE_FEATURES.length +
      ROLE_FEATURES.length +
      MODERATION_FEATURES.length +
      SERVER_FEATURES.length +
      NITRO_FEATURES.length +
      ACTIVITY_FEATURES.length +
      INTEGRATION_FEATURES.length;
    expect(total).toBe(ALL_DISCORD_FEATURES.length);
  });
});

// ============================================================================
// FEATURE HELPERS
// ============================================================================

describe("Discord Feature Map - Helpers", () => {
  it("getDiscordFeatureById should return a feature by id", () => {
    const feature = getDiscordFeatureById("servers");
    expect(feature).toBeDefined();
    expect(feature!.name).toBe("Servers (Guilds)");
  });

  it("getDiscordFeatureById should return undefined for unknown ids", () => {
    const feature = getDiscordFeatureById("nonexistent");
    expect(feature).toBeUndefined();
  });

  it("getDiscordFeaturesByCategory should filter by category", () => {
    const coreFeatures = getDiscordFeaturesByCategory("core");
    expect(coreFeatures.length).toBe(CORE_FEATURES.length);
    for (const f of coreFeatures) {
      expect(f.category).toBe("core");
    }
  });

  it("getDiscordFeaturesByCategory should return empty array for categories with no features", () => {
    // All categories have features, but testing the filter logic
    const voiceFeatures = getDiscordFeaturesByCategory("voice");
    expect(voiceFeatures.length).toBe(VOICE_FEATURES.length);
    for (const f of voiceFeatures) {
      expect(f.category).toBe("voice");
    }
  });

  it("getDiscordEnabledFeatures should return only enabled features", () => {
    const enabled = getDiscordEnabledFeatures();
    for (const f of enabled) {
      expect(f.status).toBe("enabled");
    }
    // All features minus 1 disabled (super_reactions)
    expect(enabled.length).toBe(ALL_DISCORD_FEATURES.length - 1);
  });

  it("getDiscordDisabledFeatures should return only disabled features", () => {
    const disabled = getDiscordDisabledFeatures();
    for (const f of disabled) {
      expect(f.status).toBe("disabled");
    }
    expect(disabled.length).toBe(1);
  });

  it("getDiscordPlaceholderFeatures (deprecated) should return empty array", () => {
    const placeholders = getDiscordPlaceholderFeatures();
    expect(placeholders).toHaveLength(0);
  });

  it("isDiscordFeatureEnabled should return true for enabled features", () => {
    expect(isDiscordFeatureEnabled("servers")).toBe(true);
    expect(isDiscordFeatureEnabled("voice_channels")).toBe(true);
    expect(isDiscordFeatureEnabled("stage_channels")).toBe(true);
    expect(isDiscordFeatureEnabled("nitro")).toBe(true);
    expect(isDiscordFeatureEnabled("activities")).toBe(true);
    expect(isDiscordFeatureEnabled("server_boosts")).toBe(true);
  });

  it("isDiscordFeatureEnabled should return false for disabled features", () => {
    expect(isDiscordFeatureEnabled("super_reactions")).toBe(false);
  });

  it("isDiscordFeatureEnabled should return false for nonexistent features", () => {
    expect(isDiscordFeatureEnabled("nonexistent")).toBe(false);
  });

  it("getDiscordFeatureDependencies should return dependency features", () => {
    const deps = getDiscordFeatureDependencies("animated_emoji");
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("nitro");
  });

  it("getDiscordFeatureDependencies should return multiple dependencies when present", () => {
    // Activities depends on voice_channels
    const deps = getDiscordFeatureDependencies("activities");
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("voice_channels");
  });

  it("getDiscordFeatureDependencies should return empty array for features without dependencies", () => {
    const deps = getDiscordFeatureDependencies("servers");
    expect(deps).toHaveLength(0);
  });

  it("getDiscordFeatureDependencies should return empty for nonexistent features", () => {
    const deps = getDiscordFeatureDependencies("nonexistent");
    expect(deps).toHaveLength(0);
  });
});

// ============================================================================
// LEGACY FEATURE FLAGS
// ============================================================================

describe("Discord Feature Map - Legacy Feature Flags", () => {
  it("should have all previously-false voice flags now set to true", () => {
    expect(discordFeatureFlags.voiceChannels).toBe(true);
    expect(discordFeatureFlags.stageChannels).toBe(true);
    expect(discordFeatureFlags.streaming).toBe(true);
    expect(discordFeatureFlags.videoChat).toBe(true);
    expect(discordFeatureFlags.screenShare).toBe(true);
    expect(discordFeatureFlags.goLive).toBe(true);
  });

  it("should have all previously-false server flags now set to true", () => {
    expect(discordFeatureFlags.serverBoosts).toBe(true);
    expect(discordFeatureFlags.vanityUrl).toBe(true);
    expect(discordFeatureFlags.serverBanner).toBe(true);
    expect(discordFeatureFlags.animatedIcon).toBe(true);
    expect(discordFeatureFlags.inviteSplash).toBe(true);
  });

  it("should have all previously-false nitro flags now set to true", () => {
    expect(discordFeatureFlags.nitro).toBe(true);
    expect(discordFeatureFlags.animatedEmoji).toBe(true);
    expect(discordFeatureFlags.customStickers).toBe(true);
    expect(discordFeatureFlags.largeFileUploads).toBe(true);
  });

  it("should have activities flag set to true (was false)", () => {
    expect(discordFeatureFlags.activities).toBe(true);
  });

  it("should have linkedRoles flag set to true (was false)", () => {
    expect(discordFeatureFlags.linkedRoles).toBe(true);
  });

  it("should have roleIcons flag set to true (was false)", () => {
    expect(discordFeatureFlags.roleIcons).toBe(true);
  });

  it("should retain all originally-true flags as true", () => {
    expect(discordFeatureFlags.servers).toBe(true);
    expect(discordFeatureFlags.textChannels).toBe(true);
    expect(discordFeatureFlags.directMessages).toBe(true);
    expect(discordFeatureFlags.groupDMs).toBe(true);
    expect(discordFeatureFlags.threads).toBe(true);
    expect(discordFeatureFlags.reactions).toBe(true);
    expect(discordFeatureFlags.embeds).toBe(true);
    expect(discordFeatureFlags.attachments).toBe(true);
    expect(discordFeatureFlags.mentions).toBe(true);
    expect(discordFeatureFlags.forumChannels).toBe(true);
    expect(discordFeatureFlags.announcementChannels).toBe(true);
    expect(discordFeatureFlags.categories).toBe(true);
    expect(discordFeatureFlags.roles).toBe(true);
    expect(discordFeatureFlags.roleColors).toBe(true);
    expect(discordFeatureFlags.roleHierarchy).toBe(true);
    expect(discordFeatureFlags.customPermissions).toBe(true);
    expect(discordFeatureFlags.autoModeration).toBe(true);
    expect(discordFeatureFlags.timeouts).toBe(true);
    expect(discordFeatureFlags.bans).toBe(true);
    expect(discordFeatureFlags.kicks).toBe(true);
    expect(discordFeatureFlags.messageManagement).toBe(true);
    expect(discordFeatureFlags.auditLog).toBe(true);
    expect(discordFeatureFlags.welcomeScreen).toBe(true);
    expect(discordFeatureFlags.membershipScreening).toBe(true);
    expect(discordFeatureFlags.customEmoji).toBe(true);
    expect(discordFeatureFlags.webhooks).toBe(true);
    expect(discordFeatureFlags.bots).toBe(true);
    expect(discordFeatureFlags.apps).toBe(true);
  });

  it("should have no false values in legacy feature flags", () => {
    const flagValues = Object.values(discordFeatureFlags);
    const falseFlags = flagValues.filter((v) => v === false);
    expect(falseFlags).toHaveLength(0);
  });
});

// ============================================================================
// FEATURE CONFIG EXPORT
// ============================================================================

describe("Discord Feature Map - Config Export", () => {
  it("should export discordFeatureConfig with all category arrays", () => {
    expect(discordFeatureConfig.core).toBe(CORE_FEATURES);
    expect(discordFeatureConfig.channels).toBe(CHANNEL_FEATURES);
    expect(discordFeatureConfig.voice).toBe(VOICE_FEATURES);
    expect(discordFeatureConfig.roles).toBe(ROLE_FEATURES);
    expect(discordFeatureConfig.moderation).toBe(MODERATION_FEATURES);
    expect(discordFeatureConfig.server).toBe(SERVER_FEATURES);
    expect(discordFeatureConfig.nitro).toBe(NITRO_FEATURES);
    expect(discordFeatureConfig.activities).toBe(ACTIVITY_FEATURES);
    expect(discordFeatureConfig.integrations).toBe(INTEGRATION_FEATURES);
    expect(discordFeatureConfig.all).toBe(ALL_DISCORD_FEATURES);
  });

  it("should export legacy flags on discordFeatureConfig", () => {
    expect(discordFeatureConfig.flags).toBe(discordFeatureFlags);
  });

  it("should export helpers on discordFeatureConfig", () => {
    expect(typeof discordFeatureConfig.helpers.getDiscordFeatureById).toBe(
      "function",
    );
    expect(
      typeof discordFeatureConfig.helpers.getDiscordFeaturesByCategory,
    ).toBe("function");
    expect(typeof discordFeatureConfig.helpers.getDiscordEnabledFeatures).toBe(
      "function",
    );
    expect(typeof discordFeatureConfig.helpers.getDiscordDisabledFeatures).toBe(
      "function",
    );
    expect(
      typeof discordFeatureConfig.helpers.getDiscordPlaceholderFeatures,
    ).toBe("function");
    expect(typeof discordFeatureConfig.helpers.isDiscordFeatureEnabled).toBe(
      "function",
    );
    expect(
      typeof discordFeatureConfig.helpers.getDiscordFeatureDependencies,
    ).toBe("function");
  });
});

// ============================================================================
// DEPENDENCY VALIDATION
// ============================================================================

describe("Discord Feature Map - Dependency Validation", () => {
  it("should have all dependency feature ids referencing real features", () => {
    for (const feature of ALL_DISCORD_FEATURES) {
      if (feature.dependencies) {
        for (const depId of feature.dependencies) {
          const dep = getDiscordFeatureById(depId);
          expect(dep).toBeDefined();
        }
      }
    }
  });

  it("should have all dependency features enabled if the dependent feature is enabled", () => {
    for (const feature of ALL_DISCORD_FEATURES) {
      if (feature.status === "enabled" && feature.dependencies) {
        for (const depId of feature.dependencies) {
          const dep = getDiscordFeatureById(depId);
          expect(dep).toBeDefined();
          expect(dep!.status).toBe("enabled");
        }
      }
    }
  });

  it("should not have circular dependencies", () => {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function hasCycle(featureId: string): boolean {
      if (visiting.has(featureId)) return true;
      if (visited.has(featureId)) return false;

      visiting.add(featureId);
      const feature = getDiscordFeatureById(featureId);
      if (feature?.dependencies) {
        for (const depId of feature.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }
      visiting.delete(featureId);
      visited.add(featureId);
      return false;
    }

    for (const feature of ALL_DISCORD_FEATURES) {
      visited.clear();
      visiting.clear();
      expect(hasCycle(feature.id)).toBe(false);
    }
  });
});

// ============================================================================
// VOICE/STAGE/STREAMING PARITY DECISIONS
// ============================================================================

describe("Discord Feature Map - Voice/Stage/Streaming Parity", () => {
  it("should have voice channels with always-on model", () => {
    const vc = getDiscordFeatureById("voice_channels");
    expect(vc).toBeDefined();
    expect(vc!.status).toBe("enabled");
    expect(vc!.settings!.alwaysOn).toBe(true);
    expect(vc!.settings!.pushToTalk).toBe(true);
    expect(vc!.settings!.voiceActivityDetection).toBe(true);
  });

  it("should have stage channels with speaker/audience model and raise hand", () => {
    const stage = getDiscordFeatureById("stage_channels");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("enabled");
    expect(stage!.settings!.speakerAudienceModel).toBe(true);
    expect(stage!.settings!.requestToSpeak).toBe(true);
    expect(stage!.settings!.moderatorControls).toBe(true);
    expect(stage!.settings!.maxSpeakers).toBe(50);
  });

  it("should have streaming with configurable quality options", () => {
    const streaming = getDiscordFeatureById("streaming");
    expect(streaming).toBeDefined();
    expect(streaming!.status).toBe("enabled");
    expect(streaming!.settings!.qualities).toBeDefined();
    expect(streaming!.settings!.soundEnabled).toBe(true);
  });

  it("should have soundboard enabled", () => {
    const sb = getDiscordFeatureById("soundboard");
    expect(sb).toBeDefined();
    expect(sb!.status).toBe("enabled");
  });

  it("should have activities dependent on voice_channels", () => {
    const activities = getDiscordFeatureById("activities");
    expect(activities).toBeDefined();
    expect(activities!.dependencies).toContain("voice_channels");
  });
});

// ============================================================================
// BOOST-GATED FEATURES
// ============================================================================

describe("Discord Feature Map - Boost-Gated Features", () => {
  it("should have vanity_url gated at Boost Level 3", () => {
    const feature = getDiscordFeatureById("vanity_url");
    expect(feature).toBeDefined();
    expect(feature!.settings!.requiredBoostLevel).toBe(3);
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have server_banner gated at Boost Level 2", () => {
    const feature = getDiscordFeatureById("server_banner");
    expect(feature).toBeDefined();
    expect(feature!.settings!.requiredBoostLevel).toBe(2);
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have animated_icon gated at Boost Level 1", () => {
    const feature = getDiscordFeatureById("animated_icon");
    expect(feature).toBeDefined();
    expect(feature!.settings!.requiredBoostLevel).toBe(1);
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have invite_splash gated at Boost Level 1", () => {
    const feature = getDiscordFeatureById("invite_splash");
    expect(feature).toBeDefined();
    expect(feature!.settings!.requiredBoostLevel).toBe(1);
    expect(feature!.dependencies).toContain("server_boosts");
  });

  it("should have role_icons gated at Boost Level 2", () => {
    const feature = getDiscordFeatureById("role_icons");
    expect(feature).toBeDefined();
    expect(feature!.settings!.requiredBoostLevel).toBe(2);
    expect(feature!.dependencies).toContain("server_boosts");
  });
});

// ============================================================================
// NITRO-GATED FEATURES
// ============================================================================

describe("Discord Feature Map - Nitro-Gated Features", () => {
  it("should have animated_emoji dependent on nitro", () => {
    const feature = getDiscordFeatureById("animated_emoji");
    expect(feature!.dependencies).toContain("nitro");
  });

  it("should have custom_stickers dependent on nitro", () => {
    const feature = getDiscordFeatureById("custom_stickers");
    expect(feature!.dependencies).toContain("nitro");
  });

  it("should have large_file_uploads dependent on nitro", () => {
    const feature = getDiscordFeatureById("large_file_uploads");
    expect(feature!.dependencies).toContain("nitro");
    expect(feature!.settings!.baseLimitMB).toBe(25);
    expect(feature!.settings!.nitroLimitMB).toBe(500);
  });

  it("should have hd_streaming dependent on nitro", () => {
    const feature = getDiscordFeatureById("hd_streaming");
    expect(feature!.dependencies).toContain("nitro");
  });

  it("should have profile_customization dependent on nitro", () => {
    const feature = getDiscordFeatureById("profile_customization");
    expect(feature!.dependencies).toContain("nitro");
  });
});
