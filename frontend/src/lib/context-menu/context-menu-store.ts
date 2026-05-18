/**
 * Context Menu Store - Manages context menu state for the nself-chat application
 *
 * Handles menu visibility, positioning, and target element tracking
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type ContextMenuType =
  | "message"
  | "channel"
  | "user"
  | "file"
  | "text-selection"
  | null;

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface MessageTarget {
  type: "message";
  messageId: string;
  channelId: string;
  content: string;
  authorId: string;
  isPinned: boolean;
  isBookmarked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  canModerate: boolean;
}

export interface ChannelTarget {
  type: "channel";
  channelId: string;
  name: string;
  isMuted: boolean;
  isStarred: boolean;
  canEdit: boolean;
  canLeave: boolean;
  unreadCount: number;
}

export interface UserTarget {
  type: "user";
  userId: string;
  username: string;
  displayName: string;
  role: string;
  channelId?: string;
  canChangeRole: boolean;
  canRemoveFromChannel: boolean;
  canSendMessage: boolean;
}

export interface FileTarget {
  type: "file";
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  canDelete: boolean;
}

export interface TextSelectionTarget {
  type: "text-selection";
  selectedText: string;
  /**
   * A CSS selector or data attribute to identify the source element.
   * We store a string instead of HTMLElement to avoid immer serialization issues.
   */
  sourceSelector: string | null;
}

export type ContextMenuTarget =
  | MessageTarget
  | ChannelTarget
  | UserTarget
  | FileTarget
  | TextSelectionTarget
  | null;

export interface ContextMenuState {
  // Menu State
  isOpen: boolean;
  menuType: ContextMenuType;
  position: ContextMenuPosition | null;
  target: ContextMenuTarget;

  // Submenu State
  activeSubmenu: string | null;

  // Animation State
  isAnimating: boolean;
}

export interface ContextMenuActions {
  // Open Menu Actions
  openMenu: (
    type: ContextMenuType,
    position: ContextMenuPosition,
    target: ContextMenuTarget,
  ) => void;

  openMessageMenu: (
    position: ContextMenuPosition,
    target: Omit<MessageTarget, "type">,
  ) => void;

  openChannelMenu: (
    position: ContextMenuPosition,
    target: Omit<ChannelTarget, "type">,
  ) => void;

  openUserMenu: (
    position: ContextMenuPosition,
    target: Omit<UserTarget, "type">,
  ) => void;

  openFileMenu: (
    position: ContextMenuPosition,
    target: Omit<FileTarget, "type">,
  ) => void;

  openTextSelectionMenu: (
    position: ContextMenuPosition,
    target: Omit<TextSelectionTarget, "type">,
  ) => void;

  // Close Actions
  closeMenu: () => void;

  // Submenu Actions
  openSubmenu: (submenuId: string) => void;
  closeSubmenu: () => void;

  // Position Actions
  updatePosition: (position: ContextMenuPosition) => void;

  // Animation Actions
  setAnimating: (animating: boolean) => void;
}

export type ContextMenuStore = ContextMenuState & ContextMenuActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ContextMenuState = {
  isOpen: false,
  menuType: null,
  position: null,
  target: null,
  activeSubmenu: null,
  isAnimating: false,
};

// ============================================================================
// Store
// ============================================================================

export const useContextMenuStore = create<ContextMenuStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Open Menu Actions
      openMenu: (type, position, target) =>
        set(
          (state) => {
            state.isOpen = true;
            state.menuType = type;
            state.position = position;
            state.target = target;
            state.activeSubmenu = null;
            state.isAnimating = true;
          },
          false,
          "contextMenu/openMenu",
        ),

      openMessageMenu: (position, target) =>
        set(
          (state) => {
            state.isOpen = true;
            state.menuType = "message";
            state.position = position;
            state.target = { type: "message", ...target };
            state.activeSubmenu = null;
            state.isAnimating = true;
          },
          false,
          "contextMenu/openMessageMenu",
        ),

      openChannelMenu: (position, target) =>
        set(
          (state) => {
            state.isOpen = true;
            state.menuType = "channel";
            state.position = position;
            state.target = { type: "channel", ...target };
            state.activeSubmenu = null;
            state.isAnimating = true;
          },
          false,
          "contextMenu/openChannelMenu",
        ),

      openUserMenu: (position, target) =>
        set(
          (state) => {
            state.isOpen = true;
            state.menuType = "user";
            state.position = position;
            state.target = { type: "user", ...target };
            state.activeSubmenu = null;
            state.isAnimating = true;
          },
          false,
          "contextMenu/openUserMenu",
        ),

      openFileMenu: (position, target) =>
        set(
          (state) => {
            state.isOpen = true;
            state.menuType = "file";
            state.position = position;
            state.target = { type: "file", ...target };
            state.activeSubmenu = null;
            state.isAnimating = true;
          },
          false,
          "contextMenu/openFileMenu",
        ),

      openTextSelectionMenu: (position, target) =>
        set(
          (state) => {
            state.isOpen = true;
            state.menuType = "text-selection";
            state.position = position;
            state.target = { type: "text-selection", ...target };
            state.activeSubmenu = null;
            state.isAnimating = true;
          },
          false,
          "contextMenu/openTextSelectionMenu",
        ),

      // Close Actions
      closeMenu: () =>
        set(
          (state) => {
            state.isOpen = false;
            state.menuType = null;
            state.position = null;
            state.target = null;
            state.activeSubmenu = null;
            state.isAnimating = false;
          },
          false,
          "contextMenu/closeMenu",
        ),

      // Submenu Actions
      openSubmenu: (submenuId) =>
        set(
          (state) => {
            state.activeSubmenu = submenuId;
          },
          false,
          "contextMenu/openSubmenu",
        ),

      closeSubmenu: () =>
        set(
          (state) => {
            state.activeSubmenu = null;
          },
          false,
          "contextMenu/closeSubmenu",
        ),

      // Position Actions
      updatePosition: (position) =>
        set(
          (state) => {
            state.position = position;
          },
          false,
          "contextMenu/updatePosition",
        ),

      // Animation Actions
      setAnimating: (animating) =>
        set(
          (state) => {
            state.isAnimating = animating;
          },
          false,
          "contextMenu/setAnimating",
        ),
    })),
    { name: "context-menu-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsMenuOpen = (state: ContextMenuStore) => state.isOpen;

export const selectMenuType = (state: ContextMenuStore) => state.menuType;

export const selectMenuPosition = (state: ContextMenuStore) => state.position;

export const selectMenuTarget = (state: ContextMenuStore) => state.target;

export const selectMessageTarget = (state: ContextMenuStore) =>
  state.target?.type === "message" ? state.target : null;

export const selectChannelTarget = (state: ContextMenuStore) =>
  state.target?.type === "channel" ? state.target : null;

export const selectUserTarget = (state: ContextMenuStore) =>
  state.target?.type === "user" ? state.target : null;

export const selectFileTarget = (state: ContextMenuStore) =>
  state.target?.type === "file" ? state.target : null;

export const selectTextSelectionTarget = (state: ContextMenuStore) =>
  state.target?.type === "text-selection" ? state.target : null;

export const selectActiveSubmenu = (state: ContextMenuStore) =>
  state.activeSubmenu;
