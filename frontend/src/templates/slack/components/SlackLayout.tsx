"use client";

// ===============================================================================
// Slack Layout Component
// ===============================================================================
//
// The main layout wrapper for the Slack template. Provides the classic
// Slack 3-column layout with workspace sidebar, channel sidebar, and main content.
//
// ===============================================================================

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { slackColors, slackComponentStyles } from "../config";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  threadPanel?: ReactNode;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function SlackLayout({
  children,
  sidebar,
  header,
  threadPanel,
  className,
}: SlackLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  return (
    <div
      className={cn(
        "slack-template flex h-screen w-screen overflow-hidden",
        "bg-white dark:bg-[#1A1D21]",
        className,
      )}
      style={{
        fontFamily:
          '"Slack-Lato", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      {/* Sidebar */}
      {sidebar && (
        <aside
          className={cn(
            "flex flex-shrink-0 flex-col transition-all duration-200",
            isSidebarCollapsed
              ? "w-[72px]"
              : `w-[${slackComponentStyles.sidebar.width}px]`,
          )}
          style={{
            width: isSidebarCollapsed
              ? slackComponentStyles.sidebar.collapsedWidth
              : slackComponentStyles.sidebar.width,
            backgroundColor: slackColors.aubergine,
          }}
        >
          {sidebar}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        {header && (
          <header
            className="flex-shrink-0 border-b border-[#DDDDDD] dark:border-[#35383C]"
            style={{ height: slackComponentStyles.header.height }}
          >
            {header}
          </header>
        )}

        {/* Content + Thread Panel */}
        <div className="flex min-h-0 flex-1">
          {/* Main Chat Area */}
          <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#1A1D21]">
            {children}
          </main>

          {/* Thread Panel */}
          {threadPanel && isThreadOpen && (
            <aside
              className={cn(
                "flex-shrink-0 border-l border-[#DDDDDD] dark:border-[#35383C]",
                "bg-white dark:bg-[#222529]",
              )}
              style={{ width: slackComponentStyles.thread.width }}
            >
              {threadPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export default SlackLayout;
