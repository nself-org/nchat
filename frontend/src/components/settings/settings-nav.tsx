"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  Bell,
  Shield,
  Settings,
  Keyboard,
  Palette,
  ArrowLeft,
  Lock,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description?: string;
}

const navItems: NavItem[] = [
  {
    title: "Profile",
    href: "/settings/profile",
    icon: User,
    description: "Manage your personal information",
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
    description: "Configure notification preferences",
  },
  {
    title: "Privacy",
    href: "/settings/privacy",
    icon: Shield,
    description: "Control your privacy settings",
  },
  {
    title: "Account",
    href: "/settings/account",
    icon: Settings,
    description: "Manage account settings",
  },
  {
    title: "Security",
    href: "/settings/security",
    icon: Lock,
    description: "Password, 2FA, and sessions",
  },
  {
    title: "Appearance",
    href: "/settings/appearance",
    icon: Palette,
    description: "Customize the look and feel",
  },
  {
    title: "Keyboard",
    href: "/settings/keyboard",
    icon: Keyboard,
    description: "View keyboard shortcuts",
  },
];

interface SettingsNavProps {
  variant?: "vertical" | "horizontal";
}

export function SettingsNav({ variant = "vertical" }: SettingsNavProps) {
  const pathname = usePathname();

  if (variant === "horizontal") {
    return (
      <nav className="flex space-x-1 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-foreground bg-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1 p-4">
      {/* Back to Chat Link */}
      <Link
        href="/chat"
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Chat
      </Link>

      {/* Nav Items */}
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex flex-col gap-1 rounded-lg px-3 py-3 transition-colors",
              isActive
                ? "text-primary-foreground bg-primary"
                : "hover:bg-muted",
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon
                className={cn("h-5 w-5", !isActive && "text-muted-foreground")}
              />
              <span className="font-medium">{item.title}</span>
            </div>
            {item.description && (
              <p
                className={cn(
                  "pl-8 text-xs",
                  isActive
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {item.description}
              </p>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
