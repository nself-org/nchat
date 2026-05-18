"use client";

// ===============================================================================
// Telegram Layout Component
// ===============================================================================
//
// The main layout wrapper for the Telegram template with chat list sidebar
// and chat view area, plus optional info panel.
//
// ===============================================================================

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { TELEGRAM_COLORS } from "../config";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TelegramLayoutProps {
  children: ReactNode;
  chatList?: ReactNode;
  infoPanel?: ReactNode;
  showInfoPanel?: boolean;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TelegramLayout({
  children,
  chatList,
  infoPanel,
  showInfoPanel = false,
  className,
}: TelegramLayoutProps) {
  return (
    <div
      className={cn(
        "telegram-template flex h-screen w-screen overflow-hidden",
        "bg-white dark:bg-[#17212B]",
        className,
      )}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Chat List Sidebar */}
      {chatList && (
        <aside
          className="flex flex-shrink-0 flex-col border-r border-[#E7E7E7] dark:border-[#0E1621]"
          style={{ width: 360 }}
        >
          {chatList}
        </aside>
      )}

      {/* Main Chat View */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#EFEAE2] dark:bg-[#0E1621]">
        {children}
      </main>

      {/* Info Panel */}
      {infoPanel && showInfoPanel && (
        <aside
          className="flex-shrink-0 border-l border-[#E7E7E7] bg-white dark:border-[#0E1621] dark:bg-[#17212B]"
          style={{ width: 360 }}
        >
          {infoPanel}
        </aside>
      )}
    </div>
  );
}

export default TelegramLayout;
