"use client";

import * as React from "react";
import {
  useContextMenuStore,
  type ContextMenuType,
} from "@/lib/context-menu/context-menu-store";
import { MessageContextMenu } from "./message-context-menu";
import { ChannelContextMenu } from "./channel-context-menu";
import { UserContextMenu } from "./user-context-menu";
import { FileContextMenu } from "./file-context-menu";
import { TextSelectionMenu } from "./text-selection-menu";

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuProviderProps {
  /**
   * The application content
   */
  children: React.ReactNode;

  /**
   * Whether to enable the context menu system
   * @default true
   */
  enabled?: boolean;

  /**
   * Whether to prevent the default browser context menu
   * @default true
   */
  preventDefault?: boolean;

  /**
   * Callback when any menu action is performed
   */
  onAction?: (action: string, data: unknown) => void;
}

export interface ContextMenuContextValue {
  /**
   * Whether the context menu system is enabled
   */
  enabled: boolean;

  /**
   * Currently active menu type
   */
  activeMenuType: ContextMenuType;

  /**
   * Register a custom menu handler
   */
  registerHandler: (type: string, handler: ContextMenuHandler) => void;

  /**
   * Unregister a custom menu handler
   */
  unregisterHandler: (type: string) => void;
}

export type ContextMenuHandler = (
  action: string,
  data: unknown,
) => void | Promise<void>;

// ============================================================================
// Context
// ============================================================================

const ContextMenuContext = React.createContext<ContextMenuContextValue | null>(
  null,
);

// ============================================================================
// Hook
// ============================================================================

export function useContextMenuProvider(): ContextMenuContextValue {
  const context = React.useContext(ContextMenuContext);
  if (!context) {
    throw new Error(
      "useContextMenuProvider must be used within a ContextMenuProvider",
    );
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

export function ContextMenuProvider({
  children,
  enabled = true,
  preventDefault = true,
  onAction,
}: ContextMenuProviderProps) {
  const menuType = useContextMenuStore((state) => state.menuType);
  const isOpen = useContextMenuStore((state) => state.isOpen);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  // Custom handlers registry
  const handlersRef = React.useRef<Map<string, ContextMenuHandler>>(new Map());

  // Register handler
  const registerHandler = React.useCallback(
    (type: string, handler: ContextMenuHandler) => {
      handlersRef.current.set(type, handler);
    },
    [],
  );

  // Unregister handler
  const unregisterHandler = React.useCallback((type: string) => {
    handlersRef.current.delete(type);
  }, []);

  // Handle actions from menus
  const handleAction = React.useCallback(
    (action: string, data: unknown) => {
      onAction?.(action, data);
      closeMenu();
    },
    [onAction, closeMenu],
  );

  // Prevent default context menu when our menu is open
  React.useEffect(() => {
    if (!preventDefault) return;

    const handleContextMenu = (event: MouseEvent) => {
      // Only prevent default if we have a custom handler for this element
      // Let the individual context menus handle their own prevention
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [preventDefault]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          closeMenu();
          break;
        case "ArrowDown":
        case "ArrowUp":
        case "Enter":
        case " ":
          // Let the menu handle these
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMenu]);

  // Context value
  const contextValue = React.useMemo<ContextMenuContextValue>(
    () => ({
      enabled,
      activeMenuType: menuType,
      registerHandler,
      unregisterHandler,
    }),
    [enabled, menuType, registerHandler, unregisterHandler],
  );

  // Render the appropriate menu based on type
  const renderMenu = () => {
    if (!enabled || !isOpen) return null;

    switch (menuType) {
      case "message":
        return <MessageContextMenu onAction={handleAction} />;
      case "channel":
        return <ChannelContextMenu onAction={handleAction} />;
      case "user":
        return <UserContextMenu onAction={handleAction} />;
      case "file":
        return <FileContextMenu onAction={handleAction} />;
      case "text-selection":
        return <TextSelectionMenu onAction={handleAction} />;
      default:
        return null;
    }
  };

  return (
    <ContextMenuContext.Provider value={contextValue}>
      {children}
      {renderMenu()}
    </ContextMenuContext.Provider>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { ContextMenuContext };
