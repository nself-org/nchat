"use client";

// ===============================================================================
// Demo Mode Component
// ===============================================================================
//
// A wrapper component that enables demo mode with sample data,
// template switching, and interactive preview.
//
// ===============================================================================

import { useState, createContext, useContext, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/templates/types";
import { templateRegistry } from "@/templates";
import {
  demoUsers,
  demoChannels,
  demoMessages,
  getDemoUser,
  getChannelMessages,
} from "@/lib/demo/sample-data";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DemoModeProps {
  children: ReactNode;
  defaultTemplate?: TemplateId;
  showControls?: boolean;
  className?: string;
}

export interface DemoContextValue {
  // Template
  currentTemplate: TemplateId;
  setTemplate: (template: TemplateId) => void;
  templateConfig: (typeof templateRegistry)["default"] | null;

  // Demo Data
  users: typeof demoUsers;
  channels: typeof demoChannels;
  messages: typeof demoMessages;

  // Current State
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  currentUserId: string;

  // Helpers
  getUser: typeof getDemoUser;
  getMessages: typeof getChannelMessages;

  // Mode
  isDemoMode: boolean;
}

// -------------------------------------------------------------------------------
// Context
// -------------------------------------------------------------------------------

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}

export function useDemoModeOptional() {
  return useContext(DemoContext);
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DemoMode({
  children,
  defaultTemplate = "default",
  showControls = false,
  className,
}: DemoModeProps) {
  const [currentTemplate, setCurrentTemplate] =
    useState<TemplateId>(defaultTemplate);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    "channel-1",
  );
  const currentUserId = "user-7"; // Demo user

  const templateConfig = templateRegistry[currentTemplate] ?? null;

  const contextValue: DemoContextValue = {
    currentTemplate,
    setTemplate: setCurrentTemplate,
    templateConfig,
    users: demoUsers,
    channels: demoChannels,
    messages: demoMessages,
    activeChannelId,
    setActiveChannelId,
    currentUserId,
    getUser: getDemoUser,
    getMessages: getChannelMessages,
    isDemoMode: true,
  };

  return (
    <DemoContext.Provider value={contextValue}>
      <div className={cn("demo-mode", className)}>
        {showControls && <DemoControls />}
        {children}
      </div>
    </DemoContext.Provider>
  );
}

// -------------------------------------------------------------------------------
// Demo Controls
// -------------------------------------------------------------------------------

function DemoControls() {
  const {
    currentTemplate,
    setTemplate,
    activeChannelId,
    setActiveChannelId,
    channels,
  } = useDemoMode();

  const templateOptions: { id: TemplateId; name: string; color: string }[] = [
    { id: "default", name: "nself", color: "#00D4FF" },
    { id: "slack", name: "Slack", color: "#4A154B" },
    { id: "discord", name: "Discord", color: "#5865F2" },
    { id: "telegram", name: "Telegram", color: "#2AABEE" },
    { id: "whatsapp", name: "WhatsApp", color: "#25D366" },
  ];

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-50 rounded-xl p-4",
        "bg-white/90 backdrop-blur-sm dark:bg-gray-900/90",
        "border border-gray-200 shadow-lg dark:border-gray-700",
      )}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Demo Controls
      </div>

      {/* Template Selector */}
      <div className="mb-3">
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Template
        </span>
        <div className="flex gap-1">
          {templateOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setTemplate(option.id)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white transition-transform",
                currentTemplate === option.id &&
                  "scale-110 ring-2 ring-gray-400 ring-offset-2",
              )}
              style={{ backgroundColor: option.color }}
              title={option.name}
            >
              {option.name[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Selector */}
      <div>
        <label
          htmlFor="demo-channel-select"
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Channel
        </label>
        <select
          id="demo-channel-select"
          value={activeChannelId || ""}
          onChange={(e) => setActiveChannelId(e.target.value || null)}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </select>
      </div>

      {/* Demo Mode Badge */}
      <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Demo Mode Active
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Demo Mode Provider for external use
// -------------------------------------------------------------------------------

export function DemoModeProvider({
  children,
  defaultTemplate = "default",
}: {
  children: ReactNode;
  defaultTemplate?: TemplateId;
}) {
  return (
    <DemoMode defaultTemplate={defaultTemplate} showControls={false}>
      {children}
    </DemoMode>
  );
}

export default DemoMode;
