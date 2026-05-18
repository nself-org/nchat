"use client";

import { memo, forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MoreVertical, Search, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMobileStore } from "@/lib/mobile/mobile-store";
import { useSafeArea } from "@/lib/mobile/use-viewport";

// ============================================================================
// Types
// ============================================================================

export interface HeaderAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  leftAction?: React.ReactNode;
  rightActions?: HeaderAction[];
  rightContent?: React.ReactNode;
  onBack?: () => void;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  transparent?: boolean;
  elevated?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Mobile header with back button, title, and actions menu
 * Supports iOS-style large title and Android-style toolbar
 */
export const MobileHeader = memo(
  forwardRef<HTMLElement, MobileHeaderProps>(function MobileHeader(
    {
      title,
      subtitle,
      showBack = false,
      showMenu = false,
      showSearch = false,
      leftAction,
      rightActions = [],
      rightContent,
      onBack,
      onMenuClick,
      onSearchClick,
      transparent = false,
      elevated = false,
      className,
      children,
    },
    ref,
  ) {
    const { popView, openSidebar } = useMobileStore();
    const safeArea = useSafeArea();

    const handleBack = useCallback(() => {
      if (onBack) {
        onBack();
      } else {
        popView();
      }
    }, [onBack, popView]);

    const handleMenu = useCallback(() => {
      if (onMenuClick) {
        onMenuClick();
      } else {
        openSidebar();
      }
    }, [onMenuClick, openSidebar]);

    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-40",
          "flex flex-col",
          !transparent && "bg-background/95 backdrop-blur-lg",
          elevated && "shadow-sm",
          "border-border/50 border-b",
          "safe-area-top",
          className,
        )}
        style={{
          paddingTop: safeArea.top || 0,
        }}
      >
        {/* Main header row */}
        <div className="flex h-14 items-center justify-between px-2">
          {/* Left section */}
          <div className="flex items-center gap-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-10 w-10 shrink-0 touch-manipulation"
                aria-label="Go back"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {showMenu && !showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMenu}
                className="h-10 w-10 shrink-0 touch-manipulation"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            {leftAction}

            {/* Title and subtitle */}
            {(title || subtitle) && (
              <div className="min-w-0 flex-1 pl-1">
                {title && (
                  <h1 className="truncate text-base font-semibold leading-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="truncate text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearchClick}
                className="h-10 w-10 touch-manipulation"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {rightContent}

            {rightActions.length > 0 && (
              <HeaderActionsMenu actions={rightActions} />
            )}
          </div>
        </div>

        {/* Optional additional content (search bar, tabs, etc.) */}
        {children}
      </header>
    );
  }),
);

// ============================================================================
// Sub-components
// ============================================================================

interface HeaderActionsMenuProps {
  actions: HeaderAction[];
}

const HeaderActionsMenu = memo(function HeaderActionsMenu({
  actions,
}: HeaderActionsMenuProps) {
  if (actions.length === 0) return null;

  // Show single action directly
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={action.onClick}
        disabled={action.disabled}
        className="h-10 w-10 touch-manipulation"
        aria-label={action.label}
      >
        {action.icon || <MoreVertical className="h-5 w-5" />}
      </Button>
    );
  }

  // Show dropdown for multiple actions
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 touch-manipulation"
          aria-label="More options"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => (
          <div key={action.id}>
            {index > 0 && action.destructive && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "touch-manipulation",
                action.destructive && "text-destructive focus:text-destructive",
              )}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// ============================================================================
// Search Header Variant
// ============================================================================

export interface MobileSearchHeaderProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onClose?: () => void;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export const MobileSearchHeader = memo(function MobileSearchHeader({
  value = "",
  placeholder = "Search...",
  onChange,
  onClose,
  onSubmit,
  autoFocus = true,
  className,
}: MobileSearchHeaderProps) {
  const safeArea = useSafeArea();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit?.(value);
    },
    [value, onSubmit],
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        "flex h-14 items-center gap-2 px-2",
        "bg-background/95 backdrop-blur-lg",
        "border-border/50 border-b",
        className,
      )}
      style={{ paddingTop: safeArea.top || 0 }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-10 w-10 shrink-0 touch-manipulation"
        aria-label="Close search"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <form onSubmit={handleSubmit} className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX for search focus
            autoFocus={autoFocus}
            className={cn(
              "h-10 w-full pl-10 pr-10",
              "rounded-full",
              "bg-muted/50",
              "text-sm placeholder:text-muted-foreground",
              "focus:ring-primary/20 focus:outline-none focus:ring-2",
              "touch-manipulation",
            )}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange?.("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </header>
  );
});

// ============================================================================
// Channel Header Variant
// ============================================================================

export interface MobileChannelHeaderProps {
  channelName: string;
  channelIcon?: React.ReactNode;
  memberCount?: number;
  isOnline?: boolean;
  onBack?: () => void;
  onInfoClick?: () => void;
  onSearchClick?: () => void;
  className?: string;
}

export const MobileChannelHeader = memo(function MobileChannelHeader({
  channelName,
  channelIcon,
  memberCount,
  isOnline,
  onBack,
  onInfoClick,
  onSearchClick,
  className,
}: MobileChannelHeaderProps) {
  return (
    <MobileHeader
      showBack
      onBack={onBack}
      showSearch
      onSearchClick={onSearchClick}
      className={className}
      leftAction={
        <button
          onClick={onInfoClick}
          className="flex min-w-0 flex-1 touch-manipulation items-center gap-3"
        >
          {/* Channel icon/avatar */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            {channelIcon || <span className="text-lg font-semibold">#</span>}
            {isOnline !== undefined && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5",
                  "h-3 w-3 rounded-full border-2 border-background",
                  isOnline ? "bg-green-500" : "bg-muted-foreground",
                )}
              />
            )}
          </div>

          {/* Channel info */}
          <div className="min-w-0 text-left">
            <h1 className="truncate text-base font-semibold">{channelName}</h1>
            {memberCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </button>
      }
    />
  );
});

export default MobileHeader;
