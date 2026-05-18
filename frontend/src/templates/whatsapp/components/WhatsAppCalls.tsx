"use client";

// ===============================================================================
// WhatsApp Calls Component
// ===============================================================================
//
// The Calls tab showing call history with call type indicators.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  MoreVertical,
  Plus,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppCallsProps {
  calls?: WhatsAppCallData[];
  onCallClick?: (callId: string) => void;
  onNewCallClick?: () => void;
  onSearchClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export interface WhatsAppCallData {
  id: string;
  userName: string;
  userAvatar?: string;
  type: "incoming" | "outgoing" | "missed";
  callType: "voice" | "video";
  time: Date;
  duration?: number; // in seconds
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function WhatsAppCalls({
  calls = [],
  onCallClick,
  onNewCallClick,
  onSearchClick,
  onMenuClick,
  className,
}: WhatsAppCallsProps) {
  return (
    <div
      className={cn("flex h-full flex-col", className)}
      style={{ backgroundColor: WHATSAPP_COLORS.chatBgDark }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2"
        style={{ minHeight: 60 }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
        >
          Calls
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewCallClick}
            className="rounded-full p-2 hover:bg-white/5"
            style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
          >
            <Plus className="h-5 w-5" />
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

      {/* Create Call Link */}
      <button className="flex items-center gap-4 px-4 py-3 hover:bg-white/5">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: WHATSAPP_COLORS.primaryGreen }}
        >
          <Phone className="h-6 w-6 text-[#111B21]" />
        </div>
        <span
          style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
          className="font-medium"
        >
          Create call link
        </span>
      </button>

      {/* Recent Label */}
      {calls.length > 0 && (
        <div
          className="px-4 py-2 text-sm"
          style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
        >
          Recent
        </div>
      )}

      {/* Call List */}
      <div className="flex-1 overflow-y-auto">
        {calls.map((call) => (
          <CallItem
            key={call.id}
            call={call}
            onClick={() => onCallClick?.(call.id)}
          />
        ))}

        {calls.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div
              className="mb-4 flex h-24 w-24 items-center justify-center rounded-full"
              style={{ backgroundColor: "#202C33" }}
            >
              <Phone
                className="h-12 w-12"
                style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
              />
            </div>
            <p
              style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
              className="mb-2"
            >
              No recent calls
            </p>
            <p
              className="text-sm"
              style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
            >
              Start a call by tapping the + button
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function CallItem({
  call,
  onClick,
}: {
  call: WhatsAppCallData;
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallIcon = () => {
    const iconClass = "w-4 h-4 mr-1";
    switch (call.type) {
      case "incoming":
        return (
          <PhoneIncoming
            className={iconClass}
            style={{ color: WHATSAPP_COLORS.primaryGreen }}
          />
        );
      case "outgoing":
        return (
          <PhoneOutgoing
            className={iconClass}
            style={{ color: WHATSAPP_COLORS.primaryGreen }}
          />
        );
      case "missed":
        return (
          <PhoneMissed className={iconClass} style={{ color: "#F15C6D" }} />
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/5"
    >
      {/* Avatar */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
        {call.userAvatar ? (
          <img
            src={call.userAvatar}
            alt={call.userName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: "#6B7C85" }}
          >
            <span className="font-medium text-white">
              {call.userName[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <div
          style={{
            color:
              call.type === "missed"
                ? "#F15C6D"
                : WHATSAPP_COLORS.textPrimaryDark,
          }}
          className="font-medium"
        >
          {call.userName}
        </div>
        <div
          className="flex items-center text-sm"
          style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
        >
          {getCallIcon()}
          <span>{formatTime(call.time)}</span>
          {call.duration && (
            <span className="ml-1">({formatDuration(call.duration)})</span>
          )}
        </div>
      </div>

      {/* Call Type Icon */}
      <div style={{ color: WHATSAPP_COLORS.primaryGreen }}>
        {call.callType === "video" ? (
          <Video className="h-5 w-5" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </div>
    </button>
  );
}

export default WhatsAppCalls;
