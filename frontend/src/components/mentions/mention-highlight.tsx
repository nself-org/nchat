"use client";

/**
 * MentionHighlight - Highlighted @mention display in messages
 *
 * Renders styled @mentions in message content with visual distinction
 * between mentions of the current user and others. Clicking opens
 * the user profile.
 *
 * @example
 * ```tsx
 * // Single mention
 * <MentionHighlight
 *   username="john"
 *   userId="user-123"
 *   currentUserId={currentUser.id}
 *   onClick={handleProfileOpen}
 * />
 *
 * // Parse and render message content with highlights
 * <MentionHighlightedText
 *   content="Hey @john, check this out with @everyone"
 *   currentUserId={currentUser.id}
 *   onMentionClick={handleMentionClick}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  parseMentions,
  getMentionType,
  isSpecialMention,
} from "@/lib/mentions/use-mentions";
import type { MentionType } from "@/lib/mentions/mention-store";

// ============================================================================
// Types
// ============================================================================

export interface MentionHighlightProps {
  /** Username or special mention text (without @) */
  username: string;
  /** User ID if this is a user mention */
  userId?: string;
  /** Current user's ID to determine self-mention styling */
  currentUserId?: string;
  /** The type of mention */
  type?: MentionType;
  /** Called when the mention is clicked */
  onClick?: (userId: string | null, type: MentionType) => void;
  /** Whether the mention is clickable */
  clickable?: boolean;
  /** Additional className */
  className?: string;
}

export interface MentionHighlightedTextProps {
  /** The message content containing @mentions */
  content: string;
  /** Current user's ID */
  currentUserId?: string;
  /** Current user's username (for self-mention detection) */
  currentUsername?: string;
  /** Mapping of usernames to user IDs */
  userMap?: Map<string, string>;
  /** Called when a mention is clicked */
  onMentionClick?: (
    userId: string | null,
    type: MentionType,
    username: string,
  ) => void;
  /** Additional className for the container */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMentionStyles(
  type: MentionType,
  isSelfMention: boolean,
  clickable: boolean,
): string {
  const baseStyles =
    "inline-flex items-center rounded px-1 font-medium text-sm";

  // Self mention - more prominent styling
  if (isSelfMention) {
    return cn(
      baseStyles,
      "bg-primary/20 text-primary",
      clickable && "cursor-pointer hover:bg-primary/30",
    );
  }

  // Special mentions (@here, @channel, @everyone)
  if (type === "here" || type === "channel" || type === "everyone") {
    return cn(
      baseStyles,
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      clickable &&
        "cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50",
    );
  }

  // Regular user mention
  return cn(
    baseStyles,
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    clickable && "cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50",
  );
}

// ============================================================================
// Single Mention Highlight Component
// ============================================================================

export function MentionHighlight({
  username,
  userId,
  currentUserId,
  type = "user",
  onClick,
  clickable = true,
  className,
}: MentionHighlightProps) {
  // Determine if this is a self-mention
  const isSelfMention = React.useMemo(() => {
    if (!currentUserId || !userId) return false;
    return userId === currentUserId;
  }, [currentUserId, userId]);

  // Determine the actual mention type
  const mentionType = React.useMemo((): MentionType => {
    if (type !== "user") return type;
    return getMentionType(username);
  }, [type, username]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (clickable && onClick) {
        onClick(userId || null, mentionType);
      }
    },
    [clickable, onClick, userId, mentionType],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && clickable && onClick) {
        e.preventDefault();
        e.stopPropagation();
        onClick(userId || null, mentionType);
      }
    },
    [clickable, onClick, userId, mentionType],
  );

  const styles = getMentionStyles(mentionType, isSelfMention, clickable);

  // Get icon for special mentions
  const icon = React.useMemo(() => {
    if (mentionType === "here") {
      return (
        <svg className="mr-0.5 h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    }
    if (mentionType === "channel") {
      return (
        <svg
          className="mr-0.5 h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 9h16M4 15h16M10 3l-1 18M15 3l-1 18" />
        </svg>
      );
    }
    if (mentionType === "everyone") {
      return (
        <svg
          className="mr-0.5 h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    }
    return null;
  }, [mentionType]);

  const displayText = `@${username}`;

  if (!clickable) {
    return (
      <span className={cn(styles, className)}>
        {icon}
        {displayText}
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(styles, className)}
      aria-label={
        isSelfMention
          ? "Mention of you"
          : mentionType !== "user"
            ? `${mentionType} mention`
            : `Mention of ${username}`
      }
    >
      {icon}
      {displayText}
    </span>
  );
}

// ============================================================================
// Full Text Component with Highlighted Mentions
// ============================================================================

export function MentionHighlightedText({
  content,
  currentUserId,
  currentUsername,
  userMap = new Map(),
  onMentionClick,
  className,
}: MentionHighlightedTextProps) {
  // Parse content and render with highlights
  const renderedContent = React.useMemo(() => {
    const mentions = parseMentions(content);

    if (mentions.length === 0) {
      return content;
    }

    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i];

      // Add text before this mention
      if (mention.start > lastIndex) {
        result.push(content.slice(lastIndex, mention.start));
      }

      // Determine mention details
      const username = mention.text;
      const mentionType = getMentionType(username);
      const isSpecial = isSpecialMention(username);
      const userId = isSpecial
        ? undefined
        : userMap.get(username.toLowerCase());

      // Check if this is a self-mention
      const isSelfMention =
        currentUsername?.toLowerCase() === username.toLowerCase() ||
        (userId && userId === currentUserId);

      // Add the mention highlight
      result.push(
        <MentionHighlight
          key={`mention-${i}-${mention.start}`}
          username={username}
          userId={userId}
          currentUserId={currentUserId}
          type={mentionType}
          onClick={
            onMentionClick
              ? (id, type) => onMentionClick(id, type, username)
              : undefined
          }
          clickable={!!onMentionClick}
        />,
      );

      lastIndex = mention.end;
    }

    // Add remaining text after last mention
    if (lastIndex < content.length) {
      result.push(content.slice(lastIndex));
    }

    return result;
  }, [content, currentUserId, currentUsername, userMap, onMentionClick]);

  return <span className={className}>{renderedContent}</span>;
}

// ============================================================================
// Mention Badge (Standalone badge for mention count)
// ============================================================================

export interface MentionBadgeProps {
  /** Number of mentions */
  count: number;
  /** Whether mentions include self-mentions */
  hasSelfMention?: boolean;
  /** Additional className */
  className?: string;
}

export function MentionBadge({
  count,
  hasSelfMention = false,
  className,
}: MentionBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        hasSelfMention
          ? "bg-primary/20 text-primary"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        className,
      )}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
      </svg>
      {count}
    </span>
  );
}

// ============================================================================
// Inline Mention Link (For rendering in tooltips, etc.)
// ============================================================================

export interface InlineMentionProps {
  username: string;
  displayName?: string;
  type?: MentionType;
  className?: string;
}

export function InlineMention({
  username,
  displayName,
  type = "user",
  className,
}: InlineMentionProps) {
  const isSpecial = type !== "user";

  return (
    <span
      className={cn(
        "font-medium",
        isSpecial ? "text-amber-600 dark:text-amber-400" : "text-primary",
        className,
      )}
    >
      @{displayName || username}
    </span>
  );
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Check if content contains any mentions
 */
export function hasMentions(content: string): boolean {
  return parseMentions(content).length > 0;
}

/**
 * Check if content contains a mention of a specific user
 */
export function containsUserMention(
  content: string,
  username: string,
): boolean {
  const mentions = parseMentions(content);
  const lowerUsername = username.toLowerCase();
  return mentions.some((m) => m.text.toLowerCase() === lowerUsername);
}

/**
 * Check if content contains any special mentions
 */
export function containsSpecialMention(content: string): boolean {
  const mentions = parseMentions(content);
  return mentions.some((m) => isSpecialMention(m.text));
}

/**
 * Extract all usernames mentioned in content
 */
export function extractMentionedUsernames(content: string): string[] {
  const mentions = parseMentions(content);
  return mentions
    .filter((m) => !isSpecialMention(m.text))
    .map((m) => m.text.toLowerCase());
}

export default MentionHighlight;
