"use client";

import {
  memo,
  forwardRef,
  useRef,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image,
  Camera,
  Mic,
  Plus,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSafeArea, useVisualViewport } from "@/lib/mobile/use-viewport";
import { useMobileStore } from "@/lib/mobile/mobile-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface MobileMessageInputProps {
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showAttachments?: boolean;
  showEmoji?: boolean;
  showVoice?: boolean;
  isReplying?: boolean;
  replyingTo?: {
    userName: string;
    content: string;
  };
  onSend?: (content: string, attachments?: File[]) => void | Promise<void>;
  onTyping?: () => void;
  onCancelReply?: () => void;
  onAttachmentClick?: () => void;
  onEmojiClick?: () => void;
  onVoiceClick?: () => void;
  className?: string;
}

export interface MobileMessageInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  setValue: (value: string) => void;
  getValue: () => string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_HEIGHT = 120;
const MIN_HEIGHT = 44;

// ============================================================================
// Component
// ============================================================================

/**
 * Mobile-optimized message input with auto-resize
 * Collapses when empty, expands on tap
 */
export const MobileMessageInput = memo(
  forwardRef<MobileMessageInputRef, MobileMessageInputProps>(
    function MobileMessageInput(
      {
        placeholder = "Message...",
        disabled = false,
        maxLength = 4000,
        showAttachments = true,
        showEmoji = true,
        showVoice = true,
        isReplying = false,
        replyingTo,
        onSend,
        onTyping,
        onCancelReply,
        onAttachmentClick,
        onEmojiClick,
        onVoiceClick,
        className,
      },
      ref,
    ) {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const [isFocused, setIsFocused] = useState(false);
      const [isSending, setIsSending] = useState(false);
      const [showActions, setShowActions] = useState(false);
      const [attachments, setAttachments] = useState<File[]>([]);

      const safeArea = useSafeArea();
      const { keyboardVisible } = useVisualViewport();
      const { setKeyboardVisible } = useMobileStore();

      // Expose methods via ref
      useImperativeHandle(ref, () => ({
        focus: () => textareaRef.current?.focus(),
        blur: () => textareaRef.current?.blur(),
        clear: () => {
          setValue("");
          resizeTextarea();
        },
        setValue: (newValue: string) => {
          setValue(newValue);
          requestAnimationFrame(resizeTextarea);
        },
        getValue: () => value,
      }));

      // Auto-resize textarea
      const resizeTextarea = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        const newHeight = Math.min(
          Math.max(textarea.scrollHeight, MIN_HEIGHT),
          MAX_HEIGHT,
        );
        textarea.style.height = `${newHeight}px`;
      }, []);

      // Handle input change
      const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          const newValue = e.target.value;
          if (newValue.length <= maxLength) {
            setValue(newValue);
            requestAnimationFrame(resizeTextarea);
            onTyping?.();
          }
        },
        [maxLength, resizeTextarea, onTyping],
      );

      // Handle send
      const handleSend = useCallback(async () => {
        const trimmedValue = value.trim();
        if (!trimmedValue && attachments.length === 0) return;
        if (isSending) return;

        setIsSending(true);

        try {
          await onSend?.(
            trimmedValue,
            attachments.length > 0 ? attachments : undefined,
          );
          setValue("");
          setAttachments([]);
          resizeTextarea();
          textareaRef.current?.focus();
        } catch (error) {
          logger.error("Failed to send message:", error);
        } finally {
          setIsSending(false);
        }
      }, [value, attachments, isSending, onSend, resizeTextarea]);

      // Handle key press
      const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
          // Send on Enter (without shift on mobile, it's usually just Enter)
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        },
        [handleSend],
      );

      // Handle focus
      const handleFocus = useCallback(() => {
        setIsFocused(true);
        setKeyboardVisible(true);
      }, [setKeyboardVisible]);

      // Handle blur
      const handleBlur = useCallback(() => {
        setIsFocused(false);
        setKeyboardVisible(false);
        // Delay hiding actions to allow button clicks
        setTimeout(() => {
          if (!isFocused) {
            setShowActions(false);
          }
        }, 200);
      }, [isFocused, setKeyboardVisible]);

      // Handle file selection
      const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (files) {
            setAttachments((prev) =>
              [...prev, ...Array.from(files)].slice(0, 10),
            );
          }
          e.target.value = "";
        },
        [],
      );

      // Remove attachment
      const removeAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
      }, []);

      const canSend = value.trim().length > 0 || attachments.length > 0;
      const showCharacterCount = value.length > maxLength * 0.8;

      return (
        <div
          className={cn(
            "border-t bg-background",
            "safe-area-bottom",
            className,
          )}
          style={{
            paddingBottom: keyboardVisible ? 0 : safeArea.bottom || 8,
          }}
        >
          {/* Reply preview */}
          <AnimatePresence>
            {isReplying && replyingTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b"
              >
                <div className="bg-muted/30 flex items-center justify-between px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-primary">
                      Replying to {replyingTo.userName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {replyingTo.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCancelReply}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attachments preview */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b"
              >
                <div className="flex gap-2 overflow-x-auto p-2">
                  {attachments.map((file, index) => (
                    <AttachmentPreview
                      key={`${file.name}-${index}`}
                      file={file}
                      onRemove={() => removeAttachment(index)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b"
              >
                <div className="flex items-center justify-around py-2">
                  <QuickAction icon={Camera} label="Camera" />
                  <QuickAction icon={Image} label="Photo" />
                  <QuickAction
                    icon={Paperclip}
                    label="File"
                    onClick={onAttachmentClick}
                  />
                  <QuickAction
                    icon={Mic}
                    label="Voice"
                    onClick={onVoiceClick}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className="flex items-end gap-2 p-2">
            {/* Expand/collapse button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowActions(!showActions)}
              className={cn(
                "h-10 w-10 shrink-0 touch-manipulation",
                "transition-transform duration-200",
                showActions && "rotate-45",
              )}
            >
              <Plus className="h-5 w-5" />
            </Button>

            {/* Text input container */}
            <div
              className={cn(
                "relative flex-1 rounded-3xl",
                "bg-muted/50",
                "transition-colors duration-200",
                isFocused && "ring-primary/20 bg-muted ring-1",
              )}
            >
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className={cn(
                  "w-full resize-none bg-transparent",
                  "px-4 py-2.5 pr-10",
                  "text-sm placeholder:text-muted-foreground",
                  "focus:outline-none",
                  "touch-manipulation",
                )}
                style={{
                  minHeight: MIN_HEIGHT,
                  maxHeight: MAX_HEIGHT,
                }}
              />

              {/* Emoji button inside input */}
              {showEmoji && (
                <button
                  onClick={onEmojiClick}
                  className="absolute bottom-2 right-2 touch-manipulation p-1 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Send/Voice button */}
            {canSend ? (
              <Button
                onClick={handleSend}
                disabled={disabled || isSending}
                size="icon"
                className="h-10 w-10 shrink-0 touch-manipulation rounded-full"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : showVoice ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoiceClick}
                className="h-10 w-10 shrink-0 touch-manipulation"
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : null}
          </div>

          {/* Character count */}
          <AnimatePresence>
            {showCharacterCount && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 pb-1"
              >
                <span
                  className={cn(
                    "text-xs",
                    value.length > maxLength
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {value.length}/{maxLength}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden file input */}
          <input
            type="file"
            id="mobile-file-input"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      );
    },
  ),
);

// ============================================================================
// Sub-components
// ============================================================================

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}

const QuickAction = memo(function QuickAction({
  icon: Icon,
  label,
  onClick,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex touch-manipulation flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
});

interface AttachmentPreviewProps {
  file: File;
  onRemove: () => void;
}

const AttachmentPreview = memo(function AttachmentPreview({
  file,
  onRemove,
}: AttachmentPreviewProps) {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative shrink-0">
      {isImage ? (
        <div className="h-16 w-16 overflow-hidden rounded-lg">
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-muted p-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <span className="mt-1 w-full truncate text-center text-[10px]">
            {file.name.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      )}

      <button
        onClick={onRemove}
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});

export default MobileMessageInput;
