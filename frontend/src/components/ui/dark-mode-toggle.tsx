"use client";

import { memo } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDarkMode, type ColorScheme } from "@/hooks/use-dark-mode";

// ============================================================================
// Types
// ============================================================================

export interface DarkModeToggleProps {
  variant?: "button" | "dropdown" | "switch";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Dark mode toggle component with multiple variants
 *
 * @example
 * ```tsx
 * // Simple toggle button
 * <DarkModeToggle />
 *
 * // Dropdown with all options
 * <DarkModeToggle variant="dropdown" />
 *
 * // Switch with label
 * <DarkModeToggle variant="switch" showLabel />
 * ```
 */
export const DarkModeToggle = memo(function DarkModeToggle({
  variant = "dropdown",
  size = "md",
  showLabel = false,
  className,
}: DarkModeToggleProps) {
  const { isDark, colorScheme, setColorScheme, toggle } = useDarkMode();

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
        onClick={toggle}
        className={cn("relative", className)}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? "dark" : "light"}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? (
              <Moon
                className={cn(
                  "h-5 w-5",
                  size === "sm" && "h-4 w-4",
                  size === "lg" && "h-6 w-6",
                )}
              />
            ) : (
              <Sun
                className={cn(
                  "h-5 w-5",
                  size === "sm" && "h-4 w-4",
                  size === "lg" && "h-6 w-6",
                )}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {showLabel && <span className="ml-2">{isDark ? "Dark" : "Light"}</span>}
      </Button>
    );
  }

  if (variant === "switch") {
    return (
      <button
        onClick={toggle}
        className={cn(
          "relative inline-flex items-center gap-3",
          "rounded-lg p-2 transition-colors",
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
          className,
        )}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {showLabel && (
          <span className="text-sm font-medium">
            {isDark ? "Dark mode" : "Light mode"}
          </span>
        )}
        <div
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            isDark ? "bg-primary" : "bg-muted",
          )}
        >
          <motion.div
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md",
              "flex items-center justify-center",
            )}
            animate={{
              left: isDark ? "calc(100% - 22px)" : "2px",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? "dark" : "light"}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.15 }}
              >
                {isDark ? (
                  <Moon className="h-3 w-3 text-primary" />
                ) : (
                  <Sun className="h-3 w-3 text-amber-500" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </button>
    );
  }

  // Dropdown variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
          className={cn("relative", className)}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={colorScheme}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              {colorScheme === "system" ? (
                <Monitor
                  className={cn(
                    "h-5 w-5",
                    size === "sm" && "h-4 w-4",
                    size === "lg" && "h-6 w-6",
                  )}
                />
              ) : isDark ? (
                <Moon
                  className={cn(
                    "h-5 w-5",
                    size === "sm" && "h-4 w-4",
                    size === "lg" && "h-6 w-6",
                  )}
                />
              ) : (
                <Sun
                  className={cn(
                    "h-5 w-5",
                    size === "sm" && "h-4 w-4",
                    size === "lg" && "h-6 w-6",
                  )}
                />
              )}
            </motion.div>
          </AnimatePresence>
          {showLabel && <span className="ml-2 capitalize">{colorScheme}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeMenuItem
          scheme="light"
          currentScheme={colorScheme}
          onClick={() => setColorScheme("light")}
        />
        <ThemeMenuItem
          scheme="dark"
          currentScheme={colorScheme}
          onClick={() => setColorScheme("dark")}
        />
        <ThemeMenuItem
          scheme="system"
          currentScheme={colorScheme}
          onClick={() => setColorScheme("system")}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface ThemeMenuItemProps {
  scheme: ColorScheme;
  currentScheme: ColorScheme;
  onClick: () => void;
}

const ThemeMenuItem = memo(function ThemeMenuItem({
  scheme,
  currentScheme,
  onClick,
}: ThemeMenuItemProps) {
  const isActive = scheme === currentScheme;

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const Icon = icons[scheme];

  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn("cursor-pointer", isActive && "bg-accent")}
    >
      <Icon className="mr-2 h-4 w-4" />
      <span className="capitalize">{scheme}</span>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto h-2 w-2 rounded-full bg-primary"
        />
      )}
    </DropdownMenuItem>
  );
});

// ============================================================================
// Compact Mobile Version
// ============================================================================

export interface CompactDarkModeToggleProps {
  className?: string;
}

/**
 * Compact dark mode toggle optimized for mobile
 * Touch-friendly with 44pt minimum tap target
 */
export const CompactDarkModeToggle = memo(function CompactDarkModeToggle({
  className,
}: CompactDarkModeToggleProps) {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-full",
        "touch-manipulation select-none",
        "hover:bg-muted/80 bg-muted transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: 180, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute"
        >
          {isDark ? (
            <Moon className="h-5 w-5 text-foreground" />
          ) : (
            <Sun className="h-5 w-5 text-foreground" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
});

export default DarkModeToggle;
