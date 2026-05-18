/**
 * Command Palette Components
 *
 * Central export point for all command palette UI components.
 */

// Main Component
export { CommandPalette, type CommandPaletteProps } from "./CommandPalette";

// Input Components
export { CommandInput, type CommandInputProps } from "./CommandInput";

// List Components
export { CommandList, type CommandListProps } from "./CommandList";
export { CommandItem, type CommandItemProps } from "./CommandItem";
export {
  CommandGroup,
  CommandSeparator,
  type CommandGroupProps,
} from "./CommandGroup";

// Base Components
export { CommandIcon, type CommandIconProps } from "./CommandIcon";
export { CommandShortcut, type CommandShortcutProps } from "./CommandShortcut";
export { CommandEmpty, type CommandEmptyProps } from "./CommandEmpty";
export { CommandLoading, type CommandLoadingProps } from "./CommandLoading";

// Recent Commands
export {
  RecentCommands,
  CompactRecentList,
  type RecentCommandsProps,
  type CompactRecentListProps,
} from "./RecentCommands";

// Specialized Command Components
export { ChannelCommand, type ChannelCommandProps } from "./ChannelCommand";
export { DMCommand, type DMCommandProps } from "./DMCommand";
export { UserCommand, type UserCommandProps } from "./UserCommand";
export { MessageCommand, type MessageCommandProps } from "./MessageCommand";
export { SettingsCommand, type SettingsCommandProps } from "./SettingsCommand";
export { ActionCommand, type ActionCommandProps } from "./ActionCommand";
export { SearchCommand, type SearchCommandProps } from "./SearchCommand";
export { CreateCommand, type CreateCommandProps } from "./CreateCommand";
