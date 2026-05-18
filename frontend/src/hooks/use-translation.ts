"use client";

/**
 * @fileoverview Translation hook for nself-chat
 *
 * Provides a React hook for accessing translations with support for
 * namespaces, interpolation, pluralization, and loading states.
 */

import { useCallback, useMemo } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import {
  translate,
  hasTranslation,
  type TranslateOptions,
  type InterpolationValues,
} from "@/lib/i18n/translator";

/**
 * Translation function type
 */
export type TFunction = (
  key: string,
  options?: TranslateOptions | InterpolationValues,
) => string;

/**
 * Translation hook return type
 */
export interface UseTranslationReturn {
  /** Translation function */
  t: TFunction;
  /** Current locale */
  locale: string;
  /** Check if translation exists */
  exists: (key: string) => boolean;
  /** Whether translations are loading */
  isLoading: boolean;
  /** Loading error if any */
  error: string | null;
}

/**
 * Options for use-translation hook
 */
export interface UseTranslationOptions {
  /** Namespace to use */
  ns?: string;
  /** Key prefix */
  keyPrefix?: string;
}

/**
 * Normalize options - convert simple values to TranslateOptions
 */
function normalizeOptions(
  options: TranslateOptions | InterpolationValues | undefined,
  ns?: string,
  keyPrefix?: string,
): TranslateOptions {
  if (!options) {
    return { ns };
  }

  // Check if options is TranslateOptions or just interpolation values
  if (
    "count" in options ||
    "context" in options ||
    "values" in options ||
    "ns" in options ||
    "locale" in options ||
    "defaultValue" in options
  ) {
    return {
      ...(options as TranslateOptions),
      ns: (options as TranslateOptions).ns || ns,
    };
  }

  // Options is just interpolation values
  return {
    ns,
    values: options as InterpolationValues,
  };
}

/**
 * Hook for accessing translations
 *
 * @param namespace - Default namespace to use
 * @param options - Additional options
 * @returns Translation utilities
 *
 * @example
 * ```tsx
 * const { t } = useTranslation('chat');
 *
 * return <h1>{t('title')}</h1>;
 * ```
 *
 * @example
 * ```tsx
 * const { t } = useTranslation('chat');
 *
 * return <p>{t('messages.count', { count: 5 })}</p>;
 * ```
 */
export function useTranslation(
  namespace?: string,
  options?: UseTranslationOptions,
): UseTranslationReturn {
  const currentLocale = useLocaleStore((state) => state.currentLocale);
  const isLoading = useLocaleStore((state) => state.isLoading);
  const error = useLocaleStore((state) => state.error);

  const ns = options?.ns || namespace;
  const keyPrefix = options?.keyPrefix;

  const t = useCallback<TFunction>(
    (key: string, opts?: TranslateOptions | InterpolationValues) => {
      const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
      const normalizedOptions = normalizeOptions(opts, ns, keyPrefix);
      return translate(fullKey, normalizedOptions);
    },
    [ns, keyPrefix],
  );

  const exists = useCallback(
    (key: string): boolean => {
      const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
      const fullKeyWithNs = ns ? `${ns}:${fullKey}` : fullKey;
      return hasTranslation(fullKeyWithNs, currentLocale);
    },
    [ns, keyPrefix, currentLocale],
  );

  return useMemo(
    () => ({
      t,
      locale: currentLocale,
      exists,
      isLoading,
      error,
    }),
    [t, currentLocale, exists, isLoading, error],
  );
}

/**
 * Create a namespaced translation hook
 *
 * @param namespace - Namespace to use
 * @returns A hook that uses the specified namespace
 *
 * @example
 * ```tsx
 * const useChatTranslation = createNamespacedUseTranslation('chat');
 *
 * function ChatComponent() {
 *   const { t } = useChatTranslation();
 *   return <h1>{t('title')}</h1>;
 * }
 * ```
 */
export function createNamespacedUseTranslation(namespace: string) {
  return function useNamespacedTranslation(
    options?: Omit<UseTranslationOptions, "ns">,
  ) {
    return useTranslation(namespace, options);
  };
}

/**
 * Hook for common namespace
 */
export function useCommonTranslation(
  options?: Omit<UseTranslationOptions, "ns">,
) {
  return useTranslation("common", options);
}

/**
 * Hook for chat namespace
 */
export function useChatTranslation(
  options?: Omit<UseTranslationOptions, "ns">,
) {
  return useTranslation("chat", options);
}

/**
 * Hook for settings namespace
 */
export function useSettingsTranslation(
  options?: Omit<UseTranslationOptions, "ns">,
) {
  return useTranslation("settings", options);
}

/**
 * Hook for admin namespace
 */
export function useAdminTranslation(
  options?: Omit<UseTranslationOptions, "ns">,
) {
  return useTranslation("admin", options);
}

/**
 * Hook for auth namespace
 */
export function useAuthTranslation(
  options?: Omit<UseTranslationOptions, "ns">,
) {
  return useTranslation("auth", options);
}

/**
 * Hook for errors namespace
 */
export function useErrorsTranslation(
  options?: Omit<UseTranslationOptions, "ns">,
) {
  return useTranslation("errors", options);
}

export default useTranslation;
