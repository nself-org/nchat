"use client";

/**
 * ShortcutKey Component
 *
 * Displays a single key or key combination in a styled "key cap" format.
 * Handles platform-specific display (Mac symbols vs Windows text).
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  splitShortcutForDisplay,
  isMacOS,
} from "@/lib/keyboard/shortcut-utils";

// ============================================================================
// Types
// ============================================================================

export type KeySize = "xs" | "sm" | "md" | "lg";
export type KeyVariant = "default" | "outline" | "ghost" | "subtle";

export interface ShortcutKeyProps {
  /** The key or key combination to display (e.g., 'mod+k', 'shift+enter') */
  keys: string;
  /** Size of the key caps */
  size?: KeySize;
  /** Visual variant */
  variant?: KeyVariant;
  /** Override platform detection (true = Mac style) */
  useMacSymbols?: boolean;
  /** Show keys as separate elements or combined */
  separated?: boolean;
  /** Additional class name */
  className?: string;
}

export interface SingleKeyProps {
  /** The key to display */
  keyChar: string;
  /** Size of the key cap */
  size?: KeySize;
  /** Visual variant */
  variant?: KeyVariant;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Size & Variant Styles
// ============================================================================

const sizeStyles: Record<KeySize, string> = {
  xs: "min-w-[18px] h-[18px] px-1 text-[10px] rounded",
  sm: "min-w-[22px] h-[22px] px-1.5 text-xs rounded",
  md: "min-w-[26px] h-[26px] px-2 text-sm rounded-md",
  lg: "min-w-[32px] h-[32px] px-2.5 text-base rounded-md",
};

const variantStyles: Record<KeyVariant, string> = {
  default: "bg-muted border border-border text-muted-foreground shadow-sm",
  outline: "bg-transparent border border-border text-foreground",
  ghost: "bg-transparent text-muted-foreground",
  subtle: "bg-muted/50 text-muted-foreground",
};

// ============================================================================
// SingleKey Component
// ============================================================================

/**
 * Renders a single key cap
 */
export function SingleKey({
  keyChar,
  size = "sm",
  variant = "default",
  className,
}: SingleKeyProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center font-mono font-medium",
        "select-none whitespace-nowrap",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
    >
      {keyChar}
    </kbd>
  );
}

// ============================================================================
// ShortcutKey Component
// ============================================================================

/**
 * Displays a keyboard shortcut with styled key caps
 *
 * @example
 * ```tsx
 * // Simple key
 * <ShortcutKey keys="escape" />
 *
 * // Combination
 * <ShortcutKey keys="mod+k" />
 *
 * // Multiple modifiers
 * <ShortcutKey keys="mod+shift+p" />
 *
 * // Separated keys
 * <ShortcutKey keys="mod+shift+k" separated />
 * ```
 */
export function ShortcutKey({
  keys,
  size = "sm",
  variant = "default",
  useMacSymbols,
  separated = false,
  className,
}: ShortcutKeyProps) {
  const isMac = useMacSymbols ?? isMacOS();
  const keyParts = React.useMemo(
    () => splitShortcutForDisplay(keys, isMac),
    [keys, isMac],
  );

  // For Mac, combine modifier symbols; for Windows, show separately
  const shouldCombine = isMac && !separated;

  if (shouldCombine) {
    // Combine all keys into a single key cap (Mac style)
    const combinedKey = keyParts.join("");
    return (
      <SingleKey
        keyChar={combinedKey}
        size={size}
        variant={variant}
        className={className}
      />
    );
  }

  // Show keys as separate key caps
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keyParts.map((part, index) => (
        <React.Fragment key={index}>
          <SingleKey keyChar={part} size={size} variant={variant} />
          {index < keyParts.length - 1 && !isMac && (
            <span className="mx-0.5 text-xs text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

// ============================================================================
// ModifierKey Component
// ============================================================================

export type ModifierType = "mod" | "ctrl" | "alt" | "shift" | "meta";

export interface ModifierKeyProps {
  /** The modifier key type */
  modifier: ModifierType;
  /** Size of the key cap */
  size?: KeySize;
  /** Visual variant */
  variant?: KeyVariant;
  /** Override platform detection */
  useMacSymbols?: boolean;
  /** Additional class name */
  className?: string;
}

const modifierSymbols: Record<ModifierType, { mac: string; win: string }> = {
  mod: { mac: "\u2318", win: "Ctrl" },
  ctrl: { mac: "\u2303", win: "Ctrl" },
  alt: { mac: "\u2325", win: "Alt" },
  shift: { mac: "\u21E7", win: "Shift" },
  meta: { mac: "\u2318", win: "Win" },
};

/**
 * Displays a single modifier key
 */
export function ModifierKey({
  modifier,
  size = "sm",
  variant = "default",
  useMacSymbols,
  className,
}: ModifierKeyProps) {
  const isMac = useMacSymbols ?? isMacOS();
  const symbol = modifierSymbols[modifier];
  const display = isMac ? symbol.mac : symbol.win;

  return (
    <SingleKey
      keyChar={display}
      size={size}
      variant={variant}
      className={className}
    />
  );
}

// ============================================================================
// KeyCombo Component
// ============================================================================

export interface KeyComboProps {
  /** Array of keys to display */
  keys: string[];
  /** Size of the key caps */
  size?: KeySize;
  /** Visual variant */
  variant?: KeyVariant;
  /** Separator between keys */
  separator?: "plus" | "space" | "then" | "none";
  /** Additional class name */
  className?: string;
}

/**
 * Displays a sequence of keys with a separator
 *
 * @example
 * ```tsx
 * <KeyCombo keys={['G', 'G']} separator="then" />
 * // Displays: G then G
 * ```
 */
export function KeyCombo({
  keys,
  size = "sm",
  variant = "default",
  separator = "plus",
  className,
}: KeyComboProps) {
  const separatorElement = React.useMemo(() => {
    switch (separator) {
      case "plus":
        return <span className="mx-0.5 text-xs text-muted-foreground">+</span>;
      case "space":
        return <span className="w-1" />;
      case "then":
        return <span className="mx-1 text-xs text-muted-foreground">then</span>;
      case "none":
        return null;
      default:
        return null;
    }
  }, [separator]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <SingleKey keyChar={key} size={size} variant={variant} />
          {index < keys.length - 1 && separatorElement}
        </React.Fragment>
      ))}
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ShortcutKey;
