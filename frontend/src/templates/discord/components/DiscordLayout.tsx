"use client";

// ===============================================================================
// Discord Layout Component
// ===============================================================================
//
// The main layout wrapper for the Discord template. Provides the classic
// Discord 4-panel layout with server list, channel sidebar, main content,
// and optional member list.
//
// ===============================================================================

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { discordColors, discordLayout } from "../config";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DiscordLayoutProps {
  children: ReactNode;
  serverList?: ReactNode;
  channelSidebar?: ReactNode;
  memberList?: ReactNode;
  header?: ReactNode;
  showMemberList?: boolean;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DiscordLayout({
  children,
  serverList,
  channelSidebar,
  memberList,
  header,
  showMemberList = true,
  className,
}: DiscordLayoutProps) {
  return (
    <div
      className={cn(
        "discord-template flex h-screen w-screen overflow-hidden",
        className,
      )}
      style={{
        fontFamily:
          '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
        backgroundColor: discordColors.gray700,
      }}
    >
      {/* Server List (Guild Bar) */}
      {serverList && (
        <aside
          className="flex flex-shrink-0 flex-col overflow-y-auto"
          style={{
            width: discordLayout.serverListWidth,
            backgroundColor: discordColors.gray850,
          }}
        >
          {serverList}
        </aside>
      )}

      {/* Channel Sidebar */}
      {channelSidebar && (
        <aside
          className="flex flex-shrink-0 flex-col"
          style={{
            width: discordLayout.channelListWidth,
            backgroundColor: discordColors.gray750,
          }}
        >
          {channelSidebar}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        {header && (
          <header
            className="flex-shrink-0 shadow-sm"
            style={{
              height: discordLayout.headerHeight,
              backgroundColor: discordColors.gray700,
            }}
          >
            {header}
          </header>
        )}

        {/* Content + Member List */}
        <div className="flex min-h-0 flex-1">
          {/* Main Chat Area */}
          <main
            className="flex min-w-0 flex-1 flex-col"
            style={{ backgroundColor: discordColors.gray700 }}
          >
            {children}
          </main>

          {/* Member List */}
          {memberList && showMemberList && (
            <aside
              className="flex-shrink-0 overflow-y-auto"
              style={{
                width: discordLayout.memberListWidth,
                backgroundColor: discordColors.gray750,
              }}
            >
              {memberList}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscordLayout;
