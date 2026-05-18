/**
 * Plural Rules (Extended)
 *
 * Comprehensive CLDR-based pluralization rules for all supported locales.
 * Extends the base plurals.ts with additional locales and utility functions
 * for proper pluralization across the full set of supported languages.
 *
 * Based on Unicode CLDR plural rules:
 * https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */

import type { PluralCategory } from "./plurals";

/**
 * Extended plural rule function that handles integers and decimals
 */
export type ExtendedPluralRule = (
  n: number,
  options?: { type?: "cardinal" | "ordinal" },
) => PluralCategory;

/**
 * Plural form definition for a locale
 */
export interface PluralFormDefinition {
  /** Locale code */
  locale: string;
  /** Which plural forms the locale uses for cardinal numbers */
  cardinalForms: PluralCategory[];
  /** Which plural forms the locale uses for ordinal numbers */
  ordinalForms: PluralCategory[];
  /** The plural rule function */
  rule: ExtendedPluralRule;
  /** Example counts for each form */
  examples: Partial<Record<PluralCategory, number[]>>;
}

/**
 * Helper: get integer digits and visible fraction digits
 */
function getNumberParts(n: number): {
  i: number; // integer part
  v: number; // number of visible fraction digits
  f: number; // visible fraction digits as integer
} {
  const abs = Math.abs(n);
  const str = String(abs);
  const dotIndex = str.indexOf(".");

  if (dotIndex === -1) {
    return { i: Math.floor(abs), v: 0, f: 0 };
  }

  const fracStr = str.substring(dotIndex + 1);
  return {
    i: Math.floor(abs),
    v: fracStr.length,
    f: parseInt(fracStr, 10) || 0,
  };
}

/**
 * Extended plural rules for all supported locales
 */
export const extendedPluralRules: Record<string, PluralFormDefinition> = {
  // English: one, other
  en: {
    locale: "en",
    cardinalForms: ["one", "other"],
    ordinalForms: ["one", "two", "few", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return "one";
        if (mod10 === 2 && mod100 !== 12) return "two";
        if (mod10 === 3 && mod100 !== 13) return "few";
        return "other";
      }
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Spanish: one, many, other
  es: {
    locale: "es",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // French: one, many, other (0 and 1 are singular)
  fr: {
    locale: "fr",
    cardinalForms: ["one", "other"],
    ordinalForms: ["one", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 1) return "one";
        return "other";
      }
      const { i } = getNumberParts(n);
      if (i === 0 || i === 1) return "one";
      return "other";
    },
    examples: {
      one: [0, 1],
      other: [2, 3, 5, 10, 100],
    },
  },

  // German: one, other
  de: {
    locale: "de",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Arabic: zero, one, two, few, many, other (most complex)
  ar: {
    locale: "ar",
    cardinalForms: ["zero", "one", "two", "few", "many", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 0) return "zero";
      if (n === 1) return "one";
      if (n === 2) return "two";
      const mod100 = n % 100;
      if (mod100 >= 3 && mod100 <= 10) return "few";
      if (mod100 >= 11 && mod100 <= 99) return "many";
      return "other";
    },
    examples: {
      zero: [0],
      one: [1],
      two: [2],
      few: [3, 4, 5, 6, 7, 8, 9, 10, 103],
      many: [11, 12, 13, 14, 99, 111],
      other: [100, 101, 102],
    },
  },

  // Hebrew: one, two, other
  he: {
    locale: "he",
    cardinalForms: ["one", "two", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      if (i === 2 && v === 0) return "two";
      return "other";
    },
    examples: {
      one: [1],
      two: [2],
      other: [0, 3, 4, 5, 10, 20, 100],
    },
  },

  // Korean: other only (no plural distinctions)
  ko: {
    locale: "ko",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Chinese (Simplified): other only
  zh: {
    locale: "zh",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Japanese: other only
  ja: {
    locale: "ja",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Portuguese: one, other
  pt: {
    locale: "pt",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i } = getNumberParts(n);
      if (i === 0 || i === 1) return "one";
      return "other";
    },
    examples: {
      one: [0, 1],
      other: [2, 3, 5, 10, 100],
    },
  },

  // Russian: one, few, many, other
  ru: {
    locale: "ru",
    cardinalForms: ["one", "few", "many", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      const mod10 = i % 10;
      const mod100 = i % 100;

      if (v !== 0) return "other";
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        return "few";
      return "many";
    },
    examples: {
      one: [1, 21, 31, 41, 51, 61],
      few: [2, 3, 4, 22, 23, 24],
      many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 25],
      other: [1.5, 2.5],
    },
  },

  // Italian: one, other
  it: {
    locale: "it",
    cardinalForms: ["one", "other"],
    ordinalForms: ["many", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 8 || n === 11 || n === 80 || n === 800) return "many";
        return "other";
      }
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Dutch: one, other
  nl: {
    locale: "nl",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Polish: one, few, many, other
  pl: {
    locale: "pl",
    cardinalForms: ["one", "few", "many", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      if (v !== 0) return "other";

      const mod10 = i % 10;
      const mod100 = i % 100;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        return "few";
      return "many";
    },
    examples: {
      one: [1],
      few: [2, 3, 4, 22, 23, 24],
      many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 25],
      other: [1.5, 2.5],
    },
  },

  // Turkish: one, other
  tr: {
    locale: "tr",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Swedish: one, other
  sv: {
    locale: "sv",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Thai: other only
  th: {
    locale: "th",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Vietnamese: other only
  vi: {
    locale: "vi",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Indonesian: other only
  id: {
    locale: "id",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Hindi: one, other
  hi: {
    locale: "hi",
    cardinalForms: ["one", "other"],
    ordinalForms: ["one", "two", "few", "many", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 1) return "one";
        if (n === 2 || n === 3) return "two";
        if (n === 4) return "few";
        if (n === 6) return "many";
        return "other";
      }
      const { i } = getNumberParts(n);
      if (i === 0 || n === 1) return "one";
      return "other";
    },
    examples: {
      one: [0, 1],
      other: [2, 3, 4, 5, 10, 100],
    },
  },

  // Persian/Farsi: one, other
  fa: {
    locale: "fa",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i } = getNumberParts(n);
      if (i === 0 || n === 1) return "one";
      return "other";
    },
    examples: {
      one: [0, 1],
      other: [2, 3, 5, 10, 100],
    },
  },

  // Ukrainian: one, few, many, other
  uk: {
    locale: "uk",
    cardinalForms: ["one", "few", "many", "other"],
    ordinalForms: ["few", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 3) return "few";
        return "other";
      }
      const { i, v } = getNumberParts(n);
      const mod10 = i % 10;
      const mod100 = i % 100;

      if (v !== 0) return "other";
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        return "few";
      return "many";
    },
    examples: {
      one: [1, 21, 31, 41],
      few: [2, 3, 4, 22, 23, 24],
      many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 25],
      other: [1.5, 2.5],
    },
  },

  // Czech: one, few, many, other
  cs: {
    locale: "cs",
    cardinalForms: ["one", "few", "many", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      if (i >= 2 && i <= 4 && v === 0) return "few";
      if (v !== 0) return "many";
      return "other";
    },
    examples: {
      one: [1],
      few: [2, 3, 4],
      many: [1.5, 2.5],
      other: [0, 5, 6, 10, 100],
    },
  },

  // Romanian: one, few, other
  ro: {
    locale: "ro",
    cardinalForms: ["one", "few", "other"],
    ordinalForms: ["one", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 1) return "one";
        return "other";
      }
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      const mod100 = v !== 0 ? Math.floor(n * 100) % 100 : i % 100;
      if (v !== 0 || n === 0 || (mod100 >= 2 && mod100 <= 19)) return "few";
      return "other";
    },
    examples: {
      one: [1],
      few: [0, 2, 3, 4, 15, 16, 17, 18, 19, 102],
      other: [20, 21, 100, 101],
    },
  },

  // Danish: one, other
  da: {
    locale: "da",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Finnish: one, other
  fi: {
    locale: "fi",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      const { i, v } = getNumberParts(n);
      if (i === 1 && v === 0) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Norwegian: one, other
  no: {
    locale: "no",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Greek: one, other
  el: {
    locale: "el",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Hungarian: one, other
  hu: {
    locale: "hu",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Malay: other only
  ms: {
    locale: "ms",
    cardinalForms: ["other"],
    ordinalForms: ["one", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 1) return "one";
        return "other";
      }
      return "other";
    },
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },

  // Bengali: one, other
  bn: {
    locale: "bn",
    cardinalForms: ["one", "other"],
    ordinalForms: ["one", "two", "few", "many", "other"],
    rule: (n, opts) => {
      if (opts?.type === "ordinal") {
        if (n === 1 || n === 5 || n === 7 || n === 8 || n === 9 || n === 10)
          return "one";
        if (n === 2 || n === 3) return "two";
        if (n === 4) return "few";
        if (n === 6) return "many";
        return "other";
      }
      const { i } = getNumberParts(n);
      if (i === 0 || n === 1) return "one";
      return "other";
    },
    examples: {
      one: [0, 1],
      other: [2, 3, 4, 5, 10, 100],
    },
  },

  // Tamil: one, other
  ta: {
    locale: "ta",
    cardinalForms: ["one", "other"],
    ordinalForms: ["other"],
    rule: (n) => {
      if (n === 1) return "one";
      return "other";
    },
    examples: {
      one: [1],
      other: [0, 2, 3, 5, 10, 100],
    },
  },

  // Chinese (Traditional): other only
  "zh-TW": {
    locale: "zh-TW",
    cardinalForms: ["other"],
    ordinalForms: ["other"],
    rule: () => "other",
    examples: {
      other: [0, 1, 2, 3, 10, 100],
    },
  },
};

/**
 * Get the extended plural rule for a locale.
 * Falls back to English if locale not found.
 */
export function getExtendedPluralRule(locale: string): PluralFormDefinition {
  if (locale in extendedPluralRules) {
    return extendedPluralRules[locale];
  }

  // Try base language
  const base = locale.split("-")[0];
  if (base in extendedPluralRules) {
    return extendedPluralRules[base];
  }

  // Fallback to English
  return extendedPluralRules.en;
}

/**
 * Get the plural category for a number in a locale,
 * using the extended rules.
 */
export function getExtendedPluralCategory(
  locale: string,
  count: number,
  type: "cardinal" | "ordinal" = "cardinal",
): PluralCategory {
  const def = getExtendedPluralRule(locale);
  return def.rule(Math.abs(count), { type });
}

/**
 * Get all required cardinal plural forms for a locale.
 */
export function getRequiredPluralForms(locale: string): PluralCategory[] {
  return getExtendedPluralRule(locale).cardinalForms;
}

/**
 * Get all required ordinal plural forms for a locale.
 */
export function getRequiredOrdinalForms(locale: string): PluralCategory[] {
  return getExtendedPluralRule(locale).ordinalForms;
}

/**
 * Get example numbers for each plural category of a locale.
 */
export function getPluralExamples(
  locale: string,
): Partial<Record<PluralCategory, number[]>> {
  return getExtendedPluralRule(locale).examples;
}

/**
 * Validate that a set of translation keys covers all required plural forms.
 */
export function validatePluralKeys(
  keys: string[],
  locale: string,
  separator: string = "_",
): { complete: boolean; missing: string[] } {
  const required = getRequiredPluralForms(locale);
  const baseKeys = new Set<string>();

  // Identify plural base keys
  for (const key of keys) {
    const lastSep = key.lastIndexOf(separator);
    if (lastSep === -1) continue;
    const suffix = key.substring(lastSep + separator.length);
    const allForms: PluralCategory[] = [
      "zero",
      "one",
      "two",
      "few",
      "many",
      "other",
    ];
    if (allForms.includes(suffix as PluralCategory)) {
      baseKeys.add(key.substring(0, lastSep));
    }
  }

  const missing: string[] = [];
  for (const baseKey of baseKeys) {
    for (const form of required) {
      const fullKey = `${baseKey}${separator}${form}`;
      if (!keys.includes(fullKey)) {
        missing.push(fullKey);
      }
    }
  }

  return { complete: missing.length === 0, missing };
}
