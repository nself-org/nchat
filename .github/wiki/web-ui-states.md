# Web UI States — 7-State AsyncScreen Contract

All nchat web SaaS surfaces (chat.nself.org) implement a consistent 7-state async
contract via the `AsyncScreen` component. This document is the canonical reference
for the contract, the state machine, and per-surface behavior.

---

## The 7 States

| State | When | UI Shown |
|---|---|---|
| `loading` | Data fetch in progress | Skeleton placeholder |
| `empty` | Fetch complete; zero items | Empty state illustration + message |
| `error` | Fetch failed | Error message + Retry button |
| `permission-denied` | Auth/authz failure | Login prompt OR access-request CTA |
| `rate-limited` | 429 from send | Countdown toast; input blocked |
| `offline` | Network down OR Hasura disconnected | Offline/Reconnecting banner |
| `connected` | Data loaded; WS healthy | Normal surface UI + children |

---

## Permission-Denied: Two Distinct States

The `permission-denied` state has two sub-types that MUST show distinct UX:

| Sub-type | Trigger | UI |
|---|---|---|
| `unauthenticated` | No valid JWT | "Sign in to continue" + Sign in button (→ login redirect) |
| `unauthorized` | Valid JWT, not a channel member | "You don't have access to #channel-name. Request access from a workspace admin." + Request access button |

These must never show the same message. `data-testid="async-screen-unauthenticated"` vs
`data-testid="async-screen-unauthorized"` distinguish them in tests.

---

## Offline State: Two Causes

The "offline" state wraps both network-level and Hasura-level disconnections:

| Cause | Detection | Banner |
|---|---|---|
| `navigator.onLine = false` | `useOnlineStatus` / window `offline` event | "You're offline — messages will send when you reconnect" |
| Hasura WS disconnected | `useSubscriptionStatus` `hasuraState = disconnected` | Same offline banner |
| Hasura WS reconnecting | `useSubscriptionStatus` `hasuraState = reconnecting` | "Reconnecting…" spinner banner |

Children (message list) remain mounted during offline/reconnecting — users can read cached messages.
The message input shows `"You're offline"` placeholder and is disabled.

### useSubscriptionStatus

`src/hooks/useSubscriptionStatus.ts` monitors the Apollo GraphQL WebSocket link:

```typescript
export type HasuraLinkState = "connected" | "reconnecting" | "disconnected";

export interface SubscriptionStatus {
  hasuraState: HasuraLinkState;
  networkOnline: boolean;
  isOffline: boolean;       // !networkOnline || reconnecting || disconnected
  isReconnecting: boolean;
  isConnected: boolean;
  lastConnectedAt: string | null;
  disconnectedAt: string | null;
}
```

Detection uses WS lifecycle events (`connected`, `connecting`, `closed`, `error`) from the
graphql-ws client attached to the Apollo link. A 2-second debounce transitions
`reconnecting → disconnected` to avoid flicker on brief interruptions.

---

## 7 Surfaces

| Surface | Component | Source |
|---|---|---|
| Channel list | `ChannelListAsync` | `src/components/channel/ChannelListAsync.tsx` |
| Message thread | `MessageThread` | `src/components/chat/MessageThread.tsx` |
| Workspace switcher | `WorkspaceSwitcherAsync` | `src/components/workspace/WorkspaceSwitcherAsync.tsx` |
| Member list | `MemberListAsync` | `src/components/channel/MemberListAsync.tsx` |
| Direct messages | `DMListAsync` | `src/components/dm/DMListAsync.tsx` |
| Notification feed | `NotificationFeedAsync` | `src/components/notifications/NotificationFeedAsync.tsx` |
| Settings panel | `SettingsPanelAsync` | `src/components/settings/SettingsPanelAsync.tsx` |

All surfaces wrap `AsyncScreen` from `src/components/common/AsyncScreen.tsx`.

---

## MessageThread — Pagination and Optimistic Send

### Cursor-based Pagination

- Initial load: last 50 messages.
- "Load earlier" button prepends older messages.
- Each load uses a dedicated `AbortController`; clicking "Load earlier" again cancels any
  in-flight fetch (prevents race conditions and duplicate prepends).

### Optimistic Message Send

1. User submits → message appended with `status: "pending"` (slightly dimmed).
2. `_sendMessage` called with channel ID + content + JWT.
3. On success: optimistic message replaced with confirmed `status: "sent"`.
4. On failure (500): optimistic message **removed from DOM** (not hidden with `display:none`).
   Toast: `"Failed — tap to retry"`.
5. On 429 rate-limit: message NOT sent; countdown shown; no duplicate on retry.

---

## AsyncScreen Component API

```typescript
<AsyncScreen
  state={state}                   // AsyncState
  permissionKind="unauthorized"   // "unauthenticated" | "unauthorized"
  channelName="general"           // shown in permission-denied copy
  onLoginRedirect={fn}
  onRequestAccess={fn}
  isNetworkOffline={bool}
  isReconnecting={bool}
  rateLimitRetryAfterMs={number}
  onRateLimitRetry={fn}
  loadingSlot={<MySkeleton />}    // override the loading state UI
  emptyTitle="No channels yet"
  emptyMessage="Create one to get started."
  error={error}
  onRetry={fn}
>
  {/* rendered when state = "connected" or "offline" */}
  <MyContent />
</AsyncScreen>
```

---

## Typed Result

`src/lib/result.ts` exports a `Result<T, E>` monad used throughout all async data calls:

```typescript
type Result<T, E = Error> = Ok<T> | Err<E>;

ok(value)         // constructs Ok<T>
err(error)        // constructs Err<E>
tryAsync(fn)      // wraps async calls; catches thrown errors → Err
matchResult(...)  // exhaustive Ok/Err handling
```

`AppResult<T>` narrows `E` to `AppError` with a `GraphQLErrorCode`:
`permission_denied | unauthenticated | not_found | rate_limited | network_error | unknown`.

---

## Test Coverage

`src/components/common/__tests__/AsyncScreen.test.tsx` — 7 surfaces × 7 states = **49 core assertions**.

Additional tests:
- MessageThread cursor pagination with AbortController cancellation
- MessageThread optimistic send: failure removes message + fires toast
- `useSubscriptionStatus`: 2-second reconnecting → disconnected transition
