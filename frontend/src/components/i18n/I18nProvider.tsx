/**
 * I18n Provider Component
 *
 * Provides i18next context to the application and handles initialization.
 */

"use client";

import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { initializeI18n } from "@/lib/i18n/config";
import { getLocaleConfig } from "@/lib/i18n/locales";

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: string;
}

/**
 * I18n Provider
 */
export function I18nProvider({ children, locale }: I18nProviderProps) {
  const [i18nInstance, setI18nInstance] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize i18next
    const i18n = initializeI18n();

    // Set initial locale if provided
    if (locale && locale !== i18n.language) {
      i18n.changeLanguage(locale).catch(console.error);
    }

    // Update HTML attributes
    const updateHtmlAttributes = () => {
      if (typeof document !== "undefined") {
        const currentLang = i18n.language;
        const localeConfig = getLocaleConfig(currentLang);

        if (localeConfig) {
          document.documentElement.lang = currentLang;
          document.documentElement.dir = localeConfig.direction;
        }
      }
    };

    // Listen for language changes
    i18n.on("languageChanged", updateHtmlAttributes);

    // Initial update
    updateHtmlAttributes();

    setI18nInstance(i18n);
    setIsInitialized(true);

    return () => {
      i18n.off("languageChanged", updateHtmlAttributes);
    };
  }, [locale]);

  // Show loading state
  if (!isInitialized || !i18nInstance) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading translations...
          </p>
        </div>
      </div>
    );
  }

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}

/**
 * Hook to use i18n translation
 */
export { useTranslation } from "react-i18next";
