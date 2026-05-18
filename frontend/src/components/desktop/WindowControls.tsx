"use client";

import React, { useCallback } from "react";
import { minimizeWindow, maximizeWindow, closeWindow } from "@/lib/tauri";
import { useTauri } from "@/hooks/useTauri";

export interface WindowControlsProps {
  className?: string;
  variant?: "default" | "dark" | "light";
}

/**
 * Window controls (minimize, maximize, close) for Windows and Linux.
 * macOS uses the native traffic light buttons.
 */
export function WindowControls({
  className = "",
  variant = "default",
}: WindowControlsProps) {
  const { isTauri, isMacOS, isWindows } = useTauri();

  // Define hooks before any early returns (Rules of Hooks)
  const handleMinimize = useCallback(async () => {
    await minimizeWindow();
  }, []);

  const handleMaximize = useCallback(async () => {
    await maximizeWindow();
  }, []);

  const handleClose = useCallback(async () => {
    await closeWindow();
  }, []);

  // Don't render on macOS or web
  if (!isTauri || isMacOS) {
    return null;
  }

  // Determine colors based on variant
  const colors = {
    default: {
      bg: "transparent",
      hover: "rgba(0, 0, 0, 0.1)",
      closeHover: "#e81123",
      icon: "currentColor",
      closeIcon: "#fff",
    },
    dark: {
      bg: "transparent",
      hover: "rgba(255, 255, 255, 0.1)",
      closeHover: "#e81123",
      icon: "#fff",
      closeIcon: "#fff",
    },
    light: {
      bg: "transparent",
      hover: "rgba(0, 0, 0, 0.1)",
      closeHover: "#e81123",
      icon: "#000",
      closeIcon: "#fff",
    },
  }[variant];

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isWindows ? "46px" : "40px",
    height: "100%",
    border: "none",
    background: colors.bg,
    cursor: "pointer",
    outline: "none",
    transition: "background-color 0.1s ease",
    // @ts-expect-error WebkitAppRegion is a non-standard CSS property for Electron
    WebkitAppRegion: "no-drag",
  };

  return (
    <div
      className={`window-controls ${className}`}
      style={{
        display: "flex",
        alignItems: "stretch",
        height: "100%",
      }}
    >
      {/* Minimize */}
      <button
        type="button"
        onClick={handleMinimize}
        style={buttonStyle}
        className="window-control-btn window-control-minimize"
        aria-label="Minimize"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.bg;
        }}
      >
        <svg
          width="10"
          height="1"
          viewBox="0 0 10 1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 0H10V1H0V0Z" fill={colors.icon} />
        </svg>
      </button>

      {/* Maximize/Restore */}
      <button
        type="button"
        onClick={handleMaximize}
        style={buttonStyle}
        className="window-control-btn window-control-maximize"
        aria-label="Maximize"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.bg;
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0V10H10V0H0ZM1 1H9V9H1V1Z"
            fill={colors.icon}
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        style={{
          ...buttonStyle,
          backgroundColor: colors.bg,
        }}
        className="window-control-btn window-control-close"
        aria-label="Close"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.closeHover;
          const svg = e.currentTarget.querySelector("svg path");
          if (svg) {
            svg.setAttribute("fill", colors.closeIcon);
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.bg;
          const svg = e.currentTarget.querySelector("svg path");
          if (svg) {
            svg.setAttribute("fill", colors.icon);
          }
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.707107 0L5 4.29289L9.29289 0L10 0.707107L5.70711 5L10 9.29289L9.29289 10L5 5.70711L0.707107 10L0 9.29289L4.29289 5L0 0.707107L0.707107 0Z"
            fill={colors.icon}
          />
        </svg>
      </button>
    </div>
  );
}

export default WindowControls;
