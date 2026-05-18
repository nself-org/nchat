"use client";

/**
 * UserBadge Component
 *
 * Displays a single badge with appropriate styling, icon, and tooltip.
 */

import React from "react";
import { Badge as BadgeType, BadgeStyle } from "@/lib/badges/badge-types";

// Badge size variants
export type BadgeSize = "xs" | "sm" | "md" | "lg";

export interface UserBadgeProps {
  badge: BadgeType;
  size?: BadgeSize;
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
}

// Size configurations
const sizeConfig: Record<
  BadgeSize,
  { icon: string; text: string; padding: string; height: string }
> = {
  xs: {
    icon: "w-3 h-3",
    text: "text-[10px]",
    padding: "px-1 py-0.5",
    height: "h-4",
  },
  sm: {
    icon: "w-3.5 h-3.5",
    text: "text-xs",
    padding: "px-1.5 py-0.5",
    height: "h-5",
  },
  md: { icon: "w-4 h-4", text: "text-sm", padding: "px-2 py-1", height: "h-6" },
  lg: {
    icon: "w-5 h-5",
    text: "text-base",
    padding: "px-3 py-1.5",
    height: "h-8",
  },
};

// Icon components (simplified SVG icons)
const icons: Record<
  string,
  React.FC<{ className?: string; style?: React.CSSProperties }>
> = {
  crown: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
    </svg>
  ),
  gavel: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 18.5l3 3 4.5-4.5-3-3-4.5 4.5zM16.54 11.64L11 6.1l2.12-2.12 5.54 5.54-2.12 2.12zm-4.95 1.42l2.83 2.83-4.95 4.95-2.83-2.83 4.95-4.95z" />
    </svg>
  ),
  "check-circle": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
  "building-columns": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7v2h20V7L12 2zM4 11v6h3v-6H4zm6.5 0v6h3v-6h-3zM17 11v6h3v-6h-3zM2 19v2h20v-2H2z" />
    </svg>
  ),
  medal: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7l1.5 3 3.5.5-2.5 2.5.5 3.5L12 15l-3 1.5.5-3.5L7 10.5l3.5-.5L12 7zM12 2L9 9H2l6 4.5L5.5 22 12 18l6.5 4-2.5-8.5L22 9h-7L12 2z" />
    </svg>
  ),
  "military-dog-tags": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 2H7a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM8 6V4h2v2H8zm6 0V4h2v2h-2zm3 8H7a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2z" />
    </svg>
  ),
  ambulance: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-8H5V7h4v3zm5 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-8h-4V7h4v3zm4 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  ),
  stethoscope: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 8c-.55 0-1 .45-1 1v3c0 1.1-.9 2-2 2h-2v-2l-3 3 3 3v-2h2c2.21 0 4-1.79 4-4V9c0-.55-.45-1-1-1zM5 9c0 1.1.9 2 2 2h2V7H7c-1.1 0-2 .9-2 2zm4 4H7c-2.21 0-4-1.79-4-4s1.79-4 4-4h2a2 2 0 012 2v4a2 2 0 01-2 2z" />
    </svg>
  ),
  "graduation-cap": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
    </svg>
  ),
  "book-open": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
    </svg>
  ),
  rocket: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5c4.5 0 8.5 3.5 9.5 8.5-1 5-5 8.5-9.5 8.5S3.5 16 2.5 11c1-5 5-8.5 9.5-8.5zm0 2a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
    </svg>
  ),
  heart: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  star: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ),
  gem: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5L2 9l10 12L22 9l-3-6zM9.62 8L12 4.8 14.38 8H9.62zm-1.45 0H4.38l1.5-3h4.19l-1.9 3zm2.83 1l2 2.4-2 2.4-2-2.4 2-2.4zm6.62-1l-1.9-3h4.19l1.5 3h-3.79z" />
    </svg>
  ),
  "hand-holding-heart": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5.5c.83-1.19 2.21-2 3.75-2 2.49 0 4.5 2.01 4.5 4.5 0 3.5-4 6.5-8.25 10.5-4.25-4-8.25-7-8.25-10.5 0-2.49 2.01-4.5 4.5-4.5 1.54 0 2.92.81 3.75 2z" />
    </svg>
  ),
  robot: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A1.5 1.5 0 006 14.5 1.5 1.5 0 007.5 16 1.5 1.5 0 009 14.5 1.5 1.5 0 007.5 13m9 0a1.5 1.5 0 00-1.5 1.5 1.5 1.5 0 001.5 1.5 1.5 1.5 0 001.5-1.5 1.5 1.5 0 00-1.5-1.5z" />
    </svg>
  ),
  "badge-check": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </svg>
  ),
  code: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
    </svg>
  ),
  mail: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  ),
  wand: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7l2.5-1.4zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14l-2.5 1.4zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5L22 2zM14.37 7.29l-1.06-1.06c-.39-.39-1.02-.39-1.41 0L1.29 16.84c-.39.39-.39 1.02 0 1.41l1.06 1.06c.39.39 1.02.39 1.41 0L14.37 8.7c.39-.38.39-1.02 0-1.41z" />
    </svg>
  ),
  phone: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  ),
  // Default fallback
  default: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
};

// Get background style including gradient
function getBackgroundStyle(style: BadgeStyle): React.CSSProperties {
  if (style.gradient) {
    return {
      background: `linear-gradient(${style.gradient.direction || "135deg"}, ${style.gradient.from}, ${style.gradient.to})`,
    };
  }
  return {
    backgroundColor: style.backgroundColor,
  };
}

// Get animation class
function getAnimationClass(
  animation?: "pulse" | "glow" | "shimmer" | "none",
): string {
  switch (animation) {
    case "pulse":
      return "animate-pulse";
    case "glow":
      return "shadow-lg shadow-current/30";
    case "shimmer":
      return "bg-gradient-shimmer bg-[length:200%_100%] animate-shimmer";
    default:
      return "";
  }
}

export function UserBadge({
  badge,
  size = "sm",
  showLabel = false,
  showTooltip = true,
  className = "",
  onClick,
}: UserBadgeProps) {
  const config = sizeConfig[size];
  const Icon = icons[badge.icon] || icons.default;
  const animationClass = getAnimationClass(badge.style.animation);

  const badgeElement = (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.padding} ${config.height} ${config.text} ${animationClass} ${onClick ? "cursor-pointer transition-opacity hover:opacity-80" : ""} ${className} `}
      style={{
        ...getBackgroundStyle(badge.style),
        color: badge.style.textColor,
        borderWidth: badge.style.borderColor ? "1px" : 0,
        borderColor: badge.style.borderColor,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <Icon
        className={config.icon}
        style={{ color: badge.style.iconColor || badge.style.textColor }}
      />
      {showLabel && (
        <span className="max-w-[80px] truncate">
          {badge.shortName || badge.name}
        </span>
      )}
    </span>
  );

  if (showTooltip && (badge.tooltip || badge.description)) {
    return (
      <span className="group relative inline-block">
        {badgeElement}
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {badge.tooltip || badge.description}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      </span>
    );
  }

  return badgeElement;
}

export default UserBadge;
