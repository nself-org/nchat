"use client";

// ===============================================================================
// WhatsApp Composer Component
// ===============================================================================
//
// The message input area with emoji, attachment, text input, and send/voice.
//
// ===============================================================================

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";
import {
  Smile,
  Paperclip,
  Send,
  Mic,
  X,
  Camera,
  Image as ImageIcon,
  File,
  User,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onAttachClick?: () => void;
  onEmojiClick?: () => void;
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

export function WhatsAppComposer({
  value = "",
  onChange,
  onSend,
  onVoiceStart,
  onVoiceEnd,
  onAttachClick,
  onEmojiClick,
  replyTo,
  onCancelReply,
  placeholder = "Type a message",
  disabled = false,
  className,
}: WhatsAppComposerProps) {
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
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
    <div
      className={cn("relative", className)}
      style={{ backgroundColor: "#202C33" }}
    >
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-b border-[#2A3942] px-4 py-2">
          <div
            className="h-full min-h-[32px] w-1 rounded"
            style={{
              backgroundColor: replyTo.color || WHATSAPP_COLORS.primaryGreen,
            }}
          />
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-medium"
              style={{ color: replyTo.color || WHATSAPP_COLORS.primaryGreen }}
            >
              {replyTo.senderName}
            </div>
            <div
              className="truncate text-sm"
              style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
            >
              {replyTo.content}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="rounded-full p-1 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Emoji Button */}
        <button
          onClick={onEmojiClick}
          className="flex-shrink-0 self-end rounded-full p-2 hover:bg-white/5"
          style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
        >
          <Smile className="h-6 w-6" />
        </button>

        {/* Attachment Button */}
        <div className="relative flex-shrink-0 self-end">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={cn(
              "rounded-full p-2 transition-transform",
              showAttachMenu && "rotate-45",
            )}
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Paperclip className="h-6 w-6" />
          </button>

          {/* Attachment Menu */}
          {showAttachMenu && (
            <div
              className="absolute bottom-14 left-0 flex flex-col gap-2 rounded-lg p-2 shadow-lg"
              style={{ backgroundColor: "#233138" }}
            >
              <AttachButton
                icon={<ImageIcon className="h-6 w-6" />}
                label="Photos & Videos"
                color="#BF59CF"
              />
              <AttachButton
                icon={<Camera className="h-6 w-6" />}
                label="Camera"
                color="#F2566B"
              />
              <AttachButton
                icon={<File className="h-6 w-6" />}
                label="Document"
                color="#5157AE"
              />
              <AttachButton
                icon={<User className="h-6 w-6" />}
                label="Contact"
                color="#009DE2"
              />
            </div>
          )}
        </div>

        {/* Text Input */}
        <div
          className="flex-1 rounded-lg px-3 py-2"
          style={{ backgroundColor: "#2A3942" }}
        >
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent text-[15px] focus:outline-none"
            style={{
              color: WHATSAPP_COLORS.textPrimaryDark,
              minHeight: 24,
              maxHeight: 150,
            }}
          />
        </div>

        {/* Send or Voice Button */}
        {hasText ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="flex-shrink-0 self-end rounded-full p-2"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Send className="h-6 w-6" />
          </button>
        ) : (
          <button
            onMouseDown={onVoiceStart}
            onMouseUp={onVoiceEnd}
            onMouseLeave={onVoiceEnd}
            className="flex-shrink-0 self-end rounded-full p-2"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Mic className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}

function AttachButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded p-2 hover:bg-white/5"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <span
        className="text-sm"
        style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
      >
        {label}
      </span>
    </button>
  );
}

export default WhatsAppComposer;
