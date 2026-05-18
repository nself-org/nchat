"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTyping } from "@/hooks/use-typing";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

/**
 * Message input props
 */
export interface MessageInputWithTypingProps {
  /** Channel ID to send message to */
  channelId: string;
  /** Callback when message is sent */
  onSendMessage: (content: string) => void | Promise<void>;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Maximum message length */
  maxLength?: number;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Custom class name */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

/**
 * Message input component with integrated typing indicators
 */
export function MessageInputWithTyping({
  channelId,
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 2000,
  showCharCount = false,
  className,
  autoFocus = false,
}: MessageInputWithTypingProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { handleTyping, forceStopTyping } = useTyping(channelId);

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;

      // Enforce max length
      if (maxLength && value.length > maxLength) {
        return;
      }

      setMessage(value);

      // Trigger typing indicator
      if (value.trim().length > 0) {
        handleTyping();
      } else {
        forceStopTyping();
      }
    },
    [maxLength, handleTyping, forceStopTyping],
  );

  /**
   * Handle send message
   */
  const handleSend = useCallback(async () => {
    const trimmed = message.trim();

    if (!trimmed || isSending || disabled) {
      return;
    }

    try {
      setIsSending(true);

      // Stop typing indicator immediately
      forceStopTyping();

      // Send message
      await onSendMessage(trimmed);

      // Clear input
      setMessage("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (error) {
      logger.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, disabled, onSendMessage, forceStopTyping]);

  /**
   * Handle key press (Enter to send, Shift+Enter for new line)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /**
   * Auto-resize textarea
   */
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [message, autoResize]);

  /**
   * Stop typing on unmount
   */
  useEffect(() => {
    return () => {
      forceStopTyping();
    };
  }, [forceStopTyping]);

  const charCount = message.length;
  const isOverLimit = maxLength ? charCount > maxLength : false;
  const canSend =
    message.trim().length > 0 && !isSending && !disabled && !isOverLimit;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex items-end gap-2">
        {/* Textarea */}
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={autoFocus}
            className={cn(
              "max-h-[200px] min-h-[44px] resize-none pr-12",
              isOverLimit &&
                "border-destructive focus-visible:ring-destructive",
            )}
            rows={1}
          />

          {/* Character count */}
          {showCharCount && (
            <div
              className={cn(
                "absolute bottom-2 right-2 text-xs text-muted-foreground",
                isOverLimit && "text-destructive",
              )}
            >
              {charCount}/{maxLength}
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="h-[44px] w-[44px] flex-shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>

      {/* Helper text */}
      {isOverLimit && (
        <p className="text-xs text-destructive">
          Message exceeds maximum length of {maxLength} characters
        </p>
      )}
    </div>
  );
}

/**
 * Minimal message input (just input, no extras)
 */
export interface MinimalMessageInputProps {
  channelId: string;
  onSendMessage: (content: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MinimalMessageInput({
  channelId,
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  className,
}: MinimalMessageInputProps) {
  const [message, setMessage] = useState("");
  const { handleTyping, forceStopTyping } = useTyping(channelId);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMessage(value);

      if (value.trim().length > 0) {
        handleTyping();
      } else {
        forceStopTyping();
      }
    },
    [handleTyping, forceStopTyping],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = message.trim();
      if (!trimmed || disabled) return;

      try {
        forceStopTyping();
        await onSendMessage(trimmed);
        setMessage("");
      } catch (error) {
        logger.error("Failed to send message:", error);
      }
    },
    [message, disabled, onSendMessage, forceStopTyping],
  );

  useEffect(() => {
    return () => {
      forceStopTyping();
    };
  }, [forceStopTyping]);

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <input
        type="text"
        value={message}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button type="submit" disabled={!message.trim() || disabled} size="sm">
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </form>
  );
}
