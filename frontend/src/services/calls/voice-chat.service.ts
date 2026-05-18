/**
 * Voice Chat Service
 *
 * Complete service for Telegram-style live voice chats in groups.
 * Handles scheduled voice chats, host roles (creator/admin/speaker/listener),
 * push-to-talk, raise hand functionality, recording, and chat integration.
 */

import { EventEmitter } from "events";
import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
  type CallEndReason,
} from "@/lib/webrtc/signaling";
import { logger } from "@/lib/logger";
import { DEFAULT_VOICE_CHAT_SETTINGS } from "@/types/voice-chat";
import type {
  VoiceChat,
  VoiceChatParticipant,
  VoiceChatRole,
  VoiceChatStatus,
  VoiceChatSettings,
  VoiceChatHandRequest,
  VoiceChatHandStatus,
  VoiceChatMetrics,
  VoiceChatModerationAction,
  VoiceChatModerationLog,
  VoiceChatRecording,
  RecordingStatus,
  VoiceChatConnectionState,
  VoiceChatServiceCallbacks,
  CreateVoiceChatInput,
  UpdateVoiceChatInput,
  ScheduledVoiceChat,
  ScheduledVoiceChatStatus,
  ScheduleVoiceChatInput,
  UpdateScheduledVoiceChatInput,
  VoiceChatInterest,
  PushToTalkMode,
} from "@/types/voice-chat";
import type { UserBasicInfo } from "@/types/user";

// =============================================================================
// Types
// =============================================================================

export interface VoiceChatServiceConfig {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export interface VoiceChatServiceOptions
  extends VoiceChatServiceConfig, VoiceChatServiceCallbacks {}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const ACTIVE_SPEAKER_THRESHOLD = 0.02;
const SPEAKER_DEBOUNCE_MS = 1000;
const RAISE_HAND_CHECK_INTERVAL_MS = 1000;
const PUSH_TO_TALK_KEY = "Space";

// =============================================================================
// Voice Chat Service
// =============================================================================

export class VoiceChatService extends EventEmitter {
  private config: VoiceChatServiceOptions;
  private signaling: SignalingManager | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();

  // Voice chat state
  private currentVoiceChat: VoiceChat | null = null;
  private participants: Map<string, VoiceChatParticipant> = new Map();
  private raiseHandRequests: Map<string, VoiceChatHandRequest> = new Map();
  private raiseHandQueue: string[] = [];

  // Recording state
  private currentRecording: VoiceChatRecording | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Local state
  private localStream: MediaStream | null = null;
  private isMuted: boolean = true;
  private myRole: VoiceChatRole = "listener";
  private hasRaisedHand: boolean = false;
  private myRaiseHandRequestId: string | null = null;
  private talkMode: PushToTalkMode = "voice_activity";
  private isPushToTalkPressed: boolean = false;

  // Audio analysis
  private audioAnalyzer: AudioContext | null = null;
  private audioAnalyzers: Map<string, AnalyserNode> = new Map();
  private activeSpeakerId: string | null = null;
  private speakerDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Reconnection state
  private reconnectAttempts: number = 0;
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Metrics
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private raiseHandTimeoutInterval: ReturnType<typeof setInterval> | null =
    null;
  private metrics: VoiceChatMetrics = this.createEmptyMetrics();

  // Moderation log
  private moderationLog: VoiceChatModerationLog[] = [];

  // Scheduled voice chats
  private scheduledVoiceChats: Map<string, ScheduledVoiceChat> = new Map();
  private scheduledInterests: Map<string, VoiceChatInterest[]> = new Map();
  private scheduledTimers: Map<string, ReturnType<typeof setTimeout>[]> =
    new Map();

  // Push-to-talk
  private pushToTalkKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private pushToTalkKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  // Volume levels per participant
  private volumeLevels: Map<string, number> = new Map();

  constructor(config: VoiceChatServiceOptions) {
    super();
    this.config = {
      maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelayMs: DEFAULT_RECONNECT_DELAY_MS,
      ...config,
    };
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get voiceChatInfo(): VoiceChat | null {
    return this.currentVoiceChat;
  }

  get isInVoiceChat(): boolean {
    return (
      this.currentVoiceChat !== null && this.currentVoiceChat.status !== "ended"
    );
  }

  get isLive(): boolean {
    return this.currentVoiceChat?.status === "live";
  }

  get isCreator(): boolean {
    return this.myRole === "creator";
  }

  get isAdmin(): boolean {
    return this.myRole === "admin" || this.myRole === "creator";
  }

  get isSpeaker(): boolean {
    return this.myRole === "speaker" || this.isAdmin;
  }

  get isListener(): boolean {
    return this.myRole === "listener";
  }

  get speakerCount(): number {
    return Array.from(this.participants.values()).filter(
      (p) => p.role === "speaker" || p.role === "admin" || p.role === "creator",
    ).length;
  }

  get voiceChatListenerCount(): number {
    return Array.from(this.participants.values()).filter(
      (p) => p.role === "listener",
    ).length;
  }

  get totalParticipants(): number {
    return this.participants.size;
  }

  get pendingRaiseHandCount(): number {
    return Array.from(this.raiseHandRequests.values()).filter(
      (r) => r.status === "pending",
    ).length;
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get audioMuted(): boolean {
    return this.isMuted;
  }

  get handIsRaised(): boolean {
    return this.hasRaisedHand;
  }

  get activeSpeaker(): string | null {
    return this.activeSpeakerId;
  }

  get voiceChatMetrics(): VoiceChatMetrics {
    return { ...this.metrics };
  }

  get role(): VoiceChatRole {
    return this.myRole;
  }

  get currentTalkMode(): PushToTalkMode {
    return this.talkMode;
  }

  get isRecording(): boolean {
    return this.currentRecording?.status === "recording";
  }

  get recordingInfo(): VoiceChatRecording | null {
    return this.currentRecording;
  }

  get pushToTalkActive(): boolean {
    return this.isPushToTalkPressed;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    this.initializeSignaling();
    this.initializeAudioAnalyzer();
  }

  private initializeSignaling(): void {
    this.signaling = createSignalingManager({
      onParticipantJoined: (payload) => {
        this.handleParticipantJoined(payload);
      },
      onParticipantLeft: (payload) => {
        this.handleParticipantLeft(payload);
      },
      onCallEnded: (payload) => {
        if (this.currentVoiceChat?.id === payload.callId) {
          this.handleVoiceChatEnded(payload.reason as CallEndReason);
        }
      },
      onOffer: async (payload) => {
        await this.handleOffer(payload);
      },
      onAnswer: async (payload) => {
        await this.handleAnswer(payload);
      },
      onIceCandidate: async (payload) => {
        await this.handleIceCandidate(payload);
      },
      onMuteChanged: (payload) => {
        this.handleRemoteMuteChange(payload.userId, !payload.enabled);
      },
      onError: (payload) => {
        this.handleError(new Error(payload.message));
      },
    });
    this.signaling.connect();
  }

  private initializeAudioAnalyzer(): void {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      this.audioAnalyzer = new AudioContext();
    }
  }

  // ===========================================================================
  // Voice Chat Creation and Management
  // ===========================================================================

  async createVoiceChat(input: CreateVoiceChatInput): Promise<VoiceChat> {
    if (this.isInVoiceChat) {
      throw new Error("Already in a voice chat");
    }

    const voiceChatId = generateCallId();
    const now = new Date();
    const inviteLink = this.generateInviteLink(voiceChatId);

    const settings: VoiceChatSettings = {
      ...DEFAULT_VOICE_CHAT_SETTINGS,
      ...input.settings,
    };

    const voiceChat: VoiceChat = {
      id: voiceChatId,
      channelId: input.channelId,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      status: input.scheduledStartTime ? "scheduled" : "live",
      creatorId: this.config.userId,
      creator: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      createdAt: now,
      updatedAt: now,
      startedAt: input.scheduledStartTime ? undefined : now,
      scheduledStartTime: input.scheduledStartTime,
      scheduledEndTime: input.scheduledEndTime,
      isRecordingEnabled: input.isRecordingEnabled ?? false,
      isRecording: false,
      inviteLink,
      showInGroup: input.showInGroup ?? true,
      settings,
      participantCount: 1,
      speakerCount: 1,
      listenerCount: 0,
    };

    this.currentVoiceChat = voiceChat;
    this.myRole = "creator";
    this.talkMode = settings.defaultTalkMode;

    // Add self as creator
    const selfParticipant = this.createSelfParticipant("creator");
    this.participants.set(this.config.userId, selfParticipant);

    if (voiceChat.status === "live") {
      // Get local audio
      await this.startLocalAudio();

      // Set up push-to-talk if needed
      if (this.talkMode === "push_to_talk") {
        this.setupPushToTalk();
      }

      // Auto-start recording if configured
      if (settings.autoStartRecording && voiceChat.isRecordingEnabled) {
        await this.startRecording();
      }

      // Start metrics collection
      this.startMetricsCollection();
      this.startRaiseHandTimeoutChecker();

      // Notify signaling
      this.signaling?.initiateCall({
        callId: voiceChatId,
        targetUserId: "",
        callType: "voice",
        channelId: input.channelId,
        metadata: {
          isVoiceChat: true,
          title: input.title,
          creatorId: this.config.userId,
        },
      });
    }

    this.emit("voice-chat-created", { voiceChat });
    return voiceChat;
  }

  async joinVoiceChat(
    voiceChatId: string,
    asListener: boolean = true,
  ): Promise<void> {
    if (this.isInVoiceChat) {
      throw new Error("Already in a voice chat");
    }

    const now = new Date();

    this.currentVoiceChat = {
      id: voiceChatId,
      channelId: "",
      workspaceId: "",
      title: "Voice Chat",
      status: "live",
      creatorId: "",
      creator: {} as UserBasicInfo,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      isRecordingEnabled: false,
      isRecording: false,
      inviteLink: this.generateInviteLink(voiceChatId),
      showInGroup: true,
      settings: DEFAULT_VOICE_CHAT_SETTINGS,
      participantCount: 0,
      speakerCount: 0,
      listenerCount: 0,
    };

    this.myRole = asListener ? "listener" : "speaker";
    this.talkMode = DEFAULT_VOICE_CHAT_SETTINGS.defaultTalkMode;

    // Add self as participant
    const selfParticipant = this.createSelfParticipant(this.myRole);
    this.participants.set(this.config.userId, selfParticipant);

    // Get local audio if speaker
    if (!asListener) {
      await this.startLocalAudio();

      if (this.talkMode === "push_to_talk") {
        this.setupPushToTalk();
      }
    }

    // Notify signaling
    this.signaling?.acceptCall(voiceChatId, this.config.userId);

    this.emit("voice-chat-joined", { voiceChatId, role: this.myRole });

    // Update metrics
    this.metrics.totalUniqueParticipants++;
    this.updatePeakCounts();
  }

  async joinFromInviteLink(inviteLink: string): Promise<void> {
    // Extract voice chat ID from invite link
    const voiceChatId = this.extractVoiceChatIdFromLink(inviteLink);
    if (!voiceChatId) {
      throw new Error("Invalid invite link");
    }

    await this.joinVoiceChat(voiceChatId, true);
  }

  async leaveVoiceChat(): Promise<void> {
    if (!this.currentVoiceChat) return;

    const duration = this.getVoiceChatDuration();

    // If we're the creator and last admin, end the voice chat
    if (this.isCreator) {
      const admins = Array.from(this.participants.values()).filter(
        (p) => p.role === "admin" || p.role === "creator",
      );
      if (admins.length === 1) {
        await this.endVoiceChat();
        return;
      }
    }

    this.signaling?.endCall(
      this.currentVoiceChat.id,
      this.config.userId,
      "completed",
      duration,
    );

    this.emit("voice-chat-left", { voiceChatId: this.currentVoiceChat.id });
    this.cleanup();
  }

  async endVoiceChat(): Promise<void> {
    if (!this.currentVoiceChat || !this.isCreator) {
      throw new Error("Not authorized to end voice chat");
    }

    // Stop recording if active
    if (this.isRecording) {
      await this.stopRecording();
    }

    const duration = this.getVoiceChatDuration();

    this.currentVoiceChat.status = "ended";
    this.currentVoiceChat.endedAt = new Date();

    this.signaling?.endCall(
      this.currentVoiceChat.id,
      this.config.userId,
      "completed",
      duration,
    );

    this.addModerationLog("end_voice_chat");

    this.emit("voice-chat-ended", {
      voiceChat: this.currentVoiceChat,
      metrics: this.metrics,
    });
    this.config.onStatusChange?.(this.currentVoiceChat, "live");

    this.cleanup();
  }

  async pauseVoiceChat(): Promise<void> {
    if (!this.currentVoiceChat || !this.isCreator) {
      throw new Error("Not authorized to pause voice chat");
    }

    const previousStatus = this.currentVoiceChat.status;
    this.currentVoiceChat.status = "paused";

    this.addModerationLog("pause_voice_chat");

    this.emit("voice-chat-paused", { voiceChat: this.currentVoiceChat });
    this.config.onStatusChange?.(this.currentVoiceChat, previousStatus);
  }

  async resumeVoiceChat(): Promise<void> {
    if (!this.currentVoiceChat || !this.isCreator) {
      throw new Error("Not authorized to resume voice chat");
    }

    const previousStatus = this.currentVoiceChat.status;
    this.currentVoiceChat.status = "live";

    this.addModerationLog("resume_voice_chat");

    this.emit("voice-chat-resumed", { voiceChat: this.currentVoiceChat });
    this.config.onStatusChange?.(this.currentVoiceChat, previousStatus);
  }

  async updateTitle(title: string): Promise<void> {
    if (!this.currentVoiceChat || !this.isAdmin) {
      throw new Error("Not authorized to update title");
    }

    const previousTitle = this.currentVoiceChat.title;
    this.currentVoiceChat.title = title;
    this.currentVoiceChat.updatedAt = new Date();

    this.addModerationLog("update_title", undefined, {
      previousTitle,
      newTitle: title,
    });

    this.emit("title-updated", { title, previousTitle });
    this.config.onTitleChanged?.(this.currentVoiceChat, previousTitle);
  }

  async updateSettings(settings: Partial<VoiceChatSettings>): Promise<void> {
    if (!this.currentVoiceChat || !this.isCreator) {
      throw new Error("Not authorized to update settings");
    }

    this.currentVoiceChat.settings = {
      ...this.currentVoiceChat.settings,
      ...settings,
    };
    this.currentVoiceChat.updatedAt = new Date();

    this.addModerationLog("update_settings", undefined, { settings });

    this.emit("settings-updated", { settings: this.currentVoiceChat.settings });
  }

  // ===========================================================================
  // Host Roles Management
  // ===========================================================================

  async inviteToSpeak(userId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to invite speakers");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role !== "listener") {
      throw new Error("Participant is already a speaker");
    }

    // Check max speakers
    if (
      this.currentVoiceChat?.settings.maxSpeakers &&
      this.speakerCount >= this.currentVoiceChat.settings.maxSpeakers
    ) {
      throw new Error("Maximum speakers reached");
    }

    await this.promoteToSpeaker(userId);

    // Clear any raise hand request
    this.clearRaiseHandRequest(userId);

    this.addModerationLog("invite_to_speak", userId);

    this.emit("speaker-invited", { userId, participant });
  }

  async moveToListeners(userId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to move speakers");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role === "listener") {
      throw new Error("Participant is already a listener");
    }

    if (participant.role === "creator") {
      throw new Error("Cannot move creator to listeners");
    }

    await this.demoteToListener(userId);

    this.addModerationLog("move_to_listeners", userId);

    this.emit("speaker-removed", {
      userId,
      participant,
      reason: "moved_to_listeners",
    });
    this.config.onSpeakerRemoved?.(participant, "moved_to_listeners");
  }

  async muteParticipant(userId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to mute participants");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.isMuted = true;

    this.signaling?.notifyMuteChange(this.currentVoiceChat!.id, userId, true);

    this.addModerationLog("mute_participant", userId);

    this.emit("participant-muted", { userId, byAdmin: true });
  }

  async forcemuteParticipant(userId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to force mute participants");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.isForceMuted = true;
    participant.isMuted = true;

    this.signaling?.notifyMuteChange(this.currentVoiceChat!.id, userId, true);

    this.addModerationLog("force_mute_participant", userId);

    this.emit("participant-force-muted", { userId });
  }

  async unforcemuteParticipant(userId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to unforce mute participants");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.isForceMuted = false;

    this.addModerationLog("unmute_participant", userId);

    this.emit("participant-unmuted", { userId, byAdmin: true });
  }

  async removeFromVoiceChat(
    userId: string,
    reason: string = "removed",
  ): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to remove participants");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role === "creator") {
      throw new Error("Cannot remove creator");
    }

    // Close connection and remove
    this.peerConnections.get(userId)?.close();
    this.peerConnections.delete(userId);
    this.mediaStreams.delete(userId);
    this.audioAnalyzers.delete(userId);
    this.participants.delete(userId);

    this.addModerationLog("remove_from_chat", userId, { reason });

    this.emit("participant-removed", { participant, reason });
    this.config.onParticipantLeft?.(participant, reason);
  }

  async promoteToAdmin(userId: string): Promise<void> {
    if (!this.isCreator) {
      throw new Error("Only creator can promote admins");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role === "creator") {
      throw new Error("Cannot change creator role");
    }

    participant.role = "admin";

    this.addModerationLog("promote_to_admin", userId);

    this.emit("admin-added", { participant });
  }

  async demoteFromAdmin(userId: string): Promise<void> {
    if (!this.isCreator) {
      throw new Error("Only creator can demote admins");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role !== "admin") {
      throw new Error("Participant is not an admin");
    }

    participant.role = "speaker";

    this.addModerationLog("demote_from_admin", userId);

    this.emit("admin-removed", { participant });
  }

  private async promoteToSpeaker(userId: string): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant) return;

    participant.role = "speaker";
    participant.becameSpeakerAt = new Date();
    participant.speakerPosition = this.speakerCount;

    this.emit("speaker-added", { participant });
    this.config.onSpeakerAdded?.(participant);
  }

  private async demoteToListener(userId: string): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant) return;

    participant.role = "listener";
    participant.isMuted = true;
    participant.becameSpeakerAt = undefined;
    participant.speakerPosition = undefined;

    // Mute their audio
    const stream = this.mediaStreams.get(userId);
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
  }

  // ===========================================================================
  // Raise Hand Management
  // ===========================================================================

  async raiseHand(message?: string): Promise<VoiceChatHandRequest> {
    if (!this.currentVoiceChat || this.isSpeaker) {
      throw new Error("Cannot raise hand as speaker");
    }

    if (!this.currentVoiceChat.settings.allowRaiseHand) {
      throw new Error("Raise hand is disabled");
    }

    if (this.hasRaisedHand) {
      throw new Error("Hand already raised");
    }

    if (
      this.currentVoiceChat.settings.maxPendingRequests &&
      this.pendingRaiseHandCount >=
        this.currentVoiceChat.settings.maxPendingRequests
    ) {
      throw new Error("Maximum pending requests reached");
    }

    const requestId = generateCallId();
    const now = new Date();

    const request: VoiceChatHandRequest = {
      id: requestId,
      voiceChatId: this.currentVoiceChat.id,
      userId: this.config.userId,
      user: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      status: "pending",
      requestedAt: now,
      message,
      position: this.raiseHandQueue.length,
    };

    this.raiseHandRequests.set(requestId, request);
    this.raiseHandQueue.push(requestId);
    this.hasRaisedHand = true;
    this.myRaiseHandRequestId = requestId;

    // Update participant
    const participant = this.participants.get(this.config.userId);
    if (participant) {
      participant.hasRaisedHand = true;
    }

    // Update metrics
    this.metrics.totalRaiseHandRequests++;

    // Check auto-accept
    if (this.currentVoiceChat.settings.autoAcceptRaiseHand) {
      await this.acceptRaiseHand(requestId);
    } else {
      this.emit("hand-raised", { request });
      this.config.onHandRaised?.(request);
    }

    return request;
  }

  async lowerHand(): Promise<void> {
    if (!this.hasRaisedHand || !this.myRaiseHandRequestId) {
      throw new Error("Hand not raised");
    }

    const request = this.raiseHandRequests.get(this.myRaiseHandRequestId);
    if (request) {
      request.status = "lowered";
      request.processedAt = new Date();
    }

    this.clearRaiseHandRequest(this.config.userId);
    this.hasRaisedHand = false;
    this.myRaiseHandRequestId = null;

    // Update participant
    const participant = this.participants.get(this.config.userId);
    if (participant) {
      participant.hasRaisedHand = false;
    }

    this.emit("hand-lowered", { userId: this.config.userId });
  }

  async acceptRaiseHand(requestId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to accept raise hand requests");
    }

    const request = this.raiseHandRequests.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request already processed");
    }

    request.status = "accepted";
    request.processedAt = new Date();
    request.processedBy = this.config.userId;

    // Promote to speaker
    await this.promoteToSpeaker(request.userId);

    // Clear the request
    this.clearRaiseHandRequest(request.userId);

    // Update metrics
    this.metrics.acceptedRaiseHandRequests++;

    this.addModerationLog("accept_raise_hand", request.userId);

    this.emit("hand-accepted", { request });
    this.config.onHandProcessed?.(request);
  }

  async declineRaiseHand(requestId: string, reason?: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to decline raise hand requests");
    }

    const request = this.raiseHandRequests.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request already processed");
    }

    request.status = "declined";
    request.processedAt = new Date();
    request.processedBy = this.config.userId;
    request.declineReason = reason;

    // Clear the request
    this.clearRaiseHandRequest(request.userId);

    // Update metrics
    this.metrics.declinedRaiseHandRequests++;

    this.addModerationLog("decline_raise_hand", request.userId, { reason });

    this.emit("hand-declined", { request });
    this.config.onHandProcessed?.(request);
  }

  async lowerParticipantHand(userId: string): Promise<void> {
    if (!this.isAdmin) {
      throw new Error("Not authorized to lower hands");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Find and update request
    const request = Array.from(this.raiseHandRequests.values()).find(
      (r) => r.userId === userId && r.status === "pending",
    );
    if (request) {
      request.status = "lowered";
      request.processedAt = new Date();
      request.processedBy = this.config.userId;
    }

    this.clearRaiseHandRequest(userId);

    participant.hasRaisedHand = false;

    this.addModerationLog("lower_hand", userId);

    this.emit("hand-lowered", { userId, byAdmin: true });
  }

  private clearRaiseHandRequest(userId: string): void {
    const request = Array.from(this.raiseHandRequests.values()).find(
      (r) => r.userId === userId,
    );
    if (request) {
      this.raiseHandRequests.delete(request.id);
      this.raiseHandQueue = this.raiseHandQueue.filter(
        (id) => id !== request.id,
      );

      // Reorder remaining requests
      this.raiseHandQueue.forEach((id, index) => {
        const req = this.raiseHandRequests.get(id);
        if (req) {
          req.position = index;
        }
      });
    }

    const participant = this.participants.get(userId);
    if (participant) {
      participant.hasRaisedHand = false;
    }
  }

  getRaiseHandRequests(): VoiceChatHandRequest[] {
    return this.raiseHandQueue
      .map((id) => this.raiseHandRequests.get(id))
      .filter(
        (r): r is VoiceChatHandRequest =>
          r !== undefined && r.status === "pending",
      );
  }

  // ===========================================================================
  // Audio Controls
  // ===========================================================================

  toggleMute(): void {
    this.setMuted(!this.isMuted);
  }

  setMuted(muted: boolean): void {
    if (this.isListener && !muted) {
      throw new Error("Listeners cannot unmute");
    }

    const participant = this.participants.get(this.config.userId);
    if (participant?.isForceMuted && !muted) {
      throw new Error("You have been muted by an admin");
    }

    this.isMuted = muted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    if (participant) {
      participant.isMuted = muted;
    }

    if (this.currentVoiceChat && this.signaling) {
      this.signaling.notifyMuteChange(
        this.currentVoiceChat.id,
        this.config.userId,
        muted,
      );
    }

    this.emit("local-mute-change", { isMuted: muted });
  }

  // ===========================================================================
  // Push-to-Talk
  // ===========================================================================

  setTalkMode(mode: PushToTalkMode): void {
    const previousMode = this.talkMode;
    this.talkMode = mode;

    // Update participant
    const participant = this.participants.get(this.config.userId);
    if (participant) {
      participant.talkMode = mode;
    }

    // Set up or tear down push-to-talk
    if (mode === "push_to_talk") {
      this.setupPushToTalk();
    } else {
      this.teardownPushToTalk();
    }

    // Handle transition
    if (previousMode === "push_to_talk" && mode !== "push_to_talk") {
      // Switching away from push-to-talk, unmute if not already
      if (mode === "always_on") {
        this.setMuted(false);
      }
    } else if (mode === "push_to_talk") {
      // Switching to push-to-talk, mute by default
      this.setMuted(true);
    }

    this.emit("talk-mode-changed", { mode, previousMode });
  }

  private setupPushToTalk(): void {
    if (typeof window === "undefined") return;

    const key =
      this.currentVoiceChat?.settings.pushToTalkKey || PUSH_TO_TALK_KEY;

    this.pushToTalkKeyHandler = (e: KeyboardEvent) => {
      if (e.code === key && !e.repeat && !this.isPushToTalkPressed) {
        e.preventDefault();
        this.isPushToTalkPressed = true;
        this.setMuted(false);

        const participant = this.participants.get(this.config.userId);
        if (participant) {
          participant.isPushToTalkActive = true;
        }

        this.emit("push-to-talk-started");
        this.config.onPushToTalkChange?.(true);
      }
    };

    this.pushToTalkKeyUpHandler = (e: KeyboardEvent) => {
      if (e.code === key && this.isPushToTalkPressed) {
        e.preventDefault();
        this.isPushToTalkPressed = false;
        this.setMuted(true);

        const participant = this.participants.get(this.config.userId);
        if (participant) {
          participant.isPushToTalkActive = false;
        }

        this.emit("push-to-talk-ended");
        this.config.onPushToTalkChange?.(false);
      }
    };

    window.addEventListener("keydown", this.pushToTalkKeyHandler);
    window.addEventListener("keyup", this.pushToTalkKeyUpHandler);
  }

  private teardownPushToTalk(): void {
    if (typeof window === "undefined") return;

    if (this.pushToTalkKeyHandler) {
      window.removeEventListener("keydown", this.pushToTalkKeyHandler);
      this.pushToTalkKeyHandler = null;
    }

    if (this.pushToTalkKeyUpHandler) {
      window.removeEventListener("keyup", this.pushToTalkKeyUpHandler);
      this.pushToTalkKeyUpHandler = null;
    }

    this.isPushToTalkPressed = false;
  }

  // ===========================================================================
  // Volume Controls
  // ===========================================================================

  setParticipantVolume(userId: string, volume: number): void {
    // Volume range: 0-2 (0 = mute, 1 = normal, 2 = 200%)
    const clampedVolume = Math.max(0, Math.min(2, volume));
    this.volumeLevels.set(userId, clampedVolume);

    const participant = this.participants.get(userId);
    if (participant) {
      participant.volumeLevel = clampedVolume;
    }

    // Apply to media stream
    const stream = this.mediaStreams.get(userId);
    if (stream && this.audioAnalyzer) {
      // In a real implementation, you'd use a GainNode to adjust volume
      // For now, just emit the event
      this.emit("participant-volume-changed", {
        userId,
        volume: clampedVolume,
      });
    }
  }

  getParticipantVolume(userId: string): number {
    return this.volumeLevels.get(userId) ?? 1;
  }

  // ===========================================================================
  // Recording
  // ===========================================================================

  async startRecording(): Promise<VoiceChatRecording> {
    if (!this.isCreator || !this.currentVoiceChat) {
      throw new Error("Not authorized to start recording");
    }

    if (!this.currentVoiceChat.isRecordingEnabled) {
      throw new Error("Recording is not enabled for this voice chat");
    }

    if (this.isRecording) {
      throw new Error("Already recording");
    }

    const recordingId = generateCallId();
    const now = new Date();

    this.currentRecording = {
      id: recordingId,
      voiceChatId: this.currentVoiceChat.id,
      status: "recording",
      startedAt: now,
      duration: 0,
      startedBy: this.config.userId,
      format: "opus",
      includesAllParticipants: true,
    };

    this.currentVoiceChat.isRecording = true;
    this.recordedChunks = [];

    // Set up media recorder if we have a local stream
    if (this.localStream) {
      try {
        this.mediaRecorder = new MediaRecorder(this.localStream, {
          mimeType: "audio/webm;codecs=opus",
        });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.start(1000); // Collect data every second
      } catch {
        // MediaRecorder not supported, continue without local recording
        logger.warn(
          "[VoiceChat] MediaRecorder not supported, recording will be server-side only",
        );
      }
    }

    this.addModerationLog("start_recording");

    this.emit("recording-started", { recording: this.currentRecording });
    this.config.onRecordingStatusChange?.(this.currentRecording);

    return this.currentRecording;
  }

  async stopRecording(): Promise<VoiceChatRecording> {
    if (!this.isCreator || !this.currentVoiceChat) {
      throw new Error("Not authorized to stop recording");
    }

    if (!this.isRecording || !this.currentRecording) {
      throw new Error("Not recording");
    }

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    const now = new Date();
    const duration = Math.floor(
      (now.getTime() - this.currentRecording.startedAt.getTime()) / 1000,
    );

    this.currentRecording.status = "processing";
    this.currentRecording.endedAt = now;
    this.currentRecording.duration = duration;
    this.currentRecording.stoppedBy = this.config.userId;

    this.currentVoiceChat.isRecording = false;

    // Create blob from recorded chunks
    if (this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
      this.currentRecording.fileSize = blob.size;

      // In a real implementation, upload the blob and get the URL
      // For now, create an object URL
      this.currentRecording.url = URL.createObjectURL(blob);
      this.currentRecording.downloadUrl = this.currentRecording.url;
      this.currentRecording.status = "ready";
    }

    this.addModerationLog("stop_recording");

    const recording = { ...this.currentRecording };

    this.emit("recording-stopped", { recording });
    this.config.onRecordingStatusChange?.(recording);

    this.mediaRecorder = null;
    this.recordedChunks = [];

    return recording;
  }

  getRecordingDuration(): number {
    if (
      !this.currentRecording ||
      this.currentRecording.status !== "recording"
    ) {
      return 0;
    }

    return Math.floor(
      (Date.now() - this.currentRecording.startedAt.getTime()) / 1000,
    );
  }

  // ===========================================================================
  // Scheduling
  // ===========================================================================

  async scheduleVoiceChat(
    input: ScheduleVoiceChatInput,
  ): Promise<ScheduledVoiceChat> {
    const scheduledId = generateCallId();
    const now = new Date();

    const scheduled: ScheduledVoiceChat = {
      id: scheduledId,
      channelId: input.channelId,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      creatorId: this.config.userId,
      creator: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      coHostIds: input.coHostIds ?? [],
      status: "scheduled",
      remindersSent: [],
      interestedCount: 0,
      autoStart: input.autoStart ?? false,
      createdAt: now,
      updatedAt: now,
    };

    this.scheduledVoiceChats.set(scheduledId, scheduled);
    this.scheduledInterests.set(scheduledId, []);

    // Set up reminders and auto-start
    this.setupScheduledTimers(scheduled);

    this.emit("voice-chat-scheduled", { scheduled });

    return scheduled;
  }

  async updateScheduledVoiceChat(
    scheduledId: string,
    input: UpdateScheduledVoiceChatInput,
  ): Promise<ScheduledVoiceChat> {
    const scheduled = this.scheduledVoiceChats.get(scheduledId);
    if (!scheduled) {
      throw new Error("Scheduled voice chat not found");
    }

    if (scheduled.creatorId !== this.config.userId) {
      throw new Error("Not authorized to update this scheduled voice chat");
    }

    Object.assign(scheduled, {
      ...input,
      updatedAt: new Date(),
    });

    // Clear and reset timers
    this.clearScheduledTimers(scheduledId);
    this.setupScheduledTimers(scheduled);

    this.emit("scheduled-voice-chat-updated", { scheduled });

    return scheduled;
  }

  async cancelScheduledVoiceChat(scheduledId: string): Promise<void> {
    const scheduled = this.scheduledVoiceChats.get(scheduledId);
    if (!scheduled) {
      throw new Error("Scheduled voice chat not found");
    }

    if (scheduled.creatorId !== this.config.userId) {
      throw new Error("Not authorized to cancel this scheduled voice chat");
    }

    scheduled.status = "cancelled";
    scheduled.updatedAt = new Date();

    this.clearScheduledTimers(scheduledId);

    this.emit("scheduled-voice-chat-cancelled", { scheduled });
  }

  async startScheduledVoiceChat(scheduledId: string): Promise<VoiceChat> {
    const scheduled = this.scheduledVoiceChats.get(scheduledId);
    if (!scheduled) {
      throw new Error("Scheduled voice chat not found");
    }

    if (scheduled.creatorId !== this.config.userId) {
      throw new Error("Not authorized to start this scheduled voice chat");
    }

    if (scheduled.status === "live") {
      throw new Error("Voice chat already started");
    }

    scheduled.status = "live";
    scheduled.actualStart = new Date();

    this.clearScheduledTimers(scheduledId);

    const voiceChat = await this.createVoiceChat({
      channelId: scheduled.channelId,
      workspaceId: scheduled.workspaceId,
      title: scheduled.title,
      description: scheduled.description,
    });

    scheduled.voiceChatId = voiceChat.id;

    // Notify interested users
    const interests = this.scheduledInterests.get(scheduledId) ?? [];
    for (const interest of interests) {
      this.emit("scheduled-voice-chat-started", {
        scheduled,
        userId: interest.userId,
      });
    }

    return voiceChat;
  }

  async expressInterest(scheduledId: string): Promise<VoiceChatInterest> {
    const scheduled = this.scheduledVoiceChats.get(scheduledId);
    if (!scheduled) {
      throw new Error("Scheduled voice chat not found");
    }

    const interests = this.scheduledInterests.get(scheduledId) ?? [];
    const existing = interests.find((i) => i.userId === this.config.userId);
    if (existing) {
      return existing;
    }

    const interest: VoiceChatInterest = {
      id: generateCallId(),
      scheduledVoiceChatId: scheduledId,
      userId: this.config.userId,
      user: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      reminderEnabled: true,
      createdAt: new Date(),
    };

    interests.push(interest);
    this.scheduledInterests.set(scheduledId, interests);
    scheduled.interestedCount++;

    return interest;
  }

  async removeInterest(scheduledId: string): Promise<void> {
    const scheduled = this.scheduledVoiceChats.get(scheduledId);
    if (!scheduled) {
      throw new Error("Scheduled voice chat not found");
    }

    const interests = this.scheduledInterests.get(scheduledId) ?? [];
    const index = interests.findIndex((i) => i.userId === this.config.userId);
    if (index !== -1) {
      interests.splice(index, 1);
      this.scheduledInterests.set(scheduledId, interests);
      scheduled.interestedCount--;
    }
  }

  getScheduledVoiceChat(scheduledId: string): ScheduledVoiceChat | undefined {
    return this.scheduledVoiceChats.get(scheduledId);
  }

  getScheduledVoiceChatsForChannel(channelId: string): ScheduledVoiceChat[] {
    return Array.from(this.scheduledVoiceChats.values())
      .filter((s) => s.channelId === channelId && s.status === "scheduled")
      .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
  }

  getUpcomingScheduledVoiceChats(limit: number = 10): ScheduledVoiceChat[] {
    const now = new Date();
    return Array.from(this.scheduledVoiceChats.values())
      .filter((s) => s.status === "scheduled" && s.scheduledStart > now)
      .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())
      .slice(0, limit);
  }

  getInterestedUsers(scheduledId: string): VoiceChatInterest[] {
    return this.scheduledInterests.get(scheduledId) ?? [];
  }

  private setupScheduledTimers(scheduled: ScheduledVoiceChat): void {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();
    const startTime = scheduled.scheduledStart.getTime();

    // Set up reminder timers (15 and 60 minutes before by default)
    const reminderMinutes = [15, 60];
    for (const minutes of reminderMinutes) {
      const reminderTime = startTime - minutes * 60 * 1000;
      if (reminderTime > now) {
        const timer = setTimeout(() => {
          if (scheduled.status === "scheduled") {
            scheduled.remindersSent.push(true);
            this.emit("scheduled-reminder", {
              scheduled,
              minutesBefore: minutes,
            });
            this.config.onScheduledReminder?.(scheduled, minutes);
          }
        }, reminderTime - now);
        timers.push(timer);
      }
    }

    // Set up starting_soon status change (15 minutes before)
    const startingSoonTime = startTime - 15 * 60 * 1000;
    if (startingSoonTime > now) {
      const timer = setTimeout(() => {
        if (scheduled.status === "scheduled") {
          scheduled.status = "starting_soon";
          this.emit("scheduled-starting-soon", { scheduled });
        }
      }, startingSoonTime - now);
      timers.push(timer);
    }

    // Set up auto-start if configured
    if (scheduled.autoStart && startTime > now) {
      const timer = setTimeout(() => {
        if (
          scheduled.status === "scheduled" ||
          scheduled.status === "starting_soon"
        ) {
          this.startScheduledVoiceChat(scheduled.id).catch((err) => {
            logger.error(
              "[VoiceChat] Failed to auto-start scheduled voice chat:",
              err,
            );
          });
        }
      }, startTime - now);
      timers.push(timer);
    }

    this.scheduledTimers.set(scheduled.id, timers);
  }

  private clearScheduledTimers(scheduledId: string): void {
    const timers = this.scheduledTimers.get(scheduledId);
    if (timers) {
      timers.forEach((timer) => clearTimeout(timer));
      this.scheduledTimers.delete(scheduledId);
    }
  }

  // ===========================================================================
  // Getters for UI
  // ===========================================================================

  getSpeakers(): VoiceChatParticipant[] {
    return Array.from(this.participants.values())
      .filter(
        (p) =>
          p.role === "speaker" || p.role === "admin" || p.role === "creator",
      )
      .sort((a, b) => {
        // Creator first
        if (a.role === "creator" && b.role !== "creator") return -1;
        if (a.role !== "creator" && b.role === "creator") return 1;

        // Then admins
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;

        // Then by speaker position
        const posA = a.speakerPosition ?? Infinity;
        const posB = b.speakerPosition ?? Infinity;
        return posA - posB;
      });
  }

  getListeners(): VoiceChatParticipant[] {
    return Array.from(this.participants.values())
      .filter((p) => p.role === "listener")
      .sort((a, b) => {
        // Raised hands first
        if (a.hasRaisedHand && !b.hasRaisedHand) return -1;
        if (!a.hasRaisedHand && b.hasRaisedHand) return 1;

        // Then by join time
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      });
  }

  getParticipants(): VoiceChatParticipant[] {
    return Array.from(this.participants.values());
  }

  getParticipant(userId: string): VoiceChatParticipant | undefined {
    return this.participants.get(userId);
  }

  getModerationLog(): VoiceChatModerationLog[] {
    return [...this.moderationLog];
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private createSelfParticipant(role: VoiceChatRole): VoiceChatParticipant {
    return {
      id: `${this.currentVoiceChat?.id}-${this.config.userId}`,
      voiceChatId: this.currentVoiceChat?.id ?? "",
      userId: this.config.userId,
      user: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      role,
      talkMode: this.talkMode,
      isMuted: role === "listener" ? true : this.isMuted,
      isSpeaking: false,
      isPushToTalkActive: false,
      audioLevel: 0,
      volumeLevel: 1,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: false,
      isForceMuted: false,
      becameSpeakerAt: role !== "listener" ? new Date() : undefined,
      speakerPosition: role !== "listener" ? 0 : undefined,
      isActiveSpeaker: false,
    };
  }

  private async startLocalAudio(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Mute by default
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });

      this.setupLocalAudioAnalysis();

      this.emit("local-stream-ready", { stream: this.localStream });
    } catch (error) {
      throw new Error(`Failed to get audio: ${(error as Error).message}`);
    }
  }

  private setupLocalAudioAnalysis(): void {
    if (!this.audioAnalyzer || !this.localStream) return;

    const source = this.audioAnalyzer.createMediaStreamSource(this.localStream);
    const analyser = this.audioAnalyzer.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    this.audioAnalyzers.set(this.config.userId, analyser);
    this.startAudioLevelMonitoring();
  }

  private startAudioLevelMonitoring(): void {
    const checkAudioLevels = () => {
      if (!this.currentVoiceChat) return;

      for (const [participantId, analyser] of this.audioAnalyzers) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const participant = this.participants.get(participantId);

        if (participant) {
          participant.audioLevel = average;
          participant.isSpeaking =
            average > ACTIVE_SPEAKER_THRESHOLD && !participant.isMuted;
        }

        if (average > ACTIVE_SPEAKER_THRESHOLD) {
          this.updateActiveSpeaker(participantId);
        }
      }

      if (this.isLive) {
        requestAnimationFrame(checkAudioLevels);
      }
    };

    requestAnimationFrame(checkAudioLevels);
  }

  private updateActiveSpeaker(participantId: string): void {
    const participant = this.participants.get(participantId);
    if (!participant || participant.isMuted) return;

    if (this.activeSpeakerId === participantId) return;

    if (this.speakerDebounceTimer) {
      clearTimeout(this.speakerDebounceTimer);
    }

    this.speakerDebounceTimer = setTimeout(() => {
      // Clear previous active speaker
      if (this.activeSpeakerId) {
        const previousSpeaker = this.participants.get(this.activeSpeakerId);
        if (previousSpeaker) {
          previousSpeaker.isActiveSpeaker = false;
        }
      }

      const newActiveSpeaker = this.participants.get(participantId);
      if (newActiveSpeaker) {
        newActiveSpeaker.isActiveSpeaker = true;
      }

      const previousSpeaker = this.activeSpeakerId;
      this.activeSpeakerId = participantId;
      this.config.onActiveSpeakerChange?.(participantId);
      this.emit("active-speaker-changed", { participantId, previousSpeaker });
    }, SPEAKER_DEBOUNCE_MS);
  }

  private handleParticipantJoined(payload: any): void {
    if (!this.currentVoiceChat) return;

    const participant: VoiceChatParticipant = {
      id: `${this.currentVoiceChat.id}-${payload.participant.id}`,
      voiceChatId: this.currentVoiceChat.id,
      userId: payload.participant.id,
      user: {
        id: payload.participant.id,
        displayName: payload.participant.name,
        avatarUrl: payload.participant.avatarUrl,
      } as UserBasicInfo,
      role: "listener",
      talkMode: this.currentVoiceChat.settings.defaultTalkMode,
      isMuted: true,
      isSpeaking: false,
      isPushToTalkActive: false,
      audioLevel: 0,
      volumeLevel: 1,
      connectionState: "connecting",
      joinedAt: new Date(),
      hasRaisedHand: false,
      isForceMuted: false,
      isActiveSpeaker: false,
    };

    this.participants.set(payload.participant.id, participant);

    // Update counts
    this.currentVoiceChat.participantCount++;
    this.currentVoiceChat.listenerCount++;

    // Update metrics
    this.metrics.totalUniqueParticipants++;
    this.updatePeakCounts();

    this.config.onParticipantJoined?.(participant);
    this.emit("participant-joined", { participant });
  }

  private handleParticipantLeft(payload: any): void {
    if (!this.currentVoiceChat) return;

    const participant = this.participants.get(payload.participant.id);
    if (!participant) return;

    // Clear any raise hand requests
    this.clearRaiseHandRequest(payload.participant.id);

    // Cleanup
    this.peerConnections.get(payload.participant.id)?.close();
    this.peerConnections.delete(payload.participant.id);
    this.mediaStreams.delete(payload.participant.id);
    this.audioAnalyzers.delete(payload.participant.id);
    this.volumeLevels.delete(payload.participant.id);
    this.participants.delete(payload.participant.id);

    // Update counts
    this.currentVoiceChat.participantCount--;
    if (participant.role === "listener") {
      this.currentVoiceChat.listenerCount--;
    } else {
      this.currentVoiceChat.speakerCount--;
    }

    this.config.onParticipantLeft?.(participant, "left");
    this.emit("participant-left", { participant, reason: "left" });
  }

  private handleVoiceChatEnded(reason: CallEndReason): void {
    if (!this.currentVoiceChat) return;

    const previousStatus = this.currentVoiceChat.status;
    this.currentVoiceChat.status = "ended";
    this.currentVoiceChat.endedAt = new Date();

    this.emit("voice-chat-ended", {
      voiceChat: this.currentVoiceChat,
      reason,
      metrics: this.metrics,
    });
    this.config.onStatusChange?.(this.currentVoiceChat, previousStatus);

    this.cleanup();
  }

  private async handleOffer(payload: any): Promise<void> {
    const pc = this.peerConnections.get(payload.fromUserId);
    if (!pc || !this.currentVoiceChat) return;

    await pc.setRemoteDescription(payload.sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.signaling?.sendAnswer({
      callId: payload.callId,
      fromUserId: this.config.userId,
      toUserId: payload.fromUserId,
      sdp: answer,
    });
  }

  private async handleAnswer(payload: any): Promise<void> {
    const pc = this.peerConnections.get(payload.fromUserId);
    if (!pc) return;

    await pc.setRemoteDescription(payload.sdp);
  }

  private async handleIceCandidate(payload: any): Promise<void> {
    const pc = this.peerConnections.get(payload.fromUserId);
    if (!pc) return;

    await pc.addIceCandidate(payload.candidate);
  }

  private handleRemoteMuteChange(userId: string, isMuted: boolean): void {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.isMuted = isMuted;
      this.emit("participant-mute-change", { userId, isMuted });
    }
  }

  private handleError(error: Error): void {
    logger.error("[VoiceChat] Error:", error);
    this.config.onError?.(error);
    this.emit("error", error);
  }

  private getVoiceChatDuration(): number {
    if (!this.currentVoiceChat?.startedAt) return 0;
    const endTime = this.currentVoiceChat.endedAt || new Date();
    return Math.floor(
      (endTime.getTime() - this.currentVoiceChat.startedAt.getTime()) / 1000,
    );
  }

  private generateInviteLink(voiceChatId: string): string {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://app.example.com";
    return `${baseUrl}/voice-chat/${voiceChatId}`;
  }

  private extractVoiceChatIdFromLink(link: string): string | null {
    const match = link.match(/voice-chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  private addModerationLog(
    action: VoiceChatModerationAction,
    targetUserId?: string,
    details?: Record<string, unknown>,
  ): void {
    const targetUser = targetUserId
      ? this.participants.get(targetUserId)?.user
      : undefined;

    const log: VoiceChatModerationLog = {
      id: generateCallId(),
      voiceChatId: this.currentVoiceChat?.id ?? "",
      action,
      adminId: this.config.userId,
      admin: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      targetUserId,
      targetUser,
      details,
      timestamp: new Date(),
    };

    this.moderationLog.push(log);
    this.emit("moderation-action", { log });
  }

  // ===========================================================================
  // Metrics
  // ===========================================================================

  private createEmptyMetrics(): VoiceChatMetrics {
    return {
      voiceChatId: "",
      listenerCount: 0,
      speakerCount: 0,
      peakListenerCount: 0,
      peakSpeakerCount: 0,
      totalUniqueParticipants: 0,
      averageParticipationDuration: 0,
      totalRaiseHandRequests: 0,
      acceptedRaiseHandRequests: 0,
      declinedRaiseHandRequests: 0,
      duration: 0,
      reactionCounts: {},
      chatMessageCount: 0,
      recordingDuration: 0,
    };
  }

  private startMetricsCollection(): void {
    this.stopMetricsCollection();
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000);
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  private collectMetrics(): void {
    if (!this.currentVoiceChat?.startedAt) return;

    this.metrics.voiceChatId = this.currentVoiceChat.id;
    this.metrics.duration = this.getVoiceChatDuration();
    this.metrics.listenerCount = this.voiceChatListenerCount;
    this.metrics.speakerCount = this.speakerCount;

    if (this.isRecording) {
      this.metrics.recordingDuration = this.getRecordingDuration();
    }
  }

  private updatePeakCounts(): void {
    if (this.voiceChatListenerCount > this.metrics.peakListenerCount) {
      this.metrics.peakListenerCount = this.voiceChatListenerCount;
    }
    if (this.speakerCount > this.metrics.peakSpeakerCount) {
      this.metrics.peakSpeakerCount = this.speakerCount;
    }
  }

  private startRaiseHandTimeoutChecker(): void {
    if (this.raiseHandTimeoutInterval) {
      clearInterval(this.raiseHandTimeoutInterval);
    }

    this.raiseHandTimeoutInterval = setInterval(() => {
      const timeout = this.currentVoiceChat?.settings.raiseHandTimeout;
      if (!timeout) return;

      const now = new Date();
      for (const request of this.raiseHandRequests.values()) {
        if (request.status !== "pending") continue;

        const elapsed = (now.getTime() - request.requestedAt.getTime()) / 1000;
        if (elapsed >= timeout) {
          this.declineRaiseHand(request.id, "Request timed out").catch(
            (err) => {
              logger.warn(
                "[VoiceChat] Failed to auto-decline raise hand:",
                err,
              );
            },
          );
        }
      }
    }, RAISE_HAND_CHECK_INTERVAL_MS);
  }

  private stopRaiseHandTimeoutChecker(): void {
    if (this.raiseHandTimeoutInterval) {
      clearInterval(this.raiseHandTimeoutInterval);
      this.raiseHandTimeoutInterval = null;
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanup(): void {
    // Stop timers
    this.stopMetricsCollection();
    this.stopRaiseHandTimeoutChecker();

    // Tear down push-to-talk
    this.teardownPushToTalk();

    // Clear reconnect timers
    this.reconnectTimers.forEach((timer) => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Clear speaker debounce
    if (this.speakerDebounceTimer) {
      clearTimeout(this.speakerDebounceTimer);
      this.speakerDebounceTimer = null;
    }

    // Close peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Stop local stream
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // Clear collections
    this.mediaStreams.clear();
    this.audioAnalyzers.clear();
    this.participants.clear();
    this.raiseHandRequests.clear();
    this.raiseHandQueue = [];
    this.volumeLevels.clear();

    // Reset state
    this.isMuted = true;
    this.myRole = "listener";
    this.hasRaisedHand = false;
    this.myRaiseHandRequestId = null;
    this.reconnectAttempts = 0;
    this.activeSpeakerId = null;
    this.currentVoiceChat = null;
    this.currentRecording = null;
    this.moderationLog = [];
    this.isPushToTalkPressed = false;
    this.talkMode = "voice_activity";

    // Reset metrics
    this.metrics = this.createEmptyMetrics();
  }

  destroy(): void {
    this.cleanup();

    // Clear scheduled timers
    for (const scheduledId of this.scheduledTimers.keys()) {
      this.clearScheduledTimers(scheduledId);
    }
    this.scheduledVoiceChats.clear();
    this.scheduledInterests.clear();

    if (this.audioAnalyzer) {
      this.audioAnalyzer.close();
      this.audioAnalyzer = null;
    }

    if (this.signaling) {
      this.signaling.disconnect();
      this.signaling = null;
    }

    this.removeAllListeners();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createVoiceChatService(
  config: VoiceChatServiceOptions,
): VoiceChatService {
  return new VoiceChatService(config);
}

// =============================================================================
// Re-export types
// =============================================================================

export type {
  VoiceChat,
  VoiceChatParticipant,
  VoiceChatRole,
  VoiceChatStatus,
  VoiceChatSettings,
  VoiceChatHandRequest,
  VoiceChatHandStatus,
  VoiceChatMetrics,
  VoiceChatModerationAction,
  VoiceChatModerationLog,
  VoiceChatRecording,
  RecordingStatus,
  VoiceChatConnectionState,
  VoiceChatServiceCallbacks,
  CreateVoiceChatInput,
  UpdateVoiceChatInput,
  ScheduledVoiceChat,
  ScheduledVoiceChatStatus,
  ScheduleVoiceChatInput,
  UpdateScheduledVoiceChatInput,
  VoiceChatInterest,
  PushToTalkMode,
} from "@/types/voice-chat";
