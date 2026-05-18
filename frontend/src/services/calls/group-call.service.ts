/**
 * Group Call Service
 *
 * Complete service for managing multi-participant voice and video calls.
 * Handles participant management, host controls, role assignments, lobby,
 * layout options, and large room optimizations.
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

export type GroupCallType = "voice" | "video";

export type GroupCallStatus =
  | "idle"
  | "initiating"
  | "waiting" // In lobby
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ending"
  | "ended";

export type ParticipantRole = "host" | "co-host" | "participant" | "viewer";

export type LayoutType = "speaker" | "grid" | "spotlight" | "sidebar";

export type LobbyStatus = "waiting" | "admitted" | "denied";

export interface GroupCallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  role: ParticipantRole;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "reconnecting";
  joinedAt: Date;
  lobbyStatus: LobbyStatus;
  stream?: MediaStream;
  audioLevel: number;
  isPinned: boolean;
  isSpotlight: boolean;
}

export interface GroupCallConfig {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  maxParticipants?: number;
  enableLobby?: boolean;
  autoAdmitDomains?: string[];
  muteOnEntry?: boolean;
  videoOffOnEntry?: boolean;
  allowParticipantScreenShare?: boolean;
  allowParticipantUnmute?: boolean;
  recordCall?: boolean;
  enableBreakoutRooms?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export interface GroupCallInfo {
  id: string;
  type: GroupCallType;
  status: GroupCallStatus;
  channelId?: string;
  hostId: string;
  participants: Map<string, GroupCallParticipant>;
  lobbyParticipants: Map<string, GroupCallParticipant>;
  startedAt: Date | null;
  connectedAt: Date | null;
  endedAt: Date | null;
  endReason?: CallEndReason;
  isLocked: boolean;
  isRecording: boolean;
  layout: LayoutType;
  pinnedParticipantId: string | null;
  spotlightParticipantIds: string[];
  joinLink: string | null;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  title?: string;
  description?: string;
}

export interface GroupCallMetrics {
  duration: number;
  participantCount: number;
  peakParticipantCount: number;
  totalJoins: number;
  totalLeaves: number;
  averageCallQuality: number;
  networkIssues: number;
}

export interface GroupCallServiceConfig extends GroupCallConfig {
  onCallStateChange?: (
    status: GroupCallStatus,
    previousStatus: GroupCallStatus,
  ) => void;
  onParticipantJoined?: (participant: GroupCallParticipant) => void;
  onParticipantLeft?: (
    participant: GroupCallParticipant,
    reason: string,
  ) => void;
  onLobbyUpdate?: (lobbyParticipants: GroupCallParticipant[]) => void;
  onRoleChanged?: (
    participantId: string,
    newRole: ParticipantRole,
    oldRole: ParticipantRole,
  ) => void;
  onHostTransferred?: (newHostId: string) => void;
  onParticipantMediaChange?: (
    participantId: string,
    mediaState: { isMuted: boolean; isVideoEnabled: boolean },
  ) => void;
  onActiveSpeakerChange?: (participantId: string | null) => void;
  onLayoutChange?: (layout: LayoutType) => void;
  onRecordingStatusChange?: (isRecording: boolean) => void;
  onCallLockChange?: (isLocked: boolean) => void;
  onHandRaised?: (participantId: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_PARTICIPANTS = 100;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const ACTIVE_SPEAKER_THRESHOLD = 0.02; // Audio level threshold
const SPEAKER_DEBOUNCE_MS = 1000;
const LARGE_ROOM_THRESHOLD = 50;
const PARTICIPANT_PAGE_SIZE = 20;

// =============================================================================
// Group Call Service
// =============================================================================

export class GroupCallService extends EventEmitter {
  private config: GroupCallServiceConfig;
  private signaling: SignalingManager | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();

  // Call state
  private currentCall: GroupCallInfo | null = null;
  private localStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;

  // Local control state
  private isMuted: boolean = false;
  private isVideoEnabled: boolean = true;
  private isScreenSharing: boolean = false;
  private isHandRaised: boolean = false;

  // Reconnection state
  private reconnectAttempts: number = 0;
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Active speaker tracking
  private audioAnalyzer: AudioContext | null = null;
  private audioAnalyzers: Map<string, AnalyserNode> = new Map();
  private activeSpeakerId: string | null = null;
  private speakerDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Metrics
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private metrics: GroupCallMetrics = {
    duration: 0,
    participantCount: 0,
    peakParticipantCount: 0,
    totalJoins: 0,
    totalLeaves: 0,
    averageCallQuality: 100,
    networkIssues: 0,
  };

  // Pagination for large rooms
  private currentParticipantPage: number = 0;
  private visibleParticipantIds: Set<string> = new Set();

  constructor(config: GroupCallServiceConfig) {
    super();
    this.config = {
      maxParticipants: DEFAULT_MAX_PARTICIPANTS,
      maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelayMs: DEFAULT_RECONNECT_DELAY_MS,
      enableLobby: false,
      autoAdmitDomains: [],
      muteOnEntry: false,
      videoOffOnEntry: false,
      allowParticipantScreenShare: true,
      allowParticipantUnmute: true,
      recordCall: false,
      enableBreakoutRooms: false,
      ...config,
    };
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get callInfo(): GroupCallInfo | null {
    return this.currentCall;
  }

  get isInCall(): boolean {
    return (
      this.currentCall !== null &&
      !["idle", "ended"].includes(this.currentCall.status)
    );
  }

  get isConnected(): boolean {
    return this.currentCall?.status === "connected";
  }

  get isHost(): boolean {
    return this.currentCall?.hostId === this.config.userId;
  }

  get isCoHost(): boolean {
    const participant = this.currentCall?.participants.get(this.config.userId);
    return participant?.role === "co-host";
  }

  get canManageParticipants(): boolean {
    return this.isHost || this.isCoHost;
  }

  get participantCount(): number {
    return this.currentCall?.participants.size ?? 0;
  }

  get lobbyCount(): number {
    return this.currentCall?.lobbyParticipants.size ?? 0;
  }

  get callDuration(): number {
    if (!this.currentCall?.connectedAt) return 0;
    const endTime = this.currentCall.endedAt || new Date();
    return Math.floor(
      (endTime.getTime() - this.currentCall.connectedAt.getTime()) / 1000,
    );
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

  get handRaised(): boolean {
    return this.isHandRaised;
  }

  get callMetrics(): GroupCallMetrics {
    return { ...this.metrics };
  }

  get isLargeRoom(): boolean {
    return this.participantCount >= LARGE_ROOM_THRESHOLD;
  }

  get activeSpeaker(): string | null {
    return this.activeSpeakerId;
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
        if (this.currentCall?.id === payload.callId) {
          this.handleCallEnded(payload.reason as CallEndReason);
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

  private initializeAudioAnalyzer(): void {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      this.audioAnalyzer = new AudioContext();
    }
  }

  // ===========================================================================
  // Call Creation and Management
  // ===========================================================================

  async createGroupCall(
    type: GroupCallType,
    options: {
      channelId?: string;
      title?: string;
      description?: string;
      scheduledStartTime?: Date;
      scheduledEndTime?: Date;
      enableLobby?: boolean;
    } = {},
  ): Promise<string> {
    if (this.isInCall) {
      throw new Error("Already in a call");
    }

    const callId = generateCallId();
    const joinLink = this.generateJoinLink(callId);

    // Create call info
    this.currentCall = {
      id: callId,
      type,
      status: "initiating",
      channelId: options.channelId,
      hostId: this.config.userId,
      participants: new Map(),
      lobbyParticipants: new Map(),
      startedAt: new Date(),
      connectedAt: null,
      endedAt: null,
      isLocked: false,
      isRecording: false,
      layout: "grid",
      pinnedParticipantId: null,
      spotlightParticipantIds: [],
      joinLink,
      title: options.title,
      description: options.description,
      scheduledStartTime: options.scheduledStartTime,
      scheduledEndTime: options.scheduledEndTime,
    };

    // Add self as host
    const selfParticipant: GroupCallParticipant = {
      id: this.config.userId,
      name: this.config.userName,
      avatarUrl: this.config.userAvatarUrl,
      role: "host",
      isMuted: this.config.muteOnEntry || false,
      isVideoEnabled:
        !(this.config.videoOffOnEntry || false) && type === "video",
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: false,
      connectionState: "connecting",
      joinedAt: new Date(),
      lobbyStatus: "admitted",
      audioLevel: 0,
      isPinned: false,
      isSpotlight: false,
    };
    this.currentCall.participants.set(this.config.userId, selfParticipant);

    // If lobby is enabled, update config
    if (options.enableLobby !== undefined) {
      this.config.enableLobby = options.enableLobby;
    }

    try {
      // Get local media
      await this.startLocalMedia(type);

      // Update status
      this.setCallStatus("connected");
      this.currentCall.connectedAt = new Date();

      // Update self participant state
      selfParticipant.connectionState = "connected";
      this.currentCall.participants.set(this.config.userId, selfParticipant);

      // Start metrics collection
      this.startMetricsCollection();

      // Notify signaling server
      this.signaling?.initiateCall({
        callId,
        targetUserId: "", // Group call, no specific target
        callType: type,
        channelId: options.channelId,
        metadata: {
          isGroupCall: true,
          title: options.title,
          enableLobby: this.config.enableLobby,
        },
      });

      this.emit("call-created", { callId, joinLink });
      return callId;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async joinGroupCall(
    callId: string,
    type: GroupCallType,
    options: {
      channelId?: string;
      participantName?: string;
    } = {},
  ): Promise<void> {
    if (this.isInCall) {
      throw new Error("Already in a call");
    }

    // Create call info for joining
    this.currentCall = {
      id: callId,
      type,
      status: "connecting",
      channelId: options.channelId,
      hostId: "", // Will be set when we receive call info
      participants: new Map(),
      lobbyParticipants: new Map(),
      startedAt: new Date(),
      connectedAt: null,
      endedAt: null,
      isLocked: false,
      isRecording: false,
      layout: "grid",
      pinnedParticipantId: null,
      spotlightParticipantIds: [],
      joinLink: null,
    };

    // Add self as participant (waiting in lobby if enabled)
    const selfParticipant: GroupCallParticipant = {
      id: this.config.userId,
      name: options.participantName || this.config.userName,
      avatarUrl: this.config.userAvatarUrl,
      role: "participant",
      isMuted: this.config.muteOnEntry || false,
      isVideoEnabled:
        !(this.config.videoOffOnEntry || false) && type === "video",
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: false,
      connectionState: "connecting",
      joinedAt: new Date(),
      lobbyStatus: "waiting",
      audioLevel: 0,
      isPinned: false,
      isSpotlight: false,
    };

    if (this.config.enableLobby) {
      // Join lobby first
      this.currentCall.lobbyParticipants.set(
        this.config.userId,
        selfParticipant,
      );
      this.setCallStatus("waiting");
      this.emit("joined-lobby", { callId });
    } else {
      // Join directly
      selfParticipant.lobbyStatus = "admitted";
      this.currentCall.participants.set(this.config.userId, selfParticipant);
    }

    try {
      // Get local media
      await this.startLocalMedia(type);

      if (!this.config.enableLobby) {
        // Connect immediately
        await this.connectToCall();
      }
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private async connectToCall(): Promise<void> {
    if (!this.currentCall) return;

    this.setCallStatus("connecting");

    // Signal that we've joined
    this.signaling?.acceptCall(this.currentCall.id, this.config.userId);

    // Update status
    this.setCallStatus("connected");
    this.currentCall.connectedAt = new Date();

    // Update self participant
    const selfParticipant = this.currentCall.participants.get(
      this.config.userId,
    );
    if (selfParticipant) {
      selfParticipant.connectionState = "connected";
      selfParticipant.lobbyStatus = "admitted";
    }

    // Start metrics collection
    this.startMetricsCollection();

    this.emit("call-connected", this.currentCall);
  }

  leaveCall(): void {
    if (!this.currentCall) return;

    const duration = this.callDuration;

    this.signaling?.endCall(
      this.currentCall.id,
      this.config.userId,
      "completed",
      duration,
    );

    this.handleCallEnded("completed");
  }

  // ===========================================================================
  // Host Controls
  // ===========================================================================

  async muteAllParticipants(except: string[] = []): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage participants");
    }

    for (const [participantId, participant] of this.currentCall.participants) {
      if (
        participantId !== this.config.userId &&
        !except.includes(participantId)
      ) {
        participant.isMuted = true;
        this.signaling?.notifyMuteChange(
          this.currentCall.id,
          participantId,
          true,
        );
        this.emit("participant-muted", { participantId, byHost: true });
      }
    }

    this.emit("all-muted", { exceptIds: except });
  }

  async unmuteAllParticipants(): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage participants");
    }

    // Can only request unmute, participants must unmute themselves
    for (const [participantId] of this.currentCall.participants) {
      if (participantId !== this.config.userId) {
        this.emit("unmute-requested", { participantId });
      }
    }

    this.emit("all-unmute-requested");
  }

  async muteParticipant(participantId: string): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage participants");
    }

    const participant = this.currentCall.participants.get(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    participant.isMuted = true;
    this.signaling?.notifyMuteChange(this.currentCall.id, participantId, true);
    this.emit("participant-muted", { participantId, byHost: true });
  }

  async removeParticipant(
    participantId: string,
    reason: string = "removed",
  ): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage participants");
    }

    if (participantId === this.currentCall.hostId) {
      throw new Error("Cannot remove the host");
    }

    const participant = this.currentCall.participants.get(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Remove participant
    this.currentCall.participants.delete(participantId);
    this.peerConnections.get(participantId)?.close();
    this.peerConnections.delete(participantId);
    this.mediaStreams.delete(participantId);

    // Notify
    this.emit("participant-removed", { participant, reason });
    this.config.onParticipantLeft?.(participant, reason);

    // Update metrics
    this.metrics.totalLeaves++;
  }

  async lockRoom(): Promise<void> {
    if (!this.isHost || !this.currentCall) {
      throw new Error("Only host can lock the room");
    }

    this.currentCall.isLocked = true;
    this.config.onCallLockChange?.(true);
    this.emit("room-locked");
  }

  async unlockRoom(): Promise<void> {
    if (!this.isHost || !this.currentCall) {
      throw new Error("Only host can unlock the room");
    }

    this.currentCall.isLocked = false;
    this.config.onCallLockChange?.(false);
    this.emit("room-unlocked");
  }

  async endCallForEveryone(): Promise<void> {
    if (!this.isHost || !this.currentCall) {
      throw new Error("Only host can end call for everyone");
    }

    this.signaling?.endCall(
      this.currentCall.id,
      this.config.userId,
      "completed",
      this.callDuration,
    );

    // Notify all participants
    this.emit("call-ended-by-host");

    this.handleCallEnded("completed");
  }

  async transferHost(newHostId: string): Promise<void> {
    if (!this.isHost || !this.currentCall) {
      throw new Error("Only host can transfer host role");
    }

    const newHost = this.currentCall.participants.get(newHostId);
    if (!newHost) {
      throw new Error("Participant not found");
    }

    if (newHost.role === "viewer") {
      throw new Error("Cannot transfer host to a viewer");
    }

    // Update roles
    const currentHost = this.currentCall.participants.get(this.config.userId);
    if (currentHost) {
      currentHost.role = "co-host";
    }

    const oldRole = newHost.role;
    newHost.role = "host";
    this.currentCall.hostId = newHostId;

    this.config.onRoleChanged?.(newHostId, "host", oldRole);
    this.config.onHostTransferred?.(newHostId);
    this.emit("host-transferred", {
      newHostId,
      previousHostId: this.config.userId,
    });
  }

  // ===========================================================================
  // Role Controls
  // ===========================================================================

  async setParticipantRole(
    participantId: string,
    role: ParticipantRole,
  ): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage participants");
    }

    const participant = this.currentCall.participants.get(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (role === "host") {
      // Use transferHost instead
      throw new Error("Use transferHost to assign host role");
    }

    const oldRole = participant.role;
    participant.role = role;

    // Apply role-specific restrictions
    if (role === "viewer") {
      participant.isMuted = true;
      participant.isVideoEnabled = false;
      participant.isScreenSharing = false;
    }

    this.config.onRoleChanged?.(participantId, role, oldRole);
    this.emit("role-changed", { participantId, newRole: role, oldRole });
  }

  async promoteToCoHost(participantId: string): Promise<void> {
    await this.setParticipantRole(participantId, "co-host");
  }

  async demoteFromCoHost(participantId: string): Promise<void> {
    await this.setParticipantRole(participantId, "participant");
  }

  async makeViewer(participantId: string): Promise<void> {
    await this.setParticipantRole(participantId, "viewer");
  }

  getParticipantRole(participantId: string): ParticipantRole | null {
    return this.currentCall?.participants.get(participantId)?.role ?? null;
  }

  getRolePermissions(role: ParticipantRole): {
    canMute: boolean;
    canUnmute: boolean;
    canEnableVideo: boolean;
    canShareScreen: boolean;
    canManageParticipants: boolean;
    canManageRoles: boolean;
    canChangeLobby: boolean;
    canRecord: boolean;
  } {
    switch (role) {
      case "host":
        return {
          canMute: true,
          canUnmute: true,
          canEnableVideo: true,
          canShareScreen: true,
          canManageParticipants: true,
          canManageRoles: true,
          canChangeLobby: true,
          canRecord: true,
        };
      case "co-host":
        return {
          canMute: true,
          canUnmute: true,
          canEnableVideo: true,
          canShareScreen: true,
          canManageParticipants: true,
          canManageRoles: false,
          canChangeLobby: true,
          canRecord: false,
        };
      case "participant":
        return {
          canMute: true,
          canUnmute: this.config.allowParticipantUnmute || false,
          canEnableVideo: true,
          canShareScreen: this.config.allowParticipantScreenShare || false,
          canManageParticipants: false,
          canManageRoles: false,
          canChangeLobby: false,
          canRecord: false,
        };
      case "viewer":
        return {
          canMute: false,
          canUnmute: false,
          canEnableVideo: false,
          canShareScreen: false,
          canManageParticipants: false,
          canManageRoles: false,
          canChangeLobby: false,
          canRecord: false,
        };
    }
  }

  // ===========================================================================
  // Lobby Controls
  // ===========================================================================

  async admitFromLobby(participantId: string): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage lobby");
    }

    const lobbyParticipant =
      this.currentCall.lobbyParticipants.get(participantId);
    if (!lobbyParticipant) {
      throw new Error("Participant not in lobby");
    }

    // Move from lobby to participants
    lobbyParticipant.lobbyStatus = "admitted";
    this.currentCall.lobbyParticipants.delete(participantId);
    this.currentCall.participants.set(participantId, lobbyParticipant);

    // Connect peer
    await this.createPeerConnection(participantId);

    this.config.onLobbyUpdate?.(
      Array.from(this.currentCall.lobbyParticipants.values()),
    );
    this.config.onParticipantJoined?.(lobbyParticipant);
    this.emit("participant-admitted", { participant: lobbyParticipant });

    // Update metrics
    this.metrics.totalJoins++;
    this.updatePeakParticipantCount();
  }

  async admitAllFromLobby(): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage lobby");
    }

    const lobbyParticipantIds = Array.from(
      this.currentCall.lobbyParticipants.keys(),
    );
    for (const participantId of lobbyParticipantIds) {
      await this.admitFromLobby(participantId);
    }
  }

  async denyFromLobby(
    participantId: string,
    reason: string = "denied",
  ): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage lobby");
    }

    const lobbyParticipant =
      this.currentCall.lobbyParticipants.get(participantId);
    if (!lobbyParticipant) {
      throw new Error("Participant not in lobby");
    }

    lobbyParticipant.lobbyStatus = "denied";
    this.currentCall.lobbyParticipants.delete(participantId);

    this.config.onLobbyUpdate?.(
      Array.from(this.currentCall.lobbyParticipants.values()),
    );
    this.emit("participant-denied", { participant: lobbyParticipant, reason });
  }

  async denyAllFromLobby(reason: string = "denied"): Promise<void> {
    if (!this.canManageParticipants || !this.currentCall) {
      throw new Error("Not authorized to manage lobby");
    }

    const lobbyParticipantIds = Array.from(
      this.currentCall.lobbyParticipants.keys(),
    );
    for (const participantId of lobbyParticipantIds) {
      await this.denyFromLobby(participantId, reason);
    }
  }

  setAutoAdmit(enabled: boolean, domains?: string[]): void {
    if (!this.isHost) {
      throw new Error("Only host can change auto-admit settings");
    }

    this.config.enableLobby = !enabled;
    if (domains) {
      this.config.autoAdmitDomains = domains;
    }

    this.emit("auto-admit-changed", {
      enabled,
      domains: this.config.autoAdmitDomains,
    });
  }

  shouldAutoAdmit(participantEmail?: string): boolean {
    if (!this.config.enableLobby) return true;
    if (!this.config.autoAdmitDomains?.length) return false;
    if (!participantEmail) return false;

    const domain = participantEmail.split("@")[1];
    return this.config.autoAdmitDomains.includes(domain);
  }

  getLobbyParticipants(): GroupCallParticipant[] {
    return Array.from(this.currentCall?.lobbyParticipants.values() ?? []);
  }

  // ===========================================================================
  // Layout Controls
  // ===========================================================================

  setLayout(layout: LayoutType): void {
    if (!this.currentCall) return;

    this.currentCall.layout = layout;
    this.config.onLayoutChange?.(layout);
    this.emit("layout-changed", { layout });
  }

  pinParticipant(participantId: string): void {
    if (!this.currentCall) return;

    const participant = this.currentCall.participants.get(participantId);
    if (!participant) return;

    // Unpin previous
    if (this.currentCall.pinnedParticipantId) {
      const previousPinned = this.currentCall.participants.get(
        this.currentCall.pinnedParticipantId,
      );
      if (previousPinned) {
        previousPinned.isPinned = false;
      }
    }

    participant.isPinned = true;
    this.currentCall.pinnedParticipantId = participantId;
    this.emit("participant-pinned", { participantId });
  }

  unpinParticipant(): void {
    if (!this.currentCall || !this.currentCall.pinnedParticipantId) return;

    const participant = this.currentCall.participants.get(
      this.currentCall.pinnedParticipantId,
    );
    if (participant) {
      participant.isPinned = false;
    }

    this.currentCall.pinnedParticipantId = null;
    this.emit("participant-unpinned");
  }

  spotlightParticipant(participantId: string): void {
    if (!this.canManageParticipants || !this.currentCall) return;

    const participant = this.currentCall.participants.get(participantId);
    if (!participant) return;

    participant.isSpotlight = true;
    if (!this.currentCall.spotlightParticipantIds.includes(participantId)) {
      this.currentCall.spotlightParticipantIds.push(participantId);
    }

    this.emit("participant-spotlighted", { participantId });
  }

  removeSpotlight(participantId: string): void {
    if (!this.canManageParticipants || !this.currentCall) return;

    const participant = this.currentCall.participants.get(participantId);
    if (participant) {
      participant.isSpotlight = false;
    }

    this.currentCall.spotlightParticipantIds =
      this.currentCall.spotlightParticipantIds.filter(
        (id) => id !== participantId,
      );

    this.emit("spotlight-removed", { participantId });
  }

  hideNonVideoParticipants(hide: boolean): void {
    this.emit("non-video-hidden", { hidden: hide });
  }

  getLayoutParticipants(): GroupCallParticipant[] {
    if (!this.currentCall) return [];

    const participants = Array.from(this.currentCall.participants.values());

    switch (this.currentCall.layout) {
      case "speaker":
        // Active speaker first, then others sorted by recent activity
        return participants.sort((a, b) => {
          if (a.id === this.activeSpeakerId) return -1;
          if (b.id === this.activeSpeakerId) return 1;
          return b.audioLevel - a.audioLevel;
        });

      case "spotlight":
        // Spotlighted participants first
        return participants.sort((a, b) => {
          if (a.isSpotlight && !b.isSpotlight) return -1;
          if (!a.isSpotlight && b.isSpotlight) return 1;
          return 0;
        });

      case "sidebar":
        // Pinned first, then active speaker, then others
        return participants.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.id === this.activeSpeakerId) return -1;
          if (b.id === this.activeSpeakerId) return 1;
          return 0;
        });

      case "grid":
      default:
        // Grid view - sort by join time, pinned first
        return participants.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.joinedAt.getTime() - b.joinedAt.getTime();
        });
    }
  }

  // ===========================================================================
  // Large Room Support
  // ===========================================================================

  getParticipantPage(page: number = 0): GroupCallParticipant[] {
    if (!this.currentCall) return [];

    this.currentParticipantPage = page;
    const participants = this.getLayoutParticipants();
    const start = page * PARTICIPANT_PAGE_SIZE;
    const end = start + PARTICIPANT_PAGE_SIZE;

    const pageParticipants = participants.slice(start, end);

    // Track visible participants for optimization
    this.visibleParticipantIds = new Set(pageParticipants.map((p) => p.id));

    return pageParticipants;
  }

  getTotalPages(): number {
    if (!this.currentCall) return 0;
    return Math.ceil(
      this.currentCall.participants.size / PARTICIPANT_PAGE_SIZE,
    );
  }

  getCurrentPage(): number {
    return this.currentParticipantPage;
  }

  isParticipantVisible(participantId: string): boolean {
    return this.visibleParticipantIds.has(participantId);
  }

  optimizeForLargeRoom(): void {
    if (!this.isLargeRoom) return;

    // Reduce video quality for non-visible participants
    for (const [participantId, pc] of this.peerConnections) {
      if (!this.isParticipantVisible(participantId)) {
        this.reduceVideoQuality(pc);
      }
    }

    // Disable audio for distant participants (those not on current page)
    // Note: In production, this would use actual spatial audio

    logger.info("[GroupCall] Large room optimizations applied", {
      participantCount: this.participantCount,
      visibleCount: this.visibleParticipantIds.size,
    });
  }

  private reduceVideoQuality(pc: RTCPeerConnection): void {
    const senders = pc.getSenders();
    for (const sender of senders) {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 100000; // 100kbps
          params.encodings[0].scaleResolutionDownBy = 4;
          sender.setParameters(params).catch((err) => {
            logger.warn("[GroupCall] Failed to reduce video quality:", err);
          });
        }
      }
    }
  }

  // ===========================================================================
  // Media Controls
  // ===========================================================================

  toggleMute(): void {
    this.setMuted(!this.isMuted);
  }

  setMuted(muted: boolean): void {
    const myParticipant = this.currentCall?.participants.get(
      this.config.userId,
    );
    const role = myParticipant?.role;

    // Check permissions
    if (muted === false && role) {
      const permissions = this.getRolePermissions(role);
      if (!permissions.canUnmute) {
        this.handleError(new Error("You are not allowed to unmute"));
        return;
      }
    }

    this.isMuted = muted;

    // Mute local audio tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    // Update participant state
    if (myParticipant) {
      myParticipant.isMuted = muted;
    }

    // Notify
    if (this.currentCall && this.signaling) {
      this.signaling.notifyMuteChange(
        this.currentCall.id,
        this.config.userId,
        muted,
      );
    }

    this.emit("local-mute-change", { isMuted: muted });
  }

  toggleVideo(): void {
    this.setVideoEnabled(!this.isVideoEnabled);
  }

  setVideoEnabled(enabled: boolean): void {
    const myParticipant = this.currentCall?.participants.get(
      this.config.userId,
    );
    const role = myParticipant?.role;

    // Check permissions
    if (enabled && role) {
      const permissions = this.getRolePermissions(role);
      if (!permissions.canEnableVideo) {
        this.handleError(new Error("You are not allowed to enable video"));
        return;
      }
    }

    this.isVideoEnabled = enabled;

    // Enable/disable local video tracks
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }

    // Update participant state
    if (myParticipant) {
      myParticipant.isVideoEnabled = enabled;
    }

    // Notify
    if (this.currentCall && this.signaling) {
      this.signaling.notifyVideoChange(
        this.currentCall.id,
        this.config.userId,
        enabled,
      );
    }

    this.emit("local-video-change", { isVideoEnabled: enabled });
  }

  async startScreenShare(): Promise<void> {
    const myParticipant = this.currentCall?.participants.get(
      this.config.userId,
    );
    const role = myParticipant?.role;

    // Check permissions
    if (role) {
      const permissions = this.getRolePermissions(role);
      if (!permissions.canShareScreen) {
        throw new Error("You are not allowed to share screen");
      }
    }

    if (!this.currentCall) return;

    try {
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      this.isScreenSharing = true;

      if (myParticipant) {
        myParticipant.isScreenSharing = true;
      }

      // Handle screen share stop
      this.screenShareStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      this.signaling?.notifyScreenShareStarted(
        this.currentCall.id,
        this.config.userId,
      );
      this.emit("screen-share-started");
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  stopScreenShare(): void {
    if (!this.isScreenSharing || !this.currentCall) return;

    // Stop screen share tracks
    this.screenShareStream?.getTracks().forEach((track) => track.stop());
    this.screenShareStream = null;

    this.isScreenSharing = false;

    const myParticipant = this.currentCall.participants.get(this.config.userId);
    if (myParticipant) {
      myParticipant.isScreenSharing = false;
    }

    this.signaling?.notifyScreenShareStopped(
      this.currentCall.id,
      this.config.userId,
    );
    this.emit("screen-share-stopped");
  }

  raiseHand(): void {
    if (!this.currentCall) return;

    this.isHandRaised = true;

    const myParticipant = this.currentCall.participants.get(this.config.userId);
    if (myParticipant) {
      myParticipant.isHandRaised = true;
    }

    this.config.onHandRaised?.(this.config.userId);
    this.emit("hand-raised", { participantId: this.config.userId });
  }

  lowerHand(): void {
    if (!this.currentCall) return;

    this.isHandRaised = false;

    const myParticipant = this.currentCall.participants.get(this.config.userId);
    if (myParticipant) {
      myParticipant.isHandRaised = false;
    }

    this.emit("hand-lowered", { participantId: this.config.userId });
  }

  lowerParticipantHand(participantId: string): void {
    if (!this.canManageParticipants || !this.currentCall) return;

    const participant = this.currentCall.participants.get(participantId);
    if (participant) {
      participant.isHandRaised = false;
      this.emit("hand-lowered", { participantId, byHost: true });
    }
  }

  // ===========================================================================
  // Recording
  // ===========================================================================

  async startRecording(): Promise<void> {
    if (!this.isHost || !this.currentCall) {
      throw new Error("Only host can start recording");
    }

    this.currentCall.isRecording = true;
    this.config.onRecordingStatusChange?.(true);
    this.emit("recording-started");
  }

  async stopRecording(): Promise<void> {
    if (!this.isHost || !this.currentCall) {
      throw new Error("Only host can stop recording");
    }

    this.currentCall.isRecording = false;
    this.config.onRecordingStatusChange?.(false);
    this.emit("recording-stopped");
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async startLocalMedia(type: GroupCallType): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video",
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Apply initial mute settings
      if (this.config.muteOnEntry) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        this.isMuted = true;
      }

      if (this.config.videoOffOnEntry && type === "video") {
        this.localStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        this.isVideoEnabled = false;
      }

      // Set up audio analysis for active speaker detection
      this.setupLocalAudioAnalysis();

      this.emit("local-stream-ready", { stream: this.localStream });
    } catch (error) {
      throw new Error(`Failed to get media: ${(error as Error).message}`);
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
      if (!this.currentCall) return;

      for (const [participantId, analyser] of this.audioAnalyzers) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const participant = this.currentCall.participants.get(participantId);

        if (participant) {
          participant.audioLevel = average;
          participant.isSpeaking = average > ACTIVE_SPEAKER_THRESHOLD;
        }

        // Update active speaker
        if (average > ACTIVE_SPEAKER_THRESHOLD) {
          this.updateActiveSpeaker(participantId);
        }
      }

      if (this.isConnected) {
        requestAnimationFrame(checkAudioLevels);
      }
    };

    requestAnimationFrame(checkAudioLevels);
  }

  private updateActiveSpeaker(participantId: string): void {
    if (this.activeSpeakerId === participantId) return;

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

        const participant = this.currentCall?.participants.get(participantId);
        if (participant) {
          participant.stream = event.streams[0];
        }

        // Set up audio analysis for remote participant
        this.setupRemoteAudioAnalysis(participantId, event.streams[0]);

        this.emit("remote-stream", { participantId, stream: event.streams[0] });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCall && this.signaling) {
        this.signaling.sendIceCandidate({
          callId: this.currentCall.id,
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
    if (!this.audioAnalyzer) return;

    const source = this.audioAnalyzer.createMediaStreamSource(stream);
    const analyser = this.audioAnalyzer.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    this.audioAnalyzers.set(participantId, analyser);
  }

  private handlePeerConnectionStateChange(
    participantId: string,
    state: RTCPeerConnectionState,
  ): void {
    const participant = this.currentCall?.participants.get(participantId);
    if (!participant) return;

    switch (state) {
      case "connected":
        participant.connectionState = "connected";
        this.emit("participant-connected", { participantId });
        break;
      case "disconnected":
        participant.connectionState = "disconnected";
        this.emit("participant-disconnected", { participantId });
        this.attemptReconnectToParticipant(participantId);
        break;
      case "failed":
        participant.connectionState = "disconnected";
        this.handleParticipantConnectionFailed(participantId);
        break;
    }
  }

  private async attemptReconnectToParticipant(
    participantId: string,
  ): Promise<void> {
    const maxAttempts =
      this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;

    if (this.reconnectAttempts >= maxAttempts) {
      this.handleParticipantConnectionFailed(participantId);
      return;
    }

    this.reconnectAttempts++;

    const participant = this.currentCall?.participants.get(participantId);
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

        if (this.currentCall && this.signaling) {
          this.signaling.sendOffer({
            callId: this.currentCall.id,
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
    const participant = this.currentCall?.participants.get(participantId);
    if (!participant) return;

    // Remove participant
    this.currentCall?.participants.delete(participantId);
    this.peerConnections.get(participantId)?.close();
    this.peerConnections.delete(participantId);
    this.mediaStreams.delete(participantId);
    this.audioAnalyzers.delete(participantId);

    this.metrics.networkIssues++;
    this.metrics.totalLeaves++;

    this.config.onParticipantLeft?.(participant, "connection_failed");
    this.emit("participant-left", { participant, reason: "connection_failed" });
  }

  private setCallStatus(status: GroupCallStatus): void {
    if (!this.currentCall) return;

    const previousStatus = this.currentCall.status;
    this.currentCall.status = status;

    this.config.onCallStateChange?.(status, previousStatus);
    this.emit("call-state-change", { status, previousStatus });
  }

  private handleParticipantJoined(payload: any): void {
    if (!this.currentCall) return;

    const participant: GroupCallParticipant = {
      id: payload.participant.id,
      name: payload.participant.name,
      avatarUrl: payload.participant.avatarUrl,
      role: "participant",
      isMuted: payload.participant.isMuted ?? true,
      isVideoEnabled: payload.participant.isVideoEnabled ?? false,
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: false,
      connectionState: "connecting",
      joinedAt: new Date(payload.participant.joinedAt),
      lobbyStatus: "admitted",
      audioLevel: 0,
      isPinned: false,
      isSpotlight: false,
    };

    if (
      this.config.enableLobby &&
      !this.shouldAutoAdmit(payload.participant.email)
    ) {
      // Add to lobby
      this.currentCall.lobbyParticipants.set(participant.id, participant);
      this.config.onLobbyUpdate?.(
        Array.from(this.currentCall.lobbyParticipants.values()),
      );
      this.emit("lobby-updated", {
        lobbyParticipants: this.getLobbyParticipants(),
      });
    } else {
      // Add directly
      this.currentCall.participants.set(participant.id, participant);
      this.createPeerConnection(participant.id);

      this.metrics.totalJoins++;
      this.updatePeakParticipantCount();

      this.config.onParticipantJoined?.(participant);
      this.emit("participant-joined", { participant });
    }
  }

  private handleParticipantLeft(payload: any): void {
    if (!this.currentCall) return;

    const participant = this.currentCall.participants.get(
      payload.participant.id,
    );
    if (!participant) return;

    // Cleanup
    this.currentCall.participants.delete(payload.participant.id);
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

    this.metrics.totalLeaves++;

    this.config.onParticipantLeft?.(participant, "left");
    this.emit("participant-left", { participant, reason: "left" });
  }

  private handleCallEnded(reason: CallEndReason): void {
    if (!this.currentCall) return;

    this.currentCall.endReason = reason;
    this.setCallStatus("ended");

    this.emit("call-ended", { callInfo: this.currentCall, reason });

    this.cleanup();
  }

  private async handleOffer(payload: any): Promise<void> {
    const pc = this.peerConnections.get(payload.fromUserId);
    if (!pc || !this.currentCall) return;

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
    const participant = this.currentCall?.participants.get(participantId);
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
    const participant = this.currentCall?.participants.get(participantId);
    if (participant) {
      participant.isScreenSharing = true;
      this.emit("remote-screen-share-started", { participantId });
    }
  }

  private handleRemoteScreenShareStop(participantId: string): void {
    const participant = this.currentCall?.participants.get(participantId);
    if (participant) {
      participant.isScreenSharing = false;
      this.emit("remote-screen-share-stopped", { participantId });
    }
  }

  private handleError(error: Error): void {
    logger.error("[GroupCall] Error:", error);
    this.config.onError?.(error);
    this.emit("error", error);
  }

  private generateJoinLink(callId: string): string {
    // In production, this would generate a proper join URL
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://app.example.com";
    return `${baseUrl}/join/${callId}`;
  }

  // ===========================================================================
  // Metrics
  // ===========================================================================

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
    if (!this.currentCall?.connectedAt) return;

    this.metrics.duration = this.callDuration;
    this.metrics.participantCount = this.participantCount;
  }

  private updatePeakParticipantCount(): void {
    if (this.participantCount > this.metrics.peakParticipantCount) {
      this.metrics.peakParticipantCount = this.participantCount;
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanup(): void {
    // Stop metrics
    this.stopMetricsCollection();

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
    this.isVideoEnabled = true;
    this.isScreenSharing = false;
    this.isHandRaised = false;
    this.reconnectAttempts = 0;
    this.activeSpeakerId = null;
    this.currentParticipantPage = 0;
    this.visibleParticipantIds.clear();
    this.currentCall = null;

    // Reset metrics
    this.metrics = {
      duration: 0,
      participantCount: 0,
      peakParticipantCount: 0,
      totalJoins: 0,
      totalLeaves: 0,
      averageCallQuality: 100,
      networkIssues: 0,
    };
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

export function createGroupCallService(
  config: GroupCallServiceConfig,
): GroupCallService {
  return new GroupCallService(config);
}
