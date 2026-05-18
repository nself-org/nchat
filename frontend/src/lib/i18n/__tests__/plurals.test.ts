/**
 * @fileoverview Tests for plural rules
 *
 * Tests the plural rule implementation including CLDR-based rules
 * for different languages with varying complexity.
 */

import {
  getPluralCategory,
  getPluralKeySuffix,
  buildPluralKey,
  getLocalePluralForms,
  localeHasPluralCategory,
  getOrdinalCategory,
  getEnglishOrdinalSuffix,
  formatOrdinal,
  pluralRules,
  ordinalRules,
  type PluralCategory,
} from "../plurals";

describe("plurals", () => {
  describe("getPluralCategory", () => {
    describe("English (en)", () => {
      it("should return one for count 1", () => {
        expect(getPluralCategory("en", 1)).toBe("one");
      });

      it("should return other for count 0", () => {
        expect(getPluralCategory("en", 0)).toBe("other");
      });

      it("should return other for count 2", () => {
        expect(getPluralCategory("en", 2)).toBe("other");
      });

      it("should return other for count 5", () => {
        expect(getPluralCategory("en", 5)).toBe("other");
      });

      it("should return other for count 100", () => {
        expect(getPluralCategory("en", 100)).toBe("other");
      });
    });

    describe("Spanish (es)", () => {
      it("should return one for count 1", () => {
        expect(getPluralCategory("es", 1)).toBe("one");
      });

      it("should return other for count 0", () => {
        expect(getPluralCategory("es", 0)).toBe("other");
      });

      it("should return other for count 2", () => {
        expect(getPluralCategory("es", 2)).toBe("other");
      });
    });

    describe("French (fr)", () => {
      it("should return one for count 0", () => {
        expect(getPluralCategory("fr", 0)).toBe("one");
      });

      it("should return one for count 1", () => {
        expect(getPluralCategory("fr", 1)).toBe("one");
      });

      it("should return other for count 2", () => {
        expect(getPluralCategory("fr", 2)).toBe("other");
      });
    });

    describe("German (de)", () => {
      it("should return one for count 1", () => {
        expect(getPluralCategory("de", 1)).toBe("one");
      });

      it("should return other for count 0", () => {
        expect(getPluralCategory("de", 0)).toBe("other");
      });

      it("should return other for count 2", () => {
        expect(getPluralCategory("de", 2)).toBe("other");
      });
    });

    describe("Arabic (ar)", () => {
      it("should return zero for count 0", () => {
        expect(getPluralCategory("ar", 0)).toBe("zero");
      });

      it("should return one for count 1", () => {
        expect(getPluralCategory("ar", 1)).toBe("one");
      });

      it("should return two for count 2", () => {
        expect(getPluralCategory("ar", 2)).toBe("two");
      });

      it("should return few for counts 3-10", () => {
        expect(getPluralCategory("ar", 3)).toBe("few");
        expect(getPluralCategory("ar", 5)).toBe("few");
        expect(getPluralCategory("ar", 10)).toBe("few");
      });

      it("should return many for counts 11-99", () => {
        expect(getPluralCategory("ar", 11)).toBe("many");
        expect(getPluralCategory("ar", 50)).toBe("many");
        expect(getPluralCategory("ar", 99)).toBe("many");
      });

      it("should return other for count 100", () => {
        expect(getPluralCategory("ar", 100)).toBe("other");
      });

      it("should return few for count 103", () => {
        expect(getPluralCategory("ar", 103)).toBe("few");
      });

      it("should return many for count 111", () => {
        expect(getPluralCategory("ar", 111)).toBe("many");
      });
    });

    describe("Chinese (zh)", () => {
      it("should return other for all counts", () => {
        expect(getPluralCategory("zh", 0)).toBe("other");
        expect(getPluralCategory("zh", 1)).toBe("other");
        expect(getPluralCategory("zh", 2)).toBe("other");
        expect(getPluralCategory("zh", 100)).toBe("other");
      });
    });

    describe("Japanese (ja)", () => {
      it("should return other for all counts", () => {
        expect(getPluralCategory("ja", 0)).toBe("other");
        expect(getPluralCategory("ja", 1)).toBe("other");
        expect(getPluralCategory("ja", 2)).toBe("other");
        expect(getPluralCategory("ja", 100)).toBe("other");
      });
    });

    describe("Portuguese (pt)", () => {
      it("should return one for count 1", () => {
        expect(getPluralCategory("pt", 1)).toBe("one");
      });

      it("should return other for count 0", () => {
        expect(getPluralCategory("pt", 0)).toBe("other");
      });

      it("should return other for count 2", () => {
        expect(getPluralCategory("pt", 2)).toBe("other");
      });
    });

    describe("Russian (ru)", () => {
      it("should return one for count 1", () => {
        expect(getPluralCategory("ru", 1)).toBe("one");
      });

      it("should return one for count 21", () => {
        expect(getPluralCategory("ru", 21)).toBe("one");
      });

      it("should return one for count 31", () => {
        expect(getPluralCategory("ru", 31)).toBe("one");
      });

      it("should return few for counts 2-4", () => {
        expect(getPluralCategory("ru", 2)).toBe("few");
        expect(getPluralCategory("ru", 3)).toBe("few");
        expect(getPluralCategory("ru", 4)).toBe("few");
      });

      it("should return few for counts 22-24", () => {
        expect(getPluralCategory("ru", 22)).toBe("few");
        expect(getPluralCategory("ru", 23)).toBe("few");
        expect(getPluralCategory("ru", 24)).toBe("few");
      });

      it("should return many for counts 5-20", () => {
        expect(getPluralCategory("ru", 5)).toBe("many");
        expect(getPluralCategory("ru", 10)).toBe("many");
        expect(getPluralCategory("ru", 11)).toBe("many");
        expect(getPluralCategory("ru", 20)).toBe("many");
      });

      it("should return many for count 0", () => {
        expect(getPluralCategory("ru", 0)).toBe("many");
      });
    });

    describe("unknown locale", () => {
      it("should default to English-like pluralization", () => {
        expect(getPluralCategory("unknown", 1)).toBe("one");
        expect(getPluralCategory("unknown", 2)).toBe("other");
      });
    });

    describe("negative numbers", () => {
      it("should use absolute value", () => {
        expect(getPluralCategory("en", -1)).toBe("one");
        expect(getPluralCategory("en", -2)).toBe("other");
      });
    });
  });

  describe("getPluralKeySuffix", () => {
    it("should return _one for count 1 in English", () => {
      expect(getPluralKeySuffix("en", 1)).toBe("_one");
    });

    it("should return _other for count 2 in English", () => {
      expect(getPluralKeySuffix("en", 2)).toBe("_other");
    });

    it("should use custom separator", () => {
      expect(getPluralKeySuffix("en", 1, "-")).toBe("-one");
    });

    it("should return _zero for Arabic count 0", () => {
      expect(getPluralKeySuffix("ar", 0)).toBe("_zero");
    });

    it("should return _two for Arabic count 2", () => {
      expect(getPluralKeySuffix("ar", 2)).toBe("_two");
    });

    it("should return _few for Arabic count 5", () => {
      expect(getPluralKeySuffix("ar", 5)).toBe("_few");
    });

    it("should return _many for Arabic count 11", () => {
      expect(getPluralKeySuffix("ar", 11)).toBe("_many");
    });
  });

  describe("buildPluralKey", () => {
    it("should build key with plural suffix", () => {
      expect(buildPluralKey("messages", "en", 1)).toBe("messages_one");
      expect(buildPluralKey("messages", "en", 5)).toBe("messages_other");
    });

    it("should use custom separator", () => {
      expect(buildPluralKey("items", "en", 1, "-")).toBe("items-one");
    });

    it("should build Arabic plural keys", () => {
      expect(buildPluralKey("items", "ar", 0)).toBe("items_zero");
      expect(buildPluralKey("items", "ar", 1)).toBe("items_one");
      expect(buildPluralKey("items", "ar", 2)).toBe("items_two");
      expect(buildPluralKey("items", "ar", 5)).toBe("items_few");
      expect(buildPluralKey("items", "ar", 11)).toBe("items_many");
      expect(buildPluralKey("items", "ar", 100)).toBe("items_other");
    });
  });

  describe("getLocalePluralForms", () => {
    it("should return forms for Arabic", () => {
      const forms = getLocalePluralForms("ar");
      expect(forms).toEqual(["zero", "one", "two", "few", "many", "other"]);
    });

    it("should return forms for Russian", () => {
      const forms = getLocalePluralForms("ru");
      expect(forms).toEqual(["one", "few", "many", "other"]);
    });

    it("should return forms for Chinese", () => {
      const forms = getLocalePluralForms("zh");
      expect(forms).toEqual(["other"]);
    });

    it("should return forms for Japanese", () => {
      const forms = getLocalePluralForms("ja");
      expect(forms).toEqual(["other"]);
    });

    it("should return forms for French", () => {
      const forms = getLocalePluralForms("fr");
      expect(forms).toEqual(["one", "other"]);
    });

    it("should return forms for English", () => {
      const forms = getLocalePluralForms("en");
      expect(forms).toEqual(["one", "other"]);
    });

    it("should return forms for Spanish", () => {
      const forms = getLocalePluralForms("es");
      expect(forms).toEqual(["one", "other"]);
    });

    it("should return forms for German", () => {
      const forms = getLocalePluralForms("de");
      expect(forms).toEqual(["one", "other"]);
    });

    it("should return forms for Portuguese", () => {
      const forms = getLocalePluralForms("pt");
      expect(forms).toEqual(["one", "other"]);
    });
  });

  describe("localeHasPluralCategory", () => {
    it("should return true for valid categories", () => {
      expect(localeHasPluralCategory("en", "one")).toBe(true);
      expect(localeHasPluralCategory("en", "other")).toBe(true);
    });

    it("should return false for invalid categories", () => {
      expect(localeHasPluralCategory("en", "zero")).toBe(false);
      expect(localeHasPluralCategory("en", "two")).toBe(false);
      expect(localeHasPluralCategory("en", "few")).toBe(false);
      expect(localeHasPluralCategory("en", "many")).toBe(false);
    });

    it("should return true for Arabic special categories", () => {
      expect(localeHasPluralCategory("ar", "zero")).toBe(true);
      expect(localeHasPluralCategory("ar", "one")).toBe(true);
      expect(localeHasPluralCategory("ar", "two")).toBe(true);
      expect(localeHasPluralCategory("ar", "few")).toBe(true);
      expect(localeHasPluralCategory("ar", "many")).toBe(true);
      expect(localeHasPluralCategory("ar", "other")).toBe(true);
    });

    it("should return true for Russian categories", () => {
      expect(localeHasPluralCategory("ru", "one")).toBe(true);
      expect(localeHasPluralCategory("ru", "few")).toBe(true);
      expect(localeHasPluralCategory("ru", "many")).toBe(true);
      expect(localeHasPluralCategory("ru", "other")).toBe(true);
    });

    it("should return false for Chinese one", () => {
      expect(localeHasPluralCategory("zh", "one")).toBe(false);
    });
  });

  describe("getOrdinalCategory", () => {
    describe("English ordinals", () => {
      it("should return one for 1st", () => {
        expect(getOrdinalCategory("en", 1)).toBe("one");
      });

      it("should return two for 2nd", () => {
        expect(getOrdinalCategory("en", 2)).toBe("two");
      });

      it("should return few for 3rd", () => {
        expect(getOrdinalCategory("en", 3)).toBe("few");
      });

      it("should return other for 4th", () => {
        expect(getOrdinalCategory("en", 4)).toBe("other");
      });

      it("should return other for 11th", () => {
        expect(getOrdinalCategory("en", 11)).toBe("other");
      });

      it("should return other for 12th", () => {
        expect(getOrdinalCategory("en", 12)).toBe("other");
      });

      it("should return other for 13th", () => {
        expect(getOrdinalCategory("en", 13)).toBe("other");
      });

      it("should return one for 21st", () => {
        expect(getOrdinalCategory("en", 21)).toBe("one");
      });

      it("should return two for 22nd", () => {
        expect(getOrdinalCategory("en", 22)).toBe("two");
      });

      it("should return few for 23rd", () => {
        expect(getOrdinalCategory("en", 23)).toBe("few");
      });
    });

    describe("other locales", () => {
      it("should return other for Spanish", () => {
        expect(getOrdinalCategory("es", 1)).toBe("other");
        expect(getOrdinalCategory("es", 2)).toBe("other");
      });

      it("should return one for French 1st", () => {
        expect(getOrdinalCategory("fr", 1)).toBe("one");
      });

      it("should return other for French other", () => {
        expect(getOrdinalCategory("fr", 2)).toBe("other");
      });
    });

    it("should use absolute value", () => {
      expect(getOrdinalCategory("en", -1)).toBe("one");
    });
  });

  describe("getEnglishOrdinalSuffix", () => {
    it("should return st for 1", () => {
      expect(getEnglishOrdinalSuffix(1)).toBe("st");
    });

    it("should return nd for 2", () => {
      expect(getEnglishOrdinalSuffix(2)).toBe("nd");
    });

    it("should return rd for 3", () => {
      expect(getEnglishOrdinalSuffix(3)).toBe("rd");
    });

    it("should return th for 4-10", () => {
      expect(getEnglishOrdinalSuffix(4)).toBe("th");
      expect(getEnglishOrdinalSuffix(5)).toBe("th");
      expect(getEnglishOrdinalSuffix(10)).toBe("th");
    });

    it("should return th for 11, 12, 13 (exceptions)", () => {
      expect(getEnglishOrdinalSuffix(11)).toBe("th");
      expect(getEnglishOrdinalSuffix(12)).toBe("th");
      expect(getEnglishOrdinalSuffix(13)).toBe("th");
    });

    it("should return st for 21", () => {
      expect(getEnglishOrdinalSuffix(21)).toBe("st");
    });

    it("should return nd for 22", () => {
      expect(getEnglishOrdinalSuffix(22)).toBe("nd");
    });

    it("should return rd for 23", () => {
      expect(getEnglishOrdinalSuffix(23)).toBe("rd");
    });

    it("should return th for 111, 112, 113", () => {
      expect(getEnglishOrdinalSuffix(111)).toBe("th");
      expect(getEnglishOrdinalSuffix(112)).toBe("th");
      expect(getEnglishOrdinalSuffix(113)).toBe("th");
    });
  });

  describe("formatOrdinal", () => {
    it("should format English ordinals", () => {
      expect(formatOrdinal(1, "en")).toBe("1st");
      expect(formatOrdinal(2, "en")).toBe("2nd");
      expect(formatOrdinal(3, "en")).toBe("3rd");
      expect(formatOrdinal(4, "en")).toBe("4th");
      expect(formatOrdinal(21, "en")).toBe("21st");
    });

    it("should return number string for other locales", () => {
      expect(formatOrdinal(1, "es")).toBe("1");
      expect(formatOrdinal(2, "de")).toBe("2");
    });

    it("should default to English", () => {
      expect(formatOrdinal(1)).toBe("1st");
    });
  });

  describe("pluralRules", () => {
    it("should have rules for all supported locales", () => {
      expect(pluralRules.en).toBeDefined();
      expect(pluralRules.es).toBeDefined();
      expect(pluralRules.fr).toBeDefined();
      expect(pluralRules.de).toBeDefined();
      expect(pluralRules.ar).toBeDefined();
      expect(pluralRules.zh).toBeDefined();
      expect(pluralRules.ja).toBeDefined();
      expect(pluralRules.pt).toBeDefined();
      expect(pluralRules.ru).toBeDefined();
    });

    it("should be functions", () => {
      for (const rule of Object.values(pluralRules)) {
        expect(typeof rule).toBe("function");
      }
    });

    it("should return valid plural categories", () => {
      const validCategories: PluralCategory[] = [
        "zero",
        "one",
        "two",
        "few",
        "many",
        "other",
      ];

      for (const rule of Object.values(pluralRules)) {
        const result = rule(5);
        expect(validCategories).toContain(result);
      }
    });
  });

  describe("ordinalRules", () => {
    it("should have rules for all supported locales", () => {
      expect(ordinalRules.en).toBeDefined();
      expect(ordinalRules.es).toBeDefined();
      expect(ordinalRules.fr).toBeDefined();
      expect(ordinalRules.de).toBeDefined();
      expect(ordinalRules.ar).toBeDefined();
      expect(ordinalRules.zh).toBeDefined();
      expect(ordinalRules.ja).toBeDefined();
      expect(ordinalRules.pt).toBeDefined();
      expect(ordinalRules.ru).toBeDefined();
    });

    it("should be functions", () => {
      for (const rule of Object.values(ordinalRules)) {
        expect(typeof rule).toBe("function");
      }
    });
  });
});
