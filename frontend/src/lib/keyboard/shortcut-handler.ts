/**
 * Shortcut Handler
 *
 * A class-based handler for keyboard shortcuts that manages event listeners,
 * context awareness, and action execution.
 */

import {
  matchesShortcut,
  eventToShortcut,
  isInputElement,
  shouldIgnoreShortcut,
  isMacOS,
} from "./shortcut-utils";
import { SHORTCUTS, ShortcutKey, ShortcutDefinition } from "./shortcuts";
import { useShortcutStore } from "./shortcut-store";

// ============================================================================
// Types
// ============================================================================

export type ShortcutActionHandler = (
  event: KeyboardEvent,
  shortcut: ShortcutDefinition & { id: ShortcutKey },
) => void | boolean;

export interface ShortcutContext {
  /** Context identifier (e.g., 'chat', 'editor', 'modal') */
  name: string;
  /** Whether this context is currently active */
  active: boolean;
  /** Priority (higher = checked first) */
  priority?: number;
}

export interface ShortcutHandlerOptions {
  /** Target element to attach listener (default: document) */
  target?: HTMLElement | Document;
  /** Whether to use capture phase (default: false) */
  capture?: boolean;
  /** Default action handler */
  onAction?: ShortcutActionHandler;
  /** Called when a shortcut is triggered but no handler found */
  onUnhandled?: (event: KeyboardEvent, shortcut: string) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface RegisteredHandler {
  shortcutId: ShortcutKey;
  handler: ShortcutActionHandler;
  context?: string;
  priority?: number;
}

// ============================================================================
// ShortcutHandler Class
// ============================================================================

export class ShortcutHandler {
  private target: HTMLElement | Document;
  private capture: boolean;
  private onAction?: ShortcutActionHandler;
  private onUnhandled?: (event: KeyboardEvent, shortcut: string) => void;
  private debug: boolean;

  private handlers: Map<ShortcutKey, RegisteredHandler[]> = new Map();
  private activeContexts: Set<string> = new Set(["global"]);
  private enabled: boolean = true;
  private bound: boolean = false;

  private boundHandleKeydown: EventListener;

  constructor(options: ShortcutHandlerOptions = {}) {
    this.target = options.target || document;
    this.capture = options.capture || false;
    this.onAction = options.onAction;
    this.onUnhandled = options.onUnhandled;
    this.debug = options.debug || false;

    this.boundHandleKeydown = this.handleKeydown.bind(this) as EventListener;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start listening for keyboard events
   */
  bind(): void {
    if (this.bound) return;

    this.target.addEventListener("keydown", this.boundHandleKeydown, {
      capture: this.capture,
    });
    this.bound = true;

    if (this.debug) {
    }
  }

  /**
   * Stop listening for keyboard events
   */
  unbind(): void {
    if (!this.bound) return;

    this.target.removeEventListener("keydown", this.boundHandleKeydown, {
      capture: this.capture,
    });
    this.bound = false;

    if (this.debug) {
    }
  }

  /**
   * Enable or disable the handler
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (this.debug) {
    }
  }

  // ============================================================================
  // Handler Registration
  // ============================================================================

  /**
   * Register a handler for a shortcut
   */
  register(
    shortcutId: ShortcutKey,
    handler: ShortcutActionHandler,
    options: { context?: string; priority?: number } = {},
  ): () => void {
    const { context = "global", priority = 0 } = options;

    const registration: RegisteredHandler = {
      shortcutId,
      handler,
      context,
      priority,
    };

    if (!this.handlers.has(shortcutId)) {
      this.handlers.set(shortcutId, []);
    }

    const handlers = this.handlers.get(shortcutId)!;
    handlers.push(registration);

    // Sort by priority (descending)
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (this.debug) {
    }

    // Return unregister function
    return () => {
      this.unregister(shortcutId, handler);
    };
  }

  /**
   * Unregister a handler for a shortcut
   */
  unregister(shortcutId: ShortcutKey, handler?: ShortcutActionHandler): void {
    const handlers = this.handlers.get(shortcutId);
    if (!handlers) return;

    if (handler) {
      const index = handlers.findIndex((h) => h.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      // Remove all handlers for this shortcut
      this.handlers.delete(shortcutId);
    }

    if (this.debug) {
    }
  }

  /**
   * Register multiple handlers at once
   */
  registerMany(
    handlers: Record<ShortcutKey, ShortcutActionHandler>,
    options: { context?: string; priority?: number } = {},
  ): () => void {
    const unregisters = Object.entries(handlers).map(([id, handler]) =>
      this.register(id as ShortcutKey, handler, options),
    );

    // Return combined unregister function
    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  /**
   * Activate a context
   */
  activateContext(context: string): void {
    this.activeContexts.add(context);

    if (this.debug) {
    }
  }

  /**
   * Deactivate a context
   */
  deactivateContext(context: string): void {
    this.activeContexts.delete(context);

    if (this.debug) {
    }
  }

  /**
   * Set active contexts (replaces all)
   */
  setActiveContexts(contexts: string[]): void {
    this.activeContexts = new Set(contexts);

    if (this.debug) {
    }
  }

  /**
   * Check if a context is active
   */
  isContextActive(context: string): boolean {
    return this.activeContexts.has(context);
  }

  /**
   * Get all active contexts
   */
  getActiveContexts(): string[] {
    return Array.from(this.activeContexts);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private handleKeydown(event: KeyboardEvent): void {
    // Check if handler is enabled
    if (!this.enabled) return;

    // Check if shortcuts are globally enabled
    const store = useShortcutStore.getState();
    if (!store.shortcutsEnabled) return;

    // Get the shortcut string from the event
    const shortcutString = eventToShortcut(event);
    if (!shortcutString) return;

    if (this.debug) {
    }

    // Find matching shortcut
    const match = this.findMatchingShortcut(event);

    if (!match) {
      // No matching shortcut defined
      if (this.onUnhandled) {
        this.onUnhandled(event, shortcutString);
      }
      return;
    }

    const { id, shortcut } = match;

    // Check if shortcut is enabled
    if (!store.isShortcutEnabled(id)) {
      if (this.debug) {
      }
      return;
    }

    // Check if we should ignore based on focus
    const shouldIgnore = shouldIgnoreShortcut(event, {
      enableOnInputs: shortcut.enableOnFormTags,
      enableOnContentEditable: shortcut.enableOnFormTags,
    });

    if (shouldIgnore) {
      if (this.debug) {
      }
      return;
    }

    // Check scopes
    if (shortcut.scopes && shortcut.scopes.length > 0) {
      const hasActiveScope = shortcut.scopes.some((scope) =>
        this.activeContexts.has(scope),
      );
      if (!hasActiveScope) {
        if (this.debug) {
        }
        return;
      }
    }

    // Find and execute handler
    const handled = this.executeHandler(id, shortcut, event);

    if (handled) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      event.stopPropagation();
    }
  }

  private findMatchingShortcut(
    event: KeyboardEvent,
  ): { id: ShortcutKey; shortcut: ShortcutDefinition } | null {
    const store = useShortcutStore.getState();

    for (const [id, shortcut] of Object.entries(SHORTCUTS)) {
      const effectiveKey = store.getEffectiveKey(id as ShortcutKey);

      if (matchesShortcut(event, effectiveKey)) {
        return {
          id: id as ShortcutKey,
          shortcut: shortcut as ShortcutDefinition,
        };
      }
    }

    return null;
  }

  private executeHandler(
    id: ShortcutKey,
    shortcut: ShortcutDefinition,
    event: KeyboardEvent,
  ): boolean {
    const handlers = this.handlers.get(id);

    // Try registered handlers first (sorted by priority)
    if (handlers && handlers.length > 0) {
      for (const registration of handlers) {
        // Check if handler's context is active
        if (
          registration.context &&
          !this.activeContexts.has(registration.context)
        ) {
          continue;
        }

        const result = registration.handler(event, { ...shortcut, id });

        // If handler returns false, continue to next handler
        if (result === false) {
          continue;
        }

        // Handler executed
        if (this.debug) {
        }
        return true;
      }
    }

    // Try default action handler
    if (this.onAction) {
      const result = this.onAction(event, { ...shortcut, id });
      if (result !== false) {
        if (this.debug) {
        }
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Simulate a shortcut trigger
   */
  trigger(shortcutId: ShortcutKey): boolean {
    const shortcut = SHORTCUTS[shortcutId];
    if (!shortcut) return false;

    // Create a synthetic event
    const event = new KeyboardEvent("keydown", {
      key: "",
      bubbles: true,
      cancelable: true,
    });

    return this.executeHandler(
      shortcutId,
      shortcut as ShortcutDefinition,
      event,
    );
  }

  /**
   * Get all registered shortcut IDs
   */
  getRegisteredShortcuts(): ShortcutKey[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a shortcut has handlers registered
   */
  hasHandler(shortcutId: ShortcutKey): boolean {
    const handlers = this.handlers.get(shortcutId);
    return !!handlers && handlers.length > 0;
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear();

    if (this.debug) {
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalHandler: ShortcutHandler | null = null;

/**
 * Get the global shortcut handler instance
 */
export function getGlobalShortcutHandler(): ShortcutHandler {
  if (!globalHandler) {
    globalHandler = new ShortcutHandler();
    globalHandler.bind();
  }
  return globalHandler;
}

/**
 * Create a new shortcut handler with custom options
 */
export function createShortcutHandler(
  options?: ShortcutHandlerOptions,
): ShortcutHandler {
  return new ShortcutHandler(options);
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Predefined action types for shortcuts
 */
export const ShortcutActions = {
  // Navigation
  OPEN_QUICK_SWITCHER: "openQuickSwitcher",
  SHOW_SHORTCUTS: "showShortcuts",
  OPEN_ALL_DMS: "openAllDMs",
  PREVIOUS_CHANNEL: "previousChannel",
  NEXT_CHANNEL: "nextChannel",
  OPEN_THREADS: "openThreads",
  OPEN_MENTIONS: "openMentions",
  OPEN_SAVED_ITEMS: "openSavedItems",
  FOCUS_SEARCH: "focusSearch",

  // Messages
  NEW_MESSAGE: "newMessage",
  UPLOAD_FILE: "uploadFile",
  SEND_MESSAGE: "sendMessage",
  EDIT_LAST_MESSAGE: "editLastMessage",
  CLOSE_PANEL: "closePanel",
  REPLY_TO_MESSAGE: "replyToMessage",
  ADD_REACTION: "addReaction",
  PIN_MESSAGE: "pinMessage",
  DELETE_MESSAGE: "deleteMessage",

  // Formatting
  FORMAT_BOLD: "formatBold",
  FORMAT_ITALIC: "formatItalic",
  FORMAT_STRIKETHROUGH: "formatStrikethrough",
  FORMAT_CODE: "formatCode",
  FORMAT_CODE_BLOCK: "formatCodeBlock",
  FORMAT_LINK: "formatLink",
  FORMAT_QUOTE: "formatQuote",

  // UI
  TOGGLE_SIDEBAR: "toggleSidebar",
  TOGGLE_REACTIONS: "toggleReactions",
  TOGGLE_THREAD_PANEL: "toggleThreadPanel",
  TOGGLE_MEMBERS_PANEL: "toggleMembersPanel",
  TOGGLE_FULLSCREEN: "toggleFullscreen",
  OPEN_EMOJI_PICKER: "openEmojiPicker",
  OPEN_SETTINGS: "openSettings",

  // Channel
  MUTE_CHANNEL: "muteChannel",
  INVITE_MEMBERS: "inviteMembers",
  CREATE_CHANNEL: "createChannel",
} as const;

export type ShortcutAction =
  (typeof ShortcutActions)[keyof typeof ShortcutActions];
