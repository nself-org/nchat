/**
 * Voice Chat Types for nself-chat
 *
 * Telegram-style live voice chats with scheduling, host roles,
 * push-to-talk, raise hand, and recording support.
 */

import type { UserBasicInfo } from "./user";

// =============================================================================
// Voice Chat Role Types
// =============================================================================

/**
 * Role types in a voice chat - Telegram-style hierarchy
 */
export type VoiceChatRole = "creator" | "admin" | "speaker" | "listener";

/**
 * Voice chat status
 */
export type VoiceChatStatus =
  | "scheduled" // Scheduled for future
  | "starting" // About to start
  | "live" // Currently active
  | "paused" // Temporarily paused
  | "ended"; // Voice chat has ended

/**
 * Hand raise request status
 */
export type VoiceChatHandStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "lowered";

/**
 * Participant connection state
 */
export type VoiceChatConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

/**
 * Push-to-talk mode
 */
export type PushToTalkMode = "always_on" | "push_to_talk" | "voice_activity";

// =============================================================================
// Voice Chat Types
// =============================================================================

/**
 * Voice chat configuration
 */
export interface VoiceChat {
  /** Unique voice chat ID */
  id: string;
  /** Group/Supergroup channel ID */
  channelId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Voice chat title */
  title: string;
  /** Description */
  description?: string;
  /** Voice chat status */
  status: VoiceChatStatus;
  /** User who created the voice chat */
  creatorId: string;
  /** Creator details */
  creator: UserBasicInfo;
  /** When the voice chat was created */
  createdAt: Date;
  /** When the voice chat was last updated */
  updatedAt: Date;
  /** When the voice chat started (if live) */
  startedAt?: Date;
  /** When the voice chat ended */
  endedAt?: Date;
  /** Scheduled start time (if scheduled) */
  scheduledStartTime?: Date;
  /** Scheduled end time (optional) */
  scheduledEndTime?: Date;
  /** Whether recording is enabled */
  isRecordingEnabled: boolean;
  /** Whether the voice chat is currently being recorded */
  isRecording: boolean;
  /** Recording URL (after voice chat ends) */
  recordingUrl?: string;
  /** Recording duration in seconds */
  recordingDuration?: number;
  /** Invite link for joining */
  inviteLink: string;
  /** Whether the voice chat is visible in group */
  showInGroup: boolean;
  /** Voice chat settings */
  settings: VoiceChatSettings;
  /** Current participant count */
  participantCount: number;
  /** Current speaker count */
  speakerCount: number;
  /** Current listener count */
  listenerCount: number;
}

/**
 * Voice chat settings
 */
export interface VoiceChatSettings {
  /** Default talk mode for new participants */
  defaultTalkMode: PushToTalkMode;
  /** Allow listeners to request to speak */
  allowRaiseHand: boolean;
  /** Auto-accept raise hand requests */
  autoAcceptRaiseHand: boolean;
  /** Maximum pending raise hand requests */
  maxPendingRequests: number;
  /** Notify admins of raise hand requests */
  notifyOnRaiseHand: boolean;
  /** Allow chat during voice chat */
  allowChat: boolean;
  /** Allow reactions during voice chat */
  allowReactions: boolean;
  /** Mute listeners by default */
  muteListenersOnJoin: boolean;
  /** Maximum participants (0 = unlimited) */
  maxParticipants: number;
  /** Maximum speakers (0 = unlimited) */
  maxSpeakers: number;
  /** Timeout for raise hand requests (seconds, 0 = no timeout) */
  raiseHandTimeout: number;
  /** Custom welcome message */
  welcomeMessage?: string;
  /** Push-to-talk key binding */
  pushToTalkKey?: string;
  /** Voice activity detection sensitivity (0-1) */
  voiceActivitySensitivity: number;
  /** Auto-start recording when voice chat starts */
  autoStartRecording: boolean;
  /** Send reminder before scheduled start */
  sendReminders: boolean;
  /** Reminder minutes before start */
  reminderMinutesBefore: number[];
}

/**
 * Default voice chat settings
 */
export const DEFAULT_VOICE_CHAT_SETTINGS: VoiceChatSettings = {
  defaultTalkMode: "voice_activity",
  allowRaiseHand: true,
  autoAcceptRaiseHand: false,
  maxPendingRequests: 50,
  notifyOnRaiseHand: true,
  allowChat: true,
  allowReactions: true,
  muteListenersOnJoin: true,
  maxParticipants: 0,
  maxSpeakers: 0,
  raiseHandTimeout: 0,
  voiceActivitySensitivity: 0.02,
  autoStartRecording: false,
  sendReminders: true,
  reminderMinutesBefore: [15, 60],
  pushToTalkKey: "Space",
};

// =============================================================================
// Voice Chat Participant Types
// =============================================================================

/**
 * Voice chat participant
 */
export interface VoiceChatParticipant {
  /** Participant ID */
  id: string;
  /** Voice chat ID */
  voiceChatId: string;
  /** User ID */
  userId: string;
  /** User details */
  user: UserBasicInfo;
  /** Participant role */
  role: VoiceChatRole;
  /** Talk mode for this participant */
  talkMode: PushToTalkMode;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Whether push-to-talk key is pressed */
  isPushToTalkActive: boolean;
  /** Audio level (0-1) */
  audioLevel: number;
  /** Volume level set by listener (0-2, 1 = normal) */
  volumeLevel: number;
  /** Connection state */
  connectionState: VoiceChatConnectionState;
  /** When they joined */
  joinedAt: Date;
  /** When they became a speaker (if applicable) */
  becameSpeakerAt?: Date;
  /** Whether they have raised hand */
  hasRaisedHand: boolean;
  /** Whether they are muted by admin */
  isForceMuted: boolean;
  /** Stream reference */
  stream?: MediaStream;
  /** Position in speaker order */
  speakerPosition?: number;
  /** Whether they are the active speaker (most recently speaking) */
  isActiveSpeaker: boolean;
  /** Device type (for display purposes) */
  deviceType?: "desktop" | "mobile" | "tablet";
}

/**
 * Raise hand request
 */
export interface VoiceChatHandRequest {
  /** Request ID */
  id: string;
  /** Voice chat ID */
  voiceChatId: string;
  /** User ID */
  userId: string;
  /** User details */
  user: UserBasicInfo;
  /** Request status */
  status: VoiceChatHandStatus;
  /** When the hand was raised */
  requestedAt: Date;
  /** When the request was processed */
  processedAt?: Date;
  /** Who processed the request (admin) */
  processedBy?: string;
  /** Reason for decline (if declined) */
  declineReason?: string;
  /** Optional message with the request */
  message?: string;
  /** Position in queue */
  position: number;
}

// =============================================================================
// Voice Chat Scheduling Types
// =============================================================================

/**
 * Scheduled voice chat
 */
export interface ScheduledVoiceChat {
  /** Scheduled voice chat ID */
  id: string;
  /** Voice chat ID (created when started) */
  voiceChatId?: string;
  /** Channel ID */
  channelId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Scheduled start time */
  scheduledStart: Date;
  /** Scheduled end time (optional) */
  scheduledEnd?: Date;
  /** Actual start time */
  actualStart?: Date;
  /** Actual end time */
  actualEnd?: Date;
  /** Creator ID */
  creatorId: string;
  /** Creator details */
  creator: UserBasicInfo;
  /** Co-host IDs */
  coHostIds: string[];
  /** Status */
  status: ScheduledVoiceChatStatus;
  /** Whether reminders were sent */
  remindersSent: boolean[];
  /** Number of interested users */
  interestedCount: number;
  /** Announcement message ID */
  announcementMessageId?: string;
  /** Whether to auto-start at scheduled time */
  autoStart: boolean;
  /** Created at */
  createdAt: Date;
  /** Updated at */
  updatedAt: Date;
}

/**
 * Scheduled voice chat status
 */
export type ScheduledVoiceChatStatus =
  | "scheduled"
  | "starting_soon" // 15 minutes before
  | "live"
  | "ended"
  | "cancelled";

/**
 * Voice chat interest/RSVP
 */
export interface VoiceChatInterest {
  /** Interest ID */
  id: string;
  /** Scheduled voice chat ID */
  scheduledVoiceChatId: string;
  /** User ID */
  userId: string;
  /** User details */
  user: UserBasicInfo;
  /** Whether reminder is enabled */
  reminderEnabled: boolean;
  /** When they expressed interest */
  createdAt: Date;
}

// =============================================================================
// Recording Types
// =============================================================================

/**
 * Voice chat recording
 */
export interface VoiceChatRecording {
  /** Recording ID */
  id: string;
  /** Voice chat ID */
  voiceChatId: string;
  /** Recording status */
  status: RecordingStatus;
  /** Start time */
  startedAt: Date;
  /** End time */
  endedAt?: Date;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  fileSize?: number;
  /** Recording URL */
  url?: string;
  /** Download URL */
  downloadUrl?: string;
  /** Who started the recording */
  startedBy: string;
  /** Who stopped the recording */
  stoppedBy?: string;
  /** Recording format */
  format: "opus" | "mp3" | "wav";
  /** Whether recording includes all participants */
  includesAllParticipants: boolean;
}

/**
 * Recording status
 */
export type RecordingStatus = "recording" | "processing" | "ready" | "failed";

// =============================================================================
// Voice Chat Metrics Types
// =============================================================================

/**
 * Voice chat metrics
 */
export interface VoiceChatMetrics {
  /** Voice chat ID */
  voiceChatId: string;
  /** Current listener count */
  listenerCount: number;
  /** Current speaker count */
  speakerCount: number;
  /** Peak listener count */
  peakListenerCount: number;
  /** Peak speaker count */
  peakSpeakerCount: number;
  /** Total unique participants */
  totalUniqueParticipants: number;
  /** Average participation duration (seconds) */
  averageParticipationDuration: number;
  /** Total raise hand requests */
  totalRaiseHandRequests: number;
  /** Accepted raise hand requests */
  acceptedRaiseHandRequests: number;
  /** Declined raise hand requests */
  declinedRaiseHandRequests: number;
  /** Voice chat duration so far (seconds) */
  duration: number;
  /** Reactions count by type */
  reactionCounts: Record<string, number>;
  /** Chat message count */
  chatMessageCount: number;
  /** Recording duration (if recording) */
  recordingDuration: number;
}

// =============================================================================
// Voice Chat Action Types
// =============================================================================

/**
 * Voice chat moderation actions
 */
export type VoiceChatModerationAction =
  | "invite_to_speak"
  | "move_to_listeners"
  | "mute_participant"
  | "unmute_participant"
  | "force_mute_participant"
  | "remove_from_chat"
  | "accept_raise_hand"
  | "decline_raise_hand"
  | "lower_hand"
  | "promote_to_admin"
  | "demote_from_admin"
  | "end_voice_chat"
  | "start_recording"
  | "stop_recording"
  | "pause_voice_chat"
  | "resume_voice_chat"
  | "update_title"
  | "update_settings";

/**
 * Voice chat moderation log entry
 */
export interface VoiceChatModerationLog {
  /** Log entry ID */
  id: string;
  /** Voice chat ID */
  voiceChatId: string;
  /** Action type */
  action: VoiceChatModerationAction;
  /** Admin who performed the action */
  adminId: string;
  /** Admin details */
  admin: UserBasicInfo;
  /** Target user ID (if applicable) */
  targetUserId?: string;
  /** Target user details (if applicable) */
  targetUser?: UserBasicInfo;
  /** Additional details */
  details?: Record<string, unknown>;
  /** When the action was performed */
  timestamp: Date;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a voice chat
 */
export interface CreateVoiceChatInput {
  /** Channel ID */
  channelId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Voice chat title */
  title: string;
  /** Description */
  description?: string;
  /** Whether recording is enabled */
  isRecordingEnabled?: boolean;
  /** Voice chat settings */
  settings?: Partial<VoiceChatSettings>;
  /** Scheduled start time (if scheduling) */
  scheduledStartTime?: Date;
  /** Scheduled end time */
  scheduledEndTime?: Date;
  /** Whether to show in group */
  showInGroup?: boolean;
}

/**
 * Input for updating a voice chat
 */
export interface UpdateVoiceChatInput {
  /** Voice chat title */
  title?: string;
  /** Description */
  description?: string;
  /** Whether recording is enabled */
  isRecordingEnabled?: boolean;
  /** Voice chat settings */
  settings?: Partial<VoiceChatSettings>;
  /** Whether to show in group */
  showInGroup?: boolean;
}

/**
 * Input for scheduling a voice chat
 */
export interface ScheduleVoiceChatInput {
  /** Channel ID */
  channelId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Scheduled start time */
  scheduledStart: Date;
  /** Scheduled end time */
  scheduledEnd?: Date;
  /** Co-host IDs */
  coHostIds?: string[];
  /** Whether to auto-start at scheduled time */
  autoStart?: boolean;
}

/**
 * Input for updating a scheduled voice chat
 */
export interface UpdateScheduledVoiceChatInput {
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Scheduled start time */
  scheduledStart?: Date;
  /** Scheduled end time */
  scheduledEnd?: Date;
  /** Co-host IDs */
  coHostIds?: string[];
  /** Whether to auto-start */
  autoStart?: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Voice chat event types for real-time updates
 */
export type VoiceChatEventType =
  | "voice_chat_started"
  | "voice_chat_ended"
  | "voice_chat_paused"
  | "voice_chat_resumed"
  | "title_updated"
  | "participant_joined"
  | "participant_left"
  | "speaker_added"
  | "speaker_removed"
  | "hand_raised"
  | "hand_lowered"
  | "hand_accepted"
  | "hand_declined"
  | "participant_muted"
  | "participant_unmuted"
  | "participant_force_muted"
  | "recording_started"
  | "recording_stopped"
  | "admin_added"
  | "admin_removed"
  | "active_speaker_changed"
  | "scheduled_reminder"
  | "scheduled_starting_soon";

/**
 * Voice chat event payload
 */
export interface VoiceChatEventPayload {
  /** Event type */
  type: VoiceChatEventType;
  /** Voice chat ID */
  voiceChatId: string;
  /** Voice chat data (for full updates) */
  voiceChat?: VoiceChat;
  /** User ID related to the event */
  userId?: string;
  /** User details */
  user?: UserBasicInfo;
  /** Participant data */
  participant?: VoiceChatParticipant;
  /** Raise hand request data */
  handRequest?: VoiceChatHandRequest;
  /** Recording data */
  recording?: VoiceChatRecording;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Event timestamp */
  timestamp: Date;
}

// =============================================================================
// Service Callback Types
// =============================================================================

/**
 * Voice chat service callbacks
 */
export interface VoiceChatServiceCallbacks {
  /** Called when voice chat status changes */
  onStatusChange?: (
    voiceChat: VoiceChat,
    previousStatus: VoiceChatStatus,
  ) => void;
  /** Called when a participant joins */
  onParticipantJoined?: (participant: VoiceChatParticipant) => void;
  /** Called when a participant leaves */
  onParticipantLeft?: (
    participant: VoiceChatParticipant,
    reason: string,
  ) => void;
  /** Called when a speaker is added */
  onSpeakerAdded?: (participant: VoiceChatParticipant) => void;
  /** Called when a speaker is removed */
  onSpeakerRemoved?: (
    participant: VoiceChatParticipant,
    reason: string,
  ) => void;
  /** Called when a hand is raised */
  onHandRaised?: (request: VoiceChatHandRequest) => void;
  /** Called when a hand raise is processed */
  onHandProcessed?: (request: VoiceChatHandRequest) => void;
  /** Called when title changes */
  onTitleChanged?: (voiceChat: VoiceChat, previousTitle: string) => void;
  /** Called when active speaker changes */
  onActiveSpeakerChange?: (speakerId: string | null) => void;
  /** Called when recording status changes */
  onRecordingStatusChange?: (recording: VoiceChatRecording) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when push-to-talk state changes */
  onPushToTalkChange?: (isActive: boolean) => void;
  /** Called on scheduled reminder */
  onScheduledReminder?: (
    scheduledVoiceChat: ScheduledVoiceChat,
    minutesBefore: number,
  ) => void;
}

// =============================================================================
// Utility Types and Functions
// =============================================================================

/**
 * Check if a participant is a speaker
 */
export function isVoiceChatSpeaker(participant: VoiceChatParticipant): boolean {
  return (
    participant.role === "speaker" ||
    participant.role === "admin" ||
    participant.role === "creator"
  );
}

/**
 * Check if a participant is an admin
 */
export function isVoiceChatAdmin(participant: VoiceChatParticipant): boolean {
  return participant.role === "admin" || participant.role === "creator";
}

/**
 * Check if a participant is the creator
 */
export function isVoiceChatCreator(participant: VoiceChatParticipant): boolean {
  return participant.role === "creator";
}

/**
 * Check if a participant is a listener
 */
export function isVoiceChatListener(
  participant: VoiceChatParticipant,
): boolean {
  return participant.role === "listener";
}

/**
 * Check if voice chat is active
 */
export function isVoiceChatActive(voiceChat: VoiceChat): boolean {
  return voiceChat.status === "live" || voiceChat.status === "starting";
}

/**
 * Check if voice chat is scheduled
 */
export function isVoiceChatScheduled(voiceChat: VoiceChat): boolean {
  return voiceChat.status === "scheduled";
}

/**
 * Check if voice chat has ended
 */
export function isVoiceChatEnded(voiceChat: VoiceChat): boolean {
  return voiceChat.status === "ended";
}

/**
 * Get display name for a voice chat role
 */
export function getVoiceChatRoleDisplayName(role: VoiceChatRole): string {
  switch (role) {
    case "creator":
      return "Creator";
    case "admin":
      return "Admin";
    case "speaker":
      return "Speaker";
    case "listener":
      return "Listener";
  }
}

/**
 * Get role permissions
 */
export function getVoiceChatRolePermissions(role: VoiceChatRole): {
  canSpeak: boolean;
  canMuteOthers: boolean;
  canInviteToSpeak: boolean;
  canMoveToListeners: boolean;
  canRemoveParticipants: boolean;
  canStartRecording: boolean;
  canEndVoiceChat: boolean;
  canEditSettings: boolean;
  canManageAdmins: boolean;
} {
  switch (role) {
    case "creator":
      return {
        canSpeak: true,
        canMuteOthers: true,
        canInviteToSpeak: true,
        canMoveToListeners: true,
        canRemoveParticipants: true,
        canStartRecording: true,
        canEndVoiceChat: true,
        canEditSettings: true,
        canManageAdmins: true,
      };
    case "admin":
      return {
        canSpeak: true,
        canMuteOthers: true,
        canInviteToSpeak: true,
        canMoveToListeners: true,
        canRemoveParticipants: true,
        canStartRecording: false,
        canEndVoiceChat: false,
        canEditSettings: false,
        canManageAdmins: false,
      };
    case "speaker":
      return {
        canSpeak: true,
        canMuteOthers: false,
        canInviteToSpeak: false,
        canMoveToListeners: false,
        canRemoveParticipants: false,
        canStartRecording: false,
        canEndVoiceChat: false,
        canEditSettings: false,
        canManageAdmins: false,
      };
    case "listener":
      return {
        canSpeak: false,
        canMuteOthers: false,
        canInviteToSpeak: false,
        canMoveToListeners: false,
        canRemoveParticipants: false,
        canStartRecording: false,
        canEndVoiceChat: false,
        canEditSettings: false,
        canManageAdmins: false,
      };
  }
}

/**
 * Sort raise hand requests by position
 */
export function sortVoiceChatHandRequests(
  requests: VoiceChatHandRequest[],
): VoiceChatHandRequest[] {
  return [...requests].sort((a, b) => a.position - b.position);
}

/**
 * Sort participants by role and speaking activity
 */
export function sortVoiceChatParticipants(
  participants: VoiceChatParticipant[],
): VoiceChatParticipant[] {
  const roleOrder: Record<VoiceChatRole, number> = {
    creator: 0,
    admin: 1,
    speaker: 2,
    listener: 3,
  };

  return [...participants].sort((a, b) => {
    // Active speaker first
    if (a.isActiveSpeaker && !b.isActiveSpeaker) return -1;
    if (!a.isActiveSpeaker && b.isActiveSpeaker) return 1;

    // Role order
    const roleCompare = roleOrder[a.role] - roleOrder[b.role];
    if (roleCompare !== 0) return roleCompare;

    // Within speakers, sort by speaker position
    if (a.speakerPosition !== undefined && b.speakerPosition !== undefined) {
      return a.speakerPosition - b.speakerPosition;
    }

    // Within listeners, put raised hands first
    if (a.hasRaisedHand && !b.hasRaisedHand) return -1;
    if (!a.hasRaisedHand && b.hasRaisedHand) return 1;

    // Finally, sort by join time
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
}

/**
 * Format voice chat duration
 */
export function formatVoiceChatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get scheduled voice chat status label
 */
export function getScheduledVoiceChatStatusLabel(
  status: ScheduledVoiceChatStatus,
): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "starting_soon":
      return "Starting Soon";
    case "live":
      return "Live";
    case "ended":
      return "Ended";
    case "cancelled":
      return "Cancelled";
  }
}
