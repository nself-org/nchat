"use client";

// ===============================================================================
// Slack Huddle Component
// ===============================================================================
//
// The Slack Huddle audio/video call UI that appears at the bottom of the
// sidebar when in an active huddle.
//
// ===============================================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import { slackColors } from "../config";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackHuddleProps {
  isActive?: boolean;
  channelName?: string;
  participants?: SlackHuddleParticipant[];
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  onMuteToggle?: () => void;
  onVideoToggle?: () => void;
  onScreenShareToggle?: () => void;
  onLeave?: () => void;
  onInvite?: () => void;
  className?: string;
}

export interface SlackHuddleParticipant {
  id: string;
  name: string;
  avatar?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function SlackHuddle({
  isActive = false,
  channelName = "general",
  participants = [],
  isMuted = false,
  isVideoOn = false,
  isScreenSharing = false,
  onMuteToggle,
  onVideoToggle,
  onScreenShareToggle,
  onLeave,
  onInvite,
  className,
}: SlackHuddleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isActive) return null;

  return (
    <div className={cn("border-t border-white/10", "bg-[#350D36]", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full"
              style={{ backgroundColor: slackColors.green }}
            >
              <Mic className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Huddle</div>
            <div className="text-xs text-white/60">#{channelName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">{participants.length}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-white/60" />
          ) : (
            <ChevronUp className="h-4 w-4 text-white/60" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Participants */}
          <div className="mb-4 flex flex-wrap gap-2">
            {participants.map((participant) => (
              <ParticipantAvatar
                key={participant.id}
                participant={participant}
              />
            ))}
            <button
              onClick={onInvite}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-white/30 text-white/50 transition-colors hover:border-white/50 hover:text-white"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <HuddleButton
              icon={
                isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )
              }
              isActive={!isMuted}
              onClick={onMuteToggle}
              tooltip={isMuted ? "Unmute" : "Mute"}
            />
            <HuddleButton
              icon={
                isVideoOn ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )
              }
              isActive={isVideoOn}
              onClick={onVideoToggle}
              tooltip={isVideoOn ? "Turn off video" : "Turn on video"}
            />
            <HuddleButton
              icon={<Monitor className="h-5 w-5" />}
              isActive={isScreenSharing}
              onClick={onScreenShareToggle}
              tooltip={isScreenSharing ? "Stop sharing" : "Share screen"}
            />
            <HuddleButton
              icon={<MoreHorizontal className="h-5 w-5" />}
              isActive={false}
              onClick={() => {}}
              tooltip="More options"
            />
            <div className="mx-1 h-6 w-px bg-white/20" />
            <button
              onClick={onLeave}
              className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              <PhoneOff className="h-4 w-4" />
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Compact Controls (when collapsed) */}
      {!isExpanded && (
        <div className="flex items-center justify-center gap-2 px-4 pb-3">
          <HuddleButton
            icon={
              isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )
            }
            isActive={!isMuted}
            onClick={onMuteToggle}
            tooltip={isMuted ? "Unmute" : "Mute"}
            size="sm"
          />
          <button
            onClick={onLeave}
            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
          >
            Leave
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function ParticipantAvatar({
  participant,
}: {
  participant: SlackHuddleParticipant;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "h-8 w-8 overflow-hidden rounded-full ring-2",
          participant.isSpeaking ? "ring-green-400" : "ring-transparent",
        )}
      >
        {participant.avatar ? (
          <img
            src={participant.avatar}
            alt={participant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm font-medium text-white"
            style={{ backgroundColor: slackColors.aubergineLight }}
          >
            {participant.name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      {participant.isMuted && (
        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#350D36]">
          <MicOff className="h-2.5 w-2.5 text-white/70" />
        </div>
      )}
    </div>
  );
}

function HuddleButton({
  icon,
  isActive,
  onClick,
  tooltip,
  size = "md",
}: {
  icon: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
  tooltip: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
  };

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "flex items-center justify-center rounded-full transition-colors",
        sizeClasses[size],
        isActive
          ? "bg-white/20 text-white"
          : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white",
      )}
    >
      {icon}
    </button>
  );
}

export default SlackHuddle;
