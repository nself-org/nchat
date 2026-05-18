"use client";

// ===============================================================================
// Slack Workspace Switcher Component
// ===============================================================================
//
// A compact sidebar for switching between Slack workspaces with
// workspace icons, unread indicators, and add workspace button.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { slackColors } from "../config";
import { Plus, Home } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackWorkspaceSwitcherProps {
  workspaces?: SlackWorkspaceData[];
  activeWorkspaceId?: string;
  onWorkspaceSelect?: (workspaceId: string) => void;
  onAddWorkspace?: () => void;
  onHomeClick?: () => void;
  className?: string;
}

export interface SlackWorkspaceData {
  id: string;
  name: string;
  icon?: string;
  unreadCount?: number;
  mentionCount?: number;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function SlackWorkspaceSwitcher({
  workspaces = [],
  activeWorkspaceId,
  onWorkspaceSelect,
  onAddWorkspace,
  onHomeClick,
  className,
}: SlackWorkspaceSwitcherProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 py-2",
        "bg-[#350D36]",
        className,
      )}
      style={{ width: 68 }}
    >
      {/* Home Button */}
      <button
        onClick={onHomeClick}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          "text-white/80 hover:text-white",
          "transition-colors hover:bg-white/10",
        )}
      >
        <Home className="h-5 w-5" />
      </button>

      <div className="my-1 h-px w-8 bg-white/20" />

      {/* Workspace List */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {workspaces.map((workspace) => (
          <WorkspaceButton
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === activeWorkspaceId}
            onClick={() => onWorkspaceSelect?.(workspace.id)}
          />
        ))}
      </div>

      {/* Add Workspace Button */}
      <button
        onClick={onAddWorkspace}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          "border-2 border-dashed border-white/30",
          "text-white/50 hover:border-white/50 hover:text-white",
          "transition-colors",
        )}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Workspace Button Sub-component
// -------------------------------------------------------------------------------

function WorkspaceButton({
  workspace,
  isActive,
  onClick,
}: {
  workspace: SlackWorkspaceData;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasNotification =
    (workspace.unreadCount ?? 0) > 0 || (workspace.mentionCount ?? 0) > 0;
  const hasMention = (workspace.mentionCount ?? 0) > 0;

  return (
    <div className="group relative">
      {/* Active Indicator */}
      <div
        className={cn(
          "absolute left-0 top-1/2 w-1 -translate-y-1/2 rounded-r",
          "transition-all duration-200",
          isActive
            ? "h-9 bg-white"
            : hasNotification
              ? "h-2 bg-white group-hover:h-5"
              : "h-0 group-hover:h-5 group-hover:bg-white/50",
        )}
        style={{ left: -6 }}
      />

      {/* Workspace Icon */}
      <button
        onClick={onClick}
        className={cn(
          "relative h-9 w-9 overflow-hidden rounded-lg",
          "transition-all duration-200",
          isActive ? "rounded-lg" : "rounded-2xl hover:rounded-lg",
        )}
      >
        {workspace.icon ? (
          <img
            src={workspace.icon}
            alt={workspace.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-lg font-bold text-white"
            style={{ backgroundColor: slackColors.aubergineLight }}
          >
            {workspace.name[0]?.toUpperCase()}
          </div>
        )}

        {/* Notification Badge */}
        {hasMention && (
          <span
            className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 px-1 text-xs font-bold text-white"
            style={{
              backgroundColor: slackColors.red,
              borderColor: "#350D36",
            }}
          >
            {workspace.mentionCount}
          </span>
        )}

        {/* Unread Dot (when no mentions) */}
        {hasNotification && !hasMention && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
            style={{
              backgroundColor: "white",
              borderColor: "#350D36",
            }}
          />
        )}
      </button>
    </div>
  );
}

export default SlackWorkspaceSwitcher;
