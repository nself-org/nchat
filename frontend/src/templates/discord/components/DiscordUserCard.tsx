"use client";

// ===============================================================================
// Discord User Card Component
// ===============================================================================
//
// A popup card showing user profile information, roles, mutual servers,
// and action buttons like Discord's user popout.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { discordColors } from "../config";
import {
  MessageSquare,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Volume2,
  VolumeX,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DiscordUserCardProps {
  user: DiscordUserData;
  roles?: DiscordRole[];
  mutualServers?: DiscordMutualServer[];
  note?: string;
  onMessageClick?: () => void;
  onAddFriendClick?: () => void;
  onRemoveFriendClick?: () => void;
  onMuteClick?: () => void;
  onBlockClick?: () => void;
  onNoteChange?: (note: string) => void;
  isFriend?: boolean;
  isMuted?: boolean;
  className?: string;
}

export interface DiscordUserData {
  id: string;
  username: string;
  displayName?: string;
  discriminator?: string;
  avatar?: string;
  banner?: string;
  bannerColor?: string;
  bio?: string;
  status: "online" | "idle" | "dnd" | "offline";
  customStatus?: string;
  createdAt?: Date;
  memberSince?: Date;
  isBot?: boolean;
  isPremium?: boolean;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export interface DiscordMutualServer {
  id: string;
  name: string;
  icon?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DiscordUserCard({
  user,
  roles = [],
  mutualServers = [],
  note,
  onMessageClick,
  onAddFriendClick,
  onRemoveFriendClick,
  onMuteClick,
  onBlockClick,
  onNoteChange,
  isFriend = false,
  isMuted = false,
  className,
}: DiscordUserCardProps) {
  const statusColors = {
    online: discordColors.statusOnline,
    idle: discordColors.statusIdle,
    dnd: discordColors.statusDnd,
    offline: discordColors.statusOffline,
  };

  return (
    <div
      className={cn(
        "w-[340px] overflow-hidden rounded-lg shadow-xl",
        className,
      )}
      style={{ backgroundColor: discordColors.gray900 }}
    >
      {/* Banner */}
      <div
        className="h-[60px]"
        style={{
          backgroundColor: user.bannerColor || discordColors.blurple,
          backgroundImage: user.banner ? `url(${user.banner})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Profile Section */}
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="relative -mt-8 mb-3">
          <div
            className="h-[80px] w-[80px] overflow-hidden rounded-full border-[6px]"
            style={{ borderColor: discordColors.gray900 }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: discordColors.blurple }}
              >
                {user.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {/* Status Indicator */}
          <span
            className="absolute bottom-0.5 right-0.5 h-6 w-6 rounded-full border-4"
            style={{
              backgroundColor: statusColors[user.status],
              borderColor: discordColors.gray900,
            }}
          />
        </div>

        {/* Badges Row */}
        <div className="mb-2 flex items-center gap-1">
          {user.isPremium && <NitroBadge />}
          {user.isBot && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{ backgroundColor: discordColors.blurple, color: "white" }}
            >
              BOT
            </span>
          )}
        </div>

        {/* Username & Display Name */}
        <div className="mb-3">
          <div className="text-xl font-semibold text-white">
            {user.displayName || user.username}
          </div>
          <div className="text-sm text-gray-400">
            {user.username}
            {user.discriminator && `#${user.discriminator}`}
          </div>
          {user.customStatus && (
            <div className="mt-1 text-sm text-gray-300">
              {user.customStatus}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mb-3 h-px bg-gray-700" />

        {/* About Me */}
        {user.bio && (
          <Section title="ABOUT ME">
            <p className="whitespace-pre-wrap text-sm text-gray-300">
              {user.bio}
            </p>
          </Section>
        )}

        {/* Member Since */}
        {user.memberSince && (
          <Section title="MEMBER SINCE">
            <p className="text-sm text-gray-300">
              {user.memberSince.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </Section>
        )}

        {/* Roles */}
        {roles.length > 0 && (
          <Section title="ROLES">
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                  style={{ backgroundColor: discordColors.gray800 }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="text-gray-300">{role.name}</span>
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Note */}
        <Section title="NOTE">
          <input
            type="text"
            placeholder="Click to add a note"
            value={note || ""}
            onChange={(e) => onNoteChange?.(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-500 focus:outline-none"
          />
        </Section>

        {/* Message Input */}
        <div
          className="mt-3 rounded p-2 text-sm text-gray-500"
          style={{ backgroundColor: discordColors.gray800 }}
        >
          Message @{user.username}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

function NitroBadge() {
  return (
    <div
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{
        background: "linear-gradient(90deg, #ff73fa 0%, #ffc0cb 100%)",
        color: "white",
      }}
    >
      NITRO
    </div>
  );
}

export default DiscordUserCard;
