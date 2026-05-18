"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Hash,
  Shield,
  Settings,
  BarChart3,
  ChevronLeft,
  Zap,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminStore } from "@/lib/admin/admin-store";
import { useAdminAccess } from "@/lib/admin/use-admin";

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiresOwner?: boolean;
  requiresAdmin?: boolean;
  requiresModerator?: boolean;
}

export function AdminSidebar({
  collapsed = false,
  onCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { stats } = useAdminStore();
  const { isOwner, isAdmin, isModerator, canManageSettings, canViewAnalytics } =
    useAdminAccess();

  const navItems: NavItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      requiresAdmin: true,
    },
    {
      href: "/admin/channels",
      label: "Channels",
      icon: Hash,
      requiresAdmin: true,
    },
    {
      href: "/admin/moderation",
      label: "Moderation",
      icon: Shield,
      badge: stats.pendingReports > 0 ? stats.pendingReports : undefined,
      requiresModerator: true,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
      requiresAdmin: true,
    },
    {
      href: "/admin/advanced",
      label: "Advanced",
      icon: Zap,
      requiresAdmin: true,
    },
    {
      href: "/admin/deployment",
      label: "Deployment",
      icon: Rocket,
      requiresOwner: true,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
      requiresOwner: true,
    },
  ];

  // Filter items based on permissions
  const visibleItems = navItems.filter((item) => {
    if (item.requiresOwner && !isOwner) return false;
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresModerator && !isModerator) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Admin Panel</span>
          </div>
        )}
        {collapsed && <Shield className="mx-auto h-5 w-5 text-primary" />}
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto h-8 w-8", collapsed && "mx-auto")}
            onClick={() => onCollapse(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-primary-foreground bg-primary"
                  : "hover:text-accent-foreground text-muted-foreground hover:bg-accent",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  active && "text-primary-foreground",
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <Badge
                      variant={active ? "secondary" : "destructive"}
                      className="h-5 min-w-[20px] justify-center px-1.5"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </>
              )}
              {collapsed && item.badge !== undefined && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-4 min-w-[16px] justify-center px-1 text-[10px]"
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        <Link
          href="/chat"
          className={cn(
            "hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Back to Chat" : undefined}
        >
          <ChevronLeft className="h-5 w-5" />
          {!collapsed && <span>Back to Chat</span>}
        </Link>
      </div>
    </div>
  );
}

export default AdminSidebar;
