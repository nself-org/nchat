"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  FolderPlus,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useChannelStore,
  type ChannelCategory as ChannelCategoryType,
} from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export interface ChannelCategoryProps {
  category: ChannelCategoryType;
  children?: React.ReactNode;
  onCreateChannel?: (categoryId: string) => void;
  onEditCategory?: (category: ChannelCategoryType) => void;
  onDeleteCategory?: (categoryId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelCategory({
  category,
  children,
  onCreateChannel,
  onEditCategory,
  onDeleteCategory,
}: ChannelCategoryProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const { collapsedCategories, toggleCategoryCollapse } = useChannelStore();
  const { openModal } = useUIStore();

  const isCollapsed = collapsedCategories.has(category.id);

  const handleToggle = () => {
    toggleCategoryCollapse(category.id);
  };

  const handleCreateChannel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateChannel) {
      onCreateChannel(category.id);
    } else {
      openModal("create-channel", { categoryId: category.id });
    }
  };

  const handleEditCategory = () => {
    onEditCategory?.(category);
  };

  const handleDeleteCategory = () => {
    if (onDeleteCategory) {
      onDeleteCategory(category.id);
    } else {
      openModal("confirm-action", {
        title: "Delete Category",
        message: `Are you sure you want to delete "${category.name}"? Channels in this category will become uncategorized.`,
        confirmLabel: "Delete",
        onConfirm: () => {
          useChannelStore.getState().removeCategory(category.id);
        },
      });
    }
  };

  return (
    <div className="mb-1">
      {/* Category Header */}
      <div
        className={cn(
          "group flex items-center justify-between px-2 py-1",
          "cursor-pointer select-none",
          "hover:bg-accent/50 rounded-md transition-colors",
        )}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {/* Collapse Toggle + Category Name */}
        <div className="flex min-w-0 items-center gap-1">
          <button
            className="rounded p-0.5 transition-colors hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category.name}
          </span>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Add Channel Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleCreateChannel}
              title="Create channel"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>

            {/* Category Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCreateChannel}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create channel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEditCategory}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit category
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggle}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  {isCollapsed ? "Expand" : "Collapse"} category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteCategory}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Category Content (Channels) */}
      {!isCollapsed && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

ChannelCategory.displayName = "ChannelCategory";
