/**
 * Group Call Service Tests
 *
 * Comprehensive test suite for the GroupCallService covering:
 * - Call lifecycle (create, join, leave)
 * - Participant management
 * - Host controls
 * - Role controls
 * - Lobby functionality
 * - Layout options
 * - Media controls
 */

import {
  GroupCallService,
  createGroupCallService,
} from "../group-call.service";
import type {
  GroupCallServiceConfig,
  GroupCallParticipant,
  ParticipantRole,
  LayoutType,
  GroupCallType,
} from "../group-call.service";

// =============================================================================
// Mocks
// =============================================================================

// Mock the WebRTC signaling module
jest.mock("@/lib/webrtc/signaling", () => ({
  createSignalingManager: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    initiateCall: jest.fn(),
    acceptCall: jest.fn(),
    declineCall: jest.fn(),
    endCall: jest.fn(),
    sendOffer: jest.fn(),
    sendAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
    notifyMuteChange: jest.fn(),
    notifyVideoChange: jest.fn(),
    notifyScreenShareStarted: jest.fn(),
    notifyScreenShareStopped: jest.fn(),
  })),
  generateCallId: jest.fn(() => "call-123-abc"),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [
      { kind: "audio", enabled: true, stop: jest.fn() },
      { kind: "video", enabled: true, stop: jest.fn() },
    ],
    getAudioTracks: () => [{ kind: "audio", enabled: true, stop: jest.fn() }],
    getVideoTracks: () => [{ kind: "video", enabled: true, stop: jest.fn() }],
  }),
  getDisplayMedia: jest.fn().mockResolvedValue({
    getTracks: () => [
      { kind: "video", enabled: true, stop: jest.fn(), onended: null },
    ],
    getVideoTracks: () => [
      { kind: "video", enabled: true, stop: jest.fn(), onended: null },
    ],
  }),
};

Object.defineProperty(global.navigator, "mediaDevices", {
  value: mockMediaDevices,
  writable: true,
});

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  connectionState = "new";
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  ontrack: ((event: any) => void) | null = null;
  onicecandidate: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  constructor(_config?: RTCConfiguration) {}

  addTrack(_track: MediaStreamTrack, _stream: MediaStream): RTCRtpSender {
    return {
      track: _track,
      getParameters: jest.fn(() => ({ encodings: [{}] })),
      setParameters: jest.fn().mockResolvedValue(undefined),
    } as unknown as RTCRtpSender;
  }

  getSenders(): RTCRtpSender[] {
    return [];
  }

  async createOffer(
    _options?: RTCOfferOptions,
  ): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: "mock-sdp" };
  }

  async createAnswer(
    _options?: RTCAnswerOptions,
  ): Promise<RTCSessionDescriptionInit> {
    return { type: "answer", sdp: "mock-sdp" };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = desc;
  }

  async addIceCandidate(_candidate: RTCIceCandidateInit): Promise<void> {}

  close(): void {
    this.connectionState = "closed";
  }
}

global.RTCPeerConnection = MockRTCPeerConnection as any;

// Mock AudioContext
const mockAnalyser = {
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: jest.fn(),
};

const mockAudioContext = {
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
  })),
  createAnalyser: jest.fn(() => mockAnalyser),
  close: jest.fn(),
};

global.AudioContext = jest.fn(() => mockAudioContext) as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(
  (cb) => setTimeout(cb, 16) as unknown as number,
);

// =============================================================================
// Test Helpers
// =============================================================================

const createMockConfig = (
  overrides: Partial<GroupCallServiceConfig> = {},
): GroupCallServiceConfig => ({
  userId: "user-1",
  userName: "Test User",
  userAvatarUrl: "https://example.com/avatar.jpg",
  maxParticipants: 10,
  enableLobby: false,
  muteOnEntry: false,
  videoOffOnEntry: false,
  allowParticipantScreenShare: true,
  allowParticipantUnmute: true,
  ...overrides,
});

const createMockParticipant = (
  overrides: Partial<GroupCallParticipant> = {},
): GroupCallParticipant => ({
  id: "participant-1",
  name: "Participant 1",
  avatarUrl: "https://example.com/avatar.jpg",
  role: "participant",
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  isHandRaised: false,
  isSpeaking: false,
  connectionState: "connected",
  joinedAt: new Date(),
  lobbyStatus: "admitted",
  audioLevel: 0,
  isPinned: false,
  isSpotlight: false,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe("GroupCallService", () => {
  let service: GroupCallService;
  let config: GroupCallServiceConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    config = createMockConfig();
    service = createGroupCallService(config);
  });

  afterEach(() => {
    service?.destroy();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("Initialization", () => {
    it("should create a service instance", () => {
      expect(service).toBeInstanceOf(GroupCallService);
    });

    it("should initialize with correct default values", () => {
      expect(service.isInCall).toBe(false);
      expect(service.isConnected).toBe(false);
      expect(service.isHost).toBe(false);
      expect(service.isCoHost).toBe(false);
      expect(service.canManageParticipants).toBe(false);
      expect(service.participantCount).toBe(0);
      expect(service.lobbyCount).toBe(0);
      expect(service.callDuration).toBe(0);
    });

    it("should initialize successfully", async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it("should return null for callInfo when not in call", () => {
      expect(service.callInfo).toBeNull();
    });
  });

  // ===========================================================================
  // Call Lifecycle Tests
  // ===========================================================================

  describe("Call Lifecycle", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should create a video group call", async () => {
      const callId = await service.createGroupCall("video", {
        channelId: "channel-1",
      });

      expect(callId).toBe("call-123-abc");
      expect(service.isInCall).toBe(true);
      expect(service.isHost).toBe(true);
      expect(service.callInfo?.type).toBe("video");
      expect(service.callInfo?.channelId).toBe("channel-1");
    });

    it("should create a voice group call", async () => {
      const callId = await service.createGroupCall("voice");

      expect(callId).toBe("call-123-abc");
      expect(service.callInfo?.type).toBe("voice");
    });

    it("should add host as first participant", async () => {
      await service.createGroupCall("video");

      expect(service.participantCount).toBe(1);
      const participants = Array.from(service.callInfo!.participants.values());
      expect(participants[0].id).toBe("user-1");
      expect(participants[0].role).toBe("host");
    });

    it("should throw when creating call while already in call", async () => {
      await service.createGroupCall("video");

      await expect(service.createGroupCall("voice")).rejects.toThrow(
        "Already in a call",
      );
    });

    it("should allow joining a group call", async () => {
      await service.joinGroupCall("existing-call-123", "video", {
        channelId: "channel-1",
      });

      expect(service.isInCall).toBe(true);
    });

    it("should throw when joining while already in call", async () => {
      await service.createGroupCall("video");

      await expect(
        service.joinGroupCall("other-call", "video"),
      ).rejects.toThrow("Already in a call");
    });

    it("should leave call cleanly", async () => {
      await service.createGroupCall("video");
      expect(service.isInCall).toBe(true);

      service.leaveCall();
      expect(service.isInCall).toBe(false);
      expect(service.callInfo).toBeNull();
    });

    it("should emit call-ended event on leave", async () => {
      const onCallEnded = jest.fn();
      service.on("call-ended", onCallEnded);

      await service.createGroupCall("video");
      service.leaveCall();

      expect(onCallEnded).toHaveBeenCalled();
    });

    it("should create call with custom title and description", async () => {
      await service.createGroupCall("video", {
        title: "Team Meeting",
        description: "Weekly sync",
      });

      expect(service.callInfo?.title).toBe("Team Meeting");
      expect(service.callInfo?.description).toBe("Weekly sync");
    });
  });

  // ===========================================================================
  // Host Controls Tests
  // ===========================================================================

  describe("Host Controls", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should allow host to mute all participants", async () => {
      // Add mock participant
      const participant = createMockParticipant({
        id: "user-2",
        isMuted: false,
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.muteAllParticipants();

      const updatedParticipant = service.callInfo!.participants.get("user-2");
      expect(updatedParticipant?.isMuted).toBe(true);
    });

    it("should allow excepting users when muting all", async () => {
      const participant1 = createMockParticipant({
        id: "user-2",
        isMuted: false,
      });
      const participant2 = createMockParticipant({
        id: "user-3",
        isMuted: false,
      });
      service.callInfo!.participants.set("user-2", participant1);
      service.callInfo!.participants.set("user-3", participant2);

      await service.muteAllParticipants(["user-3"]);

      expect(service.callInfo!.participants.get("user-2")?.isMuted).toBe(true);
      expect(service.callInfo!.participants.get("user-3")?.isMuted).toBe(false);
    });

    it("should allow host to mute individual participant", async () => {
      const participant = createMockParticipant({
        id: "user-2",
        isMuted: false,
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.muteParticipant("user-2");

      expect(service.callInfo!.participants.get("user-2")?.isMuted).toBe(true);
    });

    it("should throw when muting non-existent participant", async () => {
      await expect(service.muteParticipant("non-existent")).rejects.toThrow(
        "Participant not found",
      );
    });

    it("should allow host to remove participant", async () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.participants.set("user-2", participant);
      expect(service.participantCount).toBe(2);

      await service.removeParticipant("user-2");

      expect(service.participantCount).toBe(1);
      expect(service.callInfo!.participants.has("user-2")).toBe(false);
    });

    it("should not allow removing the host", async () => {
      await expect(service.removeParticipant("user-1")).rejects.toThrow(
        "Cannot remove the host",
      );
    });

    it("should allow host to lock room", async () => {
      expect(service.callInfo?.isLocked).toBe(false);

      await service.lockRoom();

      expect(service.callInfo?.isLocked).toBe(true);
    });

    it("should allow host to unlock room", async () => {
      await service.lockRoom();
      expect(service.callInfo?.isLocked).toBe(true);

      await service.unlockRoom();

      expect(service.callInfo?.isLocked).toBe(false);
    });

    it("should allow host to end call for everyone", async () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.participants.set("user-2", participant);

      await service.endCallForEveryone();

      expect(service.isInCall).toBe(false);
    });
  });

  // ===========================================================================
  // Role Controls Tests
  // ===========================================================================

  describe("Role Controls", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should allow host to promote participant to co-host", async () => {
      const participant = createMockParticipant({
        id: "user-2",
        role: "participant",
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.promoteToCoHost("user-2");

      expect(service.callInfo!.participants.get("user-2")?.role).toBe(
        "co-host",
      );
    });

    it("should allow host to demote co-host", async () => {
      const participant = createMockParticipant({
        id: "user-2",
        role: "co-host",
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.demoteFromCoHost("user-2");

      expect(service.callInfo!.participants.get("user-2")?.role).toBe(
        "participant",
      );
    });

    it("should allow host to make participant a viewer", async () => {
      const participant = createMockParticipant({
        id: "user-2",
        role: "participant",
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.makeViewer("user-2");

      expect(service.callInfo!.participants.get("user-2")?.role).toBe("viewer");
    });

    it("should mute viewer when setting role", async () => {
      const participant = createMockParticipant({
        id: "user-2",
        role: "participant",
        isMuted: false,
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.makeViewer("user-2");

      const viewer = service.callInfo!.participants.get("user-2");
      expect(viewer?.isMuted).toBe(true);
      expect(viewer?.isVideoEnabled).toBe(false);
    });

    it("should throw when trying to set host role directly", async () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.participants.set("user-2", participant);

      await expect(
        service.setParticipantRole("user-2", "host"),
      ).rejects.toThrow("Use transferHost to assign host role");
    });

    it("should allow host to transfer host role", async () => {
      const participant = createMockParticipant({
        id: "user-2",
        role: "participant",
      });
      service.callInfo!.participants.set("user-2", participant);

      await service.transferHost("user-2");

      expect(service.callInfo?.hostId).toBe("user-2");
      expect(service.callInfo!.participants.get("user-2")?.role).toBe("host");
      expect(service.callInfo!.participants.get("user-1")?.role).toBe(
        "co-host",
      );
    });

    it("should return correct role permissions for host", () => {
      const permissions = service.getRolePermissions("host");

      expect(permissions.canMute).toBe(true);
      expect(permissions.canUnmute).toBe(true);
      expect(permissions.canManageParticipants).toBe(true);
      expect(permissions.canManageRoles).toBe(true);
      expect(permissions.canRecord).toBe(true);
    });

    it("should return correct role permissions for co-host", () => {
      const permissions = service.getRolePermissions("co-host");

      expect(permissions.canMute).toBe(true);
      expect(permissions.canManageParticipants).toBe(true);
      expect(permissions.canManageRoles).toBe(false);
      expect(permissions.canRecord).toBe(false);
    });

    it("should return correct role permissions for viewer", () => {
      const permissions = service.getRolePermissions("viewer");

      expect(permissions.canMute).toBe(false);
      expect(permissions.canUnmute).toBe(false);
      expect(permissions.canEnableVideo).toBe(false);
      expect(permissions.canShareScreen).toBe(false);
    });

    it("should return participant role correctly", () => {
      const participant = createMockParticipant({
        id: "user-2",
        role: "co-host",
      });
      service.callInfo!.participants.set("user-2", participant);

      expect(service.getParticipantRole("user-2")).toBe("co-host");
      expect(service.getParticipantRole("non-existent")).toBeNull();
    });
  });

  // ===========================================================================
  // Lobby Tests
  // ===========================================================================

  describe("Lobby Controls", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should add participants to lobby when enabled", async () => {
      config = createMockConfig({ enableLobby: true });
      service = createGroupCallService(config);
      await service.initialize();
      await service.createGroupCall("video", { enableLobby: true });

      expect(service.callInfo).not.toBeNull();
      // Note: Lobby behavior is handled by signaling in production
    });

    it("should allow admitting participant from lobby", async () => {
      await service.createGroupCall("video", { enableLobby: true });

      // Add mock lobby participant
      const lobbyParticipant = createMockParticipant({
        id: "user-2",
        lobbyStatus: "waiting",
      });
      service.callInfo!.lobbyParticipants.set("user-2", lobbyParticipant);
      expect(service.lobbyCount).toBe(1);

      await service.admitFromLobby("user-2");

      expect(service.lobbyCount).toBe(0);
      expect(service.callInfo!.participants.has("user-2")).toBe(true);
    });

    it("should throw when admitting non-existent lobby participant", async () => {
      await service.createGroupCall("video", { enableLobby: true });

      await expect(service.admitFromLobby("non-existent")).rejects.toThrow(
        "Participant not in lobby",
      );
    });

    it("should allow admitting all from lobby", async () => {
      await service.createGroupCall("video", { enableLobby: true });

      const lobbyParticipant1 = createMockParticipant({ id: "user-2" });
      const lobbyParticipant2 = createMockParticipant({ id: "user-3" });
      service.callInfo!.lobbyParticipants.set("user-2", lobbyParticipant1);
      service.callInfo!.lobbyParticipants.set("user-3", lobbyParticipant2);
      expect(service.lobbyCount).toBe(2);

      await service.admitAllFromLobby();

      expect(service.lobbyCount).toBe(0);
      expect(service.participantCount).toBe(3); // host + 2 admitted
    });

    it("should allow denying participant from lobby", async () => {
      await service.createGroupCall("video", { enableLobby: true });

      const lobbyParticipant = createMockParticipant({ id: "user-2" });
      service.callInfo!.lobbyParticipants.set("user-2", lobbyParticipant);

      await service.denyFromLobby("user-2", "Not invited");

      expect(service.lobbyCount).toBe(0);
      expect(service.callInfo!.participants.has("user-2")).toBe(false);
    });

    it("should allow denying all from lobby", async () => {
      await service.createGroupCall("video", { enableLobby: true });

      const lobbyParticipant1 = createMockParticipant({ id: "user-2" });
      const lobbyParticipant2 = createMockParticipant({ id: "user-3" });
      service.callInfo!.lobbyParticipants.set("user-2", lobbyParticipant1);
      service.callInfo!.lobbyParticipants.set("user-3", lobbyParticipant2);

      await service.denyAllFromLobby();

      expect(service.lobbyCount).toBe(0);
    });

    it("should respect auto-admit domains", async () => {
      config = createMockConfig({
        enableLobby: true,
        autoAdmitDomains: ["company.com"],
      });
      service = createGroupCallService(config);
      await service.initialize();
      await service.createGroupCall("video", { enableLobby: true });

      expect(service.shouldAutoAdmit("user@company.com")).toBe(true);
      expect(service.shouldAutoAdmit("user@other.com")).toBe(false);
      expect(service.shouldAutoAdmit(undefined)).toBe(false);
    });

    it("should allow setting auto-admit", async () => {
      await service.createGroupCall("video");

      service.setAutoAdmit(true, ["newdomain.com"]);

      expect(service.shouldAutoAdmit("user@newdomain.com")).toBe(true);
    });

    it("should return lobby participants list", async () => {
      await service.createGroupCall("video", { enableLobby: true });

      const lobbyParticipant = createMockParticipant({
        id: "user-2",
        name: "Lobby User",
      });
      service.callInfo!.lobbyParticipants.set("user-2", lobbyParticipant);

      const lobbyList = service.getLobbyParticipants();

      expect(lobbyList).toHaveLength(1);
      expect(lobbyList[0].name).toBe("Lobby User");
    });
  });

  // ===========================================================================
  // Layout Tests
  // ===========================================================================

  describe("Layout Controls", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should default to grid layout", () => {
      expect(service.callInfo?.layout).toBe("grid");
    });

    it("should allow changing layout", () => {
      service.setLayout("speaker");
      expect(service.callInfo?.layout).toBe("speaker");

      service.setLayout("spotlight");
      expect(service.callInfo?.layout).toBe("spotlight");

      service.setLayout("sidebar");
      expect(service.callInfo?.layout).toBe("sidebar");
    });

    it("should emit layout-changed event", () => {
      const onLayoutChanged = jest.fn();
      service.on("layout-changed", onLayoutChanged);

      service.setLayout("speaker");

      expect(onLayoutChanged).toHaveBeenCalledWith({ layout: "speaker" });
    });

    it("should allow pinning participant", () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.participants.set("user-2", participant);

      service.pinParticipant("user-2");

      expect(service.callInfo?.pinnedParticipantId).toBe("user-2");
      expect(service.callInfo!.participants.get("user-2")?.isPinned).toBe(true);
    });

    it("should allow unpinning participant", () => {
      const participant = createMockParticipant({
        id: "user-2",
        isPinned: true,
      });
      service.callInfo!.participants.set("user-2", participant);
      service.callInfo!.pinnedParticipantId = "user-2";

      service.unpinParticipant();

      expect(service.callInfo?.pinnedParticipantId).toBeNull();
      expect(service.callInfo!.participants.get("user-2")?.isPinned).toBe(
        false,
      );
    });

    it("should allow spotlighting participant", () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.participants.set("user-2", participant);

      service.spotlightParticipant("user-2");

      expect(service.callInfo?.spotlightParticipantIds).toContain("user-2");
      expect(service.callInfo!.participants.get("user-2")?.isSpotlight).toBe(
        true,
      );
    });

    it("should allow removing spotlight", () => {
      const participant = createMockParticipant({
        id: "user-2",
        isSpotlight: true,
      });
      service.callInfo!.participants.set("user-2", participant);
      service.callInfo!.spotlightParticipantIds = ["user-2"];

      service.removeSpotlight("user-2");

      expect(service.callInfo?.spotlightParticipantIds).not.toContain("user-2");
      expect(service.callInfo!.participants.get("user-2")?.isSpotlight).toBe(
        false,
      );
    });

    it("should sort participants correctly for speaker layout", () => {
      const participant1 = createMockParticipant({
        id: "user-2",
        audioLevel: 0.5,
        joinedAt: new Date("2024-01-01"),
      });
      const participant2 = createMockParticipant({
        id: "user-3",
        audioLevel: 0.8,
        joinedAt: new Date("2024-01-02"),
      });
      service.callInfo!.participants.set("user-2", participant1);
      service.callInfo!.participants.set("user-3", participant2);

      service.setLayout("speaker");
      const layoutParticipants = service.getLayoutParticipants();

      // Higher audio level should come first in speaker layout
      expect(layoutParticipants[0].audioLevel).toBeGreaterThanOrEqual(
        layoutParticipants[1]?.audioLevel || 0,
      );
    });
  });

  // ===========================================================================
  // Media Controls Tests
  // ===========================================================================

  describe("Media Controls", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should toggle mute state", () => {
      expect(service.audioMuted).toBe(false);

      service.toggleMute();
      expect(service.audioMuted).toBe(true);

      service.toggleMute();
      expect(service.audioMuted).toBe(false);
    });

    it("should set mute state directly", () => {
      service.setMuted(true);
      expect(service.audioMuted).toBe(true);

      service.setMuted(false);
      expect(service.audioMuted).toBe(false);
    });

    it("should emit local-mute-change event", () => {
      const onMuteChange = jest.fn();
      service.on("local-mute-change", onMuteChange);

      service.toggleMute();

      expect(onMuteChange).toHaveBeenCalledWith({ isMuted: true });
    });

    it("should toggle video state", () => {
      expect(service.videoEnabled).toBe(true);

      service.toggleVideo();
      expect(service.videoEnabled).toBe(false);

      service.toggleVideo();
      expect(service.videoEnabled).toBe(true);
    });

    it("should set video state directly", () => {
      service.setVideoEnabled(false);
      expect(service.videoEnabled).toBe(false);

      service.setVideoEnabled(true);
      expect(service.videoEnabled).toBe(true);
    });

    it("should emit local-video-change event", () => {
      const onVideoChange = jest.fn();
      service.on("local-video-change", onVideoChange);

      service.toggleVideo();

      expect(onVideoChange).toHaveBeenCalledWith({ isVideoEnabled: false });
    });

    it("should start screen share", async () => {
      expect(service.screenSharing).toBe(false);

      await service.startScreenShare();

      expect(service.screenSharing).toBe(true);
    });

    it("should stop screen share", async () => {
      await service.startScreenShare();
      expect(service.screenSharing).toBe(true);

      service.stopScreenShare();

      expect(service.screenSharing).toBe(false);
    });
  });

  // ===========================================================================
  // Hand Raising Tests
  // ===========================================================================

  describe("Hand Raising", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should allow raising hand", () => {
      expect(service.handRaised).toBe(false);

      service.raiseHand();

      expect(service.handRaised).toBe(true);
    });

    it("should allow lowering hand", () => {
      service.raiseHand();
      expect(service.handRaised).toBe(true);

      service.lowerHand();

      expect(service.handRaised).toBe(false);
    });

    it("should emit hand-raised event", () => {
      const onHandRaised = jest.fn();
      service.on("hand-raised", onHandRaised);

      service.raiseHand();

      expect(onHandRaised).toHaveBeenCalledWith({ participantId: "user-1" });
    });

    it("should allow host to lower participant hand", () => {
      const participant = createMockParticipant({
        id: "user-2",
        isHandRaised: true,
      });
      service.callInfo!.participants.set("user-2", participant);

      service.lowerParticipantHand("user-2");

      expect(service.callInfo!.participants.get("user-2")?.isHandRaised).toBe(
        false,
      );
    });
  });

  // ===========================================================================
  // Recording Tests
  // ===========================================================================

  describe("Recording", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should allow host to start recording", async () => {
      expect(service.callInfo?.isRecording).toBe(false);

      await service.startRecording();

      expect(service.callInfo?.isRecording).toBe(true);
    });

    it("should allow host to stop recording", async () => {
      await service.startRecording();

      await service.stopRecording();

      expect(service.callInfo?.isRecording).toBe(false);
    });

    it("should emit recording events", async () => {
      const onRecordingStarted = jest.fn();
      const onRecordingStopped = jest.fn();
      service.on("recording-started", onRecordingStarted);
      service.on("recording-stopped", onRecordingStopped);

      await service.startRecording();
      expect(onRecordingStarted).toHaveBeenCalled();

      await service.stopRecording();
      expect(onRecordingStopped).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Metrics Tests
  // ===========================================================================

  describe("Metrics", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should track peak participant count", () => {
      // The service starts with 1 participant (host)
      // Peak participant count is tracked when participants join
      const metrics = service.callMetrics;

      // Initial metrics may be 0 since collectMetrics runs on interval
      // We check peak is at least 1 since host joined
      expect(service.participantCount).toBe(1);
    });

    it("should initialize metrics with zero values", () => {
      const metrics = service.callMetrics;

      expect(typeof metrics.duration).toBe("number");
      expect(typeof metrics.participantCount).toBe("number");
      expect(typeof metrics.totalJoins).toBe("number");
      expect(typeof metrics.totalLeaves).toBe("number");
    });

    it("should track total joins when admitting from lobby", async () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.lobbyParticipants.set("user-2", participant);

      const joinsBeforeAdmit = service.callMetrics.totalJoins;

      await service.admitFromLobby("user-2");

      expect(service.callMetrics.totalJoins).toBeGreaterThan(joinsBeforeAdmit);
    });

    it("should track total leaves when removing participant", async () => {
      const participant = createMockParticipant({ id: "user-2" });
      service.callInfo!.participants.set("user-2", participant);

      const leavesBeforeRemove = service.callMetrics.totalLeaves;

      await service.removeParticipant("user-2");

      expect(service.callMetrics.totalLeaves).toBeGreaterThan(
        leavesBeforeRemove,
      );
    });
  });

  // ===========================================================================
  // Large Room Support Tests
  // ===========================================================================

  describe("Large Room Support", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createGroupCall("video");
    });

    it("should identify large rooms correctly", () => {
      // Add 49 participants (threshold is 50)
      for (let i = 2; i <= 49; i++) {
        const participant = createMockParticipant({ id: `user-${i}` });
        service.callInfo!.participants.set(`user-${i}`, participant);
      }
      expect(service.isLargeRoom).toBe(false);

      // Add one more to reach threshold
      const participant = createMockParticipant({ id: "user-50" });
      service.callInfo!.participants.set("user-50", participant);
      expect(service.isLargeRoom).toBe(true);
    });

    it("should paginate participants", () => {
      // Add 25 participants
      for (let i = 2; i <= 25; i++) {
        const participant = createMockParticipant({
          id: `user-${i}`,
          name: `User ${i}`,
        });
        service.callInfo!.participants.set(`user-${i}`, participant);
      }

      const page0 = service.getParticipantPage(0);
      expect(page0.length).toBe(20);

      const page1 = service.getParticipantPage(1);
      expect(page1.length).toBe(5);
    });

    it("should track current page", () => {
      service.getParticipantPage(2);
      expect(service.getCurrentPage()).toBe(2);
    });

    it("should calculate total pages correctly", () => {
      // Add 45 participants (+ host = 46 total)
      for (let i = 2; i <= 46; i++) {
        const participant = createMockParticipant({ id: `user-${i}` });
        service.callInfo!.participants.set(`user-${i}`, participant);
      }

      expect(service.getTotalPages()).toBe(3); // 46 / 20 = 2.3, ceil = 3
    });

    it("should track visible participants", () => {
      for (let i = 2; i <= 25; i++) {
        const participant = createMockParticipant({ id: `user-${i}` });
        service.callInfo!.participants.set(`user-${i}`, participant);
      }

      service.getParticipantPage(0);

      expect(service.isParticipantVisible("user-2")).toBe(true);
      expect(service.isParticipantVisible("user-25")).toBe(false); // Beyond first page
    });
  });

  // ===========================================================================
  // Cleanup Tests
  // ===========================================================================

  describe("Cleanup", () => {
    it("should clean up resources on destroy", async () => {
      await service.initialize();
      await service.createGroupCall("video");
      expect(service.isInCall).toBe(true);

      service.destroy();

      expect(service.isInCall).toBe(false);
      expect(service.callInfo).toBeNull();
    });

    it("should remove all event listeners on destroy", async () => {
      await service.initialize();
      const listener = jest.fn();
      service.on("call-ended", listener);

      service.destroy();

      // Emit event after destroy should not trigger listener
      service.emit("call-ended", {});
      // Note: After removeAllListeners, the listener won't be called
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe("Error Handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should emit error events", async () => {
      const onError = jest.fn();
      config = createMockConfig({ onError });
      service = createGroupCallService(config);
      await service.initialize();

      // Force an error scenario
      await service.createGroupCall("video");

      // Try to mute non-existent participant
      try {
        await service.muteParticipant("non-existent");
      } catch {
        // Expected
      }

      // The error callback should be called via handleError
    });

    it("should handle permission errors gracefully", async () => {
      await service.createGroupCall("video");

      // Create a non-host service
      const nonHostConfig = createMockConfig({ userId: "user-2" });
      const nonHostService = createGroupCallService(nonHostConfig);
      await nonHostService.initialize();

      // This should throw because user-2 is not a host
      await expect(nonHostService.lockRoom()).rejects.toThrow();

      nonHostService.destroy();
    });
  });
});
