/**
 * RichEditor Component
 *
 * Main TipTap rich text editor component with:
 * - Bold, italic, underline, strikethrough
 * - Code (inline) and code blocks with syntax highlighting
 * - Links (auto-detect URLs)
 * - Bullet/numbered lists
 * - Blockquotes
 * - @mentions with autocomplete
 * - #channel links
 * - :emoji: shortcodes
 * - Markdown shortcuts
 * - Placeholder text
 * - Max length enforcement
 * - Submit on Enter (Shift+Enter for newline)
 * - Controlled value
 */

"use client";

import * as React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import {
  createEditorExtensions,
  filterUsers,
  filterChannels,
  filterEmojis,
  defaultEmojis,
  type MentionUser,
  type MentionChannel,
  type EmojiSuggestion,
} from "./editor-extensions";
import { EditorToolbar } from "./editor-toolbar";
import { MentionList } from "./mention-list";
import { ChannelMentionList } from "./channel-mention-list";
import { EmojiSuggestionList } from "./emoji-suggestion-list";
import "./editor.css";

// ============================================================================
// Types
// ============================================================================

export interface RichEditorProps {
  /** Initial content (HTML string or JSON) */
  value?: string | JSONContent;
  /** Callback when content changes */
  onChange?: (html: string, json: JSONContent) => void;
  /** Callback on submit (Enter without Shift) */
  onSubmit?: (html: string, json: JSONContent) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum character length */
  maxLength?: number;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Editable state */
  disabled?: boolean;
  /** Users available for @mentions */
  users?: MentionUser[];
  /** Channels available for #mentions */
  channels?: MentionChannel[];
  /** Emojis available for :emoji: */
  emojis?: EmojiSuggestion[];
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Whether to show the send button */
  showSendButton?: boolean;
  /** Whether to show character count */
  showCharacterCount?: boolean;
  /** Custom send button text */
  sendButtonText?: string;
  /** Additional CSS class for container */
  className?: string;
  /** Additional CSS class for editor content */
  editorClassName?: string;
  /** Minimum height of editor */
  minHeight?: number | string;
  /** Maximum height of editor */
  maxHeight?: number | string;
  /** Called when editor is focused */
  onFocus?: () => void;
  /** Called when editor loses focus */
  onBlur?: () => void;
}

export interface RichEditorRef {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Get HTML content */
  getHTML: () => string;
  /** Get JSON content */
  getJSON: () => JSONContent | undefined;
  /** Get plain text content */
  getText: () => string;
  /** Set content (HTML string) */
  setContent: (content: string) => void;
  /** Set content (JSON) */
  setJSONContent: (content: JSONContent) => void;
  /** Clear the editor */
  clear: () => void;
  /** Focus the editor */
  focus: (position?: "start" | "end" | "all") => void;
  /** Blur the editor */
  blur: () => void;
  /** Insert text at current position */
  insertText: (text: string) => void;
  /** Get character count */
  getCharacterCount: () => number;
}

// ============================================================================
// Suggestion State Types
// ============================================================================

interface MentionSuggestionState {
  isOpen: boolean;
  items: MentionUser[];
  selectedIndex: number;
  command: ((item: MentionUser) => void) | null;
  clientRect: (() => DOMRect | null) | null;
}

interface ChannelSuggestionState {
  isOpen: boolean;
  items: MentionChannel[];
  selectedIndex: number;
  command: ((item: MentionChannel) => void) | null;
  clientRect: (() => DOMRect | null) | null;
}

interface EmojiSuggestionState {
  isOpen: boolean;
  items: EmojiSuggestion[];
  selectedIndex: number;
  command: ((item: EmojiSuggestion) => void) | null;
  clientRect: (() => DOMRect | null) | null;
}

// ============================================================================
// Main Component
// ============================================================================

export const RichEditor = forwardRef<RichEditorRef, RichEditorProps>(
  function RichEditor(
    {
      value,
      onChange,
      onSubmit,
      placeholder = "Type a message...",
      maxLength = 4000,
      autoFocus = false,
      disabled = false,
      users = [],
      channels = [],
      emojis = defaultEmojis,
      showToolbar = true,
      showSendButton = true,
      showCharacterCount = true,
      sendButtonText = "Send",
      className,
      editorClassName,
      minHeight = 80,
      maxHeight = 300,
      onFocus,
      onBlur,
    },
    ref,
  ) {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [characterCount, setCharacterCount] = useState(0);

    // Refs for suggestion data (stable references)
    const usersRef = useRef(users);
    const channelsRef = useRef(channels);
    const emojisRef = useRef(emojis);
    const onSubmitRef = useRef(onSubmit);

    useEffect(() => {
      usersRef.current = users;
    }, [users]);

    useEffect(() => {
      channelsRef.current = channels;
    }, [channels]);

    useEffect(() => {
      emojisRef.current = emojis;
    }, [emojis]);

    useEffect(() => {
      onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    // Suggestion states
    const [mentionState, setMentionState] = useState<MentionSuggestionState>({
      isOpen: false,
      items: [],
      selectedIndex: 0,
      command: null,
      clientRect: null,
    });

    const [channelState, setChannelState] = useState<ChannelSuggestionState>({
      isOpen: false,
      items: [],
      selectedIndex: 0,
      command: null,
      clientRect: null,
    });

    const [emojiState, setEmojiState] = useState<EmojiSuggestionState>({
      isOpen: false,
      items: [],
      selectedIndex: 0,
      command: null,
      clientRect: null,
    });

    // Create extensions with suggestion configurations
    const extensions = useMemo(
      () =>
        createEditorExtensions({
          placeholder,
          maxLength,
          mentionSuggestion: {
            items: ({ query }) => filterUsers(usersRef.current, query),
            render: () => ({
              onStart: (props) => {
                setMentionState({
                  isOpen: true,
                  items: props.items as MentionUser[],
                  selectedIndex: 0,
                  command: props.command as (item: MentionUser) => void,
                  clientRect: props.clientRect ?? null,
                });
              },
              onUpdate: (props) => {
                setMentionState((prev) => ({
                  ...prev,
                  items: props.items as MentionUser[],
                  command: props.command as (item: MentionUser) => void,
                  clientRect: props.clientRect ?? null,
                }));
              },
              onExit: () => {
                setMentionState({
                  isOpen: false,
                  items: [],
                  selectedIndex: 0,
                  command: null,
                  clientRect: null,
                });
              },
              onKeyDown: ({ event }) => {
                if (event.key === "ArrowUp") {
                  setMentionState((prev) => ({
                    ...prev,
                    selectedIndex:
                      prev.selectedIndex <= 0
                        ? prev.items.length - 1
                        : prev.selectedIndex - 1,
                  }));
                  return true;
                }

                if (event.key === "ArrowDown") {
                  setMentionState((prev) => ({
                    ...prev,
                    selectedIndex:
                      prev.selectedIndex >= prev.items.length - 1
                        ? 0
                        : prev.selectedIndex + 1,
                  }));
                  return true;
                }

                if (event.key === "Enter") {
                  setMentionState((prev) => {
                    const item = prev.items[prev.selectedIndex];
                    if (item && prev.command) {
                      prev.command(item);
                    }
                    return prev;
                  });
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
                  items: props.items as MentionChannel[],
                  selectedIndex: 0,
                  command: props.command as (item: MentionChannel) => void,
                  clientRect: props.clientRect ?? null,
                });
              },
              onUpdate: (props) => {
                setChannelState((prev) => ({
                  ...prev,
                  items: props.items as MentionChannel[],
                  command: props.command as (item: MentionChannel) => void,
                  clientRect: props.clientRect ?? null,
                }));
              },
              onExit: () => {
                setChannelState({
                  isOpen: false,
                  items: [],
                  selectedIndex: 0,
                  command: null,
                  clientRect: null,
                });
              },
              onKeyDown: ({ event }) => {
                if (event.key === "ArrowUp") {
                  setChannelState((prev) => ({
                    ...prev,
                    selectedIndex:
                      prev.selectedIndex <= 0
                        ? prev.items.length - 1
                        : prev.selectedIndex - 1,
                  }));
                  return true;
                }

                if (event.key === "ArrowDown") {
                  setChannelState((prev) => ({
                    ...prev,
                    selectedIndex:
                      prev.selectedIndex >= prev.items.length - 1
                        ? 0
                        : prev.selectedIndex + 1,
                  }));
                  return true;
                }

                if (event.key === "Enter") {
                  setChannelState((prev) => {
                    const item = prev.items[prev.selectedIndex];
                    if (item && prev.command) {
                      prev.command(item);
                    }
                    return prev;
                  });
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
                  items: props.items as EmojiSuggestion[],
                  selectedIndex: 0,
                  command: props.command as (item: EmojiSuggestion) => void,
                  clientRect: props.clientRect ?? null,
                });
              },
              onUpdate: (props) => {
                setEmojiState((prev) => ({
                  ...prev,
                  items: props.items as EmojiSuggestion[],
                  command: props.command as (item: EmojiSuggestion) => void,
                  clientRect: props.clientRect ?? null,
                }));
              },
              onExit: () => {
                setEmojiState({
                  isOpen: false,
                  items: [],
                  selectedIndex: 0,
                  command: null,
                  clientRect: null,
                });
              },
              onKeyDown: ({ event }) => {
                if (event.key === "ArrowUp") {
                  setEmojiState((prev) => ({
                    ...prev,
                    selectedIndex:
                      prev.selectedIndex <= 0
                        ? prev.items.length - 1
                        : prev.selectedIndex - 1,
                  }));
                  return true;
                }

                if (event.key === "ArrowDown") {
                  setEmojiState((prev) => ({
                    ...prev,
                    selectedIndex:
                      prev.selectedIndex >= prev.items.length - 1
                        ? 0
                        : prev.selectedIndex + 1,
                  }));
                  return true;
                }

                if (event.key === "Enter") {
                  setEmojiState((prev) => {
                    const item = prev.items[prev.selectedIndex];
                    if (item && prev.command) {
                      prev.command(item);
                    }
                    return prev;
                  });
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
        }),
      [placeholder, maxLength],
    );

    // Initialize editor
    const editor = useEditor({
      extensions,
      content: value,
      editable: !disabled,
      autofocus: autoFocus,
      editorProps: {
        attributes: {
          class: cn(
            "rich-editor-content prose prose-sm dark:prose-invert max-w-none focus:outline-none",
            editorClassName,
          ),
          style: `min-height: ${typeof minHeight === "number" ? `${minHeight}px` : minHeight}; max-height: ${typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight}; overflow-y: auto;`,
        },
        handleKeyDown: (view, event) => {
          // Don't handle Enter if any suggestion is open
          if (mentionState.isOpen || channelState.isOpen || emojiState.isOpen) {
            return false;
          }

          // Submit on Enter (without Shift)
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
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
        onChange?.(html, json);
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

    // Sync external value changes
    useEffect(() => {
      if (editor && value !== undefined) {
        const currentContent = editor.getHTML();
        // Only update if content actually changed (avoid cursor jump)
        if (typeof value === "string" && value !== currentContent) {
          editor.commands.setContent(value, false);
        } else if (typeof value === "object") {
          const currentJson = JSON.stringify(editor.getJSON());
          const newJson = JSON.stringify(value);
          if (currentJson !== newJson) {
            editor.commands.setContent(value, false);
          }
        }
      }
    }, [editor, value]);

    // Handle submit
    const handleSubmit = useCallback(() => {
      if (!editor) return;
      const html = editor.getHTML();
      const json = editor.getJSON();
      const isEmpty = editor.isEmpty;

      if (!isEmpty && onSubmitRef.current) {
        onSubmitRef.current(html, json);
      }
    }, [editor]);

    // Handle send button click
    const handleSendClick = useCallback(() => {
      handleSubmit();
    }, [handleSubmit]);

    // Handle mention selection
    const handleMentionSelect = useCallback((item: MentionUser) => {
      setMentionState((prev) => {
        if (prev.command) {
          prev.command(item);
        }
        return { ...prev, isOpen: false };
      });
    }, []);

    // Handle channel selection
    const handleChannelSelect = useCallback((item: MentionChannel) => {
      setChannelState((prev) => {
        if (prev.command) {
          prev.command(item);
        }
        return { ...prev, isOpen: false };
      });
    }, []);

    // Handle emoji selection
    const handleEmojiSelect = useCallback((item: EmojiSuggestion) => {
      setEmojiState((prev) => {
        if (prev.command) {
          prev.command(item);
        }
        return { ...prev, isOpen: false };
      });
    }, []);

    // Calculate popup positions
    const getMentionPosition = useCallback(() => {
      if (!mentionState.clientRect) return undefined;
      const rect = mentionState.clientRect();
      if (!rect) return undefined;
      return { top: rect.bottom + 8, left: rect.left };
    }, [mentionState.clientRect]);

    const getChannelPosition = useCallback(() => {
      if (!channelState.clientRect) return undefined;
      const rect = channelState.clientRect();
      if (!rect) return undefined;
      return { top: rect.bottom + 8, left: rect.left };
    }, [channelState.clientRect]);

    const getEmojiPosition = useCallback(() => {
      if (!emojiState.clientRect) return undefined;
      const rect = emojiState.clientRect();
      if (!rect) return undefined;
      return { top: rect.bottom + 8, left: rect.left };
    }, [emojiState.clientRect]);

    // Expose editor methods via ref
    useImperativeHandle(ref, () => ({
      editor,
      getHTML: () => editor?.getHTML() ?? "",
      getJSON: () => editor?.getJSON(),
      getText: () => editor?.getText() ?? "",
      setContent: (content) => editor?.commands.setContent(content),
      setJSONContent: (content) => editor?.commands.setContent(content),
      clear: () => editor?.commands.clearContent(),
      focus: (position = "end") => editor?.commands.focus(position),
      blur: () => editor?.commands.blur(),
      insertText: (text) => editor?.commands.insertContent(text),
      getCharacterCount: () => editor?.getText().length ?? 0,
    }));

    const isMaxLengthExceeded = characterCount > maxLength;
    const isEmpty = editor?.isEmpty ?? true;

    return (
      <div
        ref={editorContainerRef}
        className={cn(
          "rich-editor relative rounded-lg border bg-background transition-colors",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        {/* Toolbar */}
        {showToolbar && (
          <div className="border-b p-1">
            <EditorToolbar editor={editor} size="sm" />
          </div>
        )}

        {/* Editor content */}
        <div className="px-3 py-2">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2">
          {/* Character count */}
          {showCharacterCount && (
            <div
              className={cn(
                "text-xs",
                isMaxLengthExceeded
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
            </div>
          )}

          {/* Help text and send button */}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Shift+Enter for new line
            </span>
            {showSendButton && (
              <Button
                size="sm"
                onClick={handleSendClick}
                disabled={disabled || isEmpty || isMaxLengthExceeded}
              >
                <Send className="mr-2 h-4 w-4" />
                {sendButtonText}
              </Button>
            )}
          </div>
        </div>

        {/* Mention popup */}
        {mentionState.isOpen && (
          <div
            style={{
              position: "fixed",
              ...getMentionPosition(),
              zIndex: 50,
            }}
          >
            <MentionList
              items={mentionState.items}
              selectedIndex={mentionState.selectedIndex}
              onSelect={handleMentionSelect}
              onSelectionChange={(index) =>
                setMentionState((prev) => ({ ...prev, selectedIndex: index }))
              }
            />
          </div>
        )}

        {/* Channel popup */}
        {channelState.isOpen && (
          <div
            style={{
              position: "fixed",
              ...getChannelPosition(),
              zIndex: 50,
            }}
          >
            <ChannelMentionList
              items={channelState.items}
              selectedIndex={channelState.selectedIndex}
              onSelect={handleChannelSelect}
              onSelectionChange={(index) =>
                setChannelState((prev) => ({ ...prev, selectedIndex: index }))
              }
            />
          </div>
        )}

        {/* Emoji popup */}
        {emojiState.isOpen && (
          <div
            style={{
              position: "fixed",
              ...getEmojiPosition(),
              zIndex: 50,
            }}
          >
            <EmojiSuggestionList
              items={emojiState.items}
              selectedIndex={emojiState.selectedIndex}
              onSelect={handleEmojiSelect}
              onSelectionChange={(index) =>
                setEmojiState((prev) => ({ ...prev, selectedIndex: index }))
              }
            />
          </div>
        )}
      </div>
    );
  },
);

// ============================================================================
// Simple Editor Variant
// ============================================================================

export interface SimpleEditorProps {
  /** Initial content */
  value?: string;
  /** Callback when content changes */
  onChange?: (content: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS class */
  className?: string;
}

export function SimpleEditor({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: SimpleEditorProps) {
  return (
    <RichEditor
      value={value}
      onChange={(html) => onChange?.(html)}
      placeholder={placeholder}
      disabled={disabled}
      showToolbar={false}
      showSendButton={false}
      showCharacterCount={false}
      className={className}
      minHeight={40}
      maxHeight={200}
    />
  );
}

export default RichEditor;
