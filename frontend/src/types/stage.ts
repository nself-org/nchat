/**
 * Stage Channel Types for nself-chat
 *
 * Discord-like stage channels with speaker/listener roles, raise hand functionality,
 * stage moderation, and scheduled stage events.
 */

import type { UserBasicInfo } from "./user";

// =============================================================================
// Stage Role Types
// =============================================================================

/**
 * Role types in a stage channel
 */
export type StageRole = "moderator" | "speaker" | "listener";

/**
 * Stage channel status
 */
export type StageStatus =
  | "scheduled" // Event scheduled for future
  | "starting" // About to start
  | "live" // Currently active
  | "paused" // Temporarily paused
  | "ended"; // Stage has ended

/**
 * Hand raise request status
 */
export type HandRaiseStatus = "pending" | "accepted" | "declined" | "lowered";

/**
 * Stage participant connection state
 */
export type StageConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

// =============================================================================
// Stage Channel Types
// =============================================================================

/**
 * Stage channel configuration
 */
export interface StageChannel {
  /** Unique stage channel ID */
  id: string;
  /** Parent channel ID */
  channelId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Stage channel name */
  name: string;
  /** Current topic being discussed */
  topic: string;
  /** Detailed description */
  description?: string;
  /** Stage status */
  status: StageStatus;
  /** Whether the stage is publicly discoverable */
  isDiscoverable: boolean;
  /** Maximum number of listeners (0 = unlimited) */
  maxListeners: number;
  /** Maximum number of speakers (0 = unlimited) */
  maxSpeakers: number;
  /** User who created the stage */
  createdBy: string;
  /** When the stage was created */
  createdAt: Date;
  /** When the stage was last updated */
  updatedAt: Date;
  /** When the stage started (if live) */
  startedAt?: Date;
  /** When the stage ended */
  endedAt?: Date;
  /** Scheduled start time (if scheduled) */
  scheduledStartTime?: Date;
  /** Scheduled end time (optional) */
  scheduledEndTime?: Date;
  /** Stage banner/cover image URL */
  bannerUrl?: string;
  /** Stage icon URL */
  iconUrl?: string;
  /** Whether recording is enabled */
  isRecordingEnabled: boolean;
  /** Whether the stage is currently being recorded */
  isRecording: boolean;
  /** Recording URL (after stage ends) */
  recordingUrl?: string;
  /** Stage settings */
  settings: StageSettings;
}

/**
 * Stage channel settings
 */
export interface StageSettings {
  /** Allow listeners to request to speak */
  allowRaiseHand: boolean;
  /** Auto-accept raise hand requests */
  autoAcceptRaiseHand: boolean;
  /** Maximum pending raise hand requests */
  maxPendingRequests: number;
  /** Notify moderators of raise hand requests */
  notifyOnRaiseHand: boolean;
  /** Allow chat during stage */
  allowChat: boolean;
  /** Allow reactions during stage */
  allowReactions: boolean;
  /** Mute listeners by default */
  muteListenersOnJoin: boolean;
  /** Allow speakers to mute themselves */
  allowSpeakerSelfMute: boolean;
  /** Timeout for raise hand requests (seconds, 0 = no timeout) */
  raiseHandTimeout: number;
  /** Whether the stage requires moderation to join */
  moderatedJoin: boolean;
  /** Custom welcome message */
  welcomeMessage?: string;
  /** Custom rules/guidelines */
  stageRules?: string;
}

/**
 * Default stage settings
 */
export const DEFAULT_STAGE_SETTINGS: StageSettings = {
  allowRaiseHand: true,
  autoAcceptRaiseHand: false,
  maxPendingRequests: 50,
  notifyOnRaiseHand: true,
  allowChat: true,
  allowReactions: true,
  muteListenersOnJoin: true,
  allowSpeakerSelfMute: true,
  raiseHandTimeout: 0,
  moderatedJoin: false,
};

// =============================================================================
// Stage Participant Types
// =============================================================================

/**
 * Stage participant representing a user in the stage
 */
export interface StageParticipant {
  /** Participant ID */
  id: string;
  /** Stage ID */
  stageId: string;
  /** User ID */
  userId: string;
  /** User details */
  user: UserBasicInfo;
  /** Participant role in stage */
  role: StageRole;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Whether speaking (audio activity) */
  isSpeaking: boolean;
  /** Audio level (0-1) */
  audioLevel: number;
  /** Connection state */
  connectionState: StageConnectionState;
  /** When they joined the stage */
  joinedAt: Date;
  /** When they became a speaker (if applicable) */
  becameSpeakerAt?: Date;
  /** Whether they have raised hand */
  hasRaisedHand: boolean;
  /** Whether they are server muted (by moderator) */
  isServerMuted: boolean;
  /** Whether they are server deafened (by moderator) */
  isServerDeafened: boolean;
  /** Stream reference */
  stream?: MediaStream;
  /** Position in speaker order (for display) */
  speakerPosition?: number;
  /** Custom display name in this stage */
  displayName?: string;
}

/**
 * Raise hand request
 */
export interface RaiseHandRequest {
  /** Request ID */
  id: string;
  /** Stage ID */
  stageId: string;
  /** User ID */
  userId: string;
  /** User details */
  user: UserBasicInfo;
  /** Request status */
  status: HandRaiseStatus;
  /** When the hand was raised */
  requestedAt: Date;
  /** When the request was processed */
  processedAt?: Date;
  /** Who processed the request (moderator) */
  processedBy?: string;
  /** Reason for decline (if declined) */
  declineReason?: string;
  /** Optional message with the request */
  message?: string;
  /** Position in queue */
  position: number;
}

// =============================================================================
// Stage Event Types
// =============================================================================

/**
 * Scheduled stage event
 */
export interface StageEvent {
  /** Event ID */
  id: string;
  /** Stage ID */
  stageId: string;
  /** Event name */
  name: string;
  /** Event description */
  description?: string;
  /** Event cover image */
  coverImageUrl?: string;
  /** Scheduled start time */
  scheduledStart: Date;
  /** Scheduled end time (optional) */
  scheduledEnd?: Date;
  /** Actual start time */
  actualStart?: Date;
  /** Actual end time */
  actualEnd?: Date;
  /** Event host user ID */
  hostId: string;
  /** Event host details */
  host: UserBasicInfo;
  /** Co-hosts */
  coHostIds: string[];
  /** Invited speaker IDs */
  invitedSpeakerIds: string[];
  /** Event status */
  status: StageEventStatus;
  /** Whether to send reminder notifications */
  sendReminders: boolean;
  /** Reminder timing (minutes before) */
  reminderMinutesBefore: number[];
  /** Whether event is recurring */
  isRecurring: boolean;
  /** Recurrence pattern (if recurring) */
  recurrencePattern?: StageRecurrencePattern;
  /** Number of interested users */
  interestedCount: number;
  /** When event was created */
  createdAt: Date;
  /** When event was last updated */
  updatedAt: Date;
}

/**
 * Stage event status
 */
export type StageEventStatus =
  | "scheduled"
  | "starting_soon" // 15 minutes before
  | "live"
  | "ended"
  | "cancelled";

/**
 * Stage recurrence pattern
 */
export interface StageRecurrencePattern {
  /** Recurrence type */
  type: "daily" | "weekly" | "biweekly" | "monthly";
  /** Days of week for weekly/biweekly (0=Sunday, 6=Saturday) */
  daysOfWeek?: number[];
  /** Day of month for monthly */
  dayOfMonth?: number;
  /** Time of day */
  timeOfDay: string; // HH:MM format
  /** Timezone */
  timezone: string;
  /** End date (optional) */
  endDate?: Date;
  /** Maximum occurrences (optional) */
  maxOccurrences?: number;
}

/**
 * Stage event interest/RSVP
 */
export interface StageEventInterest {
  /** Interest ID */
  id: string;
  /** Event ID */
  eventId: string;
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
// Stage Metrics Types
// =============================================================================

/**
 * Stage metrics and analytics
 */
export interface StageMetrics {
  /** Stage ID */
  stageId: string;
  /** Current listener count */
  listenerCount: number;
  /** Current speaker count */
  speakerCount: number;
  /** Peak listener count */
  peakListenerCount: number;
  /** Peak speaker count */
  peakSpeakerCount: number;
  /** Total unique listeners */
  totalUniqueListeners: number;
  /** Average listening duration (seconds) */
  averageListeningDuration: number;
  /** Total raise hand requests */
  totalRaiseHandRequests: number;
  /** Accepted raise hand requests */
  acceptedRaiseHandRequests: number;
  /** Declined raise hand requests */
  declinedRaiseHandRequests: number;
  /** Stage duration so far (seconds) */
  duration: number;
  /** Reactions count by type */
  reactionCounts: Record<string, number>;
  /** Chat message count */
  chatMessageCount: number;
}

// =============================================================================
// Stage Action Types
// =============================================================================

/**
 * Stage moderation actions
 */
export type StageModerationAction =
  | "invite_to_speak"
  | "move_to_audience"
  | "mute_speaker"
  | "unmute_speaker"
  | "remove_from_stage"
  | "accept_raise_hand"
  | "decline_raise_hand"
  | "lower_hand"
  | "promote_to_moderator"
  | "demote_from_moderator"
  | "end_stage"
  | "start_recording"
  | "stop_recording"
  | "pause_stage"
  | "resume_stage"
  | "update_topic";

/**
 * Stage moderation log entry
 */
export interface StageModerationLog {
  /** Log entry ID */
  id: string;
  /** Stage ID */
  stageId: string;
  /** Action type */
  action: StageModerationAction;
  /** Moderator who performed the action */
  moderatorId: string;
  /** Moderator details */
  moderator: UserBasicInfo;
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
 * Input for creating a stage channel
 */
export interface CreateStageChannelInput {
  /** Parent channel ID */
  channelId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Stage name */
  name: string;
  /** Stage topic */
  topic: string;
  /** Description */
  description?: string;
  /** Maximum listeners */
  maxListeners?: number;
  /** Maximum speakers */
  maxSpeakers?: number;
  /** Whether discoverable */
  isDiscoverable?: boolean;
  /** Banner URL */
  bannerUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** Whether recording is enabled */
  isRecordingEnabled?: boolean;
  /** Stage settings */
  settings?: Partial<StageSettings>;
  /** Scheduled start time (if scheduling) */
  scheduledStartTime?: Date;
  /** Scheduled end time */
  scheduledEndTime?: Date;
}

/**
 * Input for updating a stage channel
 */
export interface UpdateStageChannelInput {
  /** Stage name */
  name?: string;
  /** Stage topic */
  topic?: string;
  /** Description */
  description?: string;
  /** Maximum listeners */
  maxListeners?: number;
  /** Maximum speakers */
  maxSpeakers?: number;
  /** Whether discoverable */
  isDiscoverable?: boolean;
  /** Banner URL */
  bannerUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** Whether recording is enabled */
  isRecordingEnabled?: boolean;
  /** Stage settings */
  settings?: Partial<StageSettings>;
}

/**
 * Input for creating a stage event
 */
export interface CreateStageEventInput {
  /** Stage ID */
  stageId: string;
  /** Event name */
  name: string;
  /** Event description */
  description?: string;
  /** Cover image URL */
  coverImageUrl?: string;
  /** Scheduled start time */
  scheduledStart: Date;
  /** Scheduled end time */
  scheduledEnd?: Date;
  /** Co-host IDs */
  coHostIds?: string[];
  /** Invited speaker IDs */
  invitedSpeakerIds?: string[];
  /** Whether to send reminders */
  sendReminders?: boolean;
  /** Reminder timing (minutes before) */
  reminderMinutesBefore?: number[];
  /** Whether event is recurring */
  isRecurring?: boolean;
  /** Recurrence pattern */
  recurrencePattern?: StageRecurrencePattern;
}

/**
 * Input for updating a stage event
 */
export interface UpdateStageEventInput {
  /** Event name */
  name?: string;
  /** Event description */
  description?: string;
  /** Cover image URL */
  coverImageUrl?: string;
  /** Scheduled start time */
  scheduledStart?: Date;
  /** Scheduled end time */
  scheduledEnd?: Date;
  /** Co-host IDs */
  coHostIds?: string[];
  /** Invited speaker IDs */
  invitedSpeakerIds?: string[];
  /** Whether to send reminders */
  sendReminders?: boolean;
  /** Reminder timing */
  reminderMinutesBefore?: number[];
  /** Whether event is recurring */
  isRecurring?: boolean;
  /** Recurrence pattern */
  recurrencePattern?: StageRecurrencePattern;
}

// =============================================================================
// Stage Event Types
// =============================================================================

/**
 * Stage event types for real-time updates
 */
export type StageEventType =
  | "stage_started"
  | "stage_ended"
  | "stage_paused"
  | "stage_resumed"
  | "topic_updated"
  | "participant_joined"
  | "participant_left"
  | "speaker_added"
  | "speaker_removed"
  | "hand_raised"
  | "hand_lowered"
  | "hand_accepted"
  | "hand_declined"
  | "speaker_muted"
  | "speaker_unmuted"
  | "recording_started"
  | "recording_stopped"
  | "moderator_added"
  | "moderator_removed";

/**
 * Stage event payload
 */
export interface StageEventPayload {
  /** Event type */
  type: StageEventType;
  /** Stage ID */
  stageId: string;
  /** Stage data (for full updates) */
  stage?: StageChannel;
  /** User ID related to the event */
  userId?: string;
  /** User details */
  user?: UserBasicInfo;
  /** Participant data */
  participant?: StageParticipant;
  /** Raise hand request data */
  raiseHandRequest?: RaiseHandRequest;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Event timestamp */
  timestamp: Date;
}

// =============================================================================
// Service Callback Types
// =============================================================================

/**
 * Stage service callbacks
 */
export interface StageServiceCallbacks {
  /** Called when stage status changes */
  onStageStatusChange?: (
    stage: StageChannel,
    previousStatus: StageStatus,
  ) => void;
  /** Called when a participant joins */
  onParticipantJoined?: (participant: StageParticipant) => void;
  /** Called when a participant leaves */
  onParticipantLeft?: (participant: StageParticipant, reason: string) => void;
  /** Called when a speaker is added */
  onSpeakerAdded?: (participant: StageParticipant) => void;
  /** Called when a speaker is removed */
  onSpeakerRemoved?: (participant: StageParticipant, reason: string) => void;
  /** Called when a hand is raised */
  onHandRaised?: (request: RaiseHandRequest) => void;
  /** Called when a hand raise is processed */
  onHandProcessed?: (request: RaiseHandRequest) => void;
  /** Called when topic changes */
  onTopicChanged?: (stage: StageChannel, previousTopic: string) => void;
  /** Called when active speaker changes */
  onActiveSpeakerChange?: (speakerId: string | null) => void;
  /** Called when recording status changes */
  onRecordingStatusChange?: (isRecording: boolean) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Check if a participant is a speaker
 */
export function isSpeaker(participant: StageParticipant): boolean {
  return participant.role === "speaker" || participant.role === "moderator";
}

/**
 * Check if a participant is a moderator
 */
export function isModerator(participant: StageParticipant): boolean {
  return participant.role === "moderator";
}

/**
 * Check if a participant is a listener
 */
export function isListener(participant: StageParticipant): boolean {
  return participant.role === "listener";
}

/**
 * Check if a stage is active
 */
export function isStageActive(stage: StageChannel): boolean {
  return stage.status === "live" || stage.status === "starting";
}

/**
 * Check if a stage is scheduled
 */
export function isStageScheduled(stage: StageChannel): boolean {
  return stage.status === "scheduled";
}

/**
 * Check if a stage has ended
 */
export function isStageEnded(stage: StageChannel): boolean {
  return stage.status === "ended";
}

/**
 * Get display name for a stage role
 */
export function getStageRoleDisplayName(role: StageRole): string {
  switch (role) {
    case "moderator":
      return "Moderator";
    case "speaker":
      return "Speaker";
    case "listener":
      return "Listener";
  }
}

/**
 * Sort raise hand requests by position
 */
export function sortRaiseHandRequests(
  requests: RaiseHandRequest[],
): RaiseHandRequest[] {
  return [...requests].sort((a, b) => a.position - b.position);
}

/**
 * Sort participants by role and speaking activity
 */
export function sortStageParticipants(
  participants: StageParticipant[],
): StageParticipant[] {
  const roleOrder: Record<StageRole, number> = {
    moderator: 0,
    speaker: 1,
    listener: 2,
  };

  return [...participants].sort((a, b) => {
    // Role order first
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
