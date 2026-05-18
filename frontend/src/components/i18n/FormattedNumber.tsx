"use client";

/**
 * FormattedNumber Component
 *
 * Renders numbers formatted according to the current locale.
 */

import * as React from "react";
import { useMemo } from "react";

import { useLocaleStore } from "@/stores/locale-store";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatBytes,
  formatCompact,
  type NumberFormatOptions,
  type CurrencyFormatOptions,
  type PercentFormatOptions,
} from "@/lib/i18n/number-formats";

// ============================================================================
// FormattedNumber Component
// ============================================================================

interface FormattedNumberProps extends Omit<NumberFormatOptions, "locale"> {
  /** Number to format */
  value: number;
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

export function FormattedNumber({
  value,
  className,
  as = "span",
  ...options
}: FormattedNumberProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedNumber = useMemo(
    () => formatNumber(value, { locale, ...options }),
    [value, locale, options],
  );

  const Component = as as React.ElementType;
  return <Component className={className}>{formattedNumber}</Component>;
}

// ============================================================================
// FormattedCurrency Component
// ============================================================================

interface FormattedCurrencyProps extends Omit<CurrencyFormatOptions, "locale"> {
  /** Amount to format */
  value: number;
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

export function FormattedCurrency({
  value,
  className,
  as = "span",
  ...options
}: FormattedCurrencyProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedCurrency = useMemo(
    () => formatCurrency(value, { locale, ...options }),
    [value, locale, options],
  );

  const Component = as as React.ElementType;
  return <Component className={className}>{formattedCurrency}</Component>;
}

// ============================================================================
// FormattedPercent Component
// ============================================================================

interface FormattedPercentProps extends Omit<PercentFormatOptions, "locale"> {
  /** Value to format (0.5 = 50% if multiply=true) */
  value: number;
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

export function FormattedPercent({
  value,
  className,
  as = "span",
  ...options
}: FormattedPercentProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedPercent = useMemo(
    () => formatPercent(value, { locale, ...options }),
    [value, locale, options],
  );

  const Component = as as React.ElementType;
  return <Component className={className}>{formattedPercent}</Component>;
}

// ============================================================================
// FormattedBytes Component
// ============================================================================

interface FormattedBytesProps {
  /** Bytes to format */
  value: number;
  /** Decimal places */
  decimals?: number;
  /** Use binary units (KiB, MiB) instead of SI (KB, MB) */
  binary?: boolean;
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

export function FormattedBytes({
  value,
  decimals = 1,
  binary = false,
  className,
  as = "span",
}: FormattedBytesProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedBytes = useMemo(
    () => formatBytes(value, { locale, decimals, binary }),
    [value, locale, decimals, binary],
  );

  const Component = as as React.ElementType;
  return <Component className={className}>{formattedBytes}</Component>;
}

// ============================================================================
// CompactNumber Component
// ============================================================================

interface CompactNumberProps {
  /** Number to format */
  value: number;
  /** Display style: 'short' (1K) or 'long' (1 thousand) */
  compactDisplay?: "short" | "long";
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

export function CompactNumber({
  value,
  compactDisplay = "short",
  className,
  as = "span",
}: CompactNumberProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedNumber = useMemo(
    () => formatCompact(value, { locale, compactDisplay }),
    [value, locale, compactDisplay],
  );

  const Component = as as React.ElementType;
  return <Component className={className}>{formattedNumber}</Component>;
}

export default FormattedNumber;
