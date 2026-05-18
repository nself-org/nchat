"use client";

// ===============================================================================
// WhatsApp Chat List Component
// ===============================================================================
//
// The left sidebar showing all chats with avatars, last message preview,
// timestamps, and unread indicators in WhatsApp style.
//
// ===============================================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";
import {
  MoreVertical,
  MessageSquarePlus,
  Search,
  Filter,
  Check,
  CheckCheck,
  Camera,
  Mic,
  Pin,
  BellOff,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppChatListProps {
  chats?: WhatsAppChatData[];
  activeChatId?: string;
  onChatSelect?: (chatId: string) => void;
  onNewChatClick?: () => void;
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showArchived?: boolean;
  archivedCount?: number;
  onArchivedClick?: () => void;
  className?: string;
}

export interface WhatsAppChatData {
  id: string;
  name: string;
  avatar?: string;
  type: "private" | "group" | "broadcast" | "business";
  lastMessage?: {
    content: string;
    type: "text" | "image" | "video" | "audio" | "document" | "voice";
    senderName?: string;
    isOwn?: boolean;
    time: Date;
    status?: "sending" | "sent" | "delivered" | "read";
  };
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isTyping?: boolean;
  isOnline?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function WhatsAppChatList({
  chats = [],
  activeChatId,
  onChatSelect,
  onNewChatClick,
  onMenuClick,
  searchQuery = "",
  onSearchChange,
  showArchived,
  archivedCount = 0,
  onArchivedClick,
  className,
}: WhatsAppChatListProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "groups">(
    "all",
  );

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (filterMode === "unread") {
      return matchesSearch && (chat.unreadCount ?? 0) > 0;
    }
    if (filterMode === "groups") {
      return matchesSearch && chat.type === "group";
    }
    return matchesSearch;
  });

  // Separate pinned and unpinned
  const pinnedChats = filteredChats.filter((chat) => chat.isPinned);
  const unpinnedChats = filteredChats.filter((chat) => !chat.isPinned);

  return (
    <div
      className={cn("flex h-full flex-col", className)}
      style={{ backgroundColor: WHATSAPP_COLORS.chatBgDark }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: WHATSAPP_COLORS.chatBgDark,
          minHeight: 60,
        }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
        >
          Chats
        </h1>
        <div className="flex items-center gap-1">
          <button
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Camera className="h-5 w-5" />
          </button>
          <button
            onClick={onNewChatClick}
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
          <button
            onClick={onMenuClick}
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-3 pb-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            "transition-colors",
          )}
          style={{ backgroundColor: "#202C33" }}
        >
          <Search
            className="h-4 w-4 flex-shrink-0"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{
              color: WHATSAPP_COLORS.textPrimaryDark,
            }}
          />
          <button
            className="rounded p-1 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <FilterPill
          label="All"
          isActive={filterMode === "all"}
          onClick={() => setFilterMode("all")}
        />
        <FilterPill
          label="Unread"
          isActive={filterMode === "unread"}
          onClick={() => setFilterMode("unread")}
        />
        <FilterPill
          label="Groups"
          isActive={filterMode === "groups"}
          onClick={() => setFilterMode("groups")}
        />
      </div>

      {/* Archived */}
      {archivedCount > 0 && (
        <button
          onClick={onArchivedClick}
          className="flex items-center gap-4 px-4 py-3 hover:bg-white/5"
          style={{ color: WHATSAPP_COLORS.primaryGreen }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#202C33]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm8.45-9h-2.9v3H8l4 4 4-4h-2.55v-3z" />
            </svg>
          </div>
          <span className="font-medium">Archived</span>
          <span
            className="ml-auto text-sm"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            {archivedCount}
          </span>
        </button>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {pinnedChats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onClick={() => onChatSelect?.(chat.id)}
          />
        ))}
        {unpinnedChats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onClick={() => onChatSelect?.(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function FilterPill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-sm transition-colors",
        isActive
          ? "bg-[#00A884] text-[#111B21]"
          : "bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942]",
      )}
    >
      {label}
    </button>
  );
}

function ChatItem({
  chat,
  isActive,
  onClick,
}: {
  chat: WhatsAppChatData;
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
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    });
  };

  const getCheckmarkIcon = (status?: string) => {
    switch (status) {
      case "read":
        return (
          <CheckCheck
            className="h-4 w-4"
            style={{ color: WHATSAPP_COLORS.checkBlue }}
          />
        );
      case "delivered":
        return (
          <CheckCheck
            className="h-4 w-4"
            style={{ color: WHATSAPP_COLORS.checkGray }}
          />
        );
      case "sent":
        return (
          <Check
            className="h-4 w-4"
            style={{ color: WHATSAPP_COLORS.checkGray }}
          />
        );
      default:
        return null;
    }
  };

  const getMessagePreview = () => {
    if (chat.isTyping) {
      return (
        <span style={{ color: WHATSAPP_COLORS.primaryGreen }}>typing...</span>
      );
    }

    if (!chat.lastMessage) return null;

    const prefixes: Record<string, React.ReactNode> = {
      image: (
        <span className="flex items-center gap-1">
          <Camera className="h-4 w-4" /> Photo
        </span>
      ),
      voice: (
        <span className="flex items-center gap-1">
          <Mic className="h-4 w-4" /> Voice message
        </span>
      ),
    };

    return prefixes[chat.lastMessage.type] || chat.lastMessage.content;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2",
        "transition-colors hover:bg-[#202C33]",
        isActive && "bg-[#2A3942]",
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
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: "#6B7C85" }}
            >
              <svg viewBox="0 0 212 212" className="h-full w-full">
                <path
                  fill="#DFE5E7"
                  d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"
                />
                <path
                  fill="#FFF"
                  d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.653.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.678 0 52.761-11.103 71.055-29.095v-.289s-.619-1.45-1.992-3.778a58.346 58.346 0 0 0-1.446-2.322zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 border-b border-[#222D34] py-2 text-left">
        <div className="mb-0.5 flex items-center justify-between">
          <span
            className="truncate font-medium"
            style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
          >
            {chat.name}
          </span>
          <span
            className="ml-2 flex-shrink-0 text-xs"
            style={{
              color:
                (chat.unreadCount ?? 0) > 0
                  ? WHATSAPP_COLORS.primaryGreen
                  : WHATSAPP_COLORS.textSecondaryDark,
            }}
          >
            {chat.lastMessage && formatTime(chat.lastMessage.time)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p
            className="flex items-center gap-1 truncate text-sm"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            {chat.lastMessage?.isOwn &&
              getCheckmarkIcon(chat.lastMessage.status)}
            {getMessagePreview()}
          </p>
          <div className="ml-2 flex flex-shrink-0 items-center gap-1">
            {chat.isMuted && (
              <BellOff
                className="h-4 w-4"
                style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
              />
            )}
            {chat.isPinned && (
              <Pin
                className="h-4 w-4"
                style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
              />
            )}
            {(chat.unreadCount ?? 0) > 0 && (
              <span
                className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium"
                style={{
                  backgroundColor: chat.isMuted
                    ? "#8696A0"
                    : WHATSAPP_COLORS.primaryGreen,
                  color: "#111B21",
                }}
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

export default WhatsAppChatList;
