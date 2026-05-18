"use client";

import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, MessageSquare, Search, Bell, User, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileStore, type MobileView } from "@/lib/mobile/mobile-store";
import { useSafeArea } from "@/lib/mobile/use-viewport";

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  id: MobileView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface MobileNavProps {
  className?: string;
  items?: NavItem[];
  onNavigate?: (view: MobileView) => void;
}

// ============================================================================
// Default Navigation Items
// ============================================================================

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "channels", label: "Channels", icon: Hash },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "search", label: "Search", icon: Search },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Mobile bottom navigation bar
 * Inspired by iOS tab bar and Material Design bottom navigation
 */
export const MobileNav = memo(function MobileNav({
  className,
  items = DEFAULT_NAV_ITEMS,
  onNavigate,
}: MobileNavProps) {
  const { activeView, setActiveView, bottomNavVisible, unreadCounts } =
    useMobileStore();
  const safeArea = useSafeArea();

  const handleNavigate = useCallback(
    (view: MobileView) => {
      setActiveView(view);
      onNavigate?.(view);
    },
    [setActiveView, onNavigate],
  );

  // Get badge count for an item
  const getBadgeCount = (id: MobileView): number => {
    switch (id) {
      case "channels":
        return unreadCounts.channels;
      case "messages":
        return unreadCounts.messages;
      case "notifications":
        return unreadCounts.notifications;
      default:
        return 0;
    }
  };

  return (
    <AnimatePresence>
      {bottomNavVisible && (
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-background/95 backdrop-blur-lg",
            "border-border/50 border-t",
            "safe-area-bottom",
            className,
          )}
          style={{
            paddingBottom: safeArea.bottom || 0,
          }}
        >
          <div className="flex items-center justify-around px-2">
            {items.map((item) => {
              const isActive = activeView === item.id;
              const badge = getBadgeCount(item.id);
              const Icon = item.icon;

              return (
                <NavButton
                  key={item.id}
                  isActive={isActive}
                  badge={badge}
                  label={item.label}
                  onClick={() => handleNavigate(item.id)}
                >
                  <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
                </NavButton>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface NavButtonProps {
  children: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

const NavButton = memo(function NavButton({
  children,
  label,
  isActive,
  badge = 0,
  onClick,
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-w-[64px] px-3 py-2",
        "transition-colors duration-200",
        "touch-manipulation",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Icon container with active indicator */}
      <div className="relative">
        {children}

        {/* Active indicator dot */}
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          />
        )}

        {/* Badge */}
        <AnimatePresence>
          {badge > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                "absolute -right-2 -top-1",
                "flex items-center justify-center",
                "h-[18px] min-w-[18px] px-1",
                "text-[10px] font-semibold",
                "bg-destructive text-destructive-foreground",
                "rounded-full",
              )}
            >
              {badge > 99 ? "99+" : badge}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Label */}
      <span
        className={cn(
          "mt-1 text-[10px] font-medium",
          "transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
});

// ============================================================================
// Floating Action Button (FAB) Variant
// ============================================================================

export interface MobileNavFABProps {
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export const MobileNavFAB = memo(function MobileNavFAB({
  icon,
  label = "New",
  onClick,
  className,
}: MobileNavFABProps) {
  const safeArea = useSafeArea();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "fixed z-50",
        "flex items-center justify-center",
        "h-14 w-14 rounded-full",
        "text-primary-foreground bg-primary",
        "shadow-primary/25 shadow-lg",
        "touch-manipulation",
        className,
      )}
      style={{
        bottom: 80 + (safeArea.bottom || 0),
        right: 16,
      }}
      aria-label={label}
    >
      {icon || <MessageSquare className="h-6 w-6" />}
    </motion.button>
  );
});

// ============================================================================
// Compact Nav (for specific views)
// ============================================================================

export interface MobileNavCompactProps {
  className?: string;
}

export const MobileNavCompact = memo(function MobileNavCompact({
  className,
}: MobileNavCompactProps) {
  const { activeView, setActiveView, unreadCounts } = useMobileStore();
  const safeArea = useSafeArea();

  const items = [
    { id: "channels" as const, icon: Home, badge: unreadCounts.channels },
    {
      id: "messages" as const,
      icon: MessageSquare,
      badge: unreadCounts.messages,
    },
    {
      id: "notifications" as const,
      icon: Bell,
      badge: unreadCounts.notifications,
    },
  ];

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "flex items-center justify-around",
        "bg-background/95 backdrop-blur-lg",
        "border-border/50 border-t",
        "py-2",
        className,
      )}
      style={{ paddingBottom: safeArea.bottom || 8 }}
    >
      {items.map(({ id, icon: Icon, badge }) => {
        const isActive = activeView === id;

        return (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={cn(
              "relative rounded-full p-3",
              "transition-colors duration-200",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {badge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default MobileNav;
