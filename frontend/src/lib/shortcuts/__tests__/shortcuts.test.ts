/**
 * Keyboard Shortcuts System - Comprehensive Tests
 *
 * Tests for: Registry, Presets, Key Parser, Shortcut Manager, Keymap, Conflicts
 * Target: 150+ tests
 */

import {
  // Key Parser
  parseKeyCombo,
  parseChordSequence,
  normalizeKeyCombo,
  matchesKeyEvent,
  matchesKeyComboString,
  formatKeyCombo,
  formatChordSequence,
  splitKeyComboForDisplay,
  eventToComboString,
  detectPlatform,
  // Registry
  ShortcutRegistry,
  createShortcutRegistry,
  // Presets
  nchatPreset,
  slackPreset,
  discordPreset,
  telegramPreset,
  whatsappPreset,
  PRESETS,
  getPresetNames,
  getPreset,
  getAllPresets,
  presetToRegistrationOptions,
  applyUserOverrides,
  createEmptyOverrides,
  getPresetCategoryCounts,
  // Manager
  ShortcutManager,
  createShortcutManager,
  // Keymap
  buildKeymapEntries,
  getKeymap,
  searchShortcuts,
  exportKeymap,
  getCategoryTitle,
  getCategoryDescription,
  filterEntriesByContext,
  filterEnabledEntries,
  getKeymapSummary,
  CATEGORY_ORDER,
} from "../index";

import type {
  ParsedKey,
  ShortcutDefinition,
  ShortcutCategory,
  ShortcutContext,
  KeymapEntry,
} from "../index";

// ============================================================================
// Test Helpers
// ============================================================================

function createKeyboardEvent(options: {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key: options.key,
    code: options.code || `Key${options.key.toUpperCase()}`,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
}

// ============================================================================
// KEY PARSER TESTS (30+ tests)
// ============================================================================

describe("Key Parser", () => {
  describe("parseKeyCombo", () => {
    it("should parse a simple key", () => {
      const result = parseKeyCombo("k");
      expect(result.key).toBe("k");
      expect(result.modifiers.mod).toBe(false);
      expect(result.modifiers.ctrl).toBe(false);
      expect(result.modifiers.alt).toBe(false);
      expect(result.modifiers.shift).toBe(false);
    });

    it("should parse mod+key", () => {
      const result = parseKeyCombo("mod+k");
      expect(result.key).toBe("k");
      expect(result.modifiers.mod).toBe(true);
      expect(result.modifiers.ctrl).toBe(false);
    });

    it("should parse ctrl+key", () => {
      const result = parseKeyCombo("ctrl+k");
      expect(result.key).toBe("k");
      expect(result.modifiers.ctrl).toBe(true);
      expect(result.modifiers.mod).toBe(false);
    });

    it("should parse alt+key", () => {
      const result = parseKeyCombo("alt+arrowdown");
      expect(result.key).toBe("arrowdown");
      expect(result.modifiers.alt).toBe(true);
    });

    it("should parse shift+key", () => {
      const result = parseKeyCombo("shift+enter");
      expect(result.key).toBe("enter");
      expect(result.modifiers.shift).toBe(true);
    });

    it("should parse mod+shift+key", () => {
      const result = parseKeyCombo("mod+shift+k");
      expect(result.key).toBe("k");
      expect(result.modifiers.mod).toBe(true);
      expect(result.modifiers.shift).toBe(true);
    });

    it("should parse command as meta", () => {
      const result = parseKeyCombo("command+k");
      expect(result.modifiers.meta).toBe(true);
    });

    it("should parse cmd as meta", () => {
      const result = parseKeyCombo("cmd+k");
      expect(result.modifiers.meta).toBe(true);
    });

    it("should parse option as alt", () => {
      const result = parseKeyCombo("option+k");
      expect(result.modifiers.alt).toBe(true);
    });

    it("should parse control as ctrl", () => {
      const result = parseKeyCombo("control+k");
      expect(result.modifiers.ctrl).toBe(true);
    });

    it("should normalize arrow keys (up -> arrowup)", () => {
      const result = parseKeyCombo("alt+up");
      expect(result.key).toBe("arrowup");
    });

    it("should normalize esc to escape", () => {
      const result = parseKeyCombo("esc");
      expect(result.key).toBe("escape");
    });

    it("should normalize return to enter", () => {
      const result = parseKeyCombo("return");
      expect(result.key).toBe("enter");
    });

    it("should preserve the original string", () => {
      const result = parseKeyCombo("mod+shift+k");
      expect(result.original).toBe("mod+shift+k");
    });

    it("should handle multiple modifiers", () => {
      const result = parseKeyCombo("mod+alt+shift+k");
      expect(result.modifiers.mod).toBe(true);
      expect(result.modifiers.alt).toBe(true);
      expect(result.modifiers.shift).toBe(true);
      expect(result.key).toBe("k");
    });

    it("should handle super as meta", () => {
      const result = parseKeyCombo("super+k");
      expect(result.modifiers.meta).toBe(true);
    });

    it("should handle win as meta", () => {
      const result = parseKeyCombo("win+k");
      expect(result.modifiers.meta).toBe(true);
    });
  });

  describe("parseChordSequence", () => {
    it("should parse a single combo as non-chord", () => {
      const result = parseChordSequence("mod+k");
      expect(result.isChord).toBe(false);
      expect(result.steps.length).toBe(1);
      expect(result.steps[0].modifiers.mod).toBe(true);
      expect(result.steps[0].key).toBe("k");
    });

    it("should parse a two-step chord", () => {
      const result = parseChordSequence("g then i");
      expect(result.isChord).toBe(true);
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].key).toBe("g");
      expect(result.steps[1].key).toBe("i");
    });

    it("should parse a three-step chord", () => {
      const result = parseChordSequence("g then o then p");
      expect(result.isChord).toBe(true);
      expect(result.steps.length).toBe(3);
    });

    it("should handle chord with modifier keys", () => {
      const result = parseChordSequence("mod+k then mod+b");
      expect(result.isChord).toBe(true);
      expect(result.steps[0].modifiers.mod).toBe(true);
      expect(result.steps[0].key).toBe("k");
      expect(result.steps[1].modifiers.mod).toBe(true);
      expect(result.steps[1].key).toBe("b");
    });

    it("should preserve the original string", () => {
      const result = parseChordSequence("g then i");
      expect(result.original).toBe("g then i");
    });
  });

  describe("normalizeKeyCombo", () => {
    it("should normalize to lowercase", () => {
      expect(normalizeKeyCombo("Mod+K")).toBe("mod+k");
    });

    it("should normalize command to mod", () => {
      expect(normalizeKeyCombo("command+k")).toBe("mod+k");
    });

    it("should normalize cmd to mod", () => {
      expect(normalizeKeyCombo("cmd+k")).toBe("mod+k");
    });

    it("should keep ctrl separate when no mod/meta", () => {
      expect(normalizeKeyCombo("ctrl+k")).toBe("ctrl+k");
    });

    it("should normalize meta to mod", () => {
      expect(normalizeKeyCombo("meta+shift+k")).toBe("mod+shift+k");
    });

    it("should produce consistent order: mod, alt, shift", () => {
      expect(normalizeKeyCombo("shift+alt+mod+k")).toBe("mod+alt+shift+k");
    });
  });

  describe("matchesKeyEvent", () => {
    it("should match a simple key press", () => {
      const event = createKeyboardEvent({ key: "k" });
      const parsed = parseKeyCombo("k");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(true);
    });

    it("should match ctrl+key on windows (mod)", () => {
      const event = createKeyboardEvent({ key: "k", ctrlKey: true });
      const parsed = parseKeyCombo("mod+k");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(true);
    });

    it("should match meta+key on mac (mod)", () => {
      const event = createKeyboardEvent({ key: "k", metaKey: true });
      const parsed = parseKeyCombo("mod+k");
      expect(matchesKeyEvent(event, parsed, "mac")).toBe(true);
    });

    it("should not match when modifier is missing", () => {
      const event = createKeyboardEvent({ key: "k" });
      const parsed = parseKeyCombo("mod+k");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(false);
    });

    it("should not match when extra modifier is pressed", () => {
      const event = createKeyboardEvent({
        key: "k",
        ctrlKey: true,
        altKey: true,
      });
      const parsed = parseKeyCombo("mod+k");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(false);
    });

    it("should match shift combinations", () => {
      const event = createKeyboardEvent({
        key: "k",
        ctrlKey: true,
        shiftKey: true,
      });
      const parsed = parseKeyCombo("mod+shift+k");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(true);
    });

    it("should match alt combinations", () => {
      const event = createKeyboardEvent({
        key: "ArrowDown",
        code: "ArrowDown",
        altKey: true,
      });
      const parsed = parseKeyCombo("alt+arrowdown");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(true);
    });

    it("should not match when wrong key is pressed", () => {
      const event = createKeyboardEvent({ key: "j", ctrlKey: true });
      const parsed = parseKeyCombo("mod+k");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(false);
    });

    it("should match escape key", () => {
      const event = createKeyboardEvent({ key: "Escape", code: "Escape" });
      const parsed = parseKeyCombo("escape");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(true);
    });

    it("should match enter key", () => {
      const event = createKeyboardEvent({ key: "Enter", code: "Enter" });
      const parsed = parseKeyCombo("enter");
      expect(matchesKeyEvent(event, parsed, "windows")).toBe(true);
    });
  });

  describe("matchesKeyComboString", () => {
    it("should match using string combo", () => {
      const event = createKeyboardEvent({ key: "k", ctrlKey: true });
      expect(matchesKeyComboString(event, "mod+k", "windows")).toBe(true);
    });

    it("should not match wrong combo", () => {
      const event = createKeyboardEvent({ key: "k" });
      expect(matchesKeyComboString(event, "mod+k", "windows")).toBe(false);
    });
  });

  describe("formatKeyCombo", () => {
    it("should format for Mac with symbols", () => {
      const result = formatKeyCombo("mod+k", { platform: "mac" });
      expect(result).toContain("\u2318"); // Command symbol
      expect(result).toContain("K");
    });

    it("should format for Windows with text", () => {
      const result = formatKeyCombo("mod+k", { platform: "windows" });
      expect(result).toContain("Ctrl");
      expect(result).toContain("K");
    });

    it("should format shift on Mac", () => {
      const result = formatKeyCombo("mod+shift+k", { platform: "mac" });
      expect(result).toContain("\u21E7"); // Shift symbol
    });

    it("should format shift on Windows", () => {
      const result = formatKeyCombo("mod+shift+k", { platform: "windows" });
      expect(result).toContain("Shift");
    });

    it("should format alt on Mac as Option symbol", () => {
      const result = formatKeyCombo("alt+k", { platform: "mac" });
      expect(result).toContain("\u2325"); // Option symbol
    });

    it("should format alt on Windows as Alt", () => {
      const result = formatKeyCombo("alt+k", { platform: "windows" });
      expect(result).toContain("Alt");
    });

    it("should use no separator on Mac", () => {
      const result = formatKeyCombo("mod+k", { platform: "mac" });
      // Mac uses empty separator (symbols are concatenated)
      expect(result).not.toContain("+");
    });

    it("should use + separator on Windows", () => {
      const result = formatKeyCombo("mod+k", { platform: "windows" });
      expect(result).toContain("+");
    });

    it("should respect custom separator", () => {
      const result = formatKeyCombo("mod+k", {
        platform: "windows",
        separator: " ",
      });
      expect(result).toBe("Ctrl K");
    });

    it("should format arrow keys", () => {
      const result = formatKeyCombo("alt+arrowdown", { platform: "mac" });
      expect(result).toContain("\u2193"); // Down arrow
    });
  });

  describe("formatChordSequence", () => {
    it("should format a single combo", () => {
      const result = formatChordSequence("mod+k", { platform: "windows" });
      expect(result).toBe("Ctrl+K");
    });

    it('should format a chord with " then "', () => {
      const result = formatChordSequence("g then i", { platform: "windows" });
      expect(result).toBe("G then I");
    });
  });

  describe("splitKeyComboForDisplay", () => {
    it("should split into individual parts", () => {
      const parts = splitKeyComboForDisplay("mod+shift+k", { platform: "mac" });
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("\u2318");
      expect(parts[1]).toBe("\u21E7");
      expect(parts[2]).toBe("K");
    });

    it("should split Windows format", () => {
      const parts = splitKeyComboForDisplay("mod+k", { platform: "windows" });
      expect(parts.length).toBe(2);
      expect(parts[0]).toBe("Ctrl");
      expect(parts[1]).toBe("K");
    });
  });

  describe("eventToComboString", () => {
    it("should convert ctrl+k event on windows", () => {
      const event = createKeyboardEvent({ key: "k", ctrlKey: true });
      expect(eventToComboString(event, "windows")).toBe("mod+k");
    });

    it("should convert meta+k event on mac", () => {
      const event = createKeyboardEvent({ key: "k", metaKey: true });
      expect(eventToComboString(event, "mac")).toBe("mod+k");
    });

    it("should include shift modifier", () => {
      const event = createKeyboardEvent({
        key: "k",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(eventToComboString(event, "windows")).toBe("mod+shift+k");
    });

    it("should ignore modifier-only presses", () => {
      const event = createKeyboardEvent({
        key: "Control",
        code: "ControlLeft",
        ctrlKey: true,
      });
      expect(eventToComboString(event, "windows")).toBe("mod");
    });
  });

  describe("detectPlatform", () => {
    it("should return a platform string", () => {
      const platform = detectPlatform();
      expect(["mac", "windows", "linux", "unknown"]).toContain(platform);
    });
  });
});

// ============================================================================
// REGISTRY TESTS (25+ tests)
// ============================================================================

describe("ShortcutRegistry", () => {
  let registry: ShortcutRegistry;

  beforeEach(() => {
    registry = createShortcutRegistry();
  });

  describe("register and unregister", () => {
    it("should register a shortcut", () => {
      registry.register({
        id: "test-1",
        keys: "mod+k",
        description: "Test shortcut",
        category: "navigation",
      });
      expect(registry.has("test-1")).toBe(true);
      expect(registry.size).toBe(1);
    });

    it("should return an unregister function", () => {
      const unregister = registry.register({
        id: "test-1",
        keys: "mod+k",
        description: "Test shortcut",
        category: "navigation",
      });
      expect(registry.has("test-1")).toBe(true);
      unregister();
      expect(registry.has("test-1")).toBe(false);
    });

    it("should unregister by ID", () => {
      registry.register({
        id: "test-1",
        keys: "mod+k",
        description: "Test",
        category: "navigation",
      });
      registry.unregister("test-1");
      expect(registry.has("test-1")).toBe(false);
    });

    it("should register many at once", () => {
      const unregisterAll = registry.registerMany([
        { id: "a", keys: "mod+a", description: "A", category: "navigation" },
        { id: "b", keys: "mod+b", description: "B", category: "formatting" },
        { id: "c", keys: "mod+c", description: "C", category: "messaging" },
      ]);
      expect(registry.size).toBe(3);
      unregisterAll();
      expect(registry.size).toBe(0);
    });

    it("should clear all shortcuts", () => {
      registry.register({
        id: "a",
        keys: "mod+a",
        description: "A",
        category: "navigation",
      });
      registry.register({
        id: "b",
        keys: "mod+b",
        description: "B",
        category: "formatting",
      });
      registry.clear();
      expect(registry.size).toBe(0);
    });

    it("should apply default values", () => {
      registry.register({
        id: "test-1",
        keys: "mod+k",
        description: "Test",
        category: "navigation",
      });
      const def = registry.get("test-1")!;
      expect(def.context).toBe("global");
      expect(def.priority).toBe(0);
      expect(def.preventDefault).toBe(false);
      expect(def.enableInInputs).toBe(false);
      expect(def.enabled).toBe(true);
    });
  });

  describe("query", () => {
    beforeEach(() => {
      registry.registerMany([
        {
          id: "nav-1",
          keys: "mod+k",
          description: "Search",
          category: "navigation",
          context: "global",
        },
        {
          id: "nav-2",
          keys: "alt+arrowdown",
          description: "Next channel",
          category: "navigation",
          context: "sidebar",
        },
        {
          id: "msg-1",
          keys: "enter",
          description: "Send message",
          category: "messaging",
          context: "chat",
        },
        {
          id: "fmt-1",
          keys: "mod+b",
          description: "Bold",
          category: "formatting",
          context: "editor",
        },
        {
          id: "med-1",
          keys: "mod+shift+e",
          description: "Emoji",
          category: "media",
          context: "global",
        },
      ]);
    });

    it("should get by ID", () => {
      expect(registry.get("nav-1")?.description).toBe("Search");
    });

    it("should return undefined for unknown ID", () => {
      expect(registry.get("unknown")).toBeUndefined();
    });

    it("should get all shortcuts", () => {
      expect(registry.getAll().length).toBe(5);
    });

    it("should get by category", () => {
      expect(registry.getByCategory("navigation").length).toBe(2);
      expect(registry.getByCategory("messaging").length).toBe(1);
      expect(registry.getByCategory("formatting").length).toBe(1);
    });

    it("should get by context (includes global)", () => {
      const chatShortcuts = registry.getByContext("chat");
      // Should include chat context AND global context shortcuts
      expect(chatShortcuts.length).toBe(3); // msg-1 + nav-1 + med-1 (global)
    });

    it("should get grouped by category", () => {
      const grouped = registry.getGroupedByCategory();
      expect(grouped.navigation.length).toBe(2);
      expect(grouped.messaging.length).toBe(1);
      expect(grouped.formatting.length).toBe(1);
      expect(grouped.media.length).toBe(1);
      expect(grouped.calls.length).toBe(0);
    });

    it("should get grouped by context", () => {
      const grouped = registry.getGroupedByContext();
      expect(grouped.global.length).toBe(2);
      expect(grouped.chat.length).toBe(1);
      expect(grouped.editor.length).toBe(1);
      expect(grouped.sidebar.length).toBe(1);
    });

    it("should check existence with has()", () => {
      expect(registry.has("nav-1")).toBe(true);
      expect(registry.has("nonexistent")).toBe(false);
    });

    it("should report correct size", () => {
      expect(registry.size).toBe(5);
    });

    it("should get by preset", () => {
      registry.register({
        id: "p1",
        keys: "a",
        description: "A",
        category: "custom",
        preset: "nchat",
      });
      expect(registry.getByPreset("nchat").length).toBe(1);
      expect(registry.getByPreset("slack").length).toBe(0);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      registry.register({
        id: "test-1",
        keys: "mod+k",
        description: "Test",
        category: "navigation",
      });
    });

    it("should update keys", () => {
      expect(registry.updateKeys("test-1", "mod+f")).toBe(true);
      expect(registry.get("test-1")?.keys).toBe("mod+f");
    });

    it("should return false for unknown ID", () => {
      expect(registry.updateKeys("unknown", "mod+f")).toBe(false);
    });

    it("should set enabled/disabled", () => {
      registry.setEnabled("test-1", false);
      expect(registry.get("test-1")?.enabled).toBe(false);
      registry.setEnabled("test-1", true);
      expect(registry.get("test-1")?.enabled).toBe(true);
    });

    it("should set action", () => {
      const action = jest.fn();
      registry.setAction("test-1", action);
      expect(registry.get("test-1")?.action).toBe(action);
    });

    it("should set priority", () => {
      registry.setPriority("test-1", 10);
      expect(registry.get("test-1")?.priority).toBe(10);
    });
  });

  describe("conflict detection", () => {
    it("should detect same-context conflicts", () => {
      registry.register({
        id: "a",
        keys: "mod+k",
        description: "A",
        category: "navigation",
        context: "global",
      });
      registry.register({
        id: "b",
        keys: "mod+k",
        description: "B",
        category: "navigation",
        context: "global",
      });
      const conflicts = registry.detectConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
      const conflict = conflicts.find((c) => c.shortcutIds.includes("a"));
      expect(conflict).toBeDefined();
      expect(conflict?.shortcutIds).toContain("b");
    });

    it("should not detect conflicts across different contexts", () => {
      registry.register({
        id: "a",
        keys: "mod+k",
        description: "A",
        category: "navigation",
        context: "chat",
      });
      registry.register({
        id: "b",
        keys: "mod+k",
        description: "B",
        category: "navigation",
        context: "editor",
      });
      const conflicts = registry.detectConflicts();
      // No direct same-context conflict (but possibly global cross-context)
      const directConflict = conflicts.find(
        (c) => c.shortcutIds.includes("a") && c.shortcutIds.includes("b"),
      );
      expect(directConflict).toBeUndefined();
    });

    it("should detect global-to-context conflicts", () => {
      registry.register({
        id: "g",
        keys: "mod+k",
        description: "Global",
        category: "navigation",
        context: "global",
      });
      registry.register({
        id: "c",
        keys: "mod+k",
        description: "Chat",
        category: "navigation",
        context: "chat",
      });
      const conflicts = registry.detectConflicts();
      const crossConflict = conflicts.find(
        (c) => c.shortcutIds.includes("g") && c.shortcutIds.includes("c"),
      );
      expect(crossConflict).toBeDefined();
    });

    it("should determine winner by priority", () => {
      registry.register({
        id: "low",
        keys: "mod+k",
        description: "Low",
        category: "navigation",
        context: "global",
        priority: 1,
      });
      registry.register({
        id: "high",
        keys: "mod+k",
        description: "High",
        category: "navigation",
        context: "global",
        priority: 10,
      });
      const conflicts = registry.detectConflicts();
      const conflict = conflicts.find((c) => c.shortcutIds.includes("low"));
      expect(conflict?.winnerId).toBe("high");
    });

    it("should check hasConflict", () => {
      registry.register({
        id: "a",
        keys: "mod+k",
        description: "A",
        category: "navigation",
        context: "global",
      });
      expect(registry.hasConflict("mod+k", "global")).toBe(true);
      expect(registry.hasConflict("mod+f", "global")).toBe(false);
    });

    it("should exclude specific ID from conflict check", () => {
      registry.register({
        id: "a",
        keys: "mod+k",
        description: "A",
        category: "navigation",
        context: "global",
      });
      expect(registry.hasConflict("mod+k", "global", "a")).toBe(false);
    });

    it("should resolve conflict to highest priority", () => {
      registry.register({
        id: "low",
        keys: "mod+k",
        description: "Low",
        category: "navigation",
        context: "global",
        priority: 1,
      });
      registry.register({
        id: "high",
        keys: "mod+k",
        description: "High",
        category: "navigation",
        context: "global",
        priority: 10,
      });
      const winner = registry.resolveConflict("mod+k", "global");
      expect(winner?.id).toBe("high");
    });

    it("should prefer context-specific over global in resolve", () => {
      registry.register({
        id: "global",
        keys: "mod+k",
        description: "Global",
        category: "navigation",
        context: "global",
        priority: 10,
      });
      registry.register({
        id: "chat",
        keys: "mod+k",
        description: "Chat",
        category: "navigation",
        context: "chat",
        priority: 1,
      });
      const winner = registry.resolveConflict("mod+k", "chat");
      expect(winner?.id).toBe("chat");
    });

    it("should return null when no match for resolve", () => {
      expect(registry.resolveConflict("mod+k", "global")).toBeNull();
    });

    it("should ignore disabled shortcuts in conflicts", () => {
      registry.register({
        id: "a",
        keys: "mod+k",
        description: "A",
        category: "navigation",
        context: "global",
        enabled: false,
      });
      registry.register({
        id: "b",
        keys: "mod+k",
        description: "B",
        category: "navigation",
        context: "global",
      });
      const conflicts = registry.detectConflicts();
      // Only one enabled shortcut, no conflict
      const sameContextConflicts = conflicts.filter(
        (c) => c.context === "global",
      );
      expect(sameContextConflicts.length).toBe(0);
    });
  });
});

// ============================================================================
// PRESET TESTS (30+ tests)
// ============================================================================

describe("Presets", () => {
  describe("preset structure", () => {
    it("should have all 5 presets available", () => {
      expect(getPresetNames().length).toBe(5);
      expect(getPresetNames()).toContain("nchat");
      expect(getPresetNames()).toContain("slack");
      expect(getPresetNames()).toContain("discord");
      expect(getPresetNames()).toContain("telegram");
      expect(getPresetNames()).toContain("whatsapp");
    });

    it("should get preset by name", () => {
      expect(getPreset("nchat")).toBeDefined();
      expect(getPreset("nonexistent")).toBeUndefined();
    });

    it("should get all presets", () => {
      const all = getAllPresets();
      expect(all.length).toBe(5);
    });

    it("should have PRESETS map", () => {
      expect(PRESETS.nchat).toBeDefined();
      expect(PRESETS.slack).toBeDefined();
      expect(PRESETS.discord).toBeDefined();
      expect(PRESETS.telegram).toBeDefined();
      expect(PRESETS.whatsapp).toBeDefined();
    });
  });

  describe("nchat preset", () => {
    it("should have name and label", () => {
      expect(nchatPreset.name).toBe("nchat");
      expect(nchatPreset.label).toBeTruthy();
    });

    it("should have at least 30 shortcuts", () => {
      expect(nchatPreset.shortcuts.length).toBeGreaterThanOrEqual(30);
    });

    it("should cover all main categories", () => {
      const counts = getPresetCategoryCounts(nchatPreset);
      expect(counts.navigation).toBeGreaterThan(0);
      expect(counts.messaging).toBeGreaterThan(0);
      expect(counts.formatting).toBeGreaterThan(0);
      expect(counts.media).toBeGreaterThan(0);
      expect(counts.calls).toBeGreaterThan(0);
      expect(counts.admin).toBeGreaterThan(0);
    });

    it("should have a quick switcher shortcut", () => {
      const qs = nchatPreset.shortcuts.find((s) => s.id === "quick-switcher");
      expect(qs).toBeDefined();
      expect(qs?.keys).toBe("mod+k");
    });

    it("should have a search shortcut", () => {
      const search = nchatPreset.shortcuts.find((s) => s.id === "search");
      expect(search).toBeDefined();
    });

    it("should have bold formatting", () => {
      const bold = nchatPreset.shortcuts.find((s) => s.id === "bold");
      expect(bold).toBeDefined();
      expect(bold?.keys).toBe("mod+b");
    });
  });

  describe("slack preset", () => {
    it("should have at least 30 shortcuts", () => {
      expect(slackPreset.shortcuts.length).toBeGreaterThanOrEqual(30);
    });

    it("should have Slack-specific shortcuts", () => {
      const allUnreads = slackPreset.shortcuts.find(
        (s) => s.id === "all-unreads",
      );
      expect(allUnreads).toBeDefined();
      expect(allUnreads?.keys).toBe("mod+shift+a");
    });

    it("should have huddle shortcut", () => {
      const huddle = slackPreset.shortcuts.find((s) => s.id === "start-huddle");
      expect(huddle).toBeDefined();
    });

    it("should cover all categories", () => {
      const counts = getPresetCategoryCounts(slackPreset);
      expect(counts.navigation).toBeGreaterThan(0);
      expect(counts.messaging).toBeGreaterThan(0);
      expect(counts.formatting).toBeGreaterThan(0);
    });
  });

  describe("discord preset", () => {
    it("should have at least 30 shortcuts", () => {
      expect(discordPreset.shortcuts.length).toBeGreaterThanOrEqual(30);
    });

    it("should have Discord-specific shortcuts", () => {
      const help = discordPreset.shortcuts.find(
        (s) => s.id === "shortcut-help",
      );
      expect(help).toBeDefined();
      expect(help?.keys).toBe("ctrl+/");
    });

    it("should have voice channel shortcut", () => {
      const join = discordPreset.shortcuts.find((s) => s.id === "join-voice");
      expect(join).toBeDefined();
    });
  });

  describe("telegram preset", () => {
    it("should have at least 30 shortcuts", () => {
      expect(telegramPreset.shortcuts.length).toBeGreaterThanOrEqual(30);
    });

    it("should have Telegram-specific features", () => {
      const lock = telegramPreset.shortcuts.find((s) => s.id === "lock-app");
      expect(lock).toBeDefined();
    });

    it("should have global search", () => {
      const gs = telegramPreset.shortcuts.find((s) => s.id === "global-search");
      expect(gs).toBeDefined();
    });
  });

  describe("whatsapp preset", () => {
    it("should have at least 30 shortcuts", () => {
      expect(whatsappPreset.shortcuts.length).toBeGreaterThanOrEqual(30);
    });

    it("should have WhatsApp-specific features", () => {
      const archived = whatsappPreset.shortcuts.find(
        (s) => s.id === "goto-archived",
      );
      expect(archived).toBeDefined();
    });

    it("should have new chat shortcut", () => {
      const nc = whatsappPreset.shortcuts.find((s) => s.id === "new-chat");
      expect(nc).toBeDefined();
      expect(nc?.keys).toBe("mod+n");
    });
  });

  describe("presetToRegistrationOptions", () => {
    it("should convert preset to registration options", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      expect(options.length).toBe(nchatPreset.shortcuts.length);
    });

    it("should prefix IDs with preset name", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      expect(options[0].id.startsWith("nchat:")).toBe(true);
    });

    it("should set preset field", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      expect(options[0].preset).toBe("nchat");
    });

    it("should preserve keys and description", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      const qs = options.find((o) => o.id === "nchat:quick-switcher");
      expect(qs?.keys).toBe("mod+k");
      expect(qs?.description).toBeTruthy();
    });
  });

  describe("user overrides", () => {
    it("should create empty overrides", () => {
      const overrides = createEmptyOverrides();
      expect(Object.keys(overrides.keyOverrides).length).toBe(0);
      expect(overrides.disabledIds.size).toBe(0);
    });

    it("should apply key overrides", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      const overrides = createEmptyOverrides();
      overrides.keyOverrides["nchat:quick-switcher"] = "mod+p";
      const modified = applyUserOverrides(options, overrides);
      const qs = modified.find((o) => o.id === "nchat:quick-switcher");
      expect(qs?.keys).toBe("mod+p");
    });

    it("should disable shortcuts via overrides", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      const overrides = createEmptyOverrides();
      overrides.disabledIds.add("nchat:quick-switcher");
      const modified = applyUserOverrides(options, overrides);
      const qs = modified.find((o) => o.id === "nchat:quick-switcher");
      expect(qs).toBeUndefined();
    });

    it("should not modify non-overridden shortcuts", () => {
      const options = presetToRegistrationOptions(nchatPreset);
      const overrides = createEmptyOverrides();
      overrides.keyOverrides["nchat:quick-switcher"] = "mod+p";
      const modified = applyUserOverrides(options, overrides);
      const search = modified.find((o) => o.id === "nchat:search");
      expect(search?.keys).toBe("mod+f"); // unchanged
    });
  });

  describe("getPresetCategoryCounts", () => {
    it("should count shortcuts per category", () => {
      const counts = getPresetCategoryCounts(nchatPreset);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(nchatPreset.shortcuts.length);
    });
  });
});

// ============================================================================
// SHORTCUT MANAGER TESTS (30+ tests)
// ============================================================================

describe("ShortcutManager", () => {
  let manager: ShortcutManager;

  beforeEach(() => {
    manager = createShortcutManager({ platform: "windows" });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("preset loading", () => {
    it("should load nchat preset", () => {
      expect(manager.loadPreset("nchat")).toBe(true);
      expect(manager.getCurrentPreset()).toBe("nchat");
    });

    it("should load slack preset", () => {
      expect(manager.loadPreset("slack")).toBe(true);
      expect(manager.getCurrentPreset()).toBe("slack");
    });

    it("should fail for unknown preset", () => {
      expect(manager.loadPreset("nonexistent")).toBe(false);
    });

    it("should replace shortcuts on new preset load", () => {
      manager.loadPreset("nchat");
      const nchatCount = manager.getRegistry().size;
      manager.loadPreset("slack");
      const slackCount = manager.getRegistry().size;
      // Both should have shortcuts but possibly different counts
      expect(nchatCount).toBeGreaterThan(0);
      expect(slackCount).toBeGreaterThan(0);
    });

    it("should load preset object directly", () => {
      manager.loadPresetObject(discordPreset);
      expect(manager.getCurrentPreset()).toBe("discord");
      expect(manager.getRegistry().size).toBeGreaterThan(0);
    });
  });

  describe("context management", () => {
    it("should start with global context", () => {
      expect(manager.getActiveContexts()).toContain("global");
    });

    it("should add context", () => {
      manager.addContext("chat");
      expect(manager.isContextActive("chat")).toBe(true);
    });

    it("should remove context", () => {
      manager.addContext("chat");
      manager.removeContext("chat");
      expect(manager.isContextActive("chat")).toBe(false);
    });

    it("should not remove global context", () => {
      manager.removeContext("global");
      expect(manager.isContextActive("global")).toBe(true);
    });

    it("should set multiple contexts", () => {
      manager.setContexts(["chat", "editor"]);
      expect(manager.isContextActive("chat")).toBe(true);
      expect(manager.isContextActive("editor")).toBe(true);
      expect(manager.isContextActive("global")).toBe(true); // always included
    });
  });

  describe("enable/disable", () => {
    it("should start enabled", () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it("should toggle enabled state", () => {
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);
    });

    it("should not handle events when disabled", () => {
      manager.loadPreset("nchat");
      manager.setEnabled(false);
      const event = createKeyboardEvent({ key: "k", ctrlKey: true });
      const result = manager.handleKeyEvent(event);
      expect(result.handled).toBe(false);
    });
  });

  describe("event handling", () => {
    beforeEach(() => {
      manager.loadPreset("nchat");
    });

    it("should handle matching event", () => {
      const actionFn = jest.fn();
      manager.getRegistry().setAction("nchat:quick-switcher", actionFn);
      const event = createKeyboardEvent({ key: "k", ctrlKey: true });
      const result = manager.handleKeyEvent(event);
      expect(result.handled).toBe(true);
      expect(actionFn).toHaveBeenCalled();
    });

    it("should not handle non-matching event", () => {
      const event = createKeyboardEvent({ key: "z" });
      const result = manager.handleKeyEvent(event);
      expect(result.handled).toBe(false);
    });

    it("should respect context", () => {
      const actionFn = jest.fn();
      // 'nchat:send-message' is in 'chat' context
      manager.getRegistry().setAction("nchat:send-message", actionFn);
      // Without chat context, should not fire
      const event = createKeyboardEvent({ key: "Enter", code: "Enter" });
      manager.handleKeyEvent(event);
      // Chat context is not active, so it should not fire
      expect(actionFn).not.toHaveBeenCalled();
    });

    it("should fire in correct context", () => {
      const actionFn = jest.fn();
      manager.getRegistry().setAction("nchat:send-message", actionFn);
      // Enable enableInInputs so it actually fires
      const def = manager.getRegistry().get("nchat:send-message");
      if (def) def.enableInInputs = true;
      manager.addContext("chat");
      const event = createKeyboardEvent({ key: "Enter", code: "Enter" });
      const result = manager.handleKeyEvent(event);
      expect(result.handled).toBe(true);
      expect(actionFn).toHaveBeenCalled();
    });

    it("should handle action returning false (not handled)", () => {
      manager.getRegistry().setAction("nchat:quick-switcher", () => false);
      const event = createKeyboardEvent({ key: "k", ctrlKey: true });
      const result = manager.handleKeyEvent(event);
      expect(result.handled).toBe(false);
    });

    it("should ignore modifier-only presses", () => {
      const event = createKeyboardEvent({
        key: "Control",
        code: "ControlLeft",
        ctrlKey: true,
      });
      const result = manager.handleKeyEvent(event);
      expect(result.handled).toBe(false);
    });
  });

  describe("user overrides", () => {
    it("should apply user key overrides", () => {
      manager.loadPreset("nchat");
      const overrides = createEmptyOverrides();
      overrides.keyOverrides["nchat:quick-switcher"] = "mod+p";
      manager.setUserOverrides(overrides);
      // Reloads preset with overrides
      const def = manager.getRegistry().get("nchat:quick-switcher");
      expect(def?.keys).toBe("mod+p");
    });

    it("should disable shortcut via overrides", () => {
      manager.loadPreset("nchat");
      manager.disableShortcut("nchat:quick-switcher");
      const def = manager.getRegistry().get("nchat:quick-switcher");
      expect(def?.enabled).toBe(false);
    });

    it("should re-enable shortcut", () => {
      manager.loadPreset("nchat");
      manager.disableShortcut("nchat:quick-switcher");
      manager.enableShortcut("nchat:quick-switcher");
      const def = manager.getRegistry().get("nchat:quick-switcher");
      expect(def?.enabled).toBe(true);
    });

    it("should override a single key", () => {
      manager.loadPreset("nchat");
      manager.overrideKey("nchat:search", "mod+g");
      expect(manager.getRegistry().get("nchat:search")?.keys).toBe("mod+g");
    });

    it("should get user overrides", () => {
      manager.loadPreset("nchat");
      const overrides = createEmptyOverrides();
      overrides.keyOverrides["nchat:search"] = "mod+g";
      manager.setUserOverrides(overrides);
      const got = manager.getUserOverrides();
      expect(got.keyOverrides["nchat:search"]).toBe("mod+g");
    });
  });

  describe("chord sequences", () => {
    beforeEach(() => {
      manager.getRegistry().register({
        id: "chord-test",
        keys: "g then i",
        description: "Go to inbox",
        category: "navigation",
        context: "global",
      });
    });

    it("should start chord on first step", () => {
      const event = createKeyboardEvent({ key: "g" });
      const result = manager.handleKeyEvent(event);
      expect(result.pendingChord).toBe(true);
      expect(manager.isPendingChord()).toBe(true);
    });

    it("should complete chord on second step", () => {
      const actionFn = jest.fn();
      manager.getRegistry().setAction("chord-test", actionFn);

      const event1 = createKeyboardEvent({ key: "g" });
      manager.handleKeyEvent(event1);

      const event2 = createKeyboardEvent({ key: "i" });
      const result = manager.handleKeyEvent(event2);
      expect(result.handled).toBe(true);
      expect(result.pendingChord).toBe(false);
      expect(actionFn).toHaveBeenCalled();
    });

    it("should cancel chord on wrong key", () => {
      const event1 = createKeyboardEvent({ key: "g" });
      manager.handleKeyEvent(event1);

      const event2 = createKeyboardEvent({ key: "x" });
      const result = manager.handleKeyEvent(event2);
      expect(result.handled).toBe(false);
      expect(result.pendingChord).toBe(false);
      expect(manager.isPendingChord()).toBe(false);
    });

    it("should cancel chord via cancelChord()", () => {
      const event = createKeyboardEvent({ key: "g" });
      manager.handleKeyEvent(event);
      expect(manager.isPendingChord()).toBe(true);
      manager.cancelChord();
      expect(manager.isPendingChord()).toBe(false);
    });

    it("should timeout chord after delay", (done) => {
      const shortManager = createShortcutManager({
        platform: "windows",
        chordTimeout: 100,
      });
      shortManager.getRegistry().register({
        id: "chord-timeout",
        keys: "g then i",
        description: "Test timeout",
        category: "navigation",
        context: "global",
      });

      const event = createKeyboardEvent({ key: "g" });
      shortManager.handleKeyEvent(event);
      expect(shortManager.isPendingChord()).toBe(true);

      setTimeout(() => {
        expect(shortManager.isPendingChord()).toBe(false);
        shortManager.destroy();
        done();
      }, 200);
    });
  });

  describe("conflict detection", () => {
    it("should detect conflicts via manager", () => {
      manager.getRegistry().register({
        id: "a",
        keys: "mod+k",
        description: "A",
        category: "navigation",
        context: "global",
      });
      manager.getRegistry().register({
        id: "b",
        keys: "mod+k",
        description: "B",
        category: "navigation",
        context: "global",
      });
      const conflicts = manager.detectConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe("lifecycle", () => {
    it("should create via factory function", () => {
      const m = createShortcutManager();
      expect(m).toBeInstanceOf(ShortcutManager);
      m.destroy();
    });

    it("should destroy cleanly", () => {
      manager.loadPreset("nchat");
      manager.addContext("chat");
      manager.destroy();
      expect(manager.getRegistry().size).toBe(0);
      expect(manager.getCurrentPreset()).toBeNull();
    });
  });
});

// ============================================================================
// KEYMAP TESTS (20+ tests)
// ============================================================================

describe("Keymap", () => {
  let definitions: ShortcutDefinition[];

  beforeEach(() => {
    const registry = createShortcutRegistry();
    registry.registerMany([
      {
        id: "nav-search",
        keys: "mod+k",
        description: "Quick switcher",
        category: "navigation",
        context: "global",
      },
      {
        id: "nav-next",
        keys: "alt+arrowdown",
        description: "Next channel",
        category: "navigation",
        context: "sidebar",
      },
      {
        id: "msg-send",
        keys: "enter",
        description: "Send message",
        category: "messaging",
        context: "chat",
      },
      {
        id: "fmt-bold",
        keys: "mod+b",
        description: "Bold",
        category: "formatting",
        context: "editor",
      },
      {
        id: "med-emoji",
        keys: "mod+shift+e",
        description: "Emoji picker",
        category: "media",
        context: "global",
      },
      {
        id: "call-mute",
        keys: "mod+shift+m",
        description: "Toggle mute",
        category: "calls",
        context: "global",
      },
      {
        id: "adm-settings",
        keys: "mod+,",
        description: "Open settings",
        category: "admin",
        context: "global",
      },
      {
        id: "disabled-one",
        keys: "mod+x",
        description: "Disabled",
        category: "custom",
        context: "global",
        enabled: false,
      },
    ]);
    definitions = registry.getAll();
  });

  describe("buildKeymapEntries", () => {
    it("should build entries from definitions", () => {
      const entries = buildKeymapEntries(definitions, { platform: "windows" });
      expect(entries.length).toBe(8);
    });

    it("should format display keys", () => {
      const entries = buildKeymapEntries(definitions, { platform: "windows" });
      const search = entries.find((e) => e.id === "nav-search");
      expect(search?.displayKeys).toContain("Ctrl");
    });

    it("should mark customized entries", () => {
      const entries = buildKeymapEntries(
        definitions,
        {},
        new Set(["nav-search"]),
      );
      const search = entries.find((e) => e.id === "nav-search");
      expect(search?.isCustomized).toBe(true);
    });

    it("should not mark non-customized entries", () => {
      const entries = buildKeymapEntries(
        definitions,
        {},
        new Set(["nav-search"]),
      );
      const bold = entries.find((e) => e.id === "fmt-bold");
      expect(bold?.isCustomized).toBe(false);
    });
  });

  describe("getKeymap", () => {
    it("should return sections grouped by category", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      expect(sections.length).toBeGreaterThan(0);
      const navSection = sections.find((s) => s.category === "navigation");
      expect(navSection).toBeDefined();
      expect(navSection?.shortcuts.length).toBe(2);
    });

    it("should exclude empty categories", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      // All categories with at least 1 shortcut should be present
      for (const section of sections) {
        expect(section.shortcuts.length).toBeGreaterThan(0);
      }
    });

    it("should include titles and descriptions", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      for (const section of sections) {
        expect(section.title).toBeTruthy();
      }
    });
  });

  describe("searchShortcuts", () => {
    let entries: KeymapEntry[];

    beforeEach(() => {
      entries = buildKeymapEntries(definitions, { platform: "windows" });
    });

    it("should find by description", () => {
      const results = searchShortcuts(entries, "bold");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.id).toBe("fmt-bold");
    });

    it("should find by keys", () => {
      const results = searchShortcuts(entries, "mod+k");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find by category", () => {
      const results = searchShortcuts(entries, "navigation");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find by context", () => {
      const results = searchShortcuts(entries, "editor");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for no match", () => {
      const results = searchShortcuts(entries, "xyznonexistent");
      expect(results.length).toBe(0);
    });

    it("should sort by relevance score", () => {
      const results = searchShortcuts(entries, "mute");
      expect(results.length).toBeGreaterThan(0);
      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it("should return all entries for empty query", () => {
      const results = searchShortcuts(entries, "");
      expect(results.length).toBe(entries.length);
    });

    it("should include match field information", () => {
      const results = searchShortcuts(entries, "bold");
      expect(results[0].matchField).toBeDefined();
    });

    it("should be case insensitive", () => {
      const results = searchShortcuts(entries, "BOLD");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("exportKeymap", () => {
    it("should export as JSON", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      const json = exportKeymap(sections, "json");
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it("should export as Markdown", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      const md = exportKeymap(sections, "markdown");
      expect(md).toContain("# Keyboard Shortcuts");
      expect(md).toContain("## Navigation");
      expect(md).toContain("| Shortcut | Description | Context |");
    });

    it("should include shortcuts in JSON export", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      const json = exportKeymap(sections, "json");
      const parsed = JSON.parse(json);
      const navSection = parsed.find(
        (s: Record<string, string>) => s.category === "navigation",
      );
      expect(navSection.shortcuts.length).toBeGreaterThan(0);
    });

    it("should include display keys in markdown", () => {
      const sections = getKeymap(definitions, { platform: "windows" });
      const md = exportKeymap(sections, "markdown");
      expect(md).toContain("Ctrl");
    });
  });

  describe("utility functions", () => {
    it("should get category title", () => {
      expect(getCategoryTitle("navigation")).toBe("Navigation");
      expect(getCategoryTitle("messaging")).toBe("Messaging");
      expect(getCategoryTitle("formatting")).toBe("Formatting");
      expect(getCategoryTitle("media")).toBe("Media & Files");
      expect(getCategoryTitle("calls")).toBe("Calls & Voice");
      expect(getCategoryTitle("admin")).toBe("Administration & UI");
    });

    it("should get category description", () => {
      expect(getCategoryDescription("navigation")).toBeTruthy();
      expect(getCategoryDescription("messaging")).toBeTruthy();
    });

    it("should filter entries by context", () => {
      const entries = buildKeymapEntries(definitions, { platform: "windows" });
      const chatEntries = filterEntriesByContext(entries, "chat");
      // Should include chat context + global context
      expect(chatEntries.length).toBeGreaterThan(0);
      for (const entry of chatEntries) {
        expect(["chat", "global"]).toContain(entry.context);
      }
    });

    it("should filter enabled entries", () => {
      const entries = buildKeymapEntries(definitions, { platform: "windows" });
      const enabled = filterEnabledEntries(entries);
      expect(enabled.length).toBe(7); // 8 total - 1 disabled
      for (const entry of enabled) {
        expect(entry.enabled).toBe(true);
      }
    });

    it("should get keymap summary", () => {
      const entries = buildKeymapEntries(definitions, { platform: "windows" });
      const summary = getKeymapSummary(entries);
      expect(summary.navigation).toBe(2);
      expect(summary.messaging).toBe(1);
      expect(summary.formatting).toBe(1);
    });

    it("should have CATEGORY_ORDER", () => {
      expect(CATEGORY_ORDER.length).toBe(7);
      expect(CATEGORY_ORDER).toContain("navigation");
      expect(CATEGORY_ORDER).toContain("messaging");
      expect(CATEGORY_ORDER).toContain("formatting");
      expect(CATEGORY_ORDER).toContain("media");
      expect(CATEGORY_ORDER).toContain("calls");
      expect(CATEGORY_ORDER).toContain("admin");
      expect(CATEGORY_ORDER).toContain("custom");
    });
  });
});

// ============================================================================
// CONFLICT RESOLUTION TESTS (15+ tests)
// ============================================================================

describe("Conflict Resolution", () => {
  let registry: ShortcutRegistry;

  beforeEach(() => {
    registry = createShortcutRegistry();
  });

  it("should find no conflicts with unique keys", () => {
    registry.register({
      id: "a",
      keys: "mod+a",
      description: "A",
      category: "navigation",
      context: "global",
    });
    registry.register({
      id: "b",
      keys: "mod+b",
      description: "B",
      category: "navigation",
      context: "global",
    });
    const conflicts = registry.detectConflicts();
    expect(conflicts.length).toBe(0);
  });

  it("should find conflict with same keys in same context", () => {
    registry.register({
      id: "a",
      keys: "mod+k",
      description: "A",
      category: "navigation",
      context: "global",
    });
    registry.register({
      id: "b",
      keys: "mod+k",
      description: "B",
      category: "messaging",
      context: "global",
    });
    const conflicts = registry.detectConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("should allow same keys in different contexts", () => {
    registry.register({
      id: "chat-enter",
      keys: "enter",
      description: "Send",
      category: "messaging",
      context: "chat",
    });
    registry.register({
      id: "modal-enter",
      keys: "enter",
      description: "Confirm",
      category: "navigation",
      context: "modal",
    });
    const conflicts = registry.detectConflicts();
    const directConflict = conflicts.find(
      (c) =>
        c.shortcutIds.includes("chat-enter") &&
        c.shortcutIds.includes("modal-enter"),
    );
    expect(directConflict).toBeUndefined();
  });

  it("should resolve conflict by priority", () => {
    registry.register({
      id: "low",
      keys: "mod+k",
      description: "Low",
      category: "navigation",
      context: "global",
      priority: 1,
    });
    registry.register({
      id: "high",
      keys: "mod+k",
      description: "High",
      category: "navigation",
      context: "global",
      priority: 10,
    });
    const resolved = registry.resolveConflict("mod+k", "global");
    expect(resolved?.id).toBe("high");
  });

  it("should resolve context-specific over global", () => {
    registry.register({
      id: "global-k",
      keys: "mod+k",
      description: "Global K",
      category: "navigation",
      context: "global",
      priority: 100,
    });
    registry.register({
      id: "chat-k",
      keys: "mod+k",
      description: "Chat K",
      category: "messaging",
      context: "chat",
      priority: 0,
    });
    // In chat context, chat-specific should win despite lower priority
    const resolved = registry.resolveConflict("mod+k", "chat");
    expect(resolved?.id).toBe("chat-k");
  });

  it("should handle normalized key comparison", () => {
    registry.register({
      id: "a",
      keys: "mod+k",
      description: "A",
      category: "navigation",
      context: "global",
    });
    registry.register({
      id: "b",
      keys: "Mod+K",
      description: "B",
      category: "navigation",
      context: "global",
    });
    const conflicts = registry.detectConflicts();
    // These should conflict because they normalize to the same thing
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("should not conflict disabled shortcuts", () => {
    registry.register({
      id: "a",
      keys: "mod+k",
      description: "A",
      category: "navigation",
      context: "global",
      enabled: false,
    });
    registry.register({
      id: "b",
      keys: "mod+k",
      description: "B",
      category: "navigation",
      context: "global",
    });
    const conflicts = registry.detectConflicts();
    expect(conflicts.length).toBe(0);
  });

  it("should cross-preset conflict detection through manager", () => {
    const manager = createShortcutManager({ platform: "windows" });
    manager.loadPreset("nchat");
    const conflicts = manager.detectConflicts();
    // nChat preset may have intentional overlaps (e.g., same key in different contexts)
    expect(Array.isArray(conflicts)).toBe(true);
    manager.destroy();
  });

  it("should detect 3-way conflict", () => {
    registry.register({
      id: "a",
      keys: "mod+k",
      description: "A",
      category: "navigation",
      context: "global",
    });
    registry.register({
      id: "b",
      keys: "mod+k",
      description: "B",
      category: "messaging",
      context: "global",
    });
    registry.register({
      id: "c",
      keys: "mod+k",
      description: "C",
      category: "formatting",
      context: "global",
    });
    const conflicts = registry.detectConflicts();
    const conflict = conflicts.find(
      (c) => c.context === "global" && c.normalizedKeys === "mod+k",
    );
    expect(conflict).toBeDefined();
    expect(conflict!.shortcutIds.length).toBe(3);
  });

  it("should handle user override conflicts", () => {
    const manager = createShortcutManager({ platform: "windows" });
    manager.loadPreset("nchat");
    // Override search to same key as quick-switcher
    manager.overrideKey("nchat:search", "mod+k");
    const conflicts = manager.detectConflicts();
    // Should now have a conflict
    const conflict = conflicts.find(
      (c) =>
        c.shortcutIds.includes("nchat:search") &&
        c.shortcutIds.includes("nchat:quick-switcher"),
    );
    expect(conflict).toBeDefined();
    manager.destroy();
  });

  it("should report winner in conflict descriptor", () => {
    registry.register({
      id: "a",
      keys: "mod+k",
      description: "A",
      category: "navigation",
      context: "global",
      priority: 5,
    });
    registry.register({
      id: "b",
      keys: "mod+k",
      description: "B",
      category: "messaging",
      context: "global",
      priority: 15,
    });
    const conflicts = registry.detectConflicts();
    const conflict = conflicts[0];
    expect(conflict.winnerId).toBe("b");
  });

  it("should find no conflict for non-existent key", () => {
    expect(registry.hasConflict("mod+z", "global")).toBe(false);
  });

  it("should find conflict in specific context", () => {
    registry.register({
      id: "a",
      keys: "enter",
      description: "A",
      category: "messaging",
      context: "chat",
    });
    expect(registry.hasConflict("enter", "chat")).toBe(true);
    expect(registry.hasConflict("enter", "editor")).toBe(false);
  });

  it("should resolve null for empty registry", () => {
    const result = registry.resolveConflict("mod+k", "global");
    expect(result).toBeNull();
  });

  it("should properly handle global conflict with hasConflict", () => {
    registry.register({
      id: "g",
      keys: "mod+k",
      description: "G",
      category: "navigation",
      context: "global",
    });
    // Global shortcuts are visible in all contexts
    expect(registry.hasConflict("mod+k", "global")).toBe(true);
    expect(registry.hasConflict("mod+k", "chat")).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration", () => {
  it("should load preset, override, detect conflicts, and handle events", () => {
    const manager = createShortcutManager({ platform: "windows" });

    // Load preset
    manager.loadPreset("nchat");
    expect(manager.getRegistry().size).toBeGreaterThan(0);

    // Override a key
    manager.overrideKey("nchat:search", "mod+g");
    expect(manager.getRegistry().get("nchat:search")?.keys).toBe("mod+g");

    // Set action
    const actionFn = jest.fn();
    manager.getRegistry().setAction("nchat:search", actionFn);

    // Handle event with new key
    const event = createKeyboardEvent({ key: "g", ctrlKey: true });
    const result = manager.handleKeyEvent(event);
    expect(result.handled).toBe(true);
    expect(actionFn).toHaveBeenCalled();

    // Build keymap
    const entries = buildKeymapEntries(
      manager.getRegistry().getAll(),
      { platform: "windows" },
      new Set(["nchat:search"]),
    );
    const searchEntry = entries.find((e) => e.id === "nchat:search");
    expect(searchEntry?.isCustomized).toBe(true);

    // Search keymap
    const results = searchShortcuts(entries, "search");
    expect(results.length).toBeGreaterThan(0);

    // Export
    const sections = getKeymap(manager.getRegistry().getAll(), {
      platform: "windows",
    });
    const md = exportKeymap(sections, "markdown");
    expect(md).toContain("Keyboard Shortcuts");

    manager.destroy();
  });

  it("should switch presets and maintain overrides", () => {
    const manager = createShortcutManager({ platform: "windows" });

    manager.loadPreset("nchat");
    const nchatSize = manager.getRegistry().size;

    manager.loadPreset("slack");
    const slackSize = manager.getRegistry().size;

    // Both should have loaded successfully
    expect(nchatSize).toBeGreaterThan(0);
    expect(slackSize).toBeGreaterThan(0);

    // Overrides persist across preset loads
    const overrides = createEmptyOverrides();
    overrides.keyOverrides["slack:quick-switcher"] = "mod+p";
    manager.setUserOverrides(overrides);
    expect(manager.getRegistry().get("slack:quick-switcher")?.keys).toBe(
      "mod+p",
    );

    manager.destroy();
  });

  it("should handle all presets loading without errors", () => {
    const manager = createShortcutManager({ platform: "windows" });
    const names = getPresetNames();

    for (const name of names) {
      expect(manager.loadPreset(name)).toBe(true);
      expect(manager.getRegistry().size).toBeGreaterThan(0);
    }

    manager.destroy();
  });
});
