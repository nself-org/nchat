/**
 * Context Menus - Right-click menus for various UI elements
 *
 * Usage example:
 *
 * ```tsx
 * import { MessageContextMenu } from '@/components/context-menus'
 *
 * <MessageContextMenu message={message} onReply={handleReply}>
 *   <div className="message">{message.content}</div>
 * </MessageContextMenu>
 * ```
 */

// Base components (for building custom context menus)
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemWithIcon,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "./context-menu-base";

// Pre-built context menus
export { MessageContextMenu } from "./message-context-menu";
export type { MessageContextMenuProps } from "./message-context-menu";

export { ChannelContextMenu } from "./channel-context-menu";
export type { ChannelContextMenuProps } from "./channel-context-menu";

export { UserContextMenu } from "./user-context-menu";
export type {
  UserContextMenuProps,
  ContextMenuUser,
  UserRole,
} from "./user-context-menu";

export { AttachmentContextMenu } from "./attachment-context-menu";
export type { AttachmentContextMenuProps } from "./attachment-context-menu";

export { LinkContextMenu } from "./link-context-menu";
export type { LinkContextMenuProps } from "./link-context-menu";

export { SidebarContextMenu } from "./sidebar-context-menu";
export type { SidebarContextMenuProps } from "./sidebar-context-menu";
