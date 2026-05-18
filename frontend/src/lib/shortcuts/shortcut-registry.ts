/**
 * Shortcut Registry
 *
 * A central registry for all keyboard shortcuts in the application.
 * Supports categorization, context-aware filtering, conflict detection,
 * and priority-based resolution.
 */

import { parseKeyCombo, normalizeKeyCombo, type ParsedKey } from "./key-parser";

// ============================================================================
// Types
// ============================================================================

/** Categories for grouping shortcuts in the UI */
export type ShortcutCategory =
  | "navigation"
  | "messaging"
  | "formatting"
  | "media"
  | "calls"
  | "admin"
  | "custom";

/** Contexts where a shortcut is active */
export type ShortcutContext =
  | "global"
  | "chat"
  | "editor"
  | "sidebar"
  | "modal"
  | "command-palette";

/** Callback executed when a shortcut fires */
export type ShortcutAction = (event: KeyboardEvent) => void | boolean;

/** Full definition of a registered shortcut */
export interface ShortcutDefinition {
  /** Unique string identifier */
  id: string;
  /** Key combination string (e.g., "mod+k") or chord ("g then i") */
  keys: string;
  /** Human-readable label */
  description: string;
  /** Category for grouping in the key map */
  category: ShortcutCategory;
  /** Contexts where this shortcut is active */
  context: ShortcutContext;
  /** Optional action handler */
  action?: ShortcutAction;
  /** Priority for conflict resolution (higher wins) */
  priority: number;
  /** Whether to prevent default browser behavior */
  preventDefault: boolean;
  /** Whether to allow firing in input/textarea elements */
  enableInInputs: boolean;
  /** Whether this shortcut is currently enabled */
  enabled: boolean;
  /** The preset this shortcut belongs to (if any) */
  preset?: string;
}

/** Options for registering a shortcut (most fields optional with defaults) */
export interface ShortcutRegistrationOptions {
  id: string;
  keys: string;
  description: string;
  category: ShortcutCategory;
  context?: ShortcutContext;
  action?: ShortcutAction;
  priority?: number;
  preventDefault?: boolean;
  enableInInputs?: boolean;
  enabled?: boolean;
  preset?: string;
}

/** A detected conflict between two shortcuts */
export interface ShortcutConflict {
  /** The normalized key combo that conflicts */
  normalizedKeys: string;
  /** IDs of the shortcuts that share this key combo in the same context */
  shortcutIds: string[];
  /** The context where the conflict occurs */
  context: ShortcutContext;
  /** Which shortcut "wins" based on priority */
  winnerId: string;
}

// ============================================================================
// Registry Class
// ============================================================================

export class ShortcutRegistry {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a new shortcut definition.
   *
   * @param options - Shortcut configuration
   * @returns Unregister function
   */
  register(options: ShortcutRegistrationOptions): () => void {
    const definition: ShortcutDefinition = {
      id: options.id,
      keys: options.keys,
      description: options.description,
      category: options.category,
      context: options.context ?? "global",
      action: options.action,
      priority: options.priority ?? 0,
      preventDefault: options.preventDefault ?? false,
      enableInInputs: options.enableInInputs ?? false,
      enabled: options.enabled ?? true,
      preset: options.preset,
    };

    this.shortcuts.set(definition.id, definition);

    return () => this.unregister(definition.id);
  }

  /**
   * Register multiple shortcuts at once.
   *
   * @param entries - Array of shortcut registration options
   * @returns Unregister-all function
   */
  registerMany(entries: ShortcutRegistrationOptions[]): () => void {
    const unregFns = entries.map((e) => this.register(e));
    return () => {
      unregFns.forEach((fn) => fn());
    };
  }

  /**
   * Remove a shortcut by its ID.
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Remove all registered shortcuts.
   */
  clear(): void {
    this.shortcuts.clear();
  }

  // --------------------------------------------------------------------------
  // Query
  // --------------------------------------------------------------------------

  /**
   * Get a shortcut definition by ID.
   */
  get(id: string): ShortcutDefinition | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * Get all registered shortcuts as an array.
   */
  getAll(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get all shortcuts in a given category.
   */
  getByCategory(category: ShortcutCategory): ShortcutDefinition[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /**
   * Get all shortcuts for a given context.
   */
  getByContext(context: ShortcutContext): ShortcutDefinition[] {
    return this.getAll().filter(
      (s) => s.context === context || s.context === "global",
    );
  }

  /**
   * Get shortcuts grouped by category.
   */
  getGroupedByCategory(): Record<ShortcutCategory, ShortcutDefinition[]> {
    const categories: ShortcutCategory[] = [
      "navigation",
      "messaging",
      "formatting",
      "media",
      "calls",
      "admin",
      "custom",
    ];
    const grouped: Record<ShortcutCategory, ShortcutDefinition[]> =
      {} as Record<ShortcutCategory, ShortcutDefinition[]>;
    for (const cat of categories) {
      grouped[cat] = [];
    }
    for (const s of this.getAll()) {
      grouped[s.category].push(s);
    }
    return grouped;
  }

  /**
   * Get shortcuts grouped by context.
   */
  getGroupedByContext(): Record<ShortcutContext, ShortcutDefinition[]> {
    const contexts: ShortcutContext[] = [
      "global",
      "chat",
      "editor",
      "sidebar",
      "modal",
      "command-palette",
    ];
    const grouped: Record<ShortcutContext, ShortcutDefinition[]> = {} as Record<
      ShortcutContext,
      ShortcutDefinition[]
    >;
    for (const ctx of contexts) {
      grouped[ctx] = [];
    }
    for (const s of this.getAll()) {
      grouped[s.context].push(s);
    }
    return grouped;
  }

  /**
   * Get all shortcuts that belong to a specific preset.
   */
  getByPreset(presetName: string): ShortcutDefinition[] {
    return this.getAll().filter((s) => s.preset === presetName);
  }

  /**
   * Check whether a shortcut ID is registered.
   */
  has(id: string): boolean {
    return this.shortcuts.has(id);
  }

  /**
   * Get the total count of registered shortcuts.
   */
  get size(): number {
    return this.shortcuts.size;
  }

  // --------------------------------------------------------------------------
  // Update
  // --------------------------------------------------------------------------

  /**
   * Update the key binding of a shortcut.
   */
  updateKeys(id: string, newKeys: string): boolean {
    const def = this.shortcuts.get(id);
    if (!def) return false;
    def.keys = newKeys;
    return true;
  }

  /**
   * Enable or disable a shortcut.
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const def = this.shortcuts.get(id);
    if (!def) return false;
    def.enabled = enabled;
    return true;
  }

  /**
   * Update the action handler for a shortcut.
   */
  setAction(id: string, action: ShortcutAction): boolean {
    const def = this.shortcuts.get(id);
    if (!def) return false;
    def.action = action;
    return true;
  }

  /**
   * Update the priority of a shortcut.
   */
  setPriority(id: string, priority: number): boolean {
    const def = this.shortcuts.get(id);
    if (!def) return false;
    def.priority = priority;
    return true;
  }

  // --------------------------------------------------------------------------
  // Conflict Detection
  // --------------------------------------------------------------------------

  /**
   * Detect all conflicting shortcuts (same normalized keys in the same context).
   * Returns an array of conflict descriptors.
   */
  detectConflicts(): ShortcutConflict[] {
    // Build a map of (normalizedKey + context) -> shortcuts
    const keyContextMap = new Map<string, ShortcutDefinition[]>();

    const allDefs = Array.from(this.shortcuts.values());
    for (const def of allDefs) {
      if (!def.enabled) continue;
      const normalized = normalizeKeyCombo(def.keys);
      const mapKey = `${normalized}::${def.context}`;

      if (!keyContextMap.has(mapKey)) {
        keyContextMap.set(mapKey, []);
      }
      keyContextMap.get(mapKey)!.push(def);
    }

    // Also check global context conflicts with specific contexts
    const globalEntries = new Map<string, ShortcutDefinition[]>();
    for (const def of allDefs) {
      if (!def.enabled || def.context !== "global") continue;
      const normalized = normalizeKeyCombo(def.keys);
      if (!globalEntries.has(normalized)) {
        globalEntries.set(normalized, []);
      }
      globalEntries.get(normalized)!.push(def);
    }

    const conflicts: ShortcutConflict[] = [];

    // Direct context conflicts
    Array.from(keyContextMap.entries()).forEach(([mapKey, defs]) => {
      if (defs.length < 2) return;
      const [normalized, context] = mapKey.split("::");
      const sorted = [...defs].sort((a, b) => b.priority - a.priority);
      conflicts.push({
        normalizedKeys: normalized,
        shortcutIds: defs.map((d) => d.id),
        context: context as ShortcutContext,
        winnerId: sorted[0].id,
      });
    });

    // Cross-context conflicts (global vs specific)
    for (const [normalized, globalDefs] of Array.from(
      globalEntries.entries(),
    )) {
      const contexts: ShortcutContext[] = [
        "chat",
        "editor",
        "sidebar",
        "modal",
        "command-palette",
      ];
      for (const ctx of contexts) {
        const ctxKey = `${normalized}::${ctx}`;
        const ctxDefs = keyContextMap.get(ctxKey);
        if (!ctxDefs || ctxDefs.length === 0) continue;

        const combined = [...globalDefs, ...ctxDefs];
        if (combined.length < 2) continue;

        const sorted = [...combined].sort((a, b) => b.priority - a.priority);
        // Only add if not already in conflicts for this context
        const alreadyConflicted = conflicts.some(
          (c) => c.normalizedKeys === normalized && c.context === ctx,
        );
        if (!alreadyConflicted) {
          conflicts.push({
            normalizedKeys: normalized,
            shortcutIds: combined.map((d) => d.id),
            context: ctx,
            winnerId: sorted[0].id,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if a specific key combo has conflicts in a given context.
   */
  hasConflict(
    keys: string,
    context: ShortcutContext,
    excludeId?: string,
  ): boolean {
    const normalized = normalizeKeyCombo(keys);
    let count = 0;

    const allDefs = Array.from(this.shortcuts.values());
    for (const def of allDefs) {
      if (!def.enabled) continue;
      if (excludeId && def.id === excludeId) continue;
      if (def.context !== context && def.context !== "global") continue;

      const defNormalized = normalizeKeyCombo(def.keys);
      if (defNormalized === normalized) {
        count++;
      }
    }

    return count > 0;
  }

  /**
   * Find which shortcut would win a conflict for a given key combo and context.
   */
  resolveConflict(
    keys: string,
    context: ShortcutContext,
  ): ShortcutDefinition | null {
    const normalized = normalizeKeyCombo(keys);
    const matching: ShortcutDefinition[] = [];

    const allDefs = Array.from(this.shortcuts.values());
    for (const def of allDefs) {
      if (!def.enabled) continue;
      if (def.context !== context && def.context !== "global") continue;

      const defNormalized = normalizeKeyCombo(def.keys);
      if (defNormalized === normalized) {
        matching.push(def);
      }
    }

    if (matching.length === 0) return null;

    // Sort by priority descending, context-specific before global
    matching.sort((a, b) => {
      // Context-specific shortcuts take precedence over global
      if (a.context === context && b.context === "global") return -1;
      if (a.context === "global" && b.context === context) return 1;
      return b.priority - a.priority;
    });

    return matching[0];
  }
}

/**
 * Create a new ShortcutRegistry instance.
 */
export function createShortcutRegistry(): ShortcutRegistry {
  return new ShortcutRegistry();
}
