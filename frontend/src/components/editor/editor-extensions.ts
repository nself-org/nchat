/**
 * TipTap Editor Extensions Configuration
 *
 * Configures all TipTap extensions for the rich text editor including:
 * - StarterKit (basic formatting)
 * - Link (auto-detect URLs)
 * - Mention (for @users and #channels)
 * - Placeholder
 * - Underline
 * - CodeBlockLowlight (syntax highlighting)
 */

import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { UserProfile } from "@/stores/user-store";
import type { Channel } from "@/stores/channel-store";

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// ============================================================================
// Types
// ============================================================================

export interface MentionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  presence?: "online" | "away" | "dnd" | "offline" | "invisible";
}

export interface MentionChannel {
  id: string;
  name: string;
  type: "public" | "private" | "direct" | "group";
  icon?: string | null;
}

export interface EmojiSuggestion {
  shortcode: string;
  emoji: string;
  name: string;
}

export type MentionSuggestionProps = SuggestionProps<MentionUser>;
export type ChannelSuggestionProps = SuggestionProps<MentionChannel>;
export type EmojiSuggestionProps = SuggestionProps<EmojiSuggestion>;

// ============================================================================
// Mention Configuration
// ============================================================================

export interface MentionConfig {
  users: MentionUser[];
  channels: MentionChannel[];
  emojis: EmojiSuggestion[];
  onMentionUser?: (user: MentionUser) => void;
  onMentionChannel?: (channel: MentionChannel) => void;
  onInsertEmoji?: (emoji: EmojiSuggestion) => void;
}

// Default emoji list (commonly used)
export const defaultEmojis: EmojiSuggestion[] = [
  { shortcode: "smile", emoji: "\u{1F604}", name: "Smiling Face" },
  { shortcode: "laugh", emoji: "\u{1F602}", name: "Face with Tears of Joy" },
  { shortcode: "heart", emoji: "\u{2764}\u{FE0F}", name: "Red Heart" },
  { shortcode: "thumbsup", emoji: "\u{1F44D}", name: "Thumbs Up" },
  { shortcode: "thumbsdown", emoji: "\u{1F44E}", name: "Thumbs Down" },
  { shortcode: "fire", emoji: "\u{1F525}", name: "Fire" },
  { shortcode: "rocket", emoji: "\u{1F680}", name: "Rocket" },
  { shortcode: "eyes", emoji: "\u{1F440}", name: "Eyes" },
  { shortcode: "thinking", emoji: "\u{1F914}", name: "Thinking Face" },
  { shortcode: "clap", emoji: "\u{1F44F}", name: "Clapping Hands" },
  { shortcode: "party", emoji: "\u{1F389}", name: "Party Popper" },
  { shortcode: "check", emoji: "\u{2705}", name: "Check Mark" },
  { shortcode: "x", emoji: "\u{274C}", name: "Cross Mark" },
  { shortcode: "wave", emoji: "\u{1F44B}", name: "Waving Hand" },
  { shortcode: "pray", emoji: "\u{1F64F}", name: "Folded Hands" },
  { shortcode: "muscle", emoji: "\u{1F4AA}", name: "Flexed Biceps" },
  { shortcode: "star", emoji: "\u{2B50}", name: "Star" },
  { shortcode: "sparkles", emoji: "\u{2728}", name: "Sparkles" },
  { shortcode: "coffee", emoji: "\u{2615}", name: "Coffee" },
  { shortcode: "bug", emoji: "\u{1F41B}", name: "Bug" },
  { shortcode: "warning", emoji: "\u{26A0}\u{FE0F}", name: "Warning" },
  { shortcode: "bulb", emoji: "\u{1F4A1}", name: "Light Bulb" },
  { shortcode: "question", emoji: "\u{2753}", name: "Question Mark" },
  { shortcode: "tada", emoji: "\u{1F389}", name: "Tada" },
  { shortcode: "ship", emoji: "\u{1F6A2}", name: "Ship" },
  { shortcode: "memo", emoji: "\u{1F4DD}", name: "Memo" },
  { shortcode: "pin", emoji: "\u{1F4CC}", name: "Pushpin" },
  { shortcode: "link", emoji: "\u{1F517}", name: "Link" },
  { shortcode: "lock", emoji: "\u{1F512}", name: "Lock" },
  { shortcode: "key", emoji: "\u{1F511}", name: "Key" },
];

// ============================================================================
// Suggestion Renderers (to be implemented by components)
// ============================================================================

export interface SuggestionRenderer<T> {
  onStart: (props: SuggestionProps<T>) => void;
  onUpdate: (props: SuggestionProps<T>) => void;
  onExit: () => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// ============================================================================
// Max Character Extension
// ============================================================================

export interface MaxLengthOptions {
  maxLength: number;
  onExceed?: (characterCount: number) => void;
}

export const MaxLength = Extension.create<MaxLengthOptions>({
  name: "maxLength",

  addOptions() {
    return {
      maxLength: 4000,
      onExceed: undefined,
    };
  },

  addStorage() {
    return {
      characterCount: 0,
    };
  },

  onUpdate() {
    const content = this.editor.getText();
    this.storage.characterCount = content.length;

    if (content.length > this.options.maxLength) {
      this.options.onExceed?.(content.length);
    }
  },
});

// ============================================================================
// Create Extensions
// ============================================================================

export interface CreateExtensionsOptions {
  placeholder?: string;
  maxLength?: number;
  onMaxLengthExceed?: (characterCount: number) => void;
  mentionSuggestion?: Partial<SuggestionOptions<MentionUser>>;
  channelSuggestion?: Partial<SuggestionOptions<MentionChannel>>;
  emojiSuggestion?: Partial<SuggestionOptions<EmojiSuggestion>>;
}

export function createEditorExtensions(options: CreateExtensionsOptions = {}) {
  const {
    placeholder = "Type a message...",
    maxLength = 4000,
    onMaxLengthExceed,
    mentionSuggestion,
    channelSuggestion,
    emojiSuggestion,
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: any[] = [
    // StarterKit provides basic formatting
    StarterKit.configure({
      // Disable code block from StarterKit, use CodeBlockLowlight instead
      codeBlock: false,
      // Configure other extensions
      heading: false, // Disable headings for chat
      horizontalRule: false, // Disable horizontal rule
    }),

    // Underline support
    Underline,

    // Link support with auto-detection
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        class: "text-primary underline cursor-pointer hover:text-primary/80",
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),

    // Placeholder text
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),

    // Code blocks with syntax highlighting
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext",
      HTMLAttributes: {
        class: "code-block",
      },
    }),

    // Max length enforcement
    MaxLength.configure({
      maxLength,
      onExceed: onMaxLengthExceed,
    }),
  ];

  // User mention (@username)
  if (mentionSuggestion) {
    extensions.push(
      Mention.configure({
        HTMLAttributes: {
          class: "mention mention-user",
        },
        suggestion: {
          char: "@",
          allowSpaces: false,
          ...mentionSuggestion,
        },
      }),
    );
  }

  // Channel mention (#channel)
  if (channelSuggestion) {
    extensions.push(
      Mention.extend({
        name: "channelMention",
      }).configure({
        HTMLAttributes: {
          class: "mention mention-channel",
        },
        suggestion: {
          char: "#",
          allowSpaces: false,
          ...channelSuggestion,
        },
      }),
    );
  }

  // Emoji shortcodes (:emoji:)
  if (emojiSuggestion) {
    extensions.push(
      Mention.extend({
        name: "emojiMention",
        renderText({ node }) {
          // Render the actual emoji character instead of the shortcode
          return node.attrs.id || node.attrs.label;
        },
        renderHTML({ node }) {
          return [
            "span",
            { class: "emoji" },
            node.attrs.id || node.attrs.label,
          ];
        },
      }).configure({
        HTMLAttributes: {
          class: "emoji",
        },
        suggestion: {
          char: ":",
          allowSpaces: false,
          ...emojiSuggestion,
        },
      }),
    );
  }

  return extensions;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert UserProfile to MentionUser for the editor
 */
export function userProfileToMentionUser(user: UserProfile): MentionUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    presence: user.presence,
  };
}

/**
 * Convert Channel to MentionChannel for the editor
 */
export function channelToMentionChannel(channel: Channel): MentionChannel {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    icon: channel.icon,
  };
}

/**
 * Filter users by query
 */
export function filterUsers(
  users: MentionUser[],
  query: string,
): MentionUser[] {
  const lowerQuery = query.toLowerCase();
  return users
    .filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.displayName.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 10);
}

/**
 * Filter channels by query
 */
export function filterChannels(
  channels: MentionChannel[],
  query: string,
): MentionChannel[] {
  const lowerQuery = query.toLowerCase();
  return channels
    .filter((channel) => channel.name.toLowerCase().includes(lowerQuery))
    .slice(0, 10);
}

/**
 * Filter emojis by query
 */
export function filterEmojis(
  emojis: EmojiSuggestion[],
  query: string,
): EmojiSuggestion[] {
  const lowerQuery = query.toLowerCase();
  return emojis
    .filter(
      (emoji) =>
        emoji.shortcode.toLowerCase().includes(lowerQuery) ||
        emoji.name.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 10);
}

// ============================================================================
// Export lowlight for external use
// ============================================================================

export { lowlight };
