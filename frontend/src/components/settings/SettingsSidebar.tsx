"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Palette,
  Bell,
  Shield,
  Accessibility,
  Globe,
  Wrench,
  Lock,
  Keyboard,
  ArrowLeft,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Account",
    items: [
      {
        title: "Profile",
        href: "/settings/profile",
        icon: User,
        description: "Your personal information",
      },
      {
        title: "Account",
        href: "/settings/account",
        icon: User,
        description: "Email, password, connected accounts",
      },
      {
        title: "Security",
        href: "/settings/security",
        icon: Lock,
        description: "2FA and login sessions",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        title: "Appearance",
        href: "/settings/appearance",
        icon: Palette,
        description: "Theme, colors, display",
      },
      {
        title: "Notifications",
        href: "/settings/notifications",
        icon: Bell,
        description: "Alerts and sounds",
      },
      {
        title: "Privacy",
        href: "/settings/privacy",
        icon: Shield,
        description: "Who can see your activity",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Accessibility",
        href: "/settings/accessibility",
        icon: Accessibility,
        description: "Accessibility options",
      },
      {
        title: "Language & Region",
        href: "/settings/language",
        icon: Globe,
        description: "Language, timezone, formats",
      },
      {
        title: "Keyboard",
        href: "/settings/keyboard",
        icon: Keyboard,
        description: "Shortcuts and navigation",
      },
      {
        title: "Advanced",
        href: "/settings/advanced",
        icon: Wrench,
        description: "Developer options",
      },
    ],
  },
];

interface SettingsSidebarProps {
  className?: string;
}

/**
 * SettingsSidebar - Settings navigation sidebar
 */
export function SettingsSidebar({ className }: SettingsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("hidden w-64 border-r bg-card md:block", className)}>
      <div className="sticky top-0 flex h-screen flex-col">
        {/* Header */}
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-6 px-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "text-primary-foreground bg-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <div className="flex-1 truncate">
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <span className="bg-primary/20 ml-2 rounded-full px-1.5 py-0.5 text-xs">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
