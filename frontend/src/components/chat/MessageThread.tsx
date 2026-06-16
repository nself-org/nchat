"use client";

/**
 * MessageThread — 7-state AsyncScreen surface for the main message area.
 *
 * Purpose: Render channel messages with cursor-based pagination, optimistic
 *          send, rollback on failure, and all 7 async states.
 * Inputs:  channelId, auth/permission state, subscription status.
 * Outputs: Paginated message list or appropriate async state UI.
 * Constraints:
 *   - Load last 50 messages on open; cursor-based "Load earlier" prepend.
 *   - AbortController cancels concurrent "Load earlier" fetches.
 *   - Optimistic send: message appears instantly; 500 → remove + toast.
 *   - Rate-limited: 429 → countdown toast; no duplicate send on retry.
 *   - Offline (network or Hasura): input shows tooltip; send blocked.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: MessageThread: 7-state: complete
 */

import * as React from "react";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useId,
} from "react";
import { Loader2, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AsyncScreen, type AsyncState } from "@/components/common/AsyncScreen";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import type { AppResult } from "@/lib/result";
import { ok, err } from "@/lib/result";

// =============================================================================
// Types
// =============================================================================

export interface ThreadMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  /** pending = optimistic, sent = confirmed, failed = rolled back */
  status: "pending" | "sent" | "failed";
}

export interface MessageThreadProps {
  channelId: string;
  channelName?: string;
  /** Current user's auth JWT; null = unauthenticated */
  jwt: string | null;
  /** Whether user is a member of this channel */
  isMember: boolean;
  className?: string;
  /** Injected for testing */
  _fetchMessages?: (
    channelId: string,
    cursor: string | null,
    limit: number,
    signal: AbortSignal,
  ) => Promise<AppResult<{ messages: ThreadMessage[]; nextCursor: string | null }>>;
  _sendMessage?: (
    channelId: string,
    content: string,
    jwt: string,
  ) => Promise<AppResult<ThreadMessage>>;
  _onLoginRedirect?: () => void;
  _onRequestAccess?: () => void;
  _onToast?: (msg: string) => void;
  /** Override isOffline for testing (bypasses useSubscriptionStatus) */
  _isOfflineOverride?: boolean;
}

// =============================================================================
// Defaults (real implementations use Apollo / nSelf plugin)
// =============================================================================

async function defaultFetchMessages(
  _channelId: string,
  _cursor: string | null,
  _limit: number,
  _signal: AbortSignal,
): Promise<AppResult<{ messages: ThreadMessage[]; nextCursor: string | null }>> {
  return ok({ messages: [], nextCursor: null });
}

async function defaultSendMessage(
  _channelId: string,
  _content: string,
  _jwt: string,
): Promise<AppResult<ThreadMessage>> {
  return err({ code: "unknown", message: "No send implementation" });
}

// =============================================================================
// Component
// =============================================================================

export function MessageThread({
  channelId,
  channelName,
  jwt,
  isMember,
  className,
  _fetchMessages = defaultFetchMessages,
  _sendMessage = defaultSendMessage,
  _onLoginRedirect,
  _onRequestAccess,
  _onToast,
  _isOfflineOverride,
}: MessageThreadProps) {
  const subStatus = useSubscriptionStatus();
  const isOffline = _isOfflineOverride !== undefined ? _isOfflineOverride : subStatus.isOffline;
  const isReconnecting = subStatus.isReconnecting;
  const networkOnline = subStatus.networkOnline;

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [screenState, setScreenState] = useState<AsyncState>("loading");
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [rateLimitMs, setRateLimitMs] = useState<number | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const inputId = useId();

  // Determine permission state
  const permissionState: AsyncState = !jwt
    ? "permission-denied"
    : !isMember
      ? "permission-denied"
      : "loading";

  const permissionKind = !jwt ? "unauthenticated" : "unauthorized";

  // Initial load
  useEffect(() => {
    if (!jwt || !isMember) return;

    setScreenState("loading");
    const controller = new AbortController();

    _fetchMessages(channelId, null, 50, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) {
          setMessages(result.value.messages);
          setCursor(result.value.nextCursor);
          setHasMore(result.value.nextCursor !== null);
          setScreenState(result.value.messages.length === 0 ? "empty" : "connected");
        } else {
          const code = result.error.code;
          if (code === "permission_denied" || code === "unauthenticated") {
            setScreenState("permission-denied");
          } else {
            setScreenState("error");
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setScreenState("error");
      });

    return () => controller.abort();
  }, [channelId, jwt, isMember, _fetchMessages]);

  // Override screen state when offline
  useEffect(() => {
    if (isOffline && screenState === "connected") {
      setScreenState("offline");
    } else if (!isOffline && screenState === "offline") {
      setScreenState("connected");
    }
  }, [isOffline, screenState]);

  // Load earlier messages (cursor-based, with AbortController)
  const loadEarlier = useCallback(async () => {
    if (!cursor || loadingEarlier || !jwt) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoadingEarlier(true);
    try {
      const result = await _fetchMessages(channelId, cursor, 50, signal);
      if (signal.aborted) return;
      if (result.ok) {
        setMessages((prev) => [...result.value.messages, ...prev]);
        setCursor(result.value.nextCursor);
        setHasMore(result.value.nextCursor !== null);
      }
    } finally {
      if (!signal.aborted) setLoadingEarlier(false);
    }
  }, [cursor, loadingEarlier, jwt, channelId, _fetchMessages]);

  // Optimistic send
  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || !jwt || isOffline) return;
    if (rateLimitMs !== undefined && rateLimitMs > 0) return; // countdown active

    const tempId = `optimistic-${Date.now()}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      content,
      authorId: "me",
      authorName: "You",
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    setInputValue("");
    setMessages((prev) => [...prev, optimistic]);

    const result = await _sendMessage(channelId, content, jwt);

    if (result.ok) {
      // Replace optimistic with confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...result.value, status: "sent" } : m,
        ),
      );
    } else {
      // Roll back — remove optimistic message entirely
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      if (result.error.code === "rate_limited") {
        setRateLimitMs(result.error.retryAfterMs ?? 5000);
        setScreenState("rate-limited");
        return;
      }
      _onToast?.("Failed — tap to retry");
    }
  }, [inputValue, jwt, isOffline, rateLimitMs, channelId, _sendMessage, _onToast]);

  // Decide actual state to render
  const activeState: AsyncState =
    !jwt || !isMember ? permissionState : screenState;

  return (
    <AsyncScreen
      state={activeState}
      permissionKind={permissionKind}
      channelName={channelName}
      onLoginRedirect={_onLoginRedirect}
      onRequestAccess={_onRequestAccess}
      isNetworkOffline={!networkOnline}
      isReconnecting={isReconnecting}
      rateLimitRetryAfterMs={rateLimitMs}
      onRateLimitRetry={() => {
        setRateLimitMs(undefined);
        setScreenState("connected");
      }}
      className={cn("flex flex-col h-full", className)}
    >
      {/* Load earlier button */}
      {hasMore && activeState === "connected" && (
        <div className="flex justify-center border-b py-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadEarlier}
            disabled={loadingEarlier}
            aria-label="Load earlier messages"
          >
            {loadingEarlier ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronUp className="mr-2 h-3.5 w-3.5" />
            )}
            Load earlier
          </Button>
        </div>
      )}

      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        data-testid="message-thread-list"
        role="log"
        aria-live="polite"
        aria-label={channelName ? `Messages in #${channelName}` : "Messages"}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`message-${msg.id}`}
            data-status={msg.status}
            className={cn(
              "flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm",
              msg.status === "pending" && "opacity-70",
              msg.status === "failed" && "bg-destructive/10 text-destructive",
            )}
          >
            <span className="font-medium">{msg.authorName}</span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

      {/* Message input */}
      <div className="border-t p-3" data-testid="message-input-area">
        <div className="relative flex gap-2">
          <input
            id={inputId}
            type="text"
            className={cn(
              "flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
              isOffline && "cursor-not-allowed opacity-50",
            )}
            placeholder={
              isOffline ? "You're offline" : `Message ${channelName ? "#" + channelName : "this channel"}`
            }
            disabled={isOffline}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            aria-label={isOffline ? "You're offline" : "Message input"}
            title={isOffline ? "You're offline" : undefined}
            data-testid="message-input"
          />
          <Button
            size="sm"
            disabled={isOffline || !inputValue.trim()}
            onClick={() => void handleSend()}
            data-testid="send-button"
          >
            Send
          </Button>
        </div>
      </div>
    </AsyncScreen>
  );
}
