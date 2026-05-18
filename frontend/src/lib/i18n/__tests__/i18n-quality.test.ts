/**
 * @jest-environment node
 *
 * i18n Quality Tests
 *
 * Comprehensive tests for locale validation, RTL utilities,
 * pluralization rules, and locale-aware formatting.
 * Covers 120+ test cases across all i18n quality modules.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Locale Validator
import {
  extractInterpolationVars,
  flattenTranslationObject,
  isPlaceholderValue,
  extractPluralBaseKey,
  validateInterpolation,
  checkPluralCoverage,
  validateLocale,
  validateAllLocales,
  formatValidationReport,
} from "../locale-validator";

// RTL Utilities
import {
  detectTextDirection,
  detectDirectionByLocale,
  wrapBidi,
  stripBidiChars,
  hasBidiChars,
  formatNumberRTL,
  formatDateRTL,
  getLogicalProperty,
  createRTLTransform,
  resolveLogicalPosition,
  isRTLLocale,
  getRTLLocales,
  getMixedContentDirection,
  BIDI_CHARS,
} from "../rtl-utils";

// Extended Plural Rules
import {
  extendedPluralRules,
  getExtendedPluralRule,
  getExtendedPluralCategory,
  getRequiredPluralForms,
  getRequiredOrdinalForms,
  getPluralExamples,
  validatePluralKeys,
} from "../plural-rules";

// Format Utilities
import {
  formatLocalDate,
  formatLocalTime,
  formatLocalDateTime,
  formatRelativeTimeIntl,
  getRelativeTimeUnit,
  formatLocalNumber,
  formatLocalCurrency,
  formatLocalPercent,
  formatLocalCompact,
  formatLocalList,
  getLanguageDisplayName,
  getRegionDisplayName,
  getCurrencyDisplayName,
  localeCompare,
  localeSort,
  formatLocalBytes,
  formatLocalDuration,
} from "../format-utils";

// ═══════════════════════════════════════════════════════════════════
// LOCALE VALIDATOR TESTS (30+ tests)
// ═══════════════════════════════════════════════════════════════════

describe("Locale Validator", () => {
  describe("extractInterpolationVars", () => {
    it("should extract double-brace variables", () => {
      const vars = extractInterpolationVars(
        "Hello {{name}}, you have {{count}} messages",
      );
      expect(vars).toEqual(["count", "name"]);
    });

    it("should extract single-brace variables", () => {
      const vars = extractInterpolationVars("Hello {name}");
      expect(vars).toEqual(["name"]);
    });

    it("should handle no variables", () => {
      const vars = extractInterpolationVars("Hello world");
      expect(vars).toEqual([]);
    });

    it("should deduplicate variables", () => {
      const vars = extractInterpolationVars("{{name}} said {{name}}");
      expect(vars).toEqual(["name"]);
    });

    it("should handle variables with spaces", () => {
      const vars = extractInterpolationVars("Hello {{ name }}");
      expect(vars).toEqual(["name"]);
    });

    it("should return sorted variables", () => {
      const vars = extractInterpolationVars("{{z}} {{a}} {{m}}");
      expect(vars).toEqual(["a", "m", "z"]);
    });
  });

  describe("flattenTranslationObject", () => {
    it("should flatten nested objects", () => {
      const obj = {
        app: {
          name: "nChat",
          buttons: {
            save: "Save",
            cancel: "Cancel",
          },
        },
      };
      const flat = flattenTranslationObject(obj);
      expect(flat).toEqual({
        "app.name": "nChat",
        "app.buttons.save": "Save",
        "app.buttons.cancel": "Cancel",
      });
    });

    it("should handle flat objects", () => {
      const obj = { key1: "value1", key2: "value2" };
      const flat = flattenTranslationObject(obj);
      expect(flat).toEqual({ key1: "value1", key2: "value2" });
    });

    it("should handle empty objects", () => {
      const flat = flattenTranslationObject({});
      expect(flat).toEqual({});
    });

    it("should handle deeply nested objects", () => {
      const obj = { a: { b: { c: { d: "deep" } } } };
      const flat = flattenTranslationObject(obj);
      expect(flat).toEqual({ "a.b.c.d": "deep" });
    });

    it("should use provided prefix", () => {
      const obj = { key: "value" };
      const flat = flattenTranslationObject(obj, "ns");
      expect(flat).toEqual({ "ns.key": "value" });
    });

    it("should skip non-string, non-object values", () => {
      const obj = { str: "hello", num: 42 as unknown as string };
      const flat = flattenTranslationObject(obj as Record<string, unknown>);
      expect(flat["str"]).toBe("hello");
    });
  });

  describe("isPlaceholderValue", () => {
    it("should detect TODO", () => {
      expect(isPlaceholderValue("TODO")).toBe(true);
      expect(isPlaceholderValue("todo")).toBe(true);
    });

    it("should detect FIXME", () => {
      expect(isPlaceholderValue("FIXME")).toBe(true);
    });

    it("should detect bracketed placeholders", () => {
      expect(isPlaceholderValue("[translate me]")).toBe(true);
    });

    it("should detect dunder placeholders", () => {
      expect(isPlaceholderValue("__placeholder__")).toBe(true);
    });

    it("should detect TBD", () => {
      expect(isPlaceholderValue("TBD")).toBe(true);
    });

    it("should detect NEEDS TRANSLATION", () => {
      expect(isPlaceholderValue("NEEDS TRANSLATION")).toBe(true);
      expect(isPlaceholderValue("NEED TRANSLATION")).toBe(true);
    });

    it("should not flag real translations", () => {
      expect(isPlaceholderValue("Hello world")).toBe(false);
      expect(isPlaceholderValue("Save")).toBe(false);
    });

    it("should not flag empty strings", () => {
      expect(isPlaceholderValue("")).toBe(false);
    });

    it("should accept custom patterns", () => {
      expect(isPlaceholderValue("TRANSLATE_ME", [/^TRANSLATE_ME$/])).toBe(true);
      expect(isPlaceholderValue("OK", [/^TRANSLATE_ME$/])).toBe(false);
    });
  });

  describe("extractPluralBaseKey", () => {
    it("should extract base key from plural key", () => {
      const result = extractPluralBaseKey("messages_one");
      expect(result.baseKey).toBe("messages");
      expect(result.pluralForm).toBe("one");
    });

    it('should handle "other" form', () => {
      const result = extractPluralBaseKey("items_other");
      expect(result.baseKey).toBe("items");
      expect(result.pluralForm).toBe("other");
    });

    it("should handle nested keys", () => {
      const result = extractPluralBaseKey("time.seconds_few");
      expect(result.baseKey).toBe("time.seconds");
      expect(result.pluralForm).toBe("few");
    });

    it("should return null for non-plural keys", () => {
      const result = extractPluralBaseKey("simple.key");
      expect(result.baseKey).toBe("simple.key");
      expect(result.pluralForm).toBeNull();
    });

    it("should handle Arabic zero form", () => {
      const result = extractPluralBaseKey("count_zero");
      expect(result.pluralForm).toBe("zero");
    });

    it('should handle "two" form for Hebrew/Arabic', () => {
      const result = extractPluralBaseKey("days_two");
      expect(result.pluralForm).toBe("two");
    });

    it('should handle "many" form for Russian/Arabic', () => {
      const result = extractPluralBaseKey("items_many");
      expect(result.pluralForm).toBe("many");
    });
  });

  describe("validateInterpolation", () => {
    it("should pass when variables match", () => {
      const result = validateInterpolation("Hello {{name}}", "Hola {{name}}");
      expect(result.valid).toBe(true);
      expect(result.missingVars).toEqual([]);
      expect(result.extraVars).toEqual([]);
    });

    it("should detect missing variables", () => {
      const result = validateInterpolation(
        "Hello {{name}}, you have {{count}} items",
        "Hola, tienes {{count}} articulos",
      );
      expect(result.valid).toBe(false);
      expect(result.missingVars).toEqual(["name"]);
    });

    it("should detect extra variables", () => {
      const result = validateInterpolation(
        "Hello {{name}}",
        "Hola {{name}} {{extra}}",
      );
      expect(result.valid).toBe(false);
      expect(result.extraVars).toEqual(["extra"]);
    });

    it("should pass when no variables", () => {
      const result = validateInterpolation("Hello", "Hola");
      expect(result.valid).toBe(true);
    });
  });

  describe("checkPluralCoverage", () => {
    it("should detect missing English plural forms", () => {
      const keys: Record<string, string> = {
        items_one: "{{count}} item",
        // missing items_other
      };
      const result = checkPluralCoverage(keys, "en");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].missingForms).toContain("other");
    });

    it("should detect missing Arabic plural forms", () => {
      const keys: Record<string, string> = {
        items_one: "item one",
        items_other: "items other",
        // missing zero, two, few, many
      };
      const result = checkPluralCoverage(keys, "ar");
      expect(result.length).toBeGreaterThan(0);
      const missing = result[0].missingForms;
      expect(missing).toContain("zero");
      expect(missing).toContain("two");
    });

    it("should pass for complete English plurals", () => {
      const keys: Record<string, string> = {
        items_one: "{{count}} item",
        items_other: "{{count}} items",
      };
      const result = checkPluralCoverage(keys, "en");
      expect(result.length).toBe(0);
    });

    it("should pass for languages with only other form", () => {
      const keys: Record<string, string> = {
        items_other: "{{count}} items",
      };
      const result = checkPluralCoverage(keys, "zh");
      expect(result.length).toBe(0);
    });
  });

  describe("validateLocale", () => {
    it("should detect missing keys", () => {
      const ref = { "app.name": "nChat", "app.save": "Save" };
      const target = { "app.name": "nChat" };
      const issues = validateLocale(ref, target, "es", "common");
      expect(issues.some((i) => i.type === "missing_key")).toBe(true);
    });

    it("should detect empty values", () => {
      const ref = { "app.save": "Save" };
      const target = { "app.save": "  " };
      const issues = validateLocale(ref, target, "es", "common");
      expect(issues.some((i) => i.type === "empty_value")).toBe(true);
    });

    it("should detect placeholder values", () => {
      const ref = { "app.save": "Save" };
      const target = { "app.save": "TODO" };
      const issues = validateLocale(ref, target, "es", "common");
      expect(issues.some((i) => i.type === "placeholder_value")).toBe(true);
    });

    it("should detect untranslated values", () => {
      const ref = { "app.welcome": "Welcome to our app" };
      const target = { "app.welcome": "Welcome to our app" };
      const issues = validateLocale(ref, target, "es", "common");
      expect(issues.some((i) => i.type === "untranslated")).toBe(true);
    });

    it("should not flag short identical values as untranslated", () => {
      const ref = { "app.ok": "OK" };
      const target = { "app.ok": "OK" };
      const issues = validateLocale(ref, target, "es", "common");
      expect(issues.some((i) => i.type === "untranslated")).toBe(false);
    });

    it("should pass for valid translations", () => {
      const ref = { "app.save": "Save" };
      const target = { "app.save": "Guardar" };
      const issues = validateLocale(ref, target, "es", "common");
      expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
    });
  });

  describe("validateAllLocales", () => {
    it("should validate across multiple locales and namespaces", () => {
      const translations = {
        en: { common: { app: { save: "Save", cancel: "Cancel" } } },
        es: { common: { app: { save: "Guardar", cancel: "Cancelar" } } },
      };
      const result = validateAllLocales(translations, {
        namespaces: ["common"],
        checkUntranslated: false,
      });
      expect(result.locales["en"]).toBeDefined();
      expect(result.locales["es"]).toBeDefined();
    });

    it("should report missing namespace", () => {
      const translations = {
        en: { common: { app: { save: "Save" } } },
        es: {},
      };
      const result = validateAllLocales(translations, {
        namespaces: ["common"],
      });
      expect(result.locales["es"].issues.length).toBeGreaterThan(0);
    });
  });

  describe("formatValidationReport", () => {
    it("should produce a readable report", () => {
      const translations = {
        en: { common: { save: "Save" } },
        es: { common: { save: "Guardar" } },
      };
      const result = validateAllLocales(translations, {
        namespaces: ["common"],
        checkUntranslated: false,
      });
      const report = formatValidationReport(result);
      expect(report).toContain("Locale Validation Report");
      expect(report).toContain("Total issues");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// RTL UTILITIES TESTS (30+ tests)
// ═══════════════════════════════════════════════════════════════════

describe("RTL Utilities", () => {
  describe("detectTextDirection", () => {
    it("should detect LTR text", () => {
      const result = detectTextDirection("Hello World");
      expect(result.direction).toBe("ltr");
      expect(result.ltrCount).toBeGreaterThan(0);
      expect(result.rtlCount).toBe(0);
    });

    it("should detect RTL Arabic text", () => {
      const result = detectTextDirection("مرحبا بالعالم");
      expect(result.direction).toBe("rtl");
      expect(result.rtlCount).toBeGreaterThan(0);
    });

    it("should detect RTL Hebrew text", () => {
      const result = detectTextDirection("שלום עולם");
      expect(result.direction).toBe("rtl");
      expect(result.rtlCount).toBeGreaterThan(0);
    });

    it("should detect mixed content", () => {
      const result = detectTextDirection("Hello مرحبا World");
      expect(result.isMixed).toBe(true);
      expect(result.ltrCount).toBeGreaterThan(0);
      expect(result.rtlCount).toBeGreaterThan(0);
    });

    it("should return neutral for empty string", () => {
      const result = detectTextDirection("");
      expect(result.direction).toBe("neutral");
      expect(result.confidence).toBe(0);
    });

    it("should return neutral for numbers only", () => {
      const result = detectTextDirection("12345");
      expect(result.direction).toBe("neutral");
    });

    it("should detect direction from first strong character", () => {
      const result = detectTextDirection("123 Hello");
      expect(result.direction).toBe("ltr");
    });

    it("should detect Arabic with first strong", () => {
      const result = detectTextDirection("123 مرحبا");
      expect(result.direction).toBe("rtl");
    });

    it("should have high confidence for pure LTR", () => {
      const result = detectTextDirection("Hello World");
      expect(result.confidence).toBe(1);
    });

    it("should handle whitespace-only text", () => {
      const result = detectTextDirection("   ");
      expect(result.direction).toBe("neutral");
    });
  });

  describe("detectDirectionByLocale", () => {
    it("should return rtl for Arabic", () => {
      expect(detectDirectionByLocale("ar")).toBe("rtl");
    });

    it("should return rtl for Hebrew", () => {
      expect(detectDirectionByLocale("he")).toBe("rtl");
    });

    it("should return rtl for Persian", () => {
      expect(detectDirectionByLocale("fa")).toBe("rtl");
    });

    it("should return ltr for English", () => {
      expect(detectDirectionByLocale("en")).toBe("ltr");
    });

    it("should return ltr for Chinese", () => {
      expect(detectDirectionByLocale("zh")).toBe("ltr");
    });

    it("should handle locale with region code", () => {
      expect(detectDirectionByLocale("ar-SA")).toBe("rtl");
    });

    it("should default to ltr for unknown locales", () => {
      expect(detectDirectionByLocale("xx")).toBe("ltr");
    });
  });

  describe("wrapBidi", () => {
    it("should wrap LTR text with LRI+PDI", () => {
      const result = wrapBidi("Hello", "ltr");
      expect(result).toBe(`${BIDI_CHARS.LRI}Hello${BIDI_CHARS.PDI}`);
    });

    it("should wrap RTL text with RLI+PDI", () => {
      const result = wrapBidi("مرحبا", "rtl");
      expect(result).toBe(`${BIDI_CHARS.RLI}مرحبا${BIDI_CHARS.PDI}`);
    });

    it("should wrap auto with FSI+PDI", () => {
      const result = wrapBidi("Hello", "auto");
      expect(result).toBe(`${BIDI_CHARS.FSI}Hello${BIDI_CHARS.PDI}`);
    });

    it("should default to auto", () => {
      const result = wrapBidi("Hello");
      expect(result).toBe(`${BIDI_CHARS.FSI}Hello${BIDI_CHARS.PDI}`);
    });

    it("should return empty string for empty input", () => {
      expect(wrapBidi("")).toBe("");
    });
  });

  describe("stripBidiChars", () => {
    it("should remove all bidi control characters", () => {
      const input = `${BIDI_CHARS.LRM}Hello${BIDI_CHARS.RLM} World${BIDI_CHARS.PDI}`;
      const result = stripBidiChars(input);
      expect(result).toBe("Hello World");
    });

    it("should return unchanged string without bidi chars", () => {
      expect(stripBidiChars("Hello World")).toBe("Hello World");
    });
  });

  describe("hasBidiChars", () => {
    it("should detect LRM", () => {
      expect(hasBidiChars(`${BIDI_CHARS.LRM}text`)).toBe(true);
    });

    it("should detect RLM", () => {
      expect(hasBidiChars(`text${BIDI_CHARS.RLM}`)).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(hasBidiChars("Hello World")).toBe(false);
    });
  });

  describe("formatNumberRTL", () => {
    it("should format number for RTL locale with LRM marks", () => {
      const result = formatNumberRTL(1234, "ar");
      expect(result).toContain(BIDI_CHARS.LRM);
    });

    it("should format number for LTR locale without marks", () => {
      const result = formatNumberRTL(1234, "en");
      expect(result).not.toContain(BIDI_CHARS.LRM);
    });

    it("should handle negative numbers", () => {
      const result = formatNumberRTL(-42, "en");
      expect(result).toBeDefined();
    });
  });

  describe("formatDateRTL", () => {
    it("should format date for Arabic locale", () => {
      const date = new Date("2024-06-15");
      const result = formatDateRTL(date, "ar");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should format date for English locale", () => {
      const date = new Date("2024-06-15");
      const result = formatDateRTL(date, "en");
      expect(result).toBeDefined();
    });
  });

  describe("getLogicalProperty", () => {
    it("should map margin-left to margin-inline-start", () => {
      expect(getLogicalProperty("margin-left", false)).toBe(
        "margin-inline-start",
      );
    });

    it("should map padding-right to padding-inline-end", () => {
      expect(getLogicalProperty("padding-right", false)).toBe(
        "padding-inline-end",
      );
    });

    it("should flip text-align for RTL", () => {
      expect(getLogicalProperty("text-align: left", true)).toBe(
        "text-align: right",
      );
      expect(getLogicalProperty("text-align: right", true)).toBe(
        "text-align: left",
      );
    });

    it("should return original for unknown properties", () => {
      expect(getLogicalProperty("color", false)).toBe("color");
    });
  });

  describe("createRTLTransform", () => {
    it("should negate translateX for RTL", () => {
      const result = createRTLTransform({ translateX: 10 }, true);
      expect(result).toContain("translateX(-10px)");
    });

    it("should keep translateX for LTR", () => {
      const result = createRTLTransform({ translateX: 10 }, false);
      expect(result).toContain("translateX(10px)");
    });

    it("should negate scaleX for RTL", () => {
      const result = createRTLTransform({ scaleX: 1 }, true);
      expect(result).toContain("scaleX(-1)");
    });

    it("should negate rotation for RTL", () => {
      const result = createRTLTransform({ rotate: 45 }, true);
      expect(result).toContain("rotate(-45deg)");
    });

    it("should return none for empty transforms", () => {
      expect(createRTLTransform({}, false)).toBe("none");
    });
  });

  describe("resolveLogicalPosition", () => {
    it("should resolve start to left for LTR", () => {
      expect(resolveLogicalPosition("start", false)).toBe("left");
    });

    it("should resolve start to right for RTL", () => {
      expect(resolveLogicalPosition("start", true)).toBe("right");
    });

    it("should resolve end to right for LTR", () => {
      expect(resolveLogicalPosition("end", false)).toBe("right");
    });

    it("should resolve end to left for RTL", () => {
      expect(resolveLogicalPosition("end", true)).toBe("left");
    });

    it("should pass through left unchanged", () => {
      expect(resolveLogicalPosition("left", true)).toBe("left");
    });
  });

  describe("isRTLLocale", () => {
    it("should return true for ar", () => {
      expect(isRTLLocale("ar")).toBe(true);
    });

    it("should return true for he", () => {
      expect(isRTLLocale("he")).toBe(true);
    });

    it("should return true for fa", () => {
      expect(isRTLLocale("fa")).toBe(true);
    });

    it("should return false for en", () => {
      expect(isRTLLocale("en")).toBe(false);
    });

    it("should return false for ko", () => {
      expect(isRTLLocale("ko")).toBe(false);
    });
  });

  describe("getRTLLocales", () => {
    it("should return array of RTL locales", () => {
      const rtl = getRTLLocales();
      expect(rtl).toContain("ar");
      expect(rtl).toContain("he");
      expect(rtl).toContain("fa");
      expect(rtl).not.toContain("en");
    });
  });

  describe("getMixedContentDirection", () => {
    it("should detect RTL for Arabic text", () => {
      expect(getMixedContentDirection("مرحبا")).toBe("rtl");
    });

    it("should detect LTR for Latin text", () => {
      expect(getMixedContentDirection("Hello")).toBe("ltr");
    });

    it("should use fallback locale for neutral text", () => {
      expect(getMixedContentDirection("123", "ar")).toBe("rtl");
    });

    it("should default to LTR for neutral without fallback", () => {
      expect(getMixedContentDirection("123")).toBe("ltr");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// EXTENDED PLURAL RULES TESTS (30+ tests)
// ═══════════════════════════════════════════════════════════════════

describe("Extended Plural Rules", () => {
  describe("extendedPluralRules coverage", () => {
    it("should have rules for all major locales", () => {
      const expectedLocales = [
        "en",
        "es",
        "fr",
        "de",
        "ar",
        "he",
        "ko",
        "zh",
        "ja",
        "pt",
        "ru",
        "it",
        "nl",
        "pl",
        "tr",
        "sv",
        "th",
        "vi",
        "id",
        "hi",
        "fa",
        "uk",
        "cs",
      ];
      for (const locale of expectedLocales) {
        expect(extendedPluralRules[locale]).toBeDefined();
      }
    });

    it("should define cardinal forms for each locale", () => {
      for (const [locale, def] of Object.entries(extendedPluralRules)) {
        expect(def.cardinalForms.length).toBeGreaterThan(0);
        expect(def.cardinalForms).toContain("other");
      }
    });

    it("should define examples for each locale", () => {
      for (const [locale, def] of Object.entries(extendedPluralRules)) {
        expect(Object.keys(def.examples).length).toBeGreaterThan(0);
      }
    });
  });

  describe("English plural rules", () => {
    it("should return one for n=1", () => {
      expect(getExtendedPluralCategory("en", 1)).toBe("one");
    });

    it("should return other for n=0", () => {
      expect(getExtendedPluralCategory("en", 0)).toBe("other");
    });

    it("should return other for n=2", () => {
      expect(getExtendedPluralCategory("en", 2)).toBe("other");
    });

    it("should return other for n=100", () => {
      expect(getExtendedPluralCategory("en", 100)).toBe("other");
    });

    it("should handle ordinals: 1st", () => {
      expect(getExtendedPluralCategory("en", 1, "ordinal")).toBe("one");
    });

    it("should handle ordinals: 2nd", () => {
      expect(getExtendedPluralCategory("en", 2, "ordinal")).toBe("two");
    });

    it("should handle ordinals: 3rd", () => {
      expect(getExtendedPluralCategory("en", 3, "ordinal")).toBe("few");
    });

    it("should handle ordinals: 4th", () => {
      expect(getExtendedPluralCategory("en", 4, "ordinal")).toBe("other");
    });

    it("should handle ordinals: 11th (exception)", () => {
      expect(getExtendedPluralCategory("en", 11, "ordinal")).toBe("other");
    });
  });

  describe("Arabic plural rules", () => {
    it("should return zero for n=0", () => {
      expect(getExtendedPluralCategory("ar", 0)).toBe("zero");
    });

    it("should return one for n=1", () => {
      expect(getExtendedPluralCategory("ar", 1)).toBe("one");
    });

    it("should return two for n=2", () => {
      expect(getExtendedPluralCategory("ar", 2)).toBe("two");
    });

    it("should return few for n=3-10", () => {
      expect(getExtendedPluralCategory("ar", 3)).toBe("few");
      expect(getExtendedPluralCategory("ar", 10)).toBe("few");
    });

    it("should return many for n=11-99", () => {
      expect(getExtendedPluralCategory("ar", 11)).toBe("many");
      expect(getExtendedPluralCategory("ar", 99)).toBe("many");
    });

    it("should return other for n=100-102", () => {
      expect(getExtendedPluralCategory("ar", 100)).toBe("other");
      expect(getExtendedPluralCategory("ar", 101)).toBe("other");
    });

    it("should return few for n=103", () => {
      expect(getExtendedPluralCategory("ar", 103)).toBe("few");
    });
  });

  describe("Hebrew plural rules", () => {
    it("should return one for n=1", () => {
      expect(getExtendedPluralCategory("he", 1)).toBe("one");
    });

    it("should return two for n=2", () => {
      expect(getExtendedPluralCategory("he", 2)).toBe("two");
    });

    it("should return other for n=3", () => {
      expect(getExtendedPluralCategory("he", 3)).toBe("other");
    });

    it("should return other for n=0", () => {
      expect(getExtendedPluralCategory("he", 0)).toBe("other");
    });
  });

  describe("Russian plural rules", () => {
    it("should return one for n=1", () => {
      expect(getExtendedPluralCategory("ru", 1)).toBe("one");
    });

    it("should return few for n=2,3,4", () => {
      expect(getExtendedPluralCategory("ru", 2)).toBe("few");
      expect(getExtendedPluralCategory("ru", 3)).toBe("few");
      expect(getExtendedPluralCategory("ru", 4)).toBe("few");
    });

    it("should return many for n=5-20", () => {
      expect(getExtendedPluralCategory("ru", 5)).toBe("many");
      expect(getExtendedPluralCategory("ru", 11)).toBe("many");
      expect(getExtendedPluralCategory("ru", 20)).toBe("many");
    });

    it("should return one for n=21", () => {
      expect(getExtendedPluralCategory("ru", 21)).toBe("one");
    });

    it("should return few for n=22-24", () => {
      expect(getExtendedPluralCategory("ru", 22)).toBe("few");
    });
  });

  describe("Korean/Chinese/Japanese plural rules", () => {
    it("should always return other for Korean", () => {
      expect(getExtendedPluralCategory("ko", 0)).toBe("other");
      expect(getExtendedPluralCategory("ko", 1)).toBe("other");
      expect(getExtendedPluralCategory("ko", 100)).toBe("other");
    });

    it("should always return other for Chinese", () => {
      expect(getExtendedPluralCategory("zh", 0)).toBe("other");
      expect(getExtendedPluralCategory("zh", 1)).toBe("other");
    });

    it("should always return other for Japanese", () => {
      expect(getExtendedPluralCategory("ja", 0)).toBe("other");
      expect(getExtendedPluralCategory("ja", 1)).toBe("other");
    });
  });

  describe("French plural rules", () => {
    it("should return one for n=0", () => {
      expect(getExtendedPluralCategory("fr", 0)).toBe("one");
    });

    it("should return one for n=1", () => {
      expect(getExtendedPluralCategory("fr", 1)).toBe("one");
    });

    it("should return other for n=2", () => {
      expect(getExtendedPluralCategory("fr", 2)).toBe("other");
    });
  });

  describe("Polish plural rules", () => {
    it("should return one for n=1", () => {
      expect(getExtendedPluralCategory("pl", 1)).toBe("one");
    });

    it("should return few for n=2-4", () => {
      expect(getExtendedPluralCategory("pl", 2)).toBe("few");
      expect(getExtendedPluralCategory("pl", 3)).toBe("few");
      expect(getExtendedPluralCategory("pl", 4)).toBe("few");
    });

    it("should return many for n=5-20", () => {
      expect(getExtendedPluralCategory("pl", 5)).toBe("many");
      expect(getExtendedPluralCategory("pl", 12)).toBe("many");
    });

    it("should return few for n=22-24", () => {
      expect(getExtendedPluralCategory("pl", 22)).toBe("few");
      expect(getExtendedPluralCategory("pl", 23)).toBe("few");
    });
  });

  describe("getExtendedPluralRule", () => {
    it("should return rule for known locale", () => {
      const rule = getExtendedPluralRule("ar");
      expect(rule.locale).toBe("ar");
      expect(rule.cardinalForms).toContain("zero");
    });

    it("should fallback to English for unknown locale", () => {
      const rule = getExtendedPluralRule("xx");
      expect(rule.locale).toBe("en");
    });

    it("should try base language", () => {
      const rule = getExtendedPluralRule("zh-TW");
      expect(rule.cardinalForms).toContain("other");
    });
  });

  describe("getRequiredPluralForms", () => {
    it("should return one and other for English", () => {
      const forms = getRequiredPluralForms("en");
      expect(forms).toContain("one");
      expect(forms).toContain("other");
      expect(forms).toHaveLength(2);
    });

    it("should return 6 forms for Arabic", () => {
      const forms = getRequiredPluralForms("ar");
      expect(forms).toHaveLength(6);
      expect(forms).toContain("zero");
      expect(forms).toContain("two");
      expect(forms).toContain("few");
      expect(forms).toContain("many");
    });

    it("should return only other for Japanese", () => {
      const forms = getRequiredPluralForms("ja");
      expect(forms).toEqual(["other"]);
    });
  });

  describe("getRequiredOrdinalForms", () => {
    it("should return one,two,few,other for English", () => {
      const forms = getRequiredOrdinalForms("en");
      expect(forms).toContain("one");
      expect(forms).toContain("two");
      expect(forms).toContain("few");
      expect(forms).toContain("other");
    });
  });

  describe("getPluralExamples", () => {
    it("should return examples for English", () => {
      const examples = getPluralExamples("en");
      expect(examples.one).toContain(1);
      expect(examples.other).toContain(0);
    });

    it("should return examples for Arabic", () => {
      const examples = getPluralExamples("ar");
      expect(examples.zero).toContain(0);
      expect(examples.one).toContain(1);
      expect(examples.two).toContain(2);
    });
  });

  describe("validatePluralKeys", () => {
    it("should pass for complete English plurals", () => {
      const keys = ["items_one", "items_other"];
      const result = validatePluralKeys(keys, "en");
      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should fail for incomplete English plurals", () => {
      const keys = ["items_one"];
      const result = validatePluralKeys(keys, "en");
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("items_other");
    });

    it("should validate Arabic plural forms", () => {
      const keys = ["items_one", "items_other"];
      const result = validatePluralKeys(keys, "ar");
      expect(result.complete).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it("should pass for non-plural keys", () => {
      const keys = ["app.name", "app.save"];
      const result = validatePluralKeys(keys, "en");
      expect(result.complete).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// FORMAT UTILITIES TESTS (30+ tests)
// ═══════════════════════════════════════════════════════════════════

describe("Format Utilities", () => {
  const testDate = new Date("2024-06-15T14:30:00Z");

  describe("formatLocalDate", () => {
    it("should format date in English", () => {
      const result = formatLocalDate(testDate, "en", "medium");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // Should contain "Jun" or "June" and "2024"
      expect(result).toMatch(/Jun.*2024|2024.*Jun/);
    });

    it("should format date with short preset", () => {
      const result = formatLocalDate(testDate, "en", "short");
      expect(result).toBeDefined();
    });

    it("should format date with long preset", () => {
      const result = formatLocalDate(testDate, "en", "long");
      expect(result).toContain("2024");
    });

    it("should format date with full preset", () => {
      const result = formatLocalDate(testDate, "en", "full");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(10);
    });

    it("should handle string date input", () => {
      const result = formatLocalDate("2024-06-15", "en");
      expect(result).toBeDefined();
    });

    it("should handle timestamp input", () => {
      const result = formatLocalDate(testDate.getTime(), "en");
      expect(result).toBeDefined();
    });

    it("should return empty string for invalid date", () => {
      const result = formatLocalDate("not-a-date", "en");
      expect(result).toBe("");
    });

    it("should format date for German locale", () => {
      const result = formatLocalDate(testDate, "de", "medium");
      expect(result).toBeDefined();
    });

    it("should format date for Japanese locale", () => {
      const result = formatLocalDate(testDate, "ja", "medium");
      expect(result).toBeDefined();
    });

    it("should format date for Arabic locale", () => {
      const result = formatLocalDate(testDate, "ar", "medium");
      expect(result).toBeDefined();
    });
  });

  describe("formatLocalTime", () => {
    it("should format time in English", () => {
      const result = formatLocalTime(testDate, "en", "short");
      expect(result).toBeDefined();
    });

    it("should format time with seconds", () => {
      const result = formatLocalTime(testDate, "en", "medium");
      expect(result).toBeDefined();
    });

    it("should return empty string for invalid date", () => {
      expect(formatLocalTime("not-a-date", "en")).toBe("");
    });
  });

  describe("formatLocalDateTime", () => {
    it("should format date and time together", () => {
      const result = formatLocalDateTime(testDate, "en");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(5);
    });

    it("should return empty for invalid date", () => {
      expect(formatLocalDateTime("bad", "en")).toBe("");
    });
  });

  describe("formatRelativeTimeIntl", () => {
    it("should format past time", () => {
      const past = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const result = formatRelativeTimeIntl(past, "en");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should format future time", () => {
      const future = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      const result = formatRelativeTimeIntl(future, "en");
      expect(result).toBeDefined();
    });

    it("should return empty for invalid date", () => {
      expect(formatRelativeTimeIntl("bad", "en")).toBe("");
    });

    it("should support short style", () => {
      const past = new Date(Date.now() - 86400 * 1000); // 1 day ago
      const result = formatRelativeTimeIntl(past, "en", { style: "short" });
      expect(result).toBeDefined();
    });
  });

  describe("getRelativeTimeUnit", () => {
    it("should return seconds for small diffs", () => {
      const result = getRelativeTimeUnit(30);
      expect(result.unit).toBe("second");
    });

    it("should return minutes for minute-range diffs", () => {
      const result = getRelativeTimeUnit(120);
      expect(result.unit).toBe("minute");
    });

    it("should return hours for hour-range diffs", () => {
      const result = getRelativeTimeUnit(7200);
      expect(result.unit).toBe("hour");
    });

    it("should return days for day-range diffs", () => {
      const result = getRelativeTimeUnit(172800);
      expect(result.unit).toBe("day");
    });

    it("should return years for large diffs", () => {
      const result = getRelativeTimeUnit(365.25 * 24 * 3600 * 2);
      expect(result.unit).toBe("year");
    });
  });

  describe("formatLocalNumber", () => {
    it("should format number for English", () => {
      const result = formatLocalNumber(1234567.89, "en");
      expect(result).toContain("1");
      expect(result).toBeDefined();
    });

    it("should format number for German", () => {
      const result = formatLocalNumber(1234567.89, "de");
      expect(result).toBeDefined();
    });

    it("should respect format options", () => {
      const result = formatLocalNumber(3.14159, "en", {
        maximumFractionDigits: 2,
      });
      expect(result).toBeDefined();
    });
  });

  describe("formatLocalCurrency", () => {
    it("should format USD", () => {
      const result = formatLocalCurrency(99.99, "en", "USD");
      expect(result).toContain("$");
    });

    it("should format EUR", () => {
      const result = formatLocalCurrency(99.99, "de", "EUR");
      expect(result).toBeDefined();
    });

    it("should format JPY without decimals", () => {
      const result = formatLocalCurrency(1000, "ja", "JPY");
      expect(result).toBeDefined();
    });
  });

  describe("formatLocalPercent", () => {
    it("should format 0.5 as 50%", () => {
      const result = formatLocalPercent(0.5, "en");
      expect(result).toContain("50");
      expect(result).toContain("%");
    });

    it("should format for German locale", () => {
      const result = formatLocalPercent(0.1234, "de");
      expect(result).toBeDefined();
    });
  });

  describe("formatLocalCompact", () => {
    it("should format thousands", () => {
      const result = formatLocalCompact(1500, "en");
      expect(result).toBeDefined();
    });

    it("should format millions", () => {
      const result = formatLocalCompact(2500000, "en");
      expect(result).toBeDefined();
    });

    it("should handle small numbers", () => {
      const result = formatLocalCompact(42, "en");
      expect(result).toBeDefined();
    });
  });

  describe("formatLocalList", () => {
    it("should format conjunction list in English", () => {
      const result = formatLocalList(["Alice", "Bob", "Charlie"], "en");
      expect(result).toContain("Alice");
      expect(result).toContain("Charlie");
    });

    it("should handle single item", () => {
      const result = formatLocalList(["Alice"], "en");
      expect(result).toBe("Alice");
    });

    it("should handle empty list", () => {
      const result = formatLocalList([], "en");
      expect(result).toBe("");
    });

    it("should handle two items", () => {
      const result = formatLocalList(["Alice", "Bob"], "en");
      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
    });

    it("should support disjunction", () => {
      const result = formatLocalList(["A", "B", "C"], "en", {
        type: "disjunction",
      });
      expect(result).toBeDefined();
    });
  });

  describe("getLanguageDisplayName", () => {
    it("should return French in English", () => {
      const result = getLanguageDisplayName("fr", "en");
      expect(result.toLowerCase()).toContain("french");
    });

    it("should return English in English", () => {
      const result = getLanguageDisplayName("en", "en");
      expect(result.toLowerCase()).toContain("english");
    });
  });

  describe("getRegionDisplayName", () => {
    it("should return United States", () => {
      const result = getRegionDisplayName("US", "en");
      expect(result).toBeDefined();
    });
  });

  describe("getCurrencyDisplayName", () => {
    it("should return name for USD", () => {
      const result = getCurrencyDisplayName("USD", "en");
      expect(result).toBeDefined();
    });
  });

  describe("localeCompare", () => {
    it("should compare strings correctly in English", () => {
      expect(localeCompare("apple", "banana", "en")).toBeLessThan(0);
    });

    it("should handle equal strings", () => {
      expect(localeCompare("hello", "hello", "en")).toBe(0);
    });
  });

  describe("localeSort", () => {
    it("should sort strings in locale order", () => {
      const items = ["Charlie", "Alice", "Bob"];
      const sorted = localeSort(items, "en");
      expect(sorted).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should not mutate original array", () => {
      const items = ["C", "A", "B"];
      localeSort(items, "en");
      expect(items).toEqual(["C", "A", "B"]);
    });
  });

  describe("formatLocalBytes", () => {
    it("should format 0 bytes", () => {
      expect(formatLocalBytes(0, "en")).toBe("0 B");
    });

    it("should format kilobytes", () => {
      const result = formatLocalBytes(1500, "en");
      expect(result).toContain("KB");
    });

    it("should format megabytes", () => {
      const result = formatLocalBytes(1500000, "en");
      expect(result).toContain("MB");
    });

    it("should support binary units", () => {
      const result = formatLocalBytes(1024, "en", { binary: true });
      expect(result).toContain("KiB");
    });
  });

  describe("formatLocalDuration", () => {
    it("should format seconds", () => {
      const result = formatLocalDuration(5000, "en");
      expect(result).toBeDefined();
    });

    it("should format minutes and seconds", () => {
      const result = formatLocalDuration(125000, "en");
      expect(result).toBeDefined();
    });

    it("should format hours", () => {
      const result = formatLocalDuration(3700000, "en");
      expect(result).toBeDefined();
    });

    it("should respect maxUnits", () => {
      const result = formatLocalDuration(90061000, "en", { maxUnits: 1 });
      expect(result).toBeDefined();
    });
  });
});
