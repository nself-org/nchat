"use client";

// ===============================================================================
// Telegram Chat View Component
// ===============================================================================
//
// The main chat view area with header, messages, and input area.
//
// ===============================================================================

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TELEGRAM_COLORS } from "../config";
import { ArrowLeft, Search, Phone, MoreVertical, Lock } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TelegramChatViewProps {
  chatId?: string;
  chatName?: string;
  chatAvatar?: string;
  chatType?: "private" | "group" | "supergroup" | "channel" | "secret" | "bot";
  memberCount?: number;
  isOnline?: boolean;
  lastSeen?: string;
  children?: ReactNode;
  composer?: ReactNode;
  onBackClick?: () => void;
  onSearchClick?: () => void;
  onCallClick?: () => void;
  onMenuClick?: () => void;
  onHeaderClick?: () => void;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TelegramChatView({
  chatId,
  chatName = "Chat",
  chatAvatar,
  chatType = "private",
  memberCount,
  isOnline,
  lastSeen,
  children,
  composer,
  onBackClick,
  onSearchClick,
  onCallClick,
  onMenuClick,
  onHeaderClick,
  className,
}: TelegramChatViewProps) {
  const getSubtitle = () => {
    if (chatType === "secret") {
      return "Secret chat";
    }
    if (chatType === "channel") {
      return memberCount
        ? `${memberCount.toLocaleString()} subscribers`
        : "Channel";
    }
    if (chatType === "group" || chatType === "supergroup") {
      return memberCount ? `${memberCount.toLocaleString()} members` : "Group";
    }
    if (chatType === "bot") {
      return "bot";
    }
    if (isOnline) {
      return "online";
    }
    return lastSeen || "last seen recently";
  };

  if (!chatId) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center",
          "bg-[#EFEAE2] dark:bg-[#0E1621]",
          className,
        )}
      >
        <p className="text-gray-500 dark:text-gray-400">
          Select a chat to start messaging
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        "bg-[#EFEAE2] dark:bg-[#0E1621]",
        className,
      )}
    >
      {/* Header */}
      <header
        className="flex items-center gap-2 bg-white px-4 py-2 shadow-sm dark:bg-[#17212B]"
        style={{ minHeight: 56 }}
      >
        {/* Back Button (mobile) */}
        <button
          onClick={onBackClick}
          className="-ml-2 rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#232E3C] md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Avatar & Info */}
        <button
          onClick={onHeaderClick}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 overflow-hidden rounded-full">
              {chatAvatar ? (
                <img
                  src={chatAvatar}
                  alt={chatName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center font-medium text-white"
                  style={{ backgroundColor: TELEGRAM_COLORS.telegramBlue }}
                >
                  {chatName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {chatType === "secret" && (
              <span
                className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: TELEGRAM_COLORS.online }}
              >
                <Lock className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>

          <div className="min-w-0 text-left">
            <h1 className="truncate font-medium text-gray-900 dark:text-white">
              {chatName}
            </h1>
            <p
              className={cn(
                "truncate text-sm",
                isOnline
                  ? "text-[#2AABEE]"
                  : chatType === "secret"
                    ? "text-green-500"
                    : "text-gray-500 dark:text-gray-400",
              )}
            >
              {getSubtitle()}
            </p>
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSearchClick}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#232E3C]"
          >
            <Search className="h-5 w-5" />
          </button>
          {chatType === "private" && (
            <button
              onClick={onCallClick}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#232E3C]"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onMenuClick}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#232E3C]"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Composer */}
      {composer}
    </div>
  );
}

export default TelegramChatView;
