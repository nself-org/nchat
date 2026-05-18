/**
 * MentionItem Component
 *
 * A single item in the mention autocomplete suggestions list.
 * Supports users, channels, groups, and roles with appropriate styling.
 */

"use client";

import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getPresenceColor } from "@/stores/user-store";
import type {
  MentionSuggestion,
  SuggestionType,
} from "@/lib/mentions/mention-types";
import type {
  MentionableUser,
  MentionableChannel,
  GroupMentionInfo,
  MentionableRole,
} from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface MentionItemProps {
  /** The suggestion to display */
  suggestion: MentionSuggestion;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Callback when item is clicked */
  onClick?: () => void;
  /** Callback when mouse enters item */
  onMouseEnter?: () => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const HashIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
    />
  </svg>
);

const LockIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const RadioIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const BotIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

function getIconForSuggestion(suggestion: MentionSuggestion) {
  switch (suggestion.type) {
    case "channel": {
      const channel = suggestion.data as MentionableChannel;
      if (channel.type === "private") {
        return <LockIcon />;
      }
      return <HashIcon />;
    }
    case "group": {
      const group = suggestion.data as GroupMentionInfo;
      if (group.icon === "users") {
        return <UsersIcon />;
      }
      if (group.icon === "radio") {
        return <RadioIcon />;
      }
      return <HashIcon />;
    }
    case "role":
      return <ShieldIcon />;
    default:
      return null;
  }
}

// ============================================================================
// Component
// ============================================================================

export const MentionItem = forwardRef<HTMLButtonElement, MentionItemProps>(
  function MentionItem(
    { suggestion, isSelected = false, onClick, onMouseEnter, className },
    ref,
  ) {
    const renderContent = () => {
      switch (suggestion.type) {
        case "user":
          return <UserMentionItem user={suggestion.data as MentionableUser} />;
        case "channel":
          return (
            <ChannelMentionItem
              channel={suggestion.data as MentionableChannel}
            />
          );
        case "group":
          return (
            <GroupMentionItem group={suggestion.data as GroupMentionInfo} />
          );
        case "role":
          return <RoleMentionItem role={suggestion.data as MentionableRole} />;
        default:
          return null;
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
          isSelected
            ? "text-accent-foreground bg-accent"
            : "hover:bg-accent/50",
          className,
        )}
      >
        {renderContent()}
      </button>
    );
  },
);

// ============================================================================
// Sub-components
// ============================================================================

interface UserMentionItemProps {
  user: MentionableUser;
}

function UserMentionItem({ user }: UserMentionItemProps) {
  const presenceColor = user.presence
    ? getPresenceColor(user.presence)
    : "#6B7280";

  return (
    <>
      {/* Avatar with presence indicator */}
      <div className="relative">
        <Avatar className="h-8 w-8">
          {user.avatarUrl && (
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          )}
          <AvatarFallback className="text-xs">
            {getInitials(user.displayName)}
          </AvatarFallback>
        </Avatar>
        {/* Online status indicator */}
        {user.presence && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-popover"
            style={{ backgroundColor: presenceColor }}
          />
        )}
        {/* Bot indicator */}
        {user.isBot && (
          <span className="text-primary-foreground absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
            <BotIcon />
          </span>
        )}
      </div>

      {/* User info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{user.displayName}</div>
        <div className="truncate text-xs text-muted-foreground">
          @{user.username}
        </div>
      </div>

      {/* Role badge */}
      {user.role && (
        <span className="text-xs capitalize text-muted-foreground">
          {user.role}
        </span>
      )}

      {/* Presence label for screen readers */}
      {user.presence && (
        <span className="sr-only">
          {user.presence === "online"
            ? "Online"
            : user.presence === "away"
              ? "Away"
              : user.presence === "dnd"
                ? "Do not disturb"
                : "Offline"}
        </span>
      )}
    </>
  );
}

interface ChannelMentionItemProps {
  channel: MentionableChannel;
}

function ChannelMentionItem({ channel }: ChannelMentionItemProps) {
  return (
    <>
      {/* Channel icon */}
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {channel.type === "private" ? <LockIcon /> : <HashIcon />}
      </div>

      {/* Channel info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{channel.name}</div>
        {channel.description && (
          <div className="truncate text-xs text-muted-foreground">
            {channel.description}
          </div>
        )}
      </div>

      {/* Type indicator */}
      {channel.type === "private" && (
        <span className="text-xs text-muted-foreground">Private</span>
      )}
    </>
  );
}

interface GroupMentionItemProps {
  group: GroupMentionInfo;
}

function GroupMentionItem({ group }: GroupMentionItemProps) {
  return (
    <>
      {/* Group icon */}
      <div className="bg-warning/10 text-warning flex h-8 w-8 items-center justify-center rounded-md">
        {group.icon === "users" && <UsersIcon />}
        {group.icon === "radio" && <RadioIcon />}
        {group.icon === "hash" && <HashIcon />}
      </div>

      {/* Group info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{group.label}</div>
        <div className="truncate text-xs text-muted-foreground">
          {group.description}
        </div>
      </div>

      {/* Warning indicator */}
      <span className="text-warning text-xs">Notifies many</span>
    </>
  );
}

interface RoleMentionItemProps {
  role: MentionableRole;
}

function RoleMentionItem({ role }: RoleMentionItemProps) {
  return (
    <>
      {/* Role icon */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-md"
        style={{
          backgroundColor: role.color ? `${role.color}20` : "hsl(var(--muted))",
          color: role.color || "hsl(var(--muted-foreground))",
        }}
      >
        <ShieldIcon />
      </div>

      {/* Role info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">@{role.name}</div>
        <div className="text-xs text-muted-foreground">
          {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
        </div>
      </div>
    </>
  );
}

export default MentionItem;
