/**
 * Locale Store - Manages language preferences for nself-chat
 *
 * Uses Zustand with persistence to maintain locale state across sessions.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  DEFAULT_LOCALE,
  isValidLocale,
  type LocaleCode,
  type LocaleConfig,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/locales";
import {
  setCurrentLocale,
  registerTranslations,
  type TranslationObject,
} from "@/lib/i18n/translator";
import { applyDocumentDirection, getDirection } from "@/lib/i18n/rtl";
import { persistLocale, detectLanguage } from "@/lib/i18n/language-detector";
import { i18nConfig } from "@/lib/i18n/i18n-config";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface LocaleState {
  /** Current active locale */
  currentLocale: LocaleCode;
  /** Whether locale has been initialized */
  isInitialized: boolean;
  /** Loaded namespaces for each locale */
  loadedNamespaces: Record<string, string[]>;
  /** Loading state for translations */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** User's preferred locale (may differ from current if translations not loaded) */
  preferredLocale: LocaleCode | null;
  /** Whether to use browser detection */
  useBrowserDetection: boolean;
}

export interface LocaleActions {
  /** Initialize locale from storage or browser detection */
  initializeLocale: () => Promise<void>;
  /** Set the current locale */
  setLocale: (locale: LocaleCode) => Promise<void>;
  /** Load translations for a namespace */
  loadNamespace: (namespace: string, locale?: LocaleCode) => Promise<void>;
  /** Load all namespaces for a locale */
  loadAllNamespaces: (locale?: LocaleCode) => Promise<void>;
  /** Toggle browser detection */
  setUseBrowserDetection: (enabled: boolean) => void;
  /** Clear error state */
  clearError: () => void;
  /** Reset to default locale */
  resetLocale: () => Promise<void>;
}

export type LocaleStore = LocaleState & LocaleActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: LocaleState = {
  currentLocale: DEFAULT_LOCALE as LocaleCode,
  isInitialized: false,
  loadedNamespaces: {},
  isLoading: false,
  error: null,
  preferredLocale: null,
  useBrowserDetection: true,
};

// ============================================================================
// Translation Loader
// ============================================================================

/**
 * Dynamic import for translation files
 */
async function loadTranslationFile(
  locale: string,
  namespace: string,
): Promise<TranslationObject | null> {
  try {
    // Dynamic import of translation files
    const module = await import(`@/locales/${locale}/${namespace}.json`);
    return module.default || module;
  } catch (error) {
    logger.warn(`[i18n] Failed to load ${locale}/${namespace}.json:`, {
      context: error,
    });
    return null;
  }
}

// ============================================================================
// Store
// ============================================================================

export const useLocaleStore = create<LocaleStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        initializeLocale: async () => {
          const state = get();
          if (state.isInitialized) return;

          set(
            (draft) => {
              draft.isLoading = true;
              draft.error = null;
            },
            false,
            "locale/initializeLocale/start",
          );

          try {
            // Detect or use saved locale
            let locale: LocaleCode;

            if (state.preferredLocale && isValidLocale(state.preferredLocale)) {
              locale = state.preferredLocale;
            } else if (state.useBrowserDetection) {
              const detected = detectLanguage();
              locale = detected.locale;
            } else {
              locale = DEFAULT_LOCALE as LocaleCode;
            }

            // Load default namespaces for the locale
            const namespaces = ["common", "chat"];
            for (const ns of namespaces) {
              const translations = await loadTranslationFile(locale, ns);
              if (translations) {
                registerTranslations(locale, ns, translations);
              }
            }

            // Also load fallback locale if different
            if (locale !== DEFAULT_LOCALE) {
              for (const ns of namespaces) {
                const fallbackTranslations = await loadTranslationFile(
                  DEFAULT_LOCALE,
                  ns,
                );
                if (fallbackTranslations) {
                  registerTranslations(
                    DEFAULT_LOCALE,
                    ns,
                    fallbackTranslations,
                  );
                }
              }
            }

            // Apply locale
            setCurrentLocale(locale);
            applyDocumentDirection(locale);
            persistLocale(locale);

            set(
              (draft) => {
                draft.currentLocale = locale;
                draft.isInitialized = true;
                draft.isLoading = false;
                draft.loadedNamespaces[locale] = namespaces;
                if (locale !== DEFAULT_LOCALE) {
                  draft.loadedNamespaces[DEFAULT_LOCALE] = namespaces;
                }
              },
              false,
              "locale/initializeLocale/success",
            );
          } catch (error) {
            logger.error("[i18n] Failed to initialize locale:", error);
            set(
              (draft) => {
                draft.isLoading = false;
                draft.error =
                  error instanceof Error
                    ? error.message
                    : "Failed to initialize locale";
                draft.isInitialized = true;
              },
              false,
              "locale/initializeLocale/error",
            );
          }
        },

        setLocale: async (locale: LocaleCode) => {
          if (!isValidLocale(locale)) {
            logger.warn(`[i18n] Invalid locale: ${locale}`);
            return;
          }

          const state = get();
          if (state.currentLocale === locale && state.isInitialized) {
            return;
          }

          set(
            (draft) => {
              draft.isLoading = true;
              draft.error = null;
            },
            false,
            "locale/setLocale/start",
          );

          try {
            // Load all required namespaces for new locale
            const namespacesToLoad = state.loadedNamespaces[
              state.currentLocale
            ] || ["common", "chat"];

            for (const ns of namespacesToLoad) {
              if (!state.loadedNamespaces[locale]?.includes(ns)) {
                const translations = await loadTranslationFile(locale, ns);
                if (translations) {
                  registerTranslations(locale, ns, translations);
                }
              }
            }

            // Apply new locale
            setCurrentLocale(locale);
            applyDocumentDirection(locale);
            persistLocale(locale);

            set(
              (draft) => {
                draft.currentLocale = locale;
                draft.preferredLocale = locale;
                draft.isLoading = false;
                if (!draft.loadedNamespaces[locale]) {
                  draft.loadedNamespaces[locale] = [];
                }
                for (const ns of namespacesToLoad) {
                  if (!draft.loadedNamespaces[locale].includes(ns)) {
                    draft.loadedNamespaces[locale].push(ns);
                  }
                }
              },
              false,
              "locale/setLocale/success",
            );
          } catch (error) {
            logger.error("[i18n] Failed to set locale:", error);
            set(
              (draft) => {
                draft.isLoading = false;
                draft.error =
                  error instanceof Error
                    ? error.message
                    : "Failed to set locale";
              },
              false,
              "locale/setLocale/error",
            );
          }
        },

        loadNamespace: async (namespace: string, locale?: LocaleCode) => {
          const state = get();
          const targetLocale = locale || state.currentLocale;

          // Check if already loaded
          if (state.loadedNamespaces[targetLocale]?.includes(namespace)) {
            return;
          }

          set(
            (draft) => {
              draft.isLoading = true;
            },
            false,
            "locale/loadNamespace/start",
          );

          try {
            const translations = await loadTranslationFile(
              targetLocale,
              namespace,
            );
            if (translations) {
              registerTranslations(targetLocale, namespace, translations);
            }

            // Also load fallback if needed
            if (targetLocale !== DEFAULT_LOCALE) {
              const fallbackTranslations = await loadTranslationFile(
                DEFAULT_LOCALE,
                namespace,
              );
              if (fallbackTranslations) {
                registerTranslations(
                  DEFAULT_LOCALE,
                  namespace,
                  fallbackTranslations,
                );
              }
            }

            set(
              (draft) => {
                draft.isLoading = false;
                if (!draft.loadedNamespaces[targetLocale]) {
                  draft.loadedNamespaces[targetLocale] = [];
                }
                if (!draft.loadedNamespaces[targetLocale].includes(namespace)) {
                  draft.loadedNamespaces[targetLocale].push(namespace);
                }
              },
              false,
              "locale/loadNamespace/success",
            );
          } catch (error) {
            logger.error(
              `[i18n] Failed to load namespace ${namespace}:`,
              error,
            );
            set(
              (draft) => {
                draft.isLoading = false;
              },
              false,
              "locale/loadNamespace/error",
            );
          }
        },

        loadAllNamespaces: async (locale?: LocaleCode) => {
          const state = get();
          const targetLocale = locale || state.currentLocale;

          set(
            (draft) => {
              draft.isLoading = true;
            },
            false,
            "locale/loadAllNamespaces/start",
          );

          try {
            for (const ns of i18nConfig.namespaces) {
              if (!state.loadedNamespaces[targetLocale]?.includes(ns)) {
                const translations = await loadTranslationFile(
                  targetLocale,
                  ns,
                );
                if (translations) {
                  registerTranslations(targetLocale, ns, translations);
                }
              }
            }

            set(
              (draft) => {
                draft.isLoading = false;
                draft.loadedNamespaces[targetLocale] = [
                  ...i18nConfig.namespaces,
                ];
              },
              false,
              "locale/loadAllNamespaces/success",
            );
          } catch (error) {
            logger.error("[i18n] Failed to load all namespaces:", error);
            set(
              (draft) => {
                draft.isLoading = false;
              },
              false,
              "locale/loadAllNamespaces/error",
            );
          }
        },

        setUseBrowserDetection: (enabled: boolean) => {
          set(
            (draft) => {
              draft.useBrowserDetection = enabled;
            },
            false,
            "locale/setUseBrowserDetection",
          );
        },

        clearError: () => {
          set(
            (draft) => {
              draft.error = null;
            },
            false,
            "locale/clearError",
          );
        },

        resetLocale: async () => {
          set(
            (draft) => {
              draft.preferredLocale = null;
            },
            false,
            "locale/resetLocale",
          );

          await get().setLocale(DEFAULT_LOCALE as LocaleCode);
        },
      })),
      {
        name: i18nConfig.storageKey,
        partialize: (state) => ({
          preferredLocale: state.preferredLocale,
          useBrowserDetection: state.useBrowserDetection,
        }),
      },
    ),
    { name: "locale-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentLocale = (state: LocaleStore) => state.currentLocale;

export const selectLocaleConfig = (
  state: LocaleStore,
): LocaleConfig | undefined => SUPPORTED_LOCALES[state.currentLocale];

export const selectIsRTL = (state: LocaleStore): boolean =>
  getDirection(state.currentLocale) === "rtl";

export const selectIsLocaleLoading = (state: LocaleStore) => state.isLoading;

export const selectLocaleError = (state: LocaleStore) => state.error;

export const selectIsNamespaceLoaded = (
  state: LocaleStore,
  namespace: string,
  locale?: string,
): boolean => {
  const targetLocale = locale || state.currentLocale;
  return state.loadedNamespaces[targetLocale]?.includes(namespace) ?? false;
};
