/**
 * Platform Presence Hook Tests
 *
 * Tests the usePlatformPresence hook and related simplified hooks.
 *
 * @module hooks/__tests__/use-platform-presence.test
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { usePresenceStore } from "@/stores/presence-store";
import { useReadReceiptsStore } from "@/stores/read-receipts-store";
import {
  usePlatformPresence,
  usePresenceStatus,
  useTypingIndicator,
  useMessageReceipts,
} from "../use-platform-presence";
import {
  type PlatformPreset,
  type DeliveryStatus,
  getPlatformConfig,
} from "@/lib/presence/platform-presence";

// Mock auth context
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-user-1", email: "test@example.com" },
  }),
}));

// Reset stores before each test
beforeEach(() => {
  usePresenceStore.getState().reset();
  useReadReceiptsStore.getState().reset();
});

// ============================================================================
// PRESENCE STATUS HOOK TESTS
// ============================================================================

describe("usePresenceStatus", () => {
  test("returns offline for unknown user", () => {
    const { result } = renderHook(() => usePresenceStatus("unknown-user"));

    expect(result.current.status).toBe("offline");
    expect(result.current.isOnline).toBe(false);
  });

  test("returns correct status for known user", () => {
    // Set up presence data
    act(() => {
      usePresenceStore.getState().setUserPresence("user-1", {
        userId: "user-1",
        status: "online",
      });
    });

    const { result } = renderHook(() => usePresenceStatus("user-1"));

    expect(result.current.status).toBe("online");
    expect(result.current.isOnline).toBe(true);
  });

  test("treats DND as online", () => {
    act(() => {
      usePresenceStore.getState().setUserPresence("user-1", {
        userId: "user-1",
        status: "dnd",
      });
    });

    const { result } = renderHook(() => usePresenceStatus("user-1"));

    expect(result.current.isOnline).toBe(true);
  });

  test("returns correct color for status", () => {
    act(() => {
      usePresenceStore.getState().setUserPresence("user-1", {
        userId: "user-1",
        status: "online",
      });
    });

    const { result } = renderHook(() => usePresenceStatus("user-1"));

    expect(result.current.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("returns custom status if set", () => {
    act(() => {
      usePresenceStore.getState().setUserPresence("user-1", {
        userId: "user-1",
        status: "online",
        customStatus: { emoji: "🎯", text: "Focusing" },
      });
    });

    const { result } = renderHook(() => usePresenceStatus("user-1"));

    expect(result.current.customStatus?.emoji).toBe("🎯");
    expect(result.current.customStatus?.text).toBe("Focusing");
  });

  test.each([
    "whatsapp",
    "telegram",
    "signal",
    "slack",
    "discord",
    "default",
  ] as PlatformPreset[])("works with %s platform", (platform) => {
    act(() => {
      usePresenceStore.getState().setUserPresence("user-1", {
        userId: "user-1",
        status: "online",
      });
    });

    const { result } = renderHook(() => usePresenceStatus("user-1", platform));

    expect(result.current.status).toBe("online");
  });
});

// ============================================================================
// TYPING INDICATOR HOOK TESTS
// ============================================================================

describe("useTypingIndicator", () => {
  test("returns empty when no one typing", () => {
    const { result } = renderHook(() => useTypingIndicator("conv-1"));

    expect(result.current.users).toHaveLength(0);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.text).toBe("");
  });

  test("returns typing users", () => {
    act(() => {
      usePresenceStore.getState().setUserTyping("conv-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });
    });

    const { result } = renderHook(() => useTypingIndicator("conv-1"));

    expect(result.current.users).toHaveLength(1);
    expect(result.current.isTyping).toBe(true);
    expect(result.current.text).toContain("Alice");
  });

  test("handles multiple typers", () => {
    act(() => {
      usePresenceStore.getState().setUserTyping("conv-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });
      usePresenceStore.getState().setUserTyping("conv-1", {
        userId: "user-2",
        userName: "Bob",
        startedAt: new Date(),
      });
    });

    const { result } = renderHook(() => useTypingIndicator("conv-1"));

    expect(result.current.users).toHaveLength(2);
    expect(result.current.text).toContain("are typing");
  });

  test("returns null for null conversationId", () => {
    const { result } = renderHook(() => useTypingIndicator(null));

    expect(result.current.users).toHaveLength(0);
    expect(result.current.isTyping).toBe(false);
  });

  test("includes platform config", () => {
    const { result } = renderHook(() => useTypingIndicator("conv-1", "slack"));

    expect(result.current.config).toBeDefined();
    expect(result.current.config.timeout).toBeDefined();
  });
});

// ============================================================================
// MESSAGE RECEIPTS HOOK TESTS
// ============================================================================

describe("useMessageReceipts", () => {
  test("returns default status for unknown message", () => {
    const { result } = renderHook(() => useMessageReceipts("msg-unknown"));

    expect(result.current.status).toBe("sent");
    expect(result.current.isRead).toBe(false);
    expect(result.current.readCount).toBe(0);
  });

  test("returns correct delivery status", () => {
    act(() => {
      useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "delivered");
    });

    const { result } = renderHook(() => useMessageReceipts("msg-1"));

    expect(result.current.status).toBe("delivered");
  });

  test("returns read status and count", () => {
    act(() => {
      useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "read");
      useReadReceiptsStore.getState().setReadReceipts("msg-1", [
        {
          userId: "user-1",
          messageId: "msg-1",
          readAt: new Date().toISOString(),
        },
        {
          userId: "user-2",
          messageId: "msg-1",
          readAt: new Date().toISOString(),
        },
      ]);
    });

    const { result } = renderHook(() => useMessageReceipts("msg-1"));

    expect(result.current.status).toBe("read");
    expect(result.current.isRead).toBe(true);
    expect(result.current.readCount).toBe(2);
  });

  test("returns correct icon for status", () => {
    const statuses: DeliveryStatus[] = [
      "pending",
      "sent",
      "delivered",
      "read",
      "failed",
    ];

    statuses.forEach((status) => {
      act(() => {
        useReadReceiptsStore
          .getState()
          .setDeliveryStatus(`msg-${status}`, status);
      });

      const { result } = renderHook(() => useMessageReceipts(`msg-${status}`));

      expect(result.current.icon).toBeDefined();
      expect(typeof result.current.icon).toBe("string");
    });
  });

  test("returns correct color for status", () => {
    act(() => {
      useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "read");
    });

    const { result } = renderHook(() =>
      useMessageReceipts("msg-1", "whatsapp"),
    );

    // WhatsApp blue for read
    expect(result.current.color).toBe("#53BDEB");
  });

  test.each(["whatsapp", "telegram", "signal"] as PlatformPreset[])(
    "returns platform-specific colors for %s",
    (platform) => {
      act(() => {
        useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "read");
      });

      const { result } = renderHook(() =>
        useMessageReceipts("msg-1", platform),
      );
      const config = getPlatformConfig(platform);

      expect(result.current.color).toBe(config.receipts.style.readColor);
    },
  );
});

// ============================================================================
// PLATFORM PRESENCE HOOK TESTS
// ============================================================================

describe("usePlatformPresence", () => {
  test("returns presence, typing, and receipts", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    expect(result.current.presence).toBeDefined();
    expect(result.current.typing).toBeDefined();
    expect(result.current.receipts).toBeDefined();
  });

  test("includes platform config", () => {
    const { result } = renderHook(() =>
      usePlatformPresence("conv-1", { platform: "slack" }),
    );

    expect(result.current.presence.config.platform).toBe("slack");
  });

  test("allows custom config override", () => {
    const { result } = renderHook(() =>
      usePlatformPresence("conv-1", {
        platform: "default",
        customConfig: {
          typing: { timeout: 10 } as any,
        },
      }),
    );

    expect(result.current.presence.config.typing.timeout).toBe(10);
  });

  test("presence actions work", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.presence.setStatus("dnd");
    });

    expect(usePresenceStore.getState().myStatus).toBe("dnd");
  });

  test("custom status actions work", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.presence.setCustomStatus("Working", "💻");
    });

    const customStatus = usePresenceStore.getState().myCustomStatus;
    expect(customStatus?.text).toBe("Working");
    expect(customStatus?.emoji).toBe("💻");
  });

  test("clear custom status works", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.presence.setCustomStatus("Working", "💻");
      result.current.presence.clearCustomStatus();
    });

    expect(usePresenceStore.getState().myCustomStatus).toBeNull();
  });

  test("privacy settings can be updated", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.presence.updatePrivacySettings({
        sendReadReceipts: false,
      });
    });

    expect(result.current.presence.privacySettings.sendReadReceipts).toBe(
      false,
    );
  });

  test("conversation override works", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.presence.setConversationOverride("conv-1", {
        readReceipts: false,
      });
    });

    expect(
      result.current.presence.privacySettings.conversationOverrides.get(
        "conv-1",
      ),
    ).toEqual({
      conversationId: "conv-1",
      readReceipts: false,
    });
  });

  test("clear conversation override works", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.presence.setConversationOverride("conv-1", {
        readReceipts: false,
      });
      result.current.presence.clearConversationOverride("conv-1");
    });

    expect(
      result.current.presence.privacySettings.conversationOverrides.has(
        "conv-1",
      ),
    ).toBe(false);
  });

  test("getUserPresence returns null for unknown user", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    const presence = result.current.presence.getUserPresence("unknown");
    expect(presence).toBeNull();
  });

  test("getUserPresence returns presence for known user", () => {
    act(() => {
      usePresenceStore.getState().setUserPresence("user-1", {
        userId: "user-1",
        status: "online",
      });
    });

    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    const presence = result.current.presence.getUserPresence("user-1");
    expect(presence).not.toBeNull();
    expect(presence?.status).toBe("online");
  });

  test("typing actions work", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.typing.startTyping();
    });

    // Should set typing context in store
    expect(usePresenceStore.getState().typingInContext).toBe("conv-1");

    act(() => {
      result.current.typing.stopTyping();
    });

    expect(usePresenceStore.getState().typingInContext).toBeNull();
  });

  test("receipt actions work", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.receipts.markAsRead("msg-1");
    });

    expect(
      useReadReceiptsStore.getState().deliveryStatusByMessage["msg-1"],
    ).toBe("read");
    expect(useReadReceiptsStore.getState().myLastReadByChannel["conv-1"]).toBe(
      "msg-1",
    );
  });

  test("markManyAsRead works", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    act(() => {
      result.current.receipts.markManyAsRead(["msg-1", "msg-2", "msg-3"]);
    });

    const store = useReadReceiptsStore.getState();
    expect(store.deliveryStatusByMessage["msg-1"]).toBe("read");
    expect(store.deliveryStatusByMessage["msg-2"]).toBe("read");
    expect(store.deliveryStatusByMessage["msg-3"]).toBe("read");
    expect(store.myLastReadByChannel["conv-1"]).toBe("msg-3");
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  test("handles null conversationId gracefully", () => {
    const { result } = renderHook(() => usePlatformPresence(null));

    expect(result.current.typing.typingUsers).toHaveLength(0);
    expect(result.current.typing.typingText).toBe("");
  });

  test("handles empty user ID gracefully", () => {
    const { result } = renderHook(() => usePresenceStatus(""));

    expect(result.current.status).toBe("offline");
  });

  test("getSeenByText handles zero recipients", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    const text = result.current.receipts.getSeenByText("msg-1", 0);
    expect(text).toBe("");
  });

  test("myPresence includes user info when authenticated", () => {
    const { result } = renderHook(() => usePlatformPresence("conv-1"));

    expect(result.current.presence.myPresence).not.toBeNull();
    expect(result.current.presence.myPresence?.userId).toBe("test-user-1");
  });
});
