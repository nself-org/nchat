/**
 * Voice Chat Service Tests
 *
 * Comprehensive tests for Telegram-style live voice chats including
 * scheduling, host roles, push-to-talk, raise hand, and recording.
 */

import {
  VoiceChatService,
  createVoiceChatService,
} from "../voice-chat.service";
import type {
  VoiceChatServiceOptions,
  CreateVoiceChatInput,
  ScheduleVoiceChatInput,
  PushToTalkMode,
} from "../voice-chat.service";

// =============================================================================
// Mocks
// =============================================================================

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
const mockGetDisplayMedia = jest.fn();

Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia,
  },
  writable: true,
});

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as ((event: { data: Blob }) => void) | null,
  state: "inactive",
};

global.MediaRecorder = jest
  .fn()
  .mockImplementation(() => mockMediaRecorder) as any;

// Mock AudioContext
const mockAudioContext = {
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
  }),
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  }),
  close: jest.fn(),
};

global.AudioContext = jest
  .fn()
  .mockImplementation(() => mockAudioContext) as any;

// Mock signaling manager
let callIdCounter = 0;
jest.mock("@/lib/webrtc/signaling", () => ({
  createSignalingManager: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    initiateCall: jest.fn(),
    acceptCall: jest.fn(),
    endCall: jest.fn(),
    notifyMuteChange: jest.fn(),
    sendOffer: jest.fn(),
    sendAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
  }),
  generateCallId: jest
    .fn()
    .mockImplementation(() => `test-voice-chat-id-${++callIdCounter}`),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock URL
global.URL.createObjectURL = jest
  .fn()
  .mockReturnValue("blob:test-recording-url");

// =============================================================================
// Test Helpers
// =============================================================================

function createTestConfig(
  overrides?: Partial<VoiceChatServiceOptions>,
): VoiceChatServiceOptions {
  return {
    userId: "test-user-id",
    userName: "Test User",
    userAvatarUrl: "https://example.com/avatar.jpg",
    ...overrides,
  };
}

function createTestVoiceChatInput(
  overrides?: Partial<CreateVoiceChatInput>,
): CreateVoiceChatInput {
  return {
    channelId: "test-channel-id",
    workspaceId: "test-workspace-id",
    title: "Test Voice Chat",
    ...overrides,
  };
}

function createMockMediaStream(): MediaStream {
  const mockTrack = {
    enabled: true,
    stop: jest.fn(),
    kind: "audio",
  };
  return {
    getTracks: jest.fn().mockReturnValue([mockTrack]),
    getAudioTracks: jest.fn().mockReturnValue([mockTrack]),
    getVideoTracks: jest.fn().mockReturnValue([]),
    addTrack: jest.fn(),
  } as unknown as MediaStream;
}

// =============================================================================
// Tests
// =============================================================================

describe("VoiceChatService", () => {
  let service: VoiceChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(createMockMediaStream());
    mockGetDisplayMedia.mockResolvedValue(createMockMediaStream());
    service = createVoiceChatService(createTestConfig());
  });

  afterEach(() => {
    service.destroy();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("Initialization", () => {
    it("should create service with correct config", () => {
      expect(service).toBeInstanceOf(VoiceChatService);
      expect(service.isInVoiceChat).toBe(false);
      expect(service.role).toBe("listener");
    });

    it("should initialize signaling and audio analyzer", async () => {
      await service.initialize();
      expect(AudioContext).toHaveBeenCalled();
    });

    it("should have correct initial state", () => {
      expect(service.voiceChatInfo).toBeNull();
      expect(service.isLive).toBe(false);
      expect(service.isCreator).toBe(false);
      expect(service.isAdmin).toBe(false);
      expect(service.isSpeaker).toBe(false);
      expect(service.totalParticipants).toBe(0);
    });
  });

  // ===========================================================================
  // Voice Chat Creation Tests
  // ===========================================================================

  describe("Voice Chat Creation", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should create a voice chat with basic settings", async () => {
      const input = createTestVoiceChatInput();
      const voiceChat = await service.createVoiceChat(input);

      expect(voiceChat).toBeDefined();
      expect(voiceChat.title).toBe("Test Voice Chat");
      expect(voiceChat.channelId).toBe("test-channel-id");
      expect(voiceChat.status).toBe("live");
      expect(voiceChat.creatorId).toBe("test-user-id");
    });

    it("should set creator role when creating voice chat", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      expect(service.role).toBe("creator");
      expect(service.isCreator).toBe(true);
      expect(service.isAdmin).toBe(true);
      expect(service.isSpeaker).toBe(true);
    });

    it("should add self as first participant", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      const participants = service.getParticipants();
      expect(participants.length).toBe(1);
      expect(participants[0].userId).toBe("test-user-id");
      expect(participants[0].role).toBe("creator");
    });

    it("should create scheduled voice chat", async () => {
      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
      const input = createTestVoiceChatInput({
        scheduledStartTime: scheduledTime,
      });
      const voiceChat = await service.createVoiceChat(input);

      expect(voiceChat.status).toBe("scheduled");
      expect(voiceChat.scheduledStartTime).toEqual(scheduledTime);
      expect(voiceChat.startedAt).toBeUndefined();
    });

    it("should generate invite link", async () => {
      const voiceChat = await service.createVoiceChat(
        createTestVoiceChatInput(),
      );

      expect(voiceChat.inviteLink).toBeDefined();
      expect(voiceChat.inviteLink).toContain("voice-chat/");
    });

    it("should prevent creating voice chat when already in one", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      await expect(
        service.createVoiceChat(createTestVoiceChatInput()),
      ).rejects.toThrow("Already in a voice chat");
    });

    it("should apply custom settings", async () => {
      const input = createTestVoiceChatInput({
        settings: {
          defaultTalkMode: "push_to_talk",
          maxParticipants: 50,
          allowRaiseHand: false,
        },
      });
      const voiceChat = await service.createVoiceChat(input);

      expect(voiceChat.settings.defaultTalkMode).toBe("push_to_talk");
      expect(voiceChat.settings.maxParticipants).toBe(50);
      expect(voiceChat.settings.allowRaiseHand).toBe(false);
    });
  });

  // ===========================================================================
  // Join and Leave Tests
  // ===========================================================================

  describe("Join and Leave", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should join voice chat as listener by default", async () => {
      await service.joinVoiceChat("test-voice-chat-id");

      expect(service.isInVoiceChat).toBe(true);
      expect(service.role).toBe("listener");
      expect(service.isListener).toBe(true);
    });

    it("should join voice chat as speaker when specified", async () => {
      await service.joinVoiceChat("test-voice-chat-id", false);

      expect(service.isInVoiceChat).toBe(true);
      expect(service.role).toBe("speaker");
      expect(service.isSpeaker).toBe(true);
    });

    it("should prevent joining when already in a voice chat", async () => {
      await service.joinVoiceChat("test-voice-chat-id");

      await expect(
        service.joinVoiceChat("another-voice-chat-id"),
      ).rejects.toThrow("Already in a voice chat");
    });

    it("should leave voice chat and cleanup", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      // Need another admin before creator can leave
      // Since we're the only one, leaving should end the voice chat
      await service.leaveVoiceChat();

      expect(service.isInVoiceChat).toBe(false);
      expect(service.voiceChatInfo).toBeNull();
    });

    it("should update participant count on join", async () => {
      await service.joinVoiceChat("test-voice-chat-id");

      expect(service.totalParticipants).toBe(1);
    });

    it("should join from invite link", async () => {
      await service.joinFromInviteLink(
        "https://app.example.com/voice-chat/test-id",
      );

      expect(service.isInVoiceChat).toBe(true);
    });

    it("should reject invalid invite link", async () => {
      await expect(service.joinFromInviteLink("invalid-link")).rejects.toThrow(
        "Invalid invite link",
      );
    });
  });

  // ===========================================================================
  // Host Roles Tests
  // ===========================================================================

  describe("Host Roles", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createVoiceChat(createTestVoiceChatInput());
    });

    it("should promote listener to speaker", async () => {
      // Add a mock listener
      const mockParticipant = {
        userId: "listener-user-id",
        role: "listener",
        user: { id: "listener-user-id", displayName: "Listener" },
      };
      // @ts-ignore - accessing private for testing
      service.participants.set("listener-user-id", {
        ...mockParticipant,
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: true,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.inviteToSpeak("listener-user-id");

      const participant = service.getParticipant("listener-user-id");
      expect(participant?.role).toBe("speaker");
    });

    it("should move speaker to listeners", async () => {
      // Add a mock speaker
      // @ts-ignore - accessing private for testing
      service.participants.set("speaker-user-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "speaker-user-id",
        user: { id: "speaker-user-id", displayName: "Speaker" },
        role: "speaker",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.moveToListeners("speaker-user-id");

      const participant = service.getParticipant("speaker-user-id");
      expect(participant?.role).toBe("listener");
    });

    it("should not allow moving creator to listeners", async () => {
      await expect(service.moveToListeners("test-user-id")).rejects.toThrow(
        "Cannot move creator to listeners",
      );
    });

    it("should promote to admin", async () => {
      // Add a mock participant
      // @ts-ignore
      service.participants.set("regular-user-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "regular-user-id",
        user: { id: "regular-user-id", displayName: "Regular User" },
        role: "speaker",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.promoteToAdmin("regular-user-id");

      const participant = service.getParticipant("regular-user-id");
      expect(participant?.role).toBe("admin");
    });

    it("should demote admin to speaker", async () => {
      // @ts-ignore
      service.participants.set("admin-user-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "admin-user-id",
        user: { id: "admin-user-id", displayName: "Admin User" },
        role: "admin",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.demoteFromAdmin("admin-user-id");

      const participant = service.getParticipant("admin-user-id");
      expect(participant?.role).toBe("speaker");
    });

    it("should force mute participant", async () => {
      // @ts-ignore
      service.participants.set("speaker-user-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "speaker-user-id",
        user: { id: "speaker-user-id", displayName: "Speaker" },
        role: "speaker",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.forcemuteParticipant("speaker-user-id");

      const participant = service.getParticipant("speaker-user-id");
      expect(participant?.isForceMuted).toBe(true);
      expect(participant?.isMuted).toBe(true);
    });

    it("should remove participant from voice chat", async () => {
      // @ts-ignore
      service.participants.set("to-remove-user-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "to-remove-user-id",
        user: { id: "to-remove-user-id", displayName: "To Remove" },
        role: "speaker",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.removeFromVoiceChat("to-remove-user-id");

      expect(service.getParticipant("to-remove-user-id")).toBeUndefined();
    });

    it("should not allow non-admins to manage participants", async () => {
      // Create a new service as non-admin
      const listenerService = createVoiceChatService(
        createTestConfig({
          userId: "listener-id",
          userName: "Listener",
        }),
      );
      await listenerService.initialize();
      await listenerService.joinVoiceChat("test-voice-chat-id");

      await expect(listenerService.inviteToSpeak("some-user")).rejects.toThrow(
        "Not authorized",
      );

      listenerService.destroy();
    });
  });

  // ===========================================================================
  // Raise Hand Tests
  // ===========================================================================

  describe("Raise Hand", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should allow listener to raise hand", async () => {
      await service.joinVoiceChat("test-voice-chat-id"); // Joins as listener

      const request = await service.raiseHand("I have a question");

      expect(request).toBeDefined();
      expect(request.status).toBe("pending");
      expect(request.message).toBe("I have a question");
      expect(service.handIsRaised).toBe(true);
    });

    it("should prevent speaker from raising hand", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      await expect(service.raiseHand()).rejects.toThrow(
        "Cannot raise hand as speaker",
      );
    });

    it("should allow lowering hand", async () => {
      await service.joinVoiceChat("test-voice-chat-id");
      await service.raiseHand();

      await service.lowerHand();

      expect(service.handIsRaised).toBe(false);
    });

    it("should accept raise hand request", async () => {
      // Setup creator service
      await service.createVoiceChat(createTestVoiceChatInput());

      // Add a listener with raised hand
      // @ts-ignore
      service.participants.set("listener-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-id",
        user: { id: "listener-id", displayName: "Listener" },
        role: "listener",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: true,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: true,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      // @ts-ignore
      service.raiseHandRequests.set("request-id", {
        id: "request-id",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-id",
        user: { id: "listener-id", displayName: "Listener" },
        status: "pending",
        requestedAt: new Date(),
        position: 0,
      });
      // @ts-ignore
      service.raiseHandQueue.push("request-id");

      await service.acceptRaiseHand("request-id");

      const participant = service.getParticipant("listener-id");
      expect(participant?.role).toBe("speaker");
    });

    it("should decline raise hand request", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      // @ts-ignore
      service.participants.set("listener-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-id",
        user: { id: "listener-id", displayName: "Listener" },
        role: "listener",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: true,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: true,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      // @ts-ignore
      service.raiseHandRequests.set("request-id", {
        id: "request-id",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-id",
        user: { id: "listener-id", displayName: "Listener" },
        status: "pending",
        requestedAt: new Date(),
        position: 0,
      });
      // @ts-ignore
      service.raiseHandQueue.push("request-id");

      await service.declineRaiseHand("request-id", "Not now");

      const requests = service.getRaiseHandRequests();
      expect(requests.length).toBe(0);
    });

    it("should get pending raise hand requests", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      // @ts-ignore
      service.raiseHandRequests.set("request-1", {
        id: "request-1",
        voiceChatId: "test-voice-chat-id",
        userId: "user-1",
        user: { id: "user-1", displayName: "User 1" },
        status: "pending",
        requestedAt: new Date(),
        position: 0,
      });
      // @ts-ignore
      service.raiseHandRequests.set("request-2", {
        id: "request-2",
        voiceChatId: "test-voice-chat-id",
        userId: "user-2",
        user: { id: "user-2", displayName: "User 2" },
        status: "pending",
        requestedAt: new Date(),
        position: 1,
      });
      // @ts-ignore
      service.raiseHandQueue = ["request-1", "request-2"];

      const requests = service.getRaiseHandRequests();
      expect(requests.length).toBe(2);
    });
  });

  // ===========================================================================
  // Audio Controls Tests
  // ===========================================================================

  describe("Audio Controls", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should toggle mute", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      expect(service.audioMuted).toBe(true); // Starts muted

      service.toggleMute();
      expect(service.audioMuted).toBe(false);

      service.toggleMute();
      expect(service.audioMuted).toBe(true);
    });

    it("should not allow listener to unmute", async () => {
      await service.joinVoiceChat("test-voice-chat-id");

      expect(() => service.setMuted(false)).toThrow("Listeners cannot unmute");
    });

    it("should not allow force-muted participant to unmute", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      // Simulate being force-muted
      const participant = service.getParticipant("test-user-id");
      if (participant) {
        participant.isForceMuted = true;
      }

      expect(() => service.setMuted(false)).toThrow(
        "You have been muted by an admin",
      );
    });
  });

  // ===========================================================================
  // Push-to-Talk Tests
  // ===========================================================================

  describe("Push-to-Talk", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should set talk mode", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      service.setTalkMode("push_to_talk");

      expect(service.currentTalkMode).toBe("push_to_talk");
    });

    it("should set always-on talk mode", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      service.setTalkMode("always_on");

      expect(service.currentTalkMode).toBe("always_on");
    });

    it("should track push-to-talk state", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      expect(service.pushToTalkActive).toBe(false);
    });
  });

  // ===========================================================================
  // Volume Control Tests
  // ===========================================================================

  describe("Volume Controls", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createVoiceChat(createTestVoiceChatInput());
    });

    it("should set participant volume", () => {
      // @ts-ignore
      service.participants.set("other-user", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "other-user",
        user: { id: "other-user", displayName: "Other" },
        role: "speaker",
        volumeLevel: 1,
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      service.setParticipantVolume("other-user", 1.5);

      expect(service.getParticipantVolume("other-user")).toBe(1.5);
    });

    it("should clamp volume to valid range", () => {
      // @ts-ignore
      service.participants.set("other-user", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "other-user",
        user: { id: "other-user", displayName: "Other" },
        role: "speaker",
        volumeLevel: 1,
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      service.setParticipantVolume("other-user", 3); // Above max
      expect(service.getParticipantVolume("other-user")).toBe(2);

      service.setParticipantVolume("other-user", -1); // Below min
      expect(service.getParticipantVolume("other-user")).toBe(0);
    });

    it("should return default volume for unknown participant", () => {
      expect(service.getParticipantVolume("unknown-user")).toBe(1);
    });
  });

  // ===========================================================================
  // Recording Tests
  // ===========================================================================

  describe("Recording", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should start recording", async () => {
      await service.createVoiceChat(
        createTestVoiceChatInput({
          isRecordingEnabled: true,
        }),
      );

      const recording = await service.startRecording();

      expect(recording).toBeDefined();
      expect(recording.status).toBe("recording");
      expect(service.isRecording).toBe(true);
    });

    it("should stop recording", async () => {
      await service.createVoiceChat(
        createTestVoiceChatInput({
          isRecordingEnabled: true,
        }),
      );
      await service.startRecording();

      const recording = await service.stopRecording();

      // Status is 'processing' if no recorded chunks, 'ready' if there are chunks
      expect(["processing", "ready"]).toContain(recording.status);
      expect(service.isRecording).toBe(false);
    });

    it("should not allow recording when disabled", async () => {
      await service.createVoiceChat(
        createTestVoiceChatInput({
          isRecordingEnabled: false,
        }),
      );

      await expect(service.startRecording()).rejects.toThrow(
        "Recording is not enabled",
      );
    });

    it("should not allow non-creator to start recording", async () => {
      const listenerService = createVoiceChatService(
        createTestConfig({
          userId: "listener-id",
          userName: "Listener",
        }),
      );
      await listenerService.initialize();
      await listenerService.joinVoiceChat("test-voice-chat-id", false); // as speaker

      await expect(listenerService.startRecording()).rejects.toThrow(
        "Not authorized",
      );

      listenerService.destroy();
    });

    it("should track recording duration", async () => {
      await service.createVoiceChat(
        createTestVoiceChatInput({
          isRecordingEnabled: true,
        }),
      );
      await service.startRecording();

      // Duration should be 0 immediately
      expect(service.getRecordingDuration()).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 duration when not recording", () => {
      expect(service.getRecordingDuration()).toBe(0);
    });
  });

  // ===========================================================================
  // Scheduling Tests
  // ===========================================================================

  describe("Scheduling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should schedule a voice chat", async () => {
      const scheduledStart = new Date(Date.now() + 3600000);
      const input: ScheduleVoiceChatInput = {
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "Scheduled Voice Chat",
        description: "Test description",
        scheduledStart,
        autoStart: true,
      };

      const scheduled = await service.scheduleVoiceChat(input);

      expect(scheduled).toBeDefined();
      expect(scheduled.title).toBe("Scheduled Voice Chat");
      expect(scheduled.status).toBe("scheduled");
      expect(scheduled.autoStart).toBe(true);
    });

    it("should update scheduled voice chat", async () => {
      const scheduledStart = new Date(Date.now() + 3600000);
      const scheduled = await service.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "Original Title",
        scheduledStart,
      });

      const updated = await service.updateScheduledVoiceChat(scheduled.id, {
        title: "Updated Title",
      });

      expect(updated.title).toBe("Updated Title");
    });

    it("should cancel scheduled voice chat", async () => {
      const scheduledStart = new Date(Date.now() + 3600000);
      const scheduled = await service.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "To Cancel",
        scheduledStart,
      });

      await service.cancelScheduledVoiceChat(scheduled.id);

      const retrieved = service.getScheduledVoiceChat(scheduled.id);
      expect(retrieved?.status).toBe("cancelled");
    });

    it("should start scheduled voice chat", async () => {
      const scheduledStart = new Date(Date.now() + 1000); // 1 second from now
      const scheduled = await service.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "To Start",
        scheduledStart,
      });

      const voiceChat = await service.startScheduledVoiceChat(scheduled.id);

      expect(voiceChat).toBeDefined();
      expect(voiceChat.status).toBe("live");
    });

    it("should express interest in scheduled voice chat", async () => {
      const scheduledStart = new Date(Date.now() + 3600000);
      const scheduled = await service.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "Interesting Chat",
        scheduledStart,
      });

      const interest = await service.expressInterest(scheduled.id);

      expect(interest).toBeDefined();
      expect(interest.userId).toBe("test-user-id");
    });

    it("should remove interest from scheduled voice chat", async () => {
      const scheduledStart = new Date(Date.now() + 3600000);
      const scheduled = await service.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "Interesting Chat",
        scheduledStart,
      });

      await service.expressInterest(scheduled.id);
      await service.removeInterest(scheduled.id);

      const interests = service.getInterestedUsers(scheduled.id);
      expect(interests.length).toBe(0);
    });

    it("should get upcoming scheduled voice chats", async () => {
      // Use a fresh service instance to avoid state from previous tests
      const freshService = createVoiceChatService(createTestConfig());
      await freshService.initialize();

      const scheduledStart1 = new Date(Date.now() + 3600000);
      const scheduledStart2 = new Date(Date.now() + 7200000);

      await freshService.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "Chat 1",
        scheduledStart: scheduledStart1,
      });

      await freshService.scheduleVoiceChat({
        channelId: "test-channel-id",
        workspaceId: "test-workspace-id",
        title: "Chat 2",
        scheduledStart: scheduledStart2,
      });

      const upcoming = freshService.getUpcomingScheduledVoiceChats();

      expect(upcoming.length).toBe(2);
      expect(upcoming[0].scheduledStart.getTime()).toBeLessThan(
        upcoming[1].scheduledStart.getTime(),
      );

      freshService.destroy();
    });
  });

  // ===========================================================================
  // Participant Management Tests
  // ===========================================================================

  describe("Participant Management", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createVoiceChat(createTestVoiceChatInput());
    });

    it("should get speakers", () => {
      const speakers = service.getSpeakers();

      expect(speakers.length).toBe(1); // Creator
      expect(speakers[0].role).toBe("creator");
    });

    it("should get listeners", () => {
      // @ts-ignore
      service.participants.set("listener-1", {
        id: "test-participant-1",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-1",
        user: { id: "listener-1", displayName: "Listener 1" },
        role: "listener",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: true,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      const listeners = service.getListeners();

      expect(listeners.length).toBe(1);
      expect(listeners[0].role).toBe("listener");
    });

    it("should sort listeners with raised hands first", () => {
      const now = new Date();

      // @ts-ignore
      service.participants.set("listener-1", {
        id: "test-participant-1",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-1",
        user: { id: "listener-1", displayName: "Listener 1" },
        role: "listener",
        hasRaisedHand: false,
        joinedAt: now,
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: true,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      // @ts-ignore
      service.participants.set("listener-2", {
        id: "test-participant-2",
        voiceChatId: "test-voice-chat-id",
        userId: "listener-2",
        user: { id: "listener-2", displayName: "Listener 2" },
        role: "listener",
        hasRaisedHand: true,
        joinedAt: new Date(now.getTime() + 1000),
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: true,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      const listeners = service.getListeners();

      expect(listeners[0].userId).toBe("listener-2"); // Hand raised comes first
    });

    it("should get participant by userId", () => {
      const participant = service.getParticipant("test-user-id");

      expect(participant).toBeDefined();
      expect(participant?.userId).toBe("test-user-id");
    });

    it("should return undefined for non-existent participant", () => {
      const participant = service.getParticipant("non-existent-id");

      expect(participant).toBeUndefined();
    });
  });

  // ===========================================================================
  // Moderation Log Tests
  // ===========================================================================

  describe("Moderation Log", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.createVoiceChat(createTestVoiceChatInput());
    });

    it("should log moderation actions", async () => {
      // @ts-ignore
      service.participants.set("speaker-user-id", {
        id: "test-participant",
        voiceChatId: "test-voice-chat-id",
        userId: "speaker-user-id",
        user: { id: "speaker-user-id", displayName: "Speaker" },
        role: "speaker",
        talkMode: "voice_activity" as PushToTalkMode,
        isMuted: false,
        isSpeaking: false,
        isPushToTalkActive: false,
        audioLevel: 0,
        volumeLevel: 1,
        connectionState: "connected",
        joinedAt: new Date(),
        hasRaisedHand: false,
        isForceMuted: false,
        isActiveSpeaker: false,
      });

      await service.muteParticipant("speaker-user-id");

      const logs = service.getModerationLog();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.action === "mute_participant")).toBe(true);
    });

    it("should include admin info in moderation log", async () => {
      await service.updateTitle("New Title");

      const logs = service.getModerationLog();
      const titleLog = logs.find((log) => log.action === "update_title");

      expect(titleLog).toBeDefined();
      expect(titleLog?.adminId).toBe("test-user-id");
    });
  });

  // ===========================================================================
  // Voice Chat Status Tests
  // ===========================================================================

  describe("Voice Chat Status", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should pause voice chat", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      await service.pauseVoiceChat();

      expect(service.voiceChatInfo?.status).toBe("paused");
    });

    it("should resume voice chat", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());
      await service.pauseVoiceChat();

      await service.resumeVoiceChat();

      expect(service.voiceChatInfo?.status).toBe("live");
    });

    it("should end voice chat", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      await service.endVoiceChat();

      expect(service.isInVoiceChat).toBe(false);
    });

    it("should update title", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      await service.updateTitle("Updated Title");

      expect(service.voiceChatInfo?.title).toBe("Updated Title");
    });

    it("should update settings", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      await service.updateSettings({ maxParticipants: 100 });

      expect(service.voiceChatInfo?.settings.maxParticipants).toBe(100);
    });
  });

  // ===========================================================================
  // Metrics Tests
  // ===========================================================================

  describe("Metrics", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should track voice chat metrics", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      const metrics = service.voiceChatMetrics;

      expect(metrics).toBeDefined();
      expect(metrics.voiceChatId).toBeDefined();
    });

    it("should track speaker and listener counts", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      expect(service.speakerCount).toBe(1); // Creator
      expect(service.voiceChatListenerCount).toBe(0);
    });

    it("should track raise hand metrics", async () => {
      await service.joinVoiceChat("test-voice-chat-id");
      await service.raiseHand();

      const metrics = service.voiceChatMetrics;

      expect(metrics.totalRaiseHandRequests).toBe(1);
    });
  });

  // ===========================================================================
  // Cleanup Tests
  // ===========================================================================

  describe("Cleanup", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should cleanup on destroy", async () => {
      await service.createVoiceChat(createTestVoiceChatInput());

      service.destroy();

      expect(service.isInVoiceChat).toBe(false);
      expect(service.totalParticipants).toBe(0);
    });

    it("should stop recording on end", async () => {
      await service.createVoiceChat(
        createTestVoiceChatInput({
          isRecordingEnabled: true,
        }),
      );
      await service.startRecording();

      await service.endVoiceChat();

      expect(service.isRecording).toBe(false);
    });
  });
});
