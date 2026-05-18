"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, Settings } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SettingsBreadcrumbProps {
  className?: string;
  items?: BreadcrumbItem[];
}

const pathLabels: Record<string, string> = {
  settings: "Settings",
  account: "Account",
  appearance: "Appearance",
  notifications: "Notifications",
  privacy: "Privacy",
  accessibility: "Accessibility",
  language: "Language & Region",
  advanced: "Advanced",
  security: "Security",
  profile: "Profile",
  keyboard: "Keyboard Shortcuts",
};

/**
 * SettingsBreadcrumb - Navigation breadcrumb for settings pages
 */
export function SettingsBreadcrumb({
  className,
  items,
}: SettingsBreadcrumbProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbs: BreadcrumbItem[] =
    items ||
    (() => {
      const segments = pathname.split("/").filter(Boolean);
      const crumbs: BreadcrumbItem[] = [];

      let currentPath = "";
      for (const segment of segments) {
        currentPath += `/${segment}`;
        crumbs.push({
          label: pathLabels[segment] || segment,
          href: currentPath,
        });
      }

      return crumbs;
    })();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <Link
        href="/settings"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Settings</span>
      </Link>

      {breadcrumbs.slice(1).map((item, index) => {
        const isLast = index === breadcrumbs.length - 2;

        return (
          <div
            key={item.href || item.label}
            className="flex items-center gap-1"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast || !item.href ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
