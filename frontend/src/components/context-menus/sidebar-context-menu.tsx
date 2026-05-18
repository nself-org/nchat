"use client";

import * as React from "react";
import {
  Plus,
  Hash,
  Search,
  FolderPlus,
  ChevronsUpDown,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItemWithIcon,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu-base";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export interface SidebarContextMenuProps {
  children: React.ReactNode;
  onCreateChannel?: () => void;
  onBrowseChannels?: () => void;
  onCreateCategory?: () => void;
  onCollapseAllCategories?: () => void;
  onExpandAllCategories?: () => void;
  onRefreshChannels?: () => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SidebarContextMenu({
  children,
  onCreateChannel,
  onBrowseChannels,
  onCreateCategory,
  onCollapseAllCategories,
  onExpandAllCategories,
  onRefreshChannels,
  onOpenSettings,
  disabled = false,
}: SidebarContextMenuProps) {
  const { user } = useAuth();

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  // Track collapsed state to show appropriate action
  const [allCollapsed, setAllCollapsed] = React.useState(false);

  const handleToggleCollapse = React.useCallback(() => {
    if (allCollapsed) {
      onExpandAllCategories?.();
    } else {
      onCollapseAllCategories?.();
    }
    setAllCollapsed(!allCollapsed);
  }, [allCollapsed, onCollapseAllCategories, onExpandAllCategories]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {/* Create channel (admin only) */}
        {isAdmin && (
          <ContextMenuItemWithIcon
            icon={<Plus className="h-4 w-4" />}
            shortcut="Ctrl+N"
            onClick={onCreateChannel}
          >
            Create channel
          </ContextMenuItemWithIcon>
        )}

        {/* Browse channels */}
        <ContextMenuItemWithIcon
          icon={<Search className="h-4 w-4" />}
          shortcut="Ctrl+K"
          onClick={onBrowseChannels}
        >
          Browse channels
        </ContextMenuItemWithIcon>

        {/* Create category (admin only) */}
        {isAdmin && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItemWithIcon
              icon={<FolderPlus className="h-4 w-4" />}
              onClick={onCreateCategory}
            >
              Create category
            </ContextMenuItemWithIcon>
          </>
        )}

        <ContextMenuSeparator />

        {/* Collapse/Expand all categories */}
        <ContextMenuItemWithIcon
          icon={<ChevronsUpDown className="h-4 w-4" />}
          onClick={handleToggleCollapse}
        >
          {allCollapsed ? "Expand all categories" : "Collapse all categories"}
        </ContextMenuItemWithIcon>

        {/* Refresh channels */}
        <ContextMenuItemWithIcon
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={onRefreshChannels}
        >
          Refresh channels
        </ContextMenuItemWithIcon>

        {/* Settings (admin only) */}
        {isAdmin && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItemWithIcon
              icon={<Settings className="h-4 w-4" />}
              onClick={onOpenSettings}
            >
              Channel settings
            </ContextMenuItemWithIcon>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

SidebarContextMenu.displayName = "SidebarContextMenu";
