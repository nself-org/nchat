"use client";

// ===============================================================================
// Discord Server List Component
// ===============================================================================
//
// The vertical server list (guild bar) on the left side of Discord.
// Features server icons with hover/active states and notification indicators.
//
// ===============================================================================

import { cn } from "@/lib/utils";
import { discordColors } from "../config";
import { Plus, Compass, Download } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DiscordServerListProps {
  servers?: DiscordServerData[];
  activeServerId?: string;
  onServerSelect?: (serverId: string) => void;
  onHomeClick?: () => void;
  onAddServer?: () => void;
  onExploreClick?: () => void;
  className?: string;
}

export interface DiscordServerData {
  id: string;
  name: string;
  icon?: string;
  unreadCount?: number;
  mentionCount?: number;
  hasNotification?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DiscordServerList({
  servers = [],
  activeServerId,
  onServerSelect,
  onHomeClick,
  onAddServer,
  onExploreClick,
  className,
}: DiscordServerListProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 overflow-y-auto py-3",
        className,
      )}
      style={{ backgroundColor: discordColors.gray850 }}
    >
      {/* Home Button (Discord logo) */}
      <ServerButton
        isHome
        isActive={!activeServerId}
        onClick={onHomeClick}
        tooltip="Direct Messages"
      />

      <Separator />

      {/* Server List */}
      <div className="flex flex-col items-center gap-2">
        {servers.map((server) => (
          <ServerButton
            key={server.id}
            server={server}
            isActive={server.id === activeServerId}
            onClick={() => onServerSelect?.(server.id)}
            tooltip={server.name}
          />
        ))}
      </div>

      <Separator />

      {/* Add Server Button */}
      <ServerButton
        isAction
        icon={<Plus className="h-6 w-6" />}
        onClick={onAddServer}
        tooltip="Add a Server"
        color={discordColors.green}
      />

      {/* Explore Button */}
      <ServerButton
        isAction
        icon={<Compass className="h-6 w-6" />}
        onClick={onExploreClick}
        tooltip="Explore Discoverable Servers"
        color={discordColors.green}
      />

      {/* Download Button */}
      <Separator />
      <ServerButton
        isAction
        icon={<Download className="h-6 w-6" />}
        onClick={() => {}}
        tooltip="Download Apps"
        color={discordColors.green}
      />
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function Separator() {
  return (
    <div
      className="mx-auto h-0.5 w-8 rounded-full"
      style={{ backgroundColor: discordColors.gray800 }}
    />
  );
}

interface ServerButtonProps {
  server?: DiscordServerData;
  isHome?: boolean;
  isAction?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
  tooltip?: string;
}

function ServerButton({
  server,
  isHome,
  isAction,
  isActive,
  icon,
  color,
  onClick,
  tooltip,
}: ServerButtonProps) {
  const hasNotification =
    server?.hasNotification || (server?.unreadCount ?? 0) > 0;
  const hasMention = (server?.mentionCount ?? 0) > 0;

  return (
    <div className="group relative flex items-center">
      {/* Pill Indicator */}
      <div
        className={cn(
          "absolute left-0 w-1 rounded-r-full transition-all duration-200",
          "bg-white",
          isActive
            ? "h-10"
            : hasNotification
              ? "h-2 group-hover:h-5"
              : "h-0 group-hover:h-5",
        )}
        style={{ left: -4 }}
      />

      {/* Server Icon */}
      <button
        onClick={onClick}
        title={tooltip}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center",
          "overflow-hidden transition-all duration-200",
          isActive || (isHome && !server)
            ? "rounded-2xl"
            : "rounded-3xl group-hover:rounded-2xl",
        )}
        style={{
          backgroundColor: isActive
            ? discordColors.blurple
            : isAction
              ? discordColors.gray700
              : discordColors.gray700,
        }}
      >
        {isHome ? (
          <DiscordLogo
            className={cn(
              "h-7 w-7 transition-colors",
              isActive ? "text-white" : "text-gray-300 group-hover:text-white",
            )}
          />
        ) : isAction ? (
          <span
            className="transition-colors"
            style={{ color: isActive ? "white" : color }}
          >
            {icon}
          </span>
        ) : server?.icon ? (
          <img
            src={server.icon}
            alt={server.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-lg font-medium text-white">
            {server?.name
              ?.split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}

        {/* Mention Badge */}
        {hasMention && (
          <span
            className="absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-4 px-1.5 text-xs font-bold text-white"
            style={{
              backgroundColor: discordColors.red,
              borderColor: discordColors.gray850,
            }}
          >
            {server?.mentionCount}
          </span>
        )}
      </button>
    </div>
  );
}

function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" fill="currentColor" className={className}>
      <path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4062 0.461742 17.1749 0.934541 16.9708 1.4184C15.003 1.12145 12.9974 1.12145 11.0283 1.4184C10.819 0.934541 10.589 0.461744 10.3422 0.00546311C8.49177 0.324393 6.68841 0.885118 4.97731 1.68231C1.56209 6.77853 0.549238 11.7454 1.05553 16.6369C3.18427 18.1943 5.54879 19.3584 8.05126 20.0001C8.55545 19.3228 9.0141 18.6135 9.42187 17.8756C8.7011 17.607 8.00454 17.2807 7.34086 16.9014C7.52349 16.7728 7.70086 16.6398 7.87347 16.5068C12.6051 18.7166 17.7276 18.7166 22.4134 16.5068C22.5874 16.6398 22.7647 16.7728 22.9461 16.9014C22.2811 17.282 21.5831 17.6083 20.8623 17.8769C21.2687 18.6148 21.7273 19.3241 22.2329 20.0014C24.737 19.3584 27.1015 18.1956 29.2289 16.6382C29.8292 10.9288 28.2198 6.00885 23.0212 1.67671ZM10.1169 13.6359C8.79855 13.6359 7.70888 12.4349 7.70888 10.9745C7.70888 9.51413 8.7716 8.30527 10.1169 8.30527C11.4608 8.30527 12.5518 9.5155 12.5263 10.9745C12.5022 12.4349 11.4608 13.6359 10.1169 13.6359ZM19.8824 13.6359C18.564 13.6359 17.4744 12.4349 17.4744 10.9745C17.4744 9.51413 18.5371 8.30527 19.8824 8.30527C21.2276 8.30527 22.3186 9.5155 22.2918 10.9745C22.2676 12.4349 21.2263 13.6359 19.8824 13.6359Z" />
    </svg>
  );
}

export default DiscordServerList;
