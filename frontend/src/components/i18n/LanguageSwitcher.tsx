"use client";

/**
 * LanguageSwitcher Component
 *
 * Dropdown component for selecting the application language.
 */

import { useState, useMemo, useCallback } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";
import {
  SUPPORTED_LOCALES,
  getSortedLocales,
  getCompleteLocales,
  type LocaleCode,
  type LocaleConfig,
} from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translator";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

interface LanguageSwitcherProps {
  /** Show only complete translations */
  showOnlyComplete?: boolean;
  /** Show native language name */
  showNativeName?: boolean;
  /** Show flag emoji */
  showFlag?: boolean;
  /** Custom trigger button */
  trigger?: React.ReactNode;
  /** Alignment of dropdown */
  align?: "start" | "center" | "end";
  /** Additional class name for trigger */
  className?: string;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Called when locale changes */
  onLocaleChange?: (locale: LocaleCode) => void;
}

// ============================================================================
// Component
// ============================================================================

export function LanguageSwitcher({
  showOnlyComplete = false,
  showNativeName = true,
  showFlag = true,
  trigger,
  align = "end",
  className,
  compact = false,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const { currentLocale, setLocale, isLoading } = useLocaleStore();
  const [isOpen, setIsOpen] = useState(false);

  // Get list of locales
  const locales = useMemo(() => {
    return showOnlyComplete ? getCompleteLocales() : getSortedLocales();
  }, [showOnlyComplete]);

  // Current locale config
  const currentLocaleConfig = SUPPORTED_LOCALES[currentLocale];

  // Handle locale selection
  const handleSelect = useCallback(
    async (locale: LocaleCode) => {
      if (locale === currentLocale) {
        setIsOpen(false);
        return;
      }

      await setLocale(locale);
      onLocaleChange?.(locale);
      setIsOpen(false);
    },
    [currentLocale, setLocale, onLocaleChange],
  );

  // Render locale item
  const renderLocaleItem = useCallback(
    (config: LocaleConfig) => {
      const isSelected = config.code === currentLocale;
      const displayName = showNativeName ? config.name : config.englishName;

      return (
        <DropdownMenuItem
          key={config.code}
          onClick={() => handleSelect(config.code as LocaleCode)}
          className={cn(
            "flex cursor-pointer items-center justify-between",
            isSelected && "bg-accent",
          )}
        >
          <div className="flex items-center gap-2">
            {showFlag && config.flag && (
              <span
                className="text-base"
                role="img"
                aria-label={config.englishName}
              >
                {config.flag}
              </span>
            )}
            <span>{displayName}</span>
            {showNativeName && config.name !== config.englishName && (
              <span className="text-xs text-muted-foreground">
                ({config.englishName})
              </span>
            )}
          </div>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
      );
    },
    [currentLocale, showNativeName, showFlag, handleSelect],
  );

  // Default trigger
  const defaultTrigger = compact ? (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9", className)}
      disabled={isLoading}
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">{translate("language.select")}</span>
    </Button>
  ) : (
    <Button
      variant="outline"
      className={cn("gap-2", className)}
      disabled={isLoading}
    >
      {showFlag && currentLocaleConfig?.flag && (
        <span role="img" aria-label={currentLocaleConfig.englishName}>
          {currentLocaleConfig.flag}
        </span>
      )}
      <span>
        {showNativeName
          ? currentLocaleConfig?.name
          : currentLocaleConfig?.englishName}
      </span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Button>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>{translate("language.select")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {locales.map(renderLocaleItem)}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Simple Language Select
// ============================================================================

interface LanguageSelectProps {
  /** Current value */
  value?: LocaleCode;
  /** On change handler */
  onChange?: (locale: LocaleCode) => void;
  /** Show only complete translations */
  showOnlyComplete?: boolean;
  /** Additional class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function LanguageSelect({
  value,
  onChange,
  showOnlyComplete = false,
  className,
  disabled = false,
}: LanguageSelectProps) {
  const { currentLocale, setLocale, isLoading } = useLocaleStore();
  const selectedValue = value ?? currentLocale;

  const locales = useMemo(() => {
    return showOnlyComplete ? getCompleteLocales() : getSortedLocales();
  }, [showOnlyComplete]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLocale = e.target.value as LocaleCode;
      if (onChange) {
        onChange(newLocale);
      } else {
        await setLocale(newLocale);
      }
    },
    [onChange, setLocale],
  );

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      disabled={disabled || isLoading}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {locales.map((config) => (
        <option key={config.code} value={config.code}>
          {config.flag} {config.name} ({config.englishName})
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;
