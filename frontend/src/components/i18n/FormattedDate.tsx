"use client";

/**
 * FormattedDate Component
 *
 * Renders dates formatted according to the current locale.
 */

import * as React from "react";
import { useMemo } from "react";

import { useLocaleStore } from "@/stores/locale-store";
import {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatSmartDate,
  formatMessageTime,
  type DateFormatPatterns,
} from "@/lib/i18n/date-formats";

// ============================================================================
// FormattedDate Component
// ============================================================================

interface FormattedDateProps {
  /** Date to format */
  date: Date | number | string;
  /** Format pattern or preset name */
  format?: keyof DateFormatPatterns | string;
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

export function FormattedDate({
  date,
  format = "medium",
  className,
  as = "time",
}: FormattedDateProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedDate = useMemo(
    () => formatDate(date, { pattern: format, locale }),
    [date, format, locale],
  );

  const isoDate = useMemo(() => {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toISOString();
  }, [date]);

  const Component = as as React.ElementType;

  if (as === "time") {
    return (
      <time dateTime={isoDate} className={className}>
        {formattedDate}
      </time>
    );
  }

  return <Component className={className}>{formattedDate}</Component>;
}

// ============================================================================
// FormattedTime Component
// ============================================================================

interface FormattedTimeProps {
  /** Date/time to format */
  date: Date | number | string;
  /** Include seconds */
  withSeconds?: boolean;
  /** Additional class name */
  className?: string;
}

export function FormattedTime({
  date,
  withSeconds = false,
  className,
}: FormattedTimeProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedTime = useMemo(
    () => formatTime(date, { locale, withSeconds }),
    [date, locale, withSeconds],
  );

  const isoDate = useMemo(() => {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toISOString();
  }, [date]);

  return (
    <time dateTime={isoDate} className={className}>
      {formattedTime}
    </time>
  );
}

// ============================================================================
// RelativeTime Component
// ============================================================================

interface RelativeTimeProps {
  /** Date to compare with now */
  date: Date | number | string;
  /** Include "ago" or "in" suffix */
  addSuffix?: boolean;
  /** Additional class name */
  className?: string;
  /** Update interval in milliseconds (0 = no auto-update) */
  updateInterval?: number;
}

export function RelativeTime({
  date,
  addSuffix = true,
  className,
}: RelativeTimeProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedTime = useMemo(
    () => formatRelativeTime(date, { locale, addSuffix }),
    [date, locale, addSuffix],
  );

  const isoDate = useMemo(() => {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toISOString();
  }, [date]);

  return (
    <time dateTime={isoDate} className={className} title={isoDate}>
      {formattedTime}
    </time>
  );
}

// ============================================================================
// SmartDate Component
// ============================================================================

interface SmartDateProps {
  /** Date to format */
  date: Date | number | string;
  /** Include time in output */
  showTime?: boolean;
  /** Additional class name */
  className?: string;
}

export function SmartDate({
  date,
  showTime = true,
  className,
}: SmartDateProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedDate = useMemo(
    () => formatSmartDate(date, { locale, showTime }),
    [date, locale, showTime],
  );

  const isoDate = useMemo(() => {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toISOString();
  }, [date]);

  return (
    <time dateTime={isoDate} className={className}>
      {formattedDate}
    </time>
  );
}

// ============================================================================
// MessageTime Component
// ============================================================================

interface MessageTimeProps {
  /** Message timestamp */
  date: Date | number | string;
  /** Additional class name */
  className?: string;
}

export function MessageTime({ date, className }: MessageTimeProps) {
  const locale = useLocaleStore((state) => state.currentLocale);

  const formattedTime = useMemo(
    () => formatMessageTime(date, { locale }),
    [date, locale],
  );

  const isoDate = useMemo(() => {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toISOString();
  }, [date]);

  return (
    <time dateTime={isoDate} className={className} title={isoDate}>
      {formattedTime}
    </time>
  );
}

export default FormattedDate;
