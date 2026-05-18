/**
 * Stage Channel Service
 *
 * Complete service for managing Discord-like stage channels.
 * Handles speaker/listener roles, raise hand functionality,
 * stage moderation, and scheduled stage events.
 */

import { EventEmitter } from "events";
import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
  type CallEndReason,
} from "@/lib/webrtc/signaling";
import { logger } from "@/lib/logger";
import { DEFAULT_STAGE_SETTINGS } from "@/types/stage";
import type {
  StageChannel,
  StageParticipant,
  StageRole,
  StageStatus,
  StageSettings,
  RaiseHandRequest,
  HandRaiseStatus,
  StageEvent,
  StageEventStatus,
  StageEventInterest,
  StageMetrics,
  StageModerationAction,
  StageModerationLog,
  CreateStageChannelInput,
  UpdateStageChannelInput,
  CreateStageEventInput,
  UpdateStageEventInput,
  StageServiceCallbacks,
  StageConnectionState,
} from "@/types/stage";
import type { UserBasicInfo } from "@/types/user";

// =============================================================================
// Types
// =============================================================================

export interface StageServiceConfig {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export interface StageServiceOptions
  extends StageServiceConfig, StageServiceCallbacks {}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const ACTIVE_SPEAKER_THRESHOLD = 0.02;
const SPEAKER_DEBOUNCE_MS = 1000;
const RAISE_HAND_CHECK_INTERVAL_MS = 1000;

// =============================================================================
// Stage Channel Service
// =============================================================================

export class StageChannelService extends EventEmitter {
  private config: StageServiceOptions;
  private signaling: SignalingManager | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();

  // Stage state
  private currentStage: StageChannel | null = null;
  private participants: Map<string, StageParticipant> = new Map();
  private raiseHandRequests: Map<string, RaiseHandRequest> = new Map();
  private raiseHandQueue: string[] = []; // Ordered list of request IDs

  // Local state
  private localStream: MediaStream | null = null;
  private isMuted: boolean = true;
  private myRole: StageRole = "listener";
  private hasRaisedHand: boolean = false;
  private myRaiseHandRequestId: string | null = null;

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
  private metrics: StageMetrics = this.createEmptyMetrics();

  // Moderation log
  private moderationLog: StageModerationLog[] = [];

  constructor(config: StageServiceOptions) {
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

  get stageInfo(): StageChannel | null {
    return this.currentStage;
  }

  get isInStage(): boolean {
    return this.currentStage !== null && this.currentStage.status !== "ended";
  }

  get isLive(): boolean {
    return this.currentStage?.status === "live";
  }

  get isSpeaker(): boolean {
    return this.myRole === "speaker" || this.myRole === "moderator";
  }

  get isModerator(): boolean {
    return this.myRole === "moderator";
  }

  get isListener(): boolean {
    return this.myRole === "listener";
  }

  get speakerCount(): number {
    return Array.from(this.participants.values()).filter(
      (p) => p.role === "speaker" || p.role === "moderator",
    ).length;
  }

  get stageListenerCount(): number {
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

  get stageMetrics(): StageMetrics {
    return { ...this.metrics };
  }

  get role(): StageRole {
    return this.myRole;
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
        if (this.currentStage?.id === payload.callId) {
          this.handleStageEnded(payload.reason as CallEndReason);
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
  // Stage Creation and Management
  // ===========================================================================

  async createStage(input: CreateStageChannelInput): Promise<StageChannel> {
    if (this.isInStage) {
      throw new Error("Already in a stage");
    }

    const stageId = generateCallId();
    const now = new Date();

    const settings: StageSettings = {
      ...DEFAULT_STAGE_SETTINGS,
      ...input.settings,
    };

    const stage: StageChannel = {
      id: stageId,
      channelId: input.channelId,
      workspaceId: input.workspaceId,
      name: input.name,
      topic: input.topic,
      description: input.description,
      status: input.scheduledStartTime ? "scheduled" : "live",
      isDiscoverable: input.isDiscoverable ?? true,
      maxListeners: input.maxListeners ?? 0,
      maxSpeakers: input.maxSpeakers ?? 0,
      createdBy: this.config.userId,
      createdAt: now,
      updatedAt: now,
      startedAt: input.scheduledStartTime ? undefined : now,
      scheduledStartTime: input.scheduledStartTime,
      scheduledEndTime: input.scheduledEndTime,
      bannerUrl: input.bannerUrl,
      iconUrl: input.iconUrl,
      isRecordingEnabled: input.isRecordingEnabled ?? false,
      isRecording: false,
      settings,
    };

    this.currentStage = stage;
    this.myRole = "moderator";

    // Add self as moderator
    const selfParticipant = this.createSelfParticipant("moderator");
    this.participants.set(this.config.userId, selfParticipant);

    if (stage.status === "live") {
      // Get local audio
      await this.startLocalAudio();

      // Start metrics collection
      this.startMetricsCollection();
      this.startRaiseHandTimeoutChecker();

      // Notify signaling
      this.signaling?.initiateCall({
        callId: stageId,
        targetUserId: "",
        callType: "voice",
        channelId: input.channelId,
        metadata: {
          isStage: true,
          topic: input.topic,
          hostId: this.config.userId,
        },
      });
    }

    this.emit("stage-created", { stage });
    return stage;
  }

  async joinStage(stageId: string, asSpeaker: boolean = false): Promise<void> {
    if (this.isInStage) {
      throw new Error("Already in a stage");
    }

    // In real implementation, fetch stage from server
    // For now, we set up a basic stage structure
    const now = new Date();

    this.currentStage = {
      id: stageId,
      channelId: "",
      workspaceId: "",
      name: "Stage",
      topic: "",
      status: "live",
      isDiscoverable: true,
      maxListeners: 0,
      maxSpeakers: 0,
      createdBy: "",
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      isRecordingEnabled: false,
      isRecording: false,
      settings: DEFAULT_STAGE_SETTINGS,
    };

    this.myRole = asSpeaker ? "speaker" : "listener";

    // Add self as participant
    const selfParticipant = this.createSelfParticipant(this.myRole);
    this.participants.set(this.config.userId, selfParticipant);

    // Get local audio if speaker
    if (asSpeaker) {
      await this.startLocalAudio();
    }

    // Notify signaling
    this.signaling?.acceptCall(stageId, this.config.userId);

    this.emit("stage-joined", { stageId, role: this.myRole });

    // Update metrics
    this.metrics.totalUniqueListeners++;
    this.updatePeakCounts();
  }

  async leaveStage(): Promise<void> {
    if (!this.currentStage) return;

    const duration = this.getStageDuration();

    // If we're the last moderator, end the stage
    const moderators = Array.from(this.participants.values()).filter(
      (p) => p.role === "moderator",
    );
    if (
      moderators.length === 1 &&
      moderators[0].userId === this.config.userId
    ) {
      await this.endStage();
      return;
    }

    this.signaling?.endCall(
      this.currentStage.id,
      this.config.userId,
      "completed",
      duration,
    );

    this.emit("stage-left", { stageId: this.currentStage.id });
    this.cleanup();
  }

  async endStage(): Promise<void> {
    if (!this.currentStage || !this.isModerator) {
      throw new Error("Not authorized to end stage");
    }

    const duration = this.getStageDuration();

    this.currentStage.status = "ended";
    this.currentStage.endedAt = new Date();

    this.signaling?.endCall(
      this.currentStage.id,
      this.config.userId,
      "completed",
      duration,
    );

    this.addModerationLog("end_stage");

    this.emit("stage-ended", {
      stage: this.currentStage,
      metrics: this.metrics,
    });
    this.config.onStageStatusChange?.(this.currentStage, "live");

    this.cleanup();
  }

  async pauseStage(): Promise<void> {
    if (!this.currentStage || !this.isModerator) {
      throw new Error("Not authorized to pause stage");
    }

    const previousStatus = this.currentStage.status;
    this.currentStage.status = "paused";

    this.addModerationLog("pause_stage");

    this.emit("stage-paused", { stage: this.currentStage });
    this.config.onStageStatusChange?.(this.currentStage, previousStatus);
  }

  async resumeStage(): Promise<void> {
    if (!this.currentStage || !this.isModerator) {
      throw new Error("Not authorized to resume stage");
    }

    const previousStatus = this.currentStage.status;
    this.currentStage.status = "live";

    this.addModerationLog("resume_stage");

    this.emit("stage-resumed", { stage: this.currentStage });
    this.config.onStageStatusChange?.(this.currentStage, previousStatus);
  }

  async updateTopic(topic: string): Promise<void> {
    if (!this.currentStage || !this.isModerator) {
      throw new Error("Not authorized to update topic");
    }

    const previousTopic = this.currentStage.topic;
    this.currentStage.topic = topic;
    this.currentStage.updatedAt = new Date();

    this.addModerationLog("update_topic", undefined, {
      previousTopic,
      newTopic: topic,
    });

    this.emit("topic-updated", { topic, previousTopic });
    this.config.onTopicChanged?.(this.currentStage, previousTopic);
  }

  // ===========================================================================
  // Speaker/Listener Management
  // ===========================================================================

  async inviteToSpeak(userId: string): Promise<void> {
    if (!this.isModerator) {
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
      this.currentStage?.maxSpeakers &&
      this.speakerCount >= this.currentStage.maxSpeakers
    ) {
      throw new Error("Maximum speakers reached");
    }

    await this.promoteToSpeaker(userId);

    // Clear any raise hand request
    this.clearRaiseHandRequest(userId);

    this.addModerationLog("invite_to_speak", userId);

    this.emit("speaker-invited", { userId, participant });
  }

  async moveToAudience(userId: string): Promise<void> {
    if (!this.isModerator) {
      throw new Error("Not authorized to move speakers");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role === "listener") {
      throw new Error("Participant is already in audience");
    }

    if (participant.role === "moderator") {
      throw new Error("Cannot move moderator to audience");
    }

    await this.demoteToListener(userId);

    this.addModerationLog("move_to_audience", userId);

    this.emit("speaker-removed", {
      userId,
      participant,
      reason: "moved_to_audience",
    });
    this.config.onSpeakerRemoved?.(participant, "moved_to_audience");
  }

  async muteSpeaker(userId: string): Promise<void> {
    if (!this.isModerator) {
      throw new Error("Not authorized to mute speakers");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.isServerMuted = true;
    participant.isMuted = true;

    this.signaling?.notifyMuteChange(this.currentStage!.id, userId, true);

    this.addModerationLog("mute_speaker", userId);

    this.emit("speaker-muted", { userId, byModerator: true });
  }

  async unmuteSpeaker(userId: string): Promise<void> {
    if (!this.isModerator) {
      throw new Error("Not authorized to unmute speakers");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.isServerMuted = false;

    this.addModerationLog("unmute_speaker", userId);

    this.emit("speaker-unmuted", { userId, byModerator: true });
  }

  async removeFromStage(
    userId: string,
    reason: string = "removed",
  ): Promise<void> {
    if (!this.isModerator) {
      throw new Error("Not authorized to remove participants");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.role === "moderator") {
      throw new Error("Cannot remove moderator");
    }

    // Close connection and remove
    this.peerConnections.get(userId)?.close();
    this.peerConnections.delete(userId);
    this.mediaStreams.delete(userId);
    this.audioAnalyzers.delete(userId);
    this.participants.delete(userId);

    this.addModerationLog("remove_from_stage", userId, { reason });

    this.emit("participant-removed", { participant, reason });
    this.config.onParticipantLeft?.(participant, reason);
  }

  async promoteToModerator(userId: string): Promise<void> {
    if (!this.isModerator) {
      throw new Error("Not authorized to promote moderators");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.role = "moderator";

    this.addModerationLog("promote_to_moderator", userId);

    this.emit("moderator-added", { participant });
  }

  async demoteFromModerator(userId: string): Promise<void> {
    if (!this.isModerator) {
      throw new Error("Not authorized to demote moderators");
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (participant.userId === this.currentStage?.createdBy) {
      throw new Error("Cannot demote stage creator");
    }

    participant.role = "speaker";

    this.addModerationLog("demote_from_moderator", userId);

    this.emit("moderator-removed", { participant });
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

  async raiseHand(message?: string): Promise<RaiseHandRequest> {
    if (!this.currentStage || this.isSpeaker) {
      throw new Error("Cannot raise hand as speaker");
    }

    if (!this.currentStage.settings.allowRaiseHand) {
      throw new Error("Raise hand is disabled");
    }

    if (this.hasRaisedHand) {
      throw new Error("Hand already raised");
    }

    if (
      this.currentStage.settings.maxPendingRequests &&
      this.pendingRaiseHandCount >=
        this.currentStage.settings.maxPendingRequests
    ) {
      throw new Error("Maximum pending requests reached");
    }

    const requestId = generateCallId();
    const now = new Date();

    const request: RaiseHandRequest = {
      id: requestId,
      stageId: this.currentStage.id,
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
    if (this.currentStage.settings.autoAcceptRaiseHand) {
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
    if (!this.isModerator) {
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
    if (!this.isModerator) {
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
    if (!this.isModerator) {
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

    this.emit("hand-lowered", { userId, byModerator: true });
  }

  private clearRaiseHandRequest(userId: string): void {
    // Find request by user
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

  getRaiseHandRequests(): RaiseHandRequest[] {
    return this.raiseHandQueue
      .map((id) => this.raiseHandRequests.get(id))
      .filter(
        (r): r is RaiseHandRequest => r !== undefined && r.status === "pending",
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
    if (participant?.isServerMuted && !muted) {
      throw new Error("You have been muted by a moderator");
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

    if (this.currentStage && this.signaling) {
      this.signaling.notifyMuteChange(
        this.currentStage.id,
        this.config.userId,
        muted,
      );
    }

    this.emit("local-mute-change", { isMuted: muted });
  }

  // ===========================================================================
  // Recording
  // ===========================================================================

  async startRecording(): Promise<void> {
    if (!this.isModerator || !this.currentStage) {
      throw new Error("Not authorized to start recording");
    }

    if (!this.currentStage.isRecordingEnabled) {
      throw new Error("Recording is not enabled for this stage");
    }

    this.currentStage.isRecording = true;

    this.addModerationLog("start_recording");

    this.emit("recording-started");
    this.config.onRecordingStatusChange?.(true);
  }

  async stopRecording(): Promise<void> {
    if (!this.isModerator || !this.currentStage) {
      throw new Error("Not authorized to stop recording");
    }

    this.currentStage.isRecording = false;

    this.addModerationLog("stop_recording");

    this.emit("recording-stopped");
    this.config.onRecordingStatusChange?.(false);
  }

  // ===========================================================================
  // Getters for UI
  // ===========================================================================

  getSpeakers(): StageParticipant[] {
    return Array.from(this.participants.values())
      .filter((p) => p.role === "speaker" || p.role === "moderator")
      .sort((a, b) => {
        // Moderators first
        if (a.role === "moderator" && b.role !== "moderator") return -1;
        if (a.role !== "moderator" && b.role === "moderator") return 1;

        // Then by speaker position
        const posA = a.speakerPosition ?? Infinity;
        const posB = b.speakerPosition ?? Infinity;
        return posA - posB;
      });
  }

  getListeners(): StageParticipant[] {
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

  getParticipants(): StageParticipant[] {
    return Array.from(this.participants.values());
  }

  getParticipant(userId: string): StageParticipant | undefined {
    return this.participants.get(userId);
  }

  getModerationLog(): StageModerationLog[] {
    return [...this.moderationLog];
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private createSelfParticipant(role: StageRole): StageParticipant {
    return {
      id: `${this.currentStage?.id}-${this.config.userId}`,
      stageId: this.currentStage?.id ?? "",
      userId: this.config.userId,
      user: {
        id: this.config.userId,
        displayName: this.config.userName,
        avatarUrl: this.config.userAvatarUrl,
      } as UserBasicInfo,
      role,
      isMuted: role === "listener" ? true : this.isMuted,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connected",
      joinedAt: new Date(),
      hasRaisedHand: false,
      isServerMuted: false,
      isServerDeafened: false,
      becameSpeakerAt: role !== "listener" ? new Date() : undefined,
      speakerPosition: role !== "listener" ? 0 : undefined,
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
      if (!this.currentStage) return;

      for (const [participantId, analyser] of this.audioAnalyzers) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const participant = this.participants.get(participantId);

        if (participant) {
          participant.audioLevel = average;
          participant.isSpeaking = average > ACTIVE_SPEAKER_THRESHOLD;
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
    if (this.activeSpeakerId === participantId) return;

    if (this.speakerDebounceTimer) {
      clearTimeout(this.speakerDebounceTimer);
    }

    this.speakerDebounceTimer = setTimeout(() => {
      const previousSpeaker = this.activeSpeakerId;
      this.activeSpeakerId = participantId;
      this.config.onActiveSpeakerChange?.(participantId);
      this.emit("active-speaker-changed", { participantId, previousSpeaker });
    }, SPEAKER_DEBOUNCE_MS);
  }

  private handleParticipantJoined(payload: any): void {
    if (!this.currentStage) return;

    const participant: StageParticipant = {
      id: `${this.currentStage.id}-${payload.participant.id}`,
      stageId: this.currentStage.id,
      userId: payload.participant.id,
      user: {
        id: payload.participant.id,
        displayName: payload.participant.name,
        avatarUrl: payload.participant.avatarUrl,
      } as UserBasicInfo,
      role: "listener",
      isMuted: true,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connecting",
      joinedAt: new Date(),
      hasRaisedHand: false,
      isServerMuted: false,
      isServerDeafened: false,
    };

    this.participants.set(payload.participant.id, participant);

    // Update metrics
    this.metrics.totalUniqueListeners++;
    this.updatePeakCounts();

    this.config.onParticipantJoined?.(participant);
    this.emit("participant-joined", { participant });
  }

  private handleParticipantLeft(payload: any): void {
    if (!this.currentStage) return;

    const participant = this.participants.get(payload.participant.id);
    if (!participant) return;

    // Clear any raise hand requests
    this.clearRaiseHandRequest(payload.participant.id);

    // Cleanup
    this.peerConnections.get(payload.participant.id)?.close();
    this.peerConnections.delete(payload.participant.id);
    this.mediaStreams.delete(payload.participant.id);
    this.audioAnalyzers.delete(payload.participant.id);
    this.participants.delete(payload.participant.id);

    this.config.onParticipantLeft?.(participant, "left");
    this.emit("participant-left", { participant, reason: "left" });
  }

  private handleStageEnded(reason: CallEndReason): void {
    if (!this.currentStage) return;

    const previousStatus = this.currentStage.status;
    this.currentStage.status = "ended";
    this.currentStage.endedAt = new Date();

    this.emit("stage-ended", {
      stage: this.currentStage,
      reason,
      metrics: this.metrics,
    });
    this.config.onStageStatusChange?.(this.currentStage, previousStatus);

    this.cleanup();
  }

  private async handleOffer(payload: any): Promise<void> {
    const pc = this.peerConnections.get(payload.fromUserId);
    if (!pc || !this.currentStage) return;

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
    logger.error("[StageChannel] Error:", error);
    this.config.onError?.(error);
    this.emit("error", error);
  }

  private getStageDuration(): number {
    if (!this.currentStage?.startedAt) return 0;
    const endTime = this.currentStage.endedAt || new Date();
    return Math.floor(
      (endTime.getTime() - this.currentStage.startedAt.getTime()) / 1000,
    );
  }

  private addModerationLog(
    action: StageModerationAction,
    targetUserId?: string,
    details?: Record<string, unknown>,
  ): void {
    const targetUser = targetUserId
      ? this.participants.get(targetUserId)?.user
      : undefined;

    const log: StageModerationLog = {
      id: generateCallId(),
      stageId: this.currentStage?.id ?? "",
      action,
      moderatorId: this.config.userId,
      moderator: {
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

  private createEmptyMetrics(): StageMetrics {
    return {
      stageId: "",
      listenerCount: 0,
      speakerCount: 0,
      peakListenerCount: 0,
      peakSpeakerCount: 0,
      totalUniqueListeners: 0,
      averageListeningDuration: 0,
      totalRaiseHandRequests: 0,
      acceptedRaiseHandRequests: 0,
      declinedRaiseHandRequests: 0,
      duration: 0,
      reactionCounts: {},
      chatMessageCount: 0,
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
    if (!this.currentStage?.startedAt) return;

    this.metrics.stageId = this.currentStage.id;
    this.metrics.duration = this.getStageDuration();
    this.metrics.listenerCount = this.stageListenerCount;
    this.metrics.speakerCount = this.speakerCount;
  }

  private updatePeakCounts(): void {
    if (this.stageListenerCount > this.metrics.peakListenerCount) {
      this.metrics.peakListenerCount = this.stageListenerCount;
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
      const timeout = this.currentStage?.settings.raiseHandTimeout;
      if (!timeout) return;

      const now = new Date();
      for (const request of this.raiseHandRequests.values()) {
        if (request.status !== "pending") continue;

        const elapsed = (now.getTime() - request.requestedAt.getTime()) / 1000;
        if (elapsed >= timeout) {
          // Auto-decline due to timeout
          this.declineRaiseHand(request.id, "Request timed out");
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

    // Clear collections
    this.mediaStreams.clear();
    this.audioAnalyzers.clear();
    this.participants.clear();
    this.raiseHandRequests.clear();
    this.raiseHandQueue = [];

    // Reset state
    this.isMuted = true;
    this.myRole = "listener";
    this.hasRaisedHand = false;
    this.myRaiseHandRequestId = null;
    this.reconnectAttempts = 0;
    this.activeSpeakerId = null;
    this.currentStage = null;
    this.moderationLog = [];

    // Reset metrics
    this.metrics = this.createEmptyMetrics();
  }

  destroy(): void {
    this.cleanup();

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

export function createStageChannelService(
  config: StageServiceOptions,
): StageChannelService {
  return new StageChannelService(config);
}

// =============================================================================
// Stage Event Service
// =============================================================================

export class StageEventService {
  private events: Map<string, StageEvent> = new Map();
  private interests: Map<string, StageEventInterest[]> = new Map();

  async createEvent(
    input: CreateStageEventInput,
    host: UserBasicInfo,
  ): Promise<StageEvent> {
    const eventId = generateCallId();
    const now = new Date();

    const event: StageEvent = {
      id: eventId,
      stageId: input.stageId,
      name: input.name,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      hostId: host.id,
      host,
      coHostIds: input.coHostIds ?? [],
      invitedSpeakerIds: input.invitedSpeakerIds ?? [],
      status: "scheduled",
      sendReminders: input.sendReminders ?? true,
      reminderMinutesBefore: input.reminderMinutesBefore ?? [15, 60],
      isRecurring: input.isRecurring ?? false,
      recurrencePattern: input.recurrencePattern,
      interestedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.events.set(eventId, event);
    return event;
  }

  async updateEvent(
    eventId: string,
    input: UpdateStageEventInput,
  ): Promise<StageEvent> {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    Object.assign(event, {
      ...input,
      updatedAt: new Date(),
    });

    return event;
  }

  async cancelEvent(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    event.status = "cancelled";
    event.updatedAt = new Date();
  }

  async expressInterest(
    eventId: string,
    user: UserBasicInfo,
  ): Promise<StageEventInterest> {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const interests = this.interests.get(eventId) ?? [];
    const existing = interests.find((i) => i.userId === user.id);
    if (existing) {
      return existing;
    }

    const interest: StageEventInterest = {
      id: generateCallId(),
      eventId,
      userId: user.id,
      user,
      reminderEnabled: true,
      createdAt: new Date(),
    };

    interests.push(interest);
    this.interests.set(eventId, interests);
    event.interestedCount++;

    return interest;
  }

  async removeInterest(eventId: string, userId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const interests = this.interests.get(eventId) ?? [];
    const index = interests.findIndex((i) => i.userId === userId);
    if (index !== -1) {
      interests.splice(index, 1);
      this.interests.set(eventId, interests);
      event.interestedCount--;
    }
  }

  getEvent(eventId: string): StageEvent | undefined {
    return this.events.get(eventId);
  }

  getEventsForStage(stageId: string): StageEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.stageId === stageId)
      .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
  }

  getUpcomingEvents(limit: number = 10): StageEvent[] {
    const now = new Date();
    return Array.from(this.events.values())
      .filter((e) => e.status === "scheduled" && e.scheduledStart > now)
      .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())
      .slice(0, limit);
  }

  getInterestedUsers(eventId: string): StageEventInterest[] {
    return this.interests.get(eventId) ?? [];
  }
}

export function createStageEventService(): StageEventService {
  return new StageEventService();
}

// =============================================================================
// Re-export types
// =============================================================================

export type {
  StageChannel,
  StageParticipant,
  StageRole,
  StageStatus,
  StageSettings,
  RaiseHandRequest,
  HandRaiseStatus,
  StageEvent,
  StageEventStatus,
  StageMetrics,
  StageModerationAction,
  StageModerationLog,
  CreateStageChannelInput,
  UpdateStageChannelInput,
  CreateStageEventInput,
  UpdateStageEventInput,
  StageServiceCallbacks,
  StageConnectionState,
  StageEventInterest,
} from "@/types/stage";
