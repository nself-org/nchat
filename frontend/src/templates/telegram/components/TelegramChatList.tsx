"use client";

// ===============================================================================
// Telegram Chat List Component
// ===============================================================================
//
// The left sidebar showing all chats with avatars, last message preview,
// timestamps, and unread indicators.
//
// ===============================================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TELEGRAM_COLORS } from "../config";
import {
  Menu,
  Search,
  Pencil,
  Check,
  CheckCheck,
  Pin,
  VolumeX,
  Lock,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TelegramChatListProps {
  chats?: TelegramChatData[];
  activeChatId?: string;
  onChatSelect?: (chatId: string) => void;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onNewChatClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
}

export interface TelegramChatData {
  id: string;
  name: string;
  avatar?: string;
  type: "private" | "group" | "supergroup" | "channel" | "secret" | "bot";
  lastMessage?: {
    content: string;
    senderName?: string;
    isOwn?: boolean;
    time: Date;
    status?: "sending" | "sent" | "delivered" | "read";
  };
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isOnline?: boolean;
  isVerified?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TelegramChatList({
  chats = [],
  activeChatId,
  onChatSelect,
  onMenuClick,
  onSearchClick,
  onNewChatClick,
  searchQuery = "",
  onSearchChange,
  className,
}: TelegramChatListProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredChats = searchQuery
    ? chats.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : chats;

  // Separate pinned and unpinned chats
  const pinnedChats = filteredChats.filter((chat) => chat.isPinned);
  const unpinnedChats = filteredChats.filter((chat) => !chat.isPinned);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white dark:bg-[#17212B]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={onMenuClick}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#232E3C]"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Bar */}
        <div
          className={cn(
            "flex flex-1 items-center gap-2 rounded-full px-3 py-2",
            "bg-[#F0F0F0] dark:bg-[#242F3D]",
            "transition-colors",
            isSearchFocused && "ring-2 ring-[#2AABEE]",
          )}
        >
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Pinned Chats */}
        {pinnedChats.length > 0 && (
          <div>
            {pinnedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                onClick={() => onChatSelect?.(chat.id)}
              />
            ))}
            {unpinnedChats.length > 0 && (
              <div className="mx-4 h-px bg-gray-200 dark:bg-[#232E3C]" />
            )}
          </div>
        )}

        {/* Regular Chats */}
        {unpinnedChats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onClick={() => onChatSelect?.(chat.id)}
          />
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={onNewChatClick}
        className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: TELEGRAM_COLORS.telegramBlue }}
      >
        <Pencil className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function ChatItem({
  chat,
  isActive,
  onClick,
}: {
  chat: TelegramChatData;
  isActive: boolean;
  onClick: () => void;
}) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getCheckmarkIcon = (status?: string) => {
    switch (status) {
      case "read":
        return (
          <CheckCheck
            className="h-4 w-4"
            style={{ color: TELEGRAM_COLORS.checkRead }}
          />
        );
      case "delivered":
        return <CheckCheck className="h-4 w-4 text-gray-400" />;
      case "sent":
        return <Check className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2",
        "transition-colors hover:bg-gray-100 dark:hover:bg-[#232E3C]",
        isActive && "bg-[#2AABEE] hover:bg-[#229ED9]",
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="h-12 w-12 overflow-hidden rounded-full">
          {chat.avatar ? (
            <img
              src={chat.avatar}
              alt={chat.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-lg font-medium text-white"
              style={{ backgroundColor: getAvatarColor(chat.id) }}
            >
              {chat.name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        {chat.isOnline && (
          <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#17212B]"
            style={{ backgroundColor: TELEGRAM_COLORS.online }}
          />
        )}
        {chat.type === "secret" && (
          <span
            className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ backgroundColor: TELEGRAM_COLORS.online }}
          >
            <Lock className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 text-left">
        <div className="mb-0.5 flex items-center justify-between">
          <span
            className={cn(
              "truncate font-medium",
              isActive ? "text-white" : "text-gray-900 dark:text-white",
            )}
          >
            {chat.name}
          </span>
          <div className="ml-2 flex flex-shrink-0 items-center gap-1">
            {chat.lastMessage?.isOwn &&
              getCheckmarkIcon(chat.lastMessage.status)}
            <span
              className={cn(
                "text-xs",
                isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400",
              )}
            >
              {chat.lastMessage && formatTime(chat.lastMessage.time)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "truncate text-sm",
              isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400",
            )}
          >
            {chat.lastMessage?.senderName && !chat.lastMessage.isOwn && (
              <span
                className={cn(
                  "font-medium",
                  isActive
                    ? "text-white/90"
                    : "text-gray-700 dark:text-gray-300",
                )}
              >
                {chat.lastMessage.senderName}:{" "}
              </span>
            )}
            {chat.lastMessage?.content}
          </p>
          <div className="ml-2 flex flex-shrink-0 items-center gap-1">
            {chat.isPinned && (
              <Pin
                className={cn(
                  "h-3.5 w-3.5",
                  isActive ? "text-white/60" : "text-gray-400",
                )}
              />
            )}
            {chat.isMuted && (
              <VolumeX
                className={cn(
                  "h-3.5 w-3.5",
                  isActive ? "text-white/60" : "text-gray-400",
                )}
              />
            )}
            {(chat.unreadCount ?? 0) > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium",
                  chat.isMuted
                    ? "bg-gray-400 text-white"
                    : "bg-[#2AABEE] text-white",
                )}
              >
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function getAvatarColor(id: string): string {
  const colors = [
    "#E17076", // Red
    "#FAA74A", // Orange
    "#7BC862", // Green
    "#6EC9CB", // Teal
    "#65AADD", // Blue
    "#A695E7", // Purple
    "#EE7AAE", // Pink
  ];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
}

export default TelegramChatList;
