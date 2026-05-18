/**
 * Context Menu Hook - Provides convenient access to context menu functionality
 *
 * Offers methods for opening, closing, and managing context menus
 */

import { useCallback, useEffect, useRef } from "react";
import {
  useContextMenuStore,
  type ContextMenuPosition,
  type ContextMenuTarget,
  type ContextMenuType,
  type MessageTarget,
  type ChannelTarget,
  type UserTarget,
  type FileTarget,
  type TextSelectionTarget,
} from "./context-menu-store";

// ============================================================================
// Types
// ============================================================================

export interface UseContextMenuOptions {
  /**
   * Called when the menu opens
   */
  onOpen?: (type: ContextMenuType, target: ContextMenuTarget) => void;

  /**
   * Called when the menu closes
   */
  onClose?: () => void;

  /**
   * Whether to close the menu when clicking outside
   * @default true
   */
  closeOnClickOutside?: boolean;

  /**
   * Whether to close the menu when pressing Escape
   * @default true
   */
  closeOnEscape?: boolean;

  /**
   * Whether to close the menu when scrolling
   * @default true
   */
  closeOnScroll?: boolean;

  /**
   * Whether to close the menu when the window is resized
   * @default true
   */
  closeOnResize?: boolean;
}

export interface UseContextMenuReturn {
  // State
  isOpen: boolean;
  menuType: ContextMenuType;
  position: ContextMenuPosition | null;
  target: ContextMenuTarget;
  activeSubmenu: string | null;

  // Open Methods
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

  // Close Methods
  closeMenu: () => void;

  // Submenu Methods
  openSubmenu: (submenuId: string) => void;
  closeSubmenu: () => void;

  // Utility Methods
  getPositionFromEvent: (
    event: React.MouseEvent | MouseEvent,
  ) => ContextMenuPosition;
  handleContextMenu: <T extends ContextMenuTarget>(
    type: ContextMenuType,
    target: T,
  ) => (event: React.MouseEvent) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the position from a mouse event, ensuring the menu stays within viewport
 */
export function getPositionFromEvent(
  event: React.MouseEvent | MouseEvent,
  menuWidth = 200,
  menuHeight = 300,
): ContextMenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = event.clientX;
  let y = event.clientY;

  // Ensure menu doesn't go off the right edge
  if (x + menuWidth > viewportWidth) {
    x = viewportWidth - menuWidth - 10;
  }

  // Ensure menu doesn't go off the bottom edge
  if (y + menuHeight > viewportHeight) {
    y = viewportHeight - menuHeight - 10;
  }

  // Ensure menu doesn't go off the left edge
  if (x < 10) {
    x = 10;
  }

  // Ensure menu doesn't go off the top edge
  if (y < 10) {
    y = 10;
  }

  return { x, y };
}

// ============================================================================
// Hook
// ============================================================================

export function useContextMenu(
  options: UseContextMenuOptions = {},
): UseContextMenuReturn {
  const {
    onOpen,
    onClose,
    closeOnClickOutside = true,
    closeOnEscape = true,
    closeOnScroll = true,
    closeOnResize = true,
  } = options;

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Store state
  const isOpen = useContextMenuStore((state) => state.isOpen);
  const menuType = useContextMenuStore((state) => state.menuType);
  const position = useContextMenuStore((state) => state.position);
  const target = useContextMenuStore((state) => state.target);
  const activeSubmenu = useContextMenuStore((state) => state.activeSubmenu);

  // Store actions
  const storeOpenMenu = useContextMenuStore((state) => state.openMenu);
  const storeOpenMessageMenu = useContextMenuStore(
    (state) => state.openMessageMenu,
  );
  const storeOpenChannelMenu = useContextMenuStore(
    (state) => state.openChannelMenu,
  );
  const storeOpenUserMenu = useContextMenuStore((state) => state.openUserMenu);
  const storeOpenFileMenu = useContextMenuStore((state) => state.openFileMenu);
  const storeOpenTextSelectionMenu = useContextMenuStore(
    (state) => state.openTextSelectionMenu,
  );
  const storeCloseMenu = useContextMenuStore((state) => state.closeMenu);
  const storeOpenSubmenu = useContextMenuStore((state) => state.openSubmenu);
  const storeCloseSubmenu = useContextMenuStore((state) => state.closeSubmenu);

  // Wrapped open methods with callback
  const openMenu = useCallback(
    (
      type: ContextMenuType,
      pos: ContextMenuPosition,
      tgt: ContextMenuTarget,
    ) => {
      storeOpenMenu(type, pos, tgt);
      onOpen?.(type, tgt);
    },
    [storeOpenMenu, onOpen],
  );

  const openMessageMenu = useCallback(
    (pos: ContextMenuPosition, tgt: Omit<MessageTarget, "type">) => {
      storeOpenMessageMenu(pos, tgt);
      onOpen?.("message", { type: "message", ...tgt });
    },
    [storeOpenMessageMenu, onOpen],
  );

  const openChannelMenu = useCallback(
    (pos: ContextMenuPosition, tgt: Omit<ChannelTarget, "type">) => {
      storeOpenChannelMenu(pos, tgt);
      onOpen?.("channel", { type: "channel", ...tgt });
    },
    [storeOpenChannelMenu, onOpen],
  );

  const openUserMenu = useCallback(
    (pos: ContextMenuPosition, tgt: Omit<UserTarget, "type">) => {
      storeOpenUserMenu(pos, tgt);
      onOpen?.("user", { type: "user", ...tgt });
    },
    [storeOpenUserMenu, onOpen],
  );

  const openFileMenu = useCallback(
    (pos: ContextMenuPosition, tgt: Omit<FileTarget, "type">) => {
      storeOpenFileMenu(pos, tgt);
      onOpen?.("file", { type: "file", ...tgt });
    },
    [storeOpenFileMenu, onOpen],
  );

  const openTextSelectionMenu = useCallback(
    (pos: ContextMenuPosition, tgt: Omit<TextSelectionTarget, "type">) => {
      storeOpenTextSelectionMenu(pos, tgt);
      onOpen?.("text-selection", { type: "text-selection", ...tgt });
    },
    [storeOpenTextSelectionMenu, onOpen],
  );

  // Wrapped close method with callback
  const closeMenu = useCallback(() => {
    storeCloseMenu();
    onClose?.();
  }, [storeCloseMenu, onClose]);

  // Event handler factory
  const handleContextMenu = useCallback(
    <T extends ContextMenuTarget>(type: ContextMenuType, tgt: T) =>
      (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPositionFromEvent(event);
        openMenu(type, pos, tgt);
      },
    [openMenu],
  );

  // Close on click outside
  useEffect(() => {
    if (!closeOnClickOutside || !isOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    // Use setTimeout to avoid closing immediately on the same click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClick);
    };
  }, [closeOnClickOutside, isOpen, closeMenu]);

  // Close on Escape
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, isOpen, closeMenu]);

  // Close on scroll
  useEffect(() => {
    if (!closeOnScroll || !isOpen) return;

    const handleScroll = () => {
      closeMenu();
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [closeOnScroll, isOpen, closeMenu]);

  // Close on resize
  useEffect(() => {
    if (!closeOnResize || !isOpen) return;

    const handleResize = () => {
      closeMenu();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [closeOnResize, isOpen, closeMenu]);

  return {
    // State
    isOpen,
    menuType,
    position,
    target,
    activeSubmenu,

    // Open Methods
    openMenu,
    openMessageMenu,
    openChannelMenu,
    openUserMenu,
    openFileMenu,
    openTextSelectionMenu,

    // Close Methods
    closeMenu,

    // Submenu Methods
    openSubmenu: storeOpenSubmenu,
    closeSubmenu: storeCloseSubmenu,

    // Utility Methods
    getPositionFromEvent,
    handleContextMenu,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for handling message context menus
 */
export function useMessageContextMenu() {
  const { openMessageMenu, closeMenu, target, isOpen, menuType } =
    useContextMenu();

  const messageTarget =
    menuType === "message" && target?.type === "message" ? target : null;

  return {
    isOpen: isOpen && menuType === "message",
    target: messageTarget,
    open: openMessageMenu,
    close: closeMenu,
  };
}

/**
 * Hook for handling channel context menus
 */
export function useChannelContextMenu() {
  const { openChannelMenu, closeMenu, target, isOpen, menuType } =
    useContextMenu();

  const channelTarget =
    menuType === "channel" && target?.type === "channel" ? target : null;

  return {
    isOpen: isOpen && menuType === "channel",
    target: channelTarget,
    open: openChannelMenu,
    close: closeMenu,
  };
}

/**
 * Hook for handling user context menus
 */
export function useUserContextMenu() {
  const { openUserMenu, closeMenu, target, isOpen, menuType } =
    useContextMenu();

  const userTarget =
    menuType === "user" && target?.type === "user" ? target : null;

  return {
    isOpen: isOpen && menuType === "user",
    target: userTarget,
    open: openUserMenu,
    close: closeMenu,
  };
}

/**
 * Hook for handling file context menus
 */
export function useFileContextMenu() {
  const { openFileMenu, closeMenu, target, isOpen, menuType } =
    useContextMenu();

  const fileTarget =
    menuType === "file" && target?.type === "file" ? target : null;

  return {
    isOpen: isOpen && menuType === "file",
    target: fileTarget,
    open: openFileMenu,
    close: closeMenu,
  };
}

/**
 * Hook for handling text selection context menus
 */
export function useTextSelectionContextMenu() {
  const { openTextSelectionMenu, closeMenu, target, isOpen, menuType } =
    useContextMenu();

  const textTarget =
    menuType === "text-selection" && target?.type === "text-selection"
      ? target
      : null;

  return {
    isOpen: isOpen && menuType === "text-selection",
    target: textTarget,
    open: openTextSelectionMenu,
    close: closeMenu,
  };
}

// Re-export types
export type {
  ContextMenuPosition,
  ContextMenuTarget,
  ContextMenuType,
  MessageTarget,
  ChannelTarget,
  UserTarget,
  FileTarget,
  TextSelectionTarget,
} from "./context-menu-store";
