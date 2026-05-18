/**
 * Command Registry
 *
 * Central registry for managing commands in the command palette.
 * Handles registration, retrieval, and organization of commands.
 */

import {
  Hash,
  Lock,
  MessageSquare,
  User,
  Settings,
  Moon,
  Sun,
  CheckCheck,
  Keyboard,
  HelpCircle,
  LogOut,
  Plus,
  Search,
  Bell,
  BellOff,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import type {
  Command,
  ExecutableCommand,
  ChannelCommandData,
  DMCommandData,
  UserCommandData,
  CommandCategory,
  CommandRegistryOptions,
  CommandExecutionContext,
  CommandPriority,
} from "./command-types";

// ============================================================================
// Registry Class
// ============================================================================

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private options: CommandRegistryOptions;
  private categoryOrder: CommandCategory[] = [
    "recent",
    "navigation",
    "channel",
    "dm",
    "user",
    "search",
    "create",
    "action",
    "settings",
    "message",
  ];

  constructor(options: CommandRegistryOptions = {}) {
    this.options = {
      enableBuiltIn: true,
      maxRecentCommands: 5,
      persistHistory: true,
      historyKey: "nchat-command-history",
      ...options,
    };

    if (this.options.enableBuiltIn) {
      this.registerBuiltInCommands();
    }
  }

  // ============================================================================
  // Command Registration
  // ============================================================================

  /**
   * Register a single command
   */
  register(command: Command): void {
    this.commands.set(command.id, command);
  }

  /**
   * Register multiple commands
   */
  registerMany(commands: Command[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Unregister a command by ID
   */
  unregister(commandId: string): boolean {
    return this.commands.delete(commandId);
  }

  /**
   * Update an existing command
   */
  update(commandId: string, updates: Partial<Command>): boolean {
    const command = this.commands.get(commandId);
    if (!command) return false;
    this.commands.set(commandId, { ...command, ...updates } as Command);
    return true;
  }

  // ============================================================================
  // Command Retrieval
  // ============================================================================

  /**
   * Get a command by ID
   */
  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get all registered commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: CommandCategory): Command[] {
    return this.getAll().filter((cmd) => cmd.category === category);
  }

  /**
   * Get commands grouped by category
   */
  getGroupedByCategory(): Map<CommandCategory, Command[]> {
    const grouped = new Map<CommandCategory, Command[]>();

    for (const category of this.categoryOrder) {
      const commands = this.getByCategory(category);
      if (commands.length > 0) {
        grouped.set(category, this.sortCommands(commands));
      }
    }

    return grouped;
  }

  /**
   * Check if a command exists
   */
  has(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  /**
   * Get total command count
   */
  get size(): number {
    return this.commands.size;
  }

  // ============================================================================
  // Dynamic Command Registration
  // ============================================================================

  /**
   * Register channels as commands
   */
  registerChannels(
    channels: Array<{
      id: string;
      name: string;
      type: "public" | "private" | "direct" | "group";
      unreadCount?: number;
      memberCount?: number;
      isStarred?: boolean;
      isMuted?: boolean;
    }>,
  ): void {
    for (const channel of channels) {
      const command: ChannelCommandData = {
        id: `channel:${channel.id}`,
        name: channel.name,
        description: `Go to #${channel.name}`,
        category: "channel",
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        unreadCount: channel.unreadCount,
        memberCount: channel.memberCount,
        isStarred: channel.isStarred,
        isMuted: channel.isMuted,
        icon: channel.type === "private" ? Lock : Hash,
        keywords: ["channel", channel.name, channel.type],
        priority: channel.isStarred ? "high" : "normal",
      };
      this.register(command);
    }
  }

  /**
   * Register users for DM commands
   */
  registerUsers(
    users: Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      presence?: "online" | "away" | "dnd" | "offline" | "invisible";
      role?: string;
    }>,
  ): void {
    for (const user of users) {
      // DM command
      const dmCommand: DMCommandData = {
        id: `dm:${user.id}`,
        name: user.displayName,
        description: `Message ${user.displayName}`,
        category: "dm",
        userId: user.id,
        userName: user.username,
        userDisplayName: user.displayName,
        avatarUrl: user.avatarUrl,
        presence: user.presence,
        icon: MessageSquare,
        keywords: ["dm", "message", user.username, user.displayName],
        priority: user.presence === "online" ? "high" : "normal",
      };
      this.register(dmCommand);

      // User view command
      const userCommand: UserCommandData = {
        id: `user:${user.id}`,
        name: user.displayName,
        description: `View ${user.displayName}'s profile`,
        category: "user",
        userId: user.id,
        userName: user.username,
        userDisplayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        presence: user.presence,
        icon: User,
        keywords: ["user", "profile", user.username, user.displayName],
      };
      this.register(userCommand);
    }
  }

  /**
   * Clear all dynamic commands (channels, users)
   */
  clearDynamicCommands(): void {
    for (const [id] of this.commands) {
      if (
        id.startsWith("channel:") ||
        id.startsWith("dm:") ||
        id.startsWith("user:")
      ) {
        this.commands.delete(id);
      }
    }
  }

  // ============================================================================
  // Built-in Commands
  // ============================================================================

  private registerBuiltInCommands(): void {
    const builtInCommands: ExecutableCommand[] = [
      // Search commands
      {
        id: "search:messages",
        name: "Search messages",
        description: "Search through all messages",
        category: "search",
        icon: Search,
        shortcut: { keys: "mod+shift+f", label: "Search" },
        keywords: ["search", "find", "messages"],
        priority: "high",
        execute: (ctx) => {
          ctx.navigate("/search?type=messages");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "search:files",
        name: "Search files",
        description: "Search through shared files",
        category: "search",
        icon: Search,
        keywords: ["search", "find", "files", "attachments"],
        execute: (ctx) => {
          ctx.navigate("/search?type=files");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "search:users",
        name: "Search users",
        description: "Find a team member",
        category: "search",
        icon: Users,
        keywords: ["search", "find", "users", "members", "people"],
        execute: (ctx) => {
          ctx.navigate("/search?type=users");
          ctx.closeCommandPalette();
        },
      },

      // Create commands
      {
        id: "create:channel",
        name: "Create channel",
        description: "Create a new channel",
        category: "create",
        icon: Plus,
        shortcut: { keys: "mod+shift+n" },
        keywords: ["create", "new", "channel", "add"],
        priority: "high",
        execute: (ctx) => {
          // This will trigger the create channel modal
          ctx.data?.openModal?.("create-channel");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "create:dm",
        name: "New message",
        description: "Start a new direct message",
        category: "create",
        icon: MessageSquare,
        shortcut: { keys: "mod+n" },
        keywords: ["create", "new", "dm", "message", "direct"],
        priority: "high",
        execute: (ctx) => {
          ctx.navigate("/messages/new");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "create:group",
        name: "New group message",
        description: "Start a new group conversation",
        category: "create",
        icon: UserPlus,
        keywords: ["create", "new", "group", "message"],
        execute: (ctx) => {
          ctx.navigate("/messages/new?type=group");
          ctx.closeCommandPalette();
        },
      },

      // Settings commands
      {
        id: "settings:profile",
        name: "Edit profile",
        description: "Edit your profile settings",
        category: "settings",
        icon: User,
        keywords: ["settings", "profile", "edit", "account"],
        execute: (ctx) => {
          ctx.navigate("/settings/profile");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "settings:notifications",
        name: "Notification settings",
        description: "Manage your notifications",
        category: "settings",
        icon: Bell,
        keywords: ["settings", "notifications", "alerts"],
        execute: (ctx) => {
          ctx.navigate("/settings/notifications");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "settings:preferences",
        name: "Preferences",
        description: "App preferences and display settings",
        category: "settings",
        icon: Settings,
        shortcut: { keys: "mod+," },
        keywords: ["settings", "preferences", "options"],
        execute: (ctx) => {
          ctx.navigate("/settings");
          ctx.closeCommandPalette();
        },
      },

      // Action commands
      {
        id: "action:toggle-dark-mode",
        name: "Toggle dark mode",
        description: "Switch between light and dark theme",
        category: "action",
        icon: Moon,
        shortcut: { keys: "mod+shift+l" },
        keywords: ["theme", "dark", "light", "mode", "toggle"],
        priority: "high",
        execute: (ctx) => {
          ctx.data?.toggleTheme?.();
          ctx.closeCommandPalette();
        },
      },
      {
        id: "action:mark-all-read",
        name: "Mark all as read",
        description: "Mark all messages as read",
        category: "action",
        icon: CheckCheck,
        shortcut: { keys: "mod+shift+a" },
        keywords: ["mark", "read", "all", "clear", "unread"],
        execute: (ctx) => {
          ctx.data?.markAllAsRead?.();
          ctx.closeCommandPalette();
        },
      },
      {
        id: "action:toggle-dnd",
        name: "Toggle Do Not Disturb",
        description: "Enable or disable Do Not Disturb mode",
        category: "action",
        icon: BellOff,
        keywords: ["dnd", "disturb", "notifications", "mute", "quiet"],
        execute: (ctx) => {
          ctx.data?.toggleDND?.();
          ctx.closeCommandPalette();
        },
      },
      {
        id: "action:toggle-sidebar",
        name: "Toggle sidebar",
        description: "Show or hide the sidebar",
        category: "action",
        icon: Settings,
        shortcut: { keys: "mod+\\" },
        keywords: ["sidebar", "toggle", "show", "hide"],
        execute: (ctx) => {
          ctx.data?.toggleSidebar?.();
          ctx.closeCommandPalette();
        },
      },
      {
        id: "action:keyboard-shortcuts",
        name: "Keyboard shortcuts",
        description: "View all keyboard shortcuts",
        category: "action",
        icon: Keyboard,
        shortcut: { keys: "mod+/" },
        keywords: ["keyboard", "shortcuts", "hotkeys", "keys"],
        priority: "normal",
        execute: (ctx) => {
          ctx.data?.openModal?.("keyboard-shortcuts");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "action:help",
        name: "Help",
        description: "Open help documentation",
        category: "action",
        icon: HelpCircle,
        keywords: ["help", "support", "docs", "documentation"],
        execute: (ctx) => {
          ctx.navigate("/help");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "action:sign-out",
        name: "Sign out",
        description: "Sign out of your account",
        category: "action",
        icon: LogOut,
        keywords: ["sign", "out", "logout", "exit"],
        requiresConfirmation: true,
        execute: (ctx) => {
          ctx.data?.signOut?.();
          ctx.closeCommandPalette();
        },
      },

      // Navigation commands
      {
        id: "nav:home",
        name: "Go to Home",
        description: "Navigate to home",
        category: "navigation",
        icon: Hash,
        keywords: ["home", "main", "start"],
        execute: (ctx) => {
          ctx.navigate("/chat");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "nav:threads",
        name: "Go to Threads",
        description: "View all your threads",
        category: "navigation",
        icon: MessageSquare,
        keywords: ["threads", "replies"],
        execute: (ctx) => {
          ctx.navigate("/threads");
          ctx.closeCommandPalette();
        },
      },
      {
        id: "nav:starred",
        name: "Go to Starred",
        description: "View starred items",
        category: "navigation",
        icon: Star,
        keywords: ["starred", "saved", "favorites"],
        execute: (ctx) => {
          ctx.navigate("/starred");
          ctx.closeCommandPalette();
        },
      },
    ];

    this.registerMany(builtInCommands);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Sort commands by priority and name
   */
  private sortCommands(commands: Command[]): Command[] {
    const priorityOrder: Record<CommandPriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    };

    return commands.sort((a, b) => {
      const priorityA = priorityOrder[a.priority || "normal"];
      const priorityB = priorityOrder[b.priority || "normal"];

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: CommandCategory): string {
    const names: Record<CommandCategory, string> = {
      recent: "Recent",
      navigation: "Navigation",
      channel: "Channels",
      dm: "Direct Messages",
      user: "Users",
      message: "Messages",
      settings: "Settings",
      action: "Actions",
      search: "Search",
      create: "Create",
    };
    return names[category] || category;
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: CommandCategory): LucideIcon {
    const icons: Record<CommandCategory, LucideIcon> = {
      recent: Search,
      navigation: Hash,
      channel: Hash,
      dm: MessageSquare,
      user: User,
      message: MessageSquare,
      settings: Settings,
      action: Settings,
      search: Search,
      create: Plus,
    };
    return icons[category] || Settings;
  }

  /**
   * Reset the registry
   */
  reset(): void {
    this.commands.clear();
    if (this.options.enableBuiltIn) {
      this.registerBuiltInCommands();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: CommandRegistry | null = null;

/**
 * Get the global command registry instance
 */
export function getCommandRegistry(
  options?: CommandRegistryOptions,
): CommandRegistry {
  if (!registryInstance) {
    registryInstance = new CommandRegistry(options);
  }
  return registryInstance;
}

/**
 * Reset the global registry instance
 */
export function resetCommandRegistry(): void {
  registryInstance = null;
}

export default CommandRegistry;
