"use client";

// ===============================================================================
// Discord Voice Channel Component
// ===============================================================================
//
// Shows connected users in a voice channel with their status,
// speaking indicators, and controls.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { discordColors } from "../config";
import {
  Volume2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Signal,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DiscordVoiceChannelProps {
  channelName?: string;
  isConnected?: boolean;
  connectedUsers?: DiscordVoiceUser[];
  currentUserId?: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  ping?: number;
  onMuteToggle?: () => void;
  onDeafenToggle?: () => void;
  onVideoToggle?: () => void;
  onScreenShareToggle?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

export interface DiscordVoiceUser {
  id: string;
  name: string;
  avatar?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DiscordVoiceChannel({
  channelName = "Voice Channel",
  isConnected = false,
  connectedUsers = [],
  currentUserId,
  isMuted = false,
  isDeafened = false,
  isVideoOn = false,
  isScreenSharing = false,
  ping,
  onMuteToggle,
  onDeafenToggle,
  onVideoToggle,
  onScreenShareToggle,
  onDisconnect,
  className,
}: DiscordVoiceChannelProps) {
  if (!isConnected) return null;

  const getPingColor = (ms?: number) => {
    if (!ms) return discordColors.gray500;
    if (ms < 100) return discordColors.green;
    if (ms < 200) return discordColors.yellow;
    return discordColors.red;
  };

  return (
    <div
      className={cn("border-t", className)}
      style={{
        backgroundColor: discordColors.gray800,
        borderColor: discordColors.gray850,
      }}
    >
      {/* Voice Status */}
      <div className="px-2 py-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded bg-green-600/20 p-1.5">
              <Volume2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-green-500">
                Voice Connected
              </div>
              <div className="text-xs text-gray-400">{channelName}</div>
            </div>
          </div>
          {ping !== undefined && (
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: getPingColor(ping) }}
            >
              <Signal className="h-3 w-3" />
              {ping} ms
            </div>
          )}
        </div>

        {/* Connected Users Preview */}
        <div className="mb-2 flex flex-wrap gap-1">
          {connectedUsers.slice(0, 6).map((user) => (
            <VoiceUserAvatar key={user.id} user={user} size="sm" />
          ))}
          {connectedUsers.length > 6 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-600 text-xs text-gray-300">
              +{connectedUsers.length - 6}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <VoiceButton
              icon={
                isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )
              }
              isActive={!isMuted}
              isWarning={isMuted}
              onClick={onMuteToggle}
              tooltip={isMuted ? "Unmute" : "Mute"}
            />
            <VoiceButton
              icon={
                isDeafened ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )
              }
              isActive={!isDeafened}
              isWarning={isDeafened}
              onClick={onDeafenToggle}
              tooltip={isDeafened ? "Undeafen" : "Deafen"}
            />
            <VoiceButton
              icon={<Video className="h-5 w-5" />}
              isActive={isVideoOn}
              onClick={onVideoToggle}
              tooltip={isVideoOn ? "Turn off camera" : "Turn on camera"}
            />
            <VoiceButton
              icon={<Monitor className="h-5 w-5" />}
              isActive={isScreenSharing}
              onClick={onScreenShareToggle}
              tooltip={isScreenSharing ? "Stop sharing" : "Share screen"}
            />
          </div>
          <button
            onClick={onDisconnect}
            className="rounded bg-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/30"
            title="Disconnect"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function VoiceUserAvatar({
  user,
  size = "md",
}: {
  user: DiscordVoiceUser;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "overflow-hidden rounded-full ring-2",
          sizeClasses[size],
          user.isSpeaking ? "ring-green-500" : "ring-transparent",
        )}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: discordColors.blurple }}
          >
            {user.name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      {user.isMuted && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
          <MicOff className="h-2 w-2 text-white" />
        </div>
      )}
    </div>
  );
}

function VoiceButton({
  icon,
  isActive,
  isWarning = false,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  isActive: boolean;
  isWarning?: boolean;
  onClick?: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "rounded p-2 transition-colors",
        isWarning
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          : isActive
            ? "bg-gray-600/50 text-gray-200 hover:bg-gray-600/70"
            : "text-gray-400 hover:bg-gray-600/30 hover:text-gray-200",
      )}
    >
      {icon}
    </button>
  );
}

export default DiscordVoiceChannel;
