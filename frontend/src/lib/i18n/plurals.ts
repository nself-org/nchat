/**
 * Plural Rules
 *
 * Implements CLDR plural rules for different languages.
 * Based on Unicode CLDR plural rules: https://cldr.unicode.org/index/cldr-spec/plural-rules
 */

/**
 * Plural categories as defined by CLDR
 */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Plural rule function type
 */
export type PluralRuleFunction = (n: number) => PluralCategory;

/**
 * Plural rules for each supported locale
 * These are based on CLDR plural rules
 */
export const pluralRules: Record<string, PluralRuleFunction> = {
  /**
   * English: one, other
   * "one" for n=1, "other" for everything else
   */
  en: (n: number): PluralCategory => {
    if (n === 1) return "one";
    return "other";
  },

  /**
   * Spanish: one, other
   * Same as English
   */
  es: (n: number): PluralCategory => {
    if (n === 1) return "one";
    return "other";
  },

  /**
   * French: one, other
   * "one" for 0 and 1, "other" for everything else
   */
  fr: (n: number): PluralCategory => {
    if (n === 0 || n === 1) return "one";
    return "other";
  },

  /**
   * German: one, other
   * Same as English
   */
  de: (n: number): PluralCategory => {
    if (n === 1) return "one";
    return "other";
  },

  /**
   * Arabic: zero, one, two, few, many, other
   * Most complex plural system
   */
  ar: (n: number): PluralCategory => {
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    const mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return "few";
    if (mod100 >= 11 && mod100 <= 99) return "many";
    return "other";
  },

  /**
   * Chinese: other only
   * Chinese doesn't have plural forms
   */
  zh: (): PluralCategory => {
    return "other";
  },

  /**
   * Japanese: other only
   * Japanese doesn't have plural forms
   */
  ja: (): PluralCategory => {
    return "other";
  },

  /**
   * Portuguese: one, other
   * Same as English
   */
  pt: (n: number): PluralCategory => {
    if (n === 1) return "one";
    return "other";
  },

  /**
   * Russian: one, few, many, other
   * Complex Slavic plural system
   */
  ru: (n: number): PluralCategory => {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "few";
    return "many";
  },
};

/**
 * Get plural category for a number in a given locale
 */
export function getPluralCategory(
  locale: string,
  count: number,
): PluralCategory {
  const absoluteCount = Math.abs(count);
  const rule = pluralRules[locale];

  if (!rule) {
    // Default to English-like pluralization
    return absoluteCount === 1 ? "one" : "other";
  }

  return rule(absoluteCount);
}

/**
 * Get the plural key suffix for a translation
 */
export function getPluralKeySuffix(
  locale: string,
  count: number,
  separator: string = "_",
): string {
  const category = getPluralCategory(locale, count);
  return `${separator}${category}`;
}

/**
 * Build plural translation key
 */
export function buildPluralKey(
  baseKey: string,
  locale: string,
  count: number,
  separator: string = "_",
): string {
  const suffix = getPluralKeySuffix(locale, count, separator);
  return `${baseKey}${suffix}`;
}

/**
 * Get all possible plural forms for a locale
 */
export function getLocalePluralForms(locale: string): PluralCategory[] {
  switch (locale) {
    case "ar":
      return ["zero", "one", "two", "few", "many", "other"];
    case "ru":
      return ["one", "few", "many", "other"];
    case "zh":
    case "ja":
      return ["other"];
    case "fr":
      return ["one", "other"];
    default:
      // English, Spanish, German, Portuguese
      return ["one", "other"];
  }
}

/**
 * Check if a locale supports a specific plural category
 */
export function localeHasPluralCategory(
  locale: string,
  category: PluralCategory,
): boolean {
  const forms = getLocalePluralForms(locale);
  return forms.includes(category);
}

/**
 * Ordinal plural rules (1st, 2nd, 3rd, etc.)
 */
export const ordinalRules: Record<string, PluralRuleFunction> = {
  en: (n: number): PluralCategory => {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 === 2 && mod100 !== 12) return "two";
    if (mod10 === 3 && mod100 !== 13) return "few";
    return "other";
  },

  // Most languages use 'other' for ordinals
  es: (): PluralCategory => "other",
  fr: (n: number): PluralCategory => (n === 1 ? "one" : "other"),
  de: (): PluralCategory => "other",
  ar: (): PluralCategory => "other",
  zh: (): PluralCategory => "other",
  ja: (): PluralCategory => "other",
  pt: (): PluralCategory => "other",
  ru: (): PluralCategory => "other",
};

/**
 * Get ordinal plural category
 */
export function getOrdinalCategory(
  locale: string,
  count: number,
): PluralCategory {
  const rule = ordinalRules[locale] || ordinalRules.en;
  return rule(Math.abs(count));
}

/**
 * Get ordinal suffix for English
 * e.g., 1 -> "st", 2 -> "nd", 3 -> "rd", 4 -> "th"
 */
export function getEnglishOrdinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

/**
 * Format number as ordinal in English
 * e.g., 1 -> "1st", 2 -> "2nd"
 */
export function formatOrdinal(n: number, locale: string = "en"): string {
  if (locale === "en") {
    return `${n}${getEnglishOrdinalSuffix(n)}`;
  }
  // For other locales, just return the number
  // Full ordinal support would require more locale-specific data
  return n.toString();
}
