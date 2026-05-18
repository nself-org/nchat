"use client";

// ===============================================================================
// Slack Composer Component
// ===============================================================================
//
// The message input area with formatting toolbar, file attachments,
// emoji picker, and send button.
//
// ===============================================================================

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { slackColors } from "../config";
import {
  Bold,
  Italic,
  Strikethrough,
  Link,
  ListOrdered,
  List,
  Code,
  Paperclip,
  AtSign,
  Smile,
  Send,
  Mic,
  Video,
  Plus,
  ChevronDown,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackComposerProps {
  channelName?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string) => void;
  onFileAttach?: (files: FileList) => void;
  onMentionClick?: () => void;
  onEmojiClick?: () => void;
  disabled?: boolean;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function SlackComposer({
  channelName = "general",
  placeholder,
  value = "",
  onChange,
  onSend,
  onFileAttach,
  onMentionClick,
  onEmojiClick,
  disabled = false,
  className,
}: SlackComposerProps) {
  const [internalValue, setInternalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentValue = value || internalValue;
  const defaultPlaceholder = placeholder || `Message #${channelName}`;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (currentValue.trim() && !disabled) {
      onSend?.(currentValue);
      setInternalValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileAttach?.(e.target.files);
    }
  };

  return (
    <div className={cn("px-4 pb-4", className)}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          isFocused
            ? "border-gray-500 shadow-sm dark:border-gray-400"
            : "border-gray-300 dark:border-[#35383C]",
          "bg-white dark:bg-[#222529]",
        )}
      >
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-gray-200 px-3 py-1 dark:border-[#35383C]">
          <FormatButton icon={<Bold className="h-4 w-4" />} tooltip="Bold" />
          <FormatButton
            icon={<Italic className="h-4 w-4" />}
            tooltip="Italic"
          />
          <FormatButton
            icon={<Strikethrough className="h-4 w-4" />}
            tooltip="Strikethrough"
          />
          <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-[#35383C]" />
          <FormatButton icon={<Link className="h-4 w-4" />} tooltip="Link" />
          <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-[#35383C]" />
          <FormatButton
            icon={<ListOrdered className="h-4 w-4" />}
            tooltip="Ordered list"
          />
          <FormatButton
            icon={<List className="h-4 w-4" />}
            tooltip="Bulleted list"
          />
          <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-[#35383C]" />
          <FormatButton
            icon={<Code className="h-4 w-4" />}
            tooltip="Code block"
          />
        </div>

        {/* Text Input */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={defaultPlaceholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none px-3 py-2.5",
              "bg-transparent text-gray-900 dark:text-white",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "focus:outline-none",
              "max-h-[300px] min-h-[44px]",
            )}
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-1 dark:border-[#35383C]">
          <div className="flex items-center gap-0.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <ActionButton
              icon={<Plus className="h-4 w-4" />}
              onClick={handleFileClick}
              tooltip="Add attachment"
            />
            <ActionButton
              icon={<Mic className="h-4 w-4" />}
              tooltip="Record audio clip"
            />
            <ActionButton
              icon={<Video className="h-4 w-4" />}
              tooltip="Record video clip"
            />
            <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-[#35383C]" />
            <ActionButton
              icon={<Smile className="h-4 w-4" />}
              onClick={onEmojiClick}
              tooltip="Emoji"
            />
            <ActionButton
              icon={<AtSign className="h-4 w-4" />}
              onClick={onMentionClick}
              tooltip="Mention someone"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <ChevronDown className="h-3 w-3" />
            </button>
            <button
              onClick={handleSend}
              disabled={!currentValue.trim() || disabled}
              className={cn(
                "rounded p-1.5",
                currentValue.trim()
                  ? "bg-[#007A5A] text-white hover:bg-[#006646]"
                  : "bg-gray-100 text-gray-400 dark:bg-[#35383C]",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormatButton({
  icon,
  tooltip,
  onClick,
  isActive = false,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "rounded p-1.5",
        isActive
          ? "bg-gray-200 text-gray-900 dark:bg-[#35383C] dark:text-white"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#35383C] dark:hover:text-gray-200",
      )}
    >
      {icon}
    </button>
  );
}

function ActionButton({
  icon,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#35383C] dark:hover:text-gray-200"
    >
      {icon}
    </button>
  );
}

export default SlackComposer;
