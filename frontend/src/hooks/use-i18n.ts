/**
 * i18n Hooks
 *
 * Custom hooks for using i18n features in the application.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, getCurrentLanguage, isRTL } from "@/lib/i18n/config";
import {
  getLocaleConfig,
  type LocaleCode,
  LOCALE_CODES,
} from "@/lib/i18n/locales";

/**
 * Hook for using i18n with additional utilities
 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  const [currentLocale, setCurrentLocale] = useState(getCurrentLanguage());
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");

  // Update locale state when language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLocale(lng);
      const localeConfig = getLocaleConfig(lng);
      if (localeConfig) {
        setDirection(localeConfig.direction);
      }
    };

    i18n.on("languageChanged", handleLanguageChange);

    // Initial setup
    handleLanguageChange(i18n.language);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  /**
   * Change the current language
   */
  const setLocale = useCallback(async (locale: string) => {
    const success = await changeLanguage(locale);
    if (success) {
      setCurrentLocale(locale);
    }
    return success;
  }, []);

  /**
   * Get locale configuration
   */
  const localeConfig = getLocaleConfig(currentLocale);

  return {
    t,
    i18n,
    locale: currentLocale,
    setLocale,
    direction,
    isRTL: direction === "rtl",
    localeConfig,
    availableLocales: LOCALE_CODES,
  };
}

/**
 * Hook for managing language preferences
 */
export function useLanguagePreference() {
  const { locale, setLocale } = useI18n();
  const [savedLocale, setSavedLocale] = useState<string | null>(null);

  // Load saved preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("i18nextLng");
      setSavedLocale(saved);
    }
  }, []);

  /**
   * Save language preference
   */
  const savePreference = useCallback(
    async (lng: string) => {
      const success = await setLocale(lng);
      if (success && typeof window !== "undefined") {
        localStorage.setItem("i18nextLng", lng);
        setSavedLocale(lng);
      }
      return success;
    },
    [setLocale],
  );

  /**
   * Clear language preference
   */
  const clearPreference = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("i18nextLng");
      setSavedLocale(null);
    }
  }, []);

  return {
    currentLocale: locale,
    savedLocale,
    savePreference,
    clearPreference,
    hasSavedPreference: savedLocale !== null,
  };
}

/**
 * Hook for RTL support
 */
export function useRTL() {
  const { locale } = useI18n();
  const [rtl, setRTL] = useState(false);

  useEffect(() => {
    const isRTLLang = isRTL(locale);
    setRTL(isRTLLang);

    // Update document direction
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRTLLang ? "rtl" : "ltr";
    }
  }, [locale]);

  return rtl;
}

/**
 * Hook for date formatting with locale
 */
export function useDateFormat() {
  const { locale, localeConfig } = useI18n();

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const localeStr = localeConfig?.dateFnsLocale || locale;

      return new Intl.DateTimeFormat(localeStr, options).format(dateObj);
    },
    [locale, localeConfig],
  );

  const formatRelativeTime = useCallback(
    (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const diffInSeconds = Math.floor(
        (now.getTime() - dateObj.getTime()) / 1000,
      );

      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

      if (diffInSeconds < 60) {
        return rtf.format(-diffInSeconds, "second");
      } else if (diffInSeconds < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
      } else if (diffInSeconds < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
      } else if (diffInSeconds < 604800) {
        return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
      } else if (diffInSeconds < 2592000) {
        return rtf.format(-Math.floor(diffInSeconds / 604800), "week");
      } else if (diffInSeconds < 31536000) {
        return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
      } else {
        return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
      }
    },
    [locale],
  );

  return {
    formatDate,
    formatRelativeTime,
    locale,
  };
}

/**
 * Hook for number formatting with locale
 */
export function useNumberFormat() {
  const { locale, localeConfig } = useI18n();

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions) => {
      const localeStr = localeConfig?.numberLocale || locale;
      return new Intl.NumberFormat(localeStr, options).format(num);
    },
    [locale, localeConfig],
  );

  const formatCurrency = useCallback(
    (amount: number, currency: string = "USD") => {
      const localeStr = localeConfig?.numberLocale || locale;
      return new Intl.NumberFormat(localeStr, {
        style: "currency",
        currency,
      }).format(amount);
    },
    [locale, localeConfig],
  );

  const formatPercent = useCallback(
    (value: number, decimals: number = 0) => {
      const localeStr = localeConfig?.numberLocale || locale;
      return new Intl.NumberFormat(localeStr, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },
    [locale, localeConfig],
  );

  return {
    formatNumber,
    formatCurrency,
    formatPercent,
    locale,
  };
}
