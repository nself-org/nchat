/**
 * Comprehensive tests for the Canonical Skin Architecture.
 *
 * Covers:
 *   - Visual skin resolution (default, override, dark mode)
 *   - Behavior preset resolution (default, override, feature flags)
 *   - Composite profile resolution (skin + behavior + overrides)
 *   - Independence (switching skin doesn't affect behavior and vice versa)
 *   - Deep merge correctness
 *   - Validation (skins, behaviors, profiles)
 *   - All 6 platform skins and behaviors
 *   - Engine functions (apply, switch, merge, reset)
 *   - CSS variable generation
 *   - Registry operations
 *
 * @module lib/skins/__tests__/skin-architecture.test
 */

import {
  // Types
  type VisualSkin,
  type BehaviorPreset,
  type CompositeProfile,
  type DeepPartial,
  type SkinRegistry,
  // Visual skins
  nchatSkin,
  whatsappSkin,
  telegramSkin,
  discordSkin,
  slackSkin,
  signalSkin,
  visualSkins,
  visualSkinIds,
  getVisualSkin,
  // Behavior presets
  nchatBehavior,
  whatsappBehavior,
  telegramBehavior,
  discordBehavior,
  slackBehavior,
  signalBehavior,
  behaviorPresets,
  behaviorPresetIds,
  getBehaviorPreset,
  // Composite profiles
  compositeProfiles,
  compositeProfileIds,
  getCompositeProfile,
  // Engine
  deepMerge,
  createRegistry,
  registerSkin,
  registerBehavior,
  registerProfile,
  getSkin,
  getBehavior,
  getProfile,
  resolveIndependent,
  colorsToCSSVariables,
  skinToCSSVariables,
  applySkin,
  removeSkinVariables,
  applyBehavior,
  switchSkin,
  resetSkin,
  validateSkin,
  validateBehavior,
  validateProfile,
} from "../index";

// ============================================================================
// HELPERS
// ============================================================================

const ALL_SKIN_IDS = [
  "nchat",
  "whatsapp",
  "telegram",
  "discord",
  "slack",
  "signal",
];
const ALL_BEHAVIOR_IDS = [
  "nchat",
  "whatsapp",
  "telegram",
  "discord",
  "slack",
  "signal",
];

const REQUIRED_COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "text",
  "textSecondary",
  "muted",
  "border",
  "success",
  "warning",
  "error",
  "info",
  "buttonPrimaryBg",
  "buttonPrimaryText",
  "buttonSecondaryBg",
  "buttonSecondaryText",
] as const;

// ============================================================================
// 1. VISUAL SKIN RESOLUTION
// ============================================================================

describe("Visual Skin Resolution", () => {
  test("all 6 platform skins are registered", () => {
    expect(visualSkinIds).toHaveLength(6);
    for (const id of ALL_SKIN_IDS) {
      expect(visualSkins[id]).toBeDefined();
    }
  });

  test("getVisualSkin returns skin by id", () => {
    const skin = getVisualSkin("nchat");
    expect(skin).toBeDefined();
    expect(skin!.id).toBe("nchat");
    expect(skin!.name).toBe("nChat");
  });

  test("getVisualSkin returns undefined for unknown id", () => {
    expect(getVisualSkin("nonexistent")).toBeUndefined();
  });

  test.each(ALL_SKIN_IDS)(
    'skin "%s" has all required light mode colors',
    (id) => {
      const skin = getVisualSkin(id)!;
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(skin.colors[key]).toBeTruthy();
      }
    },
  );

  test.each(ALL_SKIN_IDS)(
    'skin "%s" has all required dark mode colors',
    (id) => {
      const skin = getVisualSkin(id)!;
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(skin.darkMode.colors[key]).toBeTruthy();
      }
    },
  );

  test.each(ALL_SKIN_IDS)('skin "%s" has typography settings', (id) => {
    const skin = getVisualSkin(id)!;
    expect(skin.typography.fontFamily).toBeTruthy();
    expect(skin.typography.fontSizeBase).toBeTruthy();
    expect(skin.typography.lineHeight).toBeGreaterThan(0);
  });

  test.each(ALL_SKIN_IDS)('skin "%s" has spacing settings', (id) => {
    const skin = getVisualSkin(id)!;
    expect(skin.spacing.sidebarWidth).toBeTruthy();
    expect(skin.spacing.headerHeight).toBeTruthy();
    expect(skin.spacing.avatarSize).toBeTruthy();
  });

  test.each(ALL_SKIN_IDS)('skin "%s" has border radius settings', (id) => {
    const skin = getVisualSkin(id)!;
    expect(skin.borderRadius.none).toBe("0px");
    expect(skin.borderRadius.sm).toBeTruthy();
    expect(skin.borderRadius.md).toBeTruthy();
    expect(skin.borderRadius.lg).toBeTruthy();
    expect(skin.borderRadius.full).toBeTruthy();
  });

  test.each(ALL_SKIN_IDS)('skin "%s" has component styles', (id) => {
    const skin = getVisualSkin(id)!;
    expect(skin.components.messageLayout).toBeTruthy();
    expect(skin.components.avatarShape).toBeTruthy();
    expect(skin.components.buttonStyle).toBeTruthy();
    expect(skin.components.inputStyle).toBeTruthy();
  });

  test("nchat skin uses nself cyan colors", () => {
    expect(nchatSkin.colors.primary).toBe("#00D4FF");
    expect(nchatSkin.darkMode.colors.primary).toBe("#00D4FF");
  });

  test("whatsapp skin uses green colors and bubble layout", () => {
    expect(whatsappSkin.colors.primary).toBe("#25D366");
    expect(whatsappSkin.components.messageLayout).toBe("bubbles");
  });

  test("telegram skin uses blue colors and bubble layout", () => {
    expect(telegramSkin.colors.primary).toBe("#2AABEE");
    expect(telegramSkin.components.messageLayout).toBe("bubbles");
  });

  test("discord skin uses blurple colors and cozy layout", () => {
    expect(discordSkin.colors.primary).toBe("#5865F2");
    expect(discordSkin.components.messageLayout).toBe("cozy");
  });

  test("slack skin uses aubergine colors and default layout", () => {
    expect(slackSkin.colors.primary).toBe("#4A154B");
    expect(slackSkin.components.messageLayout).toBe("default");
  });

  test("signal skin uses blue colors and bubble layout", () => {
    expect(signalSkin.colors.primary).toBe("#3A76F0");
    expect(signalSkin.components.messageLayout).toBe("bubbles");
  });

  test("dark mode colors differ from light mode colors", () => {
    const skin = nchatSkin;
    expect(skin.colors.background).not.toBe(skin.darkMode.colors.background);
    expect(skin.colors.text).not.toBe(skin.darkMode.colors.text);
    expect(skin.colors.surface).not.toBe(skin.darkMode.colors.surface);
  });
});

// ============================================================================
// 2. BEHAVIOR PRESET RESOLUTION
// ============================================================================

describe("Behavior Preset Resolution", () => {
  test("all 6 platform behaviors are registered", () => {
    expect(behaviorPresetIds).toHaveLength(6);
    for (const id of ALL_BEHAVIOR_IDS) {
      expect(behaviorPresets[id]).toBeDefined();
    }
  });

  test("getBehaviorPreset returns preset by id", () => {
    const behavior = getBehaviorPreset("slack");
    expect(behavior).toBeDefined();
    expect(behavior!.id).toBe("slack");
    expect(behavior!.name).toBe("Slack");
  });

  test("getBehaviorPreset returns undefined for unknown id", () => {
    expect(getBehaviorPreset("nonexistent")).toBeUndefined();
  });

  test.each(ALL_BEHAVIOR_IDS)(
    'behavior "%s" has all required sections',
    (id) => {
      const behavior = getBehaviorPreset(id)!;
      expect(behavior.messaging).toBeDefined();
      expect(behavior.channels).toBeDefined();
      expect(behavior.presence).toBeDefined();
      expect(behavior.calls).toBeDefined();
      expect(behavior.notifications).toBeDefined();
      expect(behavior.moderation).toBeDefined();
      expect(behavior.privacy).toBeDefined();
      expect(behavior.features).toBeDefined();
    },
  );

  test.each(ALL_BEHAVIOR_IDS)(
    'behavior "%s" has valid messaging config',
    (id) => {
      const b = getBehaviorPreset(id)!;
      expect(b.messaging.maxMessageLength).toBeGreaterThan(0);
      expect(typeof b.messaging.editWindow).toBe("number");
      expect(typeof b.messaging.deleteForEveryone).toBe("boolean");
    },
  );

  test.each(ALL_BEHAVIOR_IDS)(
    'behavior "%s" has non-empty channel types',
    (id) => {
      const b = getBehaviorPreset(id)!;
      expect(b.channels.types.length).toBeGreaterThan(0);
    },
  );

  test("whatsapp behavior enforces E2EE by default", () => {
    expect(whatsappBehavior.privacy.e2eeDefault).toBe(true);
  });

  test("whatsapp behavior has 15-minute edit window", () => {
    expect(whatsappBehavior.messaging.editWindow).toBe(15 * 60 * 1000);
  });

  test("signal behavior has E2EE by default", () => {
    expect(signalBehavior.privacy.e2eeDefault).toBe(true);
  });

  test("discord behavior does not support read receipts", () => {
    expect(discordBehavior.privacy.readReceipts).toBe(false);
  });

  test("slack behavior supports huddles", () => {
    expect(slackBehavior.calls.huddles).toBe(true);
  });

  test("slack behavior uses side-panel threads", () => {
    expect(slackBehavior.messaging.threadingModel).toBe("side-panel");
  });

  test("discord behavior uses inline threads", () => {
    expect(discordBehavior.messaging.threadingModel).toBe("inline");
  });

  test("telegram behavior has large group support", () => {
    expect(telegramBehavior.channels.maxGroupMembers).toBe(200000);
  });

  test("whatsapp behavior uses quick-reactions style", () => {
    expect(whatsappBehavior.messaging.reactionStyle).toBe("quick-reactions");
  });

  test("discord behavior has activity status", () => {
    expect(discordBehavior.presence.activityStatus).toBe(true);
  });

  test("signal behavior has no custom status", () => {
    expect(signalBehavior.presence.customStatus).toBe(false);
  });

  test("feature flags are all booleans", () => {
    for (const id of ALL_BEHAVIOR_IDS) {
      const b = getBehaviorPreset(id)!;
      for (const [key, value] of Object.entries(b.features)) {
        expect(typeof value).toBe("boolean");
      }
    }
  });
});

// ============================================================================
// 3. COMPOSITE PROFILE RESOLUTION
// ============================================================================

describe("Composite Profile Resolution", () => {
  test("all 6 same-platform profiles exist", () => {
    for (const id of ALL_SKIN_IDS) {
      expect(getCompositeProfile(id)).toBeDefined();
    }
  });

  test("hybrid profiles exist", () => {
    expect(getCompositeProfile("discord-look-slack-behavior")).toBeDefined();
    expect(getCompositeProfile("slack-look-discord-behavior")).toBeDefined();
    expect(
      getCompositeProfile("whatsapp-look-telegram-behavior"),
    ).toBeDefined();
    expect(getCompositeProfile("signal-look-whatsapp-behavior")).toBeDefined();
    expect(getCompositeProfile("privacy-team")).toBeDefined();
  });

  test("getCompositeProfile returns undefined for unknown id", () => {
    expect(getCompositeProfile("nonexistent")).toBeUndefined();
  });

  test("same-platform profile references its own skin and behavior", () => {
    const profile = getCompositeProfile("whatsapp")!;
    expect(profile.skinId).toBe("whatsapp");
    expect(profile.behaviorId).toBe("whatsapp");
  });

  test("hybrid profile references different skin and behavior", () => {
    const profile = getCompositeProfile("discord-look-slack-behavior")!;
    expect(profile.skinId).toBe("discord");
    expect(profile.behaviorId).toBe("slack");
  });

  test("privacy-team profile has behavior overrides", () => {
    const profile = getCompositeProfile("privacy-team")!;
    expect(profile.overrides?.behavior?.messaging?.threadingModel).toBe(
      "side-panel",
    );
    expect(profile.overrides?.behavior?.messaging?.pinning).toBe(true);
  });

  test("getProfile resolves a same-platform profile", () => {
    const resolved = getProfile("slack")!;
    expect(resolved).toBeDefined();
    expect(resolved.skin.id).toBe("slack");
    expect(resolved.behavior.id).toBe("slack");
    expect(resolved.profileId).toBe("slack");
    expect(resolved.isDarkMode).toBe(false);
  });

  test("getProfile resolves a hybrid profile", () => {
    const resolved = getProfile("discord-look-slack-behavior")!;
    expect(resolved).toBeDefined();
    expect(resolved.skin.id).toBe("discord");
    expect(resolved.behavior.id).toBe("slack");
  });

  test("getProfile applies behavior overrides from privacy-team", () => {
    const resolved = getProfile("privacy-team")!;
    expect(resolved).toBeDefined();
    expect(resolved.behavior.messaging.threadingModel).toBe("side-panel");
    expect(resolved.behavior.messaging.pinning).toBe(true);
  });

  test("getProfile returns undefined for unknown profile", () => {
    expect(getProfile("nonexistent")).toBeUndefined();
  });
});

// ============================================================================
// 4. INDEPENDENCE (skin vs behavior)
// ============================================================================

describe("Independence: skin does not affect behavior and vice versa", () => {
  test("switching skin preserves behavior state", () => {
    const state1 = resolveIndependent("discord", "slack")!;
    const state2 = resolveIndependent("whatsapp", "slack")!;

    // Behavior should be identical
    expect(state1.behavior).toEqual(state2.behavior);
    // Skin should differ
    expect(state1.skin.id).not.toBe(state2.skin.id);
    expect(state1.skin.colors.primary).not.toBe(state2.skin.colors.primary);
  });

  test("switching behavior preserves skin state", () => {
    const state1 = resolveIndependent("discord", "slack")!;
    const state2 = resolveIndependent("discord", "whatsapp")!;

    // Skin should be identical
    expect(state1.skin).toEqual(state2.skin);
    // Behavior should differ
    expect(state1.behavior.id).not.toBe(state2.behavior.id);
    expect(state1.behavior.messaging.threadingModel).not.toBe(
      state2.behavior.messaging.threadingModel,
    );
  });

  test("skin overrides do not leak into behavior", () => {
    const state = resolveIndependent(
      "nchat",
      "nchat",
      { colors: { primary: "#FF0000" } },
      undefined,
    )!;
    expect(state.skin.colors.primary).toBe("#FF0000");
    // Behavior unchanged
    expect(state.behavior.messaging.editWindow).toBe(
      nchatBehavior.messaging.editWindow,
    );
  });

  test("behavior overrides do not leak into skin", () => {
    const state = resolveIndependent("nchat", "nchat", undefined, {
      messaging: { maxMessageLength: 999 },
    })!;
    expect(state.behavior.messaging.maxMessageLength).toBe(999);
    // Skin unchanged
    expect(state.skin.colors.primary).toBe(nchatSkin.colors.primary);
  });
});

// ============================================================================
// 5. DEEP MERGE
// ============================================================================

describe("Deep Merge", () => {
  test("merges flat properties", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 } as DeepPartial<typeof target & { c: number }>;
    const result = deepMerge(target, source as DeepPartial<typeof target>);
    expect(result.a).toBe(1);
    expect(result.b).toBe(3);
  });

  test("merges nested objects", () => {
    const target = { a: { x: 1, y: 2 }, b: 3 };
    const source = { a: { y: 99 } };
    const result = deepMerge(target, source);
    expect(result.a.x).toBe(1); // preserved
    expect(result.a.y).toBe(99); // overridden
    expect(result.b).toBe(3); // untouched
  });

  test("replaces arrays (does not concatenate)", () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };
    const result = deepMerge(target, source);
    expect(result.arr).toEqual([4, 5]);
  });

  test("does not mutate the original target", () => {
    const target = { a: { x: 1 } };
    const source = { a: { x: 2 } };
    const result = deepMerge(target, source);
    expect(target.a.x).toBe(1); // original unchanged
    expect(result.a.x).toBe(2);
  });

  test("skips undefined values in source", () => {
    const target = { a: 1, b: 2 };
    const source = { a: undefined, b: 3 };
    const result = deepMerge(target, source as DeepPartial<typeof target>);
    expect(result.a).toBe(1);
    expect(result.b).toBe(3);
  });

  test("handles deeply nested merges (3+ levels)", () => {
    const target = { l1: { l2: { l3: { val: "original" } } } };
    const source = { l1: { l2: { l3: { val: "updated" } } } };
    const result = deepMerge(target, source);
    expect(result.l1.l2.l3.val).toBe("updated");
  });

  test("merges skin color overrides correctly", () => {
    const skin = getSkin("nchat", { colors: { primary: "#FF0000" } })!;
    expect(skin.colors.primary).toBe("#FF0000");
    expect(skin.colors.secondary).toBe(nchatSkin.colors.secondary); // preserved
    expect(skin.darkMode.colors.primary).toBe(
      nchatSkin.darkMode.colors.primary,
    ); // untouched
  });

  test("merges behavior messaging overrides correctly", () => {
    const behavior = getBehavior("slack", {
      messaging: { maxMessageLength: 50000 },
    })!;
    expect(behavior.messaging.maxMessageLength).toBe(50000);
    expect(behavior.messaging.threadingModel).toBe("side-panel"); // preserved
  });
});

// ============================================================================
// 6. VALIDATION
// ============================================================================

describe("Validation", () => {
  describe("validateSkin", () => {
    test.each(ALL_SKIN_IDS)('built-in skin "%s" passes validation', (id) => {
      const skin = getVisualSkin(id)!;
      const result = validateSkin(skin);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects skin with missing id", () => {
      const bad = { ...nchatSkin, id: "" };
      const result = validateSkin(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skin must have an id");
    });

    test("rejects skin with missing name", () => {
      const bad = { ...nchatSkin, name: "" };
      const result = validateSkin(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skin must have a name");
    });

    test("rejects skin with missing light mode colors", () => {
      const bad = {
        ...nchatSkin,
        colors: undefined as unknown as typeof nchatSkin.colors,
      };
      const result = validateSkin(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skin must have light mode colors");
    });

    test("rejects skin with missing dark mode colors", () => {
      const bad = {
        ...nchatSkin,
        darkMode: undefined as unknown as typeof nchatSkin.darkMode,
      };
      const result = validateSkin(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skin must have dark mode colors");
    });

    test("rejects skin with missing color key", () => {
      const badColors = { ...nchatSkin.colors, primary: "" };
      const bad = { ...nchatSkin, colors: badColors };
      const result = validateSkin(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing light mode color: primary");
    });

    test("warns about missing version", () => {
      const bad = { ...nchatSkin, version: "" };
      const result = validateSkin(bad);
      expect(result.warnings).toContain("Skin is missing a version string");
    });

    test("rejects skin with missing typography", () => {
      const bad = {
        ...nchatSkin,
        typography: undefined as unknown as typeof nchatSkin.typography,
      };
      const result = validateSkin(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skin must have typography settings");
    });
  });

  describe("validateBehavior", () => {
    test.each(ALL_BEHAVIOR_IDS)(
      'built-in behavior "%s" passes validation',
      (id) => {
        const behavior = getBehaviorPreset(id)!;
        const result = validateBehavior(behavior);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      },
    );

    test("rejects behavior with missing id", () => {
      const bad = { ...nchatBehavior, id: "" };
      const result = validateBehavior(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Behavior must have an id");
    });

    test("rejects behavior with missing messaging section", () => {
      const bad = {
        ...nchatBehavior,
        messaging: undefined as unknown as typeof nchatBehavior.messaging,
      };
      const result = validateBehavior(bad);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Behavior must have messaging section");
    });

    test("rejects behavior with zero max message length", () => {
      const bad = {
        ...nchatBehavior,
        messaging: { ...nchatBehavior.messaging, maxMessageLength: 0 },
      };
      const result = validateBehavior(bad);
      expect(result.valid).toBe(false);
    });

    test("rejects behavior with empty channel types", () => {
      const bad = {
        ...nchatBehavior,
        channels: {
          ...nchatBehavior.channels,
          types: [] as typeof nchatBehavior.channels.types,
        },
      };
      const result = validateBehavior(bad);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateProfile", () => {
    test.each(compositeProfileIds)(
      'built-in profile "%s" passes validation',
      (id) => {
        const profile = getCompositeProfile(id)!;
        const result = validateProfile(profile);
        expect(result.valid).toBe(true);
      },
    );

    test("rejects profile with missing skinId", () => {
      const bad: CompositeProfile = {
        id: "test",
        name: "Test",
        description: "test",
        skinId: "",
        behaviorId: "nchat",
      };
      const result = validateProfile(bad);
      expect(result.valid).toBe(false);
    });

    test("rejects profile referencing non-existent skin", () => {
      const bad: CompositeProfile = {
        id: "test",
        name: "Test",
        description: "test",
        skinId: "does-not-exist",
        behaviorId: "nchat",
      };
      const result = validateProfile(bad);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("does-not-exist");
    });

    test("rejects profile referencing non-existent behavior", () => {
      const bad: CompositeProfile = {
        id: "test",
        name: "Test",
        description: "test",
        skinId: "nchat",
        behaviorId: "does-not-exist",
      };
      const result = validateProfile(bad);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("does-not-exist");
    });
  });
});

// ============================================================================
// 7. ENGINE FUNCTIONS
// ============================================================================

describe("Engine Functions", () => {
  describe("getSkin", () => {
    test("returns base skin without overrides", () => {
      const skin = getSkin("discord")!;
      expect(skin.id).toBe("discord");
      expect(skin.colors.primary).toBe("#5865F2");
    });

    test("applies partial overrides", () => {
      const skin = getSkin("discord", { colors: { accent: "#AABBCC" } })!;
      expect(skin.colors.accent).toBe("#AABBCC");
      expect(skin.colors.primary).toBe("#5865F2"); // preserved
    });

    test("returns undefined for missing skin", () => {
      expect(getSkin("missing")).toBeUndefined();
    });
  });

  describe("getBehavior", () => {
    test("returns base behavior without overrides", () => {
      const behavior = getBehavior("telegram")!;
      expect(behavior.id).toBe("telegram");
    });

    test("applies partial overrides", () => {
      const behavior = getBehavior("telegram", {
        messaging: { editWindow: 99 },
      })!;
      expect(behavior.messaging.editWindow).toBe(99);
      expect(behavior.messaging.maxMessageLength).toBe(4096); // preserved
    });

    test("returns undefined for missing behavior", () => {
      expect(getBehavior("missing")).toBeUndefined();
    });
  });

  describe("resolveIndependent", () => {
    test("resolves a valid skin + behavior pair", () => {
      const state = resolveIndependent("whatsapp", "discord")!;
      expect(state.skin.id).toBe("whatsapp");
      expect(state.behavior.id).toBe("discord");
      expect(state.profileId).toBeUndefined();
    });

    test("applies overrides to both", () => {
      const state = resolveIndependent(
        "nchat",
        "nchat",
        { colors: { primary: "#111" } },
        { messaging: { maxMessageLength: 5 } },
      )!;
      expect(state.skin.colors.primary).toBe("#111");
      expect(state.behavior.messaging.maxMessageLength).toBe(5);
    });

    test("returns undefined if skin not found", () => {
      expect(resolveIndependent("x", "nchat")).toBeUndefined();
    });

    test("returns undefined if behavior not found", () => {
      expect(resolveIndependent("nchat", "x")).toBeUndefined();
    });
  });

  describe("applyBehavior", () => {
    test("returns resolved behavior preset", () => {
      const b = applyBehavior("slack")!;
      expect(b.id).toBe("slack");
      expect(b.calls.huddles).toBe(true);
    });

    test("applies overrides", () => {
      const b = applyBehavior("slack", { calls: { huddles: false } })!;
      expect(b.calls.huddles).toBe(false);
    });

    test("returns undefined for unknown behavior", () => {
      expect(applyBehavior("unknown")).toBeUndefined();
    });
  });

  describe("CSS Variable Generation", () => {
    test("colorsToCSSVariables produces correct variable map", () => {
      const vars = colorsToCSSVariables(nchatSkin.colors);
      expect(vars["--skin-primary"]).toBe("#00D4FF");
      expect(vars["--skin-background"]).toBe("#FFFFFF");
      expect(vars["--skin-button-primary-bg"]).toBe("#18181B");
    });

    test("colorsToCSSVariables respects custom prefix", () => {
      const vars = colorsToCSSVariables(nchatSkin.colors, "--my");
      expect(vars["--my-primary"]).toBe("#00D4FF");
    });

    test("skinToCSSVariables includes typography vars", () => {
      const vars = skinToCSSVariables(nchatSkin);
      expect(vars["--skin-font-family"]).toBeTruthy();
      expect(vars["--skin-font-size-base"]).toBeTruthy();
      expect(vars["--skin-line-height"]).toBeTruthy();
    });

    test("skinToCSSVariables includes spacing vars", () => {
      const vars = skinToCSSVariables(nchatSkin);
      expect(vars["--skin-sidebar-width"]).toBeTruthy();
      expect(vars["--skin-header-height"]).toBeTruthy();
    });

    test("skinToCSSVariables includes border-radius vars", () => {
      const vars = skinToCSSVariables(nchatSkin);
      expect(vars["--skin-radius-none"]).toBe("0px");
      expect(vars["--skin-radius-sm"]).toBeTruthy();
    });

    test("skinToCSSVariables uses dark mode colors when isDarkMode is true", () => {
      const lightVars = skinToCSSVariables(nchatSkin, false);
      const darkVars = skinToCSSVariables(nchatSkin, true);
      expect(lightVars["--skin-background"]).toBe("#FFFFFF");
      expect(darkVars["--skin-background"]).toBe("#18181B");
    });

    test("skinToCSSVariables has 17 color vars + typography + spacing + radius", () => {
      const vars = skinToCSSVariables(nchatSkin);
      const keys = Object.keys(vars);
      // 17 color keys + 11 typography + 8 spacing + 6 radius = 42
      expect(keys.length).toBe(42);
    });
  });

  describe("Registry Operations", () => {
    test("createRegistry returns snapshot of all built-ins", () => {
      const reg = createRegistry();
      expect(Object.keys(reg.skins)).toHaveLength(6);
      expect(Object.keys(reg.behaviors)).toHaveLength(6);
      expect(Object.keys(reg.profiles).length).toBeGreaterThanOrEqual(6);
    });

    test("registerSkin adds a custom skin", () => {
      const reg = createRegistry();
      const custom: VisualSkin = {
        ...nchatSkin,
        id: "custom-test",
        name: "Custom Test",
      };
      registerSkin(reg, custom);
      expect(reg.skins["custom-test"]).toBeDefined();
      expect(reg.skins["custom-test"].name).toBe("Custom Test");
    });

    test("registerBehavior adds a custom behavior", () => {
      const reg = createRegistry();
      const custom: BehaviorPreset = {
        ...nchatBehavior,
        id: "custom-behavior",
        name: "Custom Behavior",
      };
      registerBehavior(reg, custom);
      expect(reg.behaviors["custom-behavior"]).toBeDefined();
    });

    test("registerProfile adds a custom profile", () => {
      const reg = createRegistry();
      const custom: CompositeProfile = {
        id: "my-profile",
        name: "My Profile",
        description: "test",
        skinId: "nchat",
        behaviorId: "slack",
      };
      registerProfile(reg, custom);
      expect(reg.profiles["my-profile"]).toBeDefined();
    });

    test("registered custom skin is usable via getSkin", () => {
      const reg = createRegistry();
      const custom: VisualSkin = {
        ...nchatSkin,
        id: "custom-resolv",
        name: "Custom Resolv",
        colors: { ...nchatSkin.colors, primary: "#FACADE" },
      };
      registerSkin(reg, custom);
      const resolved = getSkin("custom-resolv", undefined, reg)!;
      expect(resolved.colors.primary).toBe("#FACADE");
    });

    test("registered profile resolves correctly", () => {
      const reg = createRegistry();
      registerProfile(reg, {
        id: "reg-test",
        name: "Reg Test",
        description: "test",
        skinId: "whatsapp",
        behaviorId: "discord",
      });
      const state = getProfile("reg-test", reg)!;
      expect(state.skin.id).toBe("whatsapp");
      expect(state.behavior.id).toBe("discord");
    });

    test("registry changes do not affect global skins/behaviors", () => {
      const reg = createRegistry();
      registerSkin(reg, { ...nchatSkin, id: "local-only", name: "Local" });
      expect(visualSkins["local-only"]).toBeUndefined(); // global unchanged
    });
  });

  describe("DOM Operations (simulated)", () => {
    // We can't test DOM in Node, but we can test that functions don't throw
    // when document is undefined.

    test("applySkin does not throw in Node environment", () => {
      expect(() => applySkin(nchatSkin, false)).not.toThrow();
    });

    test("removeSkinVariables does not throw in Node environment", () => {
      expect(() => removeSkinVariables()).not.toThrow();
    });

    test("switchSkin returns the resolved skin", () => {
      const skin = switchSkin("discord");
      expect(skin).toBeDefined();
      expect(skin!.id).toBe("discord");
    });

    test("switchSkin returns undefined for unknown skin", () => {
      expect(switchSkin("unknown")).toBeUndefined();
    });

    test("switchSkin applies overrides", () => {
      const skin = switchSkin("nchat", false, { colors: { primary: "#ABC" } });
      expect(skin!.colors.primary).toBe("#ABC");
    });

    test("resetSkin returns nchat profile", () => {
      const state = resetSkin();
      expect(state).toBeDefined();
      expect(state!.skin.id).toBe("nchat");
      expect(state!.behavior.id).toBe("nchat");
    });
  });
});

// ============================================================================
// 8. CROSS-CUTTING CONCERNS
// ============================================================================

describe("Cross-Cutting", () => {
  test("all skins have matching version strings", () => {
    for (const id of ALL_SKIN_IDS) {
      const skin = getVisualSkin(id)!;
      expect(skin.version).toBe("0.9.1");
    }
  });

  test("all behaviors have matching version strings", () => {
    for (const id of ALL_BEHAVIOR_IDS) {
      const b = getBehaviorPreset(id)!;
      expect(b.version).toBe("0.9.1");
    }
  });

  test("every same-platform profile has matching skin and behavior ids", () => {
    for (const id of ALL_SKIN_IDS) {
      const profile = getCompositeProfile(id)!;
      expect(profile.skinId).toBe(id);
      expect(profile.behaviorId).toBe(id);
    }
  });

  test("no skin id collides with a behavior id (same namespace)", () => {
    // They DO share the same namespace intentionally, but the objects are different.
    for (const id of ALL_SKIN_IDS) {
      const skin = getVisualSkin(id)!;
      const behavior = getBehaviorPreset(id)!;
      // They should have the same id but different shapes
      expect(skin.id).toBe(id);
      expect(behavior.id).toBe(id);
      expect("colors" in skin).toBe(true);
      expect("messaging" in behavior).toBe(true);
    }
  });

  test("composite profile count >= 6 (at least one per platform)", () => {
    expect(compositeProfileIds.length).toBeGreaterThanOrEqual(6);
  });

  test("all hybrid profiles reference valid skins and behaviors", () => {
    const hybridIds = compositeProfileIds.filter(
      (id) => !ALL_SKIN_IDS.includes(id),
    );
    for (const id of hybridIds) {
      const profile = getCompositeProfile(id)!;
      expect(getVisualSkin(profile.skinId)).toBeDefined();
      expect(getBehaviorPreset(profile.behaviorId)).toBeDefined();
    }
  });

  test('skin border radius "none" is always 0px', () => {
    for (const id of ALL_SKIN_IDS) {
      const skin = getVisualSkin(id)!;
      expect(skin.borderRadius.none).toBe("0px");
    }
  });

  test("icon set defaults to lucide for all skins", () => {
    for (const id of ALL_SKIN_IDS) {
      const skin = getVisualSkin(id)!;
      expect(skin.icons.set).toBe("lucide");
    }
  });
});
