"use client";

import * as React from "react";
import {
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { Send, Paperclip, Smile, AtSign, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface Mention {
  id: string;
  username: string;
  displayName: string;
}

export interface Attachment {
  id: string;
  file: File;
  preview?: string;
  progress?: number;
}

export interface ThreadReplyInputProps {
  /** Placeholder text */
  placeholder?: string;
  /** Handler for sending a reply */
  onSend: (content: string, attachments?: File[]) => Promise<void>;
  /** Handler for mention lookup */
  onMentionSearch?: (query: string) => Promise<Mention[]>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether a reply is being sent */
  sending?: boolean;
  /** Max file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Allowed file types (default: all) */
  allowedFileTypes?: string[];
  /** Max number of attachments (default: 10) */
  maxAttachments?: number;
  /** Additional class name */
  className?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ThreadReplyInput({
  placeholder = "Reply to thread...",
  onSend,
  onMentionSearch,
  disabled = false,
  sending = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes,
  maxAttachments = 10,
  className,
  autoFocus = false,
}: ThreadReplyInputProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<Mention[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  // Handle content change
  const handleContentChange = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);

      // Check for mention trigger
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch && onMentionSearch) {
        const query = mentionMatch[1];
        setMentionQuery(query);
        const results = await onMentionSearch(query);
        setMentionResults(results);
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
        setMentionResults([]);
      }

      // Adjust height after state update
      requestAnimationFrame(adjustTextareaHeight);
    },
    [onMentionSearch, adjustTextareaHeight],
  );

  // Insert mention
  const insertMention = useCallback(
    (mention: Mention) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.slice(0, cursorPos);
      const textAfterCursor = content.slice(cursorPos);

      // Find and replace the @query with @username
      const newTextBefore = textBeforeCursor.replace(
        /@\w*$/,
        `@${mention.username} `,
      );
      const newContent = newTextBefore + textAfterCursor;

      setContent(newContent);
      setMentionQuery(null);
      setMentionResults([]);

      // Focus and set cursor position
      requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPos = newTextBefore.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [content],
  );

  // Handle keyboard navigation for mentions
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle mention selection
      if (mentionResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((prev) =>
            prev < mentionResults.length - 1 ? prev + 1 : 0,
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((prev) =>
            prev > 0 ? prev - 1 : mentionResults.length - 1,
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(mentionResults[mentionIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMentionQuery(null);
          setMentionResults([]);
          return;
        }
      }

      // Handle send on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [mentionResults, mentionIndex, insertMention],
  );

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && attachments.length === 0) return;
    if (sending || disabled) return;

    try {
      const files = attachments.map((a) => a.file);
      await onSend(trimmedContent, files.length > 0 ? files : undefined);
      setContent("");
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      logger.error("Failed to send reply:", error);
    }
  }, [content, attachments, sending, disabled, onSend]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      const validFiles = files.filter((file) => {
        // Check file size
        if (file.size > maxFileSize) {
          logger.warn(`File ${file.name} exceeds max size`);
          return false;
        }
        // Check file type
        if (allowedFileTypes && !allowedFileTypes.includes(file.type)) {
          logger.warn(`File type ${file.type} not allowed`);
          return false;
        }
        return true;
      });

      const newAttachments = validFiles
        .slice(0, maxAttachments - attachments.length)
        .map((file) => {
          const attachment: Attachment = {
            id: `${Date.now()}-${file.name}`,
            file,
          };
          // Create preview for images
          if (file.type.startsWith("image/")) {
            attachment.preview = URL.createObjectURL(file);
          }
          return attachment;
        });

      setAttachments((prev) => [...prev, ...newAttachments]);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [maxFileSize, allowedFileTypes, maxAttachments, attachments.length],
  );

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  }, []);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.preview) {
          URL.revokeObjectURL(a.preview);
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend =
    (content.trim().length > 0 || attachments.length > 0) &&
    !sending &&
    !disabled;

  return (
    <TooltipProvider>
      <div className={cn("border-t bg-background", className)}>
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative overflow-hidden rounded-md bg-muted"
              >
                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center">
                    <Paperclip className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 text-[10px] text-white">
                  {attachment.file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mention suggestions */}
        {mentionResults.length > 0 && (
          <div className="px-3 pt-2">
            <div className="overflow-hidden rounded-md border bg-popover shadow-md">
              {mentionResults.map((mention, index) => (
                <button
                  key={mention.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    index === mentionIndex && "bg-muted",
                  )}
                  onClick={() => insertMention(mention)}
                >
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{mention.displayName}</span>
                  <span className="text-muted-foreground">
                    @{mention.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-3">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || sending}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={autoFocus}
                className="max-h-[150px] min-h-[40px] resize-none py-2.5 pr-10"
                rows={1}
              />
            </div>

            <div className="flex items-center gap-1">
              {/* Attachment button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={
                      disabled ||
                      sending ||
                      attachments.length >= maxAttachments
                    }
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Attach file ({attachments.length}/{maxAttachments})
                </TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept={allowedFileTypes?.join(",")}
              />

              {/* Emoji picker */}
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={disabled || sending}
                      >
                        <Smile className="h-4 w-4" />
                        <span className="sr-only">Add emoji</span>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add emoji</TooltipContent>
                </Tooltip>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-[280px] p-2"
                >
                  {/* Simple emoji grid - can be replaced with emoji-picker-react */}
                  <div className="grid grid-cols-8 gap-1">
                    {[
                      "128516",
                      "128522",
                      "128525",
                      "128514",
                      "129315",
                      "128517",
                      "128518",
                      "128521",
                      "128519",
                      "128513",
                      "129392",
                      "128523",
                      "128539",
                      "128540",
                      "129299",
                      "128526",
                      "128527",
                      "128531",
                      "128532",
                      "128560",
                      "128557",
                      "128546",
                      "128545",
                      "128548",
                      "129300",
                      "129488",
                      "128293",
                      "129505",
                      "128077",
                      "128079",
                      "128588",
                      "129309",
                    ].map((code) => (
                      <button
                        key={code}
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
                        onClick={() =>
                          handleEmojiSelect(
                            String.fromCodePoint(parseInt(code)),
                          )
                        }
                      >
                        {String.fromCodePoint(parseInt(code))}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Send button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9"
                    disabled={!canSend}
                    onClick={handleSend}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Send reply</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send reply (Enter)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Helper text */}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Press{" "}
            <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">
              Enter
            </kbd>{" "}
            to send,{" "}
            <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">
              Shift + Enter
            </kbd>{" "}
            for new line
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ThreadReplyInput;
