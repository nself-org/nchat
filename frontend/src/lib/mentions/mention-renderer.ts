/**
 * Mention Renderer - Renders mentions in message content
 *
 * Provides utilities for rendering mentions as styled elements,
 * converting between different render formats, and serializing mentions.
 *
 * @example
 * ```typescript
 * import { renderMentionsToReact } from '@/lib/mentions/mention-renderer'
 *
 * const rendered = renderMentionsToReact(content, { users, channels, currentUserId })
 * ```
 */

import type { ReactNode } from "react";
import type {
  ParsedMention,
  MentionableUser,
  MentionableChannel,
  MentionType,
  MentionRenderMode,
  UserMentionData,
  ChannelMentionData,
  GroupMentionData,
} from "./mention-types";
import { parseMentions } from "./mention-parser";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for rendering mentions
 */
export interface MentionRenderOptions {
  /** Map of usernames to user data */
  users?: Map<string, MentionableUser>;
  /** Map of channel slugs to channel data */
  channels?: Map<string, MentionableChannel>;
  /** Current user's ID (for highlighting self-mentions) */
  currentUserId?: string;
  /** Current user's username */
  currentUsername?: string;
  /** Render mode */
  mode?: MentionRenderMode;
  /** Whether to make mentions clickable */
  clickable?: boolean;
  /** Callback when a user mention is clicked */
  onUserClick?: (userId: string) => void;
  /** Callback when a channel mention is clicked */
  onChannelClick?: (channelId: string) => void;
  /** Callback when a group mention is clicked */
  onGroupClick?: (type: "everyone" | "here" | "channel") => void;
  /** Custom class name for mentions */
  className?: string;
  /** Custom class name for self-mentions (when user is mentioned) */
  selfMentionClassName?: string;
}

/**
 * A rendered mention segment
 */
export interface RenderSegment {
  type: "text" | "mention";
  content: string;
  mention?: ParsedMention;
  isSelfMention?: boolean;
}

// ============================================================================
// CSS Class Helpers
// ============================================================================

/**
 * Get CSS classes for a mention
 */
export function getMentionClasses(
  type: MentionType,
  options: {
    isSelfMention?: boolean;
    isUnresolved?: boolean;
    mode?: MentionRenderMode;
    className?: string;
    selfMentionClassName?: string;
  } = {},
): string {
  const {
    isSelfMention = false,
    isUnresolved = false,
    mode = "chip",
    className = "",
    selfMentionClassName = "",
  } = options;

  const classes = ["mention", `mention-${type}`, `mention-mode-${mode}`];

  if (isSelfMention) {
    classes.push("mention-self");
    if (selfMentionClassName) {
      classes.push(selfMentionClassName);
    }
  }

  if (isUnresolved) {
    classes.push("mention-unresolved");
  }

  if (type === "everyone" || type === "here") {
    classes.push("mention-group");
  }

  if (className) {
    classes.push(className);
  }

  return classes.join(" ");
}

/**
 * Default CSS styles for mentions (as CSS-in-JS object)
 */
export const MENTION_STYLES = {
  base: {
    display: "inline",
    padding: "0 4px",
    borderRadius: "3px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  },
  user: {
    backgroundColor: "hsl(var(--primary) / 0.1)",
    color: "hsl(var(--primary))",
  },
  channel: {
    backgroundColor: "hsl(var(--secondary) / 0.2)",
    color: "hsl(var(--secondary-foreground))",
  },
  group: {
    backgroundColor: "hsl(var(--warning) / 0.15)",
    color: "hsl(var(--warning))",
    fontWeight: 600,
  },
  self: {
    backgroundColor: "hsl(var(--primary) / 0.2)",
    color: "hsl(var(--primary))",
    fontWeight: 600,
  },
  unresolved: {
    backgroundColor: "hsl(var(--muted) / 0.5)",
    color: "hsl(var(--muted-foreground))",
    fontStyle: "italic" as const,
  },
};

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Split content into text and mention segments
 */
export function splitIntoSegments(
  content: string,
  options: MentionRenderOptions = {},
): RenderSegment[] {
  const { currentUsername } = options;
  const result = parseMentions(content);
  const segments: RenderSegment[] = [];

  let lastIndex = 0;

  for (const mention of result.mentions) {
    // Add text before this mention
    if (mention.start > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, mention.start),
      });
    }

    // Check if this is a self-mention
    const isSelfMention = Boolean(
      currentUsername &&
      mention.type === "user" &&
      mention.identifier.toLowerCase() === currentUsername.toLowerCase(),
    );

    // Add the mention
    segments.push({
      type: "mention",
      content: mention.raw,
      mention,
      isSelfMention,
    });

    lastIndex = mention.end;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Render content with mentions as HTML string
 */
export function renderMentionsToHTML(
  content: string,
  options: MentionRenderOptions = {},
): string {
  const {
    users = new Map(),
    channels = new Map(),
    currentUsername,
    mode = "chip",
    clickable = true,
  } = options;

  const segments = splitIntoSegments(content, options);
  let html = "";

  for (const segment of segments) {
    if (segment.type === "text") {
      html += escapeHTML(segment.content);
    } else if (segment.mention) {
      const mention = segment.mention;
      const classes = getMentionClasses(mention.type, {
        isSelfMention: segment.isSelfMention,
        isUnresolved: !mention.data,
        mode,
      });

      let displayText = mention.raw;
      let dataAttrs = "";

      // Get display text and data attributes based on type
      if (mention.type === "user") {
        const user = users.get(mention.identifier.toLowerCase());
        if (user) {
          displayText = `@${user.displayName}`;
          dataAttrs = `data-user-id="${user.id}" data-username="${user.username}"`;
        }
      } else if (mention.type === "channel") {
        const channel = channels.get(mention.identifier.toLowerCase());
        if (channel) {
          displayText = `#${channel.name}`;
          dataAttrs = `data-channel-id="${channel.id}" data-channel-slug="${channel.slug}"`;
        }
      } else if (mention.type === "everyone" || mention.type === "here") {
        displayText = `@${mention.type}`;
        dataAttrs = `data-mention-type="${mention.type}"`;
      }

      const interactiveAttrs = clickable ? 'tabindex="0" role="button"' : "";

      html += `<span class="${classes}" ${dataAttrs} ${interactiveAttrs}>${escapeHTML(displayText)}</span>`;
    }
  }

  return html;
}

/**
 * Get plain text representation of mentions
 */
export function renderMentionsToPlainText(
  content: string,
  options: MentionRenderOptions = {},
): string {
  const { users = new Map(), channels = new Map() } = options;

  const segments = splitIntoSegments(content, options);
  let text = "";

  for (const segment of segments) {
    if (segment.type === "text") {
      text += segment.content;
    } else if (segment.mention) {
      const mention = segment.mention;

      if (mention.type === "user") {
        const user = users.get(mention.identifier.toLowerCase());
        text += user ? `@${user.displayName}` : mention.raw;
      } else if (mention.type === "channel") {
        const channel = channels.get(mention.identifier.toLowerCase());
        text += channel ? `#${channel.name}` : mention.raw;
      } else {
        text += mention.raw;
      }
    }
  }

  return text;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serialize mentions for storage/API
 * Converts mentions to a standard format with IDs
 */
export interface SerializedMention {
  type: MentionType;
  id: string;
  start: number;
  end: number;
}

export function serializeMentions(
  content: string,
  users: Map<string, MentionableUser>,
  channels: Map<string, MentionableChannel>,
): {
  content: string;
  mentions: SerializedMention[];
} {
  const result = parseMentions(content);
  const serialized: SerializedMention[] = [];

  for (const mention of result.mentions) {
    if (mention.type === "user") {
      const user = users.get(mention.identifier.toLowerCase());
      if (user) {
        serialized.push({
          type: "user",
          id: user.id,
          start: mention.start,
          end: mention.end,
        });
      }
    } else if (mention.type === "channel") {
      const channel = channels.get(mention.identifier.toLowerCase());
      if (channel) {
        serialized.push({
          type: "channel",
          id: channel.id,
          start: mention.start,
          end: mention.end,
        });
      }
    } else if (mention.type === "everyone" || mention.type === "here") {
      serialized.push({
        type: mention.type,
        id: mention.type,
        start: mention.start,
        end: mention.end,
      });
    }
  }

  return { content, mentions: serialized };
}

/**
 * Deserialize mentions for display
 */
export function deserializeMentions(
  content: string,
  mentions: SerializedMention[],
  users: Map<string, MentionableUser>,
  channels: Map<string, MentionableChannel>,
): string {
  // Sort mentions by position (descending) to replace from end
  const sorted = [...mentions].sort((a, b) => b.start - a.start);

  let result = content;

  for (const mention of sorted) {
    let replacement = "";

    if (mention.type === "user") {
      const user = users.get(mention.id);
      replacement = user ? `@${user.username}` : `@unknown`;
    } else if (mention.type === "channel") {
      const channel = channels.get(mention.id);
      replacement = channel ? `#${channel.slug}` : `#unknown`;
    } else {
      replacement = `@${mention.type}`;
    }

    result =
      result.slice(0, mention.start) + replacement + result.slice(mention.end);
  }

  return result;
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Get accessible label for a mention
 */
export function getMentionAriaLabel(
  mention: ParsedMention,
  options: MentionRenderOptions = {},
): string {
  const { users = new Map(), channels = new Map() } = options;

  switch (mention.type) {
    case "user": {
      const user = users.get(mention.identifier.toLowerCase());
      if (user) {
        return `User mention: ${user.displayName}`;
      }
      return `User mention: ${mention.identifier}`;
    }
    case "channel": {
      const channel = channels.get(mention.identifier.toLowerCase());
      if (channel) {
        return `Channel mention: ${channel.name}`;
      }
      return `Channel mention: ${mention.identifier}`;
    }
    case "everyone":
      return "Mention: everyone in workspace";
    case "here":
      return "Mention: online members";
    default:
      return `Mention: ${mention.raw}`;
  }
}

/**
 * Get screen reader announcement for a new mention notification
 */
export function getMentionAnnouncement(
  senderName: string,
  channelName: string,
  mentionType: MentionType,
): string {
  const typeText = {
    user: "mentioned you",
    channel: "linked to a channel",
    everyone: "mentioned everyone",
    here: "mentioned online members",
    role: "mentioned your role",
  };

  return `${senderName} ${typeText[mentionType]} in ${channelName}`;
}

// ============================================================================
// TipTap Integration Helpers
// ============================================================================

/**
 * Create a TipTap mention node attributes object
 */
export function createMentionNodeAttrs(
  type: "user" | "channel",
  data: MentionableUser | MentionableChannel,
): Record<string, string> {
  if (type === "user") {
    const user = data as MentionableUser;
    return {
      id: user.id,
      label: user.displayName,
      username: user.username,
    };
  } else {
    const channel = data as MentionableChannel;
    return {
      id: channel.id,
      label: channel.name,
      slug: channel.slug,
    };
  }
}

/**
 * Parse mention node attributes from TipTap
 */
export function parseMentionNodeAttrs(
  attrs: Record<string, string>,
  type: "user" | "channel",
): UserMentionData | ChannelMentionData {
  if (type === "user") {
    return {
      type: "user",
      userId: attrs.id,
      username: attrs.username || attrs.label,
      displayName: attrs.label,
    };
  } else {
    return {
      type: "channel",
      channelId: attrs.id,
      channelName: attrs.label,
      channelSlug: attrs.slug || attrs.label,
    };
  }
}

// ============================================================================
// Highlight Helpers
// ============================================================================

/**
 * Check if message content should be highlighted for current user
 */
export function shouldHighlightMessage(
  content: string,
  currentUsername: string,
  options: { highlightOnEveryone?: boolean; highlightOnHere?: boolean } = {},
): boolean {
  const { highlightOnEveryone = true, highlightOnHere = true } = options;
  const result = parseMentions(content);

  // Check for direct user mention
  for (const mention of result.mentions) {
    if (
      mention.type === "user" &&
      mention.identifier.toLowerCase() === currentUsername.toLowerCase()
    ) {
      return true;
    }
  }

  // Check for group mentions
  if (highlightOnEveryone && result.hasEveryone) {
    return true;
  }

  if (highlightOnHere && result.hasHere) {
    return true;
  }

  return false;
}

/**
 * Get highlight intensity based on mention type
 */
export function getMentionHighlightIntensity(
  content: string,
  currentUsername: string,
): "none" | "low" | "medium" | "high" {
  const result = parseMentions(content);

  // Direct mention = high
  for (const mention of result.mentions) {
    if (
      mention.type === "user" &&
      mention.identifier.toLowerCase() === currentUsername.toLowerCase()
    ) {
      return "high";
    }
  }

  // @everyone = medium
  if (result.hasEveryone) {
    return "medium";
  }

  // @here or @channel = low
  if (result.hasHere || result.hasChannel) {
    return "low";
  }

  return "none";
}
