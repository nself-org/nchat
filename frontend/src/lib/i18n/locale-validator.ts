/**
 * Locale Validator
 *
 * Validates locale files for completeness, placeholder detection,
 * and key coverage across all supported locales.
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type LocaleCode } from "./locales";
import { i18nConfig } from "./i18n-config";
import { getLocalePluralForms, type PluralCategory } from "./plurals";

/**
 * Validation issue severity
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * A single validation issue found in a locale file
 */
export interface ValidationIssue {
  /** The locale code where the issue was found */
  locale: string;
  /** The namespace of the file */
  namespace: string;
  /** The translation key with the issue */
  key: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Human-readable description of the issue */
  message: string;
  /** Issue type for programmatic filtering */
  type: ValidationIssueType;
}

/**
 * Types of validation issues
 */
export type ValidationIssueType =
  | "missing_key"
  | "placeholder_value"
  | "empty_value"
  | "untranslated"
  | "interpolation_mismatch"
  | "missing_plural_form"
  | "extra_key"
  | "invalid_nesting"
  | "suspicious_value";

/**
 * Validation result for a single locale
 */
export interface LocaleValidationResult {
  /** Locale code */
  locale: string;
  /** Total number of keys checked */
  totalKeys: number;
  /** Number of valid keys */
  validKeys: number;
  /** Number of issues found */
  issueCount: number;
  /** All issues found */
  issues: ValidationIssue[];
  /** Completion percentage (0-100) */
  completionPercent: number;
  /** Whether the locale passes validation */
  isValid: boolean;
}

/**
 * Validation result for all locales
 */
export interface FullValidationResult {
  /** Results per locale */
  locales: Record<string, LocaleValidationResult>;
  /** Total issues across all locales */
  totalIssues: number;
  /** Whether all locales pass validation */
  allValid: boolean;
  /** Summary of issue counts by type */
  issueSummary: Record<ValidationIssueType, number>;
}

/**
 * Validation options
 */
export interface ValidatorOptions {
  /** Reference locale (default: 'en') */
  referenceLocale?: string;
  /** Namespaces to validate (default: all from config) */
  namespaces?: string[];
  /** Whether to check for placeholder values like TODO/FIXME */
  checkPlaceholders?: boolean;
  /** Whether to check interpolation variable consistency */
  checkInterpolation?: boolean;
  /** Whether to check plural form coverage */
  checkPlurals?: boolean;
  /** Whether to check for extra keys not in reference */
  checkExtraKeys?: boolean;
  /** Whether to check for untranslated values (same as reference) */
  checkUntranslated?: boolean;
  /** Custom placeholder patterns to detect */
  placeholderPatterns?: RegExp[];
  /** Minimum severity to report */
  minSeverity?: ValidationSeverity;
}

/**
 * Default placeholder patterns that indicate untranslated content
 */
const DEFAULT_PLACEHOLDER_PATTERNS: RegExp[] = [
  /^TODO$/i,
  /^FIXME$/i,
  /^HACK$/i,
  /^XXX$/i,
  /^PLACEHOLDER$/i,
  /^TRANSLATE$/i,
  /^NEEDS?\s*TRANSLATION$/i,
  /^TBD$/i,
  /^\[.*\]$/, // Bracketed placeholders like [translate me]
  /^__.*__$/, // Dunder placeholders like __todo__
];

/**
 * Extract interpolation variables from a translation string.
 * Matches patterns like {{variable}} or {variable}.
 */
export function extractInterpolationVars(value: string): string[] {
  const vars: string[] = [];
  const regex = /\{\{?\s*(\w+)\s*\}?\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1]);
    }
  }
  return vars.sort();
}

/**
 * Flatten a nested translation object into dot-separated keys.
 */
export function flattenTranslationObject(
  obj: Record<string, unknown>,
  prefix: string = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      Object.assign(
        result,
        flattenTranslationObject(value as Record<string, unknown>, fullKey),
      );
    }
  }

  return result;
}

/**
 * Check if a value looks like a placeholder or untranslated content.
 */
export function isPlaceholderValue(
  value: string,
  patterns: RegExp[] = DEFAULT_PLACEHOLDER_PATTERNS,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  return patterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract base key from a plural key.
 * E.g., "messages_one" -> "messages", "time.seconds_other" -> "time.seconds"
 */
export function extractPluralBaseKey(
  key: string,
  pluralSeparator: string = "_",
): { baseKey: string; pluralForm: PluralCategory | null } {
  const pluralForms: PluralCategory[] = [
    "zero",
    "one",
    "two",
    "few",
    "many",
    "other",
  ];
  const lastSepIndex = key.lastIndexOf(pluralSeparator);

  if (lastSepIndex === -1) {
    return { baseKey: key, pluralForm: null };
  }

  const suffix = key.substring(lastSepIndex + pluralSeparator.length);
  if (pluralForms.includes(suffix as PluralCategory)) {
    return {
      baseKey: key.substring(0, lastSepIndex),
      pluralForm: suffix as PluralCategory,
    };
  }

  return { baseKey: key, pluralForm: null };
}

/**
 * Validate interpolation consistency between reference and target translations.
 */
export function validateInterpolation(
  referenceValue: string,
  targetValue: string,
): { valid: boolean; missingVars: string[]; extraVars: string[] } {
  const refVars = extractInterpolationVars(referenceValue);
  const targetVars = extractInterpolationVars(targetValue);

  const missingVars = refVars.filter((v) => !targetVars.includes(v));
  const extraVars = targetVars.filter((v) => !refVars.includes(v));

  return {
    valid: missingVars.length === 0 && extraVars.length === 0,
    missingVars,
    extraVars,
  };
}

/**
 * Check plural form coverage for a locale.
 * Returns missing plural forms that should exist.
 */
export function checkPluralCoverage(
  flatKeys: Record<string, string>,
  locale: string,
  pluralSeparator: string = "_",
): { baseKey: string; missingForms: PluralCategory[] }[] {
  const requiredForms = getLocalePluralForms(locale);
  const pluralBaseKeys = new Set<string>();

  // Identify all plural base keys
  for (const key of Object.keys(flatKeys)) {
    const { baseKey, pluralForm } = extractPluralBaseKey(key, pluralSeparator);
    if (pluralForm !== null) {
      pluralBaseKeys.add(baseKey);
    }
  }

  const results: { baseKey: string; missingForms: PluralCategory[] }[] = [];

  for (const baseKey of pluralBaseKeys) {
    const missingForms: PluralCategory[] = [];

    for (const form of requiredForms) {
      const pluralKey = `${baseKey}${pluralSeparator}${form}`;
      if (!(pluralKey in flatKeys)) {
        missingForms.push(form);
      }
    }

    if (missingForms.length > 0) {
      results.push({ baseKey, missingForms });
    }
  }

  return results;
}

/**
 * Validate a single locale against a reference locale.
 */
export function validateLocale(
  referenceKeys: Record<string, string>,
  targetKeys: Record<string, string>,
  locale: string,
  namespace: string,
  options: ValidatorOptions = {},
): ValidationIssue[] {
  const {
    referenceLocale = DEFAULT_LOCALE,
    checkPlaceholders = true,
    checkInterpolation = true,
    checkPlurals = true,
    checkExtraKeys = true,
    checkUntranslated = true,
    placeholderPatterns = DEFAULT_PLACEHOLDER_PATTERNS,
  } = options;

  const issues: ValidationIssue[] = [];

  // Check for missing keys
  for (const [key, refValue] of Object.entries(referenceKeys)) {
    if (!(key in targetKeys)) {
      issues.push({
        locale,
        namespace,
        key,
        severity: "error",
        message: `Missing key "${key}" (exists in ${referenceLocale})`,
        type: "missing_key",
      });
      continue;
    }

    const targetValue = targetKeys[key];

    // Check for empty values
    if (targetValue.trim().length === 0) {
      issues.push({
        locale,
        namespace,
        key,
        severity: "error",
        message: `Empty value for key "${key}"`,
        type: "empty_value",
      });
      continue;
    }

    // Check for placeholder values
    if (
      checkPlaceholders &&
      isPlaceholderValue(targetValue, placeholderPatterns)
    ) {
      issues.push({
        locale,
        namespace,
        key,
        severity: "error",
        message: `Placeholder value detected: "${targetValue}"`,
        type: "placeholder_value",
      });
    }

    // Check for untranslated values (same as reference)
    if (
      checkUntranslated &&
      locale !== referenceLocale &&
      targetValue === refValue &&
      // Exclude keys that are typically the same across locales
      !key.includes(".name") &&
      !key.endsWith(".app.name") &&
      !/^(nChat|nchat|OK)$/i.test(targetValue) &&
      // Exclude short values that may legitimately be the same
      targetValue.length > 3 &&
      // Exclude URLs
      !targetValue.startsWith("http")
    ) {
      issues.push({
        locale,
        namespace,
        key,
        severity: "warning",
        message: `Possibly untranslated: value is identical to ${referenceLocale}`,
        type: "untranslated",
      });
    }

    // Check interpolation consistency
    if (checkInterpolation) {
      const interpolationResult = validateInterpolation(refValue, targetValue);
      if (!interpolationResult.valid) {
        if (interpolationResult.missingVars.length > 0) {
          issues.push({
            locale,
            namespace,
            key,
            severity: "error",
            message: `Missing interpolation variables: ${interpolationResult.missingVars.join(", ")}`,
            type: "interpolation_mismatch",
          });
        }
        if (interpolationResult.extraVars.length > 0) {
          issues.push({
            locale,
            namespace,
            key,
            severity: "warning",
            message: `Extra interpolation variables: ${interpolationResult.extraVars.join(", ")}`,
            type: "interpolation_mismatch",
          });
        }
      }
    }
  }

  // Check for extra keys not in reference
  if (checkExtraKeys) {
    for (const key of Object.keys(targetKeys)) {
      if (!(key in referenceKeys)) {
        // Allow locale-specific plural forms (e.g., Arabic has _zero, _two, _few, _many)
        const { baseKey, pluralForm } = extractPluralBaseKey(
          key,
          i18nConfig.pluralSeparator,
        );
        const isLocaleSpecificPlural =
          pluralForm !== null && `${baseKey}_other` in referenceKeys;

        if (!isLocaleSpecificPlural) {
          issues.push({
            locale,
            namespace,
            key,
            severity: "info",
            message: `Extra key "${key}" not found in ${referenceLocale}`,
            type: "extra_key",
          });
        }
      }
    }
  }

  // Check plural form coverage
  if (checkPlurals) {
    const missingPlurals = checkPluralCoverage(
      targetKeys,
      locale,
      i18nConfig.pluralSeparator,
    );

    for (const { baseKey, missingForms } of missingPlurals) {
      issues.push({
        locale,
        namespace,
        key: baseKey,
        severity: "warning",
        message: `Missing plural forms for "${baseKey}": ${missingForms.join(", ")}`,
        type: "missing_plural_form",
      });
    }
  }

  return issues;
}

/**
 * Validate all locales against the reference locale.
 * Accepts pre-loaded translation data.
 */
export function validateAllLocales(
  translations: Record<string, Record<string, Record<string, unknown>>>,
  options: ValidatorOptions = {},
): FullValidationResult {
  const {
    referenceLocale = DEFAULT_LOCALE,
    namespaces = i18nConfig.namespaces as unknown as string[],
    minSeverity = "info",
  } = options;

  const severityOrder: Record<ValidationSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  const minSeverityLevel = severityOrder[minSeverity];

  const result: FullValidationResult = {
    locales: {},
    totalIssues: 0,
    allValid: true,
    issueSummary: {
      missing_key: 0,
      placeholder_value: 0,
      empty_value: 0,
      untranslated: 0,
      interpolation_mismatch: 0,
      missing_plural_form: 0,
      extra_key: 0,
      invalid_nesting: 0,
      suspicious_value: 0,
    },
  };

  const localeCodes = Object.keys(SUPPORTED_LOCALES);

  for (const locale of localeCodes) {
    const localeResult: LocaleValidationResult = {
      locale,
      totalKeys: 0,
      validKeys: 0,
      issueCount: 0,
      issues: [],
      completionPercent: 100,
      isValid: true,
    };

    for (const namespace of namespaces) {
      const refData = translations[referenceLocale]?.[namespace];
      const targetData = translations[locale]?.[namespace];

      if (!refData) continue;
      if (!targetData && locale !== referenceLocale) {
        // Entire namespace missing
        const refKeys = flattenTranslationObject(refData);
        const keyCount = Object.keys(refKeys).length;
        localeResult.totalKeys += keyCount;
        localeResult.issues.push({
          locale,
          namespace,
          key: "*",
          severity: "error",
          message: `Missing entire namespace "${namespace}" for locale "${locale}"`,
          type: "missing_key",
        });
        continue;
      }

      const refKeys = flattenTranslationObject(refData);
      const targetKeys = targetData ? flattenTranslationObject(targetData) : {};

      localeResult.totalKeys += Object.keys(refKeys).length;

      if (locale === referenceLocale) {
        localeResult.validKeys += Object.keys(refKeys).length;
        continue;
      }

      const issues = validateLocale(
        refKeys,
        targetKeys,
        locale,
        namespace,
        options,
      );
      const filteredIssues = issues.filter(
        (issue) => severityOrder[issue.severity] <= minSeverityLevel,
      );

      localeResult.issues.push(...filteredIssues);

      // Count valid keys (keys present and not flagged as errors)
      const errorKeys = new Set(
        filteredIssues.filter((i) => i.severity === "error").map((i) => i.key),
      );
      const validKeysInNs = Object.keys(refKeys).filter(
        (k) => k in targetKeys && !errorKeys.has(k),
      ).length;
      localeResult.validKeys += validKeysInNs;
    }

    localeResult.issueCount = localeResult.issues.length;
    localeResult.completionPercent =
      localeResult.totalKeys > 0
        ? Math.round((localeResult.validKeys / localeResult.totalKeys) * 100)
        : 100;
    localeResult.isValid =
      localeResult.issues.filter((i) => i.severity === "error").length === 0;

    result.locales[locale] = localeResult;
    result.totalIssues += localeResult.issueCount;

    if (!localeResult.isValid) {
      result.allValid = false;
    }

    // Update summary
    for (const issue of localeResult.issues) {
      result.issueSummary[issue.type]++;
    }
  }

  return result;
}

/**
 * Get a validation report as a formatted string.
 */
export function formatValidationReport(result: FullValidationResult): string {
  const lines: string[] = ["=== Locale Validation Report ===", ""];

  for (const [locale, localeResult] of Object.entries(result.locales)) {
    const status = localeResult.isValid ? "PASS" : "FAIL";
    lines.push(
      `[${status}] ${locale}: ${localeResult.completionPercent}% complete ` +
        `(${localeResult.validKeys}/${localeResult.totalKeys} keys, ${localeResult.issueCount} issues)`,
    );

    if (localeResult.issues.length > 0) {
      for (const issue of localeResult.issues) {
        lines.push(
          `  [${issue.severity.toUpperCase()}] ${issue.namespace}:${issue.key} - ${issue.message}`,
        );
      }
    }
  }

  lines.push("");
  lines.push(`Total issues: ${result.totalIssues}`);
  lines.push(`All valid: ${result.allValid}`);
  lines.push("");
  lines.push("Issue summary:");
  for (const [type, count] of Object.entries(result.issueSummary)) {
    if (count > 0) {
      lines.push(`  ${type}: ${count}`);
    }
  }

  return lines.join("\n");
}
