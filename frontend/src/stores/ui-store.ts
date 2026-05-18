/**
 * UI Store - Manages all UI-related state for the nself-chat application
 *
 * Handles sidebar, panels, modals, and various UI toggles
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type ModalType =
  | "create-channel"
  | "edit-channel"
  | "delete-channel"
  | "invite-members"
  | "user-profile"
  | "channel-settings"
  | "app-settings"
  | "keyboard-shortcuts"
  | "file-preview"
  | "confirm-action"
  | "create-workspace"
  | "edit-profile"
  | "notifications-settings"
  | null;

export interface ModalData {
  channelId?: string;
  userId?: string;
  fileId?: string;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  [key: string]: unknown;
}

export interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  sidebarMinWidth: number;
  sidebarMaxWidth: number;

  // Thread Panel
  threadPanelOpen: boolean;
  threadPanelWidth: number;
  threadPanelMinWidth: number;
  threadPanelMaxWidth: number;

  // Members Panel
  membersPanelOpen: boolean;
  membersPanelWidth: number;

  // Modals
  activeModal: ModalType;
  modalData: ModalData | null;

  // Overlays
  commandPaletteOpen: boolean;
  emojiPickerOpen: boolean;
  emojiPickerPosition: { x: number; y: number } | null;
  searchOpen: boolean;
  quickSwitcherOpen: boolean;

  // Mobile
  mobileMenuOpen: boolean;
  mobileChannelListOpen: boolean;

  // Message Input
  messageInputFocused: boolean;
  messageInputHeight: number;

  // Layout
  isFullscreen: boolean;
  isCompactMode: boolean;

  // Loading States
  isNavigating: boolean;
  globalLoadingMessage: string | null;
}

export interface UIActions {
  // Sidebar Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;

  // Thread Panel Actions
  toggleThreadPanel: () => void;
  setThreadPanelOpen: (open: boolean) => void;
  setThreadPanelWidth: (width: number) => void;

  // Members Panel Actions
  toggleMembersPanel: () => void;
  setMembersPanelOpen: (open: boolean) => void;
  setMembersPanelWidth: (width: number) => void;

  // Modal Actions
  openModal: (modal: ModalType, data?: ModalData) => void;
  closeModal: () => void;
  setModalData: (data: ModalData) => void;

  // Overlay Actions
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleEmojiPicker: (position?: { x: number; y: number }) => void;
  setEmojiPickerOpen: (
    open: boolean,
    position?: { x: number; y: number },
  ) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleQuickSwitcher: () => void;
  setQuickSwitcherOpen: (open: boolean) => void;

  // Mobile Actions
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileChannelList: () => void;
  setMobileChannelListOpen: (open: boolean) => void;

  // Message Input Actions
  setMessageInputFocused: (focused: boolean) => void;
  setMessageInputHeight: (height: number) => void;

  // Layout Actions
  toggleFullscreen: () => void;
  setFullscreen: (fullscreen: boolean) => void;
  toggleCompactMode: () => void;
  setCompactMode: (compact: boolean) => void;

  // Loading Actions
  setNavigating: (navigating: boolean) => void;
  setGlobalLoading: (message: string | null) => void;

  // Utility Actions
  closeAllOverlays: () => void;
  resetUI: () => void;
}

export type UIStore = UIState & UIActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: UIState = {
  // Sidebar
  sidebarCollapsed: false,
  sidebarWidth: 260,
  sidebarMinWidth: 200,
  sidebarMaxWidth: 400,

  // Thread Panel
  threadPanelOpen: false,
  threadPanelWidth: 400,
  threadPanelMinWidth: 300,
  threadPanelMaxWidth: 600,

  // Members Panel
  membersPanelOpen: false,
  membersPanelWidth: 240,

  // Modals
  activeModal: null,
  modalData: null,

  // Overlays
  commandPaletteOpen: false,
  emojiPickerOpen: false,
  emojiPickerPosition: null,
  searchOpen: false,
  quickSwitcherOpen: false,

  // Mobile
  mobileMenuOpen: false,
  mobileChannelListOpen: false,

  // Message Input
  messageInputFocused: false,
  messageInputHeight: 44,

  // Layout
  isFullscreen: false,
  isCompactMode: false,

  // Loading States
  isNavigating: false,
  globalLoadingMessage: null,
};

// ============================================================================
// Store
// ============================================================================

export const useUIStore = create<UIStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Sidebar Actions
      toggleSidebar: () =>
        set(
          (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          },
          false,
          "ui/toggleSidebar",
        ),

      setSidebarCollapsed: (collapsed) =>
        set(
          (state) => {
            state.sidebarCollapsed = collapsed;
          },
          false,
          "ui/setSidebarCollapsed",
        ),

      setSidebarWidth: (width) =>
        set(
          (state) => {
            state.sidebarWidth = Math.min(
              Math.max(width, state.sidebarMinWidth),
              state.sidebarMaxWidth,
            );
          },
          false,
          "ui/setSidebarWidth",
        ),

      // Thread Panel Actions
      toggleThreadPanel: () =>
        set(
          (state) => {
            state.threadPanelOpen = !state.threadPanelOpen;
          },
          false,
          "ui/toggleThreadPanel",
        ),

      setThreadPanelOpen: (open) =>
        set(
          (state) => {
            state.threadPanelOpen = open;
          },
          false,
          "ui/setThreadPanelOpen",
        ),

      setThreadPanelWidth: (width) =>
        set(
          (state) => {
            state.threadPanelWidth = Math.min(
              Math.max(width, state.threadPanelMinWidth),
              state.threadPanelMaxWidth,
            );
          },
          false,
          "ui/setThreadPanelWidth",
        ),

      // Members Panel Actions
      toggleMembersPanel: () =>
        set(
          (state) => {
            state.membersPanelOpen = !state.membersPanelOpen;
          },
          false,
          "ui/toggleMembersPanel",
        ),

      setMembersPanelOpen: (open) =>
        set(
          (state) => {
            state.membersPanelOpen = open;
          },
          false,
          "ui/setMembersPanelOpen",
        ),

      setMembersPanelWidth: (width) =>
        set(
          (state) => {
            state.membersPanelWidth = width;
          },
          false,
          "ui/setMembersPanelWidth",
        ),

      // Modal Actions
      openModal: (modal, data) =>
        set(
          (state) => {
            state.activeModal = modal;
            state.modalData = data ?? null;
          },
          false,
          "ui/openModal",
        ),

      closeModal: () =>
        set(
          (state) => {
            state.activeModal = null;
            state.modalData = null;
          },
          false,
          "ui/closeModal",
        ),

      setModalData: (data) =>
        set(
          (state) => {
            state.modalData = data;
          },
          false,
          "ui/setModalData",
        ),

      // Overlay Actions
      toggleCommandPalette: () =>
        set(
          (state) => {
            state.commandPaletteOpen = !state.commandPaletteOpen;
            // Close other overlays when opening command palette
            if (state.commandPaletteOpen) {
              state.searchOpen = false;
              state.quickSwitcherOpen = false;
              state.emojiPickerOpen = false;
            }
          },
          false,
          "ui/toggleCommandPalette",
        ),

      setCommandPaletteOpen: (open) =>
        set(
          (state) => {
            state.commandPaletteOpen = open;
            if (open) {
              state.searchOpen = false;
              state.quickSwitcherOpen = false;
              state.emojiPickerOpen = false;
            }
          },
          false,
          "ui/setCommandPaletteOpen",
        ),

      toggleEmojiPicker: (position) =>
        set(
          (state) => {
            state.emojiPickerOpen = !state.emojiPickerOpen;
            state.emojiPickerPosition = state.emojiPickerOpen
              ? (position ?? null)
              : null;
          },
          false,
          "ui/toggleEmojiPicker",
        ),

      setEmojiPickerOpen: (open, position) =>
        set(
          (state) => {
            state.emojiPickerOpen = open;
            state.emojiPickerPosition = open ? (position ?? null) : null;
          },
          false,
          "ui/setEmojiPickerOpen",
        ),

      toggleSearch: () =>
        set(
          (state) => {
            state.searchOpen = !state.searchOpen;
            if (state.searchOpen) {
              state.commandPaletteOpen = false;
              state.quickSwitcherOpen = false;
            }
          },
          false,
          "ui/toggleSearch",
        ),

      setSearchOpen: (open) =>
        set(
          (state) => {
            state.searchOpen = open;
            if (open) {
              state.commandPaletteOpen = false;
              state.quickSwitcherOpen = false;
            }
          },
          false,
          "ui/setSearchOpen",
        ),

      toggleQuickSwitcher: () =>
        set(
          (state) => {
            state.quickSwitcherOpen = !state.quickSwitcherOpen;
            if (state.quickSwitcherOpen) {
              state.commandPaletteOpen = false;
              state.searchOpen = false;
            }
          },
          false,
          "ui/toggleQuickSwitcher",
        ),

      setQuickSwitcherOpen: (open) =>
        set(
          (state) => {
            state.quickSwitcherOpen = open;
            if (open) {
              state.commandPaletteOpen = false;
              state.searchOpen = false;
            }
          },
          false,
          "ui/setQuickSwitcherOpen",
        ),

      // Mobile Actions
      toggleMobileMenu: () =>
        set(
          (state) => {
            state.mobileMenuOpen = !state.mobileMenuOpen;
          },
          false,
          "ui/toggleMobileMenu",
        ),

      setMobileMenuOpen: (open) =>
        set(
          (state) => {
            state.mobileMenuOpen = open;
          },
          false,
          "ui/setMobileMenuOpen",
        ),

      toggleMobileChannelList: () =>
        set(
          (state) => {
            state.mobileChannelListOpen = !state.mobileChannelListOpen;
          },
          false,
          "ui/toggleMobileChannelList",
        ),

      setMobileChannelListOpen: (open) =>
        set(
          (state) => {
            state.mobileChannelListOpen = open;
          },
          false,
          "ui/setMobileChannelListOpen",
        ),

      // Message Input Actions
      setMessageInputFocused: (focused) =>
        set(
          (state) => {
            state.messageInputFocused = focused;
          },
          false,
          "ui/setMessageInputFocused",
        ),

      setMessageInputHeight: (height) =>
        set(
          (state) => {
            state.messageInputHeight = height;
          },
          false,
          "ui/setMessageInputHeight",
        ),

      // Layout Actions
      toggleFullscreen: () =>
        set(
          (state) => {
            state.isFullscreen = !state.isFullscreen;
          },
          false,
          "ui/toggleFullscreen",
        ),

      setFullscreen: (fullscreen) =>
        set(
          (state) => {
            state.isFullscreen = fullscreen;
          },
          false,
          "ui/setFullscreen",
        ),

      toggleCompactMode: () =>
        set(
          (state) => {
            state.isCompactMode = !state.isCompactMode;
          },
          false,
          "ui/toggleCompactMode",
        ),

      setCompactMode: (compact) =>
        set(
          (state) => {
            state.isCompactMode = compact;
          },
          false,
          "ui/setCompactMode",
        ),

      // Loading Actions
      setNavigating: (navigating) =>
        set(
          (state) => {
            state.isNavigating = navigating;
          },
          false,
          "ui/setNavigating",
        ),

      setGlobalLoading: (message) =>
        set(
          (state) => {
            state.globalLoadingMessage = message;
          },
          false,
          "ui/setGlobalLoading",
        ),

      // Utility Actions
      closeAllOverlays: () =>
        set(
          (state) => {
            state.commandPaletteOpen = false;
            state.emojiPickerOpen = false;
            state.emojiPickerPosition = null;
            state.searchOpen = false;
            state.quickSwitcherOpen = false;
            state.activeModal = null;
            state.modalData = null;
            state.mobileMenuOpen = false;
          },
          false,
          "ui/closeAllOverlays",
        ),

      resetUI: () => set(() => initialState, false, "ui/resetUI"),
    })),
    { name: "ui-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSidebarState = (state: UIStore) => ({
  collapsed: state.sidebarCollapsed,
  width: state.sidebarWidth,
});

export const selectThreadPanelState = (state: UIStore) => ({
  open: state.threadPanelOpen,
  width: state.threadPanelWidth,
});

export const selectHasActiveOverlay = (state: UIStore) =>
  state.commandPaletteOpen ||
  state.emojiPickerOpen ||
  state.searchOpen ||
  state.quickSwitcherOpen ||
  state.activeModal !== null;

export const selectIsMobileMenuVisible = (state: UIStore) =>
  state.mobileMenuOpen || state.mobileChannelListOpen;
