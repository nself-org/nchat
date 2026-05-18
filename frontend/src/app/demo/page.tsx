"use client";

// ===============================================================================
// Template Demo Page
// ===============================================================================
//
// Interactive demo page showcasing all available platform templates.
// Users can switch between templates and see live previews.
//
// ===============================================================================

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/templates/types";
import {
  TemplateSwitcher,
  TemplatePreview,
  TemplateGallery,
  DemoModeProvider,
  useDemoMode,
} from "@/components/demo";

// Import template layouts for live preview
import { SlackLayout } from "@/templates/slack";
import { DiscordLayout } from "@/templates/discord";
import { TelegramLayout } from "@/templates/telegram";
import { WhatsAppLayout } from "@/templates/whatsapp";

// -------------------------------------------------------------------------------
// Page Component
// -------------------------------------------------------------------------------

export default function DemoPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>("default");
  const [viewMode, setViewMode] = useState<"preview" | "gallery">("preview");
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  return (
    <DemoModeProvider defaultTemplate={selectedTemplate}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500">
                  <span className="text-lg font-bold text-white">N</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    nchat Templates
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    White-label chat platform
                  </p>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                      viewMode === "preview"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode("gallery")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                      viewMode === "gallery"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    Gallery
                  </button>
                </div>

                {/* GitHub Link */}
                <a
                  href="https://github.com/nself/nchat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {viewMode === "gallery" ? (
            <GalleryView
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
            />
          ) : (
            <PreviewView
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              deviceType={deviceType}
              onDeviceChange={setDeviceType}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 py-8 dark:border-gray-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Built with nself CLI - Your self-hosted backend infrastructure
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="/docs"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Documentation
                </a>
                <Link
                  href="/setup"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Get Started
                </Link>
                <a
                  href="https://nself.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  nself.org
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </DemoModeProvider>
  );
}

// -------------------------------------------------------------------------------
// Gallery View
// -------------------------------------------------------------------------------

function GalleryView({
  selectedTemplate,
  onTemplateSelect,
}: {
  selectedTemplate: TemplateId;
  onTemplateSelect: (template: TemplateId) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          Choose Your Template
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          nchat comes with 5 beautiful templates inspired by popular messaging
          platforms. Each template is fully customizable to match your brand.
        </p>
      </div>

      {/* Gallery */}
      <TemplateGallery
        selectedTemplate={selectedTemplate}
        onTemplateSelect={onTemplateSelect}
        layout="grid"
        showFeatures
      />

      {/* Call to Action */}
      <div className="pt-8 text-center">
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          <span>Start Building</span>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Preview View
// -------------------------------------------------------------------------------

function PreviewView({
  selectedTemplate,
  onTemplateChange,
  deviceType,
  onDeviceChange,
}: {
  selectedTemplate: TemplateId;
  onTemplateChange: (template: TemplateId) => void;
  deviceType: "desktop" | "tablet" | "mobile";
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
}) {
  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800 sm:flex-row">
        {/* Template Switcher */}
        <TemplateSwitcher
          currentTemplate={selectedTemplate}
          onTemplateChange={onTemplateChange}
          variant="tabs"
        />

        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
            Device:
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <button
                key={device}
                onClick={() => onDeviceChange(device)}
                className={cn(
                  "rounded-md p-2 transition-all",
                  deviceType === device
                    ? "bg-white shadow-sm dark:bg-gray-600"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                )}
                title={device.charAt(0).toUpperCase() + device.slice(1)}
              >
                {device === "desktop" && (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {device === "tablet" && (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {device === "mobile" && (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex justify-center py-8">
        <TemplatePreview
          templateId={selectedTemplate}
          deviceType={deviceType}
          showDeviceFrame
          scale={
            deviceType === "desktop" ? 0.6 : deviceType === "tablet" ? 0.5 : 0.8
          }
        >
          <TemplateContent template={selectedTemplate} />
        </TemplatePreview>
      </div>

      {/* Template Info */}
      <TemplateInfo template={selectedTemplate} />
    </div>
  );
}

// -------------------------------------------------------------------------------
// Template Content
// -------------------------------------------------------------------------------

function TemplateContent({ template }: { template: TemplateId }) {
  // Render the appropriate template layout based on selection
  switch (template) {
    case "slack":
      return (
        <SlackLayout>
          <DefaultContent />
        </SlackLayout>
      );
    case "discord":
      return (
        <DiscordLayout>
          <DefaultContent />
        </DiscordLayout>
      );
    case "telegram":
      return (
        <TelegramLayout>
          <DefaultContent />
        </TelegramLayout>
      );
    case "whatsapp":
      return (
        <WhatsAppLayout>
          <DefaultContent />
        </WhatsAppLayout>
      );
    default:
      return <DefaultTemplate />;
  }
}

function DefaultContent() {
  return <div className="p-4">Demo content</div>;
}

// -------------------------------------------------------------------------------
// Default Template (nself)
// -------------------------------------------------------------------------------

function DefaultTemplate() {
  return (
    <div className="flex h-full bg-gray-900">
      {/* Sidebar */}
      <div className="flex w-64 flex-col bg-gray-950">
        {/* Workspace Header */}
        <div className="flex h-14 items-center border-b border-gray-800 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
              <span className="text-sm font-bold text-white">N</span>
            </div>
            <span className="font-semibold text-white">nchat Demo</span>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold uppercase text-gray-500">
              Channels
            </div>
            {["general", "announcements", "random", "dev-team", "design"].map(
              (channel, i) => (
                <button
                  key={channel}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    i === 0
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white",
                  )}
                >
                  # {channel}
                </button>
              ),
            )}
          </div>

          <div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-gray-500">
              Direct Messages
            </div>
            {["Alice Chen", "Bob Smith", "Charlie Davis"].map((user, i) => (
              <button
                key={user}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500 text-xs font-medium text-white">
                  {user[0]}
                </div>
                {user}
              </button>
            ))}
          </div>
        </div>

        {/* User Panel */}
        <div className="flex h-14 items-center gap-2 border-t border-gray-800 bg-gray-900/50 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-sm font-medium text-white">
            Y
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">You</div>
            <div className="text-xs text-green-400">Online</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900/50 px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white"># general</span>
            <span className="text-sm text-gray-500">Team discussions</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {[
            {
              user: "Alice Chen",
              message: "Hey everyone! Check out the new feature branch.",
              time: "10:30 AM",
            },
            {
              user: "Bob Smith",
              message: "Looks great! I will review it after lunch.",
              time: "10:32 AM",
            },
            {
              user: "You",
              message: "Thanks! Let me know if you have any questions.",
              time: "10:35 AM",
            },
          ].map((msg, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500 text-sm font-medium text-white">
                {msg.user[0]}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-white">{msg.user}</span>
                  <span className="text-xs text-gray-500">{msg.time}</span>
                </div>
                <p className="text-gray-300">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3">
            <button className="text-gray-400 transition-colors hover:text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <input
              type="text"
              placeholder="Message #general"
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
            />
            <button className="text-gray-400 transition-colors hover:text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <button className="rounded-lg bg-cyan-500 p-2 text-white transition-colors hover:bg-cyan-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Template Info
// -------------------------------------------------------------------------------

function TemplateInfo({ template }: { template: TemplateId }) {
  const info: Record<
    TemplateId,
    { name: string; description: string; features: string[] }
  > = {
    default: {
      name: "nself Default",
      description:
        "A modern, protocol-inspired design with glowing cyan accents and dark mode optimization.",
      features: [
        "Clean minimal interface",
        "Flexible theming",
        "Best of all platforms",
        "Full customization",
      ],
    },
    slack: {
      name: "Slack Style",
      description:
        "Classic aubergine sidebar with familiar channel-based organization.",
      features: [
        "Thread-first design",
        "Workspace switching",
        "Huddle support",
        "Enterprise-ready",
      ],
    },
    discord: {
      name: "Discord Style",
      description:
        "Server-based organization with blurple accents and rich presence.",
      features: [
        "Server/guild hierarchy",
        "Voice channels",
        "Role colors",
        "Member list",
      ],
    },
    telegram: {
      name: "Telegram Style",
      description:
        "Clean blue theme with bubble-style messages and folder organization.",
      features: [
        "Chat bubbles",
        "Read receipts",
        "Voice messages",
        "Folder tabs",
      ],
    },
    whatsapp: {
      name: "WhatsApp Style",
      description:
        "Familiar green theme with status stories and simple interface.",
      features: [
        "Status/Stories",
        "Voice/Video calls",
        "End-to-end encryption",
        "Chat bubbles",
      ],
    },
  };

  const current = info[template];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            {current.name}
          </h3>
          <p className="max-w-xl text-gray-600 dark:text-gray-400">
            {current.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current.features.map((feature, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
