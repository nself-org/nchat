"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Mail, Shield, Crown, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserSearchResult } from "@/stores/search-store";
import { HighlightedText } from "./search-result-message";

// ============================================================================
// Types
// ============================================================================

export type UserStatus = "online" | "away" | "busy" | "offline";

export interface SearchResultUserProps {
  /** The user search result data */
  result: UserSearchResult;
  /** The search query to highlight */
  query?: string;
  /** Whether this result is currently selected/focused */
  isSelected?: boolean;
  /** Callback when "Message" button is clicked */
  onMessage?: (result: UserSearchResult) => void;
  /** Callback when user profile is clicked */
  onClick?: (result: UserSearchResult) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Status Configuration
// ============================================================================

const statusConfig: Record<
  UserStatus,
  { label: string; color: string; bgColor: string }
> = {
  online: {
    label: "Online",
    color: "bg-green-500",
    bgColor: "bg-green-500/20",
  },
  away: {
    label: "Away",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500/20",
  },
  busy: {
    label: "Do not disturb",
    color: "bg-red-500",
    bgColor: "bg-red-500/20",
  },
  offline: {
    label: "Offline",
    color: "bg-gray-400",
    bgColor: "bg-gray-400/20",
  },
};

// ============================================================================
// Role Configuration
// ============================================================================

const roleConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-500" },
  admin: { label: "Admin", icon: Shield, color: "text-red-500" },
  moderator: { label: "Moderator", icon: UserCog, color: "text-blue-500" },
  member: { label: "Member", icon: () => null, color: "text-muted-foreground" },
  guest: { label: "Guest", icon: () => null, color: "text-muted-foreground" },
};

// ============================================================================
// Component
// ============================================================================

export function SearchResultUser({
  result,
  query = "",
  isSelected = false,
  onMessage,
  onClick,
  className,
}: SearchResultUserProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMessage?.(result);
  };

  // Get status config
  const status = statusConfig[result.status];

  // Get role config
  const role = roleConfig[result.role] ?? roleConfig.member;
  const RoleIcon = role.icon;

  // Get initials for avatar fallback
  const initials = result.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Format last seen
  const lastSeenText = result.lastSeen
    ? `Last seen ${formatDistanceToNow(new Date(result.lastSeen), { addSuffix: true })}`
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border p-3 transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "border-primary/50 bg-accent",
        className,
      )}
    >
      {/* Avatar with presence indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {result.avatar && (
            <AvatarImage src={result.avatar} alt={result.displayName} />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        {/* Presence indicator */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            status.color,
          )}
          title={status.label}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Name and role */}
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            <HighlightedText text={result.displayName} query={query} />
          </span>

          {/* Role badge (for non-member roles) */}
          {result.role !== "member" && result.role !== "guest" && (
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-xs">
              <RoleIcon className={cn("h-3 w-3", role.color)} />
              {role.label}
            </Badge>
          )}
        </div>

        {/* Username and email */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">
            @<HighlightedText text={result.username} query={query} />
          </span>
          {result.email && (
            <>
              <span className="text-muted-foreground/30">|</span>
              <span className="truncate">
                <HighlightedText text={result.email} query={query} />
              </span>
            </>
          )}
        </div>

        {/* Status text for offline users */}
        {result.status === "offline" && lastSeenText && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {lastSeenText}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={cn(
          "flex shrink-0 gap-2 opacity-0 transition-opacity",
          "group-hover:opacity-100",
          isSelected && "opacity-100",
        )}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={handleMessage}
          className="h-8 gap-1.5 px-3"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface CompactUserResultProps {
  result: UserSearchResult;
  query?: string;
  isSelected?: boolean;
  onClick?: (result: UserSearchResult) => void;
  className?: string;
}

export function CompactUserResult({
  result,
  query = "",
  isSelected = false,
  onClick,
  className,
}: CompactUserResultProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const status = statusConfig[result.status];

  const initials = result.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        className,
      )}
    >
      {/* Avatar with presence */}
      <div className="relative shrink-0">
        <Avatar className="h-6 w-6">
          {result.avatar && (
            <AvatarImage src={result.avatar} alt={result.displayName} />
          )}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
            status.color,
          )}
        />
      </div>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate">
        <HighlightedText text={result.displayName} query={query} />
      </span>

      {/* Username */}
      <span className="shrink-0 text-xs text-muted-foreground">
        @{result.username}
      </span>
    </div>
  );
}

// ============================================================================
// User Card (for hover/popover)
// ============================================================================

export interface UserCardProps {
  result: UserSearchResult;
  onMessage?: (result: UserSearchResult) => void;
  onEmail?: (result: UserSearchResult) => void;
  className?: string;
}

export function UserCard({
  result,
  onMessage,
  onEmail,
  className,
}: UserCardProps) {
  const status = statusConfig[result.status];
  const role = roleConfig[result.role] ?? roleConfig.member;
  const RoleIcon = role.icon;

  const initials = result.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const lastSeenText = result.lastSeen
    ? `Last seen ${formatDistanceToNow(new Date(result.lastSeen), { addSuffix: true })}`
    : null;

  return (
    <div className={cn("w-64 rounded-lg border bg-popover p-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            {result.avatar && (
              <AvatarImage src={result.avatar} alt={result.displayName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-popover",
              status.color,
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold">{result.displayName}</span>
            {RoleIcon && <RoleIcon className={cn("h-4 w-4", role.color)} />}
          </div>
          <div className="text-sm text-muted-foreground">
            @{result.username}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className={cn("h-2 w-2 rounded-full", status.color)} />
        <span className="text-muted-foreground">
          {result.status === "offline" && lastSeenText
            ? lastSeenText
            : status.label}
        </span>
      </div>

      {/* Role */}
      {result.role !== "member" && result.role !== "guest" && (
        <div className="mt-2">
          <Badge variant="secondary" className="gap-1">
            <RoleIcon className={cn("h-3 w-3", role.color)} />
            {role.label}
          </Badge>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onMessage?.(result)}
          className="flex-1 gap-1.5"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>
        {result.email && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEmail?.(result)}
            className="gap-1.5"
          >
            <Mail className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// User Result Skeleton
// ============================================================================

export function UserResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse items-center gap-3 rounded-lg border p-3",
        className,
      )}
    >
      <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
    </div>
  );
}

// ============================================================================
// Presence Indicator (standalone)
// ============================================================================

export interface PresenceIndicatorProps {
  status: UserStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PresenceIndicator({
  status,
  size = "md",
  className,
}: PresenceIndicatorProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn("rounded-full", sizeClasses[size], config.color, className)}
      title={config.label}
    />
  );
}

export default SearchResultUser;
