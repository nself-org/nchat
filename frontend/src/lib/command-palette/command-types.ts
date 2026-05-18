/**
 * Command Palette Types
 *
 * TypeScript type definitions for the command palette system
 */

import { LucideIcon } from "lucide-react";

// ============================================================================
// Command Categories
// ============================================================================

export type CommandCategory =
  | "navigation"
  | "channel"
  | "dm"
  | "user"
  | "message"
  | "settings"
  | "action"
  | "search"
  | "create"
  | "recent";

// ============================================================================
// Command Priority
// ============================================================================

export type CommandPriority = "high" | "normal" | "low";

// ============================================================================
// Command Status
// ============================================================================

export type CommandStatus = "ready" | "loading" | "disabled" | "hidden";

// ============================================================================
// Command Shortcut
// ============================================================================

export interface CommandShortcut {
  /** Key combination (e.g., 'mod+k', 'shift+enter') */
  keys: string;
  /** Display label for the shortcut */
  label?: string;
}

// ============================================================================
// Base Command Interface
// ============================================================================

export interface BaseCommand {
  /** Unique identifier for the command */
  id: string;
  /** Display name for the command */
  name: string;
  /** Optional description */
  description?: string;
  /** Command category for grouping */
  category: CommandCategory;
  /** Icon component or icon name */
  icon?: LucideIcon | string;
  /** Keyboard shortcut */
  shortcut?: CommandShortcut;
  /** Priority for sorting */
  priority?: CommandPriority;
  /** Current status */
  status?: CommandStatus;
  /** Keywords for search matching */
  keywords?: string[];
  /** Parent command ID for nested commands */
  parentId?: string;
  /** Whether command requires confirmation */
  requiresConfirmation?: boolean;
  /** Whether command is recently used */
  isRecent?: boolean;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Executable Command
// ============================================================================

export interface ExecutableCommand extends BaseCommand {
  /** Command execution handler */
  execute: (context: CommandExecutionContext) => void | Promise<void>;
  /** Whether command can execute (for dynamic enabling/disabling) */
  canExecute?: (context: CommandExecutionContext) => boolean;
}

// ============================================================================
// Channel Command
// ============================================================================

export interface ChannelCommandData extends BaseCommand {
  category: "channel";
  channelId: string;
  channelName: string;
  channelType: "public" | "private" | "direct" | "group";
  unreadCount?: number;
  memberCount?: number;
  isStarred?: boolean;
  isMuted?: boolean;
}

// ============================================================================
// DM Command
// ============================================================================

export interface DMCommandData extends BaseCommand {
  category: "dm";
  userId: string;
  userName: string;
  userDisplayName: string;
  avatarUrl?: string;
  presence?: "online" | "away" | "dnd" | "offline" | "invisible";
  unreadCount?: number;
}

// ============================================================================
// User Command
// ============================================================================

export interface UserCommandData extends BaseCommand {
  category: "user";
  userId: string;
  userName: string;
  userDisplayName: string;
  avatarUrl?: string;
  role?: string;
  presence?: "online" | "away" | "dnd" | "offline" | "invisible";
}

// ============================================================================
// Message Command
// ============================================================================

export interface MessageCommandData extends BaseCommand {
  category: "message";
  messageId: string;
  messagePreview: string;
  channelId: string;
  channelName: string;
  authorName: string;
  timestamp: Date;
}

// ============================================================================
// Settings Command
// ============================================================================

export interface SettingsCommandData extends BaseCommand {
  category: "settings";
  settingsPath: string;
  settingsSection?: string;
}

// ============================================================================
// Action Command
// ============================================================================

export interface ActionCommandData extends ExecutableCommand {
  category: "action";
  /** Whether action is destructive (e.g., sign out, delete) */
  isDestructive?: boolean;
}

// ============================================================================
// Search Command
// ============================================================================

export interface SearchCommandData extends BaseCommand {
  category: "search";
  searchType: "messages" | "files" | "users" | "channels" | "all";
  searchQuery?: string;
}

// ============================================================================
// Create Command
// ============================================================================

export interface CreateCommandData extends ExecutableCommand {
  category: "create";
  createType: "channel" | "dm" | "group";
}

// ============================================================================
// Union Type for All Commands
// ============================================================================

export type Command =
  | ChannelCommandData
  | DMCommandData
  | UserCommandData
  | MessageCommandData
  | SettingsCommandData
  | ActionCommandData
  | SearchCommandData
  | CreateCommandData
  | ExecutableCommand;

// ============================================================================
// Command Execution Context Data
// ============================================================================

export interface CommandExecutionContextData {
  /** Open a modal by type (accepts modal type and optional data) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openModal?: (...args: any[]) => void;
  /** Toggle theme between light and dark */
  toggleTheme?: () => void;
  /** Mark all messages as read */
  markAllAsRead?: () => void;
  /** Toggle Do Not Disturb mode */
  toggleDND?: () => void;
  /** Toggle sidebar visibility */
  toggleSidebar?: () => void;
  /** Sign out the current user */
  signOut?: () => void;
  /** Additional custom data */
  [key: string]: unknown;
}

// ============================================================================
// Command Execution Context
// ============================================================================

export interface CommandExecutionContext {
  /** Close the command palette after execution */
  closeCommandPalette: () => void;
  /** Navigate to a route */
  navigate: (path: string) => void;
  /** Current user ID */
  currentUserId?: string;
  /** Current channel ID */
  currentChannelId?: string;
  /** Search query if any */
  searchQuery?: string;
  /** Additional context data */
  data?: CommandExecutionContextData;
}

// ============================================================================
// Command Search Options
// ============================================================================

export interface CommandSearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Filter by categories */
  categories?: CommandCategory[];
  /** Include hidden commands */
  includeHidden?: boolean;
  /** Minimum score threshold (0-1) */
  minScore?: number;
  /** Include recent commands */
  includeRecent?: boolean;
  /** Custom scoring function */
  customScorer?: (command: Command, query: string) => number;
}

// ============================================================================
// Command Search Result
// ============================================================================

export interface CommandSearchResult {
  /** The matched command */
  command: Command;
  /** Search score (0-1) */
  score: number;
  /** Matched portions for highlighting */
  matches?: CommandMatch[];
}

export interface CommandMatch {
  /** Field that matched */
  field: "name" | "description" | "keywords";
  /** Start index of match */
  start: number;
  /** End index of match */
  end: number;
}

// ============================================================================
// Command Group
// ============================================================================

export interface CommandGroup {
  /** Group identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon for the group */
  icon?: LucideIcon | string;
  /** Commands in this group */
  commands: Command[];
  /** Group priority for ordering */
  priority?: number;
  /** Whether group is collapsible */
  collapsible?: boolean;
  /** Whether group is collapsed by default */
  defaultCollapsed?: boolean;
}

// ============================================================================
// Command History Entry
// ============================================================================

export interface CommandHistoryEntry {
  /** Command ID */
  commandId: string;
  /** Timestamp of execution */
  executedAt: Date;
  /** Execution count */
  count: number;
}

// ============================================================================
// Command Registry Options
// ============================================================================

export interface CommandRegistryOptions {
  /** Enable built-in commands */
  enableBuiltIn?: boolean;
  /** Maximum recent commands to track */
  maxRecentCommands?: number;
  /** Persist history to localStorage */
  persistHistory?: boolean;
  /** History storage key */
  historyKey?: string;
}

// ============================================================================
// Command Palette State
// ============================================================================

export interface CommandPaletteState {
  /** Whether palette is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Active filter/mode */
  mode: "all" | "channels" | "dms" | "users" | "search" | "actions";
  /** Selected command index */
  selectedIndex: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Filtered/searched commands */
  filteredCommands: Command[];
  /** Recent commands */
  recentCommands: Command[];
  /** Whether showing recent view */
  showRecent: boolean;
}

// ============================================================================
// Command Palette Actions
// ============================================================================

export interface CommandPaletteActions {
  /** Open the command palette */
  open: (mode?: CommandPaletteState["mode"]) => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle the command palette */
  toggle: () => void;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Set mode/filter */
  setMode: (mode: CommandPaletteState["mode"]) => void;
  /** Select next command */
  selectNext: () => void;
  /** Select previous command */
  selectPrevious: () => void;
  /** Select command at index */
  selectIndex: (index: number) => void;
  /** Execute selected command */
  executeSelected: (context: CommandExecutionContext) => void;
  /** Execute command by ID */
  executeCommand: (commandId: string, context: CommandExecutionContext) => void;
  /** Add command to history */
  addToHistory: (commandId: string) => void;
  /** Clear history */
  clearHistory: () => void;
  /** Set filtered commands */
  setFilteredCommands: (commands: Command[]) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Reset state */
  reset: () => void;
}

export type CommandPaletteStore = CommandPaletteState & CommandPaletteActions;
