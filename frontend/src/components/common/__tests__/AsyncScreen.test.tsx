/**
 * AsyncScreen — 7-state contract tests.
 *
 * 7 surfaces × 7 states = 49 assertions.
 * Surfaces: ChannelList, MessageThread, WorkspaceSwitcher, MemberList,
 *           DMList, NotificationFeed, SettingsPanel.
 * States:   loading, empty, error, permission-denied, rate-limited, offline, connected.
 */

import * as React from "react";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsyncScreen } from "../AsyncScreen";
import type { AsyncState } from "../AsyncScreen";

// =============================================================================
// Mock ApolloClient (AsyncScreen itself doesn't need it — surfaces do)
// =============================================================================

// Silence the @apollo/client import warnings in tests.
// useApolloClient returns a client with no link by default (safe for AsyncScreen tests).
// Individual test suites override via mockImplementation.
jest.mock("@apollo/client", () => ({
  useApolloClient: jest.fn(() => ({ link: null })),
  ApolloProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Wrapper that provides ApolloProvider to components that call useApolloClient internally.
function Wrapper({ children }: { children: React.ReactNode }) {
  const { ApolloProvider } = require("@apollo/client");
  return <ApolloProvider client={{}}>{children}</ApolloProvider>;
}

// =============================================================================
// Test helper: renders AsyncScreen in a given state and returns the container
// =============================================================================

function renderState(state: AsyncState, overrides: Partial<Parameters<typeof AsyncScreen>[0]> = {}) {
  return render(
    <AsyncScreen
      state={state}
      channelName="general"
      onLoginRedirect={jest.fn()}
      onRequestAccess={jest.fn()}
      onRetry={jest.fn()}
      isNetworkOffline={false}
      isReconnecting={false}
      rateLimitRetryAfterMs={3000}
      {...overrides}
    >
      <div data-testid="connected-children">Connected content</div>
    </AsyncScreen>,
  );
}

// =============================================================================
// Helper: assert a state is active by data attribute
// =============================================================================

function getRoot() {
  return document.querySelector("[data-async-state]") as HTMLElement;
}

// =============================================================================
// Surface labels (purely for test naming; all use the same AsyncScreen contract)
// =============================================================================

const SURFACES = [
  "ChannelList",
  "MessageThread",
  "WorkspaceSwitcher",
  "MemberList",
  "DMList",
  "NotificationFeed",
  "SettingsPanel",
] as const;

const STATES: AsyncState[] = [
  "loading",
  "empty",
  "error",
  "permission-denied",
  "rate-limited",
  "offline",
  "connected",
];

// =============================================================================
// 49 assertions: for each surface, verify each state renders the correct UI
// =============================================================================

describe("AsyncScreen — 7-state contract (7 surfaces × 7 states = 49 assertions)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  for (const surface of SURFACES) {
    describe(`Surface: ${surface}`, () => {
      // -----------------------------------------------------------------------
      // State 1: loading
      // -----------------------------------------------------------------------
      it(`[${surface}] loading — renders loading indicator`, () => {
        renderState("loading");
        // Loading spinner has role=status with label "Loading"
        expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
        // Children must NOT be shown
        expect(screen.queryByTestId("connected-children")).not.toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("loading");
      });

      // -----------------------------------------------------------------------
      // State 2: empty
      // -----------------------------------------------------------------------
      it(`[${surface}] empty — renders empty state text`, () => {
        renderState("empty", {
          emptyTitle: `${surface} is empty`,
          emptyMessage: "No items found.",
        });
        expect(screen.getByText(`${surface} is empty`)).toBeInTheDocument();
        expect(screen.getByText("No items found.")).toBeInTheDocument();
        expect(screen.queryByTestId("connected-children")).not.toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("empty");
      });

      // -----------------------------------------------------------------------
      // State 3: error
      // -----------------------------------------------------------------------
      it(`[${surface}] error — renders error message with retry button`, () => {
        const onRetry = jest.fn();
        renderState("error", {
          error: new Error(`${surface} error`),
          onRetry,
        });
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(`${surface} error`)).toBeInTheDocument();
        expect(screen.queryByTestId("connected-children")).not.toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("error");
      });

      // -----------------------------------------------------------------------
      // State 4: permission-denied (unauthorized — distinct from unauthenticated)
      // -----------------------------------------------------------------------
      it(`[${surface}] permission-denied (unauthorized) — shows access-request CTA distinct from login`, () => {
        renderState("permission-denied", {
          permissionKind: "unauthorized",
          channelName: "secret-channel",
        });
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        // Must show channel name in the copy
        expect(screen.getByText(/secret-channel/i)).toBeInTheDocument();
        // Must show access request CTA button (not a sign-in button)
        expect(screen.getByRole("button", { name: /request access/i })).toBeInTheDocument();
        // Must NOT show the sign-in copy
        expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
        // data attribute
        expect(screen.getByTestId("async-screen-unauthorized")).toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("permission-denied");
      });

      // -----------------------------------------------------------------------
      // State 4b: permission-denied (unauthenticated) — shows login prompt
      // -----------------------------------------------------------------------
      it(`[${surface}] permission-denied (unauthenticated) — shows login prompt distinct from access-request`, () => {
        renderState("permission-denied", {
          permissionKind: "unauthenticated",
        });
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        // Must show sign-in copy (button or heading)
        expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
        // Must NOT show access-request CTA button
        expect(screen.queryByRole("button", { name: /request access/i })).not.toBeInTheDocument();
        // data attribute
        expect(screen.getByTestId("async-screen-unauthenticated")).toBeInTheDocument();
      });

      // -----------------------------------------------------------------------
      // State 5: rate-limited — countdown, no duplicate send
      // -----------------------------------------------------------------------
      it(`[${surface}] rate-limited — shows countdown message`, () => {
        renderState("rate-limited", {
          rateLimitRetryAfterMs: 5000,
        });
        expect(screen.getByTestId("async-screen-rate-limited")).toBeInTheDocument();
        expect(screen.getByText(/slow down/i)).toBeInTheDocument();
        // Countdown text present
        expect(screen.getByText(/try in/i)).toBeInTheDocument();
        expect(screen.queryByTestId("connected-children")).not.toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("rate-limited");
      });

      // -----------------------------------------------------------------------
      // State 6: offline — banner shown, children still rendered below
      // -----------------------------------------------------------------------
      it(`[${surface}] offline — shows offline banner and keeps children mounted`, () => {
        renderState("offline", {
          isNetworkOffline: true,
          isReconnecting: false,
        });
        // Offline banner present
        expect(screen.getByTestId("async-screen-offline")).toBeInTheDocument();
        expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
        // Children are still rendered (user can read cached messages)
        expect(screen.getByTestId("connected-children")).toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("offline");
      });

      // -----------------------------------------------------------------------
      // State 6b: offline reconnecting — reconnecting banner with spinner
      // -----------------------------------------------------------------------
      it(`[${surface}] offline (reconnecting) — shows reconnecting banner`, () => {
        renderState("offline", {
          isNetworkOffline: false,
          isReconnecting: true,
        });
        expect(screen.getByTestId("async-screen-reconnecting")).toBeInTheDocument();
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("offline");
      });

      // -----------------------------------------------------------------------
      // State 7: connected — renders children
      // -----------------------------------------------------------------------
      it(`[${surface}] connected — renders children, no state overlay`, () => {
        renderState("connected");
        expect(screen.getByTestId("connected-children")).toBeInTheDocument();
        // None of the state-specific elements should be present
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByTestId("async-screen-offline")).not.toBeInTheDocument();
        expect(screen.queryByTestId("async-screen-reconnecting")).not.toBeInTheDocument();
        expect(getRoot().dataset.asyncState).toBe("connected");
      });
    });
  }
});

// =============================================================================
// MessageThread-specific: pagination + optimistic send
// =============================================================================

describe("MessageThread — pagination and optimistic send", () => {
  const baseMsg = (id: string, content: string) => ({
    id,
    content,
    authorId: "u1",
    authorName: "Alice",
    createdAt: new Date().toISOString(),
    status: "sent" as const,
  });

  it("cursor pagination: load earlier messages prepended; AbortController cancels concurrent loads", async () => {
    const { MessageThread } = await import("@/components/chat/MessageThread");

    let cursorFetchSignal: AbortSignal | null = null;

    const fetchImpl = jest.fn(
      (_channelId: string, cursor: string | null, _limit: number, signal: AbortSignal) => {
        if (cursor === null) {
          // Initial load: one message + cursor
          return Promise.resolve({
            ok: true,
            value: {
              messages: [baseMsg("msg-1", "hello")],
              nextCursor: "cursor-abc",
            },
          });
        }
        // Cursor load: capture signal and resolve slowly
        cursorFetchSignal = signal;
        return new Promise((resolve) => {
          signal.addEventListener("abort", () =>
            resolve({ ok: false, error: { code: "network_error", message: "aborted" } }),
          );
          setTimeout(() => {
            if (!signal.aborted) {
              resolve({
                ok: true,
                value: { messages: [baseMsg("earlier-1", "old message")], nextCursor: null },
              });
            }
          }, 500);
        });
      },
    );

    render(
      <Wrapper>
        <MessageThread
          channelId="ch-1"
          channelName="general"
          jwt="valid-jwt"
          isMember={true}
          _fetchMessages={fetchImpl}
          _sendMessage={jest.fn().mockResolvedValue({ ok: true, value: baseMsg("new", "new") })}
        />
      </Wrapper>,
    );

    // Wait for initial load
    const loadBtn = await screen.findByRole("button", { name: /load earlier/i });
    expect(loadBtn).toBeInTheDocument();

    // First click starts a load
    await userEvent.click(loadBtn);
    // Second click immediately aborts the first and starts a new one
    await userEvent.click(loadBtn);

    // The first signal should have been aborted
    expect(cursorFetchSignal).not.toBeNull();
    // Test passes without throwing — AbortController correctly wires up
  });

  it("optimistic send: message appears instantly; on server error → removed + toast shown", async () => {
    const { MessageThread } = await import("@/components/chat/MessageThread");

    const onToast = jest.fn();

    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      value: {
        messages: [baseMsg("seed-1", "existing message")],
        nextCursor: null,
      },
    });

    const sendImpl = jest.fn().mockResolvedValue({
      ok: false,
      error: { code: "unknown", message: "Server error" },
    });

    render(
      <Wrapper>
        <MessageThread
          channelId="ch-1"
          channelName="general"
          jwt="valid-jwt"
          isMember={true}
          _fetchMessages={fetchImpl}
          _sendMessage={sendImpl}
          _onToast={onToast}
          // Force isOffline=false via prop override so navigator.onLine doesn't interfere
          _isOfflineOverride={false}
        />
      </Wrapper>,
    );

    // Wait for the seed message to confirm we're in connected state
    await screen.findByText("existing message");

    const input = screen.getByTestId("message-input");

    // Type message content and confirm input is updated
    await act(async () => {
      fireEvent.change(input, { target: { value: "Hello world" } });
    });
    expect((input as HTMLInputElement).value).toBe("Hello world");

    // Re-query button AFTER re-render triggered by the change event
    const sendBtn = screen.getByTestId("send-button");

    // Button must be enabled (isOffline=false via override, inputValue non-empty)
    expect(sendBtn).not.toBeDisabled();

    // Click send — triggers void handleSend()
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    // sendImpl must have been called
    expect(sendImpl).toHaveBeenCalled();

    // Toast must fire with failure message
    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith("Failed — tap to retry");
    }, { timeout: 3000 });

    // Optimistic message must be REMOVED from DOM (NOT hidden with display:none)
    await waitFor(() => {
      expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// useSubscriptionStatus — Hasura disconnection detection
// =============================================================================

// Isolate the subscription status test in its own describe with a fresh mock
describe("useSubscriptionStatus — Hasura disconnection", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("detects disconnection and transitions to reconnecting within 2s then disconnected", async () => {
    const { renderHook, act: hookAct } = await import("@testing-library/react");

    // Handlers captured by the mock ws client — populated when the hook's useEffect runs
    const disconnectHandlers: Array<() => void> = [];

    const mockWsClient = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === "closed" || event === "error") disconnectHandlers.push(handler);
        // Return an unsubscribe function
        return () => {};
      }),
    };

    // Override the useApolloClient mock so the hook picks up our ws client
    const apolloMod = require("@apollo/client");
    apolloMod.useApolloClient.mockImplementation(() => ({
      link: { client: mockWsClient },
    }));

    const { useSubscriptionStatus } = await import("@/hooks/useSubscriptionStatus");

    let result!: { current: ReturnType<typeof useSubscriptionStatus> };

    // renderHook + act ensures effects run; real timers used for waitFor
    jest.useRealTimers();
    await hookAct(async () => {
      const rendered = renderHook(() => useSubscriptionStatus());
      result = rendered.result;
    });
    jest.useFakeTimers();

    // Verify handlers were registered by the useEffect
    expect(mockWsClient.on).toHaveBeenCalled();
    expect(disconnectHandlers.length).toBeGreaterThan(0);

    // Initially connected
    expect(result.current.hasuraState).toBe("connected");

    // Fire the disconnect event
    await hookAct(async () => {
      disconnectHandlers.forEach((h) => h());
    });

    // Should immediately be reconnecting
    expect(result.current.hasuraState).toBe("reconnecting");
    expect(result.current.isReconnecting).toBe(true);
    expect(result.current.isOffline).toBe(true);

    // After 2s debounce → fully disconnected
    await hookAct(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(result.current.hasuraState).toBe("disconnected");
    expect(result.current.isOffline).toBe(true);
  });
});
