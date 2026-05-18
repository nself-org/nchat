/**
 * @fileoverview Tests for the translation engine
 *
 * Tests the core translation functionality including interpolation,
 * pluralization, namespace handling, and fallback behavior.
 */

import {
  translate,
  t,
  setCurrentLocale,
  getCurrentLocale,
  registerTranslations,
  isNamespaceLoaded,
  getLoadedNamespaces,
  hasTranslation,
  getTranslationKeys,
  onMissingTranslation,
  clearTranslations,
  getRawTranslations,
  createNamespacedTranslator,
  plural,
} from "../translator";

describe("translator", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");
  });

  describe("setCurrentLocale", () => {
    it("should set the current locale", () => {
      setCurrentLocale("es");
      expect(getCurrentLocale()).toBe("es");
    });

    it("should accept valid locale codes", () => {
      setCurrentLocale("fr");
      expect(getCurrentLocale()).toBe("fr");

      setCurrentLocale("de");
      expect(getCurrentLocale()).toBe("de");
    });

    it("should handle Arabic locale", () => {
      setCurrentLocale("ar");
      expect(getCurrentLocale()).toBe("ar");
    });

    it("should handle Chinese locale", () => {
      setCurrentLocale("zh");
      expect(getCurrentLocale()).toBe("zh");
    });

    it("should handle Japanese locale", () => {
      setCurrentLocale("ja");
      expect(getCurrentLocale()).toBe("ja");
    });

    it("should handle Portuguese locale", () => {
      setCurrentLocale("pt");
      expect(getCurrentLocale()).toBe("pt");
    });

    it("should handle Russian locale", () => {
      setCurrentLocale("ru");
      expect(getCurrentLocale()).toBe("ru");
    });
  });

  describe("getCurrentLocale", () => {
    it("should return current locale", () => {
      setCurrentLocale("en");
      expect(getCurrentLocale()).toBe("en");
    });

    it("should return updated locale after change", () => {
      setCurrentLocale("es");
      expect(getCurrentLocale()).toBe("es");

      setCurrentLocale("fr");
      expect(getCurrentLocale()).toBe("fr");
    });
  });

  describe("registerTranslations", () => {
    it("should register translations for a locale", () => {
      registerTranslations("en", "common", {
        hello: "Hello",
        goodbye: "Goodbye",
      });

      expect(isNamespaceLoaded("en", "common")).toBe(true);
    });

    it("should register nested translations", () => {
      registerTranslations("en", "common", {
        buttons: {
          save: "Save",
          cancel: "Cancel",
        },
      });

      const result = translate("buttons.save");
      expect(result).toBe("Save");
    });

    it("should merge translations for same namespace", () => {
      registerTranslations("en", "common", { hello: "Hello" });
      registerTranslations("en", "common", { goodbye: "Goodbye" });

      expect(translate("hello")).toBe("Hello");
      expect(translate("goodbye")).toBe("Goodbye");
    });

    it("should register translations for multiple locales", () => {
      registerTranslations("en", "common", { hello: "Hello" });
      registerTranslations("es", "common", { hello: "Hola" });

      setCurrentLocale("en");
      expect(translate("hello")).toBe("Hello");

      setCurrentLocale("es");
      expect(translate("hello")).toBe("Hola");
    });

    it("should register multiple namespaces", () => {
      registerTranslations("en", "common", { hello: "Hello" });
      registerTranslations("en", "chat", { send: "Send" });

      expect(translate("hello")).toBe("Hello");
      expect(translate("chat:send")).toBe("Send");
    });
  });

  describe("isNamespaceLoaded", () => {
    it("should return true for loaded namespace", () => {
      registerTranslations("en", "common", { test: "Test" });
      expect(isNamespaceLoaded("en", "common")).toBe(true);
    });

    it("should return false for unloaded namespace", () => {
      expect(isNamespaceLoaded("en", "unloaded")).toBe(false);
    });

    it("should return false for different locale", () => {
      registerTranslations("en", "common", { test: "Test" });
      expect(isNamespaceLoaded("es", "common")).toBe(false);
    });
  });

  describe("getLoadedNamespaces", () => {
    it("should return empty array for no loaded namespaces", () => {
      expect(getLoadedNamespaces("fr")).toEqual([]);
    });

    it("should return loaded namespaces for locale", () => {
      registerTranslations("en", "common", { test: "Test" });
      registerTranslations("en", "chat", { send: "Send" });

      const namespaces = getLoadedNamespaces("en");
      expect(namespaces).toContain("common");
      expect(namespaces).toContain("chat");
    });
  });

  describe("translate / t", () => {
    beforeEach(() => {
      registerTranslations("en", "common", {
        hello: "Hello",
        greeting: "Hello, {{name}}!",
        nested: {
          deep: {
            value: "Deep Value",
          },
        },
        messages: {
          count_one: "{{count}} message",
          count_other: "{{count}} messages",
        },
        context_male: "He",
        context_female: "She",
      });
    });

    it("should translate simple key", () => {
      expect(translate("hello")).toBe("Hello");
    });

    it("should translate using t alias", () => {
      expect(t("hello")).toBe("Hello");
    });

    it("should translate nested key", () => {
      expect(translate("nested.deep.value")).toBe("Deep Value");
    });

    it("should interpolate values", () => {
      expect(translate("greeting", { values: { name: "World" } })).toBe(
        "Hello, World!",
      );
    });

    it("should interpolate numeric values", () => {
      registerTranslations("en", "common", {
        count: "Count: {{count}}",
      });
      expect(translate("count", { values: { count: 42 } })).toBe("Count: 42");
    });

    it("should handle boolean interpolation", () => {
      registerTranslations("en", "common", {
        status: "Active: {{active}}",
      });
      expect(translate("status", { values: { active: true } })).toBe(
        "Active: true",
      );
    });

    it("should return key for missing translation", () => {
      expect(translate("missing.key")).toBe("missing.key");
    });

    it("should return default value for missing translation", () => {
      expect(translate("missing", { defaultValue: "Default" })).toBe("Default");
    });

    it("should handle pluralization with count=1", () => {
      expect(translate("messages.count", { count: 1 })).toBe("1 message");
    });

    it("should handle pluralization with count>1", () => {
      expect(translate("messages.count", { count: 5 })).toBe("5 messages");
    });

    it("should handle pluralization with count=0", () => {
      expect(translate("messages.count", { count: 0 })).toBe("0 messages");
    });

    it("should handle context translations", () => {
      expect(translate("context", { context: "male" })).toBe("He");
      expect(translate("context", { context: "female" })).toBe("She");
    });

    it("should translate with explicit namespace", () => {
      registerTranslations("en", "chat", { send: "Send Message" });
      expect(translate("chat:send")).toBe("Send Message");
    });

    it("should use ns option", () => {
      registerTranslations("en", "chat", { send: "Send" });
      expect(translate("send", { ns: "chat" })).toBe("Send");
    });

    it("should use locale override", () => {
      registerTranslations("es", "common", { hello: "Hola" });
      expect(translate("hello", { locale: "es" })).toBe("Hola");
    });
  });

  describe("fallback behavior", () => {
    beforeEach(() => {
      registerTranslations("en", "common", {
        fallback: "English Fallback",
        shared: "Shared English",
      });
      registerTranslations("es", "common", {
        shared: "Shared Spanish",
      });
    });

    it("should fallback to English for missing translation", () => {
      setCurrentLocale("es");
      expect(translate("fallback")).toBe("English Fallback");
    });

    it("should use current locale translation if available", () => {
      setCurrentLocale("es");
      expect(translate("shared")).toBe("Shared Spanish");
    });
  });

  describe("hasTranslation", () => {
    beforeEach(() => {
      registerTranslations("en", "common", {
        exists: "I exist",
        nested: { value: "Nested" },
      });
    });

    it("should return true for existing key", () => {
      expect(hasTranslation("exists")).toBe(true);
    });

    it("should return true for nested key", () => {
      expect(hasTranslation("nested.value")).toBe(true);
    });

    it("should return false for missing key", () => {
      expect(hasTranslation("missing")).toBe(false);
    });

    it("should check specific locale", () => {
      expect(hasTranslation("exists", "en")).toBe(true);
      expect(hasTranslation("exists", "fr")).toBe(false);
    });
  });

  describe("getTranslationKeys", () => {
    beforeEach(() => {
      registerTranslations("en", "common", {
        simple: "Simple",
        nested: {
          one: "One",
          two: "Two",
          deep: {
            value: "Deep",
          },
        },
      });
    });

    it("should return all keys for namespace", () => {
      const keys = getTranslationKeys("common");
      expect(keys).toContain("simple");
      expect(keys).toContain("nested.one");
      expect(keys).toContain("nested.two");
      expect(keys).toContain("nested.deep.value");
    });

    it("should return empty array for unloaded namespace", () => {
      expect(getTranslationKeys("unloaded")).toEqual([]);
    });

    it("should check specific locale", () => {
      registerTranslations("es", "common", { spanish: "Spanish" });
      const esKeys = getTranslationKeys("common", "es");
      expect(esKeys).toContain("spanish");
    });
  });

  describe("onMissingTranslation", () => {
    it("should call handler for missing translation", () => {
      const handler = jest.fn();
      const unsubscribe = onMissingTranslation(handler);

      translate("definitely.missing.key");

      expect(handler).toHaveBeenCalledWith("definitely.missing.key", "en");

      unsubscribe();
    });

    it("should allow unsubscribing", () => {
      const handler = jest.fn();
      const unsubscribe = onMissingTranslation(handler);

      unsubscribe();
      translate("missing");

      expect(handler).not.toHaveBeenCalled();
    });

    it("should support multiple handlers", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsub1 = onMissingTranslation(handler1);
      const unsub2 = onMissingTranslation(handler2);

      translate("missing");

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });
  });

  describe("clearTranslations", () => {
    it("should clear all translations", () => {
      registerTranslations("en", "common", { test: "Test" });
      expect(isNamespaceLoaded("en", "common")).toBe(true);

      clearTranslations();
      expect(isNamespaceLoaded("en", "common")).toBe(false);
    });

    it("should clear translations for all locales", () => {
      registerTranslations("en", "common", { en: "English" });
      registerTranslations("es", "common", { es: "Spanish" });

      clearTranslations();

      expect(isNamespaceLoaded("en", "common")).toBe(false);
      expect(isNamespaceLoaded("es", "common")).toBe(false);
    });
  });

  describe("getRawTranslations", () => {
    it("should return raw translation object", () => {
      registerTranslations("en", "common", {
        hello: "Hello",
        nested: { value: "Value" },
      });

      const raw = getRawTranslations("en", "common");
      expect(raw).toEqual({
        hello: "Hello",
        nested: { value: "Value" },
      });
    });

    it("should return undefined for missing namespace", () => {
      expect(getRawTranslations("en", "missing")).toBeUndefined();
    });

    it("should return undefined for missing locale", () => {
      expect(getRawTranslations("missing", "common")).toBeUndefined();
    });
  });

  describe("createNamespacedTranslator", () => {
    beforeEach(() => {
      registerTranslations("en", "chat", {
        send: "Send",
        typing: "{{name}} is typing...",
      });
    });

    it("should create translator for namespace", () => {
      const chatT = createNamespacedTranslator("chat");
      expect(chatT("send")).toBe("Send");
    });

    it("should support interpolation", () => {
      const chatT = createNamespacedTranslator("chat");
      expect(chatT("typing", { values: { name: "Alice" } })).toBe(
        "Alice is typing...",
      );
    });

    it("should support other options", () => {
      const chatT = createNamespacedTranslator("chat");
      expect(chatT("missing", { defaultValue: "Default" })).toBe("Default");
    });
  });

  describe("plural", () => {
    it("should return one form for count 1", () => {
      const result = plural(1, { one: "1 item", other: "{{count}} items" });
      expect(result).toBe("1 item");
    });

    it("should return other form for count > 1", () => {
      const result = plural(5, { one: "1 item", other: "{{count}} items" });
      expect(result).toBe("5 items");
    });

    it("should return zero form if provided for Arabic locale", () => {
      // Arabic has a zero plural form
      const result = plural(
        0,
        {
          zero: "No items",
          one: "1 item",
          other: "{{count}} items",
        },
        "ar",
      );
      expect(result).toBe("No items");
    });

    it("should fallback to other for zero without zero form", () => {
      const result = plural(0, { one: "1 item", other: "{{count}} items" });
      expect(result).toBe("0 items");
    });

    it("should use locale-specific rules for Arabic", () => {
      const result = plural(
        2,
        {
          one: "One",
          two: "Two",
          few: "Few",
          many: "Many",
          other: "Other",
        },
        "ar",
      );
      expect(result).toBe("Two");
    });

    it("should use locale-specific rules for Russian", () => {
      // Russian uses different rules for numbers ending in 1, 2-4, etc.
      const result1 = plural(
        1,
        {
          one: "One",
          few: "Few",
          many: "Many",
          other: "Other",
        },
        "ru",
      );
      expect(result1).toBe("One");

      const result2 = plural(
        2,
        {
          one: "One",
          few: "Few",
          many: "Many",
          other: "Other",
        },
        "ru",
      );
      expect(result2).toBe("Few");

      const result5 = plural(
        5,
        {
          one: "One",
          few: "Few",
          many: "Many",
          other: "Other",
        },
        "ru",
      );
      expect(result5).toBe("Many");
    });
  });

  describe("HTML escaping", () => {
    beforeEach(() => {
      registerTranslations("en", "common", {
        escaped: "Hello {{name}}",
      });
    });

    it("should escape HTML entities", () => {
      const result = translate("escaped", {
        values: { name: '<script>alert("xss")</script>' },
      });
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).not.toContain("<script>");
    });

    it("should escape ampersands", () => {
      const result = translate("escaped", { values: { name: "Tom & Jerry" } });
      expect(result).toContain("&amp;");
    });

    it("should escape quotes", () => {
      const result = translate("escaped", { values: { name: '"quoted"' } });
      expect(result).toContain("&quot;");
    });
  });

  describe("edge cases", () => {
    it("should handle empty translation values by returning key", () => {
      registerTranslations("en", "common", { empty: "" });
      // Empty string is falsy, so the key is returned
      expect(translate("empty")).toBe("empty");
    });

    it("should handle deeply nested keys with dots", () => {
      registerTranslations("en", "common", {
        special: { key: { with: { dots: "Value" } } },
      });
      // Dots are key separators, so this navigates the nested structure
      expect(translate("special.key.with.dots")).toBe("Value");
    });

    it("should handle whitespace in values", () => {
      registerTranslations("en", "common", {
        whitespace: "  spaced  ",
      });
      expect(translate("whitespace")).toBe("  spaced  ");
    });

    it("should handle unicode in translations", () => {
      registerTranslations("en", "common", {
        unicode: "Hello World",
      });
      expect(translate("unicode")).toBe("Hello World");
    });

    it("should handle interpolation placeholder not in values", () => {
      registerTranslations("en", "common", {
        missing: "Hello {{name}}",
      });
      expect(translate("missing", { values: {} })).toBe("Hello {{name}}");
    });
  });
});
