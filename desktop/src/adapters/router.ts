/**
 * Desktop (Tauri) router adapter.
 *
 * Implements the @nself-chat/ui RouterAdapter interface using the
 * browser History API. Tauri apps run as a single-page app so
 * history.pushState / window.location give us hash-based or path-based
 * in-app navigation without a full-page reload.
 */

import React from 'react';
import { RouterAdapterContext, type RouterAdapter } from '@nself-chat/ui/adapters';

// ---------------------------------------------------------------------------
// Parse query string into a plain record
// ---------------------------------------------------------------------------

function parseQuery(): Record<string, string | string[]> {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Desktop RouterAdapter implementation (module-level singleton for stable identity)
// ---------------------------------------------------------------------------

export const desktopRouterAdapter: RouterAdapter = {
  push(path: string) {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  },
  replace(path: string) {
    window.history.replaceState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  },
  back() {
    window.history.back();
  },
  get query() {
    return parseQuery();
  },
};

// ---------------------------------------------------------------------------
// Provider component — wrap the Tauri app root with this
// ---------------------------------------------------------------------------

export function DesktopRouterProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(
    RouterAdapterContext.Provider,
    { value: desktopRouterAdapter },
    children,
  );
}
