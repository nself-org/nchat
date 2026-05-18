"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Inline code component for inline code snippets
 * Renders code with backtick syntax: `code`
 * Features:
 * - Monospace font
 * - Background highlight
 * - Theme-aware colors
 * - Copy on click
 */
export const InlineCode = memo(function InlineCode({
  children,
  className,
}: InlineCodeProps) {
  const handleClick = () => {
    // Copy code to clipboard on click
    if (children && typeof children === "string") {
      navigator.clipboard.writeText(children).catch((error) => {
        logger.error("Failed to copy code:", error);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs transition-colors",
        "hover:bg-muted/80 active:bg-muted/60 cursor-pointer",
        "text-pink-600 dark:text-pink-400",
        "border-muted-foreground/10 border",
        className,
      )}
      title="Click to copy"
    >
      <code>{children}</code>
    </button>
  );
});

InlineCode.displayName = "InlineCode";
