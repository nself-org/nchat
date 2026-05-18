/**
 * Context Menu Library
 *
 * Provides the store and hooks for managing context menu state.
 */

// Store
export {
  useContextMenuStore,
  selectIsMenuOpen,
  selectMenuType,
  selectMenuPosition,
  selectMenuTarget,
  selectMessageTarget,
  selectChannelTarget,
  selectUserTarget,
  selectFileTarget,
  selectTextSelectionTarget,
  selectActiveSubmenu,
} from "./context-menu-store";

export type {
  ContextMenuType,
  ContextMenuPosition,
  MessageTarget,
  ChannelTarget,
  UserTarget,
  FileTarget,
  TextSelectionTarget,
  ContextMenuTarget,
  ContextMenuState,
  ContextMenuActions,
  ContextMenuStore,
} from "./context-menu-store";

// Hook
export {
  useContextMenu,
  useMessageContextMenu,
  useChannelContextMenu,
  useUserContextMenu,
  useFileContextMenu,
  useTextSelectionContextMenu,
  getPositionFromEvent,
} from "./use-context-menu";

export type {
  UseContextMenuOptions,
  UseContextMenuReturn,
} from "./use-context-menu";
