"use client";

// ===============================================================================
// WhatsApp Layout Component
// ===============================================================================
//
// The main layout wrapper for the WhatsApp template with chat list sidebar
// and chat view area.
//
// ===============================================================================

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WHATSAPP_COLORS } from "../config";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface WhatsAppLayoutProps {
  children: ReactNode;
  chatList?: ReactNode;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function WhatsAppLayout({
  children,
  chatList,
  className,
}: WhatsAppLayoutProps) {
  return (
    <div
      className={cn(
        "whatsapp-template flex h-screen w-screen overflow-hidden",
        "bg-[#111B21]",
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
          className="flex flex-shrink-0 flex-col border-r"
          style={{
            width: 360,
            backgroundColor: WHATSAPP_COLORS.chatBgDark,
            borderColor: WHATSAPP_COLORS.borderDark,
          }}
        >
          {chatList}
        </aside>
      )}

      {/* Main Chat View */}
      <main
        className="flex min-w-0 flex-1 flex-col"
        style={{ backgroundColor: WHATSAPP_COLORS.chatBgDark }}
      >
        {children}
      </main>
    </div>
  );
}

export default WhatsAppLayout;
