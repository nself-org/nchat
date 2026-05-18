/**
 * TipTap Mention Extension - Custom mention extensions for TipTap editor
 *
 * Provides TipTap extensions for:
 * - @user mentions
 * - #channel mentions
 * - @everyone/@here/@channel group mentions
 *
 * @example
 * ```typescript
 * import { createUserMentionExtension, createChannelMentionExtension } from '@/lib/editor/mention-extension'
 *
 * const extensions = [
 *   createUserMentionExtension({ onSelect: handleUserSelect }),
 *   createChannelMentionExtension({ onSelect: handleChannelSelect }),
 * ]
 * ```
 */

import { Extension, mergeAttributes, Node } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { Editor } from "@tiptap/core";
import type {
  MentionableUser,
  MentionableChannel,
  MentionSuggestion,
  GroupMentionInfo,
  MentionPermissions,
} from "@/lib/mentions/mention-types";
import { GROUP_MENTIONS } from "@/lib/mentions/mention-types";
import {
  filterMentionSuggestions,
  addRecentMention,
} from "@/lib/mentions/mention-autocomplete";

// ============================================================================
// Types
// ============================================================================

/**
 * Props passed to suggestion renderer
 */
export interface MentionSuggestionRenderProps extends SuggestionProps<MentionSuggestion> {
  editor: Editor;
}

/**
 * Suggestion renderer interface
 */
export interface MentionSuggestionRenderer {
  onStart: (props: MentionSuggestionRenderProps) => void;
  onUpdate: (props: MentionSuggestionRenderProps) => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  onExit: () => void;
}

/**
 * Options for the user mention extension
 */
export interface UserMentionExtensionOptions {
  /** Function to get users for autocomplete */
  getUsers: () => MentionableUser[];
  /** Function to get current user's permissions */
  getPermissions?: () => MentionPermissions;
  /** Channel member IDs for prioritization */
  channelMemberIds?: Set<string>;
  /** Callback when a mention is selected */
  onSelect?: (user: MentionableUser) => void;
  /** Render component for suggestions */
  suggestionRenderer?: () => MentionSuggestionRenderer;
  /** Additional HTML attributes */
  HTMLAttributes?: Record<string, string>;
}

/**
 * Options for the channel mention extension
 */
export interface ChannelMentionExtensionOptions {
  /** Function to get channels for autocomplete */
  getChannels: () => MentionableChannel[];
  /** Callback when a mention is selected */
  onSelect?: (channel: MentionableChannel) => void;
  /** Render component for suggestions */
  suggestionRenderer?: () => MentionSuggestionRenderer;
  /** Additional HTML attributes */
  HTMLAttributes?: Record<string, string>;
}

// ============================================================================
// Plugin Keys
// ============================================================================

export const UserMentionPluginKey = new PluginKey("userMention");
export const ChannelMentionPluginKey = new PluginKey("channelMention");

// ============================================================================
// User Mention Extension
// ============================================================================

/**
 * Create the user mention extension (@username, @everyone, @here)
 */
export function createUserMentionExtension(
  options: UserMentionExtensionOptions,
) {
  const {
    getUsers,
    getPermissions = () => ({
      canMentionUsers: true,
      canMentionChannels: true,
      canMentionEveryone: false,
      canMentionHere: false,
      canMentionChannel: false,
      canMentionRoles: false,
    }),
    channelMemberIds,
    onSelect,
    suggestionRenderer,
    HTMLAttributes = {},
  } = options;

  return Mention.configure({
    HTMLAttributes: {
      class: "mention mention-user",
      ...HTMLAttributes,
    },
    renderLabel({ options: opts, node }) {
      return `${opts.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
    },
    suggestion: {
      char: "@",
      pluginKey: UserMentionPluginKey,
      allowSpaces: false,
      allowedPrefixes: [" ", "\n", "\t", "(", "[", "{"],

      items: ({ query }): MentionSuggestion[] => {
        const users = getUsers();
        const permissions = getPermissions();

        return filterMentionSuggestions({
          users,
          permissions,
          trigger: "@",
          query,
          maxSuggestions: 10,
          prioritizeChannelMembers: true,
          channelMemberIds,
        });
      },

      command: ({ editor, range, props }) => {
        const suggestion = props as MentionSuggestion;

        // Handle different suggestion types
        if (suggestion.type === "user") {
          const user = suggestion.data as MentionableUser;
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: "mention",
                attrs: {
                  id: user.id,
                  label: user.displayName,
                  username: user.username,
                  type: "user",
                },
              },
              { type: "text", text: " " },
            ])
            .run();

          addRecentMention(user.username);
          onSelect?.(user);
        } else if (suggestion.type === "group") {
          const group = suggestion.data as GroupMentionInfo;
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: "mention",
                attrs: {
                  id: group.type,
                  label: group.type,
                  type: group.type,
                },
              },
              { type: "text", text: " " },
            ])
            .run();
        }
      },

      render: suggestionRenderer,
    },
  });
}

// ============================================================================
// Channel Mention Extension
// ============================================================================

/**
 * Create the channel mention extension (#channel)
 */
export function createChannelMentionExtension(
  options: ChannelMentionExtensionOptions,
) {
  const {
    getChannels,
    onSelect,
    suggestionRenderer,
    HTMLAttributes = {},
  } = options;

  // Create a custom extension that extends Mention with a different name
  const ChannelMention = Mention.extend({
    name: "channelMention",

    addAttributes() {
      return {
        ...this.parent?.(),
        slug: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-channel-slug"),
          renderHTML: (attributes) => ({
            "data-channel-slug": attributes.slug,
          }),
        },
        type: {
          default: "channel",
        },
      };
    },
  });

  return ChannelMention.configure({
    HTMLAttributes: {
      class: "mention mention-channel",
      ...HTMLAttributes,
    },
    renderLabel({ options: opts, node }) {
      return `${opts.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
    },
    suggestion: {
      char: "#",
      pluginKey: ChannelMentionPluginKey,
      allowSpaces: false,
      allowedPrefixes: [" ", "\n", "\t", "(", "[", "{"],

      items: ({ query }): MentionSuggestion[] => {
        const channels = getChannels();

        return filterMentionSuggestions({
          channels,
          permissions: {
            canMentionUsers: false,
            canMentionChannels: true,
            canMentionEveryone: false,
            canMentionHere: false,
            canMentionChannel: false,
            canMentionRoles: false,
          },
          trigger: "#",
          query,
          maxSuggestions: 10,
        });
      },

      command: ({ editor, range, props }) => {
        const suggestion = props as MentionSuggestion;
        const channel = suggestion.data as MentionableChannel;

        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "channelMention",
              attrs: {
                id: channel.id,
                label: channel.name,
                slug: channel.slug,
                type: "channel",
              },
            },
            { type: "text", text: " " },
          ])
          .run();

        onSelect?.(channel);
      },

      render: suggestionRenderer,
    },
  });
}

// ============================================================================
// Combined Mention Extensions Creator
// ============================================================================

/**
 * Options for creating all mention extensions
 */
export interface CreateMentionExtensionsOptions {
  /** User mention options */
  user?: Omit<UserMentionExtensionOptions, "suggestionRenderer">;
  /** Channel mention options */
  channel?: Omit<ChannelMentionExtensionOptions, "suggestionRenderer">;
  /** Shared suggestion renderer */
  suggestionRenderer?: () => MentionSuggestionRenderer;
}

/**
 * Create both user and channel mention extensions with shared configuration
 */
export function createMentionExtensions(
  options: CreateMentionExtensionsOptions,
) {
  const extensions = [];

  if (options.user) {
    extensions.push(
      createUserMentionExtension({
        ...options.user,
        suggestionRenderer: options.suggestionRenderer,
      }),
    );
  }

  if (options.channel) {
    extensions.push(
      createChannelMentionExtension({
        ...options.channel,
        suggestionRenderer: options.suggestionRenderer,
      }),
    );
  }

  return extensions;
}

// ============================================================================
// Mention Node Parser/Serializer
// ============================================================================

/**
 * Parse mention data from TipTap node
 */
export function parseMentionFromNode(node: {
  type: { name: string };
  attrs: Record<string, unknown>;
}) {
  const attrs = node.attrs;
  const type = attrs.type as string;

  if (type === "user") {
    return {
      type: "user" as const,
      userId: attrs.id as string,
      username: attrs.username as string,
      displayName: attrs.label as string,
    };
  } else if (type === "channel") {
    return {
      type: "channel" as const,
      channelId: attrs.id as string,
      channelSlug: attrs.slug as string,
      channelName: attrs.label as string,
    };
  } else if (["everyone", "here", "channel"].includes(type)) {
    return {
      type: type as "everyone" | "here" | "channel",
    };
  }

  return null;
}

/**
 * Serialize mention to plain text
 */
export function serializeMentionToText(node: {
  type: { name: string };
  attrs: Record<string, unknown>;
}): string {
  const attrs = node.attrs;
  const type = attrs.type as string;

  if (type === "user") {
    return `@${attrs.username || attrs.label || attrs.id}`;
  } else if (type === "channel") {
    return `#${attrs.slug || attrs.label || attrs.id}`;
  } else if (["everyone", "here", "channel"].includes(type)) {
    return `@${type}`;
  }

  return "";
}

/**
 * Extract all mentions from TipTap editor content
 */
export function extractMentionsFromEditor(editor: Editor) {
  const userMentions: Array<{
    userId: string;
    username: string;
    displayName: string;
  }> = [];

  const channelMentions: Array<{
    channelId: string;
    channelSlug: string;
    channelName: string;
  }> = [];

  let hasEveryone = false;
  let hasHere = false;
  let hasChannel = false;

  editor.state.doc.descendants((node) => {
    if (node.type.name === "mention") {
      const type = node.attrs.type as string;

      if (type === "user") {
        userMentions.push({
          userId: node.attrs.id,
          username: node.attrs.username || node.attrs.label,
          displayName: node.attrs.label,
        });
      } else if (type === "everyone") {
        hasEveryone = true;
      } else if (type === "here") {
        hasHere = true;
      } else if (type === "channel") {
        hasChannel = true;
      }
    } else if (node.type.name === "channelMention") {
      channelMentions.push({
        channelId: node.attrs.id,
        channelSlug: node.attrs.slug || node.attrs.label,
        channelName: node.attrs.label,
      });
    }
  });

  return {
    userMentions,
    channelMentions,
    hasEveryone,
    hasHere,
    hasChannel,
  };
}

// ============================================================================
// Mention CSS Styles
// ============================================================================

/**
 * Default CSS for mentions in TipTap editor
 */
export const TIPTAP_MENTION_STYLES = `
  .mention {
    display: inline;
    padding: 0 4px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
  }

  .mention-user {
    background-color: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
  }

  .mention-user:hover {
    background-color: hsl(var(--primary) / 0.2);
  }

  .mention-channel {
    background-color: hsl(var(--secondary) / 0.15);
    color: hsl(var(--secondary-foreground));
  }

  .mention-channel:hover {
    background-color: hsl(var(--secondary) / 0.25);
  }

  .mention[data-type="everyone"],
  .mention[data-type="here"],
  .mention[data-type="channel"] {
    background-color: hsl(var(--warning) / 0.15);
    color: hsl(var(--warning));
    font-weight: 600;
  }

  .mention[data-type="everyone"]:hover,
  .mention[data-type="here"]:hover,
  .mention[data-type="channel"]:hover {
    background-color: hsl(var(--warning) / 0.25);
  }

  /* Self mention (when user is mentioned) */
  .mention-self {
    background-color: hsl(var(--primary) / 0.2);
    font-weight: 600;
  }

  /* Unresolved/unknown mention */
  .mention-unresolved {
    background-color: hsl(var(--muted) / 0.5);
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }
`;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if cursor is inside a mention node
 */
export function isCursorInMention(editor: Editor): boolean {
  const { selection } = editor.state;
  const { $from } = selection;

  // Check if parent or grandparent is a mention
  return (
    $from.parent.type.name === "mention" ||
    $from.parent.type.name === "channelMention" ||
    ($from.depth > 1 &&
      ($from.node($from.depth - 1).type.name === "mention" ||
        $from.node($from.depth - 1).type.name === "channelMention"))
  );
}

/**
 * Get mention at current cursor position
 */
export function getMentionAtCursor(editor: Editor) {
  const { selection } = editor.state;
  const { $from } = selection;

  // Walk up the tree to find a mention node
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "mention" || node.type.name === "channelMention") {
      return node;
    }
  }

  return null;
}
