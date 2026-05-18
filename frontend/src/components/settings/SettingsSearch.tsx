"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  User,
  Palette,
  Bell,
  Shield,
  Accessibility,
  Globe,
  Wrench,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Setting definitions for search
const settingsIndex = [
  // Account
  {
    id: "account-email",
    label: "Email",
    description: "Change your email address",
    category: "Account",
    icon: User,
    href: "/settings/account",
    keywords: ["email", "address", "contact"],
  },
  {
    id: "account-password",
    label: "Password",
    description: "Change your password",
    category: "Account",
    icon: User,
    href: "/settings/account",
    keywords: ["password", "security", "login"],
  },
  {
    id: "account-2fa",
    label: "Two-Factor Authentication",
    description: "Enable 2FA for extra security",
    category: "Account",
    icon: User,
    href: "/settings/account",
    keywords: ["2fa", "two factor", "security", "authenticator"],
  },
  {
    id: "account-sessions",
    label: "Active Sessions",
    description: "Manage your login sessions",
    category: "Account",
    icon: User,
    href: "/settings/account",
    keywords: ["sessions", "devices", "login", "logout"],
  },
  {
    id: "account-delete",
    label: "Delete Account",
    description: "Permanently delete your account",
    category: "Account",
    icon: User,
    href: "/settings/account",
    keywords: ["delete", "remove", "close"],
  },

  // Appearance
  {
    id: "appearance-theme",
    label: "Theme",
    description: "Light, dark, or system theme",
    category: "Appearance",
    icon: Palette,
    href: "/settings/appearance",
    keywords: ["theme", "dark", "light", "mode"],
  },
  {
    id: "appearance-color",
    label: "Accent Color",
    description: "Customize your accent color",
    category: "Appearance",
    icon: Palette,
    href: "/settings/appearance",
    keywords: ["color", "accent", "primary"],
  },
  {
    id: "appearance-font",
    label: "Font Size",
    description: "Adjust text size",
    category: "Appearance",
    icon: Palette,
    href: "/settings/appearance",
    keywords: ["font", "size", "text"],
  },
  {
    id: "appearance-density",
    label: "Message Density",
    description: "Compact, comfortable, or spacious",
    category: "Appearance",
    icon: Palette,
    href: "/settings/appearance",
    keywords: ["density", "compact", "spacious", "comfortable"],
  },
  {
    id: "appearance-sidebar",
    label: "Sidebar",
    description: "Sidebar position and width",
    category: "Appearance",
    icon: Palette,
    href: "/settings/appearance",
    keywords: ["sidebar", "position", "width"],
  },
  {
    id: "appearance-animations",
    label: "Animations",
    description: "Enable or disable animations",
    category: "Appearance",
    icon: Palette,
    href: "/settings/appearance",
    keywords: ["animations", "motion", "effects"],
  },

  // Notifications
  {
    id: "notifications-enable",
    label: "Notifications",
    description: "Enable or disable notifications",
    category: "Notifications",
    icon: Bell,
    href: "/settings/notifications",
    keywords: ["notifications", "alerts", "enable", "disable"],
  },
  {
    id: "notifications-sound",
    label: "Notification Sound",
    description: "Change notification sound",
    category: "Notifications",
    icon: Bell,
    href: "/settings/notifications",
    keywords: ["sound", "audio", "alert"],
  },
  {
    id: "notifications-dnd",
    label: "Do Not Disturb",
    description: "Set quiet hours",
    category: "Notifications",
    icon: Bell,
    href: "/settings/notifications",
    keywords: ["dnd", "do not disturb", "quiet", "mute"],
  },
  {
    id: "notifications-mentions",
    label: "Mentions",
    description: "Notification settings for mentions",
    category: "Notifications",
    icon: Bell,
    href: "/settings/notifications",
    keywords: ["mentions", "@"],
  },
  {
    id: "notifications-dm",
    label: "Direct Messages",
    description: "Notification settings for DMs",
    category: "Notifications",
    icon: Bell,
    href: "/settings/notifications",
    keywords: ["dm", "direct message", "private"],
  },

  // Privacy
  {
    id: "privacy-status",
    label: "Online Status",
    description: "Who can see your online status",
    category: "Privacy",
    icon: Shield,
    href: "/settings/privacy",
    keywords: ["online", "status", "presence"],
  },
  {
    id: "privacy-read",
    label: "Read Receipts",
    description: "Show when you read messages",
    category: "Privacy",
    icon: Shield,
    href: "/settings/privacy",
    keywords: ["read", "receipts", "seen"],
  },
  {
    id: "privacy-typing",
    label: "Typing Indicator",
    description: "Show when you are typing",
    category: "Privacy",
    icon: Shield,
    href: "/settings/privacy",
    keywords: ["typing", "indicator"],
  },
  {
    id: "privacy-profile",
    label: "Profile Visibility",
    description: "Who can see your profile",
    category: "Privacy",
    icon: Shield,
    href: "/settings/privacy",
    keywords: ["profile", "visibility", "public", "private"],
  },
  {
    id: "privacy-blocked",
    label: "Blocked Users",
    description: "Manage blocked users",
    category: "Privacy",
    icon: Shield,
    href: "/settings/privacy",
    keywords: ["block", "blocked", "users"],
  },

  // Accessibility
  {
    id: "accessibility-motion",
    label: "Reduce Motion",
    description: "Minimize animations",
    category: "Accessibility",
    icon: Accessibility,
    href: "/settings/accessibility",
    keywords: ["reduce", "motion", "animation"],
  },
  {
    id: "accessibility-contrast",
    label: "High Contrast",
    description: "Increase color contrast",
    category: "Accessibility",
    icon: Accessibility,
    href: "/settings/accessibility",
    keywords: ["contrast", "high", "visibility"],
  },
  {
    id: "accessibility-screen-reader",
    label: "Screen Reader",
    description: "Optimize for screen readers",
    category: "Accessibility",
    icon: Accessibility,
    href: "/settings/accessibility",
    keywords: ["screen reader", "voiceover", "narrator"],
  },
  {
    id: "accessibility-keyboard",
    label: "Keyboard Navigation",
    description: "Keyboard shortcuts and navigation",
    category: "Accessibility",
    icon: Accessibility,
    href: "/settings/accessibility",
    keywords: ["keyboard", "shortcuts", "navigation"],
  },
  {
    id: "accessibility-font",
    label: "Dyslexia-Friendly Font",
    description: "Use a font designed for dyslexia",
    category: "Accessibility",
    icon: Accessibility,
    href: "/settings/accessibility",
    keywords: ["dyslexia", "font", "readable"],
  },

  // Language
  {
    id: "language-language",
    label: "Language",
    description: "Change app language",
    category: "Language & Region",
    icon: Globe,
    href: "/settings/language",
    keywords: ["language", "locale"],
  },
  {
    id: "language-timezone",
    label: "Timezone",
    description: "Set your timezone",
    category: "Language & Region",
    icon: Globe,
    href: "/settings/language",
    keywords: ["timezone", "time", "zone"],
  },
  {
    id: "language-time-format",
    label: "Time Format",
    description: "12-hour or 24-hour",
    category: "Language & Region",
    icon: Globe,
    href: "/settings/language",
    keywords: ["time", "format", "12", "24"],
  },
  {
    id: "language-date-format",
    label: "Date Format",
    description: "Date display format",
    category: "Language & Region",
    icon: Globe,
    href: "/settings/language",
    keywords: ["date", "format"],
  },

  // Advanced
  {
    id: "advanced-developer",
    label: "Developer Mode",
    description: "Enable developer features",
    category: "Advanced",
    icon: Wrench,
    href: "/settings/advanced",
    keywords: ["developer", "dev", "debug"],
  },
  {
    id: "advanced-analytics",
    label: "Analytics",
    description: "Usage analytics settings",
    category: "Advanced",
    icon: Wrench,
    href: "/settings/advanced",
    keywords: ["analytics", "data", "tracking"],
  },
  {
    id: "advanced-sync",
    label: "Sync",
    description: "Settings synchronization",
    category: "Advanced",
    icon: Wrench,
    href: "/settings/advanced",
    keywords: ["sync", "synchronization", "devices"],
  },
  {
    id: "advanced-cache",
    label: "Cache",
    description: "Clear cache and data",
    category: "Advanced",
    icon: Wrench,
    href: "/settings/advanced",
    keywords: ["cache", "clear", "data"],
  },
];

interface SettingsSearchProps {
  className?: string;
  variant?: "inline" | "dialog";
}

/**
 * SettingsSearch - Search across all settings
 */
export function SettingsSearch({
  className,
  variant = "dialog",
}: SettingsSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return settingsIndex.filter((setting) => {
      const searchable = [
        setting.label,
        setting.description,
        setting.category,
        ...setting.keywords,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(lowerQuery);
    });
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      router.push(href);
      setIsOpen(false);
      setQuery("");
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex].href);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  if (variant === "inline") {
    return (
      <div className={cn("relative", className)}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search settings..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
        {query && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover shadow-lg">
            <ScrollArea className="max-h-[300px]">
              {results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result.href)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-muted"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{result.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.category}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </ScrollArea>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
      >
        <Search className="h-4 w-4" />
        Search Settings
        <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">Cmd</span>F
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="top-[15%] max-w-lg translate-y-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search Settings</DialogTitle>
          </DialogHeader>

          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search settings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuery("")}
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
            {!query && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Start typing to search settings</p>
              </div>
            )}

            {query && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p>No settings found for &quot;{query}&quot;</p>
              </div>
            )}

            {results.map((result, index) => {
              const Icon = result.icon;
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.href)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    index === selectedIndex ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{result.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.category} - {result.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </ScrollArea>

          <div className="border-t p-2 text-center">
            <p className="text-xs text-muted-foreground">
              <kbd className="rounded border bg-muted px-1">Up</kbd> /{" "}
              <kbd className="rounded border bg-muted px-1">Down</kbd> to
              navigate,{" "}
              <kbd className="rounded border bg-muted px-1">Enter</kbd> to
              select
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
