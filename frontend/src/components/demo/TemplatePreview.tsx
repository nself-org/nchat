"use client";

// ===============================================================================
// Template Preview Component
// ===============================================================================
//
// A visual preview of a template showing its layout and styling
// in a device-like frame.
//
// ===============================================================================

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/templates/types";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TemplatePreviewProps {
  templateId: TemplateId;
  children?: ReactNode;
  deviceType?: "desktop" | "tablet" | "mobile";
  showDeviceFrame?: boolean;
  scale?: number;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TemplatePreview({
  templateId,
  children,
  deviceType = "desktop",
  showDeviceFrame = true,
  scale = 1,
  className,
}: TemplatePreviewProps) {
  const dimensions = {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
  };

  const { width, height } = dimensions[deviceType];

  return (
    <div className={cn("relative", className)}>
      {showDeviceFrame ? (
        <DeviceFrame type={deviceType}>
          <div
            className="origin-top-left"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </DeviceFrame>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-lg shadow-2xl",
            "border border-gray-200 dark:border-gray-700",
          )}
          style={{
            width: width * scale,
            height: height * scale,
          }}
        >
          <div
            className="origin-top-left"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      )}

      {/* Template Badge */}
      <div
        className={cn(
          "absolute -bottom-3 left-1/2 -translate-x-1/2",
          "rounded-full px-3 py-1 text-sm font-medium",
          "bg-gray-900 text-white shadow-lg",
        )}
      >
        {getTemplateName(templateId)}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Device Frame
// -------------------------------------------------------------------------------

function DeviceFrame({
  type,
  children,
}: {
  type: "desktop" | "tablet" | "mobile";
  children: ReactNode;
}) {
  if (type === "mobile") {
    return (
      <div className="relative">
        {/* Phone frame */}
        <div
          className={cn(
            "relative rounded-[40px] p-2",
            "bg-gray-900 shadow-2xl",
          )}
        >
          {/* Dynamic Island / Notch */}
          <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* Screen */}
          <div className="overflow-hidden rounded-[32px] bg-black">
            {children}
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30" />
        </div>
      </div>
    );
  }

  if (type === "tablet") {
    return (
      <div className="relative">
        {/* Tablet frame */}
        <div
          className={cn(
            "relative rounded-[20px] p-3",
            "bg-gray-800 shadow-2xl",
          )}
        >
          {/* Camera */}
          <div className="absolute left-1/2 top-4 h-3 w-3 -translate-x-1/2 rounded-full bg-gray-900" />

          {/* Screen */}
          <div className="overflow-hidden rounded-lg bg-black">{children}</div>

          {/* Home button */}
          <div className="absolute bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-gray-600" />
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="relative">
      {/* Monitor frame */}
      <div className="overflow-hidden rounded-lg shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          {/* URL bar */}
          <div className="mx-4 flex-1">
            <div className="flex h-6 items-center justify-center rounded-md bg-gray-700">
              <span className="text-xs text-gray-400">localhost:3000</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-black">{children}</div>
      </div>

      {/* Monitor stand */}
      <div className="flex justify-center">
        <div className="h-4 w-24 rounded-b-lg bg-gray-700" />
      </div>
      <div className="flex justify-center">
        <div className="h-2 w-40 rounded-b-lg bg-gray-600" />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------

function getTemplateName(templateId: TemplateId): string {
  const names: Record<TemplateId, string> = {
    default: "nself",
    slack: "Slack",
    discord: "Discord",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
  };
  return names[templateId] || templateId;
}

export default TemplatePreview;
