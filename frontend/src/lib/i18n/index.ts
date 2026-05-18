/**
 * i18n Module Index
 *
 * Exports all i18n utilities for the nself-chat application.
 */

// Configuration
export { i18nConfig, type I18nConfig, type Namespace } from "./i18n-config";
export {
  parseTranslationKey,
  buildTranslationKey,
  isValidNamespace,
} from "./i18n-config";

// Locales
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  RTL_LOCALES,
  LTR_LOCALES,
  LOCALE_CODES,
  type LocaleCode,
  type LocaleConfig,
  isValidLocale,
  getLocaleConfig,
  getSortedLocales,
  getCompleteLocales,
  getLocalesByDirection,
} from "./locales";

// Translator
export {
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
  type TranslateOptions,
  type InterpolationValues,
  type TranslationValue,
  type TranslationObject,
  type TranslationStore,
} from "./translator";

// Plurals
export {
  getPluralCategory,
  getPluralKeySuffix,
  buildPluralKey,
  getLocalePluralForms,
  localeHasPluralCategory,
  getOrdinalCategory,
  getEnglishOrdinalSuffix,
  formatOrdinal as formatPluralOrdinal,
  pluralRules,
  ordinalRules,
  type PluralCategory,
  type PluralRuleFunction,
} from "./plurals";

// Date Formatting
export {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatDateDistance,
  formatStrictDistance,
  formatRelativeDate,
  formatSmartDate,
  formatMessageTime,
  formatDateForInput,
  formatDateTimeForInput,
  getDateFnsLocale,
  getDatePattern,
  dateFormatPatterns,
  type DateFormatPatterns,
  type FormatDateOptions,
} from "./date-formats";

// Number Formatting
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatBytes,
  formatCompact,
  formatDuration,
  formatWithSign,
  formatRange,
  formatOrdinal as formatNumberOrdinal,
  getLocaleSeparators,
  parseLocalizedNumber,
  defaultCurrencies,
  type NumberFormatOptions,
  type CurrencyFormatOptions,
  type PercentFormatOptions,
} from "./number-formats";

// RTL Support
export {
  isRTL,
  getDirection,
  getTextAlign,
  flipPosition,
  rtlClass,
  rtlStyles,
  rtlTransform,
  rtlFlexDirection,
  applyDocumentDirection,
  getRTLCSSVariables,
  rtlTailwind,
  isDocumentRTL,
  isolateBidi,
  logicalProperties,
} from "./rtl";

// Language Detection
export {
  detectLanguage,
  clearDetectionCache,
  persistLocale,
  clearPersistedLocale,
  parseAcceptLanguage,
  detectFromHeaders,
  type DetectionSource,
  type DetectionResult,
  type DetectorOptions,
} from "./language-detector";

// Locale Validator
export {
  extractInterpolationVars,
  flattenTranslationObject,
  isPlaceholderValue,
  extractPluralBaseKey,
  validateInterpolation,
  checkPluralCoverage,
  validateLocale,
  validateAllLocales,
  formatValidationReport,
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationIssueType,
  type LocaleValidationResult,
  type FullValidationResult,
  type ValidatorOptions,
} from "./locale-validator";

// RTL Utilities (Extended)
export {
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
  type DirectionAnalysis,
} from "./rtl-utils";

// Extended Plural Rules
export {
  extendedPluralRules,
  getExtendedPluralRule,
  getExtendedPluralCategory,
  getRequiredPluralForms,
  getRequiredOrdinalForms,
  getPluralExamples,
  validatePluralKeys,
  type ExtendedPluralRule,
  type PluralFormDefinition,
} from "./plural-rules";

// Format Utilities
export {
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
  type DateFormatPreset,
  type TimeFormatPreset,
  type RelativeTimeUnit,
} from "./format-utils";
