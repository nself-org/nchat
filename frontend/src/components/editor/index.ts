/**
 * Rich Text Editor Components
 *
 * TipTap-based rich text editor for nself-chat
 *
 * @example
 * ```tsx
 * import { RichEditor, type RichEditorRef } from '@/components/editor'
 *
 * function MyComponent() {
 *   const editorRef = useRef<RichEditorRef>(null)
 *
 *   return (
 *     <RichEditor
 *       ref={editorRef}
 *       placeholder="Type a message..."
 *       users={users}
 *       channels={channels}
 *       onSubmit={(html, json) => {
 *         /* console.log 'Submitted:', html)
 *         editorRef.current?.clear()
 *       }}
 *     />
 *   )
 * }
 * ```
 */

// Main editor component
export { RichEditor, SimpleEditor } from "./rich-editor";
export type {
  RichEditorProps,
  RichEditorRef,
  SimpleEditorProps,
} from "./rich-editor";

// Editor toolbar
export {
  EditorToolbar,
  FloatingToolbar,
  CompactToolbar,
} from "./editor-toolbar";
export type {
  EditorToolbarProps,
  FloatingToolbarProps,
} from "./editor-toolbar";

// Suggestion lists
export { MentionList, MentionPopup } from "./mention-list";
export type {
  MentionListProps,
  MentionListRef,
  MentionPopupProps,
} from "./mention-list";

export {
  ChannelMentionList,
  ChannelMentionPopup,
} from "./channel-mention-list";
export type {
  ChannelMentionListProps,
  ChannelMentionListRef,
  ChannelMentionPopupProps,
} from "./channel-mention-list";

export {
  EmojiSuggestionList,
  EmojiSuggestionPopup,
  EmojiGrid,
} from "./emoji-suggestion-list";
export type {
  EmojiSuggestionListProps,
  EmojiSuggestionListRef,
  EmojiSuggestionPopupProps,
  EmojiGridProps,
} from "./emoji-suggestion-list";

// Code block components
export {
  CodeBlock,
  CodeBlockNodeView,
  InlineCode,
  SUPPORTED_LANGUAGES,
} from "./code-block";
export type {
  StandaloneCodeBlockProps,
  CodeBlockProps,
  InlineCodeProps,
  SupportedLanguage,
} from "./code-block";

// Link dialog
export { LinkDialog, LinkPreview, InlineLink } from "./link-dialog";
export type {
  LinkDialogProps,
  LinkData,
  LinkPreviewProps,
  InlineLinkProps,
} from "./link-dialog";

// Editor hook
export { useRichEditor, useCharacterCount, useEditorFocus } from "./use-editor";
export type {
  UseRichEditorOptions,
  UseRichEditorReturn,
  MentionSuggestionState,
  EmojiSuggestionState,
} from "./use-editor";

// Extensions and utilities
export {
  createEditorExtensions,
  MaxLength,
  defaultEmojis,
  filterUsers,
  filterChannels,
  filterEmojis,
  userProfileToMentionUser,
  channelToMentionChannel,
  lowlight,
} from "./editor-extensions";
export type {
  MentionUser,
  MentionChannel,
  EmojiSuggestion,
  MentionConfig,
  CreateExtensionsOptions,
  MaxLengthOptions,
  SuggestionRenderer,
  MentionSuggestionProps,
  ChannelSuggestionProps,
  EmojiSuggestionProps,
} from "./editor-extensions";
