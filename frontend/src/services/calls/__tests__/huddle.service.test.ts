/**
 * Huddle Service Tests
 *
 * Comprehensive tests for the huddle service.
 */

import {
  HuddleService,
  createHuddleService,
  formatHuddleDuration,
  getHuddleStatusLabel,
  type HuddleServiceConfig,
  type HuddleStatus,
} from "../huddle.service";

// =============================================================================
// Mocks
// =============================================================================

// Mock signaling manager
const mockSignalingManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  initiateCall: jest.fn(),
  acceptCall: jest.fn(),
  endCall: jest.fn(),
  sendOffer: jest.fn(),
  sendAnswer: jest.fn(),
  sendIceCandidate: jest.fn(),
  notifyMuteChange: jest.fn(),
  notifyVideoChange: jest.fn(),
  notifyScreenShareStarted: jest.fn(),
  notifyScreenShareStopped: jest.fn(),
};

jest.mock("@/lib/webrtc/signaling", () => ({
  createSignalingManager: jest.fn(() => mockSignalingManager),
  generateCallId: jest.fn(() => "test-huddle-id-123"),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock MediaDevices
const mockMediaStream = {
  getTracks: jest.fn(() => [{ kind: "audio", enabled: true, stop: jest.fn() }]),
  getAudioTracks: jest.fn(() => [
    { kind: "audio", enabled: true, stop: jest.fn() },
  ]),
  getVideoTracks: jest.fn(() => []),
  addTrack: jest.fn(),
};

const mockDisplayMediaStream = {
  getTracks: jest.fn(() => [
    { kind: "video", enabled: true, stop: jest.fn(), onended: null },
  ]),
  getVideoTracks: jest.fn(() => [
    { kind: "video", enabled: true, stop: jest.fn(), onended: null },
  ]),
  getAudioTracks: jest.fn(() => []),
};

Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
    getDisplayMedia: jest.fn().mockResolvedValue(mockDisplayMediaStream),
  },
  writable: true,
});

// Mock AudioContext
class MockAudioContext {
  createMediaStreamSource = jest.fn(() => ({
    connect: jest.fn(),
  }));
  createAnalyser = jest.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    connect: jest.fn(),
    getByteFrequencyData: jest.fn((arr: Uint8Array) => {
      arr.fill(0);
    }),
  }));
  close = jest.fn();
}

// @ts-expect-error - Mock AudioContext
global.AudioContext = MockAudioContext;

// =============================================================================
// Test Utilities
// =============================================================================

const createTestConfig = (
  overrides: Partial<HuddleServiceConfig> = {},
): HuddleServiceConfig => ({
  userId: "test-user-id",
  userName: "Test User",
  userAvatarUrl: "https://example.com/avatar.jpg",
  ...overrides,
});

const createService = (
  config?: Partial<HuddleServiceConfig>,
): HuddleService => {
  return createHuddleService(createTestConfig(config));
};

// =============================================================================
// Tests
// =============================================================================

describe("HuddleService", () => {
  let service: HuddleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  afterEach(() => {
    service.destroy();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("initialization", () => {
    it("should create service with default config", () => {
      expect(service).toBeDefined();
      expect(service.isInHuddle).toBe(false);
      expect(service.huddleInfo).toBeNull();
    });

    it("should initialize signaling and audio context", async () => {
      await service.initialize();
      expect(mockSignalingManager.connect).toHaveBeenCalled();
    });

    it("should accept custom configuration", () => {
      const customService = createService({
        muteOnJoin: true,
        autoJoinOnInvite: true,
      });
      expect(customService).toBeDefined();
      customService.destroy();
    });
  });

  // ===========================================================================
  // Huddle Lifecycle Tests
  // ===========================================================================

  describe("huddle lifecycle", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    describe("startHuddle", () => {
      it("should start a huddle in a channel", async () => {
        const huddleId = await service.startHuddle("channel-123", {
          channelName: "Test Channel",
        });

        expect(huddleId).toBe("test-huddle-id-123");
        expect(service.isInHuddle).toBe(true);
        expect(service.huddleInfo).not.toBeNull();
        expect(service.huddleInfo?.channelId).toBe("channel-123");
        expect(service.huddleInfo?.channelName).toBe("Test Channel");
        expect(service.huddleInfo?.type).toBe("channel");
        expect(service.huddleInfo?.status).toBe("active");
      });

      it("should start a huddle in a DM", async () => {
        const huddleId = await service.startHuddle("dm-456", {
          isDM: true,
        });

        expect(huddleId).toBe("test-huddle-id-123");
        expect(service.huddleInfo?.type).toBe("dm");
        expect(service.huddleInfo?.isDM).toBe(true);
      });

      it("should add self as participant when starting", async () => {
        await service.startHuddle("channel-123");

        expect(service.participantCount).toBe(1);
        expect(service.participants[0].id).toBe("test-user-id");
        expect(service.participants[0].name).toBe("Test User");
      });

      it("should throw error if already in huddle", async () => {
        await service.startHuddle("channel-123");

        await expect(service.startHuddle("channel-456")).rejects.toThrow(
          "Already in a huddle",
        );
      });

      it("should emit huddle-started event", async () => {
        const eventHandler = jest.fn();
        service.on("huddle-started", eventHandler);

        await service.startHuddle("channel-123");

        expect(eventHandler).toHaveBeenCalledWith({
          huddleId: "test-huddle-id-123",
          channelId: "channel-123",
        });
      });

      it("should notify signaling server", async () => {
        await service.startHuddle("channel-123", { channelName: "Test" });

        expect(mockSignalingManager.initiateCall).toHaveBeenCalledWith({
          callId: "test-huddle-id-123",
          targetUserId: "",
          callType: "voice",
          channelId: "channel-123",
          metadata: {
            isHuddle: true,
            channelName: "Test",
            isDM: undefined,
          },
        });
      });
    });

    describe("joinHuddle", () => {
      it("should join an existing huddle", async () => {
        await service.joinHuddle("existing-huddle-id", "channel-123", {
          channelName: "Test Channel",
        });

        expect(service.isInHuddle).toBe(true);
        expect(service.huddleInfo?.id).toBe("existing-huddle-id");
        expect(service.huddleInfo?.status).toBe("active");
      });

      it("should throw error if already in huddle", async () => {
        await service.startHuddle("channel-123");

        await expect(
          service.joinHuddle("other-huddle", "channel-456"),
        ).rejects.toThrow("Already in a huddle");
      });

      it("should emit huddle-joined event", async () => {
        const eventHandler = jest.fn();
        service.on("huddle-joined", eventHandler);

        await service.joinHuddle("huddle-id", "channel-123");

        expect(eventHandler).toHaveBeenCalledWith({
          huddleId: "huddle-id",
          channelId: "channel-123",
        });
      });
    });

    describe("leaveHuddle", () => {
      it("should leave the current huddle", async () => {
        await service.startHuddle("channel-123");
        service.leaveHuddle();

        expect(service.isInHuddle).toBe(false);
        expect(service.huddleInfo).toBeNull();
      });

      it("should leave quietly without notification", async () => {
        // When leaving quietly and we're the only participant, huddle ends
        // The quiet flag affects whether notifications are shown
        await service.joinHuddle("huddle-id", "channel-123");

        // Add another mock participant so we don't end the huddle
        const huddleInfo = service.huddleInfo;
        if (huddleInfo) {
          huddleInfo.participants.set("other-user", {
            id: "other-user",
            name: "Other User",
            isMuted: false,
            isVideoEnabled: false,
            isScreenSharing: false,
            isSpeaking: false,
            audioLevel: 0,
            connectionState: "connected",
            joinedAt: new Date(),
          });
        }

        const eventHandler = jest.fn();
        service.on("participant-left-self", eventHandler);

        service.leaveHuddle(true); // quiet = true

        expect(eventHandler).toHaveBeenCalledWith(
          expect.objectContaining({ quiet: true }),
        );
      });

      it("should notify signaling server", async () => {
        await service.startHuddle("channel-123");
        service.leaveHuddle();

        expect(mockSignalingManager.endCall).toHaveBeenCalled();
      });
    });

    describe("endHuddleForAll", () => {
      it("should end huddle for all participants (initiator only)", async () => {
        await service.startHuddle("channel-123");

        expect(service.isInitiator).toBe(true);

        const eventHandler = jest.fn();
        service.on("huddle-ended-by-initiator", eventHandler);

        service.endHuddleForAll();

        expect(eventHandler).toHaveBeenCalled();
        expect(service.isInHuddle).toBe(false);
      });

      it("should throw error if not initiator", async () => {
        await service.joinHuddle("huddle-id", "channel-123");

        expect(() => service.endHuddleForAll()).toThrow(
          "Only the huddle initiator can end it for everyone",
        );
      });
    });
  });

  // ===========================================================================
  // Media Controls Tests
  // ===========================================================================

  describe("media controls", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.startHuddle("channel-123");
    });

    describe("mute controls", () => {
      it("should toggle mute state", () => {
        expect(service.audioMuted).toBe(false);

        service.toggleMute();
        expect(service.audioMuted).toBe(true);

        service.toggleMute();
        expect(service.audioMuted).toBe(false);
      });

      it("should set muted state directly", () => {
        service.setMuted(true);
        expect(service.audioMuted).toBe(true);

        service.setMuted(false);
        expect(service.audioMuted).toBe(false);
      });

      it("should emit local-mute-change event", () => {
        const eventHandler = jest.fn();
        service.on("local-mute-change", eventHandler);

        service.setMuted(true);

        expect(eventHandler).toHaveBeenCalledWith({ isMuted: true });
      });

      it("should notify signaling server of mute change", () => {
        service.setMuted(true);

        expect(mockSignalingManager.notifyMuteChange).toHaveBeenCalledWith(
          "test-huddle-id-123",
          "test-user-id",
          true,
        );
      });
    });

    describe("video controls", () => {
      it("should toggle video state", async () => {
        expect(service.videoEnabled).toBe(false);

        await service.toggleVideo();
        expect(service.videoEnabled).toBe(true);

        await service.toggleVideo();
        expect(service.videoEnabled).toBe(false);
      });

      it("should set video enabled state directly", async () => {
        await service.setVideoEnabled(true);
        expect(service.videoEnabled).toBe(true);

        await service.setVideoEnabled(false);
        expect(service.videoEnabled).toBe(false);
      });

      it("should emit local-video-change event", async () => {
        const eventHandler = jest.fn();
        service.on("local-video-change", eventHandler);

        await service.setVideoEnabled(true);

        expect(eventHandler).toHaveBeenCalledWith({ isVideoEnabled: true });
      });
    });

    describe("screen share controls", () => {
      it("should start screen sharing", async () => {
        expect(service.screenSharing).toBe(false);

        await service.startScreenShare();

        expect(service.screenSharing).toBe(true);
        expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
      });

      it("should stop screen sharing", async () => {
        await service.startScreenShare();
        service.stopScreenShare();

        expect(service.screenSharing).toBe(false);
      });

      it("should toggle screen share", async () => {
        await service.toggleScreenShare();
        expect(service.screenSharing).toBe(true);

        await service.toggleScreenShare();
        expect(service.screenSharing).toBe(false);
      });

      it("should emit screen-share-started event", async () => {
        const eventHandler = jest.fn();
        service.on("screen-share-started", eventHandler);

        await service.startScreenShare();

        expect(eventHandler).toHaveBeenCalledWith({
          participantId: "test-user-id",
        });
      });

      it("should notify signaling server of screen share", async () => {
        await service.startScreenShare();

        expect(
          mockSignalingManager.notifyScreenShareStarted,
        ).toHaveBeenCalledWith("test-huddle-id-123", "test-user-id");
      });
    });
  });

  // ===========================================================================
  // Reactions Tests
  // ===========================================================================

  describe("reactions", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.startHuddle("channel-123");
    });

    it("should send a reaction", () => {
      const eventHandler = jest.fn();
      service.on("reaction", eventHandler);

      service.sendReaction("👍");

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          emoji: "👍",
          participantId: "test-user-id",
          participantName: "Test User",
        }),
      );
    });

    it("should add reaction to recent reactions", () => {
      service.sendReaction("👍");

      expect(service.reactions).toHaveLength(1);
      expect(service.reactions[0].emoji).toBe("👍");
    });

    it("should emit reaction-sent event", () => {
      const eventHandler = jest.fn();
      service.on("reaction-sent", eventHandler);

      service.sendReaction("🎉");

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({ emoji: "🎉" }),
      );
    });
  });

  // ===========================================================================
  // Message Thread Tests
  // ===========================================================================

  describe("message thread", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.startHuddle("channel-123");
    });

    it("should return null if no thread set", () => {
      expect(service.getMessageThreadId()).toBeNull();
    });

    it("should set and get message thread id", () => {
      service.setMessageThreadId("thread-123");
      expect(service.getMessageThreadId()).toBe("thread-123");
    });

    it("should emit message-thread-created event", () => {
      const eventHandler = jest.fn();
      service.on("message-thread-created", eventHandler);

      service.setMessageThreadId("thread-123");

      expect(eventHandler).toHaveBeenCalledWith({ threadId: "thread-123" });
    });
  });

  // ===========================================================================
  // Getters Tests
  // ===========================================================================

  describe("getters", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should return correct isInHuddle state", async () => {
      expect(service.isInHuddle).toBe(false);

      await service.startHuddle("channel-123");
      expect(service.isInHuddle).toBe(true);

      service.leaveHuddle();
      expect(service.isInHuddle).toBe(false);
    });

    it("should return correct isActive state", async () => {
      expect(service.isActive).toBe(false);

      await service.startHuddle("channel-123");
      expect(service.isActive).toBe(true);
    });

    it("should return correct isInitiator state", async () => {
      expect(service.isInitiator).toBe(false);

      await service.startHuddle("channel-123");
      expect(service.isInitiator).toBe(true);
    });

    it("should return current channel id", async () => {
      expect(service.currentChannelId).toBeNull();

      await service.startHuddle("channel-123");
      expect(service.currentChannelId).toBe("channel-123");
    });

    it("should return participants array", async () => {
      expect(service.participants).toEqual([]);

      await service.startHuddle("channel-123");
      expect(service.participants).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Cleanup Tests
  // ===========================================================================

  describe("cleanup", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.startHuddle("channel-123");
    });

    it("should clean up resources when leaving huddle", () => {
      service.leaveHuddle();

      expect(service.isInHuddle).toBe(false);
      expect(service.localMediaStream).toBeNull();
      expect(service.audioMuted).toBe(false);
      expect(service.videoEnabled).toBe(false);
      expect(service.screenSharing).toBe(false);
    });

    it("should clean up resources on destroy", () => {
      service.destroy();

      expect(service.isInHuddle).toBe(false);
      expect(mockSignalingManager.disconnect).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe("error handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should emit error event on media failure", async () => {
      const errorHandler = jest.fn();
      service.on("error", errorHandler);

      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error("Permission denied"),
      );

      await expect(service.startHuddle("channel-123")).rejects.toThrow(
        "Failed to get audio: Permission denied",
      );
    });

    it("should handle screen share permission denied", async () => {
      await service.startHuddle("channel-123");

      const errorHandler = jest.fn();
      service.on("error", errorHandler);

      (
        navigator.mediaDevices.getDisplayMedia as jest.Mock
      ).mockRejectedValueOnce(new Error("Permission denied"));

      await service.startScreenShare();

      expect(errorHandler).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("formatHuddleDuration", () => {
  it("should format seconds only", () => {
    expect(formatHuddleDuration(45)).toBe("0:45");
  });

  it("should format minutes and seconds", () => {
    expect(formatHuddleDuration(125)).toBe("2:05");
  });

  it("should format hours, minutes, and seconds", () => {
    expect(formatHuddleDuration(3725)).toBe("1:02:05");
  });

  it("should handle zero", () => {
    expect(formatHuddleDuration(0)).toBe("0:00");
  });

  it("should pad single digit seconds", () => {
    expect(formatHuddleDuration(61)).toBe("1:01");
  });
});

describe("getHuddleStatusLabel", () => {
  it("should return correct labels for all statuses", () => {
    const statuses: HuddleStatus[] = [
      "idle",
      "starting",
      "connecting",
      "active",
      "reconnecting",
      "ending",
      "ended",
    ];

    expect(getHuddleStatusLabel("idle")).toBe("Not in huddle");
    expect(getHuddleStatusLabel("starting")).toBe("Starting huddle...");
    expect(getHuddleStatusLabel("connecting")).toBe("Connecting...");
    expect(getHuddleStatusLabel("active")).toBe("In huddle");
    expect(getHuddleStatusLabel("reconnecting")).toBe("Reconnecting...");
    expect(getHuddleStatusLabel("ending")).toBe("Ending huddle...");
    expect(getHuddleStatusLabel("ended")).toBe("Huddle ended");
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe("createHuddleService", () => {
  it("should create a new HuddleService instance", () => {
    const config: HuddleServiceConfig = {
      userId: "user-1",
      userName: "User One",
    };

    const service = createHuddleService(config);

    expect(service).toBeInstanceOf(HuddleService);
    service.destroy();
  });
});
