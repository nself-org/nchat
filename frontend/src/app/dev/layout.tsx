"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Layers,
  MessageSquare,
  Hash,
  User,
  Palette,
  Flag,
  Search,
  Moon,
  Sun,
  Code2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ============================================================================
// Navigation Configuration
// ============================================================================

const navigation: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Documentation Home", href: "/dev", icon: Home },
      { title: "Component Library", href: "/dev/components", icon: Layers },
    ],
  },
  {
    title: "Components",
    items: [
      {
        title: "Messages",
        href: "/dev/components/messages",
        icon: MessageSquare,
      },
      { title: "Channels", href: "/dev/components/channels", icon: Hash },
      { title: "Users", href: "/dev/components/users", icon: User },
    ],
  },
  {
    title: "Customization",
    items: [
      { title: "Templates", href: "/dev/templates", icon: Palette, badge: "5" },
      { title: "Feature Flags", href: "/dev/features", icon: Flag },
    ],
  },
];

// ============================================================================
// Sidebar Component
// ============================================================================

function Sidebar({
  searchQuery,
  onSearchChange,
  theme,
  onThemeToggle,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}) {
  const pathname = usePathname();

  // Filter navigation based on search
  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <Link href="/dev" className="flex items-center gap-2">
            <div className="text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">nchat</h1>
              <p className="text-[10px] text-muted-foreground">
                Developer Docs
              </p>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-6 pb-4">
            {filteredNavigation.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px]"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="h-4 w-4" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onThemeToggle}
              className="h-8 gap-2"
            >
              {theme === "dark" ? (
                <>
                  <Moon className="h-4 w-4" />
                  Dark
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  Light
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// Dev Banner Component
// ============================================================================

function DevBanner() {
  return (
    <div className="fixed left-64 right-0 top-0 z-30 border-b bg-amber-500/10 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <Sparkles className="h-4 w-4" />
        <span>
          Development Mode Only - These pages are not available in production
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Layout Component
// ============================================================================

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Apply theme class to document
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <DevBanner />
      <main className="ml-64 pt-10">
        <div className="container max-w-5xl py-8">{children}</div>
      </main>
    </div>
  );
}
