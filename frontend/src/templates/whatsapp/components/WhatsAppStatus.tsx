"use client";

// ===============================================================================
// WhatsApp Status Component
// ===============================================================================
//
// The Status/Stories view showing user statuses with ring indicators.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";
import { Plus, MoreVertical } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppStatusProps {
  myStatus?: {
    hasStatus: boolean;
    lastUpdate?: Date;
    viewCount?: number;
  };
  recentStatuses?: WhatsAppStatusData[];
  mutedStatuses?: WhatsAppStatusData[];
  onMyStatusClick?: () => void;
  onStatusClick?: (statusId: string) => void;
  onMenuClick?: () => void;
  className?: string;
}

export interface WhatsAppStatusData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  time: Date;
  viewedCount: number;
  totalCount: number;
  isMuted?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function WhatsAppStatus({
  myStatus,
  recentStatuses = [],
  mutedStatuses = [],
  onMyStatusClick,
  onStatusClick,
  onMenuClick,
  className,
}: WhatsAppStatusProps) {
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
          Status
        </h1>
        <button
          onClick={onMenuClick}
          className="rounded-full p-2 hover:bg-white/5"
          style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </header>

      {/* Status List */}
      <div className="flex-1 overflow-y-auto">
        {/* My Status */}
        <button
          onClick={onMyStatusClick}
          className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/5"
        >
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#2A3942]">
              <svg viewBox="0 0 212 212" className="h-full w-full">
                <path
                  fill="#DFE5E7"
                  d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"
                />
              </svg>
            </div>
            <div
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2"
              style={{
                backgroundColor: WHATSAPP_COLORS.primaryGreen,
                borderColor: WHATSAPP_COLORS.chatBgDark,
              }}
            >
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-left">
            <div
              style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
              className="font-medium"
            >
              My status
            </div>
            <div
              className="text-sm"
              style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
            >
              {myStatus?.hasStatus
                ? `${myStatus.viewCount || 0} views`
                : "Tap to add status update"}
            </div>
          </div>
        </button>

        {/* Recent Updates */}
        {recentStatuses.length > 0 && (
          <div className="mt-2">
            <div
              className="px-4 py-2 text-sm font-medium"
              style={{ color: WHATSAPP_COLORS.primaryGreen }}
            >
              Recent updates
            </div>
            {recentStatuses.map((status) => (
              <StatusItem
                key={status.id}
                status={status}
                onClick={() => onStatusClick?.(status.id)}
              />
            ))}
          </div>
        )}

        {/* Muted Updates */}
        {mutedStatuses.length > 0 && (
          <div className="mt-2">
            <div
              className="px-4 py-2 text-sm font-medium"
              style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
            >
              Muted updates
            </div>
            {mutedStatuses.map((status) => (
              <StatusItem
                key={status.id}
                status={status}
                onClick={() => onStatusClick?.(status.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function StatusItem({
  status,
  onClick,
}: {
  status: WhatsAppStatusData;
  onClick: () => void;
}) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return "Yesterday";
  };

  const progress = status.viewedCount / status.totalCount;
  const isFullyViewed = progress >= 1;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/5"
    >
      {/* Avatar with Ring */}
      <div className="relative">
        <StatusRing
          progress={progress}
          totalSegments={status.totalCount}
          viewedSegments={status.viewedCount}
          size={56}
          isMuted={status.isMuted}
        />
        <div className="absolute inset-1 overflow-hidden rounded-full">
          {status.userAvatar ? (
            <img
              src={status.userAvatar}
              alt={status.userName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: "#6B7C85" }}
            >
              <span className="font-medium text-white">
                {status.userName[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-left">
        <div
          style={{ color: WHATSAPP_COLORS.textPrimaryDark }}
          className="font-medium"
        >
          {status.userName}
        </div>
        <div
          className="text-sm"
          style={{ color: WHATSAPP_COLORS.textSecondaryDark }}
        >
          {formatTime(status.time)}
        </div>
      </div>
    </button>
  );
}

function StatusRing({
  progress,
  totalSegments,
  viewedSegments,
  size,
  isMuted,
}: {
  progress: number;
  totalSegments: number;
  viewedSegments: number;
  size: number;
  isMuted?: boolean;
}) {
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapAngle = 4; // degrees
  const segmentAngle = (360 - gapAngle * totalSegments) / totalSegments;

  return (
    <svg width={size} height={size} className="-rotate-90 transform">
      {Array.from({ length: totalSegments }).map((_, i) => {
        const isViewed = i < viewedSegments;
        const startAngle = i * (segmentAngle + gapAngle);
        const segmentLength = (segmentAngle / 360) * circumference;

        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke={
              isMuted
                ? "#8696A0"
                : isViewed
                  ? "#8696A0"
                  : WHATSAPP_COLORS.primaryGreen
            }
            strokeDasharray={`${segmentLength} ${circumference}`}
            strokeDashoffset={-startAngle * (circumference / 360)}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export default WhatsAppStatus;
