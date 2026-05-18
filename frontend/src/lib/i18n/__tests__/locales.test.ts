/**
 * @fileoverview Tests for locales configuration
 *
 * Tests the locale configuration module including supported locales,
 * validation, and utility functions.
 */

import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  RTL_LOCALES,
  LTR_LOCALES,
  LOCALE_CODES,
  isValidLocale,
  getLocaleConfig,
  getSortedLocales,
  getCompleteLocales,
  getLocalesByDirection,
  type LocaleCode,
  type LocaleConfig,
} from "../locales";

describe("locales", () => {
  describe("SUPPORTED_LOCALES", () => {
    it("should include English", () => {
      expect(SUPPORTED_LOCALES.en).toBeDefined();
      expect(SUPPORTED_LOCALES.en.code).toBe("en");
      expect(SUPPORTED_LOCALES.en.name).toBe("English");
    });

    it("should include Spanish", () => {
      expect(SUPPORTED_LOCALES.es).toBeDefined();
      expect(SUPPORTED_LOCALES.es.code).toBe("es");
      expect(SUPPORTED_LOCALES.es.englishName).toBe("Spanish");
    });

    it("should include French", () => {
      expect(SUPPORTED_LOCALES.fr).toBeDefined();
      expect(SUPPORTED_LOCALES.fr.code).toBe("fr");
      expect(SUPPORTED_LOCALES.fr.englishName).toBe("French");
    });

    it("should include German", () => {
      expect(SUPPORTED_LOCALES.de).toBeDefined();
      expect(SUPPORTED_LOCALES.de.code).toBe("de");
      expect(SUPPORTED_LOCALES.de.englishName).toBe("German");
    });

    it("should include Arabic", () => {
      expect(SUPPORTED_LOCALES.ar).toBeDefined();
      expect(SUPPORTED_LOCALES.ar.code).toBe("ar");
      expect(SUPPORTED_LOCALES.ar.direction).toBe("rtl");
    });

    it("should include Chinese", () => {
      expect(SUPPORTED_LOCALES.zh).toBeDefined();
      expect(SUPPORTED_LOCALES.zh.code).toBe("zh");
      expect(SUPPORTED_LOCALES.zh.englishName).toBe("Chinese (Simplified)");
    });

    it("should include Japanese", () => {
      expect(SUPPORTED_LOCALES.ja).toBeDefined();
      expect(SUPPORTED_LOCALES.ja.code).toBe("ja");
      expect(SUPPORTED_LOCALES.ja.englishName).toBe("Japanese");
    });

    it("should include Portuguese", () => {
      expect(SUPPORTED_LOCALES.pt).toBeDefined();
      expect(SUPPORTED_LOCALES.pt.code).toBe("pt");
      expect(SUPPORTED_LOCALES.pt.englishName).toBe("Portuguese");
    });

    it("should include Russian", () => {
      expect(SUPPORTED_LOCALES.ru).toBeDefined();
      expect(SUPPORTED_LOCALES.ru.code).toBe("ru");
      expect(SUPPORTED_LOCALES.ru.englishName).toBe("Russian");
    });

    it("should have valid structure for all locales", () => {
      for (const [code, config] of Object.entries(SUPPORTED_LOCALES)) {
        expect(config.code).toBe(code);
        expect(config.name).toBeDefined();
        expect(config.englishName).toBeDefined();
        expect(config.script).toBeDefined();
        expect(config.direction).toMatch(/^(ltr|rtl)$/);
        expect(config.bcp47).toBeDefined();
        expect(config.dateFnsLocale).toBeDefined();
        expect(config.numberLocale).toBeDefined();
        expect(config.pluralRule).toBeDefined();
        expect(typeof config.isComplete).toBe("boolean");
        expect(typeof config.completionPercent).toBe("number");
        expect(config.completionPercent).toBeGreaterThanOrEqual(0);
        expect(config.completionPercent).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("DEFAULT_LOCALE", () => {
    it("should be English", () => {
      expect(DEFAULT_LOCALE).toBe("en");
    });

    it("should be a valid locale", () => {
      expect(isValidLocale(DEFAULT_LOCALE)).toBe(true);
    });
  });

  describe("FALLBACK_LOCALE", () => {
    it("should be English", () => {
      expect(FALLBACK_LOCALE).toBe("en");
    });

    it("should be a valid locale", () => {
      expect(isValidLocale(FALLBACK_LOCALE)).toBe(true);
    });
  });

  describe("RTL_LOCALES", () => {
    it("should include Arabic", () => {
      expect(RTL_LOCALES).toContain("ar");
    });

    it("should not include English", () => {
      expect(RTL_LOCALES).not.toContain("en");
    });

    it("should not include Spanish", () => {
      expect(RTL_LOCALES).not.toContain("es");
    });

    it("should match locales with rtl direction", () => {
      for (const code of RTL_LOCALES) {
        expect(SUPPORTED_LOCALES[code].direction).toBe("rtl");
      }
    });
  });

  describe("LTR_LOCALES", () => {
    it("should include English", () => {
      expect(LTR_LOCALES).toContain("en");
    });

    it("should include Spanish", () => {
      expect(LTR_LOCALES).toContain("es");
    });

    it("should include French", () => {
      expect(LTR_LOCALES).toContain("fr");
    });

    it("should include German", () => {
      expect(LTR_LOCALES).toContain("de");
    });

    it("should include Chinese", () => {
      expect(LTR_LOCALES).toContain("zh");
    });

    it("should include Japanese", () => {
      expect(LTR_LOCALES).toContain("ja");
    });

    it("should not include Arabic", () => {
      expect(LTR_LOCALES).not.toContain("ar");
    });

    it("should match locales with ltr direction", () => {
      for (const code of LTR_LOCALES) {
        expect(SUPPORTED_LOCALES[code].direction).toBe("ltr");
      }
    });
  });

  describe("LOCALE_CODES", () => {
    it("should be an array", () => {
      expect(Array.isArray(LOCALE_CODES)).toBe(true);
    });

    it("should include all supported locale codes", () => {
      expect(LOCALE_CODES).toContain("en");
      expect(LOCALE_CODES).toContain("es");
      expect(LOCALE_CODES).toContain("fr");
      expect(LOCALE_CODES).toContain("de");
      expect(LOCALE_CODES).toContain("ar");
      expect(LOCALE_CODES).toContain("zh");
      expect(LOCALE_CODES).toContain("ja");
      expect(LOCALE_CODES).toContain("pt");
      expect(LOCALE_CODES).toContain("ru");
    });

    it("should match keys of SUPPORTED_LOCALES", () => {
      expect(LOCALE_CODES.sort()).toEqual(
        Object.keys(SUPPORTED_LOCALES).sort(),
      );
    });
  });

  describe("isValidLocale", () => {
    it("should return true for valid locale codes", () => {
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("es")).toBe(true);
      expect(isValidLocale("fr")).toBe(true);
      expect(isValidLocale("de")).toBe(true);
      expect(isValidLocale("ar")).toBe(true);
      expect(isValidLocale("zh")).toBe(true);
      expect(isValidLocale("ja")).toBe(true);
      expect(isValidLocale("pt")).toBe(true);
      expect(isValidLocale("ru")).toBe(true);
    });

    it("should return false for invalid locale codes", () => {
      expect(isValidLocale("invalid")).toBe(false);
      expect(isValidLocale("")).toBe(false);
      expect(isValidLocale("EN")).toBe(false);
      expect(isValidLocale("en-US")).toBe(false);
      expect(isValidLocale("english")).toBe(false);
    });

    it("should work as type guard", () => {
      const code = "en";
      if (isValidLocale(code)) {
        // TypeScript should allow this without error
        const config: LocaleConfig = SUPPORTED_LOCALES[code];
        expect(config).toBeDefined();
      }
    });
  });

  describe("getLocaleConfig", () => {
    it("should return config for valid locale", () => {
      const config = getLocaleConfig("en");
      expect(config).toBeDefined();
      expect(config?.code).toBe("en");
    });

    it("should return undefined for invalid locale", () => {
      expect(getLocaleConfig("invalid")).toBeUndefined();
    });

    it("should return correct config for each locale", () => {
      expect(getLocaleConfig("en")?.englishName).toBe("English");
      expect(getLocaleConfig("es")?.englishName).toBe("Spanish");
      expect(getLocaleConfig("fr")?.englishName).toBe("French");
      expect(getLocaleConfig("de")?.englishName).toBe("German");
      expect(getLocaleConfig("ar")?.englishName).toBe("Arabic");
      expect(getLocaleConfig("zh")?.englishName).toBe("Chinese (Simplified)");
      expect(getLocaleConfig("ja")?.englishName).toBe("Japanese");
      expect(getLocaleConfig("pt")?.englishName).toBe("Portuguese");
      expect(getLocaleConfig("ru")?.englishName).toBe("Russian");
    });
  });

  describe("getSortedLocales", () => {
    it("should return array of LocaleConfig", () => {
      const sorted = getSortedLocales();
      expect(Array.isArray(sorted)).toBe(true);
      expect(sorted.length).toBeGreaterThan(0);
    });

    it("should be sorted by English name", () => {
      const sorted = getSortedLocales();
      const names = sorted.map((l) => l.englishName);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });

    it("should include all locales", () => {
      const sorted = getSortedLocales();
      expect(sorted.length).toBe(Object.keys(SUPPORTED_LOCALES).length);
    });
  });

  describe("getCompleteLocales", () => {
    it("should return array of complete LocaleConfig", () => {
      const complete = getCompleteLocales();
      expect(Array.isArray(complete)).toBe(true);
    });

    it("should only include complete locales", () => {
      const complete = getCompleteLocales();
      for (const locale of complete) {
        expect(locale.isComplete).toBe(true);
      }
    });

    it("should include English (always complete)", () => {
      const complete = getCompleteLocales();
      expect(complete.some((l) => l.code === "en")).toBe(true);
    });
  });

  describe("getLocalesByDirection", () => {
    it("should return LTR locales", () => {
      const ltr = getLocalesByDirection("ltr");
      expect(Array.isArray(ltr)).toBe(true);
      for (const locale of ltr) {
        expect(locale.direction).toBe("ltr");
      }
    });

    it("should return RTL locales", () => {
      const rtl = getLocalesByDirection("rtl");
      expect(Array.isArray(rtl)).toBe(true);
      for (const locale of rtl) {
        expect(locale.direction).toBe("rtl");
      }
    });

    it("should include Arabic in RTL", () => {
      const rtl = getLocalesByDirection("rtl");
      expect(rtl.some((l) => l.code === "ar")).toBe(true);
    });

    it("should include English in LTR", () => {
      const ltr = getLocalesByDirection("ltr");
      expect(ltr.some((l) => l.code === "en")).toBe(true);
    });

    it("should partition all locales", () => {
      const ltr = getLocalesByDirection("ltr");
      const rtl = getLocalesByDirection("rtl");
      expect(ltr.length + rtl.length).toBe(
        Object.keys(SUPPORTED_LOCALES).length,
      );
    });
  });

  describe("LocaleConfig type", () => {
    it("should have all required fields", () => {
      const config = SUPPORTED_LOCALES.en;

      expect(typeof config.code).toBe("string");
      expect(typeof config.name).toBe("string");
      expect(typeof config.englishName).toBe("string");
      expect(typeof config.script).toBe("string");
      expect(typeof config.direction).toBe("string");
      expect(typeof config.bcp47).toBe("string");
      expect(typeof config.dateFnsLocale).toBe("string");
      expect(typeof config.numberLocale).toBe("string");
      expect(typeof config.pluralRule).toBe("string");
      expect(typeof config.isComplete).toBe("boolean");
      expect(typeof config.completionPercent).toBe("number");
    });

    it("should have valid script values", () => {
      const validScripts = [
        "Latn",
        "Arab",
        "Hans",
        "Hant",
        "Jpan",
        "Cyrl",
        "Hebr",
        "Kore",
        "Deva",
        "Thai",
        "Grek",
      ];
      for (const config of Object.values(SUPPORTED_LOCALES)) {
        expect(validScripts).toContain(config.script);
      }
    });

    it("should have valid direction values", () => {
      for (const config of Object.values(SUPPORTED_LOCALES)) {
        expect(["ltr", "rtl"]).toContain(config.direction);
      }
    });

    it("should have valid BCP 47 tags", () => {
      const bcp47Pattern = /^[a-z]{2}(-[A-Z]{2})?$/;
      for (const config of Object.values(SUPPORTED_LOCALES)) {
        expect(config.bcp47).toMatch(bcp47Pattern);
      }
    });
  });

  describe("locale-specific configurations", () => {
    it("should have correct Arabic configuration", () => {
      const ar = SUPPORTED_LOCALES.ar;
      expect(ar.direction).toBe("rtl");
      expect(ar.script).toBe("Arab");
      expect(ar.bcp47).toBe("ar-SA");
    });

    it("should have correct Chinese configuration", () => {
      const zh = SUPPORTED_LOCALES.zh;
      expect(zh.direction).toBe("ltr");
      expect(zh.script).toBe("Hans");
      expect(zh.bcp47).toBe("zh-CN");
    });

    it("should have correct Japanese configuration", () => {
      const ja = SUPPORTED_LOCALES.ja;
      expect(ja.direction).toBe("ltr");
      expect(ja.script).toBe("Jpan");
      expect(ja.bcp47).toBe("ja-JP");
    });

    it("should have correct Russian configuration", () => {
      const ru = SUPPORTED_LOCALES.ru;
      expect(ru.direction).toBe("ltr");
      expect(ru.script).toBe("Cyrl");
      expect(ru.bcp47).toBe("ru-RU");
    });

    it("should have correct Portuguese configuration", () => {
      const pt = SUPPORTED_LOCALES.pt;
      expect(pt.direction).toBe("ltr");
      expect(pt.script).toBe("Latn");
      expect(pt.bcp47).toBe("pt-BR");
    });
  });
});
