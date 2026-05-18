/**
 * Call Types for nself-chat
 *
 * Core type definitions for voice calls, video calls, group calls,
 * voice channels, and related functionality.
 */

import type { User, UserBasicInfo } from "./user";

// ============================================================================
// Call Types
// ============================================================================

/**
 * Types of calls supported
 */
export type CallType = "voice" | "video" | "screen_share";

/**
 * Call status throughout its lifecycle
 */
export type CallStatus =
  | "ringing"
  | "active"
  | "ended"
  | "missed"
  | "declined"
  | "busy"
  | "failed";

/**
 * Reason for call ending
 */
export type CallEndReason =
  | "completed"
  | "declined"
  | "busy"
  | "timeout"
  | "cancelled"
  | "failed"
  | "no_answer"
  | "network_error"
  | "user_hangup"
  | "remote_hangup";

// ============================================================================
// Call Interfaces
// ============================================================================

/**
 * Main Call interface representing a voice/video call
 */
export interface Call {
  /** Unique call identifier */
  id: string;
  /** Type of call */
  type: CallType;
  /** Current call status */
  status: CallStatus;
  /** User who initiated the call */
  initiatorId: string;
  /** Initiator user details */
  initiator?: UserBasicInfo;
  /** Associated channel ID (for group calls) */
  channelId?: string;
  /** When call started ringing */
  createdAt: Date;
  /** When call was answered/connected */
  startedAt?: Date;
  /** When call ended */
  endedAt?: Date;
  /** Call duration in seconds */
  durationSeconds?: number;
  /** Reason for ending */
  endReason?: CallEndReason;
  /** Call participants */
  participants: CallParticipant[];
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Call participant information
 */
export interface CallParticipant {
  /** Participant ID */
  id: string;
  /** Call ID */
  callId: string;
  /** User ID */
  userId: string;
  /** User details */
  user?: UserBasicInfo;
  /** When they joined the call */
  joinedAt: Date;
  /** When they left the call */
  leftAt?: Date;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Whether video is off */
  isVideoOff: boolean;
  /** Whether they are sharing screen */
  isScreenSharing: boolean;
  /** Whether this participant is speaking */
  isSpeaking?: boolean;
  /** Connection quality (0-100) */
  connectionQuality?: number;
  /** Whether this is the current user */
  isLocal?: boolean;
}

/**
 * Incoming call information
 */
export interface IncomingCall {
  /** Call information */
  call: Call;
  /** Caller information */
  caller: UserBasicInfo;
  /** When the call was received */
  receivedAt: Date;
  /** Whether to show notification */
  showNotification: boolean;
  /** Whether to play ringtone */
  playRingtone: boolean;
}

// ============================================================================
// Call Signaling Types
// ============================================================================

/**
 * WebRTC signaling message types
 */
export type SignalType =
  | "offer"
  | "answer"
  | "ice-candidate"
  | "hangup"
  | "renegotiate";

/**
 * Call signaling message
 */
export interface CallSignal {
  /** Signal type */
  type: SignalType;
  /** Associated call ID */
  callId: string;
  /** Sender user ID */
  senderId: string;
  /** Target user ID */
  targetId: string;
  /** SDP offer/answer or ICE candidate */
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Call lifecycle event types
 */
export type CallEventType =
  | "incoming"
  | "answered"
  | "rejected"
  | "ended"
  | "participant-joined"
  | "participant-left"
  | "mute-changed"
  | "video-changed"
  | "screen-share-started"
  | "screen-share-stopped"
  | "connection-state-changed"
  | "quality-changed";

/**
 * Call event for state updates
 */
export interface CallEvent {
  /** Event type */
  type: CallEventType;
  /** Associated call ID */
  callId: string;
  /** User ID related to the event */
  userId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Additional event data */
  data?: Record<string, unknown>;
}

// ============================================================================
// Call State Types
// ============================================================================

/**
 * Local call state for UI
 */
export interface CallState {
  /** Current active call */
  currentCall: Call | null;
  /** Incoming calls queue */
  incomingCalls: IncomingCall[];
  /** Local media stream */
  localStream: MediaStream | null;
  /** Remote streams by participant ID */
  remoteStreams: Map<string, MediaStream>;
  /** Screen share stream */
  screenShareStream: MediaStream | null;
  /** Whether local audio is muted */
  isMuted: boolean;
  /** Whether local video is off */
  isVideoOff: boolean;
  /** Whether screen sharing */
  isScreenSharing: boolean;
  /** Connection state */
  connectionState: CallConnectionState;
  /** Call timer (seconds) */
  callDuration: number;
}

/**
 * Call connection states
 */
export type CallConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "closed";

// ============================================================================
// Call Configuration
// ============================================================================

/**
 * Call service configuration
 */
export interface CallServiceConfig {
  /** Ringtone audio URL */
  ringtoneUrl?: string;
  /** Ring timeout in milliseconds */
  ringTimeout: number;
  /** Auto reconnect on disconnect */
  autoReconnect: boolean;
  /** Max reconnect attempts */
  maxReconnectAttempts: number;
  /** Reconnect delay in milliseconds */
  reconnectDelay: number;
  /** Enable video by default */
  defaultVideoEnabled: boolean;
  /** Enable audio by default */
  defaultAudioEnabled: boolean;
}

/**
 * Default call configuration
 */
export const DEFAULT_CALL_CONFIG: CallServiceConfig = {
  ringTimeout: 30000, // 30 seconds
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  defaultVideoEnabled: false,
  defaultAudioEnabled: true,
};

// ============================================================================
// Call Quality Types
// ============================================================================

/**
 * Call quality metrics
 */
export interface CallQualityMetrics {
  /** Bitrate in kbps */
  bitrate: number;
  /** Packets lost */
  packetsLost: number;
  /** Jitter in ms */
  jitter: number;
  /** Round trip time in ms */
  roundTripTime: number;
  /** Frame rate (video only) */
  frameRate?: number;
  /** Resolution (video only) */
  resolution?: { width: number; height: number };
  /** Quality score (0-100) */
  qualityScore: number;
}

/**
 * Quality levels for adaptive bitrate
 */
export type QualityLevel = "low" | "medium" | "high" | "hd";

/**
 * Quality preset configurations
 */
export const QUALITY_PRESETS: Record<
  QualityLevel,
  {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  }
> = {
  low: { width: 320, height: 240, frameRate: 15, bitrate: 250 },
  medium: { width: 640, height: 480, frameRate: 24, bitrate: 500 },
  high: { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
  hd: { width: 1920, height: 1080, frameRate: 30, bitrate: 3000 },
};

// ============================================================================
// Call History Types
// ============================================================================

/**
 * Call history entry for display
 */
export interface CallHistoryEntry {
  /** Call ID */
  id: string;
  /** Call type */
  type: CallType;
  /** Call direction */
  direction: "incoming" | "outgoing";
  /** Other participant(s) */
  participants: UserBasicInfo[];
  /** Call status/outcome */
  status: CallStatus;
  /** Call duration in seconds */
  duration?: number;
  /** When the call occurred */
  timestamp: Date;
  /** Whether call was missed */
  isMissed: boolean;
}

// ============================================================================
// Call Actions Types
// ============================================================================

/**
 * Call action types for the call service
 */
export type CallAction =
  | {
      type: "START_CALL";
      payload: { targetUserIds: string[]; callType: CallType };
    }
  | { type: "ACCEPT_CALL"; payload: { callId: string; withVideo: boolean } }
  | { type: "REJECT_CALL"; payload: { callId: string; reason?: string } }
  | { type: "END_CALL"; payload: { callId: string } }
  | { type: "TOGGLE_MUTE" }
  | { type: "TOGGLE_VIDEO" }
  | { type: "TOGGLE_SCREEN_SHARE" }
  | { type: "SWITCH_CAMERA" }
  | { type: "SET_AUDIO_DEVICE"; payload: { deviceId: string } }
  | { type: "SET_VIDEO_DEVICE"; payload: { deviceId: string } };

// ============================================================================
// Voice Channel Types
// ============================================================================

/**
 * Voice channel for persistent audio rooms (Discord-style)
 */
export interface VoiceChannel {
  /** Voice channel ID */
  id: string;
  /** Parent text channel ID */
  channelId: string;
  /** Voice channel name */
  name: string;
  /** Maximum users (0 = unlimited) */
  userLimit: number;
  /** Audio bitrate in bps */
  bitrate: number;
  /** When channel was created */
  createdAt: Date;
  /** Current participants */
  participants: VoiceChannelParticipant[];
}

/**
 * Voice channel participant
 */
export interface VoiceChannelParticipant {
  /** User ID */
  userId: string;
  /** User details */
  user?: UserBasicInfo;
  /** When they joined */
  joinedAt: Date;
  /** Whether self-muted */
  isMuted: boolean;
  /** Whether self-deafened */
  isDeafened: boolean;
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Server mute status (by moderator) */
  isServerMuted?: boolean;
  /** Server deafen status (by moderator) */
  isServerDeafened?: boolean;
}

/**
 * Voice channel state
 */
export interface VoiceChannelState {
  /** Available voice channels */
  channels: VoiceChannel[];
  /** Currently joined channel */
  currentChannel: VoiceChannel | null;
  /** Local mute state */
  isMuted: boolean;
  /** Local deafen state */
  isDeafened: boolean;
  /** Connection state */
  connectionState: CallConnectionState;
}

// ============================================================================
// Voice Message Types
// ============================================================================

/**
 * Voice message for audio message attachments
 */
export interface VoiceMessage {
  /** Voice message ID */
  id: string;
  /** Message ID it's attached to */
  messageId: string;
  /** Audio file URL */
  audioUrl: string;
  /** Duration in seconds */
  duration: number;
  /** Waveform data for visualization */
  waveformData: number[];
  /** Transcription text (if available) */
  transcription?: string;
  /** Transcription confidence (0-1) */
  transcriptionConfidence?: number;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** When recorded */
  recordedAt: Date;
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
  /** Full transcription text */
  text: string;
  /** Overall confidence (0-1) */
  confidence: number;
  /** Word-level details */
  words: TranscriptionWord[];
  /** Language detected */
  language?: string;
}

/**
 * Word-level transcription data
 */
export interface TranscriptionWord {
  /** The word */
  word: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Confidence for this word (0-1) */
  confidence: number;
}

// ============================================================================
// ICE Server Types
// ============================================================================

/**
 * ICE server configuration
 */
export interface IceServer {
  /** Server URL(s) */
  urls: string | string[];
  /** Username for TURN */
  username?: string;
  /** Credential for TURN */
  credential?: string;
  /** Credential type */
  credentialType?: "password" | "oauth";
}

/**
 * ICE server configuration from environment
 */
export interface IceServerConfig {
  /** STUN servers */
  stunServers: IceServer[];
  /** TURN servers */
  turnServers: IceServer[];
  /** ICE transport policy */
  iceTransportPolicy: RTCIceTransportPolicy;
}

// ============================================================================
// Speaker Detection Types
// ============================================================================

/**
 * Speaker information for active speaker detection
 */
export interface SpeakerInfo {
  /** Participant ID */
  participantId: string;
  /** Current volume level (0-1) */
  volume: number;
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Last spoken timestamp */
  lastSpokeAt?: Date;
}

/**
 * Dominant speaker change event
 */
export interface DominantSpeakerEvent {
  /** Previous dominant speaker ID */
  previousSpeakerId: string | null;
  /** New dominant speaker ID */
  currentSpeakerId: string | null;
  /** Timestamp of change */
  timestamp: Date;
}

// ============================================================================
// Picture-in-Picture Types
// ============================================================================

/**
 * Picture-in-Picture state
 */
export interface PipState {
  /** Whether PiP is supported */
  isSupported: boolean;
  /** Whether currently in PiP mode */
  isActive: boolean;
  /** PiP window dimensions */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// Call UI Types
// ============================================================================

/**
 * Call control button state
 */
export interface CallControlState {
  /** Button ID */
  id: string;
  /** Whether enabled */
  enabled: boolean;
  /** Whether active/toggled on */
  active: boolean;
  /** Tooltip text */
  tooltip: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * Grid layout for group call participants
 */
export type CallGridLayout =
  | "1x1"
  | "2x1"
  | "2x2"
  | "3x2"
  | "3x3"
  | "spotlight";

/**
 * Video tile display mode
 */
export interface VideoTileState {
  /** Participant ID */
  participantId: string;
  /** Whether tile is pinned/spotlighted */
  isPinned: boolean;
  /** Whether tile is expanded */
  isExpanded: boolean;
  /** Tile position in grid */
  position: number;
}

// ============================================================================
// Call Callbacks Types
// ============================================================================

/**
 * Call service event callbacks
 */
export interface CallServiceCallbacks {
  /** Called when an incoming call is received */
  onIncomingCall?: (call: IncomingCall) => void;
  /** Called when call state changes */
  onCallStateChange?: (call: Call) => void;
  /** Called when a call is answered */
  onCallAnswered?: (call: Call) => void;
  /** Called when a call ends */
  onCallEnded?: (call: Call, reason: CallEndReason) => void;
  /** Called when a call is missed */
  onCallMissed?: (call: Call) => void;
  /** Called when remote stream is received */
  onRemoteStream?: (stream: MediaStream, participantId: string) => void;
  /** Called when a participant joins */
  onParticipantJoined?: (participant: CallParticipant) => void;
  /** Called when a participant leaves */
  onParticipantLeft?: (participant: CallParticipant) => void;
  /** Called when connection state changes */
  onConnectionStateChange?: (state: CallConnectionState) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Export Type Guards
// ============================================================================

/**
 * Check if a call is active
 */
export function isCallActive(call: Call): boolean {
  return call.status === "active";
}

/**
 * Check if a call is ringing
 */
export function isCallRinging(call: Call): boolean {
  return call.status === "ringing";
}

/**
 * Check if a call has ended
 */
export function isCallEnded(call: Call): boolean {
  return ["ended", "missed", "declined", "busy", "failed"].includes(
    call.status,
  );
}

/**
 * Check if a call is a video call
 */
export function isVideoCall(call: Call): boolean {
  return call.type === "video";
}

/**
 * Check if a call is a group call
 */
export function isGroupCall(call: Call): boolean {
  return call.participants.length > 2;
}
