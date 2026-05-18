/**
 * Context Menu Components
 *
 * A consolidated context menu system for the nself-chat application using Radix UI.
 *
 * Usage:
 *
 * 1. Wrap your app with ContextMenuProvider:
 *    ```tsx
 *    import { ContextMenuProvider } from '@/components/context-menu';
 *
 *    function App() {
 *      return (
 *        <ContextMenuProvider>
 *          <YourApp />
 *        </ContextMenuProvider>
 *      );
 *    }
 *    ```
 *
 * 2. Use the useContextMenu hook to open menus programmatically:
 *    ```tsx
 *    import { useContextMenu } from '@/lib/context-menu/use-context-menu';
 *
 *    function MessageComponent({ message }) {
 *      const { openMessageMenu, getPositionFromEvent } = useContextMenu();
 *
 *      const handleContextMenu = (event: React.MouseEvent) => {
 *        event.preventDefault();
 *        openMessageMenu(getPositionFromEvent(event), {
 *          messageId: message.id,
 *          channelId: message.channelId,
 *          content: message.content,
 *          authorId: message.authorId,
 *          isPinned: message.isPinned,
 *          isBookmarked: false,
 *          canEdit: true,
 *          canDelete: true,
 *          canPin: true,
 *          canModerate: false,
 *        });
 *      };
 *
 *      return (
 *        <div onContextMenu={handleContextMenu}>
 *          {message.content}
 *        </div>
 *      );
 *    }
 *    ```
 *
 * 3. Or use BaseContextMenu for declarative usage:
 *    ```tsx
 *    import { BaseContextMenu, MenuItem, MenuSeparator } from '@/components/context-menu';
 *
 *    function MyComponent() {
 *      return (
 *        <BaseContextMenu
 *          trigger={<div>Right-click me</div>}
 *        >
 *          <MenuItem icon={Edit}>Edit</MenuItem>
 *          <MenuSeparator />
 *          <MenuItem icon={Trash} danger>Delete</MenuItem>
 *        </BaseContextMenu>
 *      );
 *    }
 *    ```
 */

// Provider
export {
  ContextMenuProvider,
  useContextMenuProvider,
} from "./context-menu-provider";
export type {
  ContextMenuProviderProps,
  ContextMenuContextValue,
  ContextMenuHandler,
} from "./context-menu-provider";

// Base Components
export {
  BaseContextMenu,
  ContextMenuContent,
  PositionedContextMenu,
  ContextMenuGroup,
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
} from "./base-context-menu";
export type {
  BaseContextMenuProps,
  ContextMenuContentProps,
} from "./base-context-menu";

// Menu Item Components
export {
  MenuItem,
  MenuCheckboxItem,
  MenuRadioItem,
  MenuLabel,
} from "./menu-item";
export type {
  MenuItemProps,
  MenuCheckboxItemProps,
  MenuRadioItemProps,
  MenuLabelProps,
} from "./menu-item";

// Menu Separator
export { MenuSeparator } from "./menu-separator";
export type { MenuSeparatorProps } from "./menu-separator";

// Menu Submenu
export {
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuSubmenuContent,
  MenuRadioGroup,
} from "./menu-submenu";
export type {
  MenuSubmenuProps,
  MenuSubmenuTriggerProps,
  MenuSubmenuContentProps,
} from "./menu-submenu";

// Specialized Context Menus
export { MessageContextMenu, QUICK_REACTIONS } from "./message-context-menu";
export type {
  MessageContextMenuProps,
  MessageActionData,
  MessageAction,
} from "./message-context-menu";

export { ChannelContextMenu, MUTE_DURATIONS } from "./channel-context-menu";
export type {
  ChannelContextMenuProps,
  ChannelActionData,
  ChannelAction,
  MuteDuration,
} from "./channel-context-menu";

export { UserContextMenu, ROLE_OPTIONS } from "./user-context-menu";
export type {
  UserContextMenuProps,
  UserActionData,
  UserAction,
  UserRole,
} from "./user-context-menu";

export {
  FileContextMenu,
  getFileIcon,
  isPreviewable,
} from "./file-context-menu";
export type {
  FileContextMenuProps,
  FileActionData,
  FileAction,
} from "./file-context-menu";

export { TextSelectionMenu, SEARCH_ENGINES } from "./text-selection-menu";
export type {
  TextSelectionMenuProps,
  TextSelectionActionData,
  TextSelectionAction,
  SearchEngine,
} from "./text-selection-menu";
