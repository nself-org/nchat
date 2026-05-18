/**
 * useRichEditor Hook
 *
 * Custom hook for managing TipTap editor state including:
 * - Editor initialization
 * - Content get/set operations
 * - Focus management
 * - Character counting
 * - Keyboard shortcuts
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import {
  createEditorExtensions,
  filterUsers,
  filterChannels,
  filterEmojis,
  defaultEmojis,
  type MentionUser,
  type MentionChannel,
  type EmojiSuggestion,
  type CreateExtensionsOptions,
} from "./editor-extensions";

// ============================================================================
// Types
// ============================================================================

export interface UseRichEditorOptions {
  /** Initial content (HTML string or JSON) */
  initialContent?: string | JSONContent;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum character length */
  maxLength?: number;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Editable state */
  editable?: boolean;
  /** Users available for @mentions */
  users?: MentionUser[];
  /** Channels available for #mentions */
  channels?: MentionChannel[];
  /** Emojis available for :emoji: */
  emojis?: EmojiSuggestion[];
  /** Called when content changes */
  onUpdate?: (content: string, json: JSONContent) => void;
  /** Called on submit (Enter without Shift) */
  onSubmit?: (content: string, json: JSONContent) => void;
  /** Called when max length is exceeded */
  onMaxLengthExceed?: (characterCount: number) => void;
  /** Called when editor is focused */
  onFocus?: () => void;
  /** Called when editor loses focus */
  onBlur?: () => void;
}

export interface UseRichEditorReturn {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Current HTML content */
  content: string;
  /** Current JSON content */
  jsonContent: JSONContent | null;
  /** Current plain text content */
  textContent: string;
  /** Current character count */
  characterCount: number;
  /** Whether max length is exceeded */
  isMaxLengthExceeded: boolean;
  /** Whether the editor is empty */
  isEmpty: boolean;
  /** Whether the editor is focused */
  isFocused: boolean;
  /** Set content (HTML string) */
  setContent: (content: string) => void;
  /** Set content (JSON) */
  setJsonContent: (content: JSONContent) => void;
  /** Clear the editor */
  clear: () => void;
  /** Focus the editor */
  focus: (position?: "start" | "end" | "all") => void;
  /** Blur the editor */
  blur: () => void;
  /** Insert text at current position */
  insertText: (text: string) => void;
  /** Insert HTML at current position */
  insertHtml: (html: string) => void;
  /** Mention suggestion state */
  mentionState: UserMentionSuggestionState;
  /** Channel suggestion state */
  channelState: ChannelMentionSuggestionState;
  /** Emoji suggestion state */
  emojiState: EmojiSuggestionState;
}

export interface MentionSuggestionState {
  isOpen: boolean;
  query: string;
  items: MentionUser[] | MentionChannel[];
  selectedIndex: number;
  command: ((item: MentionUser | MentionChannel) => void) | null;
}

export interface UserMentionSuggestionState {
  isOpen: boolean;
  query: string;
  items: MentionUser[];
  selectedIndex: number;
  command: ((item: MentionUser) => void) | null;
}

export interface ChannelMentionSuggestionState {
  isOpen: boolean;
  query: string;
  items: MentionChannel[];
  selectedIndex: number;
  command: ((item: MentionChannel) => void) | null;
}

export interface EmojiSuggestionState {
  isOpen: boolean;
  query: string;
  items: EmojiSuggestion[];
  selectedIndex: number;
  command: ((item: EmojiSuggestion) => void) | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRichEditor(
  options: UseRichEditorOptions = {},
): UseRichEditorReturn {
  const {
    initialContent = "",
    placeholder = "Type a message...",
    maxLength = 4000,
    autoFocus = false,
    editable = true,
    users = [],
    channels = [],
    emojis = defaultEmojis,
    onUpdate,
    onSubmit,
    onMaxLengthExceed,
    onFocus,
    onBlur,
  } = options;

  // State
  const [isFocused, setIsFocused] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [mentionState, setMentionState] = useState<UserMentionSuggestionState>({
    isOpen: false,
    query: "",
    items: [],
    selectedIndex: 0,
    command: null,
  });
  const [channelState, setChannelState] =
    useState<ChannelMentionSuggestionState>({
      isOpen: false,
      query: "",
      items: [],
      selectedIndex: 0,
      command: null,
    });
  const [emojiState, setEmojiState] = useState<EmojiSuggestionState>({
    isOpen: false,
    query: "",
    items: [],
    selectedIndex: 0,
    command: null,
  });

  // Refs for callback stability
  const onSubmitRef = useRef(onSubmit);
  const usersRef = useRef(users);
  const channelsRef = useRef(channels);
  const emojisRef = useRef(emojis);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    emojisRef.current = emojis;
  }, [emojis]);

  // Extension options with suggestion configurations
  const extensionOptions = useMemo<CreateExtensionsOptions>(() => {
    return {
      placeholder,
      maxLength,
      onMaxLengthExceed,
      mentionSuggestion: {
        items: ({ query }) => filterUsers(usersRef.current, query),
        render: () => ({
          onStart: (props) => {
            setMentionState({
              isOpen: true,
              query: props.query,
              items: props.items as MentionUser[],
              selectedIndex: 0,
              command: props.command as (item: MentionUser) => void,
            });
          },
          onUpdate: (props) => {
            setMentionState((prev) => ({
              ...prev,
              query: props.query,
              items: props.items as MentionUser[],
              command: props.command as (item: MentionUser) => void,
            }));
          },
          onExit: () => {
            setMentionState({
              isOpen: false,
              query: "",
              items: [],
              selectedIndex: 0,
              command: null,
            });
          },
          onKeyDown: ({ event }) => {
            if (!mentionState.isOpen) return false;

            if (event.key === "ArrowUp") {
              setMentionState((prev) => ({
                ...prev,
                selectedIndex: Math.max(0, prev.selectedIndex - 1),
              }));
              return true;
            }

            if (event.key === "ArrowDown") {
              setMentionState((prev) => ({
                ...prev,
                selectedIndex: Math.min(
                  prev.items.length - 1,
                  prev.selectedIndex + 1,
                ),
              }));
              return true;
            }

            if (event.key === "Enter") {
              const item = mentionState.items[mentionState.selectedIndex];
              if (item && mentionState.command) {
                mentionState.command(item);
              }
              return true;
            }

            if (event.key === "Escape") {
              setMentionState((prev) => ({ ...prev, isOpen: false }));
              return true;
            }

            return false;
          },
        }),
      },
      channelSuggestion: {
        items: ({ query }) => filterChannels(channelsRef.current, query),
        render: () => ({
          onStart: (props) => {
            setChannelState({
              isOpen: true,
              query: props.query,
              items: props.items as MentionChannel[],
              selectedIndex: 0,
              command: props.command as (item: MentionChannel) => void,
            });
          },
          onUpdate: (props) => {
            setChannelState((prev) => ({
              ...prev,
              query: props.query,
              items: props.items as MentionChannel[],
              command: props.command as (item: MentionChannel) => void,
            }));
          },
          onExit: () => {
            setChannelState({
              isOpen: false,
              query: "",
              items: [],
              selectedIndex: 0,
              command: null,
            });
          },
          onKeyDown: ({ event }) => {
            if (!channelState.isOpen) return false;

            if (event.key === "ArrowUp") {
              setChannelState((prev) => ({
                ...prev,
                selectedIndex: Math.max(0, prev.selectedIndex - 1),
              }));
              return true;
            }

            if (event.key === "ArrowDown") {
              setChannelState((prev) => ({
                ...prev,
                selectedIndex: Math.min(
                  prev.items.length - 1,
                  prev.selectedIndex + 1,
                ),
              }));
              return true;
            }

            if (event.key === "Enter") {
              const item = channelState.items[channelState.selectedIndex];
              if (item && channelState.command) {
                channelState.command(item as MentionChannel);
              }
              return true;
            }

            if (event.key === "Escape") {
              setChannelState((prev) => ({ ...prev, isOpen: false }));
              return true;
            }

            return false;
          },
        }),
      },
      emojiSuggestion: {
        items: ({ query }) => filterEmojis(emojisRef.current, query),
        render: () => ({
          onStart: (props) => {
            setEmojiState({
              isOpen: true,
              query: props.query,
              items: props.items as EmojiSuggestion[],
              selectedIndex: 0,
              command: props.command as (item: EmojiSuggestion) => void,
            });
          },
          onUpdate: (props) => {
            setEmojiState((prev) => ({
              ...prev,
              query: props.query,
              items: props.items as EmojiSuggestion[],
              command: props.command as (item: EmojiSuggestion) => void,
            }));
          },
          onExit: () => {
            setEmojiState({
              isOpen: false,
              query: "",
              items: [],
              selectedIndex: 0,
              command: null,
            });
          },
          onKeyDown: ({ event }) => {
            if (!emojiState.isOpen) return false;

            if (event.key === "ArrowUp") {
              setEmojiState((prev) => ({
                ...prev,
                selectedIndex: Math.max(0, prev.selectedIndex - 1),
              }));
              return true;
            }

            if (event.key === "ArrowDown") {
              setEmojiState((prev) => ({
                ...prev,
                selectedIndex: Math.min(
                  prev.items.length - 1,
                  prev.selectedIndex + 1,
                ),
              }));
              return true;
            }

            if (event.key === "Enter") {
              const item = emojiState.items[emojiState.selectedIndex];
              if (item && emojiState.command) {
                emojiState.command(item);
              }
              return true;
            }

            if (event.key === "Escape") {
              setEmojiState((prev) => ({ ...prev, isOpen: false }));
              return true;
            }

            return false;
          },
        }),
      },
    };
  }, [
    placeholder,
    maxLength,
    onMaxLengthExceed,
    mentionState,
    channelState,
    emojiState,
  ]);

  // Create extensions
  const extensions = useMemo(
    () => createEditorExtensions(extensionOptions),
    [extensionOptions],
  );

  // Initialize editor
  const editor = useEditor({
    extensions,
    content: initialContent,
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: "rich-editor-content",
      },
      handleKeyDown: (view, event) => {
        // Submit on Enter (without Shift)
        if (event.key === "Enter" && !event.shiftKey) {
          // Don't submit if any suggestion popup is open
          if (mentionState.isOpen || channelState.isOpen || emojiState.isOpen) {
            return false;
          }

          event.preventDefault();
          const html = view.state.doc.content.size > 0 ? editor?.getHTML() : "";
          const json = editor?.getJSON();
          if (html && json && onSubmitRef.current) {
            onSubmitRef.current(html, json);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      const text = editor.getText();
      setCharacterCount(text.length);
      onUpdate?.(html, json);
    },
    onFocus: () => {
      setIsFocused(true);
      onFocus?.();
    },
    onBlur: () => {
      setIsFocused(false);
      onBlur?.();
    },
  });

  // Content getters
  const content = editor?.getHTML() ?? "";
  const jsonContent = editor?.getJSON() ?? null;
  const textContent = editor?.getText() ?? "";
  const isEmpty = editor?.isEmpty ?? true;
  const isMaxLengthExceeded = characterCount > maxLength;

  // Content setters
  const setContent = useCallback(
    (newContent: string) => {
      editor?.commands.setContent(newContent);
    },
    [editor],
  );

  const setJsonContent = useCallback(
    (newContent: JSONContent) => {
      editor?.commands.setContent(newContent);
    },
    [editor],
  );

  const clear = useCallback(() => {
    editor?.commands.clearContent();
  }, [editor]);

  // Focus management
  const focus = useCallback(
    (position: "start" | "end" | "all" = "end") => {
      editor?.commands.focus(position);
    },
    [editor],
  );

  const blur = useCallback(() => {
    editor?.commands.blur();
  }, [editor]);

  // Insert operations
  const insertText = useCallback(
    (text: string) => {
      editor?.commands.insertContent(text);
    },
    [editor],
  );

  const insertHtml = useCallback(
    (html: string) => {
      editor?.commands.insertContent(html, {
        parseOptions: {
          preserveWhitespace: false,
        },
      });
    },
    [editor],
  );

  return {
    editor,
    content,
    jsonContent,
    textContent,
    characterCount,
    isMaxLengthExceeded,
    isEmpty,
    isFocused,
    setContent,
    setJsonContent,
    clear,
    focus,
    blur,
    insertText,
    insertHtml,
    mentionState,
    channelState,
    emojiState,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook to get just the character count from an editor
 */
export function useCharacterCount(editor: Editor | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateCount = () => {
      setCount(editor.getText().length);
    };

    updateCount();
    editor.on("update", updateCount);

    return () => {
      editor.off("update", updateCount);
    };
  }, [editor]);

  return count;
}

/**
 * Hook to track editor focus state
 */
export function useEditorFocus(editor: Editor | null): boolean {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  return isFocused;
}
