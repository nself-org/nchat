"use client";

/**
 * LocaleProvider Component
 *
 * Provides i18n context to the application and handles locale initialization.
 */

import { createContext, useContext, useEffect, type ReactNode } from "react";

import {
  useLocaleStore,
  selectIsRTL,
  selectLocaleConfig,
} from "@/stores/locale-store";
import { type LocaleCode, type LocaleConfig } from "@/lib/i18n/locales";

// ============================================================================
// Context
// ============================================================================

interface LocaleContextValue {
  /** Current locale code */
  locale: LocaleCode;
  /** Current locale configuration */
  localeConfig: LocaleConfig | undefined;
  /** Whether current locale is RTL */
  isRTL: boolean;
  /** Whether locale is loading */
  isLoading: boolean;
  /** Whether locale is initialized */
  isInitialized: boolean;
  /** Change the current locale */
  setLocale: (locale: LocaleCode) => Promise<void>;
  /** Load a translation namespace */
  loadNamespace: (namespace: string) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface LocaleProviderProps {
  children: ReactNode;
  /** Initial locale override */
  initialLocale?: LocaleCode;
  /** Namespaces to preload */
  preloadNamespaces?: string[];
}

export function LocaleProvider({
  children,
  initialLocale,
  preloadNamespaces,
}: LocaleProviderProps) {
  const {
    currentLocale,
    isInitialized,
    isLoading,
    initializeLocale,
    setLocale,
    loadNamespace,
  } = useLocaleStore();

  const localeConfig = useLocaleStore(selectLocaleConfig);
  const isRTL = useLocaleStore(selectIsRTL);

  // Initialize locale on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeLocale();
    }
  }, [isInitialized, initializeLocale]);

  // Handle initial locale override
  useEffect(() => {
    if (initialLocale && isInitialized && initialLocale !== currentLocale) {
      setLocale(initialLocale);
    }
  }, [initialLocale, isInitialized, currentLocale, setLocale]);

  // Preload specified namespaces
  useEffect(() => {
    if (isInitialized && preloadNamespaces) {
      for (const ns of preloadNamespaces) {
        loadNamespace(ns);
      }
    }
  }, [isInitialized, preloadNamespaces, loadNamespace]);

  const value: LocaleContextValue = {
    locale: currentLocale,
    localeConfig,
    isRTL,
    isLoading,
    isInitialized,
    setLocale,
    loadNamespace,
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useLocaleContext(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocaleContext must be used within a LocaleProvider");
  }
  return context;
}

export { LocaleContext };
