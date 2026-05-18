/**
 * Stage Channel Service Tests
 *
 * Comprehensive tests for Discord-like stage channels:
 * - Stage creation and management
 * - Speaker/listener roles
 * - Raise hand functionality
 * - Stage moderation
 * - Stage events
 */

import { EventEmitter } from "events";
import {
  StageChannelService,
  createStageChannelService,
  StageEventService,
  createStageEventService,
  type StageServiceOptions,
} from "../stage.service";
import type {
  StageChannel,
  StageParticipant,
  StageSettings,
  RaiseHandRequest,
  StageEvent,
  CreateStageChannelInput,
  CreateStageEventInput,
} from "@/types/stage";
import type { UserBasicInfo } from "@/types/user";

// =============================================================================
// Mocks
// =============================================================================

// Counter for generating unique IDs
let idCounter = 0;

// Mock signaling manager
jest.mock("@/lib/webrtc/signaling", () => ({
  createSignalingManager: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    initiateCall: jest.fn(),
    acceptCall: jest.fn(),
    endCall: jest.fn(),
    notifyMuteChange: jest.fn(),
    sendOffer: jest.fn(),
    sendAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
  })),
  generateCallId: jest.fn(() => `stage-${Date.now()}-${++idCounter}`),
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

// Mock navigator.mediaDevices
const mockMediaStream = {
  getTracks: jest.fn(() => []),
  getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
  getVideoTracks: jest.fn(() => []),
};

Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
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
    getByteFrequencyData: jest.fn(),
  }));
  close = jest.fn();
}

global.AudioContext = MockAudioContext as any;

// =============================================================================
// Test Helpers
// =============================================================================

function createTestConfig(): StageServiceOptions {
  return {
    userId: "user-1",
    userName: "Test User",
    userAvatarUrl: "https://example.com/avatar.jpg",
    maxReconnectAttempts: 3,
    reconnectDelayMs: 100,
  };
}

function createTestStageInput(): CreateStageChannelInput {
  return {
    channelId: "channel-1",
    workspaceId: "workspace-1",
    name: "Test Stage",
    topic: "Test Topic",
    description: "Test Description",
    isDiscoverable: true,
    isRecordingEnabled: true,
  };
}

function createTestUser(id: string, name: string): UserBasicInfo {
  return {
    id,
    displayName: name,
    username: name.toLowerCase().replace(" ", "_"),
    avatarUrl: `https://example.com/${id}.jpg`,
  } as UserBasicInfo;
}

// =============================================================================
// Stage Channel Service Tests
// =============================================================================

describe("StageChannelService", () => {
  let service: StageChannelService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createStageChannelService(createTestConfig());
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Initialization", () => {
    it("should create a stage channel service", () => {
      expect(service).toBeInstanceOf(StageChannelService);
    });

    it("should initialize with default state", () => {
      expect(service.isInStage).toBe(false);
      expect(service.isLive).toBe(false);
      expect(service.isSpeaker).toBe(false);
      expect(service.isModerator).toBe(false);
      expect(service.isListener).toBe(true);
      expect(service.role).toBe("listener");
    });

    it("should initialize signaling and audio analyzer", async () => {
      await service.initialize();
      expect(service).toBeDefined();
    });
  });

  describe("Stage Creation", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should create a stage channel", async () => {
      const stage = await service.createStage(createTestStageInput());

      expect(stage).toBeDefined();
      expect(stage.name).toBe("Test Stage");
      expect(stage.topic).toBe("Test Topic");
      expect(stage.status).toBe("live");
      expect(stage.createdBy).toBe("user-1");
    });

    it("should set creator as moderator", async () => {
      await service.createStage(createTestStageInput());

      expect(service.isModerator).toBe(true);
      expect(service.role).toBe("moderator");
    });

    it("should create stage with custom settings", async () => {
      const input = createTestStageInput();
      input.settings = {
        allowRaiseHand: false,
        autoAcceptRaiseHand: true,
        maxPendingRequests: 10,
      };

      const stage = await service.createStage(input);

      expect(stage.settings.allowRaiseHand).toBe(false);
      expect(stage.settings.autoAcceptRaiseHand).toBe(true);
      expect(stage.settings.maxPendingRequests).toBe(10);
    });

    it("should create scheduled stage", async () => {
      const input = createTestStageInput();
      input.scheduledStartTime = new Date(Date.now() + 3600000); // 1 hour from now

      const stage = await service.createStage(input);

      expect(stage.status).toBe("scheduled");
      expect(stage.scheduledStartTime).toBeDefined();
    });

    it("should throw if already in a stage", async () => {
      await service.createStage(createTestStageInput());

      await expect(service.createStage(createTestStageInput())).rejects.toThrow(
        "Already in a stage",
      );
    });

    it("should emit stage-created event", async () => {
      const handler = jest.fn();
      service.on("stage-created", handler);

      await service.createStage(createTestStageInput());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: expect.objectContaining({ name: "Test Stage" }),
        }),
      );
    });
  });

  describe("Stage Joining", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should join stage as listener by default", async () => {
      await service.joinStage("stage-123");

      expect(service.isInStage).toBe(true);
      expect(service.isListener).toBe(true);
      expect(service.role).toBe("listener");
    });

    it("should join stage as speaker when requested", async () => {
      await service.joinStage("stage-123", true);

      expect(service.isInStage).toBe(true);
      expect(service.isSpeaker).toBe(true);
      expect(service.role).toBe("speaker");
    });

    it("should throw if already in a stage", async () => {
      await service.joinStage("stage-123");

      await expect(service.joinStage("stage-456")).rejects.toThrow(
        "Already in a stage",
      );
    });
  });

  describe("Stage Leaving", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createStage(createTestStageInput());
    });

    it("should end stage if last moderator leaves", async () => {
      const handler = jest.fn();
      service.on("stage-ended", handler);

      await service.leaveStage();

      expect(handler).toHaveBeenCalled();
      expect(service.isInStage).toBe(false);
    });
  });

  describe("Topic Management", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createStage(createTestStageInput());
    });

    it("should update topic", async () => {
      const handler = jest.fn();
      service.on("topic-updated", handler);

      await service.updateTopic("New Topic");

      expect(service.stageInfo?.topic).toBe("New Topic");
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "New Topic",
          previousTopic: "Test Topic",
        }),
      );
    });

    it("should throw if not moderator", async () => {
      // Create a new service as non-moderator
      const listenerService = createStageChannelService({
        ...createTestConfig(),
        userId: "listener-1",
      });
      await listenerService.initialize();
      await listenerService.joinStage("stage-123");

      await expect(listenerService.updateTopic("New Topic")).rejects.toThrow(
        "Not authorized to update topic",
      );

      listenerService.destroy();
    });
  });

  describe("Stage Pause/Resume", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createStage(createTestStageInput());
    });

    it("should pause stage", async () => {
      const handler = jest.fn();
      service.on("stage-paused", handler);

      await service.pauseStage();

      expect(service.stageInfo?.status).toBe("paused");
      expect(handler).toHaveBeenCalled();
    });

    it("should resume stage", async () => {
      await service.pauseStage();

      const handler = jest.fn();
      service.on("stage-resumed", handler);

      await service.resumeStage();

      expect(service.stageInfo?.status).toBe("live");
      expect(handler).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Speaker/Listener Role Tests
// =============================================================================

describe("Speaker/Listener Roles", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Invite to Speak", () => {
    it("should invite listener to speak", async () => {
      // Simulate a listener joining
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "listener-1",
        user: createTestUser("listener-1", "Listener One"),
        role: "listener",
        isMuted: true,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      // Add participant to internal state
      (service as any).participants.set("listener-1", participant);

      const handler = jest.fn();
      service.on("speaker-invited", handler);

      await service.inviteToSpeak("listener-1");

      expect(handler).toHaveBeenCalled();
      expect(participant.role).toBe("speaker");
    });

    it("should throw if not moderator", async () => {
      const listenerService = createStageChannelService({
        ...createTestConfig(),
        userId: "listener-1",
      });
      await listenerService.initialize();
      await listenerService.joinStage("stage-123");

      await expect(listenerService.inviteToSpeak("user-2")).rejects.toThrow(
        "Not authorized to invite speakers",
      );

      listenerService.destroy();
    });
  });

  describe("Move to Audience", () => {
    it("should move speaker to audience", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "speaker-1",
        user: createTestUser("speaker-1", "Speaker One"),
        role: "speaker",
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("speaker-1", participant);

      const handler = jest.fn();
      service.on("speaker-removed", handler);

      await service.moveToAudience("speaker-1");

      expect(handler).toHaveBeenCalled();
      expect(participant.role).toBe("listener");
      expect(participant.isMuted).toBe(true);
    });

    it("should not move moderator to audience", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "mod-1",
        user: createTestUser("mod-1", "Moderator One"),
        role: "moderator",
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("mod-1", participant);

      await expect(service.moveToAudience("mod-1")).rejects.toThrow(
        "Cannot move moderator to audience",
      );
    });
  });

  describe("Mute Speaker", () => {
    it("should mute speaker", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "speaker-1",
        user: createTestUser("speaker-1", "Speaker One"),
        role: "speaker",
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("speaker-1", participant);

      const handler = jest.fn();
      service.on("speaker-muted", handler);

      await service.muteSpeaker("speaker-1");

      expect(participant.isServerMuted).toBe(true);
      expect(participant.isMuted).toBe(true);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("Remove from Stage", () => {
    it("should remove participant from stage", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "listener-1",
        user: createTestUser("listener-1", "Listener One"),
        role: "listener",
        isMuted: true,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("listener-1", participant);

      const handler = jest.fn();
      service.on("participant-removed", handler);

      await service.removeFromStage("listener-1");

      expect(handler).toHaveBeenCalled();
      expect(service.getParticipant("listener-1")).toBeUndefined();
    });

    it("should not remove moderator", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "mod-1",
        user: createTestUser("mod-1", "Moderator One"),
        role: "moderator",
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("mod-1", participant);

      await expect(service.removeFromStage("mod-1")).rejects.toThrow(
        "Cannot remove moderator",
      );
    });
  });

  describe("Moderator Promotion/Demotion", () => {
    it("should promote speaker to moderator", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "speaker-1",
        user: createTestUser("speaker-1", "Speaker One"),
        role: "speaker",
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("speaker-1", participant);

      await service.promoteToModerator("speaker-1");

      expect(participant.role).toBe("moderator");
    });

    it("should demote moderator to speaker", async () => {
      const participant: StageParticipant = {
        id: "participant-1",
        stageId: "stage-1",
        userId: "mod-2",
        user: createTestUser("mod-2", "Moderator Two"),
        role: "moderator",
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isServerMuted: false,
        isServerDeafened: false,
      };

      (service as any).participants.set("mod-2", participant);

      await service.demoteFromModerator("mod-2");

      expect(participant.role).toBe("speaker");
    });
  });
});

// =============================================================================
// Raise Hand Tests
// =============================================================================

describe("Raise Hand Functionality", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService({
      ...createTestConfig(),
      userId: "listener-1",
    });
    await service.initialize();
    await service.joinStage("stage-123");
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Raise Hand", () => {
    it("should raise hand as listener", async () => {
      // Enable raise hand in settings
      (service as any).currentStage.settings.allowRaiseHand = true;

      const handler = jest.fn();
      service.on("hand-raised", handler);

      const request = await service.raiseHand("I have a question");

      expect(request).toBeDefined();
      expect(request.userId).toBe("listener-1");
      expect(request.status).toBe("pending");
      expect(request.message).toBe("I have a question");
      expect(service.handIsRaised).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it("should throw if raise hand is disabled", async () => {
      (service as any).currentStage.settings.allowRaiseHand = false;

      await expect(service.raiseHand()).rejects.toThrow(
        "Raise hand is disabled",
      );
    });

    it("should throw if already raised hand", async () => {
      (service as any).currentStage.settings.allowRaiseHand = true;
      await service.raiseHand();

      await expect(service.raiseHand()).rejects.toThrow("Hand already raised");
    });

    it("should not auto-accept for non-moderator (requires manual acceptance)", async () => {
      // Auto-accept only works when a moderator processes the request
      // For a listener, the request stays pending until accepted
      (service as any).currentStage.settings.allowRaiseHand = true;
      (service as any).currentStage.settings.autoAcceptRaiseHand = false;

      const request = await service.raiseHand();

      expect(request.status).toBe("pending");
    });
  });

  describe("Lower Hand", () => {
    it("should lower raised hand", async () => {
      (service as any).currentStage.settings.allowRaiseHand = true;
      (service as any).currentStage.settings.autoAcceptRaiseHand = false;
      await service.raiseHand();

      const handler = jest.fn();
      service.on("hand-lowered", handler);

      await service.lowerHand();

      expect(service.handIsRaised).toBe(false);
      expect(handler).toHaveBeenCalled();
    });

    it("should throw if hand not raised", async () => {
      await expect(service.lowerHand()).rejects.toThrow("Hand not raised");
    });
  });
});

describe("Raise Hand Moderation", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());
  });

  afterEach(() => {
    service.destroy();
  });

  it("should accept raise hand request", async () => {
    // Create a pending request
    const request: RaiseHandRequest = {
      id: "request-1",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      status: "pending",
      requestedAt: new Date(),
      position: 0,
    };

    (service as any).raiseHandRequests.set("request-1", request);
    (service as any).raiseHandQueue.push("request-1");

    // Add participant
    const participant: StageParticipant = {
      id: "participant-1",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      role: "listener",
      isMuted: true,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: true,
      isServerMuted: false,
      isServerDeafened: false,
    };

    (service as any).participants.set("listener-1", participant);

    const handler = jest.fn();
    service.on("hand-accepted", handler);

    await service.acceptRaiseHand("request-1");

    expect(request.status).toBe("accepted");
    expect(participant.role).toBe("speaker");
    expect(handler).toHaveBeenCalled();
  });

  it("should decline raise hand request", async () => {
    const request: RaiseHandRequest = {
      id: "request-1",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      status: "pending",
      requestedAt: new Date(),
      position: 0,
    };

    (service as any).raiseHandRequests.set("request-1", request);
    (service as any).raiseHandQueue.push("request-1");

    const participant: StageParticipant = {
      id: "participant-1",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      role: "listener",
      isMuted: true,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: true,
      isServerMuted: false,
      isServerDeafened: false,
    };

    (service as any).participants.set("listener-1", participant);

    const handler = jest.fn();
    service.on("hand-declined", handler);

    await service.declineRaiseHand("request-1", "Not relevant");

    expect(request.status).toBe("declined");
    expect(request.declineReason).toBe("Not relevant");
    expect(participant.hasRaisedHand).toBe(false);
    expect(handler).toHaveBeenCalled();
  });

  it("should lower participant hand by moderator", async () => {
    const participant: StageParticipant = {
      id: "participant-1",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      role: "listener",
      isMuted: true,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: true,
      isServerMuted: false,
      isServerDeafened: false,
    };

    (service as any).participants.set("listener-1", participant);

    await service.lowerParticipantHand("listener-1");

    expect(participant.hasRaisedHand).toBe(false);
  });

  it("should return pending raise hand requests in order", async () => {
    const request1: RaiseHandRequest = {
      id: "request-1",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      status: "pending",
      requestedAt: new Date(Date.now() - 10000),
      position: 0,
    };

    const request2: RaiseHandRequest = {
      id: "request-2",
      stageId: "stage-1",
      userId: "listener-2",
      user: createTestUser("listener-2", "Listener Two"),
      status: "pending",
      requestedAt: new Date(),
      position: 1,
    };

    (service as any).raiseHandRequests.set("request-1", request1);
    (service as any).raiseHandRequests.set("request-2", request2);
    (service as any).raiseHandQueue = ["request-1", "request-2"];

    const requests = service.getRaiseHandRequests();

    expect(requests).toHaveLength(2);
    expect(requests[0].id).toBe("request-1");
    expect(requests[1].id).toBe("request-2");
  });
});

// =============================================================================
// Audio Controls Tests
// =============================================================================

describe("Audio Controls", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());
  });

  afterEach(() => {
    service.destroy();
  });

  it("should toggle mute", () => {
    expect(service.audioMuted).toBe(true); // Initially muted

    service.toggleMute();
    expect(service.audioMuted).toBe(false);

    service.toggleMute();
    expect(service.audioMuted).toBe(true);
  });

  it("should set muted state", () => {
    service.setMuted(false);
    expect(service.audioMuted).toBe(false);

    service.setMuted(true);
    expect(service.audioMuted).toBe(true);
  });

  it("should emit mute change event", () => {
    const handler = jest.fn();
    service.on("local-mute-change", handler);

    service.setMuted(false);

    expect(handler).toHaveBeenCalledWith({ isMuted: false });
  });
});

// =============================================================================
// Recording Tests
// =============================================================================

describe("Recording", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage({
      ...createTestStageInput(),
      isRecordingEnabled: true,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  it("should start recording", async () => {
    const handler = jest.fn();
    service.on("recording-started", handler);

    await service.startRecording();

    expect(service.stageInfo?.isRecording).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it("should stop recording", async () => {
    await service.startRecording();

    const handler = jest.fn();
    service.on("recording-stopped", handler);

    await service.stopRecording();

    expect(service.stageInfo?.isRecording).toBe(false);
    expect(handler).toHaveBeenCalled();
  });

  it("should throw if recording not enabled", async () => {
    (service as any).currentStage.isRecordingEnabled = false;

    await expect(service.startRecording()).rejects.toThrow(
      "Recording is not enabled for this stage",
    );
  });
});

// =============================================================================
// Participant Getters Tests
// =============================================================================

describe("Participant Getters", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());

    // Add test participants
    const moderator: StageParticipant = {
      id: "p-1",
      stageId: "stage-1",
      userId: "user-1",
      user: createTestUser("user-1", "Test User"),
      role: "moderator",
      isMuted: false,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: false,
      isServerMuted: false,
      isServerDeafened: false,
      speakerPosition: 0,
    };

    const speaker: StageParticipant = {
      id: "p-2",
      stageId: "stage-1",
      userId: "speaker-1",
      user: createTestUser("speaker-1", "Speaker One"),
      role: "speaker",
      isMuted: false,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: false,
      isServerMuted: false,
      isServerDeafened: false,
      speakerPosition: 1,
    };

    const listener1: StageParticipant = {
      id: "p-3",
      stageId: "stage-1",
      userId: "listener-1",
      user: createTestUser("listener-1", "Listener One"),
      role: "listener",
      isMuted: true,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(Date.now() - 10000),
      hasRaisedHand: false,
      isServerMuted: false,
      isServerDeafened: false,
    };

    const listener2: StageParticipant = {
      id: "p-4",
      stageId: "stage-1",
      userId: "listener-2",
      user: createTestUser("listener-2", "Listener Two"),
      role: "listener",
      isMuted: true,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: true,
      isServerMuted: false,
      isServerDeafened: false,
    };

    (service as any).participants.set("user-1", moderator);
    (service as any).participants.set("speaker-1", speaker);
    (service as any).participants.set("listener-1", listener1);
    (service as any).participants.set("listener-2", listener2);
  });

  afterEach(() => {
    service.destroy();
  });

  it("should return speakers sorted by position", () => {
    const speakers = service.getSpeakers();

    expect(speakers).toHaveLength(2);
    expect(speakers[0].role).toBe("moderator");
    expect(speakers[1].role).toBe("speaker");
  });

  it("should return listeners with raised hands first", () => {
    const listeners = service.getListeners();

    expect(listeners).toHaveLength(2);
    expect(listeners[0].hasRaisedHand).toBe(true);
    expect(listeners[1].hasRaisedHand).toBe(false);
  });

  it("should return all participants", () => {
    const participants = service.getParticipants();

    expect(participants).toHaveLength(4);
  });

  it("should return participant by ID", () => {
    const participant = service.getParticipant("speaker-1");

    expect(participant).toBeDefined();
    expect(participant?.userId).toBe("speaker-1");
  });

  it("should return correct counts", () => {
    expect(service.speakerCount).toBe(2);
    expect(service.stageListenerCount).toBe(2);
    expect(service.totalParticipants).toBe(4);
  });
});

// =============================================================================
// Metrics Tests
// =============================================================================

describe("Stage Metrics", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());
  });

  afterEach(() => {
    service.destroy();
  });

  it("should track metrics", () => {
    const metrics = service.stageMetrics;

    expect(metrics).toBeDefined();
    expect(metrics.stageId).toBeDefined();
    // Metrics are updated periodically, initial values may be 0
    expect(typeof metrics.speakerCount).toBe("number");
    expect(typeof metrics.listenerCount).toBe("number");
    expect(metrics.totalRaiseHandRequests).toBe(0);
  });

  it("should track raise hand request metrics", async () => {
    // Create listener service
    const listenerService = createStageChannelService({
      ...createTestConfig(),
      userId: "listener-1",
    });
    await listenerService.initialize();
    await listenerService.joinStage("stage-123");
    (listenerService as any).currentStage.settings.allowRaiseHand = true;
    (listenerService as any).currentStage.settings.autoAcceptRaiseHand = false;
    await listenerService.raiseHand();

    const metrics = listenerService.stageMetrics;
    expect(metrics.totalRaiseHandRequests).toBe(1);

    listenerService.destroy();
  });
});

// =============================================================================
// Moderation Log Tests
// =============================================================================

describe("Moderation Log", () => {
  let service: StageChannelService;

  beforeEach(async () => {
    service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());
  });

  afterEach(() => {
    service.destroy();
  });

  it("should log moderation actions", async () => {
    await service.updateTopic("New Topic");

    const log = service.getModerationLog();

    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("update_topic");
    expect(log[0].moderatorId).toBe("user-1");
  });

  it("should emit moderation action events", async () => {
    const handler = jest.fn();
    service.on("moderation-action", handler);

    await service.pauseStage();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        log: expect.objectContaining({
          action: "pause_stage",
        }),
      }),
    );
  });
});

// =============================================================================
// Stage Event Service Tests
// =============================================================================

describe("StageEventService", () => {
  let eventService: StageEventService;

  beforeEach(() => {
    eventService = createStageEventService();
  });

  describe("Event Creation", () => {
    it("should create a stage event", async () => {
      const host = createTestUser("host-1", "Host User");
      const input: CreateStageEventInput = {
        stageId: "stage-1",
        name: "Community Meetup",
        description: "Weekly meetup",
        scheduledStart: new Date(Date.now() + 86400000),
        sendReminders: true,
        reminderMinutesBefore: [15, 60],
      };

      const event = await eventService.createEvent(input, host);

      expect(event).toBeDefined();
      expect(event.name).toBe("Community Meetup");
      expect(event.status).toBe("scheduled");
      expect(event.hostId).toBe("host-1");
    });

    it("should create recurring event", async () => {
      const host = createTestUser("host-1", "Host User");
      const input: CreateStageEventInput = {
        stageId: "stage-1",
        name: "Weekly Standup",
        scheduledStart: new Date(Date.now() + 86400000),
        isRecurring: true,
        recurrencePattern: {
          type: "weekly",
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
          timeOfDay: "09:00",
          timezone: "America/New_York",
        },
      };

      const event = await eventService.createEvent(input, host);

      expect(event.isRecurring).toBe(true);
      expect(event.recurrencePattern?.type).toBe("weekly");
      expect(event.recurrencePattern?.daysOfWeek).toEqual([1, 3, 5]);
    });
  });

  describe("Event Updates", () => {
    it("should update event", async () => {
      const host = createTestUser("host-1", "Host User");
      const event = await eventService.createEvent(
        {
          stageId: "stage-1",
          name: "Original Name",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      const updated = await eventService.updateEvent(event.id, {
        name: "Updated Name",
        description: "New description",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("New description");
    });

    it("should cancel event", async () => {
      const host = createTestUser("host-1", "Host User");
      const event = await eventService.createEvent(
        {
          stageId: "stage-1",
          name: "Event to Cancel",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      await eventService.cancelEvent(event.id);

      const cancelled = eventService.getEvent(event.id);
      expect(cancelled?.status).toBe("cancelled");
    });
  });

  describe("Event Interest", () => {
    it("should express interest in event", async () => {
      const host = createTestUser("host-1", "Host User");
      const user = createTestUser("user-1", "Interested User");

      const event = await eventService.createEvent(
        {
          stageId: "stage-1",
          name: "Interesting Event",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      const interest = await eventService.expressInterest(event.id, user);

      expect(interest.userId).toBe("user-1");
      expect(interest.reminderEnabled).toBe(true);

      const updatedEvent = eventService.getEvent(event.id);
      expect(updatedEvent?.interestedCount).toBe(1);
    });

    it("should remove interest from event", async () => {
      const host = createTestUser("host-1", "Host User");
      const user = createTestUser("user-1", "User");

      const event = await eventService.createEvent(
        {
          stageId: "stage-1",
          name: "Event",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      await eventService.expressInterest(event.id, user);
      await eventService.removeInterest(event.id, user.id);

      const updatedEvent = eventService.getEvent(event.id);
      expect(updatedEvent?.interestedCount).toBe(0);
    });
  });

  describe("Event Queries", () => {
    it("should get events for stage", async () => {
      // Create a fresh service for this test
      const freshEventService = createStageEventService();
      const host = createTestUser("host-1", "Host User");

      await freshEventService.createEvent(
        {
          stageId: "stage-query-1",
          name: "Event 1",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      await freshEventService.createEvent(
        {
          stageId: "stage-query-1",
          name: "Event 2",
          scheduledStart: new Date(Date.now() + 172800000),
        },
        host,
      );

      await freshEventService.createEvent(
        {
          stageId: "stage-query-2",
          name: "Other Event",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      const events = freshEventService.getEventsForStage("stage-query-1");

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe("Event 1");
      expect(events[1].name).toBe("Event 2");
    });

    it("should get upcoming events", async () => {
      // Create a fresh service for this test
      const freshEventService = createStageEventService();
      const host = createTestUser("host-1", "Host User");

      await freshEventService.createEvent(
        {
          stageId: "stage-upcoming-1",
          name: "Soon Event",
          scheduledStart: new Date(Date.now() + 3600000),
        },
        host,
      );

      await freshEventService.createEvent(
        {
          stageId: "stage-upcoming-2",
          name: "Later Event",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      const upcoming = freshEventService.getUpcomingEvents(10);

      expect(upcoming).toHaveLength(2);
      expect(upcoming[0].name).toBe("Soon Event");
    });

    it("should get interested users", async () => {
      const host = createTestUser("host-1", "Host User");
      const user1 = createTestUser("user-1", "User One");
      const user2 = createTestUser("user-2", "User Two");

      const event = await eventService.createEvent(
        {
          stageId: "stage-1",
          name: "Popular Event",
          scheduledStart: new Date(Date.now() + 86400000),
        },
        host,
      );

      await eventService.expressInterest(event.id, user1);
      await eventService.expressInterest(event.id, user2);

      const interested = eventService.getInterestedUsers(event.id);

      expect(interested).toHaveLength(2);
    });
  });
});

// =============================================================================
// Cleanup Tests
// =============================================================================

describe("Cleanup", () => {
  it("should clean up resources on destroy", async () => {
    const service = createStageChannelService(createTestConfig());
    await service.initialize();
    await service.createStage(createTestStageInput());

    service.destroy();

    expect(service.isInStage).toBe(false);
    expect(service.stageInfo).toBeNull();
  });
});
