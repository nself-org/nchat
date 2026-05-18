"use client";

// ===============================================================================
// WhatsApp Message Component
// ===============================================================================
//
// A WhatsApp-style bubble message with tail, checkmarks, and reactions.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";
import { Check, CheckCheck, Clock, Star, Reply, Forward } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppMessageProps {
  id: string;
  content: string;
  timestamp: Date;
  isOwn?: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
  isEdited?: boolean;
  isStarred?: boolean;
  sender?: {
    name: string;
    color?: string;
  };
  replyTo?: {
    senderName: string;
    content: string;
    color?: string;
  };
  forwardedFrom?: string;
  reactions?: WhatsAppReaction[];
  attachments?: WhatsAppAttachment[];
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onReactionAdd?: (emoji: string) => void;
  onReplyClick?: () => void;
  onStarClick?: () => void;
  className?: string;
}

export interface WhatsAppReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface WhatsAppAttachment {
  type: "image" | "video" | "audio" | "document" | "voice" | "sticker";
  url: string;
  name?: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function WhatsAppMessage({
  id,
  content,
  timestamp,
  isOwn = false,
  status = "read",
  isEdited,
  isStarred,
  sender,
  replyTo,
  forwardedFrom,
  reactions = [],
  attachments = [],
  isFirstInGroup = true,
  isLastInGroup = true,
  onReactionAdd,
  onReplyClick,
  onStarClick,
  className,
}: WhatsAppMessageProps) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return (
          <Clock
            className="h-4 w-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          />
        );
      case "sent":
        return (
          <Check
            className="h-4 w-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          />
        );
      case "delivered":
        return (
          <CheckCheck
            className="h-4 w-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          />
        );
      case "read":
        return (
          <CheckCheck
            className="h-4 w-4"
            style={{ color: WHATSAPP_COLORS.checkBlue }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex px-[5%]",
        isOwn ? "justify-end" : "justify-start",
        isFirstInGroup ? "mt-2" : "mt-0.5",
        className,
      )}
    >
      {/* Bubble */}
      <div
        className={cn(
          "relative min-w-[80px] max-w-[65%] px-2 py-1 shadow-sm",
          isOwn ? "rounded-lg rounded-tr-none" : "rounded-lg rounded-tl-none",
        )}
        style={{
          backgroundColor: isOwn
            ? WHATSAPP_COLORS.bubbleOutgoingDark
            : WHATSAPP_COLORS.bubbleIncomingDark,
        }}
      >
        {/* Tail */}
        {isLastInGroup && (
          <div
            className={cn(
              "absolute top-0 h-3 w-3",
              isOwn ? "-right-2" : "-left-2",
            )}
            style={{
              background: isOwn
                ? WHATSAPP_COLORS.bubbleOutgoingDark
                : WHATSAPP_COLORS.bubbleIncomingDark,
              clipPath: isOwn
                ? "polygon(0 0, 100% 0, 0 100%)"
                : "polygon(100% 0, 0 0, 100% 100%)",
            }}
          />
        )}

        {/* Forward Header */}
        {forwardedFrom && (
          <div
            className="mb-1 flex items-center gap-1 text-xs italic"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <Forward className="h-3 w-3" />
            Forwarded
          </div>
        )}

        {/* Reply Preview */}
        {replyTo && (
          <button
            onClick={onReplyClick}
            className={cn(
              "mb-1 flex w-full flex-col rounded px-2 py-1 text-left",
              "border-l-4 bg-black/20",
            )}
            style={{
              borderLeftColor: replyTo.color || WHATSAPP_COLORS.primaryGreen,
            }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: replyTo.color || WHATSAPP_COLORS.primaryGreen }}
            >
              {replyTo.senderName}
            </span>
            <span className="truncate text-xs text-white/60">
              {replyTo.content}
            </span>
          </button>
        )}

        {/* Sender Name (group chats) */}
        {!isOwn && sender && isFirstInGroup && (
          <div
            className="mb-0.5 text-xs font-medium"
            style={{ color: sender.color || "#35CD96" }}
          >
            {sender.name}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-1">
            {attachments.map((attachment, index) => (
              <AttachmentPreview key={index} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Message Content */}
        <div className="flex items-end gap-1">
          <p
            className="whitespace-pre-wrap break-words text-[14.2px]"
            style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
          >
            {content}
          </p>

          {/* Spacer for meta info */}
          <span className="w-[70px] flex-shrink-0" />
        </div>

        {/* Meta info (time, status, star) - positioned absolutely */}
        <span
          className="absolute bottom-1 right-2 flex items-center gap-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {isStarred && <Star className="h-3 w-3 fill-current" />}
          <span className="text-[11px]">{formatTime(timestamp)}</span>
          {isOwn && getStatusIcon()}
        </span>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div
            className="absolute -bottom-3 right-2 flex items-center gap-0.5 rounded-full px-1 py-0.5 shadow-md"
            style={{ backgroundColor: WHATSAPP_COLORS.bubbleIncomingDark }}
          >
            {reactions.map((reaction, index) => (
              <span key={index} className="text-sm">
                {reaction.emoji}
              </span>
            ))}
            {reactions.reduce((acc, r) => acc + r.count, 0) > 1 && (
              <span className="ml-0.5 text-xs text-white/60">
                {reactions.reduce((acc, r) => acc + r.count, 0)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function AttachmentPreview({ attachment }: { attachment: WhatsAppAttachment }) {
  if (attachment.type === "image") {
    return (
      <div className="-mx-1 -mt-0.5 mb-1 overflow-hidden rounded">
        <img
          src={attachment.url}
          alt={attachment.name || "Image"}
          className="h-auto max-w-full"
          style={{ maxHeight: 330 }}
        />
      </div>
    );
  }

  if (attachment.type === "sticker") {
    return (
      <div className="h-[200px] w-[200px]">
        <img
          src={attachment.url}
          alt="Sticker"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded bg-black/10 p-2">
      <div
        className="flex h-10 w-10 items-center justify-center rounded"
        style={{ backgroundColor: WHATSAPP_COLORS.primaryGreen }}
      >
        <span className="text-xs font-bold text-white">
          {attachment.name?.split(".").pop()?.toUpperCase() || "FILE"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-white">
          {attachment.name || "File"}
        </div>
        {attachment.size && (
          <div className="text-xs text-white/60">
            {formatFileSize(attachment.size)}
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default WhatsAppMessage;
