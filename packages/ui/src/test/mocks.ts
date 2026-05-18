/**
 * Shared mock adapters for @nself-chat/ui tests and Storybook.
 *
 * @module test/mocks
 */

import { vi } from 'vitest';
import type { RouterAdapter } from '../adapters/router';

// ============================================================================
// Router mock
// ============================================================================

/**
 * Creates a vi-mocked RouterAdapter for use in unit tests.
 *
 * @example
 * ```tsx
 * const router = createMockRouter({ pathname: '/chat' });
 * render(
 *   <RouterAdapterContext.Provider value={router}>
 *     <Component />
 *   </RouterAdapterContext.Provider>
 * );
 * expect(router.push).toHaveBeenCalledWith('/login?returnTo=%2Fchat');
 * ```
 */
export function createMockRouter(overrides?: Partial<RouterAdapter>): RouterAdapter {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    query: {},
    pathname: '/',
    ...overrides,
  };
}

// ============================================================================
// Auth context mock values
// ============================================================================

/**
 * Minimal auth state shape used by auth guard components.
 * Mirrors the relevant fields from AuthContext (not a full import).
 */
export interface MockAuthState {
  user: { id: string; email: string; role?: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const mockAuthenticatedUser: MockAuthState = {
  user: { id: 'usr_test01', email: 'test@nself.org', role: 'member' },
  loading: false,
  signOut: vi.fn(async () => {}),
};

export const mockUnauthenticatedState: MockAuthState = {
  user: null,
  loading: false,
  signOut: vi.fn(async () => {}),
};

export const mockLoadingState: MockAuthState = {
  user: null,
  loading: true,
  signOut: vi.fn(async () => {}),
};
