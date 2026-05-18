"use client";

// ===============================================================================
// Telegram Composer Component
// ===============================================================================
//
// The message input area with attachment button, text input,
// emoji button, and send/voice button.
//
// ===============================================================================

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { TELEGRAM_COLORS } from "../config";
import {
  Paperclip,
  Smile,
  Send,
  Mic,
  X,
  Image as ImageIcon,
  File,
  Music,
  MapPin,
  Camera,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TelegramComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onAttachClick?: () => void;
  onEmojiClick?: () => void;
  onStickerClick?: () => void;
  replyTo?: {
    senderName: string;
    content: string;
    color?: string;
  };
  onCancelReply?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TelegramComposer({
  value = "",
  onChange,
  onSend,
  onVoiceStart,
  onVoiceEnd,
  onAttachClick,
  onEmojiClick,
  onStickerClick,
  replyTo,
  onCancelReply,
  placeholder = "Message",
  disabled = false,
  className,
}: TelegramComposerProps) {
  const [internalValue, setInternalValue] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = value || internalValue;
  const hasText = currentValue.trim().length > 0;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (hasText && !disabled) {
      onSend?.(currentValue);
      setInternalValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  return (
    <div className={cn("bg-white dark:bg-[#17212B]", className)}>
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-2 dark:border-[#232E3C]">
          <div
            className="h-full min-h-[32px] w-1 rounded"
            style={{
              backgroundColor: replyTo.color || TELEGRAM_COLORS.telegramBlue,
            }}
          />
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-medium"
              style={{ color: replyTo.color || TELEGRAM_COLORS.telegramBlue }}
            >
              {replyTo.senderName}
            </div>
            <div className="truncate text-sm text-gray-500 dark:text-gray-400">
              {replyTo.content}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232E3C]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 border-t border-gray-200 px-4 py-2 dark:border-[#232E3C]">
        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={cn(
              "rounded-full p-2 transition-colors",
              showAttachMenu
                ? "bg-[#2AABEE] text-white"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#232E3C]",
            )}
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Attachment Menu */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 min-w-[180px] rounded-lg border border-gray-200 bg-white py-2 shadow-lg dark:border-[#232E3C] dark:bg-[#17212B]">
              <AttachMenuItem
                icon={<ImageIcon className="h-5 w-5" />}
                label="Photo"
              />
              <AttachMenuItem
                icon={<File className="h-5 w-5" />}
                label="Document"
              />
              <AttachMenuItem
                icon={<Camera className="h-5 w-5" />}
                label="Camera"
              />
              <AttachMenuItem
                icon={<Music className="h-5 w-5" />}
                label="Music"
              />
              <AttachMenuItem
                icon={<MapPin className="h-5 w-5" />}
                label="Location"
              />
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="flex-1 rounded-2xl bg-gray-100 dark:bg-[#232E3C]">
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none px-4 py-2.5",
              "bg-transparent text-gray-900 dark:text-white",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "focus:outline-none",
              "max-h-[200px] min-h-[44px]",
            )}
          />
        </div>

        {/* Emoji Button */}
        <button
          onClick={onEmojiClick}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#232E3C]"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Send or Voice Button */}
        {hasText ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="rounded-full p-2 text-white"
            style={{ backgroundColor: TELEGRAM_COLORS.telegramBlue }}
          >
            <Send className="h-5 w-5" />
          </button>
        ) : (
          <button
            onMouseDown={onVoiceStart}
            onMouseUp={onVoiceEnd}
            onMouseLeave={onVoiceEnd}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#232E3C]"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AttachMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#232E3C]"
    >
      <span className="text-[#2AABEE]">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

export default TelegramComposer;
