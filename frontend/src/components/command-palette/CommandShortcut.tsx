"use client";

/**
 * CommandShortcut
 *
 * Displays keyboard shortcut for a command with platform-aware symbols.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CommandShortcutProps {
  /** Key combination string (e.g., 'mod+k', 'shift+enter') */
  keys: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

// ============================================================================
// Platform Detection
// ============================================================================

function isMacOS(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

// ============================================================================
// Key Formatting
// ============================================================================

const macSymbols: Record<string, string> = {
  mod: "\u2318", // Command
  ctrl: "\u2303", // Control
  alt: "\u2325", // Option
  shift: "\u21E7", // Shift
  enter: "\u21A9", // Return
  backspace: "\u232B", // Delete
  delete: "\u2326", // Forward Delete
  escape: "\u238B", // Escape
  tab: "\u21E5", // Tab
  arrowup: "\u2191",
  arrowdown: "\u2193",
  arrowleft: "\u2190",
  arrowright: "\u2192",
  space: "\u2423", // Space
};

const windowsSymbols: Record<string, string> = {
  mod: "Ctrl",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  enter: "Enter",
  backspace: "Backspace",
  delete: "Del",
  escape: "Esc",
  tab: "Tab",
  arrowup: "\u2191",
  arrowdown: "\u2193",
  arrowleft: "\u2190",
  arrowright: "\u2192",
  space: "Space",
};

function formatKey(key: string, useMacSymbols: boolean): string {
  const lowerKey = key.toLowerCase();
  const symbols = useMacSymbols ? macSymbols : windowsSymbols;

  if (symbols[lowerKey]) {
    return symbols[lowerKey];
  }

  // Single letters should be uppercase
  if (key.length === 1) {
    return key.toUpperCase();
  }

  // Capitalize first letter for other keys
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function parseShortcut(keys: string, useMacSymbols: boolean): string[] {
  return keys
    .split("+")
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => formatKey(key, useMacSymbols));
}

// ============================================================================
// Component
// ============================================================================

export function CommandShortcut({
  keys,
  className,
  size = "md",
}: CommandShortcutProps) {
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(isMacOS());
  }, []);

  const formattedKeys = parseShortcut(keys, isMac);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {formattedKeys.map((key, index) => (
        <kbd
          key={index}
          className={cn(
            "inline-flex items-center justify-center rounded border border-border bg-muted font-sans font-medium text-muted-foreground",
            size === "sm"
              ? "min-w-[18px] px-1 py-0.5 text-[10px]"
              : "min-w-[22px] px-1.5 py-0.5 text-xs",
          )}
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

export default CommandShortcut;
