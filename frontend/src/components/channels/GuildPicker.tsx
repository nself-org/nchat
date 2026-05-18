/**
 * GuildPicker - Discord-style server/guild picker
 *
 * Displays server icons in left sidebar with:
 * - Server icon/initial
 * - Hover state with name
 * - Notification indicators
 * - Boost indicator
 * - Add server button
 */

"use client";

import * as React from "react";
import { useState } from "react";
import { Plus, Home, Compass, ChevronDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Workspace } from "@/types/advanced-channels";

// ============================================================================
// Types
// ============================================================================

export interface GuildPickerProps {
  workspaces: Workspace[];
  currentWorkspaceId?: string;
  onWorkspaceSelect?: (workspaceId: string) => void;
  onAddWorkspace?: () => void;
  onDiscoverWorkspaces?: () => void;
  showHome?: boolean;
  className?: string;
}

export interface GuildItemProps {
  workspace: Workspace;
  isActive: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

// ============================================================================
// Guild Item Component
// ============================================================================

function GuildItem({
  workspace,
  isActive,
  hasUnread = false,
  unreadCount = 0,
  onClick,
}: GuildItemProps) {
  const initials = workspace.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const showBoost = workspace.boostTier > 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="relative flex items-center justify-center px-3 py-2">
            {/* Left indicator */}
            <div
              className={cn(
                "absolute left-0 h-8 w-1 rounded-r-full bg-foreground transition-all",
                isActive ? "h-10" : hasUnread ? "h-5" : "h-0",
              )}
            />

            {/* Server icon */}
            <button
              onClick={onClick}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:rounded-xl",
                isActive
                  ? "rounded-xl bg-primary"
                  : "hover:bg-primary/20 bg-muted",
                "group",
              )}
            >
              {workspace.iconUrl ? (
                <Avatar className="h-12 w-12">
                  <AvatarImage src={workspace.iconUrl} alt={workspace.name} />
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {initials}
                </span>
              )}

              {/* Boost indicator */}
              {showBoost && (
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full",
                    workspace.boostTier === 1 && "bg-pink-500",
                    workspace.boostTier === 2 && "bg-pink-600",
                    workspace.boostTier >= 3 &&
                      "bg-gradient-to-r from-pink-500 to-purple-500",
                  )}
                >
                  <Zap className="h-3 w-3 fill-white text-white" />
                </div>
              )}

              {/* Unread badge */}
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{workspace.name}</span>
          {showBoost && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              <span>Tier {workspace.boostTier}</span>
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Separator
// ============================================================================

function Separator() {
  return <div className="mx-auto my-2 h-px w-8 bg-border" />;
}

// ============================================================================
// Add/Action Button
// ============================================================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  variant?: "add" | "discover";
  onClick: () => void;
}

function ActionButton({
  icon,
  label,
  variant = "add",
  onClick,
}: ActionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center px-3 py-2">
            <button
              onClick={onClick}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:rounded-xl",
                variant === "add" &&
                  "bg-muted text-muted-foreground hover:bg-green-600 hover:text-white",
                variant === "discover" &&
                  "hover:text-primary-foreground bg-muted text-muted-foreground hover:bg-primary",
              )}
            >
              {icon}
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GuildPicker({
  workspaces,
  currentWorkspaceId,
  onWorkspaceSelect,
  onAddWorkspace,
  onDiscoverWorkspaces,
  showHome = true,
  className,
}: GuildPickerProps) {
  // Mock unread counts for demo
  const getUnreadCount = (workspaceId: string) => {
    // In production, this would come from props or a store
    return Math.floor(Math.random() * 10);
  };

  return (
    <div
      className={cn("flex w-[72px] flex-col border-r bg-background", className)}
    >
      <ScrollArea className="flex-1">
        <div className="flex flex-col py-3">
          {/* Home/DM button */}
          {showHome && (
            <>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div className="relative flex items-center justify-center px-3 py-2">
                      <div
                        className={cn(
                          "absolute left-0 h-8 w-1 rounded-r-full bg-foreground transition-all",
                          !currentWorkspaceId ? "h-10" : "h-0",
                        )}
                      />
                      <button
                        onClick={() => onWorkspaceSelect?.("")}
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:rounded-xl",
                          !currentWorkspaceId
                            ? "text-primary-foreground rounded-xl bg-primary"
                            : "hover:bg-primary/20 bg-muted text-muted-foreground",
                        )}
                      >
                        <Home className="h-5 w-5" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <span>Home</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Separator />
            </>
          )}

          {/* Server list */}
          {workspaces.map((workspace) => (
            <GuildItem
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === currentWorkspaceId}
              hasUnread={getUnreadCount(workspace.id) > 0}
              unreadCount={getUnreadCount(workspace.id)}
              onClick={() => onWorkspaceSelect?.(workspace.id)}
            />
          ))}

          {/* Action buttons */}
          {(onAddWorkspace || onDiscoverWorkspaces) && (
            <>
              <Separator />
              {onAddWorkspace && (
                <ActionButton
                  icon={<Plus className="h-5 w-5" />}
                  label="Add a Server"
                  variant="add"
                  onClick={onAddWorkspace}
                />
              )}
              {onDiscoverWorkspaces && (
                <ActionButton
                  icon={<Compass className="h-5 w-5" />}
                  label="Discover Servers"
                  variant="discover"
                  onClick={onDiscoverWorkspaces}
                />
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default GuildPicker;
