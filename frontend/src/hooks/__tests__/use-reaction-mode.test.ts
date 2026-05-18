/**
 * useReactionMode Hook Tests
 *
 * Tests for the platform-aware reaction hook that handles single vs multiple
 * reaction modes, permission checks, cooldown management, and toggle logic.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useReactionMode,
  useReactionPicker,
  useReactionCooldown,
} from "../use-reaction-mode";
import { useAppConfig } from "@/contexts/app-config-context";
import { useAuth } from "@/contexts/auth-context";
import type { ReactionAggregate } from "@/lib/reactions/platform-reactions";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/contexts/app-config-context", () => ({
  useAppConfig: jest.fn(),
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

const mockUseAppConfig = useAppConfig as jest.MockedFunction<
  typeof useAppConfig
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ============================================================================
// Test Data
// ============================================================================

const mockUser = { id: "user-1", email: "test@example.com", name: "Test User" };

const createMockReaction = (
  emoji: string,
  count: number,
  hasReacted: boolean,
): ReactionAggregate => ({
  emoji,
  count,
  hasReacted,
  users: Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i}`,
  })),
});

const defaultAppConfig = {
  theme: { preset: "default" },
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppConfig.mockReturnValue({
    config: defaultAppConfig,
  } as ReturnType<typeof useAppConfig>);
  mockUseAuth.mockReturnValue({
    user: mockUser,
  } as ReturnType<typeof useAuth>);
});

// ============================================================================
// useReactionMode Tests
// ============================================================================

describe("useReactionMode", () => {
  describe("Configuration Detection", () => {
    it("should detect default platform from app config", () => {
      const { result } = renderHook(() => useReactionMode());
      expect(result.current.mode).toBe("multiple");
      expect(result.current.config.platform).toBe("default");
    });

    it("should detect WhatsApp platform from theme preset", () => {
      mockUseAppConfig.mockReturnValue({
        config: { theme: { preset: "whatsapp" } },
      } as ReturnType<typeof useAppConfig>);

      const { result } = renderHook(() => useReactionMode());
      expect(result.current.mode).toBe("single");
    });

    it("should detect Slack platform from theme preset", () => {
      mockUseAppConfig.mockReturnValue({
        config: { theme: { preset: "slack" } },
      } as ReturnType<typeof useAppConfig>);

      const { result } = renderHook(() => useReactionMode());
      expect(result.current.config.displayStyle).toBe("hover");
    });

    it("should use platform override when provided", () => {
      const { result } = renderHook(() =>
        useReactionMode({ platform: "discord" }),
      );
      expect(result.current.config.platform).toBe("discord");
    });

    it("should fall back to default for unknown theme presets", () => {
      mockUseAppConfig.mockReturnValue({
        config: { theme: { preset: "ocean" } },
      } as ReturnType<typeof useAppConfig>);

      const { result } = renderHook(() => useReactionMode());
      expect(result.current.config.platform).toBe("default");
    });
  });

  describe("Quick Reactions", () => {
    it("should return platform-specific quick reactions", () => {
      const { result } = renderHook(() => useReactionMode());
      expect(result.current.quickReactions).toContain("👍");
      expect(result.current.quickReactions).toContain("❤️");
    });

    it("should return WhatsApp quick reactions for WhatsApp platform", () => {
      const { result } = renderHook(() =>
        useReactionMode({ platform: "whatsapp" }),
      );
      expect(result.current.quickReactions).toContain("🙏");
    });
  });

  describe("Permission Checks", () => {
    it("should return reactionsEnabled true for authenticated users", () => {
      const { result } = renderHook(() => useReactionMode());
      expect(result.current.reactionsEnabled).toBe(true);
    });

    it("should return reactionsEnabled false for unauthenticated users", () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useReactionMode());
      expect(result.current.reactionsEnabled).toBe(false);
      expect(result.current.permissions.reason).toContain("logged in");
    });

    it("should check channel permissions for moderator-only", () => {
      const { result } = renderHook(() =>
        useReactionMode({
          channelPermissions: { moderatorOnly: true },
          userRole: "member",
        }),
      );
      expect(result.current.reactionsEnabled).toBe(false);
      expect(result.current.permissions.reason).toContain("moderator");
    });

    it("should allow moderators in moderator-only channels", () => {
      const { result } = renderHook(() =>
        useReactionMode({
          channelPermissions: { moderatorOnly: true },
          userRole: "moderator",
        }),
      );
      expect(result.current.reactionsEnabled).toBe(true);
    });

    it("should check channel disabled state", () => {
      const { result } = renderHook(() =>
        useReactionMode({
          channelPermissions: { enabled: false },
        }),
      );
      expect(result.current.reactionsEnabled).toBe(false);
      expect(result.current.permissions.reason).toContain("disabled");
    });
  });

  describe("canReact", () => {
    it("should allow reaction when under limits", () => {
      const { result } = renderHook(() => useReactionMode());
      const check = result.current.canReact("👍", [], 0);
      expect(check.allowed).toBe(true);
    });

    it("should deny when at user limit", () => {
      const { result } = renderHook(() => useReactionMode());
      const userReactions = Array.from({ length: 10 }, (_, i) => `emoji_${i}`);
      const check = result.current.canReact("👍", userReactions, 20);
      expect(check.allowed).toBe(false);
    });

    it("should indicate replacement for single mode", () => {
      const { result } = renderHook(() =>
        useReactionMode({ platform: "whatsapp" }),
      );
      const check = result.current.canReact("❤️", ["👍"], 1);
      expect(check.allowed).toBe(true);
      expect(check.shouldReplace).toBe(true);
      expect(check.existingEmoji).toBe("👍");
    });
  });

  describe("hasUserReacted", () => {
    it("should return true when user has reacted", () => {
      const { result } = renderHook(() => useReactionMode());
      const reactions: ReactionAggregate[] = [
        createMockReaction("👍", 3, true),
        createMockReaction("❤️", 2, false),
      ];
      expect(result.current.hasUserReacted("👍", reactions)).toBe(true);
      expect(result.current.hasUserReacted("❤️", reactions)).toBe(false);
    });

    it("should return false for non-existent emoji", () => {
      const { result } = renderHook(() => useReactionMode());
      const reactions: ReactionAggregate[] = [
        createMockReaction("👍", 3, false),
      ];
      expect(result.current.hasUserReacted("❤️", reactions)).toBe(false);
    });
  });

  describe("getUserReactions", () => {
    it("should return emojis user has reacted with", () => {
      const { result } = renderHook(() => useReactionMode());
      const reactions: ReactionAggregate[] = [
        createMockReaction("👍", 3, true),
        createMockReaction("❤️", 2, true),
        createMockReaction("😂", 5, false),
      ];
      const userReactions = result.current.getUserReactions(reactions);
      expect(userReactions).toEqual(["👍", "❤️"]);
    });

    it("should return empty array when user has no reactions", () => {
      const { result } = renderHook(() => useReactionMode());
      const reactions: ReactionAggregate[] = [
        createMockReaction("👍", 3, false),
      ];
      expect(result.current.getUserReactions(reactions)).toEqual([]);
    });
  });

  describe("toggleReaction", () => {
    it("should call onReactionAdd for new reaction", async () => {
      const onReactionAdd = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useReactionMode({ onReactionAdd }));

      const reactions: ReactionAggregate[] = [];

      await act(async () => {
        await result.current.toggleReaction("👍", "msg-1", reactions);
      });

      expect(onReactionAdd).toHaveBeenCalledWith("👍", "msg-1");
    });

    it("should call onReactionRemove for existing reaction", async () => {
      const onReactionRemove = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useReactionMode({ onReactionRemove }),
      );

      const reactions: ReactionAggregate[] = [
        createMockReaction("👍", 1, true),
      ];

      await act(async () => {
        await result.current.toggleReaction("👍", "msg-1", reactions);
      });

      expect(onReactionRemove).toHaveBeenCalledWith("👍", "msg-1");
    });

    it("should replace reaction in single mode", async () => {
      const onReactionAdd = jest.fn().mockResolvedValue(undefined);
      const onReactionRemove = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useReactionMode({
          platform: "whatsapp",
          onReactionAdd,
          onReactionRemove,
        }),
      );

      const reactions: ReactionAggregate[] = [
        createMockReaction("👍", 1, true),
      ];

      await act(async () => {
        await result.current.toggleReaction("❤️", "msg-1", reactions);
      });

      expect(onReactionRemove).toHaveBeenCalledWith("👍", "msg-1");
      expect(onReactionAdd).toHaveBeenCalledWith("❤️", "msg-1");
    });

    it("should call onReactionError when reaction fails", async () => {
      const error = new Error("Network error");
      const onReactionAdd = jest.fn().mockRejectedValue(error);
      const onReactionError = jest.fn();

      const { result } = renderHook(() =>
        useReactionMode({ onReactionAdd, onReactionError }),
      );

      await act(async () => {
        try {
          await result.current.toggleReaction("👍", "msg-1", []);
        } catch {
          // Expected
        }
      });

      expect(onReactionError).toHaveBeenCalledWith(error, "add");
    });
  });

  describe("Cooldown", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should start cooldown after reaction", async () => {
      const onReactionAdd = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useReactionMode({
          platform: "discord", // Has 250ms cooldown
          onReactionAdd,
        }),
      );

      await act(async () => {
        await result.current.toggleReaction("👍", "msg-1", []);
      });

      expect(result.current.cooldown.active).toBe(true);
    });

    it("should clear cooldown after timeout", async () => {
      const onReactionAdd = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useReactionMode({
          platform: "discord",
          onReactionAdd,
        }),
      );

      await act(async () => {
        await result.current.toggleReaction("👍", "msg-1", []);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.cooldown.active).toBe(false);
    });
  });

  describe("Features", () => {
    it("should expose platform features", () => {
      const { result } = renderHook(() =>
        useReactionMode({ platform: "slack" }),
      );
      expect(result.current.features.hoverReactionBar).toBe(true);
    });

    it("should show emoji picker for full emoji sets", () => {
      const { result } = renderHook(() => useReactionMode());
      expect(result.current.showEmojiPicker).toBe(true);
    });

    it("should return animation support level", () => {
      const { result } = renderHook(() =>
        useReactionMode({ platform: "discord" }),
      );
      expect(result.current.animationSupport).toBe("animated");
    });
  });
});

// ============================================================================
// useReactionPicker Tests
// ============================================================================

describe("useReactionPicker", () => {
  it("should start closed", () => {
    const { result } = renderHook(() => useReactionPicker());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.targetMessageId).toBeNull();
  });

  it("should open with message ID", () => {
    const { result } = renderHook(() => useReactionPicker());

    act(() => {
      result.current.open("msg-1");
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.targetMessageId).toBe("msg-1");
  });

  it("should close and clear target", () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useReactionPicker({ onClose }));

    act(() => {
      result.current.open("msg-1");
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.targetMessageId).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("should toggle picker for same message", () => {
    const { result } = renderHook(() => useReactionPicker());

    act(() => {
      result.current.toggle("msg-1");
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle("msg-1");
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("should switch to different message", () => {
    const { result } = renderHook(() => useReactionPicker());

    act(() => {
      result.current.open("msg-1");
    });

    act(() => {
      result.current.toggle("msg-2");
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.targetMessageId).toBe("msg-2");
  });

  it("should call onSelect and close when emoji selected", () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() => useReactionPicker({ onSelect }));

    act(() => {
      result.current.open("msg-1");
    });

    act(() => {
      result.current.selectEmoji("👍");
    });

    expect(onSelect).toHaveBeenCalledWith("👍");
    expect(result.current.isOpen).toBe(false);
  });
});

// ============================================================================
// useReactionCooldown Tests
// ============================================================================

describe("useReactionCooldown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should start inactive", () => {
    const { result } = renderHook(() => useReactionCooldown(500));
    expect(result.current.active).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it("should activate on start", () => {
    const { result } = renderHook(() => useReactionCooldown(500));

    act(() => {
      result.current.start();
    });

    expect(result.current.active).toBe(true);
    expect(result.current.remainingMs).toBe(500);
  });

  it("should decrement remaining time", async () => {
    const { result } = renderHook(() => useReactionCooldown(500));

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.remainingMs).toBeLessThan(500);
    expect(result.current.remainingMs).toBeGreaterThan(0);
  });

  it("should deactivate after cooldown expires", () => {
    const { result } = renderHook(() => useReactionCooldown(500));

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(result.current.active).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it("should reset cooldown", () => {
    const { result } = renderHook(() => useReactionCooldown(500));

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.active).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it("should not activate for zero cooldown", () => {
    const { result } = renderHook(() => useReactionCooldown(0));

    act(() => {
      result.current.start();
    });

    expect(result.current.active).toBe(false);
  });
});
