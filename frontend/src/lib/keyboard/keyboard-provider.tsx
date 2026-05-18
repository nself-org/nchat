"use client";

/**
 * Keyboard Provider
 *
 * Context provider that manages keyboard shortcut state and scoping.
 * Handles detecting when inputs are focused and managing active scope.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

// ============================================================================
// Types
// ============================================================================

export type KeyboardScope =
  | "global"
  | "chat"
  | "editor"
  | "modal"
  | "message-selected"
  | "message-input-empty"
  | "command-palette"
  | "search";

export interface KeyboardContextValue {
  /** Whether the keyboard shortcut system is enabled */
  isEnabled: boolean;
  /** Enable or disable the entire keyboard shortcut system */
  setEnabled: (enabled: boolean) => void;
  /** Currently active scope for scoped shortcuts */
  activeScope: KeyboardScope;
  /** Set the active scope */
  setActiveScope: (scope: KeyboardScope) => void;
  /** Push a new scope onto the stack (for modals, etc.) */
  pushScope: (scope: KeyboardScope) => void;
  /** Pop the current scope from the stack */
  popScope: () => void;
  /** Whether an input element is currently focused */
  isInputFocused: boolean;
  /** Manually set input focus state (usually handled automatically) */
  setInputFocused: (focused: boolean) => void;
  /** Stack of active scopes */
  scopeStack: KeyboardScope[];
}

// ============================================================================
// Context
// ============================================================================

const KeyboardContext = createContext<KeyboardContextValue | undefined>(
  undefined,
);

// ============================================================================
// Provider
// ============================================================================

export interface KeyboardProviderProps {
  children: ReactNode;
  /** Initial enabled state (default: true) */
  initialEnabled?: boolean;
  /** Initial scope (default: 'global') */
  initialScope?: KeyboardScope;
}

export function KeyboardProvider({
  children,
  initialEnabled = true,
  initialScope = "global",
}: KeyboardProviderProps) {
  const [isEnabled, setEnabled] = useState(initialEnabled);
  const [scopeStack, setScopeStack] = useState<KeyboardScope[]>([initialScope]);
  const [isInputFocused, setInputFocused] = useState(false);

  // Current scope is the top of the stack
  const activeScope = scopeStack[scopeStack.length - 1] || "global";

  // Set active scope (replaces entire stack with single scope)
  const setActiveScope = useCallback((scope: KeyboardScope) => {
    setScopeStack([scope]);
  }, []);

  // Push a new scope onto the stack
  const pushScope = useCallback((scope: KeyboardScope) => {
    setScopeStack((prev) => [...prev, scope]);
  }, []);

  // Pop the current scope from the stack
  const popScope = useCallback(() => {
    setScopeStack((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one scope
      return prev.slice(0, -1);
    });
  }, []);

  // Automatically detect input focus
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) {
        setInputFocused(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement | null;

      // Only set to false if we're not focusing another input
      if (relatedTarget) {
        const isInput =
          relatedTarget.tagName === "INPUT" ||
          relatedTarget.tagName === "TEXTAREA" ||
          relatedTarget.tagName === "SELECT" ||
          relatedTarget.isContentEditable;

        if (!isInput) {
          setInputFocused(false);
        }
      } else {
        setInputFocused(false);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Memoize context value
  const value = useMemo<KeyboardContextValue>(
    () => ({
      isEnabled,
      setEnabled,
      activeScope,
      setActiveScope,
      pushScope,
      popScope,
      isInputFocused,
      setInputFocused,
      scopeStack,
    }),
    [
      isEnabled,
      activeScope,
      setActiveScope,
      pushScope,
      popScope,
      isInputFocused,
      scopeStack,
    ],
  );

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the keyboard context
 *
 * @throws Error if used outside of KeyboardProvider
 *
 * @example
 * ```tsx
 * const { isEnabled, activeScope, pushScope, popScope } = useKeyboard();
 * ```
 */
export function useKeyboard(): KeyboardContextValue {
  const context = useContext(KeyboardContext);

  if (context === undefined) {
    throw new Error("useKeyboard must be used within a KeyboardProvider");
  }

  return context;
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to manage a modal's keyboard scope
 * Automatically pushes 'modal' scope when mounted and pops when unmounted
 *
 * @example
 * ```tsx
 * function MyModal({ open }: { open: boolean }) {
 *   useModalScope(open);
 *   // ...
 * }
 * ```
 */
export function useModalScope(isOpen: boolean): void {
  const { pushScope, popScope } = useKeyboard();

  useEffect(() => {
    if (isOpen) {
      pushScope("modal");
      return () => popScope();
    }
  }, [isOpen, pushScope, popScope]);
}

/**
 * Hook to temporarily disable all keyboard shortcuts
 * Useful for complex input scenarios
 *
 * @example
 * ```tsx
 * const { disable, enable, isDisabled } = useKeyboardDisable();
 * ```
 */
export function useKeyboardDisable() {
  const { isEnabled, setEnabled } = useKeyboard();

  const disable = useCallback(() => setEnabled(false), [setEnabled]);
  const enable = useCallback(() => setEnabled(true), [setEnabled]);

  return {
    disable,
    enable,
    isDisabled: !isEnabled,
  };
}

/**
 * Hook to set a specific scope while a component is mounted
 *
 * @param scope - The scope to activate
 * @param active - Whether to activate the scope (default: true)
 *
 * @example
 * ```tsx
 * // Activate 'editor' scope when editor is focused
 * useScopedKeyboard('editor', isFocused);
 * ```
 */
export function useScopedKeyboard(
  scope: KeyboardScope,
  active: boolean = true,
): void {
  const { pushScope, popScope } = useKeyboard();

  useEffect(() => {
    if (active) {
      pushScope(scope);
      return () => popScope();
    }
  }, [active, scope, pushScope, popScope]);
}
