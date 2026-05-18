"use client";

import { cn } from "@/lib/utils";

interface KeyboardShortcutProps {
  keys: string[];
  label: string;
  description?: string;
  className?: string;
}

export function KeyboardShortcut({
  keys,
  label,
  description,
  className,
}: KeyboardShortcutProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b py-3 last:border-0",
        className,
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center gap-1">
            <kbd
              className={cn(
                "inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground",
                // Special styling for modifier keys
                ["Cmd", "Ctrl", "Alt", "Shift", "Meta"].includes(key) &&
                  "bg-muted/70",
              )}
            >
              {formatKey(key)}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-muted-foreground">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// Format key for display (handle special keys)
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    Cmd: "\u2318",
    Meta: "\u2318",
    Ctrl: "Ctrl",
    Alt: "\u2325",
    Option: "\u2325",
    Shift: "\u21E7",
    Enter: "\u21B5",
    Return: "\u21B5",
    Tab: "\u21E5",
    Backspace: "\u232B",
    Delete: "\u2326",
    Escape: "Esc",
    Esc: "Esc",
    Space: "Space",
    ArrowUp: "\u2191",
    ArrowDown: "\u2193",
    ArrowLeft: "\u2190",
    ArrowRight: "\u2192",
    Up: "\u2191",
    Down: "\u2193",
    Left: "\u2190",
    Right: "\u2192",
  };

  return keyMap[key] || key;
}

interface KeyboardShortcutGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function KeyboardShortcutGroup({
  title,
  description,
  children,
  className,
}: KeyboardShortcutGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="rounded-lg border bg-card p-3">{children}</div>
    </div>
  );
}

// Inline keyboard key display for documentation
interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
