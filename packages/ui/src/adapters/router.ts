/**
 * RouterAdapter — injectable router abstraction for @nself-chat/ui
 *
 * Decouples shared components from any specific router implementation
 * (Next.js App Router, React Router, in-app Tauri state router, etc.).
 * Consumers inject a RouterAdapter implementation via RouterAdapterContext.
 *
 * @module adapters/router
 */

import { createContext, useContext } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal router interface required by @nself-chat/ui components.
 * Intentionally small — only what components actually use.
 */
export interface RouterAdapter {
  /**
   * Navigate to a new route, adding it to the browser history.
   * @param path - The target path (e.g. '/chat/general')
   */
  push(path: string): void;

  /**
   * Navigate to a new route, replacing the current history entry.
   * @param path - The target path
   */
  replace(path: string): void;

  /** Navigate back one entry in history */
  back(): void;

  /**
   * Current URL query parameters as a plain object.
   * Values can be string (single) or string[] (multi-value).
   */
  query: Record<string, string | string[]>;

  /**
   * Current pathname (e.g. '/chat/general')
   * Used by guards to build returnTo URLs.
   */
  pathname?: string;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Context that provides the RouterAdapter to all @nself-chat/ui components.
 * Must be set up by the consuming application at its root.
 */
export const RouterAdapterContext = createContext<RouterAdapter | null>(null);

RouterAdapterContext.displayName = 'RouterAdapterContext';

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the RouterAdapter injected by the consuming application.
 *
 * @throws {Error} When called outside a RouterAdapterContext provider
 * @example
 * ```tsx
 * function MyGuard({ children }: { children: React.ReactNode }) {
 *   const router = useRouter();
 *   // router.push('/login')
 * }
 * ```
 */
export function useRouter(): RouterAdapter {
  const adapter = useContext(RouterAdapterContext);
  if (!adapter) {
    throw new Error(
      '[useRouter] No RouterAdapter found. ' +
        'Wrap your app with <RouterAdapterContext.Provider value={adapter}>.</RouterAdapterContext.Provider>'
    );
  }
  return adapter;
}

// ============================================================================
// No-op adapter (for testing / Storybook)
// ============================================================================

/**
 * A no-op RouterAdapter suitable for Storybook and unit tests.
 * Logs calls to console.debug — never throws.
 *
 * @example
 * ```tsx
 * // In Storybook preview.tsx or test setup:
 * <RouterAdapterContext.Provider value={noopRouterAdapter}>
 *   <Story />
 * </RouterAdapterContext.Provider>
 * ```
 */
export const noopRouterAdapter: RouterAdapter = {
  push: (path) => console.debug('[noop router] push:', path),
  replace: (path) => console.debug('[noop router] replace:', path),
  back: () => console.debug('[noop router] back'),
  query: {},
  pathname: '/',
};
