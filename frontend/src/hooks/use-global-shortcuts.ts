"use client";

/**
 * Global Keyboard Shortcuts Hook
 *
 * Registers application-wide keyboard shortcuts for navigation, UI toggles,
 * and common actions. This hook should be used at the app root level.
 */

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShortcut, useKeyboard } from "@/lib/keyboard";
import { useUIStore } from "@/stores/ui-store";
import { useChannelStore, selectChannelList } from "@/stores/channel-store";
import { useUnreadCounts } from "@/hooks/use-unread-counts";

// ============================================================================
// Types
// ============================================================================

export interface UseGlobalShortcutsOptions {
  /** Callback when quick switcher should open */
  onQuickSwitcher?: () => void;
  /** Callback when search should open */
  onSearch?: () => void;
  /** Callback when new channel modal should open */
  onNewChannel?: () => void;
  /** Callback when new DM modal should open */
  onNewDM?: () => void;
  /** Callback when settings should open */
  onSettings?: () => void;
  /** Callback when shortcuts modal should open */
  onShowShortcuts?: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Register global application shortcuts
 *
 * @param options - Optional callbacks for various actions
 *
 * @example
 * ```tsx
 * function App() {
 *   useGlobalShortcuts({
 *     onQuickSwitcher: () => setQuickSwitcherOpen(true),
 *     onSearch: () => setSearchOpen(true),
 *   });
 *
 *   return <YourApp />;
 * }
 * ```
 */
export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}) {
  const router = useRouter();
  const { isInputFocused } = useKeyboard();

  // UI Store actions
  const {
    toggleSidebar,
    toggleThreadPanel,
    toggleMembersPanel,
    toggleQuickSwitcher,
    toggleSearch,
    toggleFullscreen,
    toggleCompactMode,
    toggleEmojiPicker,
    openModal,
    closeModal,
    closeAllOverlays,
    quickSwitcherOpen,
    searchOpen,
    activeModal,
  } = useUIStore();

  // Channel Store for navigation
  const activeChannelId = useChannelStore((state) => state.activeChannelId);
  const setActiveChannel = useChannelStore((state) => state.setActiveChannel);
  const channels = useChannelStore(selectChannelList);

  // Unread counts for unread navigation
  const { allChannelUnreads } = useUnreadCounts();

  // Get channels with unread messages
  const unreadChannels = useMemo(() => {
    return channels.filter(
      (channel) => allChannelUnreads[channel.id]?.hasUnread,
    );
  }, [channels, allChannelUnreads]);

  // ============================================================================
  // Navigation Shortcuts
  // ============================================================================

  // Quick Switcher (Cmd+K)
  const handleQuickSwitcher = useCallback(() => {
    if (options.onQuickSwitcher) {
      options.onQuickSwitcher();
    } else {
      toggleQuickSwitcher();
    }
  }, [options, toggleQuickSwitcher]);

  useShortcut("QUICK_SWITCHER", handleQuickSwitcher);

  // Search (Cmd+F)
  const handleSearch = useCallback(() => {
    if (options.onSearch) {
      options.onSearch();
    } else {
      toggleSearch();
    }
  }, [options, toggleSearch]);

  useShortcut("SEARCH", handleSearch);

  // Next Channel (Alt+Down)
  const handleNextChannel = useCallback(() => {
    if (!channels || channels.length === 0) return;

    const currentIndex = channels.findIndex((c) => c.id === activeChannelId);
    const nextIndex = currentIndex < channels.length - 1 ? currentIndex + 1 : 0;
    const nextChannel = channels[nextIndex];

    if (nextChannel) {
      setActiveChannel(nextChannel.id);
      router.push(`/chat/${nextChannel.slug}`);
    }
  }, [channels, activeChannelId, setActiveChannel, router]);

  useShortcut("NEXT_CHANNEL", handleNextChannel);

  // Previous Channel (Alt+Up)
  const handlePrevChannel = useCallback(() => {
    if (!channels || channels.length === 0) return;

    const currentIndex = channels.findIndex((c) => c.id === activeChannelId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : channels.length - 1;
    const prevChannel = channels[prevIndex];

    if (prevChannel) {
      setActiveChannel(prevChannel.id);
      router.push(`/chat/${prevChannel.slug}`);
    }
  }, [channels, activeChannelId, setActiveChannel, router]);

  useShortcut("PREV_CHANNEL", handlePrevChannel);

  // Next Unread Channel (Alt+Shift+Down)
  const handleNextUnread = useCallback(() => {
    if (unreadChannels.length === 0) return;

    // Find current position in unread list
    const currentUnreadIndex = unreadChannels.findIndex(
      (c) => c.id === activeChannelId,
    );
    const nextIndex =
      currentUnreadIndex < unreadChannels.length - 1
        ? currentUnreadIndex + 1
        : 0;
    const nextUnread = unreadChannels[nextIndex];

    if (nextUnread) {
      setActiveChannel(nextUnread.id);
      router.push(`/chat/${nextUnread.slug}`);
    }
  }, [unreadChannels, activeChannelId, setActiveChannel, router]);

  useShortcut("NEXT_UNREAD", handleNextUnread);

  // Previous Unread Channel (Alt+Shift+Up)
  const handlePrevUnread = useCallback(() => {
    if (unreadChannels.length === 0) return;

    const currentUnreadIndex = unreadChannels.findIndex(
      (c) => c.id === activeChannelId,
    );
    const prevIndex =
      currentUnreadIndex > 0
        ? currentUnreadIndex - 1
        : unreadChannels.length - 1;
    const prevUnread = unreadChannels[prevIndex];

    if (prevUnread) {
      setActiveChannel(prevUnread.id);
      router.push(`/chat/${prevUnread.slug}`);
    }
  }, [unreadChannels, activeChannelId, setActiveChannel, router]);

  useShortcut("PREV_UNREAD", handlePrevUnread);

  // Go to DMs (Cmd+Shift+K)
  const handleGoToDMs = useCallback(() => {
    router.push("/chat/dms");
  }, [router]);

  useShortcut("GOTO_DMS", handleGoToDMs);

  // Focus Message Input (Cmd+/)
  const handleFocusMessageInput = useCallback(() => {
    // Find and focus the message input
    const input = document.querySelector(
      "[data-message-input]",
    ) as HTMLTextAreaElement | null;
    if (input) {
      input.focus();
    }
  }, []);

  useShortcut("FOCUS_MESSAGE_INPUT", handleFocusMessageInput);

  // ============================================================================
  // UI Shortcuts
  // ============================================================================

  // Toggle Sidebar (Cmd+Shift+D)
  useShortcut("TOGGLE_SIDEBAR", toggleSidebar);

  // Toggle Thread Panel (Cmd+Shift+T)
  useShortcut("TOGGLE_THREAD", toggleThreadPanel);

  // Toggle Members Panel (Cmd+Shift+M)
  useShortcut("TOGGLE_MEMBERS", toggleMembersPanel);

  // Toggle Fullscreen (Cmd+Shift+F)
  useShortcut("TOGGLE_FULLSCREEN", toggleFullscreen);

  // Toggle Compact Mode (Cmd+Shift+J)
  useShortcut("TOGGLE_COMPACT_MODE", toggleCompactMode);

  // Open Emoji Picker (Cmd+Shift+E)
  useShortcut("EMOJI_PICKER", () => toggleEmojiPicker());

  // Show Keyboard Shortcuts (?)
  const handleShowShortcuts = useCallback(() => {
    // Only show if not typing in an input
    if (isInputFocused) return;

    if (options.onShowShortcuts) {
      options.onShowShortcuts();
    } else {
      openModal("keyboard-shortcuts");
    }
  }, [isInputFocused, options, openModal]);

  useShortcut("SHOW_SHORTCUTS", handleShowShortcuts);

  // Close Modal/Overlay (Escape)
  const handleEscape = useCallback(() => {
    // Close in priority order: overlays first, then modals
    if (quickSwitcherOpen || searchOpen) {
      closeAllOverlays();
    } else if (activeModal) {
      closeModal();
    }
  }, [
    quickSwitcherOpen,
    searchOpen,
    activeModal,
    closeAllOverlays,
    closeModal,
  ]);

  useShortcut("CLOSE_MODAL", handleEscape);

  // ============================================================================
  // Action Shortcuts
  // ============================================================================

  // New Channel (Cmd+Shift+N)
  const handleNewChannel = useCallback(() => {
    if (options.onNewChannel) {
      options.onNewChannel();
    } else {
      openModal("create-channel");
    }
  }, [options, openModal]);

  useShortcut("NEW_CHANNEL", handleNewChannel);

  // New DM (Cmd+N)
  const handleNewDM = useCallback(() => {
    if (options.onNewDM) {
      options.onNewDM();
    } else {
      // Navigate to DM selection or open modal
      router.push("/chat/dms/new");
    }
  }, [options, router]);

  useShortcut("NEW_DM", handleNewDM);

  // Invite Members (Cmd+Shift+I)
  const handleInviteMembers = useCallback(() => {
    openModal("invite-members");
  }, [openModal]);

  useShortcut("INVITE_MEMBERS", handleInviteMembers);

  // Open Settings (Cmd+,)
  const handleSettings = useCallback(() => {
    if (options.onSettings) {
      options.onSettings();
    } else {
      openModal("app-settings");
    }
  }, [options, openModal]);

  useShortcut("OPEN_SETTINGS", handleSettings);

  // Open Profile (Cmd+Shift+P)
  const handleProfile = useCallback(() => {
    openModal("edit-profile");
  }, [openModal]);

  useShortcut("OPEN_PROFILE", handleProfile);

  // Return current UI state for convenience
  return {
    quickSwitcherOpen,
    searchOpen,
    activeModal,
  };
}

// ============================================================================
// Simplified Hooks for Specific Use Cases
// ============================================================================

/**
 * Just the navigation shortcuts
 */
export function useNavigationShortcuts() {
  const router = useRouter();
  const { toggleQuickSwitcher, toggleSearch } = useUIStore();
  const activeChannelId = useChannelStore((state) => state.activeChannelId);
  const setActiveChannel = useChannelStore((state) => state.setActiveChannel);
  const channels = useChannelStore(selectChannelList);

  useShortcut("QUICK_SWITCHER", toggleQuickSwitcher);
  useShortcut("SEARCH", toggleSearch);

  useShortcut("NEXT_CHANNEL", () => {
    if (!channels || channels.length === 0) return;
    const currentIndex = channels.findIndex((c) => c.id === activeChannelId);
    const nextChannel = channels[(currentIndex + 1) % channels.length];
    if (nextChannel) {
      setActiveChannel(nextChannel.id);
      router.push(`/chat/${nextChannel.slug}`);
    }
  });

  useShortcut("PREV_CHANNEL", () => {
    if (!channels || channels.length === 0) return;
    const currentIndex = channels.findIndex((c) => c.id === activeChannelId);
    const prevChannel =
      channels[currentIndex > 0 ? currentIndex - 1 : channels.length - 1];
    if (prevChannel) {
      setActiveChannel(prevChannel.id);
      router.push(`/chat/${prevChannel.slug}`);
    }
  });
}

/**
 * Just the UI toggle shortcuts
 */
export function useUIToggleShortcuts() {
  const {
    toggleSidebar,
    toggleThreadPanel,
    toggleMembersPanel,
    toggleFullscreen,
    toggleCompactMode,
    openModal,
    closeModal,
    closeAllOverlays,
  } = useUIStore();

  useShortcut("TOGGLE_SIDEBAR", toggleSidebar);
  useShortcut("TOGGLE_THREAD", toggleThreadPanel);
  useShortcut("TOGGLE_MEMBERS", toggleMembersPanel);
  useShortcut("TOGGLE_FULLSCREEN", toggleFullscreen);
  useShortcut("TOGGLE_COMPACT_MODE", toggleCompactMode);

  useShortcut("SHOW_SHORTCUTS", () => openModal("keyboard-shortcuts"));
  useShortcut("CLOSE_MODAL", () => {
    closeAllOverlays();
    closeModal();
  });
}
