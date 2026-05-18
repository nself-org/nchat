"use client";

// ===============================================================================
// WhatsApp Chat View Component
// ===============================================================================
//
// The main chat view area with header, messages, and input area.
//
// ===============================================================================

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";
import { ArrowLeft, Search, Phone, Video, MoreVertical } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppChatViewProps {
  chatId?: string;
  chatName?: string;
  chatAvatar?: string;
  chatType?: "private" | "group" | "broadcast" | "business";
  memberCount?: number;
  lastSeen?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  children?: ReactNode;
  composer?: ReactNode;
  onBackClick?: () => void;
  onSearchClick?: () => void;
  onCallClick?: () => void;
  onVideoCallClick?: () => void;
  onMenuClick?: () => void;
  onHeaderClick?: () => void;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function WhatsAppChatView({
  chatId,
  chatName = "Chat",
  chatAvatar,
  chatType = "private",
  memberCount,
  lastSeen,
  isOnline,
  isTyping,
  children,
  composer,
  onBackClick,
  onSearchClick,
  onCallClick,
  onVideoCallClick,
  onMenuClick,
  onHeaderClick,
  className,
}: WhatsAppChatViewProps) {
  const getSubtitle = () => {
    if (isTyping) {
      return "typing...";
    }
    if (chatType === "group") {
      return memberCount ? `${memberCount} participants` : "Group";
    }
    if (chatType === "broadcast") {
      return memberCount ? `${memberCount} recipients` : "Broadcast list";
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
          "flex flex-1 flex-col items-center justify-center",
          className,
        )}
        style={{ backgroundColor: "#222E35" }}
      >
        <div className="text-center">
          <div className="mx-auto mb-8 h-[190px] w-[320px]">
            <svg viewBox="0 0 303 172" preserveAspectRatio="xMidYMid meet">
              <path
                fill="#364147"
                d="M229.565 160.229c32.647-10.984 57.366-41.988 53.825-86.81-5.381-68.1-71.025-84.478-111.627-64.782-40.603 19.697-80.837 39.291-112.876 66.405C27.849 101.109 5.66 137.527 2.05 138.029c-3.608.501-3.164 14.312.254 15.037a2576.994 2576.994 0 01102.89 25.394 279.163 279.163 0 0159.53-9.531c16.623-.009 37.655 2.571 64.841-8.7z"
              />
              <path
                fill="#1E2B32"
                d="M130.218 167.068c25.382-7.035 55.57-20.97 70.573-45.87 4.652-7.724 8.044-16.304 10.271-25.203 3.152-12.588 3.876-25.662 2.727-38.534-.245-2.737-.57-5.464-.97-8.179-.243-1.648-.513-3.29-.809-4.928-1.303-7.199-3.206-14.273-5.653-21.156-.095-.267-.191-.533-.289-.799a108.112 108.112 0 00-5.694-13.176 93.288 93.288 0 00-6.607-11.336c-10.39-15.259-25.024-27.053-41.587-34.764-17.643-8.215-37.327-11.867-56.69-11.196-19.362.672-38.57 5.674-55.426 14.889-6.538 3.573-12.674 7.789-18.305 12.568-2.996 2.543-5.842 5.26-8.507 8.14a91.305 91.305 0 00-7.59 9.449C-3.34 10.404-2.108 25.93 6.668 39.254c8.777 13.323 21.136 24.5 33.073 35.086 11.938 10.586 24.098 21.005 33.613 34.106 9.514 13.1 15.85 28.98 13.677 45.091-.628 4.648-2.003 9.171-4.023 13.392-1.156 2.417-2.529 4.727-4.083 6.907a53.09 53.09 0 01-5.233 6.144c22.201.863 39.751-6.57 56.526-12.912z"
              />
            </svg>
          </div>
          <h2
            className="mb-3 text-3xl font-light"
            style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
          >
            WhatsApp Web
          </h2>
          <p
            className="mx-auto max-w-[450px] text-sm leading-relaxed"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            Send and receive messages without keeping your phone online.
            <br />
            Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-2"
        style={{
          backgroundColor: "#202C33",
          minHeight: 60,
        }}
      >
        {/* Back Button (mobile) */}
        <button
          onClick={onBackClick}
          className="-ml-2 rounded-full p-2 hover:bg-white/5 md:hidden"
          style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Avatar & Info */}
        <button
          onClick={onHeaderClick}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
            {chatAvatar ? (
              <img
                src={chatAvatar}
                alt={chatName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ backgroundColor: "#6B7C85" }}
              >
                <span className="font-medium text-white">
                  {chatName[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 text-left">
            <h1
              className="truncate font-medium"
              style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
            >
              {chatName}
            </h1>
            <p
              className="truncate text-xs"
              style={{
                color: isTyping
                  ? WHATSAPP_COLORS.primaryGreen
                  : WHATSAPP_COLORS.textSecondaryDark,
              }}
            >
              {getSubtitle()}
            </p>
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onVideoCallClick}
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={onCallClick}
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={onSearchClick}
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Search className="h-5 w-5" />
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

      {/* Messages Area with WhatsApp pattern background */}
      <div
        className="whatsapp-chat-bg flex-1 overflow-y-auto"
        style={{ backgroundColor: "#0B141A" }}
      >
        {children}
      </div>

      {/* Composer */}
      {composer}
    </div>
  );
}

export default WhatsAppChatView;
