"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyboardShortcutTipProps {
  shortcut: string;
  description: string;
  context?: string;
  onDismiss?: () => void;
  autoHide?: number; // Auto hide after ms
  className?: string;
}

export function KeyboardShortcutTip({
  shortcut,
  description,
  context,
  onDismiss,
  autoHide,
  className,
}: KeyboardShortcutTipProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  if (!isVisible) return null;

  // Parse shortcut keys
  const keys = shortcut.split(/[+\s]+/).map((key) => {
    // Replace common key names with symbols
    switch (key.toLowerCase()) {
      case "cmd":
      case "command":
        return { display: "\u2318", label: "Command" };
      case "ctrl":
      case "control":
        return { display: "Ctrl", label: "Control" };
      case "alt":
      case "option":
        return { display: "\u2325", label: "Option" };
      case "shift":
        return { display: "\u21E7", label: "Shift" };
      case "enter":
      case "return":
        return { display: "\u21B5", label: "Enter" };
      case "backspace":
        return { display: "\u232B", label: "Backspace" };
      case "escape":
      case "esc":
        return { display: "Esc", label: "Escape" };
      case "up":
        return { display: "\u2191", label: "Up" };
      case "down":
        return { display: "\u2193", label: "Down" };
      case "left":
        return { display: "\u2190", label: "Left" };
      case "right":
        return { display: "\u2192", label: "Right" };
      default:
        return { display: key.toUpperCase(), label: key };
    }
  });

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-lg px-3 py-2",
        "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        "shadow-lg transition-all duration-200",
        "animate-in fade-in slide-in-from-bottom-2",
        className,
      )}
    >
      <Keyboard className="h-4 w-4 opacity-60" />

      {/* Keyboard shortcut keys */}
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd
              className={cn(
                "inline-flex h-6 min-w-[24px] items-center justify-center px-1.5",
                "rounded border border-zinc-700 dark:border-zinc-300",
                "bg-zinc-800 font-mono text-xs font-medium dark:bg-zinc-200",
              )}
              title={key.label}
            >
              {key.display}
            </kbd>
            {index < keys.length - 1 && (
              <span className="mx-0.5 text-zinc-500">+</span>
            )}
          </span>
        ))}
      </div>

      {/* Description */}
      <span className="text-sm">
        {description}
        {context && (
          <span className="ml-1 text-zinc-400 dark:text-zinc-500">
            ({context})
          </span>
        )}
      </span>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-1 rounded p-1 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
