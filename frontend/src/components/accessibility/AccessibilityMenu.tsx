"use client";

import * as React from "react";
import {
  Accessibility,
  Eye,
  EyeOff,
  Keyboard,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

export interface AccessibilityMenuProps {
  /** Show as icon button or full button */
  variant?: "icon" | "button";
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccessibilityMenu - Quick access menu for common accessibility settings
 *
 * Provides one-click access to frequently used accessibility features:
 * - Theme toggle (light/dark)
 * - Font size adjustment
 * - High contrast mode
 * - Reduce motion
 * - Screen reader mode
 * - Keyboard shortcuts reference
 *
 * @example
 * ```tsx
 * <AccessibilityMenu variant="icon" size="sm" />
 * ```
 */
export function AccessibilityMenu({
  variant = "icon",
  size = "default",
  className,
}: AccessibilityMenuProps) {
  const {
    settings,
    setTheme,
    setFontSize,
    toggleHighContrast,
    toggleReduceMotion,
    updateAccessibility,
  } = useSettingsStore();

  const { appearance, accessibility } = settings;

  // Font size cycle: small -> medium -> large -> extra-large -> small
  const cycleFontSize = () => {
    const sizes: ("small" | "medium" | "large" | "extra-large")[] = [
      "small",
      "medium",
      "large",
      "extra-large",
    ];
    const currentIndex = sizes.indexOf(appearance.fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
  };

  const increaseFontSize = () => {
    if (appearance.fontSize === "small") setFontSize("medium");
    else if (appearance.fontSize === "medium") setFontSize("large");
  };

  const decreaseFontSize = () => {
    if (appearance.fontSize === "large") setFontSize("medium");
    else if (appearance.fontSize === "medium") setFontSize("small");
  };

  const toggleTheme = () => {
    setTheme(appearance.theme === "light" ? "dark" : "light");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "icon" ? "icon" : size}
          className={cn("relative", className)}
          aria-label="Accessibility options"
          title="Accessibility options"
        >
          <Accessibility className="h-5 w-5" />
          {variant === "button" && <span className="ml-2">Accessibility</span>}
          {/* Visual indicator when accessibility features are active */}
          {(accessibility.highContrast ||
            accessibility.reduceMotion ||
            accessibility.screenReaderMode) && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="end" sideOffset={5}>
        <DropdownMenuLabel className="flex items-center gap-2">
          <Accessibility className="h-4 w-4" />
          Accessibility Settings
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Theme Toggle */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Visual
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={toggleTheme}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {appearance.theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>Theme</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {appearance.theme === "light" ? "Light" : "Dark"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuCheckboxItem
            checked={accessibility.highContrast}
            onCheckedChange={toggleHighContrast}
          >
            <div className="flex items-center gap-2">
              {accessibility.highContrast ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span>High contrast</span>
            </div>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={accessibility.reduceTransparency}
            onCheckedChange={(checked) =>
              updateAccessibility({ reduceTransparency: checked })
            }
          >
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>Reduce transparency</span>
            </div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Font Size */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Text
          </DropdownMenuLabel>
          <div className="flex items-center gap-1 px-2 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={decreaseFontSize}
              disabled={appearance.fontSize === "small"}
              className="h-8 flex-1"
              aria-label="Decrease font size"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="flex-1 text-center text-xs text-muted-foreground">
              {appearance.fontSize}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={increaseFontSize}
              disabled={appearance.fontSize === "large"}
              className="h-8 flex-1"
              aria-label="Increase font size"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenuCheckboxItem
            checked={accessibility.dyslexiaFont}
            onCheckedChange={(checked) =>
              updateAccessibility({ dyslexiaFont: checked })
            }
          >
            <div className="flex items-center gap-2">
              <span className="font-mono">Aa</span>
              <span>Dyslexia-friendly font</span>
            </div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Motion & Animation */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Motion
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={accessibility.reduceMotion}
            onCheckedChange={toggleReduceMotion}
          >
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>Reduce motion</span>
            </div>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={accessibility.reduceMotion}
            onCheckedChange={(checked) =>
              updateAccessibility({ reduceMotion: checked })
            }
          >
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>Disable animations</span>
            </div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Screen Reader & Keyboard */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Assistive
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={accessibility.screenReaderMode}
            onCheckedChange={(checked) =>
              updateAccessibility({ screenReaderMode: checked })
            }
          >
            <div className="flex items-center gap-2">
              {accessibility.screenReaderMode ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span>Screen reader mode</span>
            </div>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={accessibility.announceMessages}
            onCheckedChange={(checked) =>
              updateAccessibility({ announceMessages: checked })
            }
          >
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span>Announce messages</span>
            </div>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={accessibility.showKeyboardHints}
            onCheckedChange={(checked) =>
              updateAccessibility({ showKeyboardHints: checked })
            }
          >
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              <span>Keyboard shortcuts</span>
            </div>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={accessibility.alwaysShowFocus}
            onCheckedChange={(checked) =>
              updateAccessibility({ alwaysShowFocus: checked })
            }
          >
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              <span>Always show focus</span>
            </div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* More Settings Link */}
        <DropdownMenuItem asChild>
          <a
            href="/settings/accessibility"
            className="w-full text-sm text-primary"
          >
            View all accessibility settings →
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccessibilityMenu;
