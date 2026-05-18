/**
 * Shortcut Manager
 *
 * Central manager for keyboard shortcuts with preset loading, user overrides,
 * chord sequence state machine, context/scope awareness, and event handling.
 *
 * This replaces and extends the previous simple shortcut manager with
 * full preset support and chord sequences.
 */

import {
  ShortcutRegistry,
  createShortcutRegistry,
  type ShortcutDefinition,
  type ShortcutContext,
  type ShortcutConflict,
  type ShortcutRegistrationOptions,
} from "./shortcut-registry";
import {
  parseKeyCombo,
  parseChordSequence,
  matchesKeyEvent,
  normalizeKeyCombo,
  detectPlatform,
  type ParsedKey,
  type ParsedChord,
  type Platform,
} from "./key-parser";
import {
  type ShortcutPreset,
  type UserShortcutOverrides,
  presetToRegistrationOptions,
  applyUserOverrides,
  createEmptyOverrides,
  getPreset,
} from "./presets";

// ============================================================================
// Types
// ============================================================================

export interface ShortcutManagerOptions {
  /** Whether the manager is enabled (default: true) */
  enabled?: boolean;
  /** Whether to ignore events in input/textarea elements (default: true) */
  ignoreInputs?: boolean;
  /** Timeout for chord sequences in milliseconds (default: 1500) */
  chordTimeout?: number;
  /** Platform override (defaults to auto-detect) */
  platform?: Platform;
}

export type ShortcutEventResult = {
  /** Whether a shortcut was matched and handled */
  handled: boolean;
  /** The shortcut definition that was matched, if any */
  shortcut?: ShortcutDefinition;
  /** Whether we are in the middle of a chord sequence */
  pendingChord: boolean;
};

/** State for the chord sequence state machine */
interface ChordState {
  /** The chord steps already matched */
  matchedSteps: ParsedKey[];
  /** The full chord being tracked */
  chord: ParsedChord | null;
  /** Timer for chord timeout */
  timer: ReturnType<typeof setTimeout> | null;
  /** The shortcut IDs that could match */
  candidateIds: string[];
}

// ============================================================================
// Manager Class
// ============================================================================

export class ShortcutManager {
  private registry: ShortcutRegistry;
  private activeContexts: Set<ShortcutContext> = new Set<ShortcutContext>([
    "global",
  ]);
  private enabled: boolean = true;
  private ignoreInputs: boolean = true;
  private chordTimeout: number = 1500;
  private platform: Platform;
  private currentPreset: string | null = null;
  private userOverrides: UserShortcutOverrides = createEmptyOverrides();

  /** Chord state machine */
  private chordState: ChordState = {
    matchedSteps: [],
    chord: null,
    timer: null,
    candidateIds: [],
  };

  /** Event listener references for cleanup */
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private focusInHandler: ((event: FocusEvent) => void) | null = null;
  private focusOutHandler: (() => void) | null = null;
  private isInputFocused: boolean = false;

  constructor(options: ShortcutManagerOptions = {}) {
    this.registry = createShortcutRegistry();
    this.enabled = options.enabled ?? true;
    this.ignoreInputs = options.ignoreInputs ?? true;
    this.chordTimeout = options.chordTimeout ?? 1500;
    this.platform = options.platform ?? detectPlatform();
  }

  // --------------------------------------------------------------------------
  // Registry Access
  // --------------------------------------------------------------------------

  /**
   * Get the underlying registry.
   */
  getRegistry(): ShortcutRegistry {
    return this.registry;
  }

  // --------------------------------------------------------------------------
  // Preset Management
  // --------------------------------------------------------------------------

  /**
   * Load a shortcut preset by name.
   * Clears the registry first and loads all shortcuts from the preset.
   *
   * @param presetName - Name of the preset (e.g., "nchat", "slack")
   * @returns true if the preset was found and loaded
   */
  loadPreset(presetName: string): boolean {
    const preset = getPreset(presetName);
    if (!preset) return false;

    this.registry.clear();
    this.currentPreset = presetName;

    let options = presetToRegistrationOptions(preset);

    // Apply user overrides if any
    if (
      Object.keys(this.userOverrides.keyOverrides).length > 0 ||
      this.userOverrides.disabledIds.size > 0
    ) {
      options = applyUserOverrides(options, this.userOverrides);
    }

    this.registry.registerMany(options);
    return true;
  }

  /**
   * Load a preset directly from a ShortcutPreset object.
   */
  loadPresetObject(preset: ShortcutPreset): void {
    this.registry.clear();
    this.currentPreset = preset.name;

    let options = presetToRegistrationOptions(preset);
    if (
      Object.keys(this.userOverrides.keyOverrides).length > 0 ||
      this.userOverrides.disabledIds.size > 0
    ) {
      options = applyUserOverrides(options, this.userOverrides);
    }

    this.registry.registerMany(options);
  }

  /**
   * Get the name of the currently loaded preset.
   */
  getCurrentPreset(): string | null {
    return this.currentPreset;
  }

  // --------------------------------------------------------------------------
  // User Overrides
  // --------------------------------------------------------------------------

  /**
   * Set user-level shortcut overrides.
   * Reloads the current preset with the overrides applied.
   */
  setUserOverrides(overrides: UserShortcutOverrides): void {
    this.userOverrides = overrides;

    // Re-apply current preset with new overrides
    if (this.currentPreset) {
      this.loadPreset(this.currentPreset);
    }
  }

  /**
   * Get the current user overrides.
   */
  getUserOverrides(): UserShortcutOverrides {
    return this.userOverrides;
  }

  /**
   * Override a single shortcut key binding.
   */
  overrideKey(shortcutId: string, newKeys: string): void {
    this.userOverrides.keyOverrides[shortcutId] = newKeys;

    // Update in registry directly
    this.registry.updateKeys(shortcutId, newKeys);
  }

  /**
   * Disable a specific shortcut.
   */
  disableShortcut(shortcutId: string): void {
    this.userOverrides.disabledIds.add(shortcutId);
    this.registry.setEnabled(shortcutId, false);
  }

  /**
   * Enable a previously disabled shortcut.
   */
  enableShortcut(shortcutId: string): void {
    this.userOverrides.disabledIds.delete(shortcutId);
    this.registry.setEnabled(shortcutId, true);
  }

  // --------------------------------------------------------------------------
  // Context Management
  // --------------------------------------------------------------------------

  /**
   * Add a context to the active set.
   */
  addContext(context: ShortcutContext): void {
    this.activeContexts.add(context);
  }

  /**
   * Remove a context from the active set.
   */
  removeContext(context: ShortcutContext): void {
    if (context !== "global") {
      this.activeContexts.delete(context);
    }
  }

  /**
   * Set the active contexts (global is always included).
   */
  setContexts(contexts: ShortcutContext[]): void {
    this.activeContexts = new Set<ShortcutContext>(["global", ...contexts]);
  }

  /**
   * Get the current active contexts.
   */
  getActiveContexts(): ShortcutContext[] {
    return Array.from(this.activeContexts);
  }

  /**
   * Check if a context is currently active.
   */
  isContextActive(context: ShortcutContext): boolean {
    return this.activeContexts.has(context);
  }

  // --------------------------------------------------------------------------
  // Enable/Disable
  // --------------------------------------------------------------------------

  /**
   * Enable or disable the manager globally.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if the manager is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  /**
   * Handle a keyboard event. This is the main entry point for processing
   * keyboard shortcuts.
   *
   * @param event - The KeyboardEvent to process
   * @returns Result indicating whether a shortcut was handled
   */
  handleKeyEvent(event: KeyboardEvent): ShortcutEventResult {
    if (!this.enabled) {
      return { handled: false, pendingChord: false };
    }

    // Check if we should ignore this event (input focused)
    if (this.ignoreInputs && this.isTargetInput(event)) {
      // Still allow shortcuts marked enableInInputs
      return this.processEvent(event, true);
    }

    return this.processEvent(event, false);
  }

  /**
   * Process a keyboard event against registered shortcuts.
   */
  private processEvent(
    event: KeyboardEvent,
    inputFocused: boolean,
  ): ShortcutEventResult {
    // Skip modifier-only key presses
    if (this.isModifierOnlyPress(event)) {
      return { handled: false, pendingChord: this.chordState.chord !== null };
    }

    // If we are in a chord sequence, try to continue it
    if (this.chordState.chord !== null) {
      return this.handleChordStep(event, inputFocused);
    }

    // Find all matching shortcuts for this event
    const matches = this.findMatches(event, inputFocused);

    if (matches.length === 0) {
      // Check if this could be the first step of a chord
      return this.tryStartChord(event, inputFocused);
    }

    // Execute the highest-priority match
    const winner = matches[0];

    if (winner.preventDefault) {
      event.preventDefault();
    }

    if (winner.action) {
      const result = winner.action(event);
      if (result === false) {
        return { handled: false, pendingChord: false };
      }
    }

    return { handled: true, shortcut: winner, pendingChord: false };
  }

  /**
   * Find shortcuts matching a keyboard event, sorted by priority descending.
   */
  private findMatches(
    event: KeyboardEvent,
    inputFocused: boolean,
  ): ShortcutDefinition[] {
    const all = this.registry.getAll();
    const matches: ShortcutDefinition[] = [];

    for (const def of all) {
      if (!def.enabled) continue;

      // Check context
      if (!this.activeContexts.has(def.context) && def.context !== "global")
        continue;

      // Check input focus
      if (inputFocused && !def.enableInInputs) continue;

      // Skip chord shortcuts (they're handled separately)
      const chord = parseChordSequence(def.keys);
      if (chord.isChord) continue;

      // Check if key event matches
      const parsed = parseKeyCombo(def.keys);
      if (matchesKeyEvent(event, parsed, this.platform)) {
        matches.push(def);
      }
    }

    // Sort: context-specific before global, then by priority descending
    matches.sort((a, b) => {
      if (a.context !== "global" && b.context === "global") return -1;
      if (a.context === "global" && b.context !== "global") return 1;
      return b.priority - a.priority;
    });

    return matches;
  }

  // --------------------------------------------------------------------------
  // Chord Sequence State Machine
  // --------------------------------------------------------------------------

  /**
   * Check if an event could start a new chord sequence.
   */
  private tryStartChord(
    event: KeyboardEvent,
    inputFocused: boolean,
  ): ShortcutEventResult {
    const all = this.registry.getAll();
    const candidates: Array<{ id: string; chord: ParsedChord }> = [];

    for (const def of all) {
      if (!def.enabled) continue;
      if (!this.activeContexts.has(def.context) && def.context !== "global")
        continue;
      if (inputFocused && !def.enableInInputs) continue;

      const chord = parseChordSequence(def.keys);
      if (!chord.isChord) continue;

      // Check if event matches the first step
      if (matchesKeyEvent(event, chord.steps[0], this.platform)) {
        candidates.push({ id: def.id, chord });
      }
    }

    if (candidates.length === 0) {
      return { handled: false, pendingChord: false };
    }

    // Start tracking chord
    this.chordState = {
      matchedSteps: [candidates[0].chord.steps[0]],
      chord: candidates[0].chord,
      timer: null,
      candidateIds: candidates.map((c) => c.id),
    };

    // Set timeout for chord expiry
    this.chordState.timer = setTimeout(() => {
      this.resetChord();
    }, this.chordTimeout);

    event.preventDefault();
    return { handled: false, pendingChord: true };
  }

  /**
   * Handle an event that occurs during a chord sequence.
   */
  private handleChordStep(
    event: KeyboardEvent,
    inputFocused: boolean,
  ): ShortcutEventResult {
    const { chord, matchedSteps, candidateIds } = this.chordState;

    if (!chord) {
      this.resetChord();
      return { handled: false, pendingChord: false };
    }

    const nextStepIndex = matchedSteps.length;
    if (nextStepIndex >= chord.steps.length) {
      this.resetChord();
      return { handled: false, pendingChord: false };
    }

    const nextStep = chord.steps[nextStepIndex];

    if (!matchesKeyEvent(event, nextStep, this.platform)) {
      // Event doesn't match next chord step - cancel chord
      this.resetChord();
      return { handled: false, pendingChord: false };
    }

    // Matched next step
    this.chordState.matchedSteps.push(nextStep);

    // Check if chord is complete
    if (this.chordState.matchedSteps.length === chord.steps.length) {
      // Chord complete - find and execute the shortcut
      this.resetChordTimer();

      for (const candidateId of candidateIds) {
        const def = this.registry.get(candidateId);
        if (!def || !def.enabled) continue;
        if (inputFocused && !def.enableInInputs) continue;

        if (def.preventDefault) {
          event.preventDefault();
        }

        if (def.action) {
          const result = def.action(event);
          if (result !== false) {
            this.resetChord();
            return { handled: true, shortcut: def, pendingChord: false };
          }
        } else {
          this.resetChord();
          return { handled: true, shortcut: def, pendingChord: false };
        }
      }

      this.resetChord();
      return { handled: false, pendingChord: false };
    }

    // More steps remaining
    event.preventDefault();
    return { handled: false, pendingChord: true };
  }

  /**
   * Reset the chord state machine.
   */
  private resetChord(): void {
    this.resetChordTimer();
    this.chordState = {
      matchedSteps: [],
      chord: null,
      timer: null,
      candidateIds: [],
    };
  }

  /**
   * Clear the chord timeout timer.
   */
  private resetChordTimer(): void {
    if (this.chordState.timer !== null) {
      clearTimeout(this.chordState.timer);
      this.chordState.timer = null;
    }
  }

  /**
   * Check if we are currently in a chord sequence.
   */
  isPendingChord(): boolean {
    return this.chordState.chord !== null;
  }

  /**
   * Cancel any pending chord sequence.
   */
  cancelChord(): void {
    this.resetChord();
  }

  // --------------------------------------------------------------------------
  // Conflict Detection
  // --------------------------------------------------------------------------

  /**
   * Detect conflicts in the current shortcut configuration.
   */
  detectConflicts(): ShortcutConflict[] {
    return this.registry.detectConflicts();
  }

  // --------------------------------------------------------------------------
  // DOM Integration
  // --------------------------------------------------------------------------

  /**
   * Attach keyboard event listeners to the window.
   * Call this to start listening for keyboard events.
   */
  attach(): void {
    if (typeof window === "undefined") return;

    this.keydownHandler = (event: KeyboardEvent) => {
      this.handleKeyEvent(event);
    };

    this.focusInHandler = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      const tagName = target.tagName.toLowerCase();
      this.isInputFocused =
        target.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";
    };

    this.focusOutHandler = () => {
      this.isInputFocused = false;
    };

    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("focusin", this.focusInHandler);
    window.addEventListener("focusout", this.focusOutHandler);
  }

  /**
   * Detach keyboard event listeners from the window.
   */
  detach(): void {
    if (typeof window === "undefined") return;

    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.focusInHandler) {
      window.removeEventListener("focusin", this.focusInHandler);
      this.focusInHandler = null;
    }
    if (this.focusOutHandler) {
      window.removeEventListener("focusout", this.focusOutHandler);
      this.focusOutHandler = null;
    }
  }

  /**
   * Full cleanup: detach listeners, clear registry, reset state.
   */
  destroy(): void {
    this.detach();
    this.registry.clear();
    this.resetChord();
    this.activeContexts = new Set<ShortcutContext>(["global"]);
    this.currentPreset = null;
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  /**
   * Check if the event target is an input element.
   */
  private isTargetInput(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    return (
      target.isContentEditable ||
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select"
    );
  }

  /**
   * Check if an event is a modifier-only key press.
   */
  private isModifierOnlyPress(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    return ["control", "alt", "shift", "meta"].includes(key);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new ShortcutManager instance.
 */
export function createShortcutManager(
  options?: ShortcutManagerOptions,
): ShortcutManager {
  return new ShortcutManager(options);
}

// ============================================================================
// Singleton
// ============================================================================

let globalManager: ShortcutManager | null = null;

/**
 * Get the global ShortcutManager singleton.
 */
export function getGlobalShortcutManager(): ShortcutManager {
  if (!globalManager) {
    globalManager = new ShortcutManager();
  }
  return globalManager;
}

/**
 * Destroy the global ShortcutManager singleton.
 */
export function destroyGlobalShortcutManager(): void {
  if (globalManager) {
    globalManager.destroy();
    globalManager = null;
  }
}
