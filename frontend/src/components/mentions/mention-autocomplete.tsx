"use client";

/**
 * MentionAutocomplete - @mention autocomplete component
 *
 * Provides autocomplete suggestions when user types @ in a message input.
 * Supports user search, online status display, roles, and special mentions
 * (@here, @channel, @everyone). Includes full keyboard navigation.
 *
 * @example
 * ```tsx
 * <MentionAutocomplete
 *   query="john"
 *   channelId={channel.id}
 *   userId={user.id}
 *   onSelect={handleMentionSelect}
 *   isOpen={showAutocomplete}
 *   onClose={handleClose}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMentionAutocomplete,
  useMentionPermissions,
  type MentionableUser,
} from "@/lib/mentions/use-mentions";
import type { MentionType } from "@/lib/mentions/mention-store";

// ============================================================================
// Types
// ============================================================================

export interface MentionSuggestion {
  type: "user" | "special";
  id: string;
  label: string;
  subLabel?: string;
  description?: string;
  avatarUrl?: string | null;
  presenceStatus?: "online" | "away" | "busy" | "offline";
  mentionType: MentionType;
}

export interface MentionAutocompleteProps {
  /** Current search query (text after @) */
  query: string;
  /** Optional channel ID for context-aware suggestions */
  channelId?: string;
  /** Current user's ID for permission checks */
  userId: string;
  /** Called when a suggestion is selected */
  onSelect: (suggestion: MentionSuggestion) => void;
  /** Whether the autocomplete is open */
  isOpen: boolean;
  /** Called when autocomplete should close */
  onClose: () => void;
  /** Maximum number of suggestions */
  maxSuggestions?: number;
  /** Position style */
  position?: React.CSSProperties;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Special Mentions Config
// ============================================================================

interface SpecialMention {
  id: string;
  label: string;
  description: string;
  mentionType: MentionType;
  icon: React.ReactNode;
}

const SPECIAL_MENTIONS: SpecialMention[] = [
  {
    id: "here",
    label: "@here",
    description: "Notify all online users in this channel",
    mentionType: "here",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "channel",
    label: "@channel",
    description: "Notify all members of this channel",
    mentionType: "channel",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 9h16M4 15h16M10 3l-1 18M15 3l-1 18" />
      </svg>
    ),
  },
  {
    id: "everyone",
    label: "@everyone",
    description: "Notify all members of the workspace",
    mentionType: "everyone",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

// ============================================================================
// Presence Status Indicator
// ============================================================================

interface PresenceIndicatorProps {
  status?: "online" | "away" | "busy" | "offline";
  className?: string;
}

function PresenceIndicator({ status, className }: PresenceIndicatorProps) {
  if (!status || status === "offline") return null;

  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full",
        "border-2 border-background",
        statusColors[status],
        className,
      )}
      aria-label={status}
    />
  );
}

// ============================================================================
// Suggestion Item Components
// ============================================================================

interface UserSuggestionItemProps {
  user: MentionableUser;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function UserSuggestionItem({
  user,
  isSelected,
  onClick,
  onMouseEnter,
}: UserSuggestionItemProps) {
  const initials = React.useMemo(() => {
    const name = user.display_name || user.username;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex cursor-pointer items-center gap-3 px-3 py-2",
        "transition-colors",
        isSelected ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={user.avatar_url || undefined}
            alt={user.display_name}
          />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <PresenceIndicator status={user.presence?.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {user.display_name || user.username}
          </span>
          {user.role && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {user.role}
            </span>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          @{user.username}
        </span>
      </div>
    </div>
  );
}

interface SpecialMentionItemProps {
  mention: SpecialMention;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function SpecialMentionItem({
  mention,
  isSelected,
  isDisabled,
  onClick,
  onMouseEnter,
}: SpecialMentionItemProps) {
  return (
    <div
      role="option"
      tabIndex={isDisabled ? -1 : 0}
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={
        isDisabled
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
      }
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex items-center gap-3 px-3 py-2",
        "transition-colors",
        isDisabled && "cursor-not-allowed opacity-50",
        !isDisabled && "cursor-pointer",
        !isDisabled && (isSelected ? "bg-accent" : "hover:bg-accent/50"),
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        {mention.icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{mention.label}</span>
        <p className="text-xs text-muted-foreground">{mention.description}</p>
        {isDisabled && (
          <p className="text-xs text-destructive">You don't have permission</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section Header
// ============================================================================

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
      {query
        ? `No users found matching "${query}"`
        : "Start typing to search users"}
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-4">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm text-muted-foreground">Searching...</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MentionAutocomplete({
  query,
  channelId,
  userId,
  onSelect,
  isOpen,
  onClose,
  maxSuggestions = 10,
  position,
  className,
}: MentionAutocompleteProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Fetch user suggestions
  const { users, isLoading } = useMentionAutocomplete({
    query,
    channelId,
    limit: maxSuggestions,
  });

  // Get permissions for special mentions
  const { canUseGroupMention } = useMentionPermissions({
    userId,
    channelId: channelId || "",
  });

  // Filter special mentions based on query
  const filteredSpecialMentions = React.useMemo(() => {
    if (!query) return SPECIAL_MENTIONS;
    const lowerQuery = query.toLowerCase();
    return SPECIAL_MENTIONS.filter(
      (m) =>
        m.label.toLowerCase().includes(lowerQuery) ||
        m.id.toLowerCase().includes(lowerQuery),
    );
  }, [query]);

  // Build suggestion list
  const suggestions = React.useMemo((): MentionSuggestion[] => {
    const items: MentionSuggestion[] = [];

    // Add special mentions first (if query matches or is empty)
    for (const special of filteredSpecialMentions) {
      items.push({
        type: "special",
        id: special.id,
        label: special.label,
        description: special.description,
        mentionType: special.mentionType,
      });
    }

    // Add user suggestions
    for (const user of users) {
      items.push({
        type: "user",
        id: user.id,
        label: user.display_name || user.username,
        subLabel: `@${user.username}`,
        avatarUrl: user.avatar_url,
        presenceStatus: user.presence?.status,
        mentionType: "user",
      });
    }

    return items.slice(0, maxSuggestions);
  }, [filteredSpecialMentions, users, maxSuggestions]);

  // Reset selection when suggestions change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case "Enter":
        case "Tab":
          event.preventDefault();
          const selected = suggestions[selectedIndex];
          if (selected) {
            // Check permission for special mentions
            if (
              selected.type === "special" &&
              !canUseGroupMention(selected.mentionType)
            ) {
              return;
            }
            onSelect(selected);
            onClose();
          }
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    suggestions,
    selectedIndex,
    onSelect,
    onClose,
    canUseGroupMention,
  ]);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (suggestion: MentionSuggestion) => {
    if (
      suggestion.type === "special" &&
      !canUseGroupMention(suggestion.mentionType)
    ) {
      return;
    }
    onSelect(suggestion);
    onClose();
  };

  // Split suggestions into sections
  const specialSuggestions = suggestions.filter((s) => s.type === "special");
  const userSuggestions = suggestions.filter((s) => s.type === "user");

  // Calculate indices for each section
  let currentIndex = 0;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Mention suggestions"
      className={cn(
        "absolute z-50 max-h-80 w-72",
        "bg-popover text-popover-foreground",
        "rounded-lg border shadow-lg",
        "overflow-hidden",
        className,
      )}
      style={position}
    >
      <ScrollArea className="max-h-80">
        {isLoading && query.length > 0 ? (
          <LoadingState />
        ) : suggestions.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <>
            {/* Special mentions section */}
            {specialSuggestions.length > 0 && (
              <>
                <SectionHeader>Special mentions</SectionHeader>
                {specialSuggestions.map((suggestion) => {
                  const specialMention = SPECIAL_MENTIONS.find(
                    (s) => s.id === suggestion.id,
                  )!;
                  const index = currentIndex++;
                  const isDisabled = !canUseGroupMention(
                    suggestion.mentionType,
                  );

                  return (
                    <SpecialMentionItem
                      key={suggestion.id}
                      mention={specialMention}
                      isSelected={selectedIndex === index}
                      isDisabled={isDisabled}
                      onClick={() => handleSelect(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    />
                  );
                })}
              </>
            )}

            {/* User suggestions section */}
            {userSuggestions.length > 0 && (
              <>
                <SectionHeader>
                  {channelId ? "Channel members" : "Users"}
                </SectionHeader>
                {userSuggestions.map((suggestion) => {
                  const index = currentIndex++;
                  const user: MentionableUser = {
                    id: suggestion.id,
                    username: suggestion.subLabel?.replace("@", "") || "",
                    display_name: suggestion.label,
                    avatar_url: suggestion.avatarUrl ?? null,
                    presence: suggestion.presenceStatus
                      ? { status: suggestion.presenceStatus }
                      : undefined,
                  };

                  return (
                    <UserSuggestionItem
                      key={suggestion.id}
                      user={user}
                      isSelected={selectedIndex === index}
                      onClick={() => handleSelect(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    />
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollArea>

      {/* Keyboard hints footer */}
      <div className="bg-muted/30 flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>
          <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Tab</kbd> or{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Enter</kbd>{" "}
          to select
        </span>
        <span>
          <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Esc</kbd> to
          close
        </span>
      </div>
    </div>
  );
}

export default MentionAutocomplete;
