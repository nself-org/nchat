/**
 * Huddle Service
 *
 * Lightweight audio-first huddles for channels and DMs, inspired by Slack huddles.
 * Provides quick join, minimal UI overlay, and seamless chat integration.
 */

import { EventEmitter } from "events";
import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
  type CallEndReason,
} from "@/lib/webrtc/signaling";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type HuddleStatus =
  | "idle"
  | "starting"
  | "connecting"
  | "active"
  | "reconnecting"
  | "ending"
  | "ended";

export type HuddleType = "channel" | "dm";

export interface HuddleParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  connectionState: "connecting" | "connected" | "disconnected" | "reconnecting";
  joinedAt: Date;
}

export interface HuddleInfo {
  id: string;
  type: HuddleType;
  status: HuddleStatus;
  channelId: string;
  channelName?: string;
  isDM: boolean;
  initiatorId: string;
  participants: Map<string, HuddleParticipant>;
  startedAt: Date | null;
  endedAt: Date | null;
  endReason?: CallEndReason;
  messageThreadId?: string; // Optional thread for huddle messages
  screenSharerId?: string; // Current screen sharer
}

export interface HuddleConfig {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  autoJoinOnInvite?: boolean;
  muteOnJoin?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export interface HuddleReaction {
  emoji: string;
  participantId: string;
  participantName: string;
  timestamp: Date;
}

export interface HuddleServiceConfig extends HuddleConfig {
  onStatusChange?: (status: HuddleStatus, previousStatus: HuddleStatus) => void;
  onParticipantJoined?: (participant: HuddleParticipant) => void;
  onParticipantLeft?: (participant: HuddleParticipant, reason: string) => void;
  onActiveSpeakerChange?: (participantId: string | null) => void;
  onParticipantMediaChange?: (
    participantId: string,
    state: { isMuted: boolean; isVideoEnabled: boolean },
  ) => void;
  onScreenShareStarted?: (participantId: string) => void;
  onScreenShareStopped?: (participantId: string) => void;
  onReaction?: (reaction: HuddleReaction) => void;
  onInviteReceived?: (
    huddleId: string,
    channelId: string,
    inviterId: string,
  ) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const ACTIVE_SPEAKER_THRESHOLD = 0.02;
const SPEAKER_DEBOUNCE_MS = 500;
const REACTION_DISPLAY_DURATION_MS = 3000;

// =============================================================================
// Huddle Service
// =============================================================================

export class HuddleService extends EventEmitter {
  private config: HuddleServiceConfig;
  private signaling: SignalingManager | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();

  // Huddle state
  private currentHuddle: HuddleInfo | null = null;
  private localStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;

  // Local control state
  private isMuted: boolean = false;
  private isVideoEnabled: boolean = false;
  private isScreenSharing: boolean = false;

  // Reconnection state
  private reconnectAttempts: number = 0;
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Active speaker tracking
  private audioContext: AudioContext | null = null;
  private audioAnalyzers: Map<string, AnalyserNode> = new Map();
  private activeSpeakerId: string | null = null;
  private speakerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private audioLevelInterval: ReturnType<typeof setInterval> | null = null;

  // Reactions
  private recentReactions: HuddleReaction[] = [];
  private reactionCleanupTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Duration tracking
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private huddleDuration: number = 0;

  constructor(config: HuddleServiceConfig) {
    super();
    this.config = {
      maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelayMs: DEFAULT_RECONNECT_DELAY_MS,
      autoJoinOnInvite: false,
      muteOnJoin: false,
      ...config,
    };
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get huddleInfo(): HuddleInfo | null {
    return this.currentHuddle;
  }

  get isInHuddle(): boolean {
    return (
      this.currentHuddle !== null &&
      !["idle", "ended"].includes(this.currentHuddle.status)
    );
  }

  get isActive(): boolean {
    return this.currentHuddle?.status === "active";
  }

  get isInitiator(): boolean {
    return this.currentHuddle?.initiatorId === this.config.userId;
  }

  get participantCount(): number {
    return this.currentHuddle?.participants.size ?? 0;
  }

  get duration(): number {
    return this.huddleDuration;
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get audioMuted(): boolean {
    return this.isMuted;
  }

  get videoEnabled(): boolean {
    return this.isVideoEnabled;
  }

  get screenSharing(): boolean {
    return this.isScreenSharing;
  }

  get activeSpeaker(): string | null {
    return this.activeSpeakerId;
  }

  get reactions(): HuddleReaction[] {
    return [...this.recentReactions];
  }

  get currentChannelId(): string | null {
    return this.currentHuddle?.channelId ?? null;
  }

  get participants(): HuddleParticipant[] {
    return Array.from(this.currentHuddle?.participants.values() ?? []);
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    this.initializeSignaling();
    this.initializeAudioContext();
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
        if (this.currentHuddle?.id === payload.callId) {
          this.handleHuddleEnded(payload.reason as CallEndReason);
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
        this.handleRemoteMediaChange(payload.userId, {
          isMuted: !payload.enabled,
        });
      },
      onVideoChanged: (payload) => {
        this.handleRemoteMediaChange(payload.userId, {
          isVideoEnabled: payload.enabled,
        });
      },
      onScreenShareStarted: (payload) => {
        this.handleRemoteScreenShareStart(payload.userId);
      },
      onScreenShareStopped: (payload) => {
        this.handleRemoteScreenShareStop(payload.userId);
      },
      onError: (payload) => {
        this.handleError(new Error(payload.message));
      },
    });
    this.signaling.connect();
  }

  private initializeAudioContext(): void {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      this.audioContext = new AudioContext();
    }
  }

  // ===========================================================================
  // Huddle Lifecycle
  // ===========================================================================

  /**
   * Start a huddle in a channel or DM
   */
  async startHuddle(
    channelId: string,
    options: {
      channelName?: string;
      isDM?: boolean;
      messageThreadId?: string;
    } = {},
  ): Promise<string> {
    if (this.isInHuddle) {
      throw new Error("Already in a huddle. Leave the current huddle first.");
    }

    const huddleId = generateCallId();
    const type: HuddleType = options.isDM ? "dm" : "channel";

    // Create huddle info
    this.currentHuddle = {
      id: huddleId,
      type,
      status: "starting",
      channelId,
      channelName: options.channelName,
      isDM: options.isDM ?? false,
      initiatorId: this.config.userId,
      participants: new Map(),
      startedAt: new Date(),
      endedAt: null,
      messageThreadId: options.messageThreadId,
    };

    // Add self as first participant
    const selfParticipant: HuddleParticipant = {
      id: this.config.userId,
      name: this.config.userName,
      avatarUrl: this.config.userAvatarUrl,
      isMuted: this.config.muteOnJoin ?? false,
      isVideoEnabled: false, // Audio-first
      isScreenSharing: false,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connecting",
      joinedAt: new Date(),
    };
    this.currentHuddle.participants.set(this.config.userId, selfParticipant);

    try {
      // Get local audio
      await this.startLocalMedia();

      // Update status
      this.setHuddleStatus("active");

      // Update self participant state
      selfParticipant.connectionState = "connected";
      this.currentHuddle.participants.set(this.config.userId, selfParticipant);

      // Start duration tracking
      this.startDurationTracking();

      // Notify signaling server
      this.signaling?.initiateCall({
        callId: huddleId,
        targetUserId: "", // Broadcast to channel
        callType: "voice",
        channelId,
        metadata: {
          isHuddle: true,
          channelName: options.channelName,
          isDM: options.isDM,
        },
      });

      this.emit("huddle-started", { huddleId, channelId });
      logger.info("[Huddle] Started huddle", { huddleId, channelId });

      return huddleId;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Quick join an existing huddle
   */
  async joinHuddle(
    huddleId: string,
    channelId: string,
    options: {
      channelName?: string;
      isDM?: boolean;
    } = {},
  ): Promise<void> {
    if (this.isInHuddle) {
      throw new Error("Already in a huddle. Leave the current huddle first.");
    }

    const type: HuddleType = options.isDM ? "dm" : "channel";

    // Create huddle info for joining
    this.currentHuddle = {
      id: huddleId,
      type,
      status: "connecting",
      channelId,
      channelName: options.channelName,
      isDM: options.isDM ?? false,
      initiatorId: "", // Will be set from huddle info
      participants: new Map(),
      startedAt: new Date(),
      endedAt: null,
    };

    // Add self as participant
    const selfParticipant: HuddleParticipant = {
      id: this.config.userId,
      name: this.config.userName,
      avatarUrl: this.config.userAvatarUrl,
      isMuted: this.config.muteOnJoin ?? false,
      isVideoEnabled: false,
      isScreenSharing: false,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connecting",
      joinedAt: new Date(),
    };
    this.currentHuddle.participants.set(this.config.userId, selfParticipant);

    try {
      // Get local audio
      await this.startLocalMedia();

      // Signal that we're joining
      this.signaling?.acceptCall(huddleId, this.config.userId);

      // Update status
      this.setHuddleStatus("active");
      selfParticipant.connectionState = "connected";

      // Start duration tracking
      this.startDurationTracking();

      this.emit("huddle-joined", { huddleId, channelId });
      logger.info("[Huddle] Joined huddle", { huddleId, channelId });
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Leave the current huddle quietly
   */
  leaveHuddle(quiet: boolean = false): void {
    if (!this.currentHuddle) return;

    const huddleId = this.currentHuddle.id;
    const channelId = this.currentHuddle.channelId;
    const duration = this.huddleDuration;

    this.signaling?.endCall(
      this.currentHuddle.id,
      this.config.userId,
      "completed",
      duration,
    );

    // If we're the last participant or the initiator, end the huddle for everyone
    if (this.participantCount <= 1 || (this.isInitiator && !quiet)) {
      this.handleHuddleEnded("completed");
    } else {
      // Just leave, huddle continues
      this.emit("participant-left-self", { huddleId, channelId, quiet });
      this.cleanup();
    }

    logger.info("[Huddle] Left huddle", { huddleId, quiet });
  }

  /**
   * End huddle for all participants (initiator only)
   */
  endHuddleForAll(): void {
    if (!this.currentHuddle) return;
    if (!this.isInitiator) {
      throw new Error("Only the huddle initiator can end it for everyone");
    }

    this.signaling?.endCall(
      this.currentHuddle.id,
      this.config.userId,
      "completed",
      this.huddleDuration,
    );

    this.emit("huddle-ended-by-initiator");
    this.handleHuddleEnded("completed");
  }

  /**
   * Invite someone to the huddle
   */
  inviteToHuddle(userId: string): void {
    if (!this.currentHuddle) {
      throw new Error("Not in a huddle");
    }

    // Send invitation through signaling
    this.emit("invite-sent", {
      huddleId: this.currentHuddle.id,
      channelId: this.currentHuddle.channelId,
      inviteeId: userId,
    });

    logger.info("[Huddle] Sent invite", { inviteeId: userId });
  }

  // ===========================================================================
  // Media Controls
  // ===========================================================================

  toggleMute(): void {
    this.setMuted(!this.isMuted);
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    // Update participant state
    const myParticipant = this.currentHuddle?.participants.get(
      this.config.userId,
    );
    if (myParticipant) {
      myParticipant.isMuted = muted;
    }

    // Notify
    if (this.currentHuddle && this.signaling) {
      this.signaling.notifyMuteChange(
        this.currentHuddle.id,
        this.config.userId,
        muted,
      );
    }

    this.emit("local-mute-change", { isMuted: muted });
  }

  toggleVideo(): void {
    this.setVideoEnabled(!this.isVideoEnabled);
  }

  async setVideoEnabled(enabled: boolean): Promise<void> {
    // If enabling video and we don't have video tracks
    if (
      enabled &&
      this.localStream &&
      this.localStream.getVideoTracks().length === 0
    ) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoStream.getVideoTracks().forEach((track) => {
          this.localStream?.addTrack(track);
        });
      } catch (error) {
        this.handleError(error as Error);
        return;
      }
    }

    this.isVideoEnabled = enabled;

    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }

    // Update participant state
    const myParticipant = this.currentHuddle?.participants.get(
      this.config.userId,
    );
    if (myParticipant) {
      myParticipant.isVideoEnabled = enabled;
    }

    // Notify
    if (this.currentHuddle && this.signaling) {
      this.signaling.notifyVideoChange(
        this.currentHuddle.id,
        this.config.userId,
        enabled,
      );
    }

    this.emit("local-video-change", { isVideoEnabled: enabled });
  }

  async startScreenShare(): Promise<void> {
    if (!this.currentHuddle) return;

    // Check if someone else is sharing
    if (
      this.currentHuddle.screenSharerId &&
      this.currentHuddle.screenSharerId !== this.config.userId
    ) {
      throw new Error("Someone else is already sharing their screen");
    }

    try {
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      this.isScreenSharing = true;
      this.currentHuddle.screenSharerId = this.config.userId;

      const myParticipant = this.currentHuddle.participants.get(
        this.config.userId,
      );
      if (myParticipant) {
        myParticipant.isScreenSharing = true;
      }

      // Handle screen share stop
      this.screenShareStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      this.signaling?.notifyScreenShareStarted(
        this.currentHuddle.id,
        this.config.userId,
      );
      this.emit("screen-share-started", { participantId: this.config.userId });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  stopScreenShare(): void {
    if (!this.isScreenSharing || !this.currentHuddle) return;

    this.screenShareStream?.getTracks().forEach((track) => track.stop());
    this.screenShareStream = null;

    this.isScreenSharing = false;
    this.currentHuddle.screenSharerId = undefined;

    const myParticipant = this.currentHuddle.participants.get(
      this.config.userId,
    );
    if (myParticipant) {
      myParticipant.isScreenSharing = false;
    }

    this.signaling?.notifyScreenShareStopped(
      this.currentHuddle.id,
      this.config.userId,
    );
    this.emit("screen-share-stopped", { participantId: this.config.userId });
  }

  toggleScreenShare(): Promise<void> | void {
    if (this.isScreenSharing) {
      return this.stopScreenShare();
    } else {
      return this.startScreenShare();
    }
  }

  // ===========================================================================
  // Reactions
  // ===========================================================================

  sendReaction(emoji: string): void {
    if (!this.currentHuddle) return;

    const reaction: HuddleReaction = {
      emoji,
      participantId: this.config.userId,
      participantName: this.config.userName,
      timestamp: new Date(),
    };

    this.addReaction(reaction);

    // Broadcast to other participants
    this.emit("reaction-sent", reaction);
  }

  private addReaction(reaction: HuddleReaction): void {
    this.recentReactions.push(reaction);
    this.config.onReaction?.(reaction);
    this.emit("reaction", reaction);

    // Clean up reaction after display duration
    const reactionId = `${reaction.participantId}-${reaction.timestamp.getTime()}`;
    const timer = setTimeout(() => {
      this.recentReactions = this.recentReactions.filter(
        (r) =>
          r.participantId !== reaction.participantId ||
          r.timestamp !== reaction.timestamp,
      );
      this.reactionCleanupTimers.delete(reactionId);
    }, REACTION_DISPLAY_DURATION_MS);

    this.reactionCleanupTimers.set(reactionId, timer);
  }

  // ===========================================================================
  // Message Thread
  // ===========================================================================

  /**
   * Get or create a message thread for this huddle
   */
  getMessageThreadId(): string | null {
    return this.currentHuddle?.messageThreadId ?? null;
  }

  setMessageThreadId(threadId: string): void {
    if (this.currentHuddle) {
      this.currentHuddle.messageThreadId = threadId;
      this.emit("message-thread-created", { threadId });
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async startLocalMedia(): Promise<void> {
    try {
      // Audio-first approach
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Apply initial mute settings
      if (this.config.muteOnJoin) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        this.isMuted = true;
      }

      // Set up audio analysis
      this.setupLocalAudioAnalysis();

      this.emit("local-stream-ready", { stream: this.localStream });
    } catch (error) {
      throw new Error(`Failed to get audio: ${(error as Error).message}`);
    }
  }

  private setupLocalAudioAnalysis(): void {
    if (!this.audioContext || !this.localStream) return;

    const source = this.audioContext.createMediaStreamSource(this.localStream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    this.audioAnalyzers.set(this.config.userId, analyser);
    this.startAudioLevelMonitoring();
  }

  private startAudioLevelMonitoring(): void {
    if (this.audioLevelInterval) return;

    this.audioLevelInterval = setInterval(() => {
      if (!this.currentHuddle) return;

      for (const [participantId, analyser] of this.audioAnalyzers) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const participant = this.currentHuddle.participants.get(participantId);

        if (participant) {
          participant.audioLevel = average;
          participant.isSpeaking =
            average > ACTIVE_SPEAKER_THRESHOLD && !participant.isMuted;
        }

        // Update active speaker
        if (average > ACTIVE_SPEAKER_THRESHOLD) {
          this.updateActiveSpeaker(participantId);
        }
      }

      this.emit("audio-levels-updated");
    }, 100);
  }

  private updateActiveSpeaker(participantId: string): void {
    if (this.activeSpeakerId === participantId) return;

    const participant = this.currentHuddle?.participants.get(participantId);
    if (participant?.isMuted) return;

    // Debounce speaker changes
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

  private async createPeerConnection(
    participantId: string,
  ): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.mediaStreams.set(participantId, event.streams[0]);

        const participant = this.currentHuddle?.participants.get(participantId);
        if (participant) {
          // Set up audio analysis for remote participant
          this.setupRemoteAudioAnalysis(participantId, event.streams[0]);
        }

        this.emit("remote-stream", { participantId, stream: event.streams[0] });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentHuddle && this.signaling) {
        this.signaling.sendIceCandidate({
          callId: this.currentHuddle.id,
          fromUserId: this.config.userId,
          toUserId: participantId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      this.handlePeerConnectionStateChange(participantId, pc.connectionState);
    };

    this.peerConnections.set(participantId, pc);
    return pc;
  }

  private setupRemoteAudioAnalysis(
    participantId: string,
    stream: MediaStream,
  ): void {
    if (!this.audioContext) return;

    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    this.audioAnalyzers.set(participantId, analyser);
  }

  private handlePeerConnectionStateChange(
    participantId: string,
    state: RTCPeerConnectionState,
  ): void {
    const participant = this.currentHuddle?.participants.get(participantId);
    if (!participant) return;

    switch (state) {
      case "connected":
        participant.connectionState = "connected";
        this.emit("participant-connected", { participantId });
        break;
      case "disconnected":
        participant.connectionState = "disconnected";
        this.emit("participant-disconnected", { participantId });
        this.attemptReconnect(participantId);
        break;
      case "failed":
        participant.connectionState = "disconnected";
        this.handleParticipantConnectionFailed(participantId);
        break;
    }
  }

  private async attemptReconnect(participantId: string): Promise<void> {
    const maxAttempts =
      this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;

    if (this.reconnectAttempts >= maxAttempts) {
      this.handleParticipantConnectionFailed(participantId);
      return;
    }

    this.reconnectAttempts++;

    const participant = this.currentHuddle?.participants.get(participantId);
    if (participant) {
      participant.connectionState = "reconnecting";
    }

    this.config.onReconnecting?.(this.reconnectAttempts, maxAttempts);
    this.emit("reconnecting", {
      participantId,
      attempt: this.reconnectAttempts,
      maxAttempts,
    });

    const timer = setTimeout(async () => {
      const pc = this.peerConnections.get(participantId);
      if (pc && pc.connectionState === "disconnected") {
        // ICE restart
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);

        if (this.currentHuddle && this.signaling) {
          this.signaling.sendOffer({
            callId: this.currentHuddle.id,
            fromUserId: this.config.userId,
            toUserId: participantId,
            sdp: offer,
          });
        }
      }
    }, this.config.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS);

    this.reconnectTimers.set(participantId, timer);
  }

  private handleParticipantConnectionFailed(participantId: string): void {
    const participant = this.currentHuddle?.participants.get(participantId);
    if (!participant) return;

    // Remove participant
    this.currentHuddle?.participants.delete(participantId);
    this.peerConnections.get(participantId)?.close();
    this.peerConnections.delete(participantId);
    this.mediaStreams.delete(participantId);
    this.audioAnalyzers.delete(participantId);

    this.config.onParticipantLeft?.(participant, "connection_failed");
    this.emit("participant-left", { participant, reason: "connection_failed" });
  }

  private setHuddleStatus(status: HuddleStatus): void {
    if (!this.currentHuddle) return;

    const previousStatus = this.currentHuddle.status;
    this.currentHuddle.status = status;

    this.config.onStatusChange?.(status, previousStatus);
    this.emit("status-change", { status, previousStatus });
  }

  private startDurationTracking(): void {
    this.stopDurationTracking();
    this.huddleDuration = 0;
    this.durationInterval = setInterval(() => {
      this.huddleDuration++;
      this.emit("duration-update", { duration: this.huddleDuration });
    }, 1000);
  }

  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private handleParticipantJoined(payload: any): void {
    if (!this.currentHuddle) return;

    const participant: HuddleParticipant = {
      id: payload.participant.id,
      name: payload.participant.name,
      avatarUrl: payload.participant.avatarUrl,
      isMuted: payload.participant.isMuted ?? true,
      isVideoEnabled: payload.participant.isVideoEnabled ?? false,
      isScreenSharing: false,
      isSpeaking: false,
      audioLevel: 0,
      connectionState: "connecting",
      joinedAt: new Date(payload.participant.joinedAt),
    };

    this.currentHuddle.participants.set(participant.id, participant);
    this.createPeerConnection(participant.id);

    this.config.onParticipantJoined?.(participant);
    this.emit("participant-joined", { participant });
  }

  private handleParticipantLeft(payload: any): void {
    if (!this.currentHuddle) return;

    const participant = this.currentHuddle.participants.get(
      payload.participant.id,
    );
    if (!participant) return;

    // Cleanup
    this.currentHuddle.participants.delete(payload.participant.id);
    this.peerConnections.get(payload.participant.id)?.close();
    this.peerConnections.delete(payload.participant.id);
    this.mediaStreams.delete(payload.participant.id);
    this.audioAnalyzers.delete(payload.participant.id);

    // Clear timers
    const timer = this.reconnectTimers.get(payload.participant.id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(payload.participant.id);
    }

    // If screen sharer left, clear screen share
    if (this.currentHuddle.screenSharerId === payload.participant.id) {
      this.currentHuddle.screenSharerId = undefined;
      this.emit("screen-share-stopped", {
        participantId: payload.participant.id,
      });
    }

    this.config.onParticipantLeft?.(participant, "left");
    this.emit("participant-left", { participant, reason: "left" });

    // If last participant, end huddle
    if (this.participantCount <= 1) {
      this.handleHuddleEnded("completed");
    }
  }

  private handleHuddleEnded(reason: CallEndReason): void {
    if (!this.currentHuddle) return;

    this.currentHuddle.endReason = reason;
    this.currentHuddle.endedAt = new Date();
    this.setHuddleStatus("ended");

    this.emit("huddle-ended", { huddleInfo: this.currentHuddle, reason });

    this.cleanup();
  }

  private async handleOffer(payload: any): Promise<void> {
    const pc = this.peerConnections.get(payload.fromUserId);
    if (!pc || !this.currentHuddle) return;

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

  private handleRemoteMediaChange(
    participantId: string,
    state: { isMuted?: boolean; isVideoEnabled?: boolean },
  ): void {
    const participant = this.currentHuddle?.participants.get(participantId);
    if (!participant) return;

    if (state.isMuted !== undefined) {
      participant.isMuted = state.isMuted;
    }
    if (state.isVideoEnabled !== undefined) {
      participant.isVideoEnabled = state.isVideoEnabled;
    }

    this.config.onParticipantMediaChange?.(participantId, {
      isMuted: participant.isMuted,
      isVideoEnabled: participant.isVideoEnabled,
    });
    this.emit("participant-media-change", {
      participantId,
      state: participant,
    });
  }

  private handleRemoteScreenShareStart(participantId: string): void {
    if (!this.currentHuddle) return;

    this.currentHuddle.screenSharerId = participantId;

    const participant = this.currentHuddle.participants.get(participantId);
    if (participant) {
      participant.isScreenSharing = true;
    }

    this.config.onScreenShareStarted?.(participantId);
    this.emit("remote-screen-share-started", { participantId });
  }

  private handleRemoteScreenShareStop(participantId: string): void {
    if (!this.currentHuddle) return;

    if (this.currentHuddle.screenSharerId === participantId) {
      this.currentHuddle.screenSharerId = undefined;
    }

    const participant = this.currentHuddle.participants.get(participantId);
    if (participant) {
      participant.isScreenSharing = false;
    }

    this.config.onScreenShareStopped?.(participantId);
    this.emit("remote-screen-share-stopped", { participantId });
  }

  private handleError(error: Error): void {
    logger.error("[Huddle] Error:", error);
    this.config.onError?.(error);
    this.emit("error", error);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanup(): void {
    // Stop duration tracking
    this.stopDurationTracking();

    // Stop audio monitoring
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }

    // Clear reconnect timers
    this.reconnectTimers.forEach((timer) => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Clear speaker debounce
    if (this.speakerDebounceTimer) {
      clearTimeout(this.speakerDebounceTimer);
      this.speakerDebounceTimer = null;
    }

    // Clear reaction timers
    this.reactionCleanupTimers.forEach((timer) => clearTimeout(timer));
    this.reactionCleanupTimers.clear();
    this.recentReactions = [];

    // Close peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Stop local streams
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    this.screenShareStream?.getTracks().forEach((track) => track.stop());
    this.screenShareStream = null;

    // Clear media streams
    this.mediaStreams.clear();

    // Clear audio analyzers
    this.audioAnalyzers.clear();

    // Reset state
    this.isMuted = false;
    this.isVideoEnabled = false;
    this.isScreenSharing = false;
    this.reconnectAttempts = 0;
    this.activeSpeakerId = null;
    this.huddleDuration = 0;
    this.currentHuddle = null;
  }

  destroy(): void {
    this.cleanup();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
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

export function createHuddleService(
  config: HuddleServiceConfig,
): HuddleService {
  return new HuddleService(config);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function formatHuddleDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function getHuddleStatusLabel(status: HuddleStatus): string {
  const labels: Record<HuddleStatus, string> = {
    idle: "Not in huddle",
    starting: "Starting huddle...",
    connecting: "Connecting...",
    active: "In huddle",
    reconnecting: "Reconnecting...",
    ending: "Ending huddle...",
    ended: "Huddle ended",
  };
  return labels[status];
}
