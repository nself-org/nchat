/**
 * Centralized Dynamic Imports for Performance Optimization
 *
 * This file provides pre-configured dynamic imports for heavy components
 * to improve bundle splitting and reduce initial load time.
 */

import dynamic from "next/dynamic";
import React, { ComponentType, ReactNode } from "react";

// Loading components
import { ChartSkeleton } from "@/components/ui/loading-skeletons";

// =============================================================================
// Admin Components (Heavy - Recharts, Complex Tables)
// =============================================================================

/**
 * Activity Chart - Uses recharts library (~100KB)
 * Only load when admin dashboard is accessed
 */
export const DynamicActivityChart = dynamic(
  () =>
    import("@/components/admin/activity-chart").then((mod) => ({
      default: mod.ActivityChart,
    })),
  {
    loading: () => React.createElement(ChartSkeleton),
    ssr: false, // Charts often rely on window measurements
  },
);

/**
 * Analytics Dashboard Components
 */
export const DynamicAnalyticsDashboard = dynamic(
  () => import("@/app/admin/analytics/page"),
  {
    ssr: false,
  },
);

// =============================================================================
// Chat Components (Large - Message rendering, Editor)
// =============================================================================

/**
 * Thread Panel - Complex message threading UI
 */
export const DynamicThreadPanel = dynamic(
  () =>
    import("@/components/thread/thread-panel").then((mod) => ({
      default: mod.ThreadPanel,
    })),
  {
    ssr: true, // Can SSR for better initial paint
  },
);

/**
 * Member List - User presence and list rendering
 */
export const DynamicMemberList = dynamic(
  () =>
    import("@/components/layout/member-list").then((mod) => ({
      default: mod.MemberList,
    })),
  {
    ssr: true,
  },
);

/**
 * Pinned Messages - Secondary panel
 */
export const DynamicPinnedMessages = dynamic(
  () =>
    import("@/components/layout/pinned-messages").then((mod) => ({
      default: mod.PinnedMessages,
    })),
  {
    ssr: true,
  },
);

// =============================================================================
// Rich Text Editor (Heavy - TipTap)
// =============================================================================

/**
 * TipTap Editor - ~50KB with extensions
 * Load on-demand when user focuses input
 */
export const DynamicRichTextEditor = dynamic(
  () =>
    import("@/components/editor/rich-text-editor").then((mod) => ({
      default: mod.RichTextEditor,
    })),
  {
    ssr: false, // Editor requires browser APIs
  },
);

// =============================================================================
// File Upload Components
// =============================================================================

/**
 * File Uploader - Dropzone + preview
 */
export const DynamicFileUploader = dynamic(
  () => import("@/components/upload/file-uploader"),
  {
    ssr: false,
  },
);

// =============================================================================
// Emoji Picker
// =============================================================================

/**
 * Emoji Picker - Large data set
 */
export const DynamicEmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

// =============================================================================
// Meeting/Call Components (Very Heavy - WebRTC, MediaSoup)
// =============================================================================

/**
 * Video Call Interface - WebRTC stack
 */
export const DynamicVideoCall = dynamic(
  () => import("@/components/calls/video-call"),
  {
    ssr: false, // Requires browser APIs
  },
);

/**
 * Audio Call Interface
 */
export const DynamicAudioCall = dynamic(
  () => import("@/components/calls/audio-call"),
  {
    ssr: false,
  },
);

// =============================================================================
// Settings Pages (Medium - Forms, Validation)
// =============================================================================

/**
 * Settings sections - Load on navigation
 */
export const DynamicSettingsAccount = dynamic(
  () => import("@/app/settings/account/page"),
  {
    ssr: true,
  },
);

export const DynamicSettingsAppearance = dynamic(
  () => import("@/app/settings/appearance/page"),
  {
    ssr: true,
  },
);

export const DynamicSettingsSecurity = dynamic(
  () => import("@/app/settings/security/page"),
  {
    ssr: true,
  },
);

// =============================================================================
// Modals (Load on-demand)
// =============================================================================

/**
 * Create Channel Modal
 */
export const DynamicCreateChannelModal = dynamic(
  () =>
    import("@/components/modals/create-channel-modal").then((mod) => ({
      default: mod.CreateChannelModal,
    })),
  {
    ssr: false,
  },
);

/**
 * User Profile Modal
 */
export const DynamicUserProfileModal = dynamic(
  () =>
    import("@/components/modals/user-profile-modal").then((mod) => ({
      default: mod.UserProfileModal,
    })),
  {
    ssr: false,
  },
);

// =============================================================================
// API Documentation (Swagger UI - Very Heavy)
// =============================================================================

/**
 * Swagger UI - ~200KB
 */
export const DynamicSwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
});

// =============================================================================
// Helper: Create Dynamic Component with Custom Config
// =============================================================================

export interface DynamicComponentConfig {
  /** Custom loading component */
  loading?: ComponentType;
  /** Enable SSR (default: true) */
  ssr?: boolean;
  /** Delay before showing loading (ms) */
  suspense?: boolean;
}

/**
 * Factory for creating dynamic imports with custom config
 */
export function createDynamicComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config: DynamicComponentConfig = {},
): T {
  return dynamic(importFn, {
    loading: config.loading
      ? () => React.createElement(config.loading!)
      : undefined,
    ssr: config.ssr ?? true,
  }) as unknown as T;
}

// =============================================================================
// Preload Functions (for critical routes)
// =============================================================================

/**
 * Preload critical components on app load
 * Call this from layout or app initialization
 */
export function preloadCriticalComponents() {
  // Preload components likely to be used soon
  if (typeof window !== "undefined") {
    // Preload chat components after initial render
    setTimeout(() => {
      // @ts-ignore - Dynamic import for preloading
      import("@/components/thread/thread-panel");
      import("@/components/layout/member-list");
    }, 2000);
  }
}

/**
 * Preload admin components when admin navigates
 */
export function preloadAdminComponents() {
  if (typeof window !== "undefined") {
    // @ts-ignore - Dynamic import for preloading
    import("@/components/admin/activity-chart");
    import("recharts");
  }
}

/**
 * Preload editor when user hovers over input
 */
export function preloadEditor() {
  if (typeof window !== "undefined") {
    // @ts-ignore - Dynamic import for preloading
    import("@/components/editor/rich-text-editor");
    import("@tiptap/react");
  }
}
