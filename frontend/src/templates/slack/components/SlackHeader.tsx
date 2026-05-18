"use client";

// ===============================================================================
// Slack Header Component
// ===============================================================================
//
// The channel header with channel name, description, member count,
// and action buttons (call, huddle, search, etc.)
//
// ===============================================================================

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Hash,
  Lock,
  ChevronDown,
  Users,
  Pin,
  Headphones,
  Search,
  MoreVertical,
  Star,
  Bookmark,
  Phone,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackHeaderProps {
  channelName?: string;
  channelDescription?: string;
  isPrivate?: boolean;
  memberCount?: number;
  pinnedCount?: number;
  isStarred?: boolean;
  onHuddleClick?: () => void;
  onCallClick?: () => void;
  onSearchClick?: () => void;
  onMembersClick?: () => void;
  onPinnedClick?: () => void;
  onStarClick?: () => void;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function SlackHeader({
  channelName = "general",
  channelDescription,
  isPrivate = false,
  memberCount,
  pinnedCount,
  isStarred = false,
  onHuddleClick,
  onCallClick,
  onSearchClick,
  onMembersClick,
  onPinnedClick,
  onStarClick,
  className,
}: SlackHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4",
        "bg-white dark:bg-[#1A1D21]",
        "border-b border-[#DDDDDD] dark:border-[#35383C]",
        className,
      )}
      style={{ height: 49 }}
    >
      {/* Left: Channel Info */}
      <div className="flex min-w-0 items-center gap-2">
        <button className="-ml-2 flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-[#35383C]">
          {isPrivate ? (
            <Lock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
          <span className="truncate text-lg font-bold text-gray-900 dark:text-white">
            {channelName}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Star button */}
        <button
          onClick={onStarClick}
          className={cn(
            "rounded p-1 hover:bg-gray-100 dark:hover:bg-[#35383C]",
            isStarred ? "text-yellow-500" : "text-gray-400",
          )}
        >
          <Star
            className="h-4 w-4"
            fill={isStarred ? "currentColor" : "none"}
          />
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-[#35383C]" />

        {/* Members */}
        {memberCount !== undefined && (
          <button
            onClick={onMembersClick}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <Users className="h-4 w-4" />
            <span>{memberCount}</span>
          </button>
        )}

        {/* Pinned */}
        {pinnedCount !== undefined && pinnedCount > 0 && (
          <button
            onClick={onPinnedClick}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <Pin className="h-4 w-4" />
            <span>{pinnedCount}</span>
          </button>
        )}

        {/* Description */}
        {channelDescription && (
          <>
            <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-[#35383C]" />
            <span className="max-w-[200px] truncate text-sm text-gray-500 dark:text-gray-400">
              {channelDescription}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Huddle */}
        <button
          onClick={onHuddleClick}
          className={cn(
            "flex items-center gap-1 rounded px-3 py-1.5",
            "text-sm text-gray-700 dark:text-gray-300",
            "hover:bg-gray-100 dark:hover:bg-[#35383C]",
            "border border-gray-300 dark:border-[#35383C]",
          )}
        >
          <Headphones className="h-4 w-4" />
          <span>Huddle</span>
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-[#35383C]" />

        {/* Icon buttons */}
        <button
          onClick={onSearchClick}
          className="rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#35383C]"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default SlackHeader;
