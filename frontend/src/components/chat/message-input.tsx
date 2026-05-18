"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
  KeyboardEvent,
} from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Underline from "@tiptap/extension-underline";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Paperclip,
  Smile,
  Send,
  X,
  AtSign,
  Hash,
  ImageIcon,
  FileUp,
  Mic,
  Gift,
  Loader2,
  Image as ImageGif,
  Sticker,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { useMessageStore } from "@/stores/message-store";
import { useUIStore } from "@/stores/ui-store";
import { useChannelTyping } from "@/hooks/use-channel-typing";
import { ReplyPreview, EditPreview } from "./reply-preview";
import { GifPicker } from "./GifPicker";
import { StickerPicker } from "./StickerPicker";
import { InlineCommandMenu } from "@/components/commands/slash-command-menu";
import type { SlashCommand } from "@/lib/commands";
import type { Message, MentionSuggestion } from "@/types/message";
import type { TenorGif } from "@/lib/tenor-client";
import type { Sticker as StickerType } from "@/hooks/use-stickers";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface MessageInputProps {
  channelId: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  onSend: (content: string, attachments?: File[]) => void | Promise<void>;
  onSendGif?: (gif: TenorGif) => void | Promise<void>;
  onSendSticker?: (sticker: StickerType) => void | Promise<void>;
  onTyping?: () => void;
  onEdit?: (messageId: string, content: string) => void | Promise<void>;
  onCancelEdit?: () => void;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  replyingTo?: Message | null;
  mentionSuggestions?: MentionSuggestion[];
  channelSuggestions?: MentionSuggestion[];
  className?: string;
}

export interface MessageInputRef {
  focus: () => void;
  clear: () => void;
  setContent: (content: string) => void;
  getContent: () => string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const TYPING_DEBOUNCE_MS = 1000;

// ============================================================================
// Component
// ============================================================================

/**
 * Rich message composer with TipTap integration
 * Supports markdown, @mentions, #channels, emoji, and file attachments
 */
export const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
  function MessageInput(
    {
      channelId,
      placeholder = "Message",
      disabled = false,
      maxLength = 4000,
      onSend,
      onSendGif,
      onSendSticker,
      onTyping,
      onEdit,
      onCancelEdit,
      onCancelReply,
      editingMessage,
      replyingTo,
      mentionSuggestions = [],
      channelSuggestions = [],
      className,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [showFormatting, setShowFormatting] = useState(false);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashQuery, setSlashQuery] = useState("");
    const lastTypingTimeRef = useRef<number>(0);

    const { user } = useAuth();
    const { config } = useAppConfig();
    const { saveDraft, getDraft, clearDraft } = useMessageStore();
    const { setMessageInputFocused } = useUIStore();

    // Typing indicator integration
    const { handleInputChange: handleTypingChange, stopTyping } =
      useChannelTyping({
        channelId,
        enabled: !disabled,
      });

    // Feature flags
    const features = {
      fileUploads: config?.features?.fileUploads ?? true,
      reactions: config?.features?.reactions ?? true,
      gifs: config?.features?.gifs ?? true,
      stickers: config?.features?.stickers ?? true,
    };

    // Initialize TipTap editor
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          horizontalRule: false,
          blockquote: { HTMLAttributes: { class: "border-l-4 pl-3 italic" } },
          codeBlock: {
            HTMLAttributes: { class: "bg-muted rounded p-2 font-mono text-sm" },
          },
          code: {
            HTMLAttributes: { class: "bg-muted px-1 rounded text-pink-500" },
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline" },
        }),
        Placeholder.configure({
          placeholder: `${placeholder}...`,
          emptyEditorClass: "is-editor-empty",
        }),
        // Mention extension for @users
        Mention.configure({
          HTMLAttributes: { class: "bg-primary/10 text-primary px-1 rounded" },
          suggestion: {
            items: ({ query }) => {
              return mentionSuggestions
                .filter((item) =>
                  item.label.toLowerCase().startsWith(query.toLowerCase()),
                )
                .slice(0, 5);
            },
            render: () => {
              // Simplified - in production use a proper suggestion dropdown
              return {
                onStart: () => {},
                onUpdate: () => {},
                onKeyDown: () => false,
                onExit: () => {},
              };
            },
          },
        }),
      ],
      content: "",
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const content = editor.getText();

        // Slash command detection: check if the current paragraph starts with /
        const { $from } = editor.state.selection;
        const lineText = $from.parent.textContent;
        if (lineText.startsWith("/")) {
          const query = lineText.slice(1);
          setSlashQuery(query);
          setShowSlashMenu(true);
        } else {
          setShowSlashMenu(false);
          setSlashQuery("");
        }

        // Trigger typing indicator with debounce
        handleTypingChange(content);

        // Also call the optional onTyping prop (legacy support)
        const now = Date.now();
        if (now - lastTypingTimeRef.current > TYPING_DEBOUNCE_MS) {
          onTyping?.();
          lastTypingTimeRef.current = now;
        }

        // Auto-save draft
        if (content.trim()) {
          saveDraft(channelId, content, replyingTo?.id);
        }
      },
      onFocus: () => {
        setMessageInputFocused(true);
      },
      onBlur: () => {
        setMessageInputFocused(false);
      },
    });

    // Load draft on mount
    useEffect(() => {
      if (editor && !editingMessage) {
        const draft = getDraft(channelId);
        if (draft?.content) {
          editor.commands.setContent(draft.content);
        }
      }
    }, [channelId, editor, editingMessage, getDraft]);

    // Set content when editing
    useEffect(() => {
      if (editor && editingMessage) {
        editor.commands.setContent(editingMessage.content);
        editor.commands.focus("end");
      }
    }, [editor, editingMessage]);

    // Clear on channel change
    useEffect(() => {
      if (editor && !editingMessage) {
        editor.commands.clearContent();
        setAttachments([]);
      }
    }, [channelId]);

    // File drop zone
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => {
        const newFiles = acceptedFiles.filter(
          (file) => file.size <= MAX_FILE_SIZE,
        );
        setAttachments((prev) =>
          [...prev, ...newFiles].slice(0, MAX_ATTACHMENTS),
        );
      },
      noClick: true,
      disabled: !features.fileUploads || disabled,
    });

    // Handle send
    const handleSend = useCallback(async () => {
      if (!editor || isSending) return;

      const content = editor.getHTML();
      const textContent = editor.getText().trim();

      // Validate
      if (!textContent && attachments.length === 0) return;
      if (textContent.length > maxLength) return;

      // Stop typing indicator immediately
      stopTyping();

      setIsSending(true);

      try {
        if (editingMessage && onEdit) {
          await onEdit(editingMessage.id, content);
        } else {
          await onSend(
            content,
            attachments.length > 0 ? attachments : undefined,
          );
          clearDraft(channelId);
        }

        // Clear editor and attachments
        editor.commands.clearContent();
        setAttachments([]);
      } catch (error) {
        logger.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    }, [
      editor,
      isSending,
      attachments,
      maxLength,
      editingMessage,
      onEdit,
      onSend,
      clearDraft,
      channelId,
      stopTyping,
    ]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        // When slash menu is open, let it handle navigation and selection keys
        if (showSlashMenu) {
          if (
            e.key === "ArrowDown" ||
            e.key === "ArrowUp" ||
            e.key === "Tab" ||
            e.key === "Enter"
          ) {
            e.preventDefault();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setShowSlashMenu(false);
            setSlashQuery("");
            return;
          }
        }

        // Send on Enter (without shift)
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
          return;
        }

        // Cancel on Escape
        if (e.key === "Escape") {
          if (editingMessage) {
            onCancelEdit?.();
          } else if (replyingTo) {
            onCancelReply?.();
          }
          return;
        }
      },
      [
        showSlashMenu,
        handleSend,
        editingMessage,
        replyingTo,
        onCancelEdit,
        onCancelReply,
      ],
    );

    // Handle emoji selection
    const handleEmojiSelect = useCallback(
      (emojiData: EmojiClickData) => {
        editor?.commands.insertContent(emojiData.emoji);
        setShowEmojiPicker(false);
        editor?.commands.focus();
      },
      [editor],
    );

    // Handle GIF selection
    const handleGifSelect = useCallback(
      async (gif: TenorGif) => {
        if (onSendGif) {
          setIsSending(true);
          try {
            await onSendGif(gif);
            setShowGifPicker(false);
          } catch (error) {
            logger.error("Failed to send GIF:", error);
          } finally {
            setIsSending(false);
          }
        }
      },
      [onSendGif],
    );

    // Handle sticker selection
    const handleStickerSelect = useCallback(
      async (sticker: StickerType) => {
        if (onSendSticker) {
          setIsSending(true);
          try {
            await onSendSticker(sticker);
            setShowStickerPicker(false);
          } catch (error) {
            logger.error("Failed to send sticker:", error);
          } finally {
            setIsSending(false);
          }
        }
      },
      [onSendSticker],
    );

    // Handle slash command selection
    const handleSlashCommandSelect = useCallback(
      (command: SlashCommand) => {
        if (!editor) return;

        // Delete the /query text from the current paragraph
        const { $from } = editor.state.selection;
        const start = $from.start();
        editor
          .chain()
          .deleteRange({ from: start, to: $from.pos })
          .insertContent(`/${command.name} `)
          .focus()
          .run();

        setShowSlashMenu(false);
        setSlashQuery("");
      },
      [editor],
    );

    // Remove attachment
    const removeAttachment = useCallback((index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      clear: () => {
        editor?.commands.clearContent();
        setAttachments([]);
      },
      setContent: (content: string) => editor?.commands.setContent(content),
      getContent: () => editor?.getHTML() || "",
    }));

    const characterCount = editor?.getText().length || 0;
    const isOverLimit = characterCount > maxLength;
    const canSend =
      !disabled &&
      !isSending &&
      !isOverLimit &&
      (characterCount > 0 || attachments.length > 0);

    return (
      <div
        ref={containerRef}
        className={cn("border-t bg-background", className)}
        {...getRootProps()}
      >
        <input {...getInputProps()} />

        {/* Drop overlay */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-primary/10 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-2 text-primary">
                <FileUp className="h-12 w-12" />
                <span className="text-lg font-medium">
                  Drop files to upload
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply/Edit preview */}
        {replyingTo && !editingMessage && (
          <ReplyPreview
            message={replyingTo}
            onClose={() => onCancelReply?.()}
          />
        )}
        {editingMessage && (
          <EditPreview
            message={editingMessage}
            onClose={() => onCancelEdit?.()}
          />
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <AttachmentPreview
            attachments={attachments}
            onRemove={removeAttachment}
          />
        )}

        {/* Editor container */}
        <div className="p-4">
          <div
            className={cn(
              "bg-muted/30 relative rounded-lg border transition-colors",
              editor?.isFocused && "border-primary/50 ring-primary/20 ring-1",
              disabled && "opacity-50",
            )}
          >
            {/* Formatting toolbar */}
            <AnimatePresence>
              {showFormatting && editor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b"
                >
                  <FormattingToolbar editor={editor} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slash command menu */}
            <InlineCommandMenu
              isVisible={showSlashMenu}
              filter={slashQuery}
              onSelect={handleSlashCommandSelect}
              onDismiss={() => {
                setShowSlashMenu(false);
                setSlashQuery("");
              }}
              context={{ channelId }}
            />

            {/* Editor */}
            <EditorContent
              editor={editor}
              className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 focus:outline-none [&_.ProseMirror.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror]:max-h-[200px] [&_.ProseMirror]:min-h-[40px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:outline-none"
              onKeyDown={handleKeyDown}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between border-t px-2 py-1">
              {/* Left actions */}
              <div className="flex items-center gap-0.5">
                {/* Formatting toggle */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFormatting(!showFormatting)}
                        className={cn(
                          "h-8 w-8 p-0",
                          showFormatting && "bg-muted",
                        )}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Formatting</TooltipContent>
                  </Tooltip>

                  {/* File upload */}
                  {features.fileUploads && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.multiple = true;
                            input.onchange = (e) => {
                              const files = (e.target as HTMLInputElement)
                                .files;
                              if (files) {
                                setAttachments((prev) =>
                                  [...prev, ...Array.from(files)].slice(
                                    0,
                                    MAX_ATTACHMENTS,
                                  ),
                                );
                              }
                            };
                            input.click();
                          }}
                          disabled={disabled}
                          className="h-8 w-8 p-0"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach files</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Emoji picker */}
                  <Popover
                    open={showEmojiPicker}
                    onOpenChange={setShowEmojiPicker}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            className="h-8 w-8 p-0"
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Emoji</TooltipContent>
                    </Tooltip>
                    <PopoverContent
                      side="top"
                      align="start"
                      className="w-auto border-0 p-0 shadow-xl"
                    >
                      <EmojiPicker
                        onEmojiClick={handleEmojiSelect}
                        theme={Theme.AUTO}
                        width={350}
                        height={400}
                        searchPlaceHolder="Search emoji..."
                        previewConfig={{ showPreview: false }}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Mention button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.commands.insertContent("@")}
                        disabled={disabled}
                        className="h-8 w-8 p-0"
                      >
                        <AtSign className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mention someone</TooltipContent>
                  </Tooltip>

                  {/* GIF picker */}
                  {features.gifs && (
                    <Popover
                      open={showGifPicker}
                      onOpenChange={setShowGifPicker}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              className="h-8 w-8 p-0"
                            >
                              <ImageGif className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>GIF</TooltipContent>
                      </Tooltip>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="w-[450px] border-0 p-0 shadow-xl"
                      >
                        <GifPicker
                          onSelect={handleGifSelect}
                          onClose={() => setShowGifPicker(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Sticker picker */}
                  {features.stickers && (
                    <Popover
                      open={showStickerPicker}
                      onOpenChange={setShowStickerPicker}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              className="h-8 w-8 p-0"
                            >
                              <Sticker className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Sticker</TooltipContent>
                      </Tooltip>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="w-[400px] border-0 p-0 shadow-xl"
                      >
                        <StickerPicker
                          onSelect={handleStickerSelect}
                          onClose={() => setShowStickerPicker(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </TooltipProvider>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                {/* Character count */}
                {characterCount > maxLength * 0.8 && (
                  <span
                    className={cn(
                      "text-xs",
                      isOverLimit
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {characterCount}/{maxLength}
                  </span>
                )}

                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  size="sm"
                  className="h-8 gap-1.5"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {editingMessage ? "Save" : "Send"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Help text */}
          <p className="mt-1 text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1">Enter</kbd> to send,{" "}
            <kbd className="rounded bg-muted px-1">Shift+Enter</kbd> for new
            line
            {editingMessage && (
              <>
                , <kbd className="rounded bg-muted px-1">Escape</kbd> to cancel
              </>
            )}
          </p>
        </div>
      </div>
    );
  },
);

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Formatting toolbar
 */
function FormattingToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 p-1">
      <TooltipProvider delayDuration={300}>
        <FormatButton
          icon={Bold}
          label="Bold"
          shortcut="Ctrl+B"
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <FormatButton
          icon={Italic}
          label="Italic"
          shortcut="Ctrl+I"
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <FormatButton
          icon={UnderlineIcon}
          label="Underline"
          shortcut="Ctrl+U"
          isActive={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <FormatButton
          icon={Strikethrough}
          label="Strikethrough"
          isActive={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <div className="mx-1 h-4 w-px bg-border" />

        <FormatButton
          icon={Code}
          label="Inline code"
          isActive={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <FormatButton
          icon={LinkIcon}
          label="Link"
          shortcut="Ctrl+K"
          isActive={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("Enter URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        />
      </TooltipProvider>
    </div>
  );
}

function FormatButton({
  icon: Icon,
  label,
  shortcut,
  isActive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn("h-7 w-7 p-0", isActive && "bg-muted")}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && (
          <span className="ml-2 text-muted-foreground">{shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Attachment preview
 */
function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: File[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b p-3">
      {attachments.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="bg-muted/50 group relative flex items-center gap-2 rounded-lg border p-2"
        >
          {/* File icon or thumbnail */}
          {file.type.startsWith("image/") ? (
            <div className="h-10 w-10 overflow-hidden rounded">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* File info */}
          <div className="min-w-0 max-w-[150px]">
            <p className="truncate text-xs font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>

          {/* Remove button */}
          <button
            onClick={() => onRemove(index)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
