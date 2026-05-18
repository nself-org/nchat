/**
 * Lazy-loaded components for code splitting and performance optimization
 *
 * This file centralizes all lazy-loaded components to ensure:
 * - Smaller initial bundle size
 * - Faster time to interactive
 * - Better performance on mobile devices
 * - Optimized loading with preloading hints
 *
 * Target: Main bundle < 200KB gzipped
 */

import { lazy, ComponentType } from "react";

// ============================================================================
// Type Helpers
// ============================================================================

export type LazyComponent<T extends ComponentType<any>> = {
  Component: ReturnType<typeof lazy<T>>;
  preload: () => Promise<{ default: T }>;
};

/**
 * Creates a lazy component with preload capability
 * Handles both default exports and named exports
 */
function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
): LazyComponent<T> {
  const normalizedImport = () =>
    importFn().then((module) => {
      // Handle both default and named exports
      if ("default" in module) {
        return module as { default: T };
      }
      // If no default export, use the first exported component
      return { default: module as T };
    });

  return {
    Component: lazy(normalizedImport),
    preload: normalizedImport,
  };
}

/**
 * Creates a lazy component from a named export
 * Use this when the component uses named exports instead of default
 */
function createLazyNamedComponent<T extends ComponentType<any>>(
  importFn: () => Promise<Record<string, any>>,
  exportName: string,
): LazyComponent<T> {
  const normalizedImport = () =>
    importFn().then((module) => ({
      default: module[exportName] as T,
    }));

  return {
    Component: lazy(normalizedImport),
    preload: normalizedImport,
  };
}

// ============================================================================
// Chat Components (Heavy - Load on Demand)
// ============================================================================

export const LazyMessageList = createLazyNamedComponent(
  () => import("@/components/chat/message-list"),
  "MessageList",
);

export const LazyMessageInput = createLazyNamedComponent(
  () => import("@/components/chat/message-input"),
  "MessageInput",
);

export const LazyThreadPanel = createLazyNamedComponent(
  () => import("@/components/chat/chat-with-threads"),
  "ChatWithThreads",
);

export const LazyGifPicker = createLazyNamedComponent(
  () => import("@/components/chat/GifPicker"),
  "GifPicker",
);

export const LazyStickerPicker = createLazyNamedComponent(
  () => import("@/components/chat/StickerPicker"),
  "StickerPicker",
);

export const LazyPollCreator = createLazyNamedComponent(
  () => import("@/components/chat/poll-creator"),
  "PollCreator",
);

export const LazyMessageForwardModal = createLazyNamedComponent(
  () => import("@/components/chat/message-forward-modal"),
  "MessageForwardModal",
);

export const LazyScheduledMessageModal = createLazyNamedComponent(
  () => import("@/components/chat/scheduled-message-modal"),
  "ScheduledMessageModal",
);

// ============================================================================
// Mobile Components
// ============================================================================

export const LazyVirtualMessageList = createLazyComponent(
  () => import("@/components/mobile/VirtualMessageList"),
);

export const LazyPinchZoom = createLazyNamedComponent(
  () => import("@/components/mobile/PinchZoom"),
  "PinchZoom",
);

export const LazyLongPressMenu = createLazyNamedComponent(
  () => import("@/components/mobile/LongPressMenu"),
  "LongPressMenu",
);

export const LazyPullToRefresh = createLazyNamedComponent(
  () => import("@/components/mobile/PullToRefresh"),
  "PullToRefresh",
);

// ============================================================================
// Admin Components (Load Only When Needed)
// ============================================================================

export const LazyAdminDashboard = createLazyNamedComponent(
  () => import("@/components/admin/dashboard"),
  "Dashboard",
);

export const LazyUserManagement = createLazyNamedComponent(
  () => import("@/components/admin/user-management"),
  "UserManagement",
);

export const LazyBotManagement = createLazyNamedComponent(
  () => import("@/components/admin/bots/bot-management"),
  "BotManagement",
);

export const LazyModerationQueue = createLazyNamedComponent(
  () => import("@/components/admin/moderation/moderation-queue"),
  "ModerationQueue",
);

export const LazyAnalyticsDashboard = createLazyNamedComponent(
  () => import("@/components/admin/analytics-dashboard"),
  "AnalyticsDashboard",
);

export const LazyEmbeddingMonitor = createLazyNamedComponent(
  () => import("@/components/admin/embeddings/embedding-monitor"),
  "EmbeddingMonitor",
);

// ============================================================================
// Media Components (Heavy Dependencies)
// ============================================================================

export const LazyVideoPlayer = createLazyNamedComponent(
  () => import("@/components/media/video-player"),
  "VideoPlayer",
);

export const LazyAudioPlayer = createLazyNamedComponent(
  () => import("@/components/media/audio-player"),
  "AudioPlayer",
);

export const LazyMediaGallery = createLazyNamedComponent(
  () => import("@/components/media/media-gallery"),
  "MediaGallery",
);

export const LazyImageEditor = createLazyNamedComponent(
  () => import("@/components/media/ImageEditor"),
  "ImageEditor",
);

// ============================================================================
// Call Components (WebRTC - Very Heavy)
// ============================================================================

export const LazyVoiceCall = createLazyNamedComponent(
  () => import("@/components/calls/voice-call"),
  "VoiceCall",
);

export const LazyVideoCall = createLazyNamedComponent(
  () => import("@/components/calls/video-call"),
  "VideoCall",
);

export const LazyScreenShare = createLazyNamedComponent(
  () => import("@/components/calls/screen-share"),
  "ScreenShare",
);

export const LazyLiveStream = createLazyNamedComponent(
  () => import("@/components/calls/live-stream"),
  "LiveStream",
);

// ============================================================================
// Search Components
// ============================================================================

export const LazyAdvancedSearch = createLazyNamedComponent(
  () => import("@/components/search/AdvancedSearchBuilder"),
  "AdvancedSearchBuilder",
);

export const LazySearchResults = createLazyNamedComponent(
  () => import("@/components/search/SearchResultCard"),
  "SearchResultCard",
);

export const LazySearchHistory = createLazyNamedComponent(
  () => import("@/components/search/SearchHistory"),
  "SearchHistory",
);

// ============================================================================
// Settings Components
// ============================================================================

export const LazyUserSettings = createLazyNamedComponent(
  () => import("@/components/settings/user-settings"),
  "UserSettings",
);

export const LazyPrivacySettings = createLazyNamedComponent(
  () => import("@/components/settings/privacy-settings"),
  "PrivacySettings",
);

export const LazyNotificationSettings = createLazyNamedComponent(
  () => import("@/components/settings/notification-settings"),
  "NotificationSettings",
);

export const LazySecuritySettings = createLazyNamedComponent(
  () => import("@/components/settings/security/security-settings"),
  "SecuritySettings",
);

// ============================================================================
// Modals and Dialogs
// ============================================================================

export const LazyImageModal = createLazyNamedComponent(
  () => import("@/components/modals/image-modal"),
  "ImageModal",
);

export const LazyVideoModal = createLazyNamedComponent(
  () => import("@/components/modals/video-modal"),
  "VideoModal",
);

export const LazyProfileModal = createLazyNamedComponent(
  () => import("@/components/modals/profile-modal"),
  "ProfileModal",
);

export const LazyChannelSettingsModal = createLazyNamedComponent(
  () => import("@/components/modals/channel-settings-modal"),
  "ChannelSettingsModal",
);

// ============================================================================
// Preloading Utilities
// ============================================================================

/**
 * Preload components that are likely to be needed soon
 * Call this during idle time or on route transitions
 */
export function preloadChatComponents() {
  LazyMessageList.preload();
  LazyMessageInput.preload();
}

export function preloadMobileComponents() {
  LazyVirtualMessageList.preload();
  LazyPullToRefresh.preload();
}

export function preloadAdminComponents() {
  LazyAdminDashboard.preload();
  LazyUserManagement.preload();
}

export function preloadMediaComponents() {
  LazyVideoPlayer.preload();
  LazyAudioPlayer.preload();
  LazyMediaGallery.preload();
}

export function preloadCallComponents() {
  LazyVoiceCall.preload();
  LazyVideoCall.preload();
}

/**
 * Preload all components (use sparingly, e.g., on high-speed connections)
 */
export function preloadAllComponents() {
  // Prioritize by importance
  preloadChatComponents();
  preloadMobileComponents();

  // Delay less critical components
  setTimeout(() => {
    preloadMediaComponents();
    preloadAdminComponents();
  }, 2000);

  // Further delay heavy components
  setTimeout(() => {
    preloadCallComponents();
  }, 5000);
}

// ============================================================================
// Route-Based Preloading
// ============================================================================

export const routePreloadMap = {
  "/chat": preloadChatComponents,
  "/admin": preloadAdminComponents,
  "/settings": () => {
    LazyUserSettings.preload();
    LazyNotificationSettings.preload();
  },
  "/calls": preloadCallComponents,
} as const;

/**
 * Preload components for a specific route
 */
export function preloadForRoute(route: keyof typeof routePreloadMap) {
  const preloadFn = routePreloadMap[route];
  if (preloadFn) {
    preloadFn();
  }
}

// ============================================================================
// Intersection Observer Preloading
// ============================================================================

/**
 * Preload a component when an element comes into view
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = preloadOnIntersection(buttonRef.current, LazyModal.preload)
 *   return cleanup
 * }, [])
 * ```
 */
export function preloadOnIntersection(
  element: Element | null,
  preloadFn: () => Promise<any>,
  options?: IntersectionObserverInit,
): () => void {
  if (!element || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  let hasPreloaded = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasPreloaded) {
          hasPreloaded = true;
          preloadFn();
          observer.disconnect();
        }
      });
    },
    {
      rootMargin: "50px",
      ...options,
    },
  );

  observer.observe(element);

  return () => observer.disconnect();
}

// ============================================================================
// Network-Aware Preloading
// ============================================================================

/**
 * Check if we should preload based on network conditions
 */
export function shouldPreload(): boolean {
  // Check if Network Information API is available
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;

    // Don't preload on slow connections
    if (
      connection.saveData ||
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"
    ) {
      return false;
    }
  }

  // Check if device has low memory
  if ("deviceMemory" in navigator) {
    const memory = (navigator as any).deviceMemory;
    if (memory < 4) {
      // Less than 4GB RAM - be conservative
      return false;
    }
  }

  return true;
}

/**
 * Smart preload that considers network and device capabilities
 */
export function smartPreload(preloadFn: () => Promise<any>) {
  if (shouldPreload()) {
    // Use requestIdleCallback if available
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => preloadFn());
    } else {
      // Fallback to setTimeout
      setTimeout(preloadFn, 1000);
    }
  }
}

// ============================================================================
// Bundle Size Tracking
// ============================================================================

/**
 * Log bundle sizes in development
 */
export function trackBundleSize() {
  if (process.env.NODE_ENV === "development") {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "resource" && entry.name.includes(".js")) {
          // REMOVED: console.log(
          //   `[Bundle] ${entry.name}: ${((entry as any).transferSize / 1024).toFixed(2)} KB`
          // )
        }
      }
    });

    observer.observe({ entryTypes: ["resource"] });
  }
}
