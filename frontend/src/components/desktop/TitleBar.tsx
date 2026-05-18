"use client";

import React from "react";
import { useTauri } from "@/hooks/useTauri";
import WindowControls from "./WindowControls";

export interface TitleBarProps {
  title?: string;
  showTitle?: boolean;
  showControls?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Custom title bar for the desktop application.
 * Supports draggable regions and custom styling.
 */
export function TitleBar({
  title = "nchat",
  showTitle = true,
  showControls = true,
  className = "",
  children,
}: TitleBarProps) {
  const { isTauri, isMacOS, isWindows, isLinux } = useTauri();

  // Only render custom title bar in Tauri
  if (!isTauri) {
    return null;
  }

  // macOS uses transparent titlebar with traffic lights
  // Windows/Linux use custom window controls
  const showCustomControls = showControls && !isMacOS;

  return (
    <div
      className={`title-bar ${className}`}
      data-tauri-drag-region
      style={{
        height: isMacOS ? "28px" : "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "var(--title-bar-bg, transparent)",
        borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.1))",
        // @ts-expect-error WebkitAppRegion is a non-standard CSS property for Electron
        WebkitAppRegion: "drag",
        userSelect: "none",
        paddingLeft: isMacOS ? "70px" : "12px", // Space for macOS traffic lights
        paddingRight: showCustomControls ? "0" : "12px",
      }}
    >
      {/* Left section - App title or custom content */}
      <div
        className="title-bar-left"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flex: 1,
        }}
      >
        {showTitle && (
          <span
            className="title-bar-title"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-color, inherit)",
              opacity: 0.9,
            }}
          >
            {title}
          </span>
        )}
        {children}
      </div>

      {/* Right section - Window controls (Windows/Linux only) */}
      {showCustomControls && (
        <div
          className="title-bar-right"
          style={{
            display: "flex",
            alignItems: "stretch",
            height: "100%",
            // @ts-expect-error WebkitAppRegion is a non-standard CSS property for Electron
            WebkitAppRegion: "no-drag",
          }}
        >
          <WindowControls />
        </div>
      )}
    </div>
  );
}

export default TitleBar;
