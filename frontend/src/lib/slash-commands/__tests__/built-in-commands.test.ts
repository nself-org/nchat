/**
 * Built-in slash commands — data integrity + lookup map tests.
 */

import {
  builtInCommands,
  builtInCommandsMap,
  builtInTriggerMap,
  commandCategories,
} from "../built-in-commands";

describe("built-in-commands", () => {
  describe("builtInCommands array", () => {
    it("contains at least 20 built-in commands", () => {
      expect(builtInCommands.length).toBeGreaterThanOrEqual(20);
    });

    it("every command has required fields", () => {
      for (const c of builtInCommands) {
        expect(typeof c.id).toBe("string");
        expect(c.id.length).toBeGreaterThan(0);
        expect(typeof c.trigger).toBe("string");
        expect(c.trigger.length).toBeGreaterThan(0);
        expect(typeof c.name).toBe("string");
        expect(typeof c.description).toBe("string");
        expect(typeof c.category).toBe("string");
      }
    });

    it("every command has isBuiltIn=true and a non-empty actionType", () => {
      for (const c of builtInCommands) {
        expect(c.isBuiltIn).toBe(true);
        expect(typeof c.actionType).toBe("string");
        expect(c.actionType.length).toBeGreaterThan(0);
      }
    });

    it("every command has an action object with a string type", () => {
      for (const c of builtInCommands) {
        expect(c.action).toBeDefined();
        expect(typeof (c.action as any).type).toBe("string");
      }
    });

    it("every command is enabled by default", () => {
      for (const c of builtInCommands) {
        expect(c.isEnabled).toBe(true);
      }
    });

    it("command ids are unique", () => {
      const ids = builtInCommands.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("command triggers are unique", () => {
      const triggers = builtInCommands.map((c) => c.trigger);
      expect(new Set(triggers).size).toBe(triggers.length);
    });

    it("every command has a permissions block", () => {
      for (const c of builtInCommands) {
        expect(c.permissions).toBeDefined();
        expect(typeof c.permissions?.minRole).toBe("string");
      }
    });

    it("every command has responseConfig with type", () => {
      for (const c of builtInCommands) {
        expect(c.responseConfig).toBeDefined();
        expect(typeof c.responseConfig.type).toBe("string");
      }
    });

    it("every command has channels allowedTypes", () => {
      for (const c of builtInCommands) {
        expect(Array.isArray(c.channels.allowedTypes)).toBe(true);
        expect(c.channels.allowedTypes.length).toBeGreaterThan(0);
      }
    });

    it("every declared argument has id, name, and type", () => {
      for (const c of builtInCommands) {
        for (const arg of c.arguments || []) {
          expect(typeof arg.id).toBe("string");
          expect(typeof arg.name).toBe("string");
          expect(typeof arg.type).toBe("string");
        }
      }
    });

    it("each command uses a known category", () => {
      const known = new Set(Object.keys(commandCategories));
      for (const c of builtInCommands) {
        expect(known.has(c.category)).toBe(true);
      }
    });

    it("createdAt and updatedAt are ISO strings", () => {
      for (const c of builtInCommands) {
        expect(() => new Date(c.createdAt!).toISOString()).not.toThrow();
        expect(() => new Date(c.updatedAt!).toISOString()).not.toThrow();
      }
    });

    it('createdBy is "system"', () => {
      for (const c of builtInCommands) {
        expect(c.createdBy).toBe("system");
      }
    });
  });

  describe("builtInCommandsMap (id -> command)", () => {
    it("has one entry per command", () => {
      expect(builtInCommandsMap.size).toBe(builtInCommands.length);
    });

    it("looks up commands by id", () => {
      for (const c of builtInCommands) {
        expect(builtInCommandsMap.get(c.id)).toBe(c);
      }
    });

    it("returns undefined for unknown id", () => {
      expect(builtInCommandsMap.get("nope-id")).toBeUndefined();
    });
  });

  describe("builtInTriggerMap (trigger + aliases -> command)", () => {
    it("has at least one entry per command", () => {
      expect(builtInTriggerMap.size).toBeGreaterThanOrEqual(
        builtInCommands.length,
      );
    });

    it("looks up commands by trigger", () => {
      for (const c of builtInCommands) {
        expect(builtInTriggerMap.get(c.trigger)).toBe(c);
      }
    });

    it("looks up commands by alias", () => {
      for (const c of builtInCommands) {
        for (const alias of c.aliases || []) {
          expect(builtInTriggerMap.get(alias)).toBe(c);
        }
      }
    });

    it("returns undefined for unknown trigger", () => {
      expect(builtInTriggerMap.get("not-a-real-trigger-xyz")).toBeUndefined();
    });
  });

  describe("commandCategories", () => {
    it("defines at least 9 canonical categories", () => {
      expect(Object.keys(commandCategories).length).toBeGreaterThanOrEqual(9);
    });

    it("each category has name, description, and icon", () => {
      for (const [key, cat] of Object.entries(commandCategories)) {
        expect(typeof key).toBe("string");
        expect(typeof cat.name).toBe("string");
        expect(typeof cat.description).toBe("string");
        expect(typeof cat.icon).toBe("string");
      }
    });

    it("includes the core categories", () => {
      expect(commandCategories).toHaveProperty("general");
      expect(commandCategories).toHaveProperty("channel");
      expect(commandCategories).toHaveProperty("moderation");
      expect(commandCategories).toHaveProperty("integration");
    });
  });

  describe("specific sentinel commands", () => {
    it("/help exists with aliases ? and commands", () => {
      const help = builtInTriggerMap.get("help");
      expect(help).toBeDefined();
      expect(builtInTriggerMap.get("?")).toBe(help);
      expect(builtInTriggerMap.get("commands")).toBe(help);
    });

    it("arguments with autocomplete.source=static carry sensible defaults", () => {
      const help = builtInTriggerMap.get("help");
      const arg = help?.arguments?.[0];
      if (arg?.autocomplete && arg.autocomplete.source === "static") {
        expect(arg.required).toBe(false);
        expect(arg.position).toBe(0);
      }
    });
  });
});
