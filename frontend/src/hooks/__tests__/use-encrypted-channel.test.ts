/**
 * useEncryptedChannel Hook Unit Tests
 *
 * Tests for the encrypted channel hook including encryption/decryption,
 * status management, error handling, and utility hooks.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useEncryptedChannel,
  useHasEncryptedChannels,
  useEncryptionStats,
  useEncryptionReady,
  useMultipleEncryptedChannels,
} from "../use-encrypted-channel";
import { useEncryptionStore } from "@/stores/encryption-store";

// ============================================================================
// Setup
// ============================================================================

describe("useEncryptedChannel", () => {
  beforeEach(() => {
    // Reset encryption store before each test
    act(() => {
      useEncryptionStore.getState().reset();
      useEncryptionStore.getState().setInitialized(true);
      useEncryptionStore.getState().setGlobalStatus("enabled");
      useEncryptionStore.getState().setKeyStatus("ready");
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("should return initial state for new channel", () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      expect(result.current.isEncrypted).toBe(false);
      expect(result.current.status).toBe("disabled");
      expect(result.current.error).toBeNull();
      expect(result.current.isReady).toBe(false);
      expect(result.current.messagesSent).toBe(0);
      expect(result.current.messagesReceived).toBe(0);
    });

    it("should provide all action methods", () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      expect(typeof result.current.enableEncryption).toBe("function");
      expect(typeof result.current.disableEncryption).toBe("function");
      expect(typeof result.current.encryptMessage).toBe("function");
      expect(typeof result.current.decryptMessage).toBe("function");
      expect(typeof result.current.refreshKeys).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  // ==========================================================================
  // Enable/Disable Encryption Tests
  // ==========================================================================

  describe("Enable/Disable Encryption", () => {
    it("should enable encryption for a channel", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      expect(result.current.isEncrypted).toBe(true);
      expect(result.current.status).toBe("enabled");
      expect(result.current.isReady).toBe(true);
    });

    it("should disable encryption for a channel", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      expect(result.current.isEncrypted).toBe(true);

      act(() => {
        result.current.disableEncryption();
      });

      expect(result.current.isEncrypted).toBe(false);
      expect(result.current.status).toBe("disabled");
      expect(result.current.isReady).toBe(false);
    });

    it("should handle enable encryption error", async () => {
      // Set global encryption to error state
      act(() => {
        useEncryptionStore.getState().setGlobalStatus("error");
      });

      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      expect(result.current.error).toBe("Global encryption is not available");
      expect(result.current.status).toBe("error");
    });

    it("should auto-enable encryption when option is set", async () => {
      const { result } = renderHook(() =>
        useEncryptedChannel("channel-1", { autoEnable: true }),
      );

      await waitFor(() => {
        expect(result.current.isEncrypted).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Message Encryption Tests
  // ==========================================================================

  describe("Message Encryption", () => {
    beforeEach(async () => {
      // Enable encryption before each test
      const { result } = renderHook(() => useEncryptedChannel("setup-channel"));
      await act(async () => {
        await result.current.enableEncryption();
      });
    });

    it("should encrypt a message", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      let encrypted;
      await act(async () => {
        encrypted = await result.current.encryptMessage("Hello, World!");
      });

      expect(encrypted).not.toBeNull();
      expect(encrypted).toHaveProperty("ciphertext");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("timestamp");
    });

    it("should increment message sent count", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      expect(result.current.messagesSent).toBe(0);

      await act(async () => {
        await result.current.encryptMessage("Message 1");
      });

      expect(result.current.messagesSent).toBe(1);

      await act(async () => {
        await result.current.encryptMessage("Message 2");
      });

      expect(result.current.messagesSent).toBe(2);
    });

    it("should return null when encryption is not ready", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      // Don't enable encryption

      let encrypted;
      await act(async () => {
        encrypted = await result.current.encryptMessage("Hello");
      });

      expect(encrypted).toBeNull();
      expect(result.current.error).toBe("Channel encryption is not ready");
    });

    it("should call onMessageEncrypted callback", async () => {
      const onMessageEncrypted = jest.fn();
      const { result } = renderHook(() =>
        useEncryptedChannel("channel-1", { onMessageEncrypted }),
      );

      await act(async () => {
        await result.current.enableEncryption();
      });

      await act(async () => {
        await result.current.encryptMessage("Hello");
      });

      expect(onMessageEncrypted).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Message Decryption Tests
  // ==========================================================================

  describe("Message Decryption", () => {
    it("should decrypt a message", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      // First encrypt a message
      let encrypted;
      await act(async () => {
        encrypted = await result.current.encryptMessage("Hello, World!");
      });

      // Then decrypt it
      let decrypted;
      await act(async () => {
        decrypted = await result.current.decryptMessage(encrypted!);
      });

      expect(decrypted).toBe("Hello, World!");
    });

    it("should increment message received count", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      const encrypted = {
        ciphertext: btoa("Test"),
        iv: btoa(String.fromCharCode(...new Uint8Array(12))),
        ephemeralPublicKey: "{}",
        version: 1,
        timestamp: Date.now(),
      };

      expect(result.current.messagesReceived).toBe(0);

      await act(async () => {
        await result.current.decryptMessage(encrypted);
      });

      expect(result.current.messagesReceived).toBe(1);
    });

    it("should return null when decryption is not ready", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      const encrypted = {
        ciphertext: "test",
        iv: "iv",
        ephemeralPublicKey: "{}",
        version: 1,
        timestamp: Date.now(),
      };

      let decrypted;
      await act(async () => {
        decrypted = await result.current.decryptMessage(encrypted);
      });

      expect(decrypted).toBeNull();
      expect(result.current.error).toBe("Channel encryption is not ready");
    });

    it("should call onMessageDecrypted callback", async () => {
      const onMessageDecrypted = jest.fn();
      const { result } = renderHook(() =>
        useEncryptedChannel("channel-1", { onMessageDecrypted }),
      );

      await act(async () => {
        await result.current.enableEncryption();
      });

      const encrypted = {
        ciphertext: btoa("Test"),
        iv: btoa(String.fromCharCode(...new Uint8Array(12))),
        ephemeralPublicKey: "{}",
        version: 1,
        timestamp: Date.now(),
      };

      await act(async () => {
        await result.current.decryptMessage(encrypted);
      });

      expect(onMessageDecrypted).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Key Refresh Tests
  // ==========================================================================

  describe("Key Refresh", () => {
    it("should refresh keys for an encrypted channel", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      await act(async () => {
        await result.current.enableEncryption();
      });

      expect(result.current.status).toBe("enabled");

      await act(async () => {
        await result.current.refreshKeys();
      });

      expect(result.current.status).toBe("enabled");
    });

    it("should not refresh keys for non-encrypted channel", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      // Don't enable encryption

      await act(async () => {
        await result.current.refreshKeys();
      });

      // Status should remain disabled
      expect(result.current.status).toBe("disabled");
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Error Handling", () => {
    it("should clear error", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      // Trigger an error by trying to encrypt without enabling
      await act(async () => {
        await result.current.encryptMessage("Hello");
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it("should call onError callback", async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useEncryptedChannel("channel-1", { onError }),
      );

      await act(async () => {
        await result.current.encryptMessage("Hello");
      });

      expect(onError).toHaveBeenCalledWith("Channel encryption is not ready");
    });

    it("should call onStatusChange callback", async () => {
      const onStatusChange = jest.fn();
      const { result } = renderHook(() =>
        useEncryptedChannel("channel-1", { onStatusChange }),
      );

      await act(async () => {
        await result.current.enableEncryption();
      });

      // Should be called with 'enabled' after successful enable
      expect(onStatusChange).toHaveBeenCalledWith("enabled");
    });
  });

  // ==========================================================================
  // State Updates Tests
  // ==========================================================================

  describe("State Updates", () => {
    it("should update state when store changes", async () => {
      const { result } = renderHook(() => useEncryptedChannel("channel-1"));

      // Enable encryption via store directly
      act(() => {
        useEncryptionStore.getState().enableChannelEncryption("channel-1");
        useEncryptionStore
          .getState()
          .setChannelEncryptionStatus("channel-1", "enabled");
      });

      expect(result.current.isEncrypted).toBe(true);
      expect(result.current.status).toBe("enabled");
    });

    it("should handle channel ID change", () => {
      const { result, rerender } = renderHook(
        ({ channelId }) => useEncryptedChannel(channelId),
        {
          initialProps: { channelId: "channel-1" },
        },
      );

      // Enable encryption for channel-1
      act(() => {
        useEncryptionStore.getState().enableChannelEncryption("channel-1");
        useEncryptionStore
          .getState()
          .setChannelEncryptionStatus("channel-1", "enabled");
      });

      expect(result.current.isEncrypted).toBe(true);

      // Change to channel-2
      rerender({ channelId: "channel-2" });

      expect(result.current.isEncrypted).toBe(false);
    });
  });
});

// ============================================================================
// Utility Hooks Tests
// ============================================================================

describe("useHasEncryptedChannels", () => {
  beforeEach(() => {
    act(() => {
      useEncryptionStore.getState().reset();
    });
  });

  it("should return false when no channels are encrypted", () => {
    const { result } = renderHook(() => useHasEncryptedChannels());

    expect(result.current).toBe(false);
  });

  it("should return true when a channel is encrypted", () => {
    act(() => {
      useEncryptionStore.getState().enableChannelEncryption("channel-1");
    });

    const { result } = renderHook(() => useHasEncryptedChannels());

    expect(result.current).toBe(true);
  });

  it("should return false when all channels are disabled", () => {
    act(() => {
      useEncryptionStore.getState().enableChannelEncryption("channel-1");
      useEncryptionStore.getState().disableChannelEncryption("channel-1");
    });

    const { result } = renderHook(() => useHasEncryptedChannels());

    expect(result.current).toBe(false);
  });
});

describe("useEncryptionStats", () => {
  beforeEach(() => {
    act(() => {
      useEncryptionStore.getState().reset();
    });
  });

  it("should return statistics", () => {
    const { result } = renderHook(() => useEncryptionStats());

    expect(result.current).toHaveProperty("totalMessagesSent");
    expect(result.current).toHaveProperty("totalMessagesReceived");
    expect(result.current).toHaveProperty("totalEncryptionErrors");
    expect(result.current).toHaveProperty("encryptedChannelsCount");
    expect(result.current).toHaveProperty("trustedDevicesCount");
    expect(result.current).toHaveProperty("activeSessions");
  });

  it("should reflect current state", () => {
    act(() => {
      useEncryptionStore.getState().enableChannelEncryption("channel-1");
      useEncryptionStore.getState().enableChannelEncryption("channel-2");
      useEncryptionStore.getState().incrementTotalMessagesSent();
      useEncryptionStore.getState().incrementTotalMessagesSent();
    });

    const { result } = renderHook(() => useEncryptionStats());

    expect(result.current.encryptedChannelsCount).toBe(2);
    expect(result.current.totalMessagesSent).toBe(2);
  });
});

describe("useEncryptionReady", () => {
  beforeEach(() => {
    act(() => {
      useEncryptionStore.getState().reset();
    });
  });

  it("should return false when not initialized", () => {
    const { result } = renderHook(() => useEncryptionReady());

    expect(result.current).toBe(false);
  });

  it("should return true when fully initialized", () => {
    act(() => {
      useEncryptionStore.getState().setInitialized(true);
      useEncryptionStore.getState().setGlobalStatus("enabled");
      useEncryptionStore.getState().setKeyStatus("ready");
    });

    const { result } = renderHook(() => useEncryptionReady());

    expect(result.current).toBe(true);
  });

  it("should return false when key is not ready", () => {
    act(() => {
      useEncryptionStore.getState().setInitialized(true);
      useEncryptionStore.getState().setGlobalStatus("enabled");
      useEncryptionStore.getState().setKeyStatus("generating");
    });

    const { result } = renderHook(() => useEncryptionReady());

    expect(result.current).toBe(false);
  });

  it("should return false when global status is error", () => {
    act(() => {
      useEncryptionStore.getState().setInitialized(true);
      useEncryptionStore.getState().setGlobalStatus("error");
      useEncryptionStore.getState().setKeyStatus("ready");
    });

    const { result } = renderHook(() => useEncryptionReady());

    expect(result.current).toBe(false);
  });
});

describe("useMultipleEncryptedChannels", () => {
  beforeEach(() => {
    act(() => {
      useEncryptionStore.getState().reset();
    });
  });

  it("should return state for multiple channels", () => {
    const channelIds = ["channel-1", "channel-2", "channel-3"];
    const { result } = renderHook(() =>
      useMultipleEncryptedChannels(channelIds),
    );

    expect(result.current.channelStates).toHaveLength(3);
    expect(result.current.totalCount).toBe(3);
    expect(result.current.encryptedCount).toBe(0);
    expect(result.current.allEncrypted).toBe(false);
    expect(result.current.anyEncrypted).toBe(false);
  });

  it("should track encrypted channels", () => {
    act(() => {
      useEncryptionStore.getState().enableChannelEncryption("channel-1");
      useEncryptionStore
        .getState()
        .setChannelEncryptionStatus("channel-1", "enabled");
    });

    const channelIds = ["channel-1", "channel-2", "channel-3"];
    const { result } = renderHook(() =>
      useMultipleEncryptedChannels(channelIds),
    );

    expect(result.current.encryptedCount).toBe(1);
    expect(result.current.allEncrypted).toBe(false);
    expect(result.current.anyEncrypted).toBe(true);
  });

  it("should detect when all channels are encrypted", () => {
    act(() => {
      useEncryptionStore.getState().enableChannelEncryption("channel-1");
      useEncryptionStore
        .getState()
        .setChannelEncryptionStatus("channel-1", "enabled");
      useEncryptionStore.getState().enableChannelEncryption("channel-2");
      useEncryptionStore
        .getState()
        .setChannelEncryptionStatus("channel-2", "enabled");
    });

    const channelIds = ["channel-1", "channel-2"];
    const { result } = renderHook(() =>
      useMultipleEncryptedChannels(channelIds),
    );

    expect(result.current.allEncrypted).toBe(true);
    expect(result.current.anyEncrypted).toBe(true);
    expect(result.current.encryptedCount).toBe(2);
  });

  it("should handle empty channel list", () => {
    const { result } = renderHook(() => useMultipleEncryptedChannels([]));

    expect(result.current.channelStates).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.allEncrypted).toBe(true); // Every element of empty array satisfies condition
  });
});
